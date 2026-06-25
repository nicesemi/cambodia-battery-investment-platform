const Joi = require('joi');
const db = require('../config/database');

// 获取所有可用资产
const getAssets = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, asset_code, name, description, battery_type, total_units, 
              available_units, unit_price, expected_roi, location, status, created_at
       FROM battery_assets
       ORDER BY created_at DESC`
    );

    res.json({ assets: result.rows });
  } catch (error) {
    console.error('Get assets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 获取用户持有资产（含电池编号、传感器数据、站点信息）
const getUserAssets = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ua.id, ua.units, ua.average_cost, ua.total_dividends_received,
              ba.asset_code, ba.name, ba.battery_type, ba.unit_price, ba.expected_roi, ba.location,
              ba.total_units, ba.stock, ba.status as asset_status
       FROM user_assets ua
       JOIN battery_assets ba ON ua.asset_id = ba.id
       WHERE ua.user_id = $1`,
      [req.user.id]
    );

    // 获取每个持有资产的电池单元列表
    const userAssets = await Promise.all(result.rows.map(async (ua) => {
      const unitsResult = await db.query(
        `SELECT ibu.id as holding_id, bu.id as unit_id, bu.unit_code, bu.status as unit_status,
                bu.site_id, bu.site_name, ibu.purchase_price, ibu.purchased_at,
                bu.sensor_battery_level, bu.sensor_temperature, bu.sensor_cycle_count,
                bu.sensor_last_online, bu.sensor_health_status
         FROM investor_battery_units ibu
         JOIN battery_units bu ON ibu.battery_unit_id = bu.id
         WHERE ibu.investor_id = $1 AND ibu.battery_asset_id = $2
         ORDER BY bu.unit_code`,
        [req.user.id, ua.id]
      );
      return { ...ua, battery_units: unitsResult.rows };
    }));

    res.json({ userAssets });
  } catch (error) {
    console.error('Get user assets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 购买资产
const purchaseAssetSchema = Joi.object({
  assetId: Joi.string().uuid().required(),
  units: Joi.number().integer().min(1).required(),
});

const purchaseAsset = async (req, res) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');

    const { error, value } = purchaseAssetSchema.validate(req.body);
    if (error) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: error.details[0].message });
    }

    const { assetId, units } = value;

    // 获取资产信息
    const assetResult = await client.query(
      'SELECT * FROM battery_assets WHERE id = $1 AND status = $2 FOR UPDATE',
      [assetId, 'active']
    );

    if (assetResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Asset not found or not active' });
    }

    const asset = assetResult.rows[0];

    if (asset.available_units < units) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient available units' });
    }

    const totalCost = asset.unit_price * units;

    // 检查用户钱包余额
    const walletResult = await client.query(
      'SELECT * FROM user_wallets WHERE user_id = $1 FOR UPDATE',
      [req.user.id]
    );

    if (walletResult.rows[0].balance < totalCost) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // 扣除余额
    await client.query(
      'UPDATE user_wallets SET balance = balance - $1 WHERE user_id = $2',
      [totalCost, req.user.id]
    );

    // 更新资产可用数量
    await client.query(
      'UPDATE battery_assets SET available_units = available_units - $1 WHERE id = $2',
      [units, assetId]
    );

    // 更新或创建用户资产持有
    const existingAsset = await client.query(
      'SELECT * FROM user_assets WHERE user_id = $1 AND asset_id = $2 FOR UPDATE',
      [req.user.id, assetId]
    );

    if (existingAsset.rows.length > 0) {
      const existing = existingAsset.rows[0];
      const newTotalUnits = existing.units + units;
      const newAverageCost = (existing.units * existing.average_cost + totalCost) / newTotalUnits;
      
      await client.query(
        'UPDATE user_assets SET units = $1, average_cost = $2 WHERE id = $3',
        [newTotalUnits, newAverageCost, existing.id]
      );
    } else {
      await client.query(
        `INSERT INTO user_assets (user_id, asset_id, units, average_cost)
         VALUES ($1, $2, $3, $4)`,
        [req.user.id, assetId, units, asset.unit_price]
      );
    }

    // 更新用户总投资
    await client.query(
      'UPDATE users SET total_investment = total_investment + $1 WHERE id = $2',
      [totalCost, req.user.id]
    );

    // 记录交易
    await client.query(
      `INSERT INTO transactions (tx_no, user_id, type, amount, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [`TX${Date.now()}`, req.user.id, 'trade', totalCost, 'completed']
    );

    await client.query('COMMIT');

    res.json({
      message: 'Asset purchased successfully',
      purchased: {
        assetId,
        units,
        unitPrice: asset.unit_price,
        totalCost,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Purchase asset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

module.exports = {
  getAssets,
  getUserAssets,
  purchaseAsset,
};
