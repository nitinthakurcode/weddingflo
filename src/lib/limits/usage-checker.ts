import { PlanTier, SUBSCRIPTION_PLANS } from '../stripe/plans';

export interface UsageStats {
  guestsCount: number;
  eventsCount: number;
  usersCount: number;
}

export interface LimitCheckResult {
  allowed: boolean;
  limit: number;
  current: number;
  exceeded: boolean;
  message?: string;
}

export class UsageChecker {
  private tier: PlanTier;
  private usage: UsageStats;

  constructor(tier: PlanTier, usage: UsageStats) {
    this.tier = tier;
    this.usage = usage;
  }

  checkGuestLimit(additionalGuests: number = 1): LimitCheckResult {
    const plan = SUBSCRIPTION_PLANS[this.tier];
    const limit = plan.limits.maxGuests;

    // -1 means unlimited
    if (limit === -1) {
      return {
        allowed: true,
        limit: -1,
        current: this.usage.guestsCount,
        exceeded: false,
      };
    }

    const newTotal = this.usage.guestsCount + additionalGuests;
    const allowed = newTotal <= limit;

    return {
      allowed,
      limit,
      current: this.usage.guestsCount,
      exceeded: !allowed,
      message: allowed
        ? undefined
        : `Guest limit exceeded. Your ${plan.name} plan allows ${limit} guests. Upgrade to add more.`,
    };
  }

  checkEventLimit(additionalEvents: number = 1): LimitCheckResult {
    const plan = SUBSCRIPTION_PLANS[this.tier];
    const limit = plan.limits.maxEvents;

    if (limit === -1) {
      return {
        allowed: true,
        limit: -1,
        current: this.usage.eventsCount,
        exceeded: false,
      };
    }

    const newTotal = this.usage.eventsCount + additionalEvents;
    const allowed = newTotal <= limit;

    return {
      allowed,
      limit,
      current: this.usage.eventsCount,
      exceeded: !allowed,
      message: allowed
        ? undefined
        : `Event limit exceeded. Your ${plan.name} plan allows ${limit} events. Upgrade to add more.`,
    };
  }

  checkUserLimit(additionalUsers: number = 1): LimitCheckResult {
    const plan = SUBSCRIPTION_PLANS[this.tier];
    const limit = plan.limits.maxUsers;

    if (limit === -1) {
      return {
        allowed: true,
        limit: -1,
        current: this.usage.usersCount,
        exceeded: false,
      };
    }

    const newTotal = this.usage.usersCount + additionalUsers;
    const allowed = newTotal <= limit;

    return {
      allowed,
      limit,
      current: this.usage.usersCount,
      exceeded: !allowed,
      message: allowed
        ? undefined
        : `User limit exceeded. Your ${plan.name} plan allows ${limit} users. Upgrade to add more.`,
    };
  }

  getAllLimits() {
    const plan = SUBSCRIPTION_PLANS[this.tier];
    return {
      guests: this.checkGuestLimit(0),
      events: this.checkEventLimit(0),
      users: this.checkUserLimit(0),
      planName: plan.name,
    };
  }

  getUsagePercentage(limitType: 'guests' | 'events' | 'users'): number {
    const plan = SUBSCRIPTION_PLANS[this.tier];
    let limit: number;
    let current: number;

    switch (limitType) {
      case 'guests':
        limit = plan.limits.maxGuests;
        current = this.usage.guestsCount;
        break;
      case 'events':
        limit = plan.limits.maxEvents;
        current = this.usage.eventsCount;
        break;
      case 'users':
        limit = plan.limits.maxUsers;
        current = this.usage.usersCount;
        break;
    }

    if (limit === -1) return 0; // Unlimited
    if (limit === 0) return 100;

    return Math.min(Math.round((current / limit) * 100), 100);
  }
}
