import { auth, db, storage } from '../Backend/firebase-config.js';
import { onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";


const userEmailElement = document.getElementById('userNameDisplay');
const userNameElement = document.getElementById('userName');
const profileSection = document.getElementById('profileSection');
const candidateForm = document.getElementById('candidateForm');
const employerForm = document.getElementById('employerForm');

// Job Search Elements
const searchKeyword = document.getElementById('searchKeyword');
const searchLocation = document.getElementById('searchLocation');
const searchJobType = document.getElementById('searchJobType');
const searchBtn = document.getElementById('searchBtn');
const candidateJobList = document.getElementById('candidateJobList');

let allCandidateJobs = []; // Store fetched jobs for client-side filtering
let candidateAppliedJobIds = new Set();



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

        // Update all user name displays
        if (userEmailElement) userEmailElement.textContent = displayName;
        if (userNameElement) userNameElement.textContent = displayName;

        // Update dropdown user info
        const dropdownUserName = document.getElementById('dropdownUserName');
        const dropdownUserEmail = document.getElementById('dropdownUserEmail');
        if (dropdownUserName) dropdownUserName.textContent = displayName;
        if (dropdownUserEmail) dropdownUserEmail.textContent = email;

        try {
            currentUserDocRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(currentUserDocRef);

            if (docSnap.exists()) {
                const userData = docSnap.data();

                if (userData.userType === 'seeker') {
                    candidateForm.style.display = "grid";
                    // Pre-fill Candidate Data
                    document.getElementById('candName').value = userData.name || displayName;
                    document.getElementById('candPhone').value = userData.phone || "";
                    document.getElementById('candSkills').value = userData.skills || "";
                    document.getElementById('candExperience').value = userData.experience || "";
                    if (userData.resumeUrl || userData.resumePath) {
                        document.getElementById('resumeFileName').textContent = "Resume already uploaded";
                    }

                    // Show Browse Jobs section by default (not profile!)
                    const browseSection = document.getElementById('browseJobsSection');
                    if (browseSection) {
                        browseSection.style.display = 'block';
                        browseSection.classList.add('active');
                    }

                    // Hide other sections
                    const profileSec = document.getElementById('profileSection');
                    const appsSec = document.getElementById('myApplicationsSection');
                    if (profileSec) profileSec.style.display = 'none';
                    if (appsSec) appsSec.style.display = 'none';

                    // Fetch jobs and applications
                    fetchCandidateJobs();
                    fetchMyApplications();

                    // Build seeker navigation
                    buildSeekerNavigation();

                } else if (userData.userType === 'employer') {
                    employerForm.style.display = "grid";

                    // Pre-fill Employer Data
                    document.getElementById('empCompanyName').value = userData.companyName || userData.company || "";
                    document.getElementById('empWebsite').value = userData.website || "";
                    document.getElementById('empIndustry').value = userData.industry || "";
                    document.getElementById('empDescription').value = userData.description || "";
                    document.getElementById('empContactEmail').value = userData.contactEmail || email;
                    document.getElementById('empContactPhone').value = userData.contactPhone || "";

                    // Show Employer Jobs section by default
                    const empJobsSection = document.getElementById('employerJobsSection');
                    if (empJobsSection) {
                        empJobsSection.style.display = 'block';
                        empJobsSection.classList.add('active');
                    }

                    // Hide seeker sections
                    const browseSec = document.getElementById('browseJobsSection');
                    const appsSec = document.getElementById('myApplicationsSection');
                    const profileSec = document.getElementById('profileSection');
                    if (browseSec) browseSec.style.display = 'none';
                    if (appsSec) appsSec.style.display = 'none';
                    if (profileSec) profileSec.style.display = 'none';

                    // Build employer navigation
                    buildEmployerNavigation();

                    // Fetch jobs and load applicants view
                    fetchEmployerJobs(user.uid);
                    fetchJobsWithApplicationCounts(user.uid);
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


// ================= MY APPLICATIONS (CANDIDATE) =================

const fetchMyApplications = async () => {
    if (!auth.currentUser) return;

    const myApplicationsList = document.getElementById('myApplicationsList');
    if (!myApplicationsList) return;

    myApplicationsList.innerHTML = '<p class="no-jobs">Loading your applications...</p>';

    try {
        const appsRef = collection(db, "applications");
        const q = query(appsRef, where("candidateId", "==", auth.currentUser.uid));
        const querySnapshot = await getDocs(q);

        myApplicationsList.innerHTML = '';

        if (querySnapshot.empty) {
            myApplicationsList.innerHTML = '<p class="no-jobs">You haven\'t applied to any jobs yet. Browse jobs and start applying!</p>';
            return;
        }

        // Collect all applications and sort by appliedAt (client-side)
        const applications = [];
        querySnapshot.forEach((doc) => {
            applications.push({ id: doc.id, ...doc.data() });
        });

        // Sort by appliedAt descending (most recent first)
        applications.sort((a, b) => {
            if (!a.appliedAt) return 1;
            if (!b.appliedAt) return -1;
            return b.appliedAt.seconds - a.appliedAt.seconds;
        });

        // Fetch job details for each application
        for (const appData of applications) {
            const jobRef = doc(db, "jobs", appData.jobId);
            const jobSnap = await getDoc(jobRef);

            if (jobSnap.exists()) {
                const jobData = jobSnap.data();
                myApplicationsList.appendChild(createApplicationCard(appData, jobData));
            }
        }

    } catch (error) {
        console.error("Error fetching applications:", error);
        myApplicationsList.innerHTML = '<p class="no-jobs">Error loading applications. Please try again.</p>';
    }
};

const createApplicationCard = (application, jobData) => {
    const card = document.createElement('div');
    card.className = 'application-card';

    const statusClass = `app-status-${(application.status || 'applied').toLowerCase()}`;

    card.innerHTML = `
        <div class="app-header">
            <div>
                <div class="app-job-title">${jobData.title}</div>
                <div class="app-company">${jobData.companyName}</div>
            </div>
            <span class="${statusClass} app-status-badge">${application.status || 'Applied'}</span>
        </div>
        <div class="app-details">
            <span class="app-detail-item"><span class="icon">📍</span> ${jobData.location}</span>
            <span class="app-detail-item"><span class="icon">💼</span> ${jobData.jobType || 'Full-time'}</span>
            <span class="app-detail-item"><span class="icon">📅</span> Applied: ${formatDate(application.appliedAt)}</span>
        </div>
    `;

    return card;
};

// ================= VIEW APPLICANTS SECTION (EMPLOYER) =================

// Fetch and display all jobs with application counts
const fetchJobsWithApplicationCounts = async (employerId) => {
    const applicantsContainer = document.getElementById('applicantsListContainer');
    if (!applicantsContainer) return;

    applicantsContainer.innerHTML = '<p class="no-jobs">Loading jobs...</p>';

    try {
        // Get all jobs by this employer
        const jobsRef = collection(db, "jobs");
        const jobsQuery = query(jobsRef, where("employerId", "==", employerId));
        const jobsSnapshot = await getDocs(jobsQuery);

        if (jobsSnapshot.empty) {
            applicantsContainer.innerHTML = '<p class="no-jobs">Post some jobs to start receiving applications!</p>';
            return;
        }

        // Get all applications for this employer
        const appsRef = collection(db, "applications");
        const appsQuery = query(appsRef, where("employerId", "==", employerId));
        const appsSnapshot = await getDocs(appsQuery);

        // Count applications per job
        const applicationCounts = {};
        appsSnapshot.forEach(doc => {
            const appData = doc.data();
            if (!applicationCounts[appData.jobId]) {
                applicationCounts[appData.jobId] = 0;
            }
            applicationCounts[appData.jobId]++;
        });

        // Collect jobs and sort by creation date
        const jobs = [];
        jobsSnapshot.forEach((doc) => {
            jobs.push({ id: doc.id, ...doc.data() });
        });

        jobs.sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return b.createdAt.seconds - a.createdAt.seconds;
        });

        // Clear container and display jobs
        applicantsContainer.innerHTML = '';

        // Display each job as a clickable card
        const jobsContainer = document.createElement('div');
        jobsContainer.className = 'applicants-jobs-list';

        jobs.forEach(job => {
            const count = applicationCounts[job.id] || 0;
            const jobCard = createJobSelectorCard(job, count);
            jobsContainer.appendChild(jobCard);
        });

        applicantsContainer.appendChild(jobsContainer);

    } catch (error) {
        console.error("Error fetching jobs with application counts:", error);
        applicantsContainer.innerHTML = '<p class="no-jobs">Error loading jobs. Please try again.</p>';
    }
};

// Create a job selector card with application count
const createJobSelectorCard = (job, applicationCount) => {
    const card = document.createElement('div');
    card.className = 'job-selector-card';

    const companyInitial = job.companyName ? job.companyName.charAt(0).toUpperCase() : 'J';

    card.innerHTML = `
        <div class="job-info">
            <div class="company-avatar">${companyInitial}</div>
            <div class="job-details-wrapper">
                <div class="job-header">
                    <div class="job-title-wrapper">
                        <div class="job-title">${job.title}</div>
                        <div class="job-company">${job.companyName}</div>
                    </div>
                </div>
                <div class="job-meta">
                    <span class="meta-item"><span class="meta-icon">📍</span> ${job.location}</span>
                    <span class="meta-item"><span class="meta-icon">💼</span> ${job.jobType || 'Full-time'}</span>
                    <span class="meta-item"><span class="meta-icon">📅</span> Posted: ${formatDate(job.createdAt)}</span>
                </div>
            </div>
        </div>
        <div class="job-action">
            <div class="application-count-badge">
                <span class="count-number">${applicationCount}</span>
                <span class="count-label">Application${applicationCount !== 1 ? 's' : ''}</span>
            </div>
            <button class="action-btn view-applicants-btn" onclick="viewJobApplicants('${job.id}', '${job.title}')">
                VIEW APPLICANTS
            </button>
        </div>
    `;

    return card;
};

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
                // Upload Resume and store the storage path for fresh URL generation
                const uniqueName = `${Date.now()}_${resumeFile.name}`;
                const storagePath = `resumes/${auth.currentUser.uid}/${uniqueName}`;
                const storageRef = ref(storage, storagePath);
                const metadata = { contentType: resumeFile.type };

                await uploadBytes(storageRef, resumeFile, metadata);
                // Store the path instead of URL - prevents issues with bucket recreation
                updateData.resumePath = storagePath;
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


// Helper to format date as dd-mm-yyyy
const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp.seconds * 1000);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
};


// Make these functions available globally for inline onclick handlers
window.editJob = async (jobId) => {
    // TODO: Implement job editing modal
    showToast("Job editing feature coming soon!", "error");
    console.log("Edit job:", jobId);
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
    } // End confirm
};

window.viewJobApplicants = async (jobId, jobTitle) => {
    // Switch to View Applicants section
    handleSectionSwitch('applicants');

    const applicantsContainer = document.getElementById('applicantsListContainer');
    if (!applicantsContainer) return;

    applicantsContainer.innerHTML = `<p class="no-jobs">Loading applicants for "${jobTitle}"...</p>`;

    try {
        const appsRef = collection(db, "applications");
        const q = query(appsRef, where("jobId", "==", jobId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            applicantsContainer.innerHTML = `<p class="no-jobs">No applicants yet for "${jobTitle}".</p>`;
            return;
        }

        applicantsContainer.innerHTML = `<h3 style="margin-bottom: 20px;">Applicants for: ${jobTitle}</h3>`;

        for (const docSnap of querySnapshot.docs) {
            const application = docSnap.data();
            const candidateRef = doc(db, "users", application.candidateId);
            const candidateSnap = await getDoc(candidateRef);
            const candidateData = candidateSnap.exists() ? candidateSnap.data() : {};

            const applicantCard = document.createElement('div');
            applicantCard.className = 'job-card';

            // Determine status badge color
            let statusBadge = '';
            if (application.status === 'Shortlisted') statusBadge = '<span style="color: #3b82f6; font-weight: bold; margin-left: 10px;">SHORTLISTED</span>';
            else if (application.status === 'Rejected') statusBadge = '<span style="color: #ef4444; font-weight: bold; margin-left: 10px;">REJECTED</span>';

            applicantCard.innerHTML = `
                <div class="job-info">
                    <div class="company-avatar">${(candidateData.name || 'U').charAt(0).toUpperCase()}</div>
                    <div class="job-details-wrapper">
                        <div class="job-header">
                            <div class="job-title-wrapper">
                                <div class="job-title">
                                    ${candidateData.name || 'Unknown Candidate'}
                                    ${statusBadge}
                                </div>
                                <div class="job-company">${candidateData.email || ''}</div>
                            </div>
                        </div>
                        <div class="job-meta">
                            <span class="meta-item"><span class="meta-icon">📞</span> ${candidateData.phone || 'N/A'}</span>
                            <span class="meta-item"><span class="meta-icon">💼</span> ${candidateData.experience || 'N/A'}</span>
                            <span class="meta-item"><span class="meta-icon">🛠️</span> ${candidateData.skills || 'N/A'}</span>
                            <span class="meta-item"><span class="meta-icon">📅</span> Applied: ${formatDate(application.appliedAt)}</span>
                        </div>
                    </div>
                </div>
                <div class="job-action" style="display: flex; gap: 8px;">
                    ${candidateData.resumePath || candidateData.resumeUrl
                    ? `<button class="action-btn" onclick="viewResume('${candidateData.resumePath || candidateData.resumeUrl}')">VIEW RESUME</button>`
                    : '<span style="color: #94a3b8; align-self: center;">No resume</span>'
                }
                
                ${application.status !== 'Shortlisted' && application.status !== 'Rejected' ? `
                    <button class="action-btn shortlist" onclick="updateApplicationStatus('${docSnap.id}', 'Shortlisted')">SHORTLIST</button>
                    <button class="action-btn reject" onclick="updateApplicationStatus('${docSnap.id}', 'Rejected')">REJECT</button>
                ` : ''}
                </div>
            `;
            applicantsContainer.appendChild(applicantCard);
        }
    } catch (error) {
        console.error("Error fetching applicants:", error);
        applicantsContainer.innerHTML = '<p class="no-jobs">Error loading applicants.</p>';
    }
};

window.updateApplicationStatus = async (appId, newStatus) => {
    try {
        const appRef = doc(db, "applications", appId);
        await updateDoc(appRef, { status: newStatus });
        showToast(`Candidate ${newStatus} successfully!`);

        // Refresh current view
        const appSnap = await getDoc(appRef);
        const appData = appSnap.data();
        viewJobApplicants(appData.jobId, appData.jobTitle);

    } catch (error) {
        console.error("Error updating status:", error);
        showToast(`Failed to update status.`, "error");
    }
};

window.viewResume = async (resumePath) => {
    if (!resumePath) {
        showToast("Resume not available", "error");
        return;
    }

    try {
        // If it's already a full URL, open it directly
        if (resumePath.startsWith('http://') || resumePath.startsWith('https://')) {
            window.open(resumePath, '_blank');
        } else {
            // It's a storage path, generate fresh download URL
            const storageRef = ref(storage, resumePath);
            const downloadURL = await getDownloadURL(storageRef);
            window.open(downloadURL, '_blank');
        }
    } catch (error) {
        console.error('Error loading resume:', error);
        showToast('Failed to load resume. The file may have been deleted or you may not have permission.', 'error');
    }
};


// ================= CANDIDATE SEARCH LOGIC =================

const createCandidateJobElement = (job) => {
    const jobCard = document.createElement('div');
    jobCard.className = 'job-card';

    // Get first letter of company name for avatar
    const companyInitial = job.companyName ? job.companyName.charAt(0).toUpperCase() : 'n';

    jobCard.innerHTML = `
        <div class="job-info">
            <div class="company-avatar">${companyInitial}</div>
            <div class="job-details-wrapper">
                <div class="job-header">
                    <div class="job-title-wrapper">
                        <div class="job-title">${job.title}</div>
                        <div class="job-company">${job.companyName}</div>
                    </div>
                </div>
                <div class="job-meta">
                    <span class="meta-item"><span class="meta-icon">📍</span> ${job.location}</span>
                    <span class="meta-item"><span class="meta-icon">💼</span> ${job.jobType || 'Full-time'}</span>
                    <span class="meta-item"><span class="meta-icon">💰</span> ${job.salary || 'Not specified'}</span>
                    <span class="meta-item"><span class="meta-icon">📅</span> ${formatDate(job.createdAt)}</span>
                </div>
            </div>
        </div>
        <div class="job-action">
            ${candidateAppliedJobIds.has(job.id)
            ? `<button class="action-btn applied" disabled>APPLIED</button>`
            : `<button class="action-btn" onclick="applyForJob('${job.id}')">APPLY NOW</button>`
        }
        </div>
    `;
    return jobCard;
};


const fetchCandidateJobs = async () => {
    if (!candidateJobList) return;
    candidateJobList.innerHTML = '<p class="no-jobs">Loading jobs...</p>';

    try {
        // Fetch ALL jobs
        const jobsRef = collection(db, "jobs");
        const q = query(jobsRef);
        const querySnapshot = await getDocs(q);

        // Fetch User's Applications to know what they applied to
        candidateAppliedJobIds = new Set();
        if (auth.currentUser) {
            const myAppsQ = query(collection(db, "applications"), where("candidateId", "==", auth.currentUser.uid));
            const myAppsSnap = await getDocs(myAppsQ);
            myAppsSnap.forEach(doc => {
                candidateAppliedJobIds.add(doc.data().jobId);
            });
        }

        allCandidateJobs = [];
        querySnapshot.forEach((doc) => {
            allCandidateJobs.push({ id: doc.id, ...doc.data() });
        });

        // Sort by createdAt descending (most recent first) - client-side
        allCandidateJobs.sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return b.createdAt.seconds - a.createdAt.seconds;
        });

        renderCandidateJobs(allCandidateJobs);

    } catch (error) {
        console.error("Error fetching candidate jobs:", error);
        candidateJobList.innerHTML = '<p class="no-jobs">Error loading jobs.</p>';
        // If index is missing, it might error. Fallback to unordered fetch might be needed if orderBy fails, 
        // but typically simple orderBy works or requires one-time index creation link in console.
    }
};

const renderCandidateJobs = (jobs) => {
    candidateJobList.innerHTML = '';

    if (jobs.length === 0) {
        candidateJobList.innerHTML = '<p class="no-jobs">No jobs found matching your criteria.</p>';
        return;
    }

    jobs.forEach(job => {
        candidateJobList.appendChild(createCandidateJobElement(job));
    });
};

const filterJobs = () => {
    // Null checks for search elements
    if (!searchKeyword || !searchLocation || !searchJobType) {
        console.warn("Search elements not found, showing all jobs");
        renderCandidateJobs(allCandidateJobs);
        return;
    }

    const keyword = searchKeyword.value.toLowerCase().trim();
    const location = searchLocation.value.toLowerCase().trim();
    const jobType = searchJobType.value;

    const filtered = allCandidateJobs.filter(job => {
        // If keyword is empty, match all; otherwise check title, description, company
        const matchesKeyword = !keyword ||
            (job.title && job.title.toLowerCase().includes(keyword)) ||
            (job.description && job.description.toLowerCase().includes(keyword)) ||
            (job.companyName && job.companyName.toLowerCase().includes(keyword));

        // If location is empty, match all; otherwise check location
        const matchesLocation = !location ||
            (job.location && job.location.toLowerCase().includes(location));

        // If jobType is empty/all, match all; otherwise must match exactly
        const currentJobType = job.jobType || 'Full-time';
        const matchesType = !jobType || jobType === "" || currentJobType === jobType;

        return matchesKeyword && matchesLocation && matchesType;
    });

    renderCandidateJobs(filtered);
};

// ===== EMPLOYER JOB FUNCTIONS =====

const fetchEmployerJobs = async (employerId) => {
    const empJobList = document.getElementById('employerJobList');
    if (!empJobList) return;

    empJobList.innerHTML = '<p class="no-jobs">Loading your jobs...</p>';

    try {
        const jobsRef = collection(db, "jobs");
        const q = query(jobsRef, where("employerId", "==", employerId));
        const querySnapshot = await getDocs(q);

        const jobs = [];
        querySnapshot.forEach((doc) => {
            jobs.push({ id: doc.id, ...doc.data() });
        });

        // Sort by createdAt descending
        jobs.sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return b.createdAt.seconds - a.createdAt.seconds;
        });

        renderEmployerJobs(jobs);
    } catch (error) {
        console.error("Error fetching employer jobs:", error);
        empJobList.innerHTML = '<p class="no-jobs">Error loading jobs.</p>';
    }
};

const renderEmployerJobs = (jobs) => {
    const empJobList = document.getElementById('employerJobList');
    empJobList.innerHTML = '';

    if (jobs.length === 0) {
        empJobList.innerHTML = '<p class="no-jobs">No jobs posted yet. Click the button above to post your first job!</p>';
        return;
    }

    jobs.forEach(job => {
        empJobList.appendChild(createEmployerJobElement(job));
    });
};

const createEmployerJobElement = (job) => {
    const jobCard = document.createElement('div');
    jobCard.className = 'job-card';

    const companyInitial = job.companyName ? job.companyName.charAt(0).toUpperCase() : 'C';

    jobCard.innerHTML = `
        <div class="job-info">
            <div class="company-avatar">${companyInitial}</div>
            <div class="job-details-wrapper">
                <div class="job-header">
                    <div class="job-title-wrapper">
                        <div class="job-title">${job.title}</div>
                        <div class="job-company">${job.companyName}</div>
                    </div>
                </div>
                <div class="job-meta">
                    <span class="meta-item"><span class="meta-icon">📍</span> ${job.location}</span>
                    <span class="meta-item"><span class="meta-icon">💼</span> ${job.jobType || 'Full-time'}</span>
                    <span class="meta-item"><span class="meta-icon">💰</span> ${job.salary || 'Not specified'}</span>
                    <span class="meta-item"><span class="meta-icon">📅</span> ${formatDate(job.createdAt)}</span>
                </div>
            </div>
        </div>
        <div class="job-action">
            <button class="action-btn" onclick="viewJobApplicants('${job.id}', '${job.title}')">VIEW APPLICANTS</button>
            <button class="action-btn" onclick="editJob('${job.id}')" style="margin-left: 8px; background: transparent; border-color: #64748b; color: #cbd5e1;">EDIT</button>
        </div>
    `;
    return jobCard;
};

if (searchBtn) {
    searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        filterJobs();
    });
}

window.applyForJob = async (jobId) => {
    if (!auth.currentUser) return;

    try {
        // 1. Check if user has a resume (either new path or old URL)
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();

        if (!userSnap.exists() || (!userData.resumePath && !userData.resumeUrl)) {
            showToast("Please upload a resume in your profile before applying.", "error");
            // Highlight profile section maybe?
            document.getElementById('profileSection').scrollIntoView({ behavior: 'smooth' });
            return;
        }

        // 2. Fetch Job Details for snapshot
        const jobRef = doc(db, "jobs", jobId);
        const jobSnap = await getDoc(jobRef);
        const jobData = jobSnap.data();

        // 3. Create Application
        await addDoc(collection(db, "applications"), {
            jobId: jobId,
            candidateId: auth.currentUser.uid,
            employerId: jobData.employerId,
            jobTitle: jobData.title,
            candidateName: userData.name || auth.currentUser.displayName,
            // Store path for new system, URL for backward compatibility
            candidateResumePath: userData.resumePath || null,
            candidateResumeUrl: userData.resumeUrl || null,
            status: 'Applied',
            appliedAt: serverTimestamp()
        });

        showToast("Application submitted successfully!");

        // Update local state and UI
        candidateAppliedJobIds.add(jobId);
        // Refresh list to show "Applied" button
        renderCandidateJobs(allCandidateJobs); // Simplest way to update UI

        // Refresh My Applications tab
        fetchMyApplications();

    } catch (error) {
        console.error("Error applying:", error);
        showToast("Failed to apply. " + error.message, "error");
    }
};



// Logout Logic
const dropdownLogoutBtn = document.getElementById('dropdownLogoutBtn');
if (dropdownLogoutBtn) {
    dropdownLogoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.href = "index.html";
        } catch (error) {
            console.error("Sign Out Error", error);
            alert("Failed to sign out. Please try again.");
        }
    });
}

// ===== NEW NAVIGATION HANDLERS =====


// Helper function to switch content sections
function switchContentSection(sectionId) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active');
    });

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
        targetSection.classList.add('active');
    }
}

// Helper function to update content tabs active state  
function updateContentTabs(tabName) {
    const tabs = document.querySelectorAll('.content-tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.content === tabName) {
            tab.classList.add('active');
        }
    });

    // Also update top tabs
    const topTabsElements = document.querySelectorAll('.top-tab');
    topTabsElements.forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        }
    });
}

// ===== NAVIGATION BUILDERS =====

function buildSeekerNavigation() {
    const sidebarNav = document.getElementById('sidebarNav');
    const topTabs = document.getElementById('topTabs');
    const contentTabs = document.getElementById('contentTabs');

    // Build sidebar navigation for seekers
    sidebarNav.innerHTML = `
        <a href="#" class="nav-item active" data-section="browse">
            <span class="nav-icon">◉</span>
            <span class="nav-text">Browse Jobs</span>
        </a>
        <a href="#" class="nav-item" data-section="applications">
            <span class="nav-icon">☰</span>
            <span class="nav-text">My Applications</span>
        </a>
        <a href="#" class="nav-item" data-section="profile">
            <span class="nav-icon">◯</span>
            <span class="nav-text">Profile</span>
        </a>
    `;

    // Build top bar tabs for seekers
    topTabs.innerHTML = `
        <button class="top-tab active" data-tab="browse">Browse Jobs</button>
        <button class="top-tab" data-tab="applications">My Applications</button>
        <button class="top-tab" data-tab="profile">Profile</button>
    `;

    // Build content tabs for seekers
    contentTabs.innerHTML = `
        <button class="content-tab active" data-content="browse">Browse Jobs</button>
        <button class="content-tab" data-content="applications">My Applications</button>
        <button class="content-tab" data-content="profile">Profile</button>
    `;

    // Re-attach event listeners
    attachNavigationListeners();
}

function buildEmployerNavigation() {
    const sidebarNav = document.getElementById('sidebarNav');
    const topTabs = document.getElementById('topTabs');
    const contentTabs = document.getElementById('contentTabs');

    // Build sidebar navigation for employers
    sidebarNav.innerHTML = `
        <a href="#" class="nav-item active" data-section="my-jobs">
            <span class="nav-icon">◼</span>
            <span class="nav-text">My Jobs</span>
        </a>
        <a href="#" class="nav-item" data-section="applicants">
            <span class="nav-icon">▦</span>
            <span class="nav-text">View Applicants</span>
        </a>
        <a href="#" class="nav-item" data-section="profile">
            <span class="nav-icon">◯</span>
            <span class="nav-text">Profile</span>
        </a>
    `;

    // Build top bar tabs for employers
    topTabs.innerHTML = `
        <button class="top-tab active" data-tab="my-jobs">My Jobs</button>
        <button class="top-tab" data-tab="applicants">View Applicants</button>
        <button class="top-tab" data-tab="profile">Profile</button>
    `;

    // Build content tabs for employers
    contentTabs.innerHTML = `
        <button class="content-tab active" data-content="my-jobs">My Jobs</button>
        <button class="content-tab" data-content="applicants">View Applicants</button>
        <button class="content-tab" data-content="profile">Profile</button>
    `;

    // Re-attach event listeners
    attachNavigationListeners();
}

function attachNavigationListeners() {
    // Sidebar Navigation
    const sidebarItems = document.querySelectorAll('.sidebar .nav-item');
    sidebarItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;

            // Update active state
            sidebarItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Switch content sections
            handleSectionSwitch(section);
        });
    });

    // Top Bar Tabs
    const topTabs = document.querySelectorAll('.top-tab');
    topTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;

            // Update active state
            topTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Switch content
            handleSectionSwitch(tabName);
        });
    });

    // Content Tabs
    const contentTabs = document.querySelectorAll('.content-tab');
    contentTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const contentName = tab.dataset.content;

            // Update active state
            contentTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Switch content
            handleSectionSwitch(contentName);
        });
    });
}

function handleSectionSwitch(section) {
    // Map section names to section IDs
    const sectionMap = {
        'browse': 'browseJobsSection',
        'applications': 'myApplicationsSection',
        'profile': 'profileSection',
        'my-jobs': 'employerJobsSection',
        'applicants': 'viewApplicantsSection',
        'dashboard': 'browseJobsSection' // Default for seekers
    };

    const sectionId = sectionMap[section];
    if (sectionId) {
        switchContentSection(sectionId);
    }
}

// ===== SIDEBAR TOGGLE FUNCTIONALITY =====

const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.querySelector('.sidebar');

if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');

        // Update toggle icon
        const toggleIcon = sidebarToggle.querySelector('.toggle-icon');
        if (sidebar.classList.contains('collapsed')) {
            toggleIcon.textContent = '☰';
        } else {
            toggleIcon.textContent = '☰';
        }
    });
}

// ===== USER PROFILE DROPDOWN =====

const userProfileBtn = document.getElementById('userProfileBtn');
const userDropdown = document.getElementById('userDropdown');

if (userProfileBtn && userDropdown) {
    // Toggle dropdown on button click
    userProfileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('active');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!userDropdown.contains(e.target) && !userProfileBtn.contains(e.target)) {
            userDropdown.classList.remove('active');
        }
    });

    // Prevent dropdown from closing when clicking inside it
    userDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}
