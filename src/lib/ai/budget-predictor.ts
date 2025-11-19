import { openai, AI_MODELS, AI_DEFAULTS } from './openai-client';

export interface BudgetItem {
  id: string;
  category: string;
  name: string;
  estimatedCost: number;
  actualCost?: number;
  paid: boolean;
}

export interface EventDetails {
  guestCount: number;
  eventDate: string;
  location?: string;
  eventType: string; // wedding, reception, etc.
}

export interface BudgetPrediction {
  category: string;
  currentSpent: number;
  estimatedTotal: number;
  predictedFinal: number;
  confidenceScore: number;
  variance: number; // Difference between estimated and predicted
  reasoning: string;
}

export interface BudgetPredictionResult {
  predictions: BudgetPrediction[];
  totalPredicted: number;
  totalEstimated: number;
  totalVariance: number;
  overallConfidence: number;
  riskFactors: string[];
  recommendations: string[];
}

export async function predictBudget(
  budgetItems: BudgetItem[],
  eventDetails: EventDetails
): Promise<BudgetPredictionResult> {
  // Group items by category and calculate totals
  const categoryData = budgetItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = {
        items: [],
        estimatedTotal: 0,
        actualTotal: 0,
      };
    }
    acc[item.category].items.push(item);
    acc[item.category].estimatedTotal += item.estimatedCost;
    acc[item.category].actualTotal += item.actualCost || 0;
    return acc;
  }, {} as Record<string, { items: BudgetItem[]; estimatedTotal: number; actualTotal: number }>);

  const prompt = `You are a wedding budget analyst. Analyze the current budget and predict final costs.

EVENT DETAILS:
- Guest Count: ${eventDetails.guestCount}
- Event Date: ${eventDetails.eventDate}
- Location: ${eventDetails.location || 'Not specified'}
- Type: ${eventDetails.eventType}

BUDGET BY CATEGORY:
${Object.entries(categoryData).map(([category, data]) => `
${category}:
  - Items: ${data.items.length}
  - Estimated Total: $${data.estimatedTotal}
  - Currently Spent: $${data.actualTotal}
  - Paid Items: ${data.items.filter(i => i.paid).length}/${data.items.length}
  - Key Items: ${data.items.slice(0, 3).map(i => `${i.name} ($${i.estimatedCost})`).join(', ')}
`).join('\n')}

INSTRUCTIONS:
1. Predict the final cost for each category based on:
   - Current spending patterns vs estimates
   - Typical wedding cost overruns in each category
   - Number of guests and event type
   - Time until event (potential for changes)
2. Provide confidence score (0-100) for each prediction
3. Identify risk factors (categories likely to exceed budget)
4. Give actionable recommendations to stay on budget

Respond ONLY with valid JSON in this exact format:
{
  "predictions": [
    {
      "category": "Venue",
      "currentSpent": 5000,
      "estimatedTotal": 8000,
      "predictedFinal": 8500,
      "confidenceScore": 85,
      "variance": 500,
      "reasoning": "Brief explanation of prediction"
    }
  ],
  "totalPredicted": 50000,
  "totalEstimated": 45000,
  "totalVariance": 5000,
  "overallConfidence": 78,
  "riskFactors": ["Category or area of concern"],
  "recommendations": ["Actionable advice"]
}`;

  const response = await openai.chat.completions.create({
    model: AI_MODELS.SIMPLE, // Use cheaper model for predictions
    messages: [
      {
        role: 'system',
        content: 'You are an expert wedding budget analyst with extensive experience in cost prediction and financial planning for events. Always respond with valid JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.5, // Lower temperature for more consistent predictions
    max_tokens: 2500,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  const result = JSON.parse(content);
  return result as BudgetPredictionResult;
}
