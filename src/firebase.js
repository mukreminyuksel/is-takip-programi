import { initializeApp, deleteApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Master Firebase (AVRUPAPROJE) - always available, used for companies collection
const masterConfig = {
  apiKey: "AIzaSyAPmmDgEeQ9hWGFv4BQbhvRWImKuLsW8RU",
  authDomain: "avrupa-proje-istakip.firebaseapp.com",
  projectId: "avrupa-proje-istakip",
  storageBucket: "avrupa-proje-istakip.firebasestorage.app",
  messagingSenderId: "278419836245",
  appId: "1:278419836245:web:1814c7a6b98c213d7fb3dc",
  measurementId: "G-CDM4GNNEN3"
};

const masterApp = initializeApp(masterConfig, "master");
export const masterDb = getFirestore(masterApp);

// Dynamic company Firebase instances
let companyApp = null;
let companySecondaryApp = null;

export function initCompanyFirebase(config) {
  // Clean up previous instances
  if (companyApp) { try { deleteApp(companyApp); } catch(e){} }
  if (companySecondaryApp) { try { deleteApp(companySecondaryApp); } catch(e){} }

  companyApp = initializeApp(config, "company");
  companySecondaryApp = initializeApp(config, "company-secondary");

  return {
    db: getFirestore(companyApp),
    auth: getAuth(companyApp),
    googleProvider: new GoogleAuthProvider(),
    storage: getStorage(companyApp),
    secondaryAuth: getAuth(companySecondaryApp),
  };
}

export function cleanupCompanyFirebase() {
  if (companyApp) { try { deleteApp(companyApp); } catch(e){} companyApp = null; }
  if (companySecondaryApp) { try { deleteApp(companySecondaryApp); } catch(e){} companySecondaryApp = null; }
}
