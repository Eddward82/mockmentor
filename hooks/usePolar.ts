// Polar uses redirect-based checkout — no embed script needed.
// This hook is a no-op placeholder kept for API consistency with the old useLemonSqueezy hook.
// After payment, Polar redirects back to the app and the webhook updates the user's plan.
export function usePolar() {
  // nothing to initialize
}
