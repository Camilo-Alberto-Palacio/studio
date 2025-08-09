import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// This will read the configuration from the .env file
// and gracefully handle cases where it might be missing.
const firebaseConfig = {
    "projectId": "smartbackpack-planner",
    "appId": "1:313960103405:web:18db10f2f21c14656dbbe4",
    "storageBucket": "smartbackpack-planner.firebasestorage.app",
    "apiKey": "AIzaSyD14Kv8X41hCidDL8Z9dNnE0GQjIGr5eRc",
    "authDomain": "smartbackpack-planner.firebaseapp.com",
    "measurementId": "",
    "messagingSenderId": "313960103405"
};


const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
