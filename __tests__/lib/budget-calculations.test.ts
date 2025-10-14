import {
  calculateBudgetStats,
  calculateCategoryBreakdown,
  calculateSpendingTimeline,
  getVarianceColor,
  getVarianceBgColor,
  formatCurrency,
} from '@/lib/budget-calculations'
import { BudgetItem } from '@/types/budget'

describe('budget-calculations', () => {
  const mockBudgetItems: BudgetItem[] = [
    {
      _id: '1' as any,
      _creationTime: Date.now(),
      user_id: 'user1',
      name: 'Venue',
      category: 'venue',
      budget: 10000,
      actual_cost: 9000,
      paid_amount: 9000,
      payment_status: 'paid',
      paid_date: '2024-01-15T00:00:00Z',
      notes: '',
    },
    {
      _id: '2' as any,
      _creationTime: Date.now(),
      user_id: 'user1',
      name: 'Catering',
      category: 'catering',
      budget: 8000,
      actual_cost: 8500,
      paid_amount: 4000,
      payment_status: 'pending',
      paid_date: '2024-01-20T00:00:00Z',
      notes: '',
    },
    {
      _id: '3' as any,
      _creationTime: Date.now(),
      user_id: 'user1',
      name: 'Photography',
      category: 'photography',
      budget: 3000,
      actual_cost: 3200,
      paid_amount: 0,
      payment_status: 'overdue',
      paid_date: null,
      notes: '',
    },
  ]

  describe('calculateBudgetStats', () => {
    it('should calculate correct budget statistics', () => {
      const stats = calculateBudgetStats(mockBudgetItems)

      expect(stats.totalBudget).toBe(21000)
      expect(stats.totalSpent).toBe(20700)
      expect(stats.totalPaid).toBe(13000)
      expect(stats.totalRemaining).toBe(300)
      expect(stats.variance).toBe(300)
      expect(stats.variancePercentage).toBeCloseTo(1.43, 2)
      expect(stats.itemCount).toBe(3)
      expect(stats.paidCount).toBe(1)
      expect(stats.overdueCount).toBe(1)
    })

    it('should handle empty array', () => {
      const stats = calculateBudgetStats([])

      expect(stats.totalBudget).toBe(0)
      expect(stats.totalSpent).toBe(0)
      expect(stats.totalPaid).toBe(0)
      expect(stats.totalRemaining).toBe(0)
      expect(stats.variance).toBe(0)
      expect(stats.variancePercentage).toBe(0)
      expect(stats.itemCount).toBe(0)
    })

    it('should handle zero budget', () => {
      const items: BudgetItem[] = [
        {
          ...mockBudgetItems[0],
          budget: 0,
          actual_cost: 0,
        },
      ]

      const stats = calculateBudgetStats(items)
      expect(stats.variancePercentage).toBe(0)
    })
  })

  describe('calculateCategoryBreakdown', () => {
    it('should calculate correct category breakdown', () => {
      const breakdown = calculateCategoryBreakdown(mockBudgetItems)

      expect(breakdown).toHaveLength(3)

      const venue = breakdown.find((b) => b.category === 'venue')
      expect(venue).toBeDefined()
      expect(venue!.budget).toBe(10000)
      expect(venue!.spent).toBe(9000)
      expect(venue!.variance).toBe(1000)
      expect(venue!.percentage).toBeCloseTo(47.62, 2)
    })

    it('should handle multiple items in same category', () => {
      const items: BudgetItem[] = [
        { ...mockBudgetItems[0], category: 'venue', budget: 5000, actual_cost: 4000 },
        { ...mockBudgetItems[1], category: 'venue', budget: 3000, actual_cost: 2500 },
      ]

      const breakdown = calculateCategoryBreakdown(items)

      expect(breakdown).toHaveLength(1)
      expect(breakdown[0].budget).toBe(8000)
      expect(breakdown[0].spent).toBe(6500)
    })

    it('should handle empty array', () => {
      const breakdown = calculateCategoryBreakdown([])
      expect(breakdown).toHaveLength(0)
    })
  })

  describe('calculateSpendingTimeline', () => {
    it('should calculate spending timeline correctly', () => {
      const timeline = calculateSpendingTimeline(mockBudgetItems)

      expect(timeline).toHaveLength(2)
      expect(timeline[0].date).toBe('2024-01-15')
      expect(timeline[0].amount).toBe(9000)
      expect(timeline[0].cumulative).toBe(9000)

      expect(timeline[1].date).toBe('2024-01-20')
      expect(timeline[1].amount).toBe(4000)
      expect(timeline[1].cumulative).toBe(13000)
    })

    it('should sort timeline by date', () => {
      const items: BudgetItem[] = [
        { ...mockBudgetItems[0], paid_date: '2024-01-20T00:00:00Z', paid_amount: 1000 },
        { ...mockBudgetItems[1], paid_date: '2024-01-10T00:00:00Z', paid_amount: 2000 },
      ]

      const timeline = calculateSpendingTimeline(items)

      expect(timeline[0].date).toBe('2024-01-10')
      expect(timeline[1].date).toBe('2024-01-20')
    })

    it('should skip items without paid_date', () => {
      const items: BudgetItem[] = [
        { ...mockBudgetItems[0], paid_date: null, paid_amount: 1000 },
      ]

      const timeline = calculateSpendingTimeline(items)
      expect(timeline).toHaveLength(0)
    })

    it('should skip items with zero paid_amount', () => {
      const items: BudgetItem[] = [
        { ...mockBudgetItems[0], paid_date: '2024-01-20T00:00:00Z', paid_amount: 0 },
      ]

      const timeline = calculateSpendingTimeline(items)
      expect(timeline).toHaveLength(0)
    })
  })

  describe('getVarianceColor', () => {
    it('should return green for positive variance > 10%', () => {
      expect(getVarianceColor(1100, 10000)).toBe('text-green-600')
    })

    it('should return yellow for small positive variance', () => {
      expect(getVarianceColor(500, 10000)).toBe('text-yellow-600')
    })

    it('should return orange for small negative variance', () => {
      expect(getVarianceColor(-500, 10000)).toBe('text-orange-600')
    })

    it('should return red for large negative variance', () => {
      expect(getVarianceColor(-1500, 10000)).toBe('text-red-600')
    })

    it('should return gray for zero budget', () => {
      expect(getVarianceColor(100, 0)).toBe('text-gray-500')
    })
  })

  describe('getVarianceBgColor', () => {
    it('should return correct background colors', () => {
      expect(getVarianceBgColor(1100, 10000)).toBe('bg-green-100')
      expect(getVarianceBgColor(500, 10000)).toBe('bg-yellow-100')
      expect(getVarianceBgColor(-500, 10000)).toBe('bg-orange-100')
      expect(getVarianceBgColor(-1500, 10000)).toBe('bg-red-100')
      expect(getVarianceBgColor(100, 0)).toBe('bg-gray-100')
    })
  })

  describe('formatCurrency', () => {
    it('should format currency correctly', () => {
      expect(formatCurrency(1000)).toBe('$1,000')
      expect(formatCurrency(1234.56)).toBe('$1,235')
      expect(formatCurrency(0)).toBe('$0')
    })

    it('should handle negative amounts', () => {
      expect(formatCurrency(-500)).toBe('-$500')
    })

    it('should handle large amounts', () => {
      expect(formatCurrency(1234567)).toBe('$1,234,567')
    })

    it('should round to nearest dollar', () => {
      expect(formatCurrency(99.4)).toBe('$99')
      expect(formatCurrency(99.5)).toBe('$100')
    })
  })
})
