const CACHE_NAME = 'smart-backpack-planner-cache-v2';
const urlsToCache = [
    '/',
    '/manifest.json',
    '/icons/icon-192x192.svg',
    '/icons/icon-512x512.svg',
];

// Install event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Fetch event
self.addEventListener('fetch', (event) => {
    // Ignore non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    // Ignore requests to Chrome extensions
    if (event.request.url.startsWith('chrome-extension://')) {
        return;
    }
    // Ignore requests to Google AdSense
    if (event.request.url.includes('pagead2.googlesyndication.com')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }

                return fetch(event.request).then(
                    (response) => {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        return response;
                    }
                );
            })
    );
});


// Activate event
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

const PERIODIC_SYNC_TAG = 'check-notebooks';

async function getFromIdb(key) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('app-data', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['keyval']);
      const store = transaction.objectStore('keyval');
      const getRequest = store.get(key);
      getRequest.onsuccess = () => resolve(getRequest.result);
      getRequest.onerror = () => reject(getRequest.error);
    };
  });
}

async function showNotification() {
    try {
        const userState = await getFromIdb('user-state');
        const profileData = await getFromIdb('profile-data');

        if (!userState || !userState.profile || !profileData || !profileData.schedule) {
            console.log('SW: No user/profile/schedule data in IDB. Skipping notification.');
            return;
        }

        const { profile } = userState;
        const { schedule, vacations } = profileData;

        // Logic to determine date is inside the fetch call now
        const response = await fetch('/api/genkit/flows/adviseDailyNotebooksFlow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                schedule: JSON.stringify(schedule),
                date: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0], // Check for tomorrow
                vacations: vacations || [],
                profileName: profile.name,
            }),
        });

        const result = await response.json();
        
        if (result && result.notebooks && !result.isVacation) {
            const notebooksList = result.notebooks.split(',').map(n => n.trim()).filter(Boolean);
            if (notebooksList.length > 0) {
                 const title = `¡Prepara la mochila de ${profile.name}!`;
                 const body = `Para mañana necesita: ${notebooksList.join(', ')}.`;

                await self.registration.showNotification(title, {
                    body: body,
                    icon: '/icons/icon-192x192.svg',
                    tag: 'notebook-reminder',
                });
            }
        }
    } catch (error) {
        console.error('SW: Error showing notification:', error);
    }
}

self.addEventListener('periodicsync', (event) => {
    if (event.tag === PERIODIC_SYNC_TAG) {
        event.waitUntil(showNotification());
    }
});