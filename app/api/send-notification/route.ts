import { NextRequest, NextResponse } from 'next/server';
import { webpush, vapidConfigured, fetchAllSubscriptions, fetchSubscription, removeSubscription } from '../_lib/push';

export async function POST(req: NextRequest) {
    // ── Auth ────────────────────────────────────────────────────────────────
    const notificationSecret = process.env.NOTIFICATION_SECRET;
    if (notificationSecret) {
        const provided = req.headers.get('x-notification-secret');
        if (provided !== notificationSecret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    // ── Validate VAPID config ────────────────────────────────────────────────
    if (!vapidConfigured) {
        return NextResponse.json(
            { error: 'Server is missing VAPID keys. Set VAPID_PRIVATE_KEY and NEXT_PUBLIC_VAPID_PUBLIC_KEY in .env.' },
            { status: 500 }
        );
    }

    // ── Parse request body ───────────────────────────────────────────────────
    let body: {
        title?: string;
        body?: string;
        icon?: string;
        badge?: string;
        tag?: string;
        data?: Record<string, unknown>;
        requireInteraction?: boolean;
        vibrate?: number[];
        actions?: { action: string; title: string }[];
        // Send to a single subscription instead of all
        subscriptionKey?: string;
    };

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const payload = JSON.stringify({
        title: body.title ?? 'Ninja Connect',
        body: body.body ?? 'You have a new notification.',
        icon: body.icon ?? '/icon-192x192.png',
        badge: body.badge ?? '/icon-192x192.png',
        tag: body.tag ?? 'general-notification',
        data: body.data ?? {},
        requireInteraction: body.requireInteraction ?? false,
        vibrate: body.vibrate ?? [100],
        actions: body.actions ?? [],
    });

    // ── Fetch subscriptions ──────────────────────────────────────────────────
    const subscriptionKey = body.subscriptionKey;
    let targets: [string, webpush.PushSubscription][];

    try {
        if (subscriptionKey) {
            // Single-target: fetch only that Firebase node — avoids downloading every subscription
            const sub = await fetchSubscription(subscriptionKey);
            targets = sub ? [[subscriptionKey, sub]] : [];
        } else {
            const allSubscriptions = await fetchAllSubscriptions();
            targets = Object.entries(allSubscriptions);
        }
    } catch (err: any) {
        return NextResponse.json({ error: `Failed to read subscriptions: ${err.message}` }, { status: 500 });
    }

    if (targets.length === 0) {
        return NextResponse.json({ sent: 0, failed: 0, message: 'No matching subscriptions found.' });
    }

    // ── Send notifications ───────────────────────────────────────────────────
    const results = await Promise.allSettled(
        targets.map(async ([key, subscription]) => {
            try {
                await webpush.sendNotification(subscription, payload);
                return { key, status: 'sent' };
            } catch (err: any) {
                // 410 Gone / 404 Not Found = subscription is no longer valid, remove it
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await removeSubscription(key);
                }
                throw { key, statusCode: err.statusCode, message: err.message };
            }
        })
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    const errors = results
        .filter(r => r.status === 'rejected')
        .map(r => (r as PromiseRejectedResult).reason);

    return NextResponse.json({ sent, failed, total: targets.length, errors });
}

// ── GET — health check / subscription count ──────────────────────────────────
export async function GET(req: NextRequest) {
    const notificationSecret = process.env.NOTIFICATION_SECRET;
    if (notificationSecret) {
        const provided = req.headers.get('x-notification-secret');
        if (provided !== notificationSecret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        const subscriptions = await fetchAllSubscriptions();
        const count = Object.keys(subscriptions ?? {}).length;
        return NextResponse.json({
            ok: true,
            subscriptions: count,
            vapidConfigured,
        });
    } catch (err: any) {
        return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
    }
}
