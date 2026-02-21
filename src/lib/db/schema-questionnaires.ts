/**
 * Questionnaires Schema
 *
 * February 2026 - Client questionnaire system for WeddingFlo
 *
 * Tables:
 * - questionnaire_templates: Reusable questionnaire templates
 * - questionnaires: Questionnaire instances sent to clients
 * - questionnaire_responses: Client responses to questionnaires
 */

import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  index,
  jsonb,
  integer,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const questionTypeEnum = pgEnum('question_type', [
  'text',
  'textarea',
  'number',
  'date',
  'time',
  'datetime',
  'select',
  'multi_select',
  'checkbox',
  'radio',
  'rating',
  'file_upload',
  'image_upload',
  'color_picker',
  'scale',
]);

export const questionnaireStatusEnum = pgEnum('questionnaire_status', [
  'draft',
  'sent',
  'viewed',
  'in_progress',
  'completed',
  'expired',
]);

// Questionnaire Templates table
export const questionnaireTemplates = pgTable(
  'questionnaire_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: text('company_id').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    category: text('category'), // e.g., 'wedding_vision', 'dietary', 'vendor_preferences'
    questions: jsonb('questions').$type<QuestionDefinition[]>().default([]),
    isDefault: boolean('is_default').default(false),
    isActive: boolean('is_active').default(true),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdBy: text('created_by'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('questionnaire_templates_company_idx').on(table.companyId),
    index('questionnaire_templates_category_idx').on(table.category),
  ]
);

// Questionnaires table (instances sent to clients)
export const questionnaires = pgTable(
  'questionnaires',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: text('company_id').notNull(),
    templateId: uuid('template_id').references(() => questionnaireTemplates.id, {
      onDelete: 'set null',
    }),
    clientId: text('client_id'), // Changed from uuid to text to match clients.id
    eventId: text('event_id'), // Changed from uuid to text to match events.id
    name: text('name').notNull(),
    description: text('description'),
    questions: jsonb('questions').$type<QuestionDefinition[]>().default([]),
    status: questionnaireStatusEnum('status').default('draft').notNull(),
    publicToken: text('public_token').unique(), // For public access
    sentAt: timestamp('sent_at'),
    viewedAt: timestamp('viewed_at'),
    completedAt: timestamp('completed_at'),
    expiresAt: timestamp('expires_at'),
    reminderSentAt: timestamp('reminder_sent_at'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdBy: text('created_by'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('questionnaires_company_idx').on(table.companyId),
    index('questionnaires_client_idx').on(table.clientId),
    index('questionnaires_event_idx').on(table.eventId),
    index('questionnaires_status_idx').on(table.status),
    index('questionnaires_public_token_idx').on(table.publicToken),
  ]
);

// Questionnaire Responses table
export const questionnaireResponses = pgTable(
  'questionnaire_responses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    questionnaireId: uuid('questionnaire_id')
      .references(() => questionnaires.id, { onDelete: 'cascade' })
      .notNull(),
    questionId: text('question_id').notNull(), // References question.id in questions JSONB
    answer: jsonb('answer').$type<QuestionAnswer>(),
    answeredAt: timestamp('answered_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('questionnaire_responses_questionnaire_idx').on(table.questionnaireId),
    index('questionnaire_responses_question_idx').on(table.questionId),
  ]
);

// Relations
export const questionnaireTemplatesRelations = relations(
  questionnaireTemplates,
  ({ many }) => ({
    questionnaires: many(questionnaires),
  })
);

export const questionnairesRelations = relations(
  questionnaires,
  ({ one, many }) => ({
    template: one(questionnaireTemplates, {
      fields: [questionnaires.templateId],
      references: [questionnaireTemplates.id],
    }),
    responses: many(questionnaireResponses),
  })
);

export const questionnaireResponsesRelations = relations(
  questionnaireResponses,
  ({ one }) => ({
    questionnaire: one(questionnaires, {
      fields: [questionnaireResponses.questionnaireId],
      references: [questionnaires.id],
    }),
  })
);

// Type definitions
export interface QuestionDefinition {
  id: string;
  type:
    | 'text'
    | 'textarea'
    | 'number'
    | 'date'
    | 'time'
    | 'datetime'
    | 'select'
    | 'multi_select'
    | 'checkbox'
    | 'radio'
    | 'rating'
    | 'file_upload'
    | 'image_upload'
    | 'color_picker'
    | 'scale';
  question: string;
  description?: string;
  required?: boolean;
  order: number;
  options?: QuestionOption[]; // For select, multi_select, radio, checkbox
  validation?: QuestionValidation;
  conditionalLogic?: ConditionalLogic;
  placeholder?: string;
  defaultValue?: unknown;
  section?: string; // Group questions into sections
}

export interface QuestionOption {
  id: string;
  label: string;
  value: string;
  description?: string;
  imageUrl?: string;
}

export interface QuestionValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  customMessage?: string;
}

export interface ConditionalLogic {
  dependsOn: string; // Question ID
  showWhen: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty';
  value?: unknown;
}

export interface QuestionAnswer {
  value: unknown;
  textValue?: string; // Human-readable text for select/multi_select
  files?: UploadedFile[];
}

export interface UploadedFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

// Default questionnaire templates
export const DEFAULT_QUESTIONNAIRE_TEMPLATES: Array<{
  name: string;
  description: string;
  category: string;
  questions: QuestionDefinition[];
}> = [
  {
    name: 'Wedding Vision & Style',
    description: 'Discover your wedding vision, style preferences, and overall aesthetic',
    category: 'wedding_vision',
    questions: [
      {
        id: 'vision_1',
        type: 'textarea',
        question: 'Describe your dream wedding in a few sentences',
        description: 'What does your perfect day look like?',
        required: true,
        order: 1,
        section: 'Vision',
      },
      {
        id: 'vision_2',
        type: 'multi_select',
        question: 'What wedding styles appeal to you?',
        required: true,
        order: 2,
        section: 'Vision',
        options: [
          { id: 'classic', label: 'Classic & Timeless', value: 'classic' },
          { id: 'modern', label: 'Modern & Minimalist', value: 'modern' },
          { id: 'romantic', label: 'Romantic & Whimsical', value: 'romantic' },
          { id: 'rustic', label: 'Rustic & Natural', value: 'rustic' },
          { id: 'bohemian', label: 'Bohemian & Free-Spirited', value: 'bohemian' },
          { id: 'glamorous', label: 'Glamorous & Luxurious', value: 'glamorous' },
          { id: 'cultural', label: 'Cultural & Traditional', value: 'cultural' },
        ],
      },
      {
        id: 'vision_3',
        type: 'multi_select',
        question: 'What colors are you considering for your wedding palette?',
        required: false,
        order: 3,
        section: 'Colors',
        options: [
          { id: 'blush', label: 'Blush & Soft Pink', value: 'blush' },
          { id: 'navy', label: 'Navy & Deep Blue', value: 'navy' },
          { id: 'sage', label: 'Sage & Green', value: 'sage' },
          { id: 'burgundy', label: 'Burgundy & Wine', value: 'burgundy' },
          { id: 'gold', label: 'Gold & Champagne', value: 'gold' },
          { id: 'ivory', label: 'Ivory & Cream', value: 'ivory' },
          { id: 'lavender', label: 'Lavender & Purple', value: 'lavender' },
          { id: 'terracotta', label: 'Terracotta & Earth Tones', value: 'terracotta' },
        ],
      },
      {
        id: 'vision_4',
        type: 'radio',
        question: 'What type of venue setting do you prefer?',
        required: true,
        order: 4,
        section: 'Venue',
        options: [
          { id: 'outdoor', label: 'Outdoor (Garden, Beach, Vineyard)', value: 'outdoor' },
          { id: 'indoor', label: 'Indoor (Ballroom, Hotel, Restaurant)', value: 'indoor' },
          { id: 'destination', label: 'Destination Wedding', value: 'destination' },
          { id: 'intimate', label: 'Intimate/Micro Wedding', value: 'intimate' },
        ],
      },
      {
        id: 'vision_5',
        type: 'scale',
        question: 'How formal do you want your wedding to be?',
        description: '1 = Very casual, 10 = Black tie formal',
        required: true,
        order: 5,
        section: 'Formality',
        validation: { min: 1, max: 10 },
      },
      {
        id: 'vision_6',
        type: 'textarea',
        question: 'Are there any cultural or religious traditions you want to incorporate?',
        required: false,
        order: 6,
        section: 'Traditions',
      },
      {
        id: 'vision_7',
        type: 'text',
        question: 'What is the one thing that MUST happen at your wedding?',
        required: false,
        order: 7,
        section: 'Must-Haves',
      },
      {
        id: 'vision_8',
        type: 'text',
        question: 'What is the one thing you absolutely DO NOT want at your wedding?',
        required: false,
        order: 8,
        section: 'Must-Haves',
      },
    ],
  },
  {
    name: 'Guest Dietary Requirements',
    description: 'Collect dietary restrictions and food preferences from your guests',
    category: 'dietary',
    questions: [
      {
        id: 'dietary_1',
        type: 'text',
        question: "Guest Name",
        required: true,
        order: 1,
        section: 'Guest Information',
      },
      {
        id: 'dietary_2',
        type: 'multi_select',
        question: 'Do you have any dietary restrictions?',
        required: true,
        order: 2,
        section: 'Dietary Restrictions',
        options: [
          { id: 'none', label: 'None', value: 'none' },
          { id: 'vegetarian', label: 'Vegetarian', value: 'vegetarian' },
          { id: 'vegan', label: 'Vegan', value: 'vegan' },
          { id: 'gluten_free', label: 'Gluten-Free', value: 'gluten_free' },
          { id: 'dairy_free', label: 'Dairy-Free', value: 'dairy_free' },
          { id: 'nut_allergy', label: 'Nut Allergy', value: 'nut_allergy' },
          { id: 'shellfish_allergy', label: 'Shellfish Allergy', value: 'shellfish_allergy' },
          { id: 'kosher', label: 'Kosher', value: 'kosher' },
          { id: 'halal', label: 'Halal', value: 'halal' },
        ],
      },
      {
        id: 'dietary_3',
        type: 'textarea',
        question: 'Please describe any other allergies or dietary needs',
        required: false,
        order: 3,
        section: 'Dietary Restrictions',
        conditionalLogic: {
          dependsOn: 'dietary_2',
          showWhen: 'not_equals',
          value: ['none'],
        },
      },
      {
        id: 'dietary_4',
        type: 'select',
        question: 'Meal preference',
        required: true,
        order: 4,
        section: 'Meal Selection',
        options: [
          { id: 'chicken', label: 'Chicken', value: 'chicken' },
          { id: 'fish', label: 'Fish', value: 'fish' },
          { id: 'beef', label: 'Beef', value: 'beef' },
          { id: 'vegetarian_meal', label: 'Vegetarian Option', value: 'vegetarian_meal' },
          { id: 'vegan_meal', label: 'Vegan Option', value: 'vegan_meal' },
        ],
      },
    ],
  },
  {
    name: 'Vendor Preferences',
    description: 'Understand your preferences for photography, music, flowers, and more',
    category: 'vendor_preferences',
    questions: [
      {
        id: 'vendor_1',
        type: 'multi_select',
        question: 'What photography style do you prefer?',
        required: true,
        order: 1,
        section: 'Photography',
        options: [
          { id: 'traditional', label: 'Traditional/Classic Posed', value: 'traditional' },
          { id: 'photojournalistic', label: 'Photojournalistic/Documentary', value: 'photojournalistic' },
          { id: 'artistic', label: 'Artistic/Editorial', value: 'artistic' },
          { id: 'candid', label: 'Candid/Natural', value: 'candid' },
        ],
      },
      {
        id: 'vendor_2',
        type: 'checkbox',
        question: 'Do you want videography?',
        required: true,
        order: 2,
        section: 'Photography',
      },
      {
        id: 'vendor_3',
        type: 'multi_select',
        question: 'What type of music do you want at your reception?',
        required: true,
        order: 3,
        section: 'Music & Entertainment',
        options: [
          { id: 'dj', label: 'DJ', value: 'dj' },
          { id: 'live_band', label: 'Live Band', value: 'live_band' },
          { id: 'acoustic', label: 'Acoustic/Solo Artist', value: 'acoustic' },
          { id: 'cultural', label: 'Cultural/Traditional Music', value: 'cultural' },
          { id: 'string_quartet', label: 'String Quartet', value: 'string_quartet' },
        ],
      },
      {
        id: 'vendor_4',
        type: 'textarea',
        question: 'What songs are must-plays at your wedding?',
        required: false,
        order: 4,
        section: 'Music & Entertainment',
      },
      {
        id: 'vendor_5',
        type: 'textarea',
        question: 'What songs should absolutely NOT be played?',
        required: false,
        order: 5,
        section: 'Music & Entertainment',
      },
      {
        id: 'vendor_6',
        type: 'multi_select',
        question: 'What floral style appeals to you?',
        required: true,
        order: 6,
        section: 'Flowers & Decor',
        options: [
          { id: 'lush', label: 'Lush & Abundant', value: 'lush' },
          { id: 'minimal', label: 'Minimal & Modern', value: 'minimal' },
          { id: 'wildflower', label: 'Wildflower/Garden Style', value: 'wildflower' },
          { id: 'tropical', label: 'Tropical', value: 'tropical' },
          { id: 'classic', label: 'Classic/Traditional', value: 'classic' },
        ],
      },
      {
        id: 'vendor_7',
        type: 'textarea',
        question: 'Are there any specific flowers you love or want to avoid?',
        required: false,
        order: 7,
        section: 'Flowers & Decor',
      },
    ],
  },
  {
    name: 'Important Dates & Details',
    description: 'Capture key dates, contacts, and logistics for wedding planning',
    category: 'dates_details',
    questions: [
      {
        id: 'dates_1',
        type: 'date',
        question: 'Wedding Date',
        required: true,
        order: 1,
        section: 'Key Dates',
      },
      {
        id: 'dates_2',
        type: 'date',
        question: 'Engagement Date',
        required: false,
        order: 2,
        section: 'Key Dates',
      },
      {
        id: 'dates_3',
        type: 'text',
        question: 'Partner 1 Full Name (as it should appear on invitations)',
        required: true,
        order: 3,
        section: 'Personal Details',
      },
      {
        id: 'dates_4',
        type: 'text',
        question: 'Partner 2 Full Name (as it should appear on invitations)',
        required: true,
        order: 4,
        section: 'Personal Details',
      },
      {
        id: 'dates_5',
        type: 'number',
        question: 'Estimated Guest Count',
        required: true,
        order: 5,
        section: 'Event Details',
      },
      {
        id: 'dates_6',
        type: 'text',
        question: 'Ceremony Location (if decided)',
        required: false,
        order: 6,
        section: 'Event Details',
      },
      {
        id: 'dates_7',
        type: 'text',
        question: 'Reception Location (if decided)',
        required: false,
        order: 7,
        section: 'Event Details',
      },
      {
        id: 'dates_8',
        type: 'textarea',
        question: 'Emergency Contact Information',
        description: 'Name, phone number, and relationship for day-of emergencies',
        required: true,
        order: 8,
        section: 'Contacts',
      },
    ],
  },
  {
    name: 'Budget Priorities',
    description: 'Understand what matters most for budget allocation',
    category: 'budget',
    questions: [
      {
        id: 'budget_1',
        type: 'number',
        question: 'What is your total wedding budget?',
        required: true,
        order: 1,
        section: 'Overall Budget',
      },
      {
        id: 'budget_2',
        type: 'radio',
        question: 'How flexible is your budget?',
        required: true,
        order: 2,
        section: 'Overall Budget',
        options: [
          { id: 'fixed', label: 'Fixed - Cannot exceed', value: 'fixed' },
          { id: 'flexible_10', label: 'Flexible - Can go 10% over for must-haves', value: 'flexible_10' },
          { id: 'flexible_20', label: 'Very Flexible - Can go 20%+ over', value: 'flexible_20' },
        ],
      },
      {
        id: 'budget_3',
        type: 'rating',
        question: 'Rate importance: Photography & Videography',
        description: '1 = Not important, 5 = Top priority',
        required: true,
        order: 3,
        section: 'Priorities',
        validation: { min: 1, max: 5 },
      },
      {
        id: 'budget_4',
        type: 'rating',
        question: 'Rate importance: Venue',
        description: '1 = Not important, 5 = Top priority',
        required: true,
        order: 4,
        section: 'Priorities',
        validation: { min: 1, max: 5 },
      },
      {
        id: 'budget_5',
        type: 'rating',
        question: 'Rate importance: Food & Catering',
        description: '1 = Not important, 5 = Top priority',
        required: true,
        order: 5,
        section: 'Priorities',
        validation: { min: 1, max: 5 },
      },
      {
        id: 'budget_6',
        type: 'rating',
        question: 'Rate importance: Flowers & Decor',
        description: '1 = Not important, 5 = Top priority',
        required: true,
        order: 6,
        section: 'Priorities',
        validation: { min: 1, max: 5 },
      },
      {
        id: 'budget_7',
        type: 'rating',
        question: 'Rate importance: Music & Entertainment',
        description: '1 = Not important, 5 = Top priority',
        required: true,
        order: 7,
        section: 'Priorities',
        validation: { min: 1, max: 5 },
      },
      {
        id: 'budget_8',
        type: 'rating',
        question: 'Rate importance: Attire (Dress, Suit, Accessories)',
        description: '1 = Not important, 5 = Top priority',
        required: true,
        order: 8,
        section: 'Priorities',
        validation: { min: 1, max: 5 },
      },
      {
        id: 'budget_9',
        type: 'textarea',
        question: 'What would you splurge on if money were no object?',
        required: false,
        order: 9,
        section: 'Dreams',
      },
      {
        id: 'budget_10',
        type: 'textarea',
        question: 'What areas are you willing to cut costs on?',
        required: false,
        order: 10,
        section: 'Dreams',
      },
    ],
  },
];
