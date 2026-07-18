import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCKxQz2qJeJK-yRp3Y8hfcUVjGYKTFZPYg",
  authDomain: "dietpal-65.firebaseapp.com",
  projectId: "dietpal-65",
  storageBucket: "dietpal-65.firebasestorage.app",
  messagingSenderId: "426303260735",
  appId: "1:426303260735:web:7a5695b1ec96e55653d08a",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);