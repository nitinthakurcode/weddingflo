import type { AIFeatureType } from '../openai-client'

export interface BudgetPredictionInput {
  guestCount: number
  venueType: 'hotel' | 'outdoor' | 'banquet_hall' | 'restaurant' | 'destination' | 'other'
  location: string // e.g., "New York, NY" or "Paris, France"
  weddingDate?: string // ISO date string
  eventStyle: 'casual' | 'formal' | 'luxury' | 'traditional' | 'modern'
  additionalContext?: string
}

export interface BudgetCategory {
  category: string
  suggestedAmount: number
  minAmount: number
  maxAmount: number
  reasoning: string
  tips: string[]
}

export interface BudgetPredictionResponse {
  totalBudget: number
  currency: string
  categories: BudgetCategory[]
  savingsTips: string[]
  seasonalConsiderations: string
  locationInsights: string
}

export function generateBudgetPredictionPrompt(input: BudgetPredictionInput): string {
  const season = input.weddingDate
    ? getSeasonFromDate(input.weddingDate)
    : 'not specified'

  return `You are an expert wedding budget planner with extensive knowledge of wedding costs worldwide.
Generate a detailed, realistic budget prediction for a wedding with the following details:

Wedding Details:
- Guest Count: ${input.guestCount} guests
- Venue Type: ${input.venueType}
- Location: ${input.location}
- Season: ${season}
- Event Style: ${input.eventStyle}
${input.additionalContext ? `- Additional Context: ${input.additionalContext}` : ''}

Please provide a comprehensive budget breakdown that includes:

1. TOTAL BUDGET: Overall estimated budget in local currency
2. CATEGORY BREAKDOWN: For each major wedding expense category:
   - Category name
   - Suggested amount (realistic middle-ground)
   - Minimum amount (budget-friendly option)
   - Maximum amount (luxury option)
   - Reasoning for the amounts based on location and guest count
   - 2-3 practical tips for this category

Include these categories:
- Venue & Catering
- Photography & Videography
- Flowers & Decorations
- Music & Entertainment
- Wedding Attire (bride, groom, party)
- Invitations & Stationery
- Wedding Cake
- Transportation
- Wedding Rings
- Miscellaneous & Contingency

3. SAVINGS TIPS: 5-7 actionable tips to reduce costs without sacrificing quality
4. SEASONAL CONSIDERATIONS: How the ${season} season affects pricing and planning
5. LOCATION INSIGHTS: Specific insights about wedding costs in ${input.location}

Respond ONLY with valid JSON in this exact format:
{
  "totalBudget": number,
  "currency": "USD" or local currency code,
  "categories": [
    {
      "category": "string",
      "suggestedAmount": number,
      "minAmount": number,
      "maxAmount": number,
      "reasoning": "string",
      "tips": ["string", "string", "string"]
    }
  ],
  "savingsTips": ["string", "string", ...],
  "seasonalConsiderations": "string",
  "locationInsights": "string"
}

Be realistic and base your estimates on actual market prices for ${input.location}. Consider the ${input.eventStyle} style when suggesting amounts.`
}

function getSeasonFromDate(dateString: string): string {
  const date = new Date(dateString)
  const month = date.getMonth() // 0-11

  if (month >= 2 && month <= 4) return 'Spring'
  if (month >= 5 && month <= 7) return 'Summer'
  if (month >= 8 && month <= 10) return 'Fall'
  return 'Winter'
}
