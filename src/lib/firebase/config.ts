import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, doc } from "firebase/firestore";

const firebaseConfig: FirebaseOptions = {
    "projectId": "smartbackpack-planner",
    "appId": "1:313960103405:web:18db10f2f21c14656dbbe4",
    "storageBucket": "smartbackpack-planner.firebasestorage.app",
    "apiKey": "AIzaSyD14Kv8X41hCidDL8Z9dNnE0GQjIGr5eRc",
    "authDomain": "smartbackpack-planner.firebaseapp.com",
    "messagingSenderId": "313960103405"
};


const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Helper function to generate a new ID for subcollections
const generateId = (path: string) => {
    return doc(collection(db, path)).id;
}


export { app, auth, db, generateId };
