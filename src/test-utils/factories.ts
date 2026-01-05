import { faker } from '@faker-js/faker'

/**
 * Test Data Factories
 * Generate mock data for testing
 * @see TESTING_INFRASTRUCTURE_COMPLETE - Session 52
 */

export const createMockClient = (overrides?: Partial<any>) => ({
  id: faker.string.uuid(),
  company_id: faker.string.uuid(),
  first_name: faker.person.firstName(),
  last_name: faker.person.lastName(),
  email: faker.internet.email(),
  phone: faker.phone.number(),
  wedding_date: faker.date.future().toISOString().split('T')[0],
  venue: faker.location.city(),
  status: 'active' as const,
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  ...overrides,
})

export const createMockGuest = (overrides?: Partial<any>) => ({
  id: faker.string.uuid(),
  client_id: faker.string.uuid(),
  company_id: faker.string.uuid(),
  first_name: faker.person.firstName(),
  last_name: faker.person.lastName(),
  email: faker.internet.email(),
  phone: faker.phone.number(),
  rsvp_status: 'pending' as const,
  dietary_restrictions: faker.helpers.arrayElement([[], ['vegetarian'], ['vegan', 'gluten-free']]),
  has_plus_one: faker.datatype.boolean(),
  plus_one_name: faker.person.fullName(),
  table_number: faker.number.int({ min: 1, max: 20 }),
  created_at: faker.date.past().toISOString(),
  ...overrides,
})

export const createMockBudgetItem = (overrides?: Partial<any>) => ({
  id: faker.string.uuid(),
  client_id: faker.string.uuid(),
  company_id: faker.string.uuid(),
  category: faker.helpers.arrayElement(['venue', 'catering', 'photography', 'flowers', 'music', 'decor']),
  name: faker.commerce.productName(),
  estimated_cost: parseFloat(faker.commerce.price({ min: 100, max: 10000 })),
  actual_cost: parseFloat(faker.commerce.price({ min: 100, max: 10000 })),
  paid: faker.datatype.boolean(),
  payment_date: faker.date.past().toISOString().split('T')[0],
  notes: faker.lorem.sentence(),
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  ...overrides,
})

export const createMockEvent = (overrides?: Partial<any>) => ({
  id: faker.string.uuid(),
  client_id: faker.string.uuid(),
  company_id: faker.string.uuid(),
  name: faker.helpers.arrayElement(['Ceremony', 'Reception', 'Cocktail Hour', 'Rehearsal Dinner']),
  date: faker.date.future().toISOString().split('T')[0],
  start_time: '18:00',
  end_time: '22:00',
  location: faker.location.city(),
  description: faker.lorem.paragraph(),
  created_at: faker.date.past().toISOString(),
  ...overrides,
})

export const createMockVendor = (overrides?: Partial<any>) => ({
  id: faker.string.uuid(),
  client_id: faker.string.uuid(),
  company_id: faker.string.uuid(),
  name: faker.company.name(),
  category: faker.helpers.arrayElement(['photographer', 'caterer', 'florist', 'dj', 'venue']),
  contact_name: faker.person.fullName(),
  email: faker.internet.email(),
  phone: faker.phone.number(),
  website: faker.internet.url(),
  cost: parseFloat(faker.commerce.price({ min: 500, max: 10000 })),
  status: 'confirmed' as const,
  notes: faker.lorem.sentence(),
  created_at: faker.date.past().toISOString(),
  ...overrides,
})

export const createMockGift = (overrides?: Partial<any>) => ({
  id: faker.string.uuid(),
  client_id: faker.string.uuid(),
  company_id: faker.string.uuid(),
  guest_id: faker.string.uuid(),
  gift_name: faker.commerce.productName(),
  description: faker.lorem.sentence(),
  gift_type: 'physical' as const,
  monetary_value: parseFloat(faker.commerce.price({ min: 20, max: 500 })),
  currency: 'USD',
  delivery_status: 'delivered' as const,
  received_date: faker.date.past().toISOString().split('T')[0],
  thank_you_sent: faker.datatype.boolean(),
  created_at: faker.date.past().toISOString(),
  ...overrides,
})

export const createMockTimeline = (overrides?: Partial<any>) => ({
  id: faker.string.uuid(),
  client_id: faker.string.uuid(),
  company_id: faker.string.uuid(),
  task: faker.lorem.words(3),
  description: faker.lorem.sentence(),
  due_date: faker.date.future().toISOString().split('T')[0],
  completed: faker.datatype.boolean(),
  category: faker.helpers.arrayElement(['planning', 'booking', 'logistics', 'final_touches']),
  created_at: faker.date.past().toISOString(),
  ...overrides,
})

export const createMockHotel = (overrides?: Partial<any>) => ({
  id: faker.string.uuid(),
  client_id: faker.string.uuid(),
  company_id: faker.string.uuid(),
  name: `${faker.company.name()} Hotel`,
  address: faker.location.streetAddress(),
  city: faker.location.city(),
  state: faker.location.state(),
  zip_code: faker.location.zipCode(),
  phone: faker.phone.number(),
  website: faker.internet.url(),
  room_block_rate: parseFloat(faker.commerce.price({ min: 80, max: 300 })),
  rooms_blocked: faker.number.int({ min: 10, max: 50 }),
  rooms_booked: faker.number.int({ min: 0, max: 50 }),
  created_at: faker.date.past().toISOString(),
  ...overrides,
})

export const createMockUser = (overrides?: Partial<any>) => ({
  id: faker.string.uuid(),
  auth_id: `user_${faker.string.alphanumeric(24)}`,
  email: faker.internet.email(),
  first_name: faker.person.firstName(),
  last_name: faker.person.lastName(),
  company_id: faker.string.uuid(),
  role: 'company_admin' as const,
  subscription_tier: 'professional' as const,
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  ...overrides,
})

export const createMockCompany = (overrides?: Partial<any>) => ({
  id: faker.string.uuid(),
  name: faker.company.name(),
  subdomain: faker.internet.domainWord(),
  business_type: 'wedding_planner' as const,
  subscription_tier: 'professional' as const,
  subscription_status: 'active' as const,
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  ...overrides,
})

// Helper to create multiple mock items
export const createMockArray = <T>(factory: (index: number) => T, count: number): T[] => {
  return Array.from({ length: count }, (_, i) => factory(i))
}

// Reset faker seed for consistent test data
export const resetFakerSeed = (seed: number = 123) => {
  faker.seed(seed)
}
