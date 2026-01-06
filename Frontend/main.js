const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const container = document.getElementById('container');
const userTypeBtns = document.querySelectorAll('.toggle-btn');
const companyFields = document.querySelectorAll('.company-field');

// Sliding Panel Logic
signUpButton.addEventListener('click', () => {
    container.classList.add("right-panel-active");
});

signInButton.addEventListener('click', () => {
    container.classList.remove("right-panel-active");
});

// User Type Toggle Logic (Seeker vs Employer)
userTypeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const type = e.target.dataset.type;

        // Update all buttons with this type to be active
        // This keeps both forms in sync for better UX, or we can treat them changingly.
        // Let's treat them locally per form, or globally? 
        // Let's do locally per form group to avoid confusion, but actually the prompt implies 
        // global user type. Let's sync them for consistency.

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
