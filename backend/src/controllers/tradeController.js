const Joi = require('joi');
const db = require('../config/database');

// 创建订单Schema
const createOrderSchema = Joi.object({
  assetId: Joi.string().uuid().required(),
  orderType: Joi.string().valid('buy', 'sell').required(),
  price: Joi.number().positive().required(),
  units: Joi.number().integer().min(1).required(),
});

// 创建订单
const createOrder = async (req, res) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');

    const { error, value } = createOrderSchema.validate(req.body);
    if (error) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: error.details[0].message });
    }

    const { assetId, orderType, price, units } = value;
    const orderNo = `ORD${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    if (orderType === 'sell') {
      // 检查用户是否有足够的资产
      const userAssetResult = await client.query(
        'SELECT units FROM user_assets WHERE user_id = $1 AND asset_id = $2 FOR UPDATE',
        [req.user.id, assetId]
      );

      if (userAssetResult.rows.length === 0 || userAssetResult.rows[0].units < units) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient assets to sell' });
      }

      // 冻结用户资产
      await client.query(
        'UPDATE user_assets SET units = units - $1 WHERE user_id = $2 AND asset_id = $3',
        [units, req.user.id, assetId]
      );
    } else {
      // 买单：检查并冻结余额
      const totalCost = price * units;
      const walletResult = await client.query(
        'SELECT balance FROM user_wallets WHERE user_id = $1 FOR UPDATE',
        [req.user.id]
      );

      if (walletResult.rows[0].balance < totalCost) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      await client.query(
        'UPDATE user_wallets SET balance = balance - $1, frozen_balance = frozen_balance + $1 WHERE user_id = $2',
        [totalCost, req.user.id]
      );
    }

    // 创建订单
    const result = await client.query(
      `INSERT INTO trade_orders (order_no, user_id, asset_id, order_type, price, units)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [orderNo, req.user.id, assetId, orderType, price, units]
    );

    await client.query('COMMIT');

    // 异步撮合（实际生产中应该用队列）
    setTimeout(() => matchOrders(assetId), 100);

    res.status(201).json({
      message: 'Order created successfully',
      order: result.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

// 撮合引擎
const matchOrders = async (assetId) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');

    // 获取最高买单和最低卖单
    const buyOrders = await client.query(
      `SELECT * FROM trade_orders 
       WHERE asset_id = $1 AND order_type = 'buy' AND status IN ('pending', 'partial')
       ORDER BY price DESC, order_time ASC
       FOR UPDATE`,
      [assetId]
    );

    const sellOrders = await client.query(
      `SELECT * FROM trade_orders 
       WHERE asset_id = $1 AND order_type = 'sell' AND status IN ('pending', 'partial')
       ORDER BY price ASC, order_time ASC
       FOR UPDATE`,
      [assetId]
    );

    for (const buyOrder of buyOrders.rows) {
      for (const sellOrder of sellOrders.rows) {
        // 价格匹配：买价 >= 卖价
        if (buyOrder.price >= sellOrder.price && buyOrder.status !== 'filled' && sellOrder.status !== 'filled') {
          const matchPrice = sellOrder.price; // 以卖单价成交
          const buyRemaining = buyOrder.units - buyOrder.filled_units;
          const sellRemaining = sellOrder.units - sellOrder.filled_units;
          const matchedUnits = Math.min(buyRemaining, sellRemaining);

          if (matchedUnits <= 0) continue;

          const totalAmount = matchPrice * matchedUnits;
          const fee = totalAmount * 0.005; // 0.5%手续费
          const tradeNo = `TRD${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

          // 创建交易记录
          await client.query(
            `INSERT INTO trade_records 
             (trade_no, buy_order_id, sell_order_id, asset_id, buyer_id, seller_id, price, units, total_amount, fee)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [tradeNo, buyOrder.id, sellOrder.id, assetId, buyOrder.user_id, sellOrder.user_id, 
             matchPrice, matchedUnits, totalAmount, fee]
          );

          // 更新买单
          const newBuyFilled = buyOrder.filled_units + matchedUnits;
          const buyStatus = newBuyFilled >= buyOrder.units ? 'filled' : 'partial';
          await client.query(
            `UPDATE trade_orders SET filled_units = $1, status = $2, filled_time = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [newBuyFilled, buyStatus, buyOrder.id]
          );

          // 更新卖单
          const newSellFilled = sellOrder.filled_units + matchedUnits;
          const sellStatus = newSellFilled >= sellOrder.units ? 'filled' : 'partial';
          await client.query(
            `UPDATE trade_orders SET filled_units = $1, status = $2, filled_time = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [newSellFilled, sellStatus, sellOrder.id]
          );

          // 买方：解冻资金，扣除金额，增加资产
          await client.query(
            `UPDATE user_wallets SET frozen_balance = frozen_balance - $1 WHERE user_id = $2`,
            [totalAmount, buyOrder.user_id]
          );

          // 买方增加资产
          const existingBuyerAsset = await client.query(
            'SELECT * FROM user_assets WHERE user_id = $1 AND asset_id = $2',
            [buyOrder.user_id, assetId]
          );

          if (existingBuyerAsset.rows.length > 0) {
            await client.query(
              'UPDATE user_assets SET units = units + $1 WHERE user_id = $2 AND asset_id = $3',
              [matchedUnits, buyOrder.user_id, assetId]
            );
          } else {
            await client.query(
              'INSERT INTO user_assets (user_id, asset_id, units, average_cost) VALUES ($1, $2, $3, $4)',
              [buyOrder.user_id, assetId, matchedUnits, matchPrice]
            );
          }

          // 卖方：增加资金
          const sellerReceive = totalAmount - fee;
          await client.query(
            `UPDATE user_wallets SET balance = balance + $1 WHERE user_id = $2`,
            [sellerReceive, sellOrder.user_id]
          );

          // 更新订单对象以便下一轮撮合
          buyOrder.filled_units = newBuyFilled;
          buyOrder.status = buyStatus;
          sellOrder.filled_units = newSellFilled;
          sellOrder.status = sellStatus;
        }
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Match orders error:', error);
  } finally {
    client.release();
  }
};

// 获取用户订单
const getMyOrders = async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = `
      SELECT o.*, ba.name as asset_name, ba.asset_code
      FROM trade_orders o
      JOIN battery_assets ba ON o.asset_id = ba.id
      WHERE o.user_id = $1
    `;
    const params = [req.user.id];

    if (status) {
      query += ' AND o.status = $2';
      params.push(status);
    }

    query += ' ORDER BY o.order_time DESC';

    const result = await db.query(query, params);

    res.json({ orders: result.rows });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 获取订单簿
const getOrderBook = async (req, res) => {
  try {
    const { assetId } = req.params;

    const buyOrders = await db.query(
      `SELECT price, SUM(units - filled_units) as total_units, COUNT(*) as order_count
       FROM trade_orders
       WHERE asset_id = $1 AND order_type = 'buy' AND status IN ('pending', 'partial')
       GROUP BY price
       ORDER BY price DESC
       LIMIT 20`,
      [assetId]
    );

    const sellOrders = await db.query(
      `SELECT price, SUM(units - filled_units) as total_units, COUNT(*) as order_count
       FROM trade_orders
       WHERE asset_id = $1 AND order_type = 'sell' AND status IN ('pending', 'partial')
       GROUP BY price
       ORDER BY price ASC
       LIMIT 20`,
      [assetId]
    );

    res.json({
      buyOrders: buyOrders.rows,
      sellOrders: sellOrders.rows,
    });
  } catch (error) {
    console.error('Get order book error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 取消订单
const cancelOrder = async (req, res) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');

    const { orderId } = req.params;

    const orderResult = await client.query(
      'SELECT * FROM trade_orders WHERE id = $1 AND user_id = $2 FOR UPDATE',
      [orderId, req.user.id]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.status === 'filled' || order.status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Order cannot be cancelled' });
    }

    const remainingUnits = order.units - order.filled_units;

    if (order.order_type === 'buy') {
      // 解冻资金
      const refundAmount = order.price * remainingUnits;
      await client.query(
        `UPDATE user_wallets 
         SET balance = balance + $1, frozen_balance = frozen_balance - $1
         WHERE user_id = $2`,
        [refundAmount, req.user.id]
      );
    } else {
      // 归还资产
      await client.query(
        'UPDATE user_assets SET units = units + $1 WHERE user_id = $2 AND asset_id = $3',
        [remainingUnits, req.user.id, order.asset_id]
      );
    }

    await client.query(
      `UPDATE trade_orders 
       SET status = 'cancelled', cancelled_time = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [orderId]
    );

    await client.query('COMMIT');

    res.json({ message: 'Order cancelled successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Cancel order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderBook,
  cancelOrder,
  matchOrders,
};
