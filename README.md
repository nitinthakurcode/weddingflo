# WeddingFlo 💍

> AI-Powered Wedding Management Platform for Modern Wedding Planners

A comprehensive, production-ready wedding management platform built with Next.js 15, Drizzle ORM, BetterAuth, and integrated AI capabilities.

## ✨ Features

### Core Features
- **Guest Management** - Track RSVPs, dietary restrictions, seating arrangements
- **Budget Management** - Real-time budget tracking with category breakdowns and spending analytics
- **Vendor Management** - Organize vendors, contracts, and payment schedules
- **Timeline Planning** - Interactive event timeline with dependency tracking
- **Creative Assets** - Centralized file management for photos, videos, and documents
- **QR Check-In** - Mobile-friendly guest check-in system with QR codes
- **Hotels & Accommodations** - Manage guest hotel blocks and room assignments
- **Gift Registry** - Track wedding gifts and thank you notes

### AI-Powered Features
- **Smart Budget Predictions** - AI-powered budget optimization and forecasting
- **Automated Email Generation** - AI-assisted email templates for guests and vendors
- **Seating Optimization** - Intelligent seating arrangement suggestions
- **Timeline Optimization** - AI recommendations for event scheduling
- **Insights & Analytics** - Real-time insights and suggestions

### Multi-Tenant Architecture
- **Company Isolation** - Complete data separation between companies
- **Role-Based Access Control** - Super Admin, Company Admin, Staff, and Client Viewer roles
- **Subdomain Support** - Each company can have their own subdomain
- **Usage Analytics** - Track per-company usage and metrics

### Security & Performance
- **Authentication** - Self-hosted authentication with BetterAuth
- **Security Headers** - HSTS, CSP, X-Frame-Options, and more
- **Code Splitting** - Dynamic imports for optimal bundle sizes
- **Image Optimization** - Next.js Image component with automatic optimization
- **PWA Support** - Progressive Web App with offline capabilities
- **Error Tracking** - Integrated Sentry error monitoring
- **Analytics** - PostHog analytics

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (Hetzner recommended)
- Stripe account (for billing features)
- OpenAI API key (for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/weddingflo.git
   cd weddingflo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:
   ```env
   # Database (Hetzner PostgreSQL)
   DATABASE_URL=postgresql://user:password@host:5432/weddingflo

   # BetterAuth
   BETTER_AUTH_SECRET=your_32_character_secret
   BETTER_AUTH_URL=http://localhost:3000
   NEXT_PUBLIC_APP_URL=http://localhost:3000

   # Google OAuth (optional)
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret

   # Stripe (for billing)
   STRIPE_SECRET_KEY=your_stripe_secret_key
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

   # OpenAI (for AI features)
   OPENAI_API_KEY=your_openai_api_key

   # Sentry (for error tracking)
   SENTRY_AUTH_TOKEN=your_sentry_auth_token
   SENTRY_ORG=your_sentry_org
   SENTRY_PROJECT=your_sentry_project

   # PostHog (for analytics)
   NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
   NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
   ```

4. **Set up the database**
   ```bash
   npx drizzle-kit push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000)**

## 📁 Project Structure

```
weddingflo/
├── src/
│   ├── app/                    # Next.js 15 App Router
│   │   ├── [locale]/(auth)/   # Authentication routes
│   │   ├── [locale]/(dashboard)/ # Protected dashboard routes
│   │   ├── api/               # API routes
│   │   └── layout.tsx         # Root layout
│   ├── components/            # React components
│   │   ├── budget/           # Budget management components
│   │   ├── dashboard/        # Dashboard components
│   │   ├── guests/           # Guest management components
│   │   ├── timeline/         # Timeline components
│   │   ├── ui/               # Reusable UI components (shadcn/ui)
│   │   └── ...
│   ├── features/             # Feature modules with tRPC routers
│   ├── lib/                  # Utility functions and helpers
│   │   ├── auth.ts          # BetterAuth server config
│   │   ├── auth-client.ts   # BetterAuth client hooks
│   │   ├── db/              # Drizzle ORM setup and schema
│   │   ├── permissions/     # RBAC permissions
│   │   ├── stripe/          # Stripe integration
│   │   └── ...
│   ├── server/              # tRPC server setup
│   └── types/               # TypeScript type definitions
├── drizzle/                 # Database migrations
├── messages/                # i18n translation files
├── public/                  # Static assets
├── next.config.ts          # Next.js configuration
└── package.json            # Dependencies and scripts
```

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **UI Components:** shadcn/ui + Radix UI
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts
- **State Management:** TanStack React Query + tRPC

### Backend & Database
- **Database:** PostgreSQL (Hetzner)
- **ORM:** Drizzle ORM
- **Authentication:** BetterAuth (self-hosted)
- **API Layer:** tRPC v11
- **File Storage:** S3-compatible (Hetzner Object Storage)

### AI & Analytics
- **AI:** OpenAI GPT-4
- **Analytics:** PostHog
- **Error Tracking:** Sentry

### Payment & Billing
- **Payment Processing:** Stripe
- **Subscription Management:** Stripe Billing
- **Webhooks:** Stripe Webhooks

## 🔐 Security Features

- **Security Headers:** HSTS, CSP, X-Frame-Options, X-Content-Type-Options
- **Rate Limiting:** API route protection
- **Input Sanitization:** XSS prevention
- **RBAC:** Role-based access control with granular permissions
- **Data Isolation:** Complete multi-tenant data separation
- **Encryption:** QR token encryption with AES-256
- **HTTPS Only:** Strict-Transport-Security enabled
- **CORS Protection:** Origin validation

## 📊 Performance Optimizations

- **Code Splitting:** Dynamic imports for heavy components (Recharts, QR Scanner)
- **Image Optimization:** Next.js Image component with automatic optimization
- **Bundle Size:** Optimized to <300KB first load JS for most pages
- **Lazy Loading:** Below-the-fold content lazy loaded
- **Caching:** Strategic caching with React Query
- **PWA:** Service worker for offline functionality

## 🌍 Internationalization

Supports 7 languages out of the box:
- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Japanese (ja)
- Chinese (zh)
- Hindi (hi)

## 🎨 Customization

### Branding
The platform supports white-labeling with custom:
- Logo
- Favicon
- Colors (primary, secondary, accent)
- Company name and subdomain

### Features
Enable/disable features per company:
- AI features toggle
- QR check-in
- Gift registry
- Hotel management
- Creative assets

## 📈 Deployment

### Docker (Recommended)
```bash
docker-compose up -d
```

### Manual Deployment
```bash
npm run build
npm start
```

### Environment Variables
Ensure all environment variables are set in your deployment platform:
- Database URL
- BetterAuth secret
- Stripe keys
- OpenAI API key
- Sentry credentials
- PostHog key

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Run type checking
npm run type-check

# Run linting
npm run lint

# Build for production
npm run build
```

## 📝 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler check
- `npm run seed:admin` - Seed super admin user

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, email support@weddingflo.com or join our Discord community.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Database powered by [Drizzle ORM](https://orm.drizzle.team/)
- Authentication by [BetterAuth](https://www.better-auth.com/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)

---

**Made with ❤️ for wedding planners worldwide**
