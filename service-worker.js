
const CACHE_NAME  = 'caller-app-cache-v2';
// Separate cache for app state so it is never wiped by the shell cache cleanup.
const STATE_CACHE = 'caller-app-state-v1';

const APP_SHELL_URLS = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/black.mp3',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap',
  'https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLEj6Z1xlFd2JQEk.woff2',
  'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecnFHGPc.woff2'
];

// In-memory away mode flag. Populated from STATE_CACHE on SW startup
// so it survives SW restarts between push events.
let awayModeEnabled = false;

// Read persisted away mode on SW startup (runs once when SW activates/starts).
caches.open(STATE_CACHE)
  .then(cache => cache.match('/state/awayMode'))
  .then(res => res ? res.text() : null)
  .then(val => { if (val !== null) awayModeEnabled = val === 'true'; })
  .catch(() => {});

// ---------------------------------------------------------------------------
// Install
// ---------------------------------------------------------------------------
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

// ---------------------------------------------------------------------------
// Activate – whitelist both caches so STATE_CACHE is never deleted.
// ---------------------------------------------------------------------------
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME, STATE_CACHE];
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ---------------------------------------------------------------------------
// Fetch – serve from cache, fall back to network.
// ---------------------------------------------------------------------------
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' ||
      event.request.url.includes('firebaseio.com') ||
      event.request.url.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        return networkResponse;
      });
    })
  );
});

// ---------------------------------------------------------------------------
// Message – app communicates away mode & pending-call queries to the SW.
// ---------------------------------------------------------------------------
self.addEventListener('message', event => {
  if (!event.data) return;

  switch (event.data.type) {

    // App sends this whenever isAwayMode changes.
    case 'SET_AWAY_MODE': {
      awayModeEnabled = event.data.payload === true;
      // Persist so it survives SW restarts (e.g. between push wakeups).
      caches.open(STATE_CACHE).then(cache =>
        cache.put('/state/awayMode', new Response(String(awayModeEnabled)))
      );
      break;
    }

    // App asks: "was there an incoming call while I was closed?"
    case 'GET_PENDING_CALL': {
      caches.open(STATE_CACHE)
        .then(cache => cache.match('/state/pendingCall'))
        .then(res => res ? res.json() : null)
        .then(callData => {
          if (event.source) {
            event.source.postMessage({ type: 'PENDING_CALL_RESULT', payload: callData });
          }
          // Clear it – one-time read.
          if (callData) {
            caches.open(STATE_CACHE).then(cache => cache.delete('/state/pendingCall'));
          }
        })
        .catch(() => {
          if (event.source) {
            event.source.postMessage({ type: 'PENDING_CALL_RESULT', payload: null });
          }
        });
      break;
    }
  }
});

// ---------------------------------------------------------------------------
// Push – handle incoming push notifications.
// ---------------------------------------------------------------------------
self.addEventListener('push', event => {
  console.log('[Service Worker] Push Received.');

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    const textData = event.data ? event.data.text() : 'New update received';
    data = { title: 'Ninja Connect', body: textData, data: { action: 'open' } };
  }

  const title   = data.title || 'Ninja Connect';
  const dataObj = data.data  || {};
  const action  = dataObj.action || '';

  const isIncomingCall =
    action === 'incoming_call' ||
    action === 'answer_call'   ||
    title.toLowerCase().includes('incoming call') ||
    (data.body && data.body.toLowerCase().includes('incoming call'));

  if (isIncomingCall) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(openClients => {

        // Forward to every open client so it can ring immediately without
        // waiting for the Firebase round-trip.
        openClients.forEach(client => {
          client.postMessage({ type: 'INCOMING_CALL_PUSH', payload: data });
        });

        // If no client is open, persist the call so the app can pick it up
        // the moment the user taps the notification and the app launches.
        if (openClients.length === 0) {
          const pendingCall = {
            mobile:     dataObj.mobile   || dataObj.phone || '',
            username:   dataObj.username || data.body     || '',
            receivedAt: dataObj.calledAt || Date.now(),
          };
          return caches.open(STATE_CACHE).then(cache =>
            cache.put('/state/pendingCall', new Response(JSON.stringify(pendingCall)))
          );
        }
      })
    );
  }

  // Away mode: use a more aggressive vibration pattern to alert someone who
  // has stepped away from the device. The flag is persisted in STATE_CACHE
  // so it is available even after the SW has been restarted between pushes.
  const isAwayCall = isIncomingCall && awayModeEnabled;

  const options = {
    body:               data.body || 'You have a new notification.',
    icon:               '/icon-192x192.png',
    badge:              '/icon-192x192.png',
    data:               dataObj,
    tag:                isIncomingCall ? 'incoming-call' : (data.tag || 'general-notification'),
    requireInteraction: isIncomingCall ? true  : (data.requireInteraction || false),
    renotify:           isIncomingCall ? true  : (data.renotify || false),
    silent:             false,
    // Away mode: long, repeated bursts. Normal call: single burst.
    vibrate: isAwayCall
      ? [800,100,800,100,800,100,800,100,800,100,800,100,800,100,800,
         1000,800,100,800,100,800,100,800,1000,800,100,800,100,800,100,800]
      : isIncomingCall
        ? [800, 100, 800, 100, 800, 100, 800, 1000, 800, 100, 800, 100]
        : (data.vibrate || [100]),
    actions: isIncomingCall ? [
      { action: 'answer', title: 'Answer Now', icon: '/icon-192x192.png' },
      { action: 'open',   title: 'Open App',   icon: '/icon-192x192.png' }
    ] : (data.actions || [])
  };

  // In away mode, also schedule a repeat notification after 25 s in case the
  // first one was missed (service workers can use self.registration.showNotification
  // inside a waitUntil-extended promise chain).
  if (isAwayCall) {
    event.waitUntil(
      self.registration.showNotification(title, options).then(() =>
        new Promise(resolve => {
          setTimeout(() => {
            self.registration.showNotification(title, {
              ...options,
              body: `(Repeat) ${options.body}`,
            }).then(resolve).catch(resolve);
          }, 25000);
        })
      )
    );
  } else {
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

// ---------------------------------------------------------------------------
// Notification click
// ---------------------------------------------------------------------------
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  let urlToOpen = new URL('/', self.location.origin).href;

  if (notificationData.action === 'show_notifications' && notificationData.appname) {
    const params = new URLSearchParams();
    params.append('action', 'show_notifications');
    params.append('appname', notificationData.appname);
    urlToOpen = new URL(`/?${params.toString()}`, self.location.origin).href;
  }

  const openAndFocusClient = (targetUrl) => {
    return clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) {
        const clientToFocus = clientList.find(c => c.focused) || clientList[0];
        return clientToFocus.focus().then(client => client.navigate(targetUrl));
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    });
  };

  if (event.action === 'answer') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
        if (clientList.length > 0) {
          // App is open — tell it to answer immediately.
          const client = clientList.find(c => c.focused) || clientList[0];
          client.postMessage({ action: 'answer_call' });
          return client.focus();
        }
        // App is closed — open it with auto_answer flag so it answers as soon
        // as the incoming call data is available from Firebase / pending cache.
        const answerUrl = new URL('/', self.location.origin);
        answerUrl.searchParams.append('auto_answer', 'true');
        if (notificationData.mobile) {
          answerUrl.searchParams.append('mobile', notificationData.mobile);
        }
        if (clients.openWindow) return clients.openWindow(answerUrl.href);
      })
    );
  } else {
    event.waitUntil(openAndFocusClient(urlToOpen));
  }
});
