const db = require('../config/database');

// 70%利润分红算法实现
const calculateAndDistributeDividends = async (period) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');

    console.log(`Starting dividend calculation for period: ${period}`);

    // 1. 获取或计算本期平台利润
    // 实际生产中应该从换电站数据统计计算
    const profitResult = await client.query(
      'SELECT * FROM platform_profits WHERE period = $1',
      [period]
    );

    let platformProfit;
    if (profitResult.rows.length === 0) {
      // 模拟计算利润（实际应从station_statistics汇总）
      // 柬埔寨市场收益测算模型
      const stationStats = await client.query(
        `SELECT 
          COUNT(DISTINCT station_id) as station_count,
          SUM(swap_count) as total_swaps,
          SUM(revenue) as total_revenue
         FROM station_statistics 
         WHERE TO_CHAR(date, 'YYYY-MM') = $1`,
        [period]
      );

      const stats = stationStats.rows[0];
      const stationCount = stats.station_count || 10; // 默认10个站
      const totalSwaps = stats.total_swaps || 5000; // 默认5000次换电
      const totalRevenue = stats.total_revenue || (totalSwaps * 2); // 每次换电$2

      // 成本测算
      const electricityCost = totalSwaps * 0.3; // 电费
      const maintenanceCost = stationCount * 200; // 维护费
      const staffCost = stationCount * 300; // 人工费
      const totalCost = electricityCost + maintenanceCost + staffCost;
      
      const grossProfit = totalRevenue - totalCost;
      const operatingCost = grossProfit * 0.1; // 10%运营成本
      const netProfit = grossProfit - operatingCost;

      // 70%分给投资者，30%平台留存
      const profitShareRatio = 0.70;
      const investorShare = netProfit * profitShareRatio;
      const platformShare = netProfit * (1 - profitShareRatio);

      // 保存利润记录
      const profitInsert = await client.query(
        `INSERT INTO platform_profits 
         (period, total_revenue, total_cost, gross_profit, operating_cost, net_profit, 
          investor_share, platform_share, exchange_stations, battery_count, swap_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [period, totalRevenue, totalCost, grossProfit, operatingCost, netProfit,
         investorShare, platformShare, stationCount, 500, totalSwaps]
      );

      platformProfit = profitInsert.rows[0];
    } else {
      platformProfit = profitResult.rows[0];
    }

    const totalDividendPool = platformProfit.investor_share;
    console.log(`Total dividend pool: $${totalDividendPool}`);

    // 2. 获取所有用户持有资产，计算每单位资产分红
    const totalAssetsResult = await client.query(
      'SELECT SUM(units) as total_units FROM user_assets'
    );
    const totalUnits = totalAssetsResult.rows[0].total_units || 1;
    const dividendPerUnit = totalDividendPool / totalUnits;

    console.log(`Dividend per unit: $${dividendPerUnit}`);

    // 3. 获取所有用户资产并分配分红
    const userAssetsResult = await client.query(
      `SELECT ua.user_id, ua.asset_id, ua.units, u.email, u.username
       FROM user_assets ua
       JOIN users u ON ua.user_id = u.id
       WHERE ua.units > 0`
    );

    for (const userAsset of userAssetsResult.rows) {
      const userDividend = userAsset.units * dividendPerUnit;
      const platformFee = userDividend * 0; // 已在利润分配时扣除

      const dividendNo = `DIV${period}${userAsset.user_id.substr(0, 8).toUpperCase()}`;

      // 创建分红记录
      await client.query(
        `INSERT INTO dividend_records
         (dividend_no, user_id, asset_id, period, units_held, profit_amount, dividend_amount, platform_fee, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [dividendNo, userAsset.user_id, userAsset.asset_id, period, 
         userAsset.units, platformProfit.net_profit, userDividend, platformFee, 'completed']
      );

      // 更新用户钱包余额
      await client.query(
        'UPDATE user_wallets SET balance = balance + $1 WHERE user_id = $2',
        [userDividend, userAsset.user_id]
      );

      // 更新用户累计分红
      await client.query(
        'UPDATE users SET total_dividends = total_dividends + $1 WHERE id = $2',
        [userDividend, userAsset.user_id]
      );

      // 更新用户资产分红记录
      await client.query(
        'UPDATE user_assets SET total_dividends_received = total_dividends_received + $1 WHERE user_id = $2 AND asset_id = $3',
        [userDividend, userAsset.user_id, userAsset.asset_id]
      );

      // 记录交易
      await client.query(
        `INSERT INTO transactions (tx_no, user_id, type, amount, status, remark)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [`TX${Date.now()}${Math.random().toString(36).substr(2, 6)}`, 
         userAsset.user_id, 'dividend', userDividend, 'completed', 
         `${period} dividend for ${userAsset.units} units`]
      );
    }

    await client.query('COMMIT');
    console.log(`Dividend distribution completed for period: ${period}`);
    
    return {
      success: true,
      period,
      totalDividendPool,
      totalUnits,
      dividendPerUnit,
      userCount: userAssetsResult.rows.length,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Dividend calculation error:', error);
    throw error;
  } finally {
    client.release();
  }
};

// 获取用户分红记录
const getMyDividends = async (req, res) => {
  try {
    const { period } = req.query;

    let query = `
      SELECT dr.*, ba.name as asset_name, ba.asset_code
      FROM dividend_records dr
      JOIN battery_assets ba ON dr.asset_id = ba.id
      WHERE dr.user_id = $1
    `;
    const params = [req.user.id];

    if (period) {
      query += ' AND dr.period = $2';
      params.push(period);
    }

    query += ' ORDER BY dr.calculated_at DESC';

    const result = await db.query(query, params);

    // 统计汇总
    const summaryResult = await db.query(
      `SELECT 
        COALESCE(SUM(dividend_amount), 0) as total_dividends,
        COUNT(*) as dividend_count,
        COUNT(DISTINCT period) as periods
       FROM dividend_records
       WHERE user_id = $1`,
      [req.user.id]
    );

    res.json({
      dividends: result.rows,
      summary: summaryResult.rows[0],
    });
  } catch (error) {
    console.error('Get dividends error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 手动触发分红（管理员）
const triggerDividendCalculation = async (req, res) => {
  try {
    const { period } = req.body;

    if (!period) {
      return res.status(400).json({ error: 'Period is required (YYYY-MM)' });
    }

    const result = await calculateAndDistributeDividends(period);

    res.json({
      message: 'Dividend calculation completed',
      ...result,
    });
  } catch (error) {
    console.error('Trigger dividend error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 获取柬埔寨市场收益测算
const getMarketForecast = async (req, res) => {
  try {
    // 柬埔寨换电市场收益测算模型
    const forecast = {
      marketOverview: {
        totalElectricMotorcycles: '2M+', // 柬埔寨电摩保有量约200万
        dailySwapDemand: 50000, // 日换电需求
        averageSwapPrice: 2, // 平均每次换电$2
        marketGrowthRate: 0.25, // 年增长率25%
      },
      stationEconomics: {
        dailySwapsPerStation: 150, // 单站日换电次数
        dailyRevenue: 300, // 单站日收入
        monthlyRevenue: 9000, // 单站月收入
        monthlyCost: {
          electricity: 1350,
          maintenance: 200,
          staff: 300,
          rent: 500,
          total: 2350,
        },
        monthlyProfit: 6650, // 单站月利润
        yearlyROI: 0.155, // 年化收益率15.5%
      },
      batteryEconomics: {
        unitPrice: 1000, // 每单位$1000
        expectedMonthlyDividend: 12.9, // 预期月分红
        expectedYearlyDividend: 155, // 预期年分红
        expectedROI: 0.155, // 15.5%年化
        paybackPeriod: '6.5 years', // 回本周期
      },
      investorReturns: {
        profitShareRatio: 0.70, // 70%利润分红
        platformShareRatio: 0.30, // 30%平台留存
        exampleCalculation: {
          investment: 10000, // $10000投资
          units: 10,
          estimatedMonthlyDividend: 129,
          estimatedYearlyDividend: 1550,
          fiveYearTotal: 7750,
        }
      }
    };

    res.json({ forecast });
  } catch (error) {
    console.error('Get market forecast error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getMyDividends,
  triggerDividendCalculation,
  calculateAndDistributeDividends,
  getMarketForecast,
};
