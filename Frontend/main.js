const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const container = document.getElementById('container');
const userTypeBtns = document.querySelectorAll('.toggle-btn');
const companyFields = document.querySelectorAll('.company-field');

// Firebase Imports
import { auth, db } from '../Backend/firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Toast Helper
// Toast Helper
const showToast = (message, type = "success") => {
    if (typeof Toastify === 'undefined') {
        console.warn("Toastify not loaded. Fallback to alert:", message);
        alert(message);
        return;
    }
    Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "right",
        backgroundColor: type === "success" ? "linear-gradient(to right, #00b09b, #96c93d)" : "linear-gradient(to right, #ff5f6d, #ffc371)",
        stopOnFocus: true,
    }).showToast();
};

// Sliding Panel Logic
signUpButton.addEventListener('click', () => {
    container.classList.add("right-panel-active");
});

signInButton.addEventListener('click', () => {
    container.classList.remove("right-panel-active");
});

// User Type Toggle Logic 
let currentUserType = 'seeker'; // Default

userTypeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const type = e.target.dataset.type;
        currentUserType = type; // Update current type

        document.querySelectorAll(`.toggle-btn[data-type="${type}"]`).forEach(b => {
            b.classList.add('active');
            // Remove active from siblings
            b.parentElement.querySelectorAll('.toggle-btn').forEach(sibling => {
                if (sibling !== b) sibling.classList.remove('active');
            });
        });

        document.querySelectorAll(`.toggle-btn:not([data-type="${type}"])`).forEach(b => b.classList.remove('active'));

        // Handle Company Field Visibility
        if (type === 'employer') {
            companyFields.forEach(field => field.classList.remove('collapsed'));
        } else {
            companyFields.forEach(field => field.classList.add('collapsed'));
        }
    });
});

// Sign Up Logic
const signUpSubmit = document.getElementById('signUpSubmit');
signUpSubmit.addEventListener('click', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signUpName').value;
    const email = document.getElementById('signUpEmail').value;
    const password = document.getElementById('signUpPassword').value;
    const company = document.getElementById('signUpCompany').value;

    if (!email || !password || !name) {
        showToast("Please fill in all required fields.", "error");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update profile with name (and potentially store role/company in DB in future)
        await updateProfile(user, {
            displayName: name
        });

        // Store user role in Firestore
        await setDoc(doc(db, "users", user.uid), {
            name: name,
            email: email,
            userType: currentUserType,
            company: currentUserType === 'employer' ? company : null,
            createdAt: new Date().toISOString()
        });

        showToast(`Account created successfully for ${name}! Redirecting...`, "success");
        setTimeout(() => {
            window.location.href = "home.html";
        }, 1500);

    } catch (error) {
        const errorCode = error.code;
        const errorMessage = error.message;
        showToast(`Error: ${errorMessage}`, "error");
        console.error("Sign Up Error:", errorCode, errorMessage);
    }
});

// Sign In Logic
const signInSubmit = document.getElementById('signInSubmit');
signInSubmit.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signInEmail').value;
    const password = document.getElementById('signInPassword').value;

    if (!email || !password) {
        showToast("Please enter email and password.", "error");
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Verify User Role
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const userData = docSnap.data();
            if (userData.userType !== currentUserType) {
                await signOut(auth);
                showToast(`Access Denied: You are registered as a ${userData.userType}, not a ${currentUserType}.`, "error");
                return;
            }
            // Success
            showToast("Signed in successfully! Redirecting...", "success");
            setTimeout(() => {
                window.location.href = "home.html";
            }, 1000);
        } else {
            // Handle case where user exists in Auth but not Firestore (optional: create doc or deny)
            console.error("No such user document!");
            showToast("Error: User profile data missing.", "error");
        }
    } catch (error) {
        const errorCode = error.code;
        const errorMessage = error.message;
        showToast(`Error: ${errorMessage}`, "error");
        console.error("Sign In Error:", errorCode, errorMessage);
    }
});

// Password Toggle Functionality
const passwordToggles = document.querySelectorAll('.toggle-password');

passwordToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
        const targetId = toggle.getAttribute('data-target');
        const passwordInput = document.getElementById(targetId);
        const eyeIcon = toggle.querySelector('.eye-icon');

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            eyeIcon.textContent = '👁‍🗨'; // Eye with speech bubble (visible)
        } else {
            passwordInput.type = 'password';
            eyeIcon.textContent = '👁'; // Normal eye (hidden)
        }
    });
});
