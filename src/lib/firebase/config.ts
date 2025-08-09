import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// This will read the configuration from the .env file
// and gracefully handle cases where it might be missing.
let firebaseConfig = {};
try {
  if (process.env.NEXT_PUBLIC_FIREBASE_CONFIG) {
    firebaseConfig = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG);
  } else {
    console.warn("Firebase config is missing from environment variables.");
  }
} catch (error) {
    console.error("Could not parse Firebase config:", error);
}


const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
