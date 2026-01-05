import { Link } from '@/lib/i18n/navigation';
import Script from 'next/script';
import { getTranslations } from 'next-intl/server';
import {
  Heart,
  Calendar,
  Users,
  DollarSign,
  MessageCircle,
  Sparkles,
  CheckCircle2,
  Play,
  Star,
  ArrowRight,
  Zap,
  Globe,
  Shield,
  Clock,
  BarChart3,
  Building2,
  ChevronRight,
} from 'lucide-react';

export default async function Home() {
  const t = await getTranslations('landing');
  const tAuth = await getTranslations('auth');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://weddingflo.vercel.app';

  // JSON-LD Structured Data for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${baseUrl}/#organization`,
        name: 'WeddingFlo',
        url: baseUrl,
        logo: { '@type': 'ImageObject', url: `${baseUrl}/logo.png` },
        description: 'AI-powered wedding management platform for wedding planners and couples.',
        sameAs: ['https://twitter.com/weddingflopro', 'https://facebook.com/weddingflopro'],
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${baseUrl}/#softwareapplication`,
        name: 'WeddingFlo',
        applicationCategory: 'BusinessApplication',
        applicationSubCategory: 'Event Management Software',
        operatingSystem: 'Web Browser, iOS, Android',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', description: 'Free trial available' },
        aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.9', ratingCount: '2847', bestRating: '5' },
        featureList: [
          'Guest Management & RSVP',
          'AI-Powered Budget Prediction',
          'Vendor Management',
          'Timeline Planning',
          'Wedding Website Builder',
          'Multi-Language Support',
        ],
      },
    ],
  };

  const features = [
    {
      icon: Users,
      title: 'Guest Management',
      description: 'Manage unlimited guests with RSVP tracking, dietary preferences, seating charts, and QR check-in.',
      gradient: 'from-cobalt-500 to-teal-500',
    },
    {
      icon: DollarSign,
      title: 'Budget & Invoicing',
      description: 'Track every dollar with AI budget predictions. Send professional invoices in 9 currencies.',
      gradient: 'from-sage-500 to-teal-500',
    },
    {
      icon: Sparkles,
      title: 'AI Assistant',
      description: 'Get AI-powered budget predictions, email drafts, timeline optimization, and seating suggestions.',
      gradient: 'from-teal-500 to-gold-500',
    },
    {
      icon: Calendar,
      title: 'Timeline Builder',
      description: 'Create detailed wedding day timelines. AI optimizes schedules for perfect flow.',
      gradient: 'from-gold-500 to-gold-600',
    },
    {
      icon: MessageCircle,
      title: 'Communication Hub',
      description: 'Email, SMS, WhatsApp - all in one place. Automated email sequences for follow-ups.',
      gradient: 'from-gold-500 to-gold-600',
    },
    {
      icon: Globe,
      title: 'Wedding Websites',
      description: '20 beautiful templates. Custom domains. Password protection. RSVP integration.',
      gradient: 'from-cobalt-500 to-teal-500',
    },
  ];

  const stats = [
    { value: '10,000+', label: 'Weddings Planned' },
    { value: '$50M+', label: 'Payments Processed' },
    { value: '4.9/5', label: 'Customer Rating' },
    { value: '7', label: 'Languages Supported' },
  ];

  const testimonials = [
    {
      quote: "WeddingFlo's AI features saved me hours every week. The budget predictor is scary accurate!",
      author: 'Sarah Chen',
      role: 'Wedding Planner, NYC',
      rating: 5,
    },
    {
      quote: "Finally, a platform that speaks my language - literally! The Hindi support is perfect for our clients.",
      author: 'Priya Sharma',
      role: 'Event Coordinator, Mumbai',
      rating: 5,
    },
    {
      quote: "The website builder alone is worth the subscription. Our couples love their wedding sites.",
      author: 'Maria Rodriguez',
      role: 'Wedding Planner, Miami',
      rating: 5,
    },
  ];

  const pricing = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for trying out',
      features: ['1 wedding', '50 guests', '5 AI queries/mo', 'Basic features'],
      cta: 'Start Free',
      highlighted: false,
    },
    {
      name: 'Professional',
      price: '$79',
      period: '/month',
      description: 'For serious planners',
      features: [
        '20 weddings',
        '1,500 guests each',
        '200 AI queries/mo',
        'Custom branding',
        'All integrations',
        'Priority support',
      ],
      cta: 'Start Free Trial',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: '$199',
      period: '/month',
      description: 'For agencies & teams',
      features: [
        'Unlimited weddings',
        'Unlimited guests',
        '1,000 AI queries/mo',
        'White-label',
        'API access',
        'Dedicated manager',
      ],
      cta: 'Contact Sales',
      highlighted: false,
    },
  ];

  return (
    <>
      <Script
        id="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        strategy="afterInteractive"
      />

      <div className="min-h-screen bg-white dark:bg-mocha-950">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-mocha-950/80 backdrop-blur-xl border-b border-mocha-200/50 dark:border-mocha-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                  <Heart className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-teal-600 to-teal-500 bg-clip-text text-transparent">
                  WeddingFlo
                </span>
              </div>
              <div className="hidden md:flex items-center gap-8">
                <a href="#features" className="text-sm font-medium text-mocha-600 hover:text-mocha-900 dark:text-mocha-400 dark:hover:text-white transition-colors">Features</a>
                <Link href="/templates" className="text-sm font-medium text-mocha-600 hover:text-mocha-900 dark:text-mocha-400 dark:hover:text-white transition-colors">Templates</Link>
                <a href="#pricing" className="text-sm font-medium text-mocha-600 hover:text-mocha-900 dark:text-mocha-400 dark:hover:text-white transition-colors">Pricing</a>
                <Link href="/help" className="text-sm font-medium text-mocha-600 hover:text-mocha-900 dark:text-mocha-400 dark:hover:text-white transition-colors">Help</Link>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/sign-in"
                  className="text-sm font-medium text-mocha-700 hover:text-mocha-900 dark:text-mocha-300 dark:hover:text-white transition-colors"
                >
                  {tAuth('signIn')}
                </Link>
                <Link
                  href="/sign-up"
                  className="px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #115E59 0%, #0F766E 50%, #134E4A 100%)',
                    color: '#FFFFFF',
                    boxShadow: '0 2px 10px rgba(15, 118, 110, 0.3)',
                    textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                  }}
                >
                  {tAuth('signUp')}
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative pt-32 pb-20 overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-10 w-72 h-72 bg-teal-400/40 dark:bg-teal-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-40 right-20 w-96 h-96 bg-gold-400/40 dark:bg-gold-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute bottom-20 left-1/3 w-64 h-64 bg-teal-300/40 dark:bg-teal-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-4xl mx-auto">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-teal-100 to-gold-100 dark:from-teal-900/30 dark:to-gold-900/30 border border-teal-200/50 dark:border-teal-700/30 mb-8">
                <Sparkles className="h-4 w-4 text-teal-500" />
                <span className="text-sm font-medium text-teal-700 dark:text-teal-300">AI-Powered Wedding Planning</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6">
                <span className="text-mocha-900 dark:text-white">Plan Weddings</span>
                <br />
                <span className="bg-gradient-to-r from-teal-500 via-teal-400 to-gold-500 bg-clip-text text-transparent">
                  Like Magic
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-xl text-mocha-600 dark:text-mocha-400 mb-8 max-w-2xl mx-auto">
                The all-in-one platform for wedding planners. Manage guests, vendors, budgets, timelines,
                and client communication — all powered by AI.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                <Link
                  href="/sign-up"
                  className="group relative px-8 py-4 text-lg font-bold rounded-full flex items-center gap-2 overflow-hidden transition-all duration-300 hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #115E59 0%, #0F766E 50%, #134E4A 100%)',
                    color: '#FFFFFF',
                    boxShadow: '0 4px 20px rgba(15, 118, 110, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  }}
                >
                  <span className="relative z-10">Start Free Trial</span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform relative z-10" />
                </Link>
                <a
                  href="#demo"
                  className="group px-8 py-4 text-lg font-semibold text-mocha-800 dark:text-mocha-200 bg-white dark:bg-mocha-800 border-2 border-mocha-200 dark:border-mocha-700 rounded-full hover:bg-mocha-50 dark:hover:bg-mocha-700 hover:border-mocha-300 transition-all duration-300 flex items-center gap-2 shadow-sm"
                >
                  <Play className="h-5 w-5" />
                  Watch Demo
                </a>
              </div>

              {/* Trust Badges */}
              <div className="flex items-center justify-center gap-8 text-sm text-mocha-500 dark:text-mocha-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-sage-500" />
                  <span>Free 14-day trial</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-sage-500" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-sage-500" />
                  <span>Cancel anytime</span>
                </div>
              </div>
            </div>

            {/* Hero Image/Video */}
            <div id="demo" className="mt-16 relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-teal-500/10 border border-mocha-200/50 dark:border-mocha-800/50 bg-gradient-to-b from-mocha-50 to-white dark:from-mocha-900 dark:to-mocha-950">
                <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-teal-50 via-gold-50 to-sage-50 dark:from-teal-950/30 dark:via-gold-950/30 dark:to-sage-950/30">
                  <div className="text-center p-8">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-teal-500/30 cursor-pointer hover:scale-110 transition-transform">
                      <Play className="h-10 w-10 text-white ml-1" />
                    </div>
                    <p className="text-lg font-medium text-mocha-600 dark:text-mocha-400">Product Demo Video</p>
                    <p className="text-sm text-mocha-500 dark:text-mocha-500 mt-1">See WeddingFlo in action (2 min)</p>
                  </div>
                </div>
              </div>
              {/* Floating Elements */}
              <div className="absolute -left-4 top-1/4 bg-white dark:bg-mocha-800 rounded-xl shadow-xl p-4 hidden lg:block animate-bounce" style={{ animationDuration: '3s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sage-100 dark:bg-sage-900/30 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-sage-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-mocha-900 dark:text-white">New RSVP</p>
                    <p className="text-xs text-mocha-500">Sarah + Guest confirmed</p>
                  </div>
                </div>
              </div>
              <div className="absolute -right-4 top-1/3 bg-white dark:bg-mocha-800 rounded-xl shadow-xl p-4 hidden lg:block animate-bounce" style={{ animationDuration: '3s', animationDelay: '1s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-teal-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-mocha-900 dark:text-white">AI Suggestion</p>
                    <p className="text-xs text-mocha-500">Budget optimized -$2,400</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-mocha-50 dark:bg-mocha-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-4xl font-bold bg-gradient-to-r from-teal-500 to-gold-500 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-sm text-mocha-600 dark:text-mocha-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-mocha-900 dark:text-white mb-4">
                Everything You Need to Plan Perfect Weddings
              </h2>
              <p className="text-lg text-mocha-600 dark:text-mocha-400 max-w-2xl mx-auto">
                From first inquiry to final thank-you note — manage every detail in one beautiful platform.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="group relative p-8 rounded-2xl bg-white dark:bg-mocha-900 border border-mocha-200 dark:border-mocha-800 hover:shadow-xl hover:shadow-teal-500/5 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-mocha-900 dark:text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-mocha-600 dark:text-mocha-400">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Additional Features List */}
            <div className="mt-16 p-8 rounded-2xl bg-gradient-to-r from-teal-50 to-gold-50 dark:from-teal-950/30 dark:to-gold-950/30 border border-teal-200/50 dark:border-teal-800/30">
              <h3 className="text-xl font-semibold text-mocha-900 dark:text-white mb-6 text-center">
                Plus 50+ More Features
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  'Floor Plan Designer',
                  'Vendor Contracts',
                  'Payment Processing',
                  'Email Sequences',
                  'Calendar Sync',
                  'QR Code Check-in',
                  'Gamification',
                  'Referral Program',
                  'Multi-Currency',
                  'Dark Mode',
                  'Mobile PWA',
                  'Export Reports',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-mocha-700 dark:text-mocha-300">
                    <CheckCircle2 className="h-4 w-4 text-teal-500 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Template Showcase Section */}
        <section id="templates" className="py-24 bg-mocha-50 dark:bg-mocha-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-mocha-900 dark:text-white mb-4">
                20 Beautiful Wedding Website Templates
              </h2>
              <p className="text-lg text-mocha-600 dark:text-mocha-400 max-w-2xl mx-auto">
                Give your couples stunning wedding websites. Fully customizable, mobile-responsive, with built-in RSVP.
              </p>
            </div>

            {/* Template Preview Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { name: 'Classic Elegance', style: 'Timeless', color: 'from-gold-400 to-gold-600' },
                { name: 'Modern Minimal', style: 'Contemporary', color: 'from-mocha-600 to-mocha-800' },
                { name: 'Garden Romance', style: 'Floral', color: 'from-rose-400 to-rose-500' },
                { name: 'Rustic Charm', style: 'Vintage', color: 'from-gold-600 to-gold-700' },
                { name: 'Bohemian Dream', style: 'Free Spirit', color: 'from-teal-400 to-sage-500' },
                { name: 'Luxe Gold', style: 'Glamorous', color: 'from-gold-400 to-gold-500' },
                { name: 'Beach Breeze', style: 'Coastal', color: 'from-teal-400 to-cobalt-500' },
                { name: 'Midnight Magic', style: 'Dark & Moody', color: 'from-cobalt-500 to-teal-600' },
              ].map((template, i) => (
                <div key={i} className="group cursor-pointer">
                  <div className={`aspect-[4/5] rounded-xl bg-gradient-to-br ${template.color} p-4 flex flex-col justify-end transition-transform group-hover:scale-105 shadow-lg`}>
                    <div className="bg-white/90 dark:bg-mocha-900/90 backdrop-blur-sm rounded-lg p-3">
                      <p className="font-semibold text-mocha-900 dark:text-white text-sm">{template.name}</p>
                      <p className="text-xs text-mocha-500 dark:text-mocha-400">{template.style}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link
                href="/templates"
                className="inline-flex items-center gap-2 px-6 py-3 text-teal-600 dark:text-teal-400 font-medium hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
              >
                View All 20 Templates
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-mocha-900 dark:text-white mb-4">
                Loved by Wedding Planners Worldwide
              </h2>
              <p className="text-lg text-mocha-600 dark:text-mocha-400">
                Join thousands of professionals who trust WeddingFlo
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="p-8 rounded-2xl bg-white dark:bg-mocha-900 border border-mocha-200 dark:border-mocha-800 shadow-sm"
                >
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-gold-400 text-gold-400" />
                    ))}
                  </div>
                  <p className="text-mocha-700 dark:text-mocha-300 mb-6 italic">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div>
                    <p className="font-semibold text-mocha-900 dark:text-white">{testimonial.author}</p>
                    <p className="text-sm text-mocha-500 dark:text-mocha-400">{testimonial.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 bg-mocha-50 dark:bg-mocha-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-mocha-900 dark:text-white mb-4">
                Simple, Transparent Pricing
              </h2>
              <p className="text-lg text-mocha-600 dark:text-mocha-400">
                Start free, upgrade when you&apos;re ready
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {pricing.map((plan, index) => (
                <div
                  key={index}
                  className={`relative p-8 rounded-2xl ${
                    plan.highlighted
                      ? 'bg-gradient-to-b from-teal-600 to-teal-800 text-white shadow-xl shadow-teal-600/40 scale-105'
                      : 'bg-white dark:bg-mocha-900 border border-mocha-200 dark:border-mocha-800'
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gold-400 text-gold-900 text-sm font-medium rounded-full">
                      Most Popular
                    </div>
                  )}
                  <div className="text-center mb-6">
                    <h3 className={`text-xl font-semibold mb-2 ${plan.highlighted ? 'text-white' : 'text-mocha-900 dark:text-white'}`}>
                      {plan.name}
                    </h3>
                    <p className={`text-sm ${plan.highlighted ? 'text-teal-100' : 'text-mocha-500 dark:text-mocha-400'}`}>
                      {plan.description}
                    </p>
                  </div>
                  <div className="text-center mb-6">
                    <span className={`text-5xl font-bold ${plan.highlighted ? 'text-white' : 'text-mocha-900 dark:text-white'}`}>
                      {plan.price}
                    </span>
                    <span className={plan.highlighted ? 'text-teal-100' : 'text-mocha-500 dark:text-mocha-400'}>
                      {plan.period}
                    </span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className={`flex items-center gap-2 text-sm ${plan.highlighted ? 'text-white' : 'text-mocha-600 dark:text-mocha-400'}`}>
                        <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${plan.highlighted ? 'text-white' : 'text-teal-500'}`} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/sign-up"
                    className={`block w-full py-3 text-center font-medium rounded-lg transition-colors ${
                      plan.highlighted
                        ? 'bg-white text-teal-600 hover:bg-mocha-100'
                        : 'bg-mocha-100 dark:bg-mocha-800 text-mocha-900 dark:text-white hover:bg-mocha-200 dark:hover:bg-mocha-700'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-mocha-900 dark:text-white mb-6">
              Ready to Transform Your Wedding Business?
            </h2>
            <p className="text-lg text-mocha-600 dark:text-mocha-400 mb-8">
              Join thousands of wedding planners who save 10+ hours per week with WeddingFlo.
            </p>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 px-8 py-4 text-lg font-bold rounded-full transition-all duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #115E59 0%, #0F766E 50%, #134E4A 100%)',
                color: '#FFFFFF',
                boxShadow: '0 4px 20px rgba(15, 118, 110, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              }}
            >
              Start Your Free Trial
              <ArrowRight className="h-5 w-5" />
            </Link>
            <p className="text-sm text-mocha-500 dark:text-mocha-400 mt-4">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-16 bg-mocha-900 text-mocha-400">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-4 gap-12">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                    <Heart className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xl font-bold text-white">WeddingFlo</span>
                </div>
                <p className="text-sm">
                  AI-powered wedding management for modern planners.
                </p>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4">Product</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                  <li><Link href="/templates" className="hover:text-white transition-colors">Templates</Link></li>
                  <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                  <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4">Company</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4">Legal</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
                </ul>
              </div>
            </div>
            <div className="mt-12 pt-8 border-t border-mocha-800 text-center text-sm">
              <p>&copy; {new Date().getFullYear()} WeddingFlo. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
