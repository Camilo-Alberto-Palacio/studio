// This should be at the root of the public folder
const CACHE_NAME = 'smart-backpack-cache-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
  // Add other important assets here, like CSS, JS files
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});


self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'check-notebooks') {
        event.waitUntil(checkAndNotify());
    }
});

async function checkAndNotify() {
    const userState = await idbGet('user-state');
    if (!userState?.userId || !userState?.profile?.id) {
        console.log('User or profile not found in IDB, skipping notification.');
        return;
    }

    const { userId, profile } = userState;
    const { schedule, vacations } = await idbGet('profile-data') || {};

    if (!schedule) {
         console.log('Schedule not found, skipping notification.');
        return;
    }
    
    // Determine next day
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];

    // This is tricky because we are in a service worker and can't use server actions directly.
    // We will simulate the call logic here.
    // In a real app, you'd fetch from an API endpoint that wraps the AI call.
    // For this environment, we are making an assumption that we can get the required data.
    
    const notebooks = await getNotebooksForDate(schedule, dateString, vacations || [], profile.name);
    
    if (notebooks.length > 0) {
        const title = 'Prepara tu mochila';
        const body = `Es hora de alistar los cuadernos para mañana: ${notebooks.join(', ')}.`;
        self.registration.showNotification(title, {
            body: body,
            icon: '/icons/icon-192x192.svg',
        });
    }
}


// --- IndexedDB Helpers ---
function idbGet(key) {
    return new Promise((resolve, reject) => {
        const request = self.indexedDB.open('app-data', 1).onsuccess = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('keyval')) {
                resolve(null); // Store doesn't exist
                return;
            }
            const transaction = db.transaction(['keyval'], 'readonly');
            const store = transaction.objectStore('keyval');
            const getRequest = store.get(key);
            getRequest.onsuccess = () => resolve(getRequest.result);
            getRequest.onerror = (err) => reject(err);
        };
        request.onerror = (err) => reject(err);
    });
}

function getDayOfWeek(dateString) {
    const date = new Date(dateString);
    const utcDay = date.getUTCDay();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[utcDay];
}


// This is a simplified, non-AI version of the logic inside the service worker
async function getNotebooksForDate(schedule, dateString, vacations, profileName) {
    if (vacations.includes(dateString)) {
        return [];
    }

    const dayOfWeek = getDayOfWeek(dateString);
    const subjects = schedule[dayOfWeek];

    if (subjects) {
        return subjects.split(',').map(s => s.trim()).filter(Boolean);
    }

    return [];
}
