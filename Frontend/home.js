import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const userEmailElement = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');

// Check authentication state
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        const displayName = user.displayName || "User";
        const email = user.email;
        userEmailElement.textContent = `Hello, ${displayName} (${email})`;
    } else {
        // User is signed out. Redirect to login page.
        window.location.href = "index.html";
    }
});

// Logout Logic
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = "index.html";
    } catch (error) {
        console.error("Sign Out Error", error);
        alert("Failed to sign out. Please try again.");
    }
});
