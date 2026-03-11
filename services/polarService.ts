import { auth } from './firebase';

export type BillingInterval = 'monthly' | 'yearly';

const CHECKOUT_URLS: Record<string, string> = {
  professional_monthly: 'https://buy.polar.sh/polar_cl_ce8QSzlCA6dEBXleq9s3a7RELPPerzAstmvVG1n5GEp',
  professional_yearly:  'https://buy.polar.sh/polar_cl_e2MXWZbZLAQRb6KPyC3OlAbEqWAL5auXaFmor3WTAnH',
  premium_monthly:      'https://buy.polar.sh/polar_cl_7ggKpqeVM8uerOrqe2BygahCl2nDgvvqrSs8M49V9CH',
  premium_yearly:       'https://buy.polar.sh/polar_cl_lab4p5RQWnjwHRVA8ZPhraGiv2Q2XQjqKTXDK0pR0Ux',
};

export function buildCheckoutUrl(plan: 'professional' | 'premium', interval: BillingInterval = 'monthly'): string | null {
  const user = auth.currentUser;
  if (!user) return null;

  const base = CHECKOUT_URLS[`${plan}_${interval}`];
  if (!base) return null;

  const params = new URLSearchParams();

  // Pass Firebase uid so the webhook can identify the user
  params.set('metadata[uid]', user.uid);

  // Pre-fill email for convenience
  if (user.email) {
    params.set('customer_email', user.email);
  }

  return `${base}?${params.toString()}`;
}

export function openCheckout(plan: 'professional' | 'premium', interval: BillingInterval = 'monthly'): void {
  const url = buildCheckoutUrl(plan, interval);
  if (!url) {
    console.error('User must be signed in to checkout');
    return;
  }
  window.open(url, '_blank');
}
