import { ok, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const forecast = {
      marketOverview: {
        totalElectricMotorcycles: '2M+',
        dailySwapDemand: 50000,
        averageSwapPrice: 2,
        marketGrowthRate: 0.25,
      },
      stationEconomics: {
        dailySwapsPerStation: 150,
        dailyRevenue: 300,
        monthlyRevenue: 9000,
        monthlyCost: { electricity: 1350, maintenance: 200, staff: 300, rent: 500, total: 2350 },
        monthlyProfit: 6650,
        yearlyROI: 0.155,
      },
      batteryEconomics: {
        unitPrice: 1000,
        expectedMonthlyDividend: 12.9,
        expectedYearlyDividend: 155,
        expectedROI: 0.155,
        paybackPeriod: '6.5 years',
      },
      investorReturns: {
        profitShareRatio: 0.70,
        platformShareRatio: 0.30,
        exampleCalculation: {
          investment: 10000, units: 10,
          estimatedMonthlyDividend: 129, estimatedYearlyDividend: 1550, fiveYearTotal: 7750,
        }
      }
    }
    return ok({ forecast })
  } catch (e: any) {
    return serverError()
  }
}
