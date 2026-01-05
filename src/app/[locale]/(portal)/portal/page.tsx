import { getTranslations } from 'next-intl/server';
import { Heart, CheckSquare, Users, Wallet, Camera, Sparkles, Clock } from 'lucide-react';
import Link from 'next/link';

export default async function ClientPortal() {
  const t = await getTranslations('portal');

  return (
    <div className="space-y-6 pb-24">
      {/* Hero Header */}
      <div className="text-center pt-2">
        <h1 className="text-2xl font-bold text-gradient-rose">{t('yourWeddingJourney')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('everythingInOnePlace')}</p>
      </div>

      {/* Main Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-100 via-pink-100 to-purple-100 dark:from-rose-950/30 dark:via-pink-950/30 dark:to-purple-950/30 p-8 text-center">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-rose-300/30 rounded-full blur-2xl animate-float" />
          <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-purple-300/30 rounded-full blur-2xl animate-float" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative">
          <div className="text-7xl mb-4 animate-bounce-in">💍</div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-rose-600 to-purple-600 bg-clip-text text-transparent mb-2">
            {t('yourBigDayAwaits')}
          </h2>
          <p className="text-rose-700 dark:text-rose-300 text-sm max-w-xs mx-auto">
            {t('plannerWillShareDetails')}
          </p>
        </div>
      </div>

      {/* Quick Stats Grid - Gen Z Glass Design */}
      <div className="grid grid-cols-2 gap-3">
        <QuickStatCard
          icon={<CheckSquare className="h-5 w-5" />}
          title={t('checklistCard')}
          value={t('zeroTasks')}
          gradient="from-emerald-500 to-teal-500"
          href="/portal/checklist"
        />
        <QuickStatCard
          icon={<Clock className="h-5 w-5" />}
          title={t('timelineCard')}
          value={t('viewSchedule')}
          gradient="from-blue-500 to-cyan-500"
          href="/portal/timeline"
        />
        <QuickStatCard
          icon={<Wallet className="h-5 w-5" />}
          title={t('paymentsCard')}
          value={t('viewInvoices')}
          gradient="from-amber-500 to-orange-500"
          href="/portal/payments"
        />
        <QuickStatCard
          icon={<Camera className="h-5 w-5" />}
          title={t('photosCard')}
          value={t('zeroPhotos')}
          gradient="from-purple-500 to-pink-500"
          href="/portal/creatives"
        />
      </div>

      {/* Mobile Optimized Banner */}
      <div className="glass-card p-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-4 w-4 text-rose-500" />
          <p className="text-xs text-muted-foreground">
            {t('mobileOptimizedMessage')}
          </p>
          <Sparkles className="h-4 w-4 text-rose-500" />
        </div>
      </div>
    </div>
  )
}

function QuickStatCard({
  icon,
  title,
  value,
  gradient,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  gradient: string;
  href?: string;
}) {
  const content = (
    <>
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} text-white mb-3 group-hover:scale-110 transition-spring`}>
        {icon}
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{value}</p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="glass-card p-4 text-center group hover:scale-[1.02] transition-spring press-scale cursor-pointer block">
        {content}
      </Link>
    );
  }

  return (
    <div className="glass-card p-4 text-center group hover:scale-[1.02] transition-spring press-scale cursor-pointer">
      {content}
    </div>
  );
}
