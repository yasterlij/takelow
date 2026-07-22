import { WinnerService } from './auction-engine/src/modules/winner/winner.service'
import { Bid } from './auction-engine/src/modules/bidding/entities/bid.entity'

interface TestCase {
  name: string
  bids: Array<{ amount: number; userId: string }>
  numWinners: number
  expectedWinners: Array<{ amount: number; userId: string }>
}

const testCases: TestCase[] = [
  {
    name: 'Basic unique bid - single winner',
    bids: [
      { amount: 100, userId: 'user1' },
      { amount: 200, userId: 'user2' },
      { amount: 300, userId: 'user3' },
    ],
    numWinners: 1,
    expectedWinners: [{ amount: 100, userId: 'user1' }],
  },
  {
    name: 'Duplicate amounts - lowest unique wins',
    bids: [
      { amount: 100, userId: 'user1' },
      { amount: 100, userId: 'user2' },
      { amount: 200, userId: 'user3' },
      { amount: 300, userId: 'user4' },
    ],
    numWinners: 1,
    expectedWinners: [{ amount: 200, userId: 'user3' }],
  },
  {
    name: 'All duplicates - no winner',
    bids: [
      { amount: 100, userId: 'user1' },
      { amount: 100, userId: 'user2' },
      { amount: 200, userId: 'user3' },
      { amount: 200, userId: 'user4' },
    ],
    numWinners: 1,
    expectedWinners: [],
  },
  {
    name: 'Multiple winners - top 2 unique',
    bids: [
      { amount: 100, userId: 'user1' },
      { amount: 100, userId: 'user2' },
      { amount: 200, userId: 'user3' },
      { amount: 300, userId: 'user4' },
      { amount: 400, userId: 'user5' },
    ],
    numWinners: 2,
    expectedWinners: [
      { amount: 200, userId: 'user3' },
      { amount: 300, userId: 'user4' },
    ],
  },
  {
    name: 'Earliest bidder wins tie on unique amount',
    bids: [
      { amount: 100, userId: 'user1' },
      { amount: 100, userId: 'user2' },
      { amount: 200, userId: 'user3' },
      { amount: 200, userId: 'user4' },
      { amount: 300, userId: 'user5' },
      { amount: 300, userId: 'user6' },
      { amount: 400, userId: 'user7' },
    ],
    numWinners: 1,
    expectedWinners: [{ amount: 400, userId: 'user7' }],
  },
  {
    name: 'Complex - 3 winners from mixed duplicates',
    bids: [
      { amount: 10, userId: 'u1' },
      { amount: 10, userId: 'u2' },
      { amount: 20, userId: 'u3' },
      { amount: 30, userId: 'u4' },
      { amount: 30, userId: 'u5' },
      { amount: 40, userId: 'u6' },
      { amount: 50, userId: 'u7' },
      { amount: 50, userId: 'u8' },
      { amount: 60, userId: 'u9' },
    ],
    numWinners: 3,
    expectedWinners: [
      { amount: 20, userId: 'u3' },
      { amount: 40, userId: 'u6' },
      { amount: 60, userId: 'u9' },
    ],
  },
  {
    name: 'More winners than unique amounts',
    bids: [
      { amount: 100, userId: 'u1' },
      { amount: 200, userId: 'u2' },
    ],
    numWinners: 5,
    expectedWinners: [
      { amount: 100, userId: 'u1' },
      { amount: 200, userId: 'u2' },
    ],
  },
  {
    name: 'Single bid',
    bids: [
      { amount: 500, userId: 'only' },
    ],
    numWinners: 1,
    expectedWinners: [{ amount: 500, userId: 'only' }],
  },
  {
    name: 'No bids',
    bids: [],
    numWinners: 1,
    expectedWinners: [],
  },
  {
    name: 'Reverse order - earliest still wins',
    bids: [
      { amount: 100, userId: 'late' },
      { amount: 200, userId: 'early' },
    ],
    numWinners: 1,
    expectedWinners: [{ amount: 100, userId: 'late' }],
  },
  {
    name: 'Decimal amounts - lowest unique wins',
    bids: [
      { amount: 1.50, userId: 'user1' },
      { amount: 1.50, userId: 'user2' },
      { amount: 2.50, userId: 'user3' },
      { amount: 3.75, userId: 'user4' },
    ],
    numWinners: 1,
    expectedWinners: [{ amount: 2.50, userId: 'user3' }],
  },
  {
    name: 'Decimal amounts - multiple winners',
    bids: [
      { amount: 0.50, userId: 'u1' },
      { amount: 0.50, userId: 'u2' },
      { amount: 1.25, userId: 'u3' },
      { amount: 2.99, userId: 'u4' },
      { amount: 2.99, userId: 'u5' },
      { amount: 5.00, userId: 'u6' },
    ],
    numWinners: 2,
    expectedWinners: [
      { amount: 1.25, userId: 'u3' },
      { amount: 5.00, userId: 'u6' },
    ],
  },
]

function runTest(test: TestCase): boolean {
  const frequency = new Map<number, number>()
  const earliestPerAmount = new Map<number, string>()

  test.bids.forEach((bid, index) => {
    frequency.set(bid.amount, (frequency.get(bid.amount) || 0) + 1)
    if (!earliestPerAmount.has(bid.amount)) {
      earliestPerAmount.set(bid.amount, bid.userId)
    }
  })

  const uniqueAmounts = Array.from(frequency.entries())
    .filter(([, count]) => count === 1)
    .map(([amount]) => amount)
    .sort((a, b) => a - b)

  const selected = uniqueAmounts.slice(0, test.numWinners)
  const winners = selected.map((amount) => ({
    amount,
    userId: earliestPerAmount.get(amount) || '',
  }))

  const passed = JSON.stringify(winners) === JSON.stringify(test.expectedWinners)
  console.log(`${passed ? '✅' : '❌'} ${test.name}`)
  if (!passed) {
    console.log('   Expected:', JSON.stringify(test.expectedWinners))
    console.log('   Got:', JSON.stringify(winners))
  }
  return passed
}

console.log('Running winner selection tests...\n')
const results = testCases.map(runTest)
const passed = results.filter(Boolean).length
console.log(`\n${passed}/${testCases.length} tests passed`)

if (passed !== testCases.length) {
  process.exit(1)
}