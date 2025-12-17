import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyB5haKe0fjxEFPRf4IeqlOCrGjOwmpfb6c",
  authDomain: "sistemantrian-a3c3f.firebaseapp.com",
  projectId: "sistemantrian",
  storageBucket: "sistemantrian.firebasestorage.app",
  messagingSenderId: "502080800266",
  appId: "1:502080800266:web:7fdc25e1a1ba61618f81f3",
  measurementId: "G-7T1EZCJL5J"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const functions = getFunctions(app, "asia-southeast2");
export const auth = getAuth(app);