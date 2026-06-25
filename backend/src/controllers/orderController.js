const Joi = require('joi');
const db = require('../config/database');

// 投资者选购电池（自动绑定门店业绩）
const createOrderSchema = Joi.object({
  asset_id: Joi.string().uuid().required(),
  units: Joi.number().integer().min(1).required(),
  store_id: Joi.string().uuid().allow(null, ''),
});

const createOrder = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { error, value } = createOrderSchema.validate(req.body);
    if (error) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: error.details[0].message });
    }

    const { asset_id, units, store_id } = value;

    // 获取资产信息
    const assetResult = await client.query(
      'SELECT * FROM battery_assets WHERE id = $1 AND status = $2 FOR UPDATE',
      [asset_id, 'active']
    );
    if (assetResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '资产不存在或已下架' });
    }
    const asset = assetResult.rows[0];

    if (asset.available_units < units) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '可购买数量不足' });
    }

    const totalAmount = asset.unit_price * units;

    // 检查钱包余额
    const walletResult = await client.query(
      'SELECT * FROM user_wallets WHERE user_id = $1 FOR UPDATE',
      [req.user.id]
    );
    if (walletResult.rows[0].balance < totalAmount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '余额不足' });
    }

    // 扣除余额
    await client.query(
      'UPDATE user_wallets SET balance = balance - $1 WHERE user_id = $2',
      [totalAmount, req.user.id]
    );

    // 更新资产：available_units 和 stock 同步扣减
    await client.query(
      'UPDATE battery_assets SET available_units = available_units - $1, stock = stock - $1 WHERE id = $2',
      [units, asset_id]
    );

    // 分配具体电池编号给投资者
    const availableUnits = await client.query(
      `SELECT id, unit_code FROM battery_units
       WHERE battery_asset_id = $1 AND status = 'available'
       ORDER BY unit_code
       LIMIT $2
       FOR UPDATE`,
      [asset_id, units]
    );

    const assignedUnitIds = availableUnits.rows.map(r => r.id);
    const assignedUnitCodes = availableUnits.rows.map(r => r.unit_code);

    if (assignedUnitIds.length > 0) {
      // 标记电池单元为已售
      await client.query(
        `UPDATE battery_units SET status = 'sold', investor_id = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = ANY($2::uuid[])`,
        [req.user.id, assignedUnitIds]
      );

      // 记录投资者持有的具体电池
      for (const unitId of assignedUnitIds) {
        await client.query(
          `INSERT INTO investor_battery_units (investor_id, battery_unit_id, battery_asset_id, purchase_price)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (investor_id, battery_unit_id) DO NOTHING`,
          [req.user.id, unitId, asset_id, asset.unit_price]
        );
      }
    }

    // 更新或创建用户资产持有
    const existingAsset = await client.query(
      'SELECT * FROM user_assets WHERE user_id = $1 AND asset_id = $2 FOR UPDATE',
      [req.user.id, asset_id]
    );
    if (existingAsset.rows.length > 0) {
      const existing = existingAsset.rows[0];
      const newTotalUnits = existing.units + units;
      const newAverageCost = (existing.units * existing.average_cost + totalAmount) / newTotalUnits;
      await client.query(
        'UPDATE user_assets SET units = $1, average_cost = $2 WHERE id = $3',
        [newTotalUnits, newAverageCost, existing.id]
      );
    } else {
      await client.query(
        `INSERT INTO user_assets (user_id, asset_id, units, average_cost)
         VALUES ($1, $2, $3, $4)`,
        [req.user.id, asset_id, units, asset.unit_price]
      );
    }

    // 更新用户总投资
    await client.query(
      'UPDATE users SET total_investment = total_investment + $1 WHERE id = $2',
      [totalAmount, req.user.id]
    );

    // 记录交易流水
    await client.query(
      `INSERT INTO transactions (tx_no, user_id, type, amount, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [`TX${Date.now()}`, req.user.id, 'trade', totalAmount, 'completed']
    );

    // --- 门店业绩归属 ---
    let resolvedStoreId = store_id || null;
    if (!resolvedStoreId) {
      // 自动查询投资者绑定门店
      const bindingResult = await client.query(
        'SELECT store_id FROM investor_store_bindings WHERE investor_id = $1 LIMIT 1',
        [req.user.id]
      );
      if (bindingResult.rows.length > 0) {
        resolvedStoreId = bindingResult.rows[0].store_id;
      }
    }

    // 记录投资者订单
    await client.query(
      `INSERT INTO investor_orders (user_id, asset_id, units, unit_price, total_amount, status, store_id, order_source)
       VALUES ($1, $2, $3, $4, $5, 'completed', $6, $7)`,
      [req.user.id, asset_id, units, asset.unit_price, totalAmount,
       resolvedStoreId, resolvedStoreId ? 'store_bound' : 'online']
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: '购买成功',
      order: {
        asset_id,
        units,
        unitPrice: asset.unit_price,
        totalAmount,
        store_id: resolvedStoreId,
        store_bound: !!resolvedStoreId,
        assigned_units: assignedUnitCodes,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create investor order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

// 获取投资者已绑定门店
const getMyBinding = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ib.*, fs.name as store_name, fs.store_code, fs.city
       FROM investor_store_bindings ib
       JOIN franchisee_stores fs ON fs.id = ib.store_id
       WHERE ib.investor_id = $1`,
      [req.user.id]
    );
    res.json({ bindings: result.rows });
  } catch (error) {
    console.error('Get my binding error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 获取我的订单
const getMyOrders = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT io.*, ba.name as asset_name, ba.asset_code, fs.name as store_name, fs.store_code
       FROM investor_orders io
       LEFT JOIN battery_assets ba ON io.asset_id = ba.id
       LEFT JOIN franchisee_stores fs ON io.store_id = fs.id
       WHERE io.user_id = $1
       ORDER BY io.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json({ orders: result.rows });
  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createOrder,
  getMyBinding,
  getMyOrders,
};
