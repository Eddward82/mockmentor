import * as crypto from 'crypto';
import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();

// Map your Lemon Squeezy variant IDs to internal plan names
// Both monthly and yearly variants for the same plan map to the same plan name
const VARIANT_TO_PLAN: Record<string, 'professional' | 'premium'> = {
  '1314338': 'professional', // Professional Monthly
  '1314371': 'professional', // Professional Yearly
  '1314369': 'premium', // Premium Monthly
  '1314506': 'premium', // Premium Yearly
};

export const lemonWebhook = onRequest(
  {
    secrets: ['LEMON_SQUEEZY_WEBHOOK_SECRET'],
  },
  async (req, res) => {
    // Only accept POST
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    // Get the webhook secret
    const webhookSecret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('LEMON_SQUEEZY_WEBHOOK_SECRET not configured');
      res.status(500).send('Server misconfigured');
      return;
    }

    // Verify webhook signature
    const rawBody = (req as any).rawBody as Buffer;
    const signature = req.headers['x-signature'] as string;

    if (!rawBody || !signature) {
      res.status(400).send('Missing body or signature');
      return;
    }

    const hmac = crypto.createHmac('sha256', webhookSecret);
    const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
    const sigBuffer = Buffer.from(signature, 'utf8');

    if (digest.length !== sigBuffer.length || !crypto.timingSafeEqual(digest, sigBuffer)) {
      res.status(401).send('Invalid signature');
      return;
    }

    // Parse the event
    const payload = JSON.parse(rawBody.toString('utf8'));
    const eventName: string = payload.meta?.event_name;
    const customData = payload.meta?.custom_data ?? {};
    const uid: string | undefined = customData.uid;

    console.log(`Lemon Squeezy webhook: ${eventName}, uid: ${uid}`);

    if (!uid) {
      // No uid means we can't identify the user — acknowledge but skip
      res.status(200).send('No uid, ignored');
      return;
    }

    const db = getFirestore();
    const planRef = db.doc(`users/${uid}/profile/plan`);

    if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
      const attrs = payload.data?.attributes ?? {};
      const status: string = attrs.status;
      const variantId: string = String(attrs.variant_id ?? '');
      const plan = VARIANT_TO_PLAN[variantId];

      if (status === 'active' && plan) {
        await planRef.set(
          {
            plan,
            lsSubscriptionId: String(payload.data?.id ?? ''),
            lsVariantId: variantId,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        console.log(`Plan updated to ${plan} for user ${uid}`);
      }
    } else if (
      eventName === 'subscription_cancelled' ||
      eventName === 'subscription_expired'
    ) {
      await planRef.set(
        { plan: 'starter', updatedAt: new Date().toISOString() },
        { merge: true }
      );
      console.log(`Plan downgraded to starter for user ${uid}`);
    }

    // Always return 200 to prevent Lemon Squeezy from retrying
    res.status(200).send('OK');
  }
);
