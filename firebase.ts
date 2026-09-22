import firebase from 'firebase/compat/app';
import 'firebase/compat/database';

// --- Default Firebase Config ---
// This is used ONLY for the 'Reset to Default' functionality in settings.
// It is NOT used for initial app load anymore.
export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// --- Dynamic Initialization ---
// We use mutable let bindings so we can initialize Firebase dynamically.
export let database: firebase.database.Database | null = null;
export let api: {
    put: (path: string, data: any) => Promise<void>;
    patch: (path: string, data: any) => Promise<void>;
    get: (path: string) => Promise<any>;
} | null = null;


const createApi = (db: firebase.database.Database) => ({
    put: (path: string, data: any) => db.ref(path.replace('.json', '')).set(data),
    patch: (path: string, data: any) => db.ref(path.replace('.json', '')).update(data),
    get: (path: string) => db.ref(path.replace('.json', '')).get().then(snapshot => snapshot.val()),
});

/**
 * Initializes or re-initializes the Firebase application.
 * This can be called at startup or later when a user provides a config.
 * @param config The Firebase configuration object.
 * @returns A promise that resolves to true on success, false on failure.
 */
export const initializeFirebase = async (config: object): Promise<boolean> => {
    try {
        // If an app instance exists, delete it first to allow re-initialization.
        if (firebase.apps.length) {
            await firebase.app().delete();
        }
        const firebaseApp = firebase.initializeApp(config);
        database = firebase.database(firebaseApp);
        api = createApi(database);
        console.log("Firebase initialized successfully.");
        return true;
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        // Ensure state is clean on failure
        database = null;
        api = null;
        return false;
    }
};


// --- Initial Load Attempt ---
// Try to initialize Firebase on script load if a config is already in localStorage.
// If it fails or no config is found, 'database' and 'api' will remain null,
// and the app will start in a limited, unconfigured state.
if (typeof window !== 'undefined') {
    try {
        const storedConfigStr = localStorage.getItem('firebaseConfig');
        if (storedConfigStr) {
            const storedConfig = JSON.parse(storedConfigStr);
            // Basic validation
            if (storedConfig && typeof storedConfig === 'object' && storedConfig.apiKey && storedConfig.databaseURL) {
                initializeFirebase(storedConfig);
            } else {
                 console.warn("Invalid Firebase config found in localStorage.");
                 localStorage.removeItem('firebaseConfig');
            }
        }
    } catch (e) {
        console.error("Failed to parse Firebase config from localStorage.", e);
        localStorage.removeItem('firebaseConfig'); // Clear corrupted data
    }
}
