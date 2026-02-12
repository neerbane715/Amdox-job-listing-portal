// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

//Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAPPOxZm7nOtCET1fc-QOOYZp1mxMT5Wp8",
    authDomain: "amdox-portal.firebaseapp.com",
    projectId: "amdox-portal",
    storageBucket: "amdox-portal.firebasestorage.app",
    messagingSenderId: "185359674738",
    appId: "1:185359674738:web:845fb4c1485d4f014981eb",
    measurementId: "G-7BGN7JZR8S"
};

// import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, analytics, db, storage };
