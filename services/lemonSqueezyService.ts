import { auth } from './firebase';

export type BillingInterval = 'monthly' | 'yearly';

// Replace these with your actual Lemon Squeezy product variant URLs from the dashboard
// Go to: Lemon Squeezy Dashboard > Store > Products > [Product] > Variants > Share
const PLAN_URLS: Record<string, string> = {
  professional_monthly: 'https://sublysub.lemonsqueezy.com/checkout/buy/46816956-48fb-40e8-81d5-1cfe8d6ec3b8',
  professional_yearly: 'https://sublysub.lemonsqueezy.com/checkout/buy/44c73a5a-a048-4aaf-b725-e02fbea15bd1',
  premium_monthly: 'https://sublysub.lemonsqueezy.com/checkout/buy/32087a0b-1a10-46f4-a757-21af90462a82',
  premium_yearly: 'https://sublysub.lemonsqueezy.com/checkout/buy/aa2762d0-8e57-4311-9dc6-76adb5cc1b82',
};

export function buildCheckoutUrl(plan: 'professional' | 'premium', interval: BillingInterval = 'monthly'): string | null {
  const user = auth.currentUser;
  if (!user) return null;

  const base = PLAN_URLS[`${plan}_${interval}`];
  const params = new URLSearchParams();

  // Pass Firebase uid so the webhook can identify the user
  params.set('checkout[custom][uid]', user.uid);

  // Pre-fill email for convenience
  if (user.email) {
    params.set('checkout[email]', user.email);
  }

  // Pre-fill name
  if (user.displayName) {
    params.set('checkout[name]', user.displayName);
  }

  return `${base}?${params.toString()}`;
}

export function openCheckout(plan: 'professional' | 'premium', interval: BillingInterval = 'monthly'): void {
  const url = buildCheckoutUrl(plan, interval);
  if (!url) {
    console.error('User must be signed in to checkout');
    return;
  }

  if (window.LemonSqueezy) {
    window.LemonSqueezy.Url.Open(url);
  } else {
    // Fallback: open in new tab if lemon.js hasn't loaded
    window.open(url, '_blank');
  }
}
