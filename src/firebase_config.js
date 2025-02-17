
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCOziU7OX4VpiNJivHsf5SlMxSMr8BGKJs",
  authDomain: "web2568-4a3e5.firebaseapp.com",
  projectId: "web2568-4a3e5",
  storageBucket: "web2568-4a3e5.firebasestorage.app",
  messagingSenderId: "609239509406",
  appId: "1:609239509406:web:c21d960c8375eaabb0ce8f",
  measurementId: "G-XCB6G3RLB9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

export { app };
// Another file where db is exported again
