const CACHE_NAME = 'smart-backpack-cache-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg'
];
const ADSENSE_URL = 'https://pagead2.googlesyndication.com';

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});


self.addEventListener('fetch', event => {
  const { request } = event;

  // Don't cache anything that isn't a GET request.
  if (request.method !== 'GET') {
    return;
  }
  
  // For AdSense, always fetch from the network.
  if (request.url.startsWith(ADSENSE_URL)) {
    event.respondWith(fetch(request));
    return;
  }

  // For other requests, use a cache-first strategy.
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then(response => {
          // Only cache successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(error => {
          console.error('Fetching failed:', error);
          // You could return a fallback page here if you want.
          // For now, just re-throw the error.
          throw error;
        });
    })
  );
});



async function getNotebooksForTomorrow() {
    // This is a placeholder. In a real app, you'd fetch user data
    // from IndexedDB and call your AI function via a server endpoint.
    // For this example, we'll simulate a response.
    console.log("Simulating fetching notebook advice...");
    // Let's assume we have a function to get this data
    // const advice = await getNotebookAdviceForTomorrow();
    // return advice.notebooks;
    return ["Matemáticas", "Historia"]; // Example data
}


self.addEventListener('periodicsync', event => {
  if (event.tag === 'check-notebooks') {
    event.waitUntil(
      (async () => {
        try {
          const notebooks = await getNotebooksForTomorrow();
          if (notebooks && notebooks.length > 0) {
            self.registration.showNotification('Prepara tu Mochila', {
              body: `Para mañana necesitas: ${notebooks.join(', ')}.`,
              icon: '/icons/icon-192x192.svg',
              badge: '/icons/icon-192x192.svg'
            });
          }
        } catch (error) {
          console.error('Periodic sync failed:', error);
        }
      })()
    );
  }
});