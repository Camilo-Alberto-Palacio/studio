'use client';

import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Profile } from './page';

const PERIODIC_SYNC_TAG = 'check-notebooks';

// --- IndexedDB setup for Service Worker access ---
function openDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('app-data', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('keyval')) {
        db.createObjectStore('keyval');
      }
    };
  });
}

async function idbSet(key: string, val: any) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(['keyval'], 'readwrite');
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    const store = transaction.objectStore('keyval');
    store.put(val, key);
  });
}


async function requestPermission() {
  if (!('Notification' in window)) {
    alert('Este navegador no soporta notificaciones de escritorio');
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    alert('Por favor, permite las notificaciones para recibir recordatorios.');
    return false;
  }
  return true;
}

async function registerPeriodicSync() {
    const registration = await navigator.serviceWorker.ready;
    if ('periodicSync' in registration) {
        try {
            await (registration as any).periodicSync.register(PERIODIC_SYNC_TAG, {
                minInterval: 12 * 60 * 60 * 1000, // 12 hours
            });
            console.log('Periodic sync registered');
            return true;
        } catch (error) {
            console.error('Periodic sync could not be registered', error);
            alert('Las notificaciones periódicas no pudieron ser configuradas. Es posible que tu navegador no las soporte o que haya un problema de configuración.');
            return false;
        }
    } else {
        alert('Este navegador no soporta notificaciones periódicas en segundo plano. Los recordatorios no funcionarán.');
        return false;
    }
}

export async function setupNotifications(userId: string, profile: Profile) {
  const hasPermission = await requestPermission();
  if (!hasPermission) return false;

  const syncRegistered = await registerPeriodicSync();
  if (!syncRegistered) return false;

  // Store necessary data in IndexedDB for the Service Worker
  try {
    await idbSet('user-state', { userId, profile });
    const profileDocRef = doc(db, 'users', userId, 'profiles', profile.id);
    const profileDocSnap = await getDoc(profileDocRef);
    if (profileDocSnap.exists()) {
      const { schedule, vacations } = profileDocSnap.data();
      await idbSet('profile-data', { schedule, vacations });
    }
    console.log('User and profile data stored for SW.');
    return true;
  } catch (error) {
    console.error('Error storing data for Service Worker:', error);
    return false;
  }
}

export async function cancelNotifications() {
  const registration = await navigator.serviceWorker.ready;
  if ('periodicSync' in registration) {
    await (registration as any).periodicSync.unregister(PERIODIC_SYNC_TAG);
    console.log('Periodic sync unregistered');
  }
  // Clear data from IndexedDB
  await idbSet('user-state', null);
  await idbSet('profile-data', null);
}
