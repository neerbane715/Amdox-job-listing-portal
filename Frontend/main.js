const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const container = document.getElementById('container');
const userTypeBtns = document.querySelectorAll('.toggle-btn');
const companyFields = document.querySelectorAll('.company-field');

// Firebase Imports
import { auth } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
        alert("Please fill in all required fields.");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update profile with name (and potentially store role/company in DB in future)
        await updateProfile(user, {
            displayName: name
        });

        alert(`Account created successfully for ${name}!`);
        window.location.href = "home.html";

    } catch (error) {
        const errorCode = error.code;
        const errorMessage = error.message;
        alert(`Error: ${errorMessage}`);
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
        alert("Please enter email and password.");
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // Alert is optional here, usually just redirect
        // alert("Signed in successfully!"); 
        window.location.href = "home.html";
    } catch (error) {
        const errorCode = error.code;
        const errorMessage = error.message;
        alert(`Error: ${errorMessage}`);
        console.error("Sign In Error:", errorCode, errorMessage);
    }
});
