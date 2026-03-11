import * as crypto from 'crypto';
import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();

// Map Polar product IDs to internal plan names
const PRODUCT_TO_PLAN: Record<string, 'professional' | 'premium'> = {
  '5f157d56-826b-48b7-8657-241cb41419f4': 'professional', // Professional Monthly
  '1a816832-c376-4833-b1ca-099108cbfe24': 'professional', // Professional Yearly
  '261673be-c002-4cc7-bd10-402a1ec17db6': 'premium',      // Premium Monthly
  '1e9ed26c-4385-42d8-96ca-1bdbd4b5b16d': 'premium',      // Premium Yearly
};

export const polarWebhook = onRequest(
  {
    secrets: ['POLAR_WEBHOOK_SECRET'],
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('POLAR_WEBHOOK_SECRET not configured');
      res.status(500).send('Server misconfigured');
      return;
    }

    // Verify Polar webhook signature (HMAC SHA-256)
    const rawBody = (req as any).rawBody as Buffer;
    const signature = req.headers['webhook-signature'] as string;

    if (!rawBody || !signature) {
      res.status(400).send('Missing body or signature');
      return;
    }

    // Polar sends: "v1=<hex_digest>"
    const sigHex = signature.startsWith('v1=') ? signature.slice(3) : signature;
    const hmac = crypto.createHmac('sha256', webhookSecret);
    const digest = hmac.update(rawBody).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(digest, 'utf8'), Buffer.from(sigHex, 'utf8'))) {
      res.status(401).send('Invalid signature');
      return;
    }

    const payload = JSON.parse(rawBody.toString('utf8'));
    const eventType: string = payload.type ?? '';
    const data = payload.data ?? {};

    // Extract Firebase uid from metadata
    const uid: string | undefined = data.metadata?.uid ?? data.subscription?.metadata?.uid;

    console.log(`Polar webhook: ${eventType}, uid: ${uid}`);

    if (!uid) {
      res.status(200).send('No uid, ignored');
      return;
    }

    const db = getFirestore();
    const planRef = db.doc(`users/${uid}/profile/plan`);

    if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
      const status: string = data.status ?? '';
      const productId: string = data.product_id ?? '';
      const plan = PRODUCT_TO_PLAN[productId];

      if (status === 'active' && plan) {
        await planRef.set(
          {
            plan,
            polarSubscriptionId: data.id ?? '',
            polarProductId: productId,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        console.log(`Plan updated to ${plan} for user ${uid}`);
      }
    } else if (eventType === 'subscription.revoked') {
      await planRef.set(
        { plan: 'starter', updatedAt: new Date().toISOString() },
        { merge: true }
      );
      console.log(`Plan downgraded to starter for user ${uid}`);
    }

    res.status(200).send('OK');
  }
);
