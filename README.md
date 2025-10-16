# WeddingFlow Pro 💍

> AI-Powered Wedding Management Platform for Modern Wedding Planners

A comprehensive, production-ready wedding management platform built with Next.js 15, Convex, Clerk, and integrated AI capabilities.

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
- **Authentication** - Secure authentication with Clerk
- **Security Headers** - HSTS, CSP, X-Frame-Options, and more
- **Code Splitting** - Dynamic imports for optimal bundle sizes
- **Image Optimization** - Next.js Image component with automatic optimization
- **PWA Support** - Progressive Web App with offline capabilities
- **Error Tracking** - Integrated Sentry error monitoring
- **Analytics** - PostHog analytics and Vercel Analytics

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Convex account ([convex.dev](https://convex.dev))
- Clerk account ([clerk.dev](https://clerk.dev))
- Stripe account (for billing features)
- OpenAI API key (for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/weddingflow-pro.git
   cd weddingflow-pro
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:
   ```env
   # Convex
   NEXT_PUBLIC_CONVEX_URL=your_convex_deployment_url
   CONVEX_DEPLOYMENT=your_convex_deployment_name

   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

   # Stripe (for billing)
   STRIPE_SECRET_KEY=your_stripe_secret_key
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

   # Stripe Price IDs
   NEXT_PUBLIC_STRIPE_PRICE_STARTER=price_xxx
   NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL=price_xxx
   NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE=price_xxx

   # OpenAI (for AI features)
   OPENAI_API_KEY=your_openai_api_key

   # Sentry (for error tracking)
   SENTRY_AUTH_TOKEN=your_sentry_auth_token
   SENTRY_ORG=your_sentry_org
   SENTRY_PROJECT=your_sentry_project

   # PostHog (for analytics)
   NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
   NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

   # Application
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ENCRYPTION_KEY=your_32_character_encryption_key
   ```

4. **Set up Convex**
   ```bash
   npx convex dev
   ```

5. **Configure Clerk**
   - Create a Clerk application
   - Add JWT template named "convex" with your Convex deployment URL as the issuer
   - Enable email/password and social providers as needed

6. **Set up Stripe Products**
   ```bash
   npm run setup-stripe
   ```

7. **Run the development server**
   ```bash
   npm run dev
   ```

8. **Open [http://localhost:3000](http://localhost:3000)**

## 📁 Project Structure

```
weddingflow-pro/
├── src/
│   ├── app/                    # Next.js 15 App Router
│   │   ├── (auth)/            # Authentication routes
│   │   ├── (dashboard)/       # Protected dashboard routes
│   │   ├── api/               # API routes
│   │   ├── providers/         # React context providers
│   │   ├── layout.tsx         # Root layout
│   │   ├── robots.ts          # SEO robots configuration
│   │   └── sitemap.ts         # SEO sitemap generation
│   ├── components/            # React components
│   │   ├── budget/           # Budget management components
│   │   ├── dashboard/        # Dashboard components
│   │   ├── guests/           # Guest management components
│   │   ├── timeline/         # Timeline components
│   │   ├── ui/               # Reusable UI components (shadcn/ui)
│   │   └── ...
│   ├── lib/                   # Utility functions and helpers
│   │   ├── analytics/        # Analytics integrations
│   │   ├── errors/           # Error handling and Sentry
│   │   ├── permissions/      # RBAC permissions
│   │   ├── stripe/           # Stripe integration
│   │   └── ...
│   └── types/                 # TypeScript type definitions
├── convex/                    # Convex backend
│   ├── schema.ts             # Database schema
│   ├── users.ts              # User queries and mutations
│   ├── guests.ts             # Guest management functions
│   ├── budget.ts             # Budget functions
│   └── ...
├── public/                    # Static assets
├── docs/                      # Documentation
├── next.config.ts            # Next.js configuration
├── tailwind.config.ts        # Tailwind CSS configuration
└── package.json              # Dependencies and scripts
```

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui + Radix UI
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts
- **State Management:** Convex (reactive)

### Backend & Database
- **Backend:** Convex (serverless)
- **Database:** Convex (NoSQL)
- **Authentication:** Clerk
- **File Storage:** Convex Storage
- **Realtime:** Convex (WebSocket-based)

### AI & Analytics
- **AI:** OpenAI GPT-4
- **Analytics:** PostHog + Vercel Analytics
- **Error Tracking:** Sentry
- **Monitoring:** Sentry Performance Monitoring

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
- **Caching:** Strategic caching with SWR patterns
- **PWA:** Service worker for offline functionality

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

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Environment Variables
Ensure all environment variables are set in your deployment platform:
- Convex deployment URL
- Clerk API keys
- Stripe keys
- OpenAI API key
- Sentry credentials
- PostHog key

### Post-Deployment
1. Set up Stripe webhooks pointing to your production URL
2. Update Clerk JWT template with production Convex URL
3. Configure custom domain (if using)
4. Test all critical flows (auth, payments, QR scanning)

## 🧪 Testing

```bash
# Run unit tests
npm test

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
- `npm run setup-stripe` - Set up Stripe products

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, email support@weddingflowpro.com or join our Discord community.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Backend powered by [Convex](https://convex.dev/)
- Authentication by [Clerk](https://clerk.dev/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)

---

**Made with ❤️ for wedding planners worldwide**
