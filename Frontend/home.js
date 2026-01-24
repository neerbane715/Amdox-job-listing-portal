import { auth, db, storage } from './firebase-config.js';
import { onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const userEmailElement = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');
const profileSection = document.getElementById('profileSection');
const candidateForm = document.getElementById('candidateForm');
const employerForm = document.getElementById('employerForm');

// Toast Helper
const showToast = (message, type = "success") => {
    if (typeof Toastify === 'undefined') {
        alert(message);
        return;
    }
    Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "center",
        backgroundColor: type === "success" ? "linear-gradient(to right, #00b09b, #96c93d)" : "linear-gradient(to right, #ff5f6d, #ffc371)",
        stopOnFocus: true,
    }).showToast();
};

let currentUserDocRef = null;

// Check authentication state
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is signed in
        const displayName = user.displayName || "User";
        const email = user.email;
        userEmailElement.textContent = `Hello, ${displayName}`;

        try {
            currentUserDocRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(currentUserDocRef);

            if (docSnap.exists()) {
                const userData = docSnap.data();
                profileSection.style.display = "block";

                if (userData.userType === 'seeker') {
                    candidateForm.style.display = "flex";
                    // Pre-fill Candidate Data
                    document.getElementById('candName').value = userData.name || displayName;
                    document.getElementById('candPhone').value = userData.phone || "";
                    document.getElementById('candSkills').value = userData.skills || "";
                    document.getElementById('candExperience').value = userData.experience || "";
                    if (userData.resumeUrl) {
                        document.getElementById('resumeFileName').textContent = "Resume already uploaded";
                    }

                } else if (userData.userType === 'employer') {
                    employerForm.style.display = "flex";
                    // Pre-fill Employer Data
                    document.getElementById('empCompanyName').value = userData.companyName || userData.company || ""; // Handle both keys if legacy
                    document.getElementById('empWebsite').value = userData.website || "";
                    document.getElementById('empIndustry').value = userData.industry || "";
                    document.getElementById('empDescription').value = userData.description || "";
                    document.getElementById('empContactEmail').value = userData.contactEmail || email;
                    document.getElementById('empContactPhone').value = userData.contactPhone || "";

                    // Show Job Dashboard for Employers
                    employerDashboard.style.display = "block";
                    fetchEmployerJobs(user.uid);
                }
            } else {
                console.error("User document not found in Firestore");
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            showToast("Failed to load profile data", "error");
        }

    } else {
        // User is signed out. Redirect to login page.
        window.location.href = "index.html";
    }
});

// Resume File Name Update
const resumeInput = document.getElementById('candResume');
if (resumeInput) {
    resumeInput.addEventListener('change', (e) => {
        const fileName = e.target.files[0]?.name || "No file chosen";
        document.getElementById('resumeFileName').textContent = fileName;
    });
}

// Save Candidate Profile
const saveCandBtn = document.getElementById('saveCandBtn');
if (saveCandBtn) {
    saveCandBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        saveCandBtn.disabled = true;
        saveCandBtn.textContent = "Saving...";

        const name = document.getElementById('candName').value;
        const phone = document.getElementById('candPhone').value;
        const skills = document.getElementById('candSkills').value;
        const experience = document.getElementById('candExperience').value;
        const resumeFile = resumeInput.files[0];

        try {
            let updateData = {
                name: name,
                phone: phone,
                skills: skills,
                experience: experience
            };

            // Update Auth Profile too if name changed
            if (auth.currentUser.displayName !== name) {
                await updateProfile(auth.currentUser, { displayName: name });
                userEmailElement.textContent = `Hello, ${name}`;
            }

            if (resumeFile) {
                // Upload Resume
                const storageRef = ref(storage, `resumes/${auth.currentUser.uid}/${resumeFile.name}`);
                await uploadBytes(storageRef, resumeFile);
                const downloadURL = await getDownloadURL(storageRef);
                updateData.resumeUrl = downloadURL;
                updateData.resumeName = resumeFile.name;
            }

            await updateDoc(currentUserDocRef, updateData);
            showToast("Profile updated successfully!");

        } catch (error) {
            console.error("Error saving profile:", error);
            showToast("Failed to save profile. " + error.message, "error");
        } finally {
            saveCandBtn.disabled = false;
            saveCandBtn.textContent = "Save Profile";
        }
    });
}

// Save Employer Profile
const saveEmpBtn = document.getElementById('saveEmpBtn');
if (saveEmpBtn) {
    saveEmpBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        saveEmpBtn.disabled = true;
        saveEmpBtn.textContent = "Saving...";

        const companyName = document.getElementById('empCompanyName').value;
        const website = document.getElementById('empWebsite').value;
        const industry = document.getElementById('empIndustry').value;
        const description = document.getElementById('empDescription').value;
        const contactEmail = document.getElementById('empContactEmail').value;
        const contactPhone = document.getElementById('empContactPhone').value;

        try {
            let updateData = {
                companyName: companyName, // consistently use companyName
                website: website,
                industry: industry,
                description: description,
                contactEmail: contactEmail,
                contactPhone: contactPhone
            };

            if (auth.currentUser.displayName !== companyName) {
                await updateProfile(auth.currentUser, { displayName: companyName });
                userEmailElement.textContent = `Hello, ${companyName}`;
            }

            await updateDoc(currentUserDocRef, updateData);
            showToast("Company profile updated successfully!");

        } catch (error) {
            console.error("Error saving profile:", error);
            showToast("Failed to save profile. " + error.message, "error");
        } finally {
            saveEmpBtn.disabled = false;
            saveEmpBtn.textContent = "Save Profile";
        }
    });
}

// ================= JOB DASHBOARD LOGIC (EMPLOYER ONLY) =================

const employerDashboard = document.getElementById('employerDashboard');
const jobListContainer = document.getElementById('jobList');
const postJobBtn = document.getElementById('postJobBtn');
const jobFormModal = document.getElementById('jobFormModal');
const jobForm = document.getElementById('jobForm');
const cancelJobBtn = document.getElementById('cancelJobBtn');
const saveJobBtn = document.getElementById('saveJobBtn');
const jobFormTitle = document.getElementById('jobFormTitle');

// Toggle Modal
const showJobModal = (isEdit = false) => {
    jobFormModal.style.display = 'block';
    jobFormTitle.textContent = isEdit ? "Edit Job" : "Post a New Job";
    saveJobBtn.textContent = isEdit ? "Update Job" : "Publish Job";
    if (!isEdit) {
        jobForm.reset();
        document.getElementById('jobId').value = "";
    }
};

const hideJobModal = () => {
    jobFormModal.style.display = 'none';
    jobForm.reset();
};

if (postJobBtn) {
    postJobBtn.addEventListener('click', () => showJobModal(false));
}

if (cancelJobBtn) {
    cancelJobBtn.addEventListener('click', (e) => {
        e.preventDefault();
        hideJobModal();
    });
}

// Render a single Job Item
const createJobElement = (job) => {
    const jobCard = document.createElement('div');
    jobCard.className = 'job-card';
    jobCard.innerHTML = `
        <div class="job-header">
            <div>
                <div class="job-title">${job.title}</div>
                <div class="job-company">${job.companyName}</div>
            </div>
            <div class="job-actions">
                <button class="action-btn btn-small btn-edit" onclick="editJob('${job.id}')">Edit</button>
                <button class="action-btn btn-small btn-delete" onclick="deleteJob('${job.id}')">Delete</button>
            </div>
        </div>
        <div class="job-details">
            <span class="detail-item"><span class="icon">📍</span> ${job.location}</span>
            <span class="detail-item"><span class="icon">₹</span> ${job.salary || 'Not specified'}</span>
            <span class="detail-item"><span class="icon">📅</span> Posted: ${job.createdAt ? new Date(job.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}</span>
        </div>
        <p class="job-desc">${job.description.substring(0, 150)}${job.description.length > 150 ? '...' : ''}</p>
    `;
    return jobCard;
};


// Fetch and Display Jobs
const fetchEmployerJobs = async (employerId) => {
    jobListContainer.innerHTML = '<p class="no-jobs">Loading jobs...</p>';
    try {
        const jobsRef = collection(db, "jobs");
        const q = query(jobsRef, where("employerId", "==", employerId));

        const querySnapshot = await getDocs(q);
        jobListContainer.innerHTML = '';

        if (querySnapshot.empty) {
            jobListContainer.innerHTML = '<p class="no-jobs">No jobs posted yet.</p>';
        } else {
            querySnapshot.forEach((doc) => {
                const jobData = { id: doc.id, ...doc.data() };
                jobListContainer.appendChild(createJobElement(jobData));
            });
        }
    } catch (error) {
        console.error("Error fetching jobs:", error);
        jobListContainer.innerHTML = '<p class="no-jobs">Error loading jobs.</p>';
    }
};

// Make these functions available globally for inline onclick handlers
window.editJob = async (jobId) => {
    try {
        const jobRef = doc(db, "jobs", jobId);
        const jobSnap = await getDoc(jobRef);

        if (jobSnap.exists()) {
            const job = jobSnap.data();
            document.getElementById('jobId').value = jobId;
            document.getElementById('jobTitle').value = job.title;
            document.getElementById('jobDescription').value = job.description;
            document.getElementById('jobQualifications').value = job.qualifications || "";
            document.getElementById('jobResponsibilities').value = job.responsibilities || "";
            document.getElementById('jobLocation').value = job.location;
            document.getElementById('jobSalary').value = job.salary || "";

            showJobModal(true);
            // Scroll to form
            jobFormModal.scrollIntoView({ behavior: 'smooth' });
        }
    } catch (error) {
        console.error("Error fetching job details:", error);
        showToast("Error loading job details", "error");
    }
};

window.deleteJob = async (jobId) => {
    if (confirm("Are you sure you want to delete this job posting?")) {
        try {
            await deleteDoc(doc(db, "jobs", jobId));
            showToast("Job deleted successfully");
            if (auth.currentUser) {
                fetchEmployerJobs(auth.currentUser.uid);
            }
        } catch (error) {
            console.error("Error deleting job:", error);
            showToast("Failed to delete job", "error");
        }
    }
};

// Handle Job Form Submit
if (jobForm) {
    jobForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        saveJobBtn.disabled = true;
        const originalBtnText = saveJobBtn.textContent;
        saveJobBtn.textContent = "Processing...";

        const jobId = document.getElementById('jobId').value;
        const jobData = {
            title: document.getElementById('jobTitle').value,
            description: document.getElementById('jobDescription').value,
            qualifications: document.getElementById('jobQualifications').value,
            responsibilities: document.getElementById('jobResponsibilities').value,
            location: document.getElementById('jobLocation').value,
            salary: document.getElementById('jobSalary').value,
            employerId: auth.currentUser.uid,
            companyName: auth.currentUser.displayName || "Unknown Company",
            updatedAt: serverTimestamp()
        };

        try {
            if (jobId) {
                // Update
                const jobRef = doc(db, "jobs", jobId);
                await updateDoc(jobRef, jobData);
                showToast("Job updated successfully!");
            } else {
                // Create
                jobData.createdAt = serverTimestamp();
                await addDoc(collection(db, "jobs"), jobData);
                showToast("Job posted successfully!");
            }
            hideJobModal();
            fetchEmployerJobs(auth.currentUser.uid);
        } catch (error) {
            console.error("Error saving job:", error);
            showToast("Failed to save job. " + error.message, "error");
        } finally {
            saveJobBtn.disabled = false;
            saveJobBtn.textContent = originalBtnText;
        }
    });
}

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
