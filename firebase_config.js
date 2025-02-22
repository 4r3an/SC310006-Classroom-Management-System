// Import
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC1K4kZk4TwvPBhndVCffuw5P4MqAC_AFM",
  authDomain: "web2024-9dc04.firebaseapp.com",
  projectId: "web2024-9dc04",
  storageBucket: "web2024-9dc04.firebasestorage.app",
  messagingSenderId: "533756221690",
  appId: "1:533756221690:web:7553ac87b46090dab99143",
  measurementId: "G-1EEGB1LPBS"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)