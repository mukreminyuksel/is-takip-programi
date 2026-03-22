import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAPmmDgEeQ9hWGFv4BQbhvRWImKuLsW8RU",
  authDomain: "avrupa-proje-istakip.firebaseapp.com",
  projectId: "avrupa-proje-istakip",
  storageBucket: "avrupa-proje-istakip.firebasestorage.app",
  messagingSenderId: "278419836245",
  appId: "1:278419836245:web:1814c7a6b98c213d7fb3dc",
  measurementId: "G-CDM4GNNEN3"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);
