// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAPPOxZm7nOtCET1fc-QOOYZp1mxMT5Wp8",
    authDomain: "amdox-portal.firebaseapp.com",
    projectId: "amdox-portal",
    storageBucket: "amdox-portal.firebasestorage.app",
    messagingSenderId: "185359674738",
    appId: "1:185359674738:web:845fb4c1485d4f014981eb",
    measurementId: "G-7BGN7JZR8S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const analytics = getAnalytics(app);

export { app, auth, analytics };
