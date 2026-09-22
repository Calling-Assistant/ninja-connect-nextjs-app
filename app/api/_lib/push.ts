/**
 * Shared server-side utilities for Web Push operations.
 * Used by /api/send-notification and /api/incoming-call-push.
 */

import webpush from 'web-push';

// ---------------------------------------------------------------------------
// VAPID — configured once at module load (server-side only)
// ---------------------------------------------------------------------------
const vapidPublicKey  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;
const vapidSubject    = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

export const vapidConfigured = !!(vapidPublicKey && vapidPrivateKey);

if (vapidConfigured) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export { webpush };

// ---------------------------------------------------------------------------
// Firebase helpers
// ---------------------------------------------------------------------------
function subUrl(key?: string): string {
    const dbUrl  = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
    const secret = process.env.FIREBASE_DATABASE_SECRET;
    if (!dbUrl) throw new Error('NEXT_PUBLIC_FIREBASE_DATABASE_URL is not set.');
    const path = key ? `pushSubscriptions/${key}` : 'pushSubscriptions';
    return secret ? `${dbUrl}/${path}.json?auth=${secret}` : `${dbUrl}/${path}.json`;
}

/** Fetch every push subscription stored in Firebase. */
export async function fetchAllSubscriptions(): Promise<Record<string, webpush.PushSubscription>> {
    const res = await fetch(subUrl(), { cache: 'no-store' });
    if (!res.ok) throw new Error(`Firebase read failed: ${res.status} ${res.statusText}`);
    return (await res.json()) ?? {};
}

/** Fetch a single push subscription by its Firebase key. */
export async function fetchSubscription(key: string): Promise<webpush.PushSubscription | null> {
    const res = await fetch(subUrl(key), { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) ?? null;
}

/** Remove an expired/invalid subscription from Firebase (fire-and-forget). */
export async function removeSubscription(key: string): Promise<void> {
    await fetch(subUrl(key), { method: 'DELETE' }).catch(() => {});
}
