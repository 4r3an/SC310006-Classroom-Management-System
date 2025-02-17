// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)