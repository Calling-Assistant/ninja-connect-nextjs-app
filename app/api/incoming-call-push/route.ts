import { NextRequest, NextResponse } from 'next/server';
import { webpush, vapidConfigured, fetchAllSubscriptions, removeSubscription } from '../_lib/push';

// ---------------------------------------------------------------------------
// POST /api/incoming-call-push
//
// Broadcasts an incoming-call push to every registered device.
//
// Body: { mobile: string, username?: string, calledAt?: number }
//
// This endpoint is called from:
//   1. The client app (same-origin) when it detects an incoming call via
//      the Firebase listener — so other devices (even closed ones) get notified.
//   2. Optionally, the SIP/telephony backend directly for true zero-client-open
//      delivery. In that case pass X-Notification-Secret if NOTIFICATION_SECRET
//      env var is set.
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
    // Optional auth — if NOTIFICATION_SECRET is set, callers must provide it.
    // Requests from the same origin (the web app itself) are exempt so they
    // work without exposing the secret client-side.
    const notificationSecret = process.env.NOTIFICATION_SECRET;
    if (notificationSecret) {
        const provided = req.headers.get('x-notification-secret');
        const origin   = req.headers.get('origin') ?? '';
        const host     = req.headers.get('host')   ?? '';
        const isSameOrigin = origin !== '' && host !== '' && origin.includes(host);
        if (!isSameOrigin && provided !== notificationSecret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    if (!vapidConfigured) {
        return NextResponse.json(
            { error: 'VAPID keys not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env.' },
            { status: 500 }
        );
    }

    let body: { mobile: string; username?: string; calledAt?: number };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    if (!body.mobile) {
        return NextResponse.json({ error: '"mobile" is required.' }, { status: 400 });
    }

    const callerLabel = (body.username && body.username !== body.mobile)
        ? body.username
        : body.mobile;

    // The service worker overrides vibrate/actions based on its local awayModeEnabled
    // flag, so the values here are sane defaults only.
    const payload = JSON.stringify({
        title: 'Incoming Call',
        body: `From ${callerLabel}`,
        icon:  '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag:   'incoming-call',
        requireInteraction: true,
        renotify: true,
        data: {
            action:   'incoming_call',
            mobile:   body.mobile,
            username: body.username || body.mobile,
            calledAt: body.calledAt || Date.now(),
        },
        actions: [
            { action: 'answer', title: 'Answer Now' },
            { action: 'open',   title: 'Open App'   },
        ],
    });

    let subscriptions: Record<string, webpush.PushSubscription>;
    try {
        subscriptions = await fetchAllSubscriptions();
    } catch {
        subscriptions = {};
    }

    const entries = Object.entries(subscriptions);

    if (entries.length === 0) {
        return NextResponse.json({ sent: 0, failed: 0, total: 0 });
    }

    const results = await Promise.allSettled(
        entries.map(async ([key, sub]) => {
            try {
                await webpush.sendNotification(sub, payload);
                return key;
            } catch (err: any) {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await removeSubscription(key);
                }
                throw { key, statusCode: err.statusCode, message: err.message };
            }
        })
    );

    const sent   = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    return NextResponse.json({ sent, failed, total: entries.length });
}
