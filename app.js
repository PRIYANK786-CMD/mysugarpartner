// ==========================================
// SECTION 1: FIREBASE INITIALIZATION & IMPORTS
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
    sendEmailVerification, sendPasswordResetEmail, updatePassword, signOut, onAuthStateChanged,
    deleteUser, EmailAuthProvider, reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, 
    collection, query, where, getDocs, addDoc, orderBy, limit, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCuRvH-41ts0fPKl3s2jlRMcRWkFpwOgK8",
    authDomain: "mysugarpartner-ebeaf.firebaseapp.com",
    projectId: "mysugarpartner-ebeaf",
    storageBucket: "mysugarpartner-ebeaf.firebasestorage.app",
    messagingSenderId: "152900007649",
    appId: "1:152900007649:web:b904a964a6af648ea29a0",
    measurementId: "G-GJ67V38FKK"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.auth = auth;
const appContainer = document.getElementById("app");

// ==========================================
// PADDLE BILLING INITIALIZATION
// ==========================================
const PADDLE_CLIENT_TOKEN = "live_206683fbd1b7ae341a40534cb92"; 
const PADDLE_PRICE_ID = "pri_01m65jy9s6tbvpb8kpk7v101yv"; // $10/year Price ID

if (window.Paddle) {
    Paddle.Initialize({ token: PADDLE_CLIENT_TOKEN });
}

// ==========================================
// SECTION 2: CONSTANTS & WEBRTC STATE
// ==========================================
const countries = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
    "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
    "Cambodia", "Cameroon", "Canada", "Cape Verde", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
    "Denmark", "Djibouti", "Dominica", "Dominican Republic",
    "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
    "Fiji", "Finland", "France",
    "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guyana",
    "Haiti", "Honduras", "Hungary",
    "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
    "Jamaica", "Japan", "Jordan",
    "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
    "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
    "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
    "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway",
    "Oman",
    "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
    "Qatar",
    "Romania", "Russia", "Rwanda",
    "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
    "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
    "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
    "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
    "Yemen", "Zambia", "Zimbabwe"
];

let globalCallUnsubscribe = null;
let peerConnection = null;
let localStream = null;
let activeCallId = null;
let callDocUnsubscribe = null;
let activeChatUnsubscribe = null;
let currentActiveBuddyId = null; 

const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// ==========================================
// SECTION 3: AUTH STATE LISTENER & ROUTER
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        if (!user.emailVerified) {
            renderVerificationPendingView(user);
        } else {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (!userDoc.exists() || !userDoc.data().profileCompleted) {
                renderProfileCreationView(user);
            } else {
                const userData = userDoc.data();
                
                // Subscription Check: International users pay $10/year, expired accounts must renew
                if (userData.country !== "India" && userData.subscriptionExpiresAt && Date.now() > userData.subscriptionExpiresAt) {
                    alert("Your 1-year international subscription ($10/year) has expired. Please renew to continue accessing the app.");
                    initiatePaddleCheckout(user, userData.country, userData.profilePic, true);
                    return;
                }

                renderMainDashboard(user);
                listenForIncomingCalls(user.uid);
            }
        }
    } else {
        if (globalCallUnsubscribe) globalCallUnsubscribe();
        renderAuthView();
    }
});

// ==========================================
// SECTION 4: AUTH & PROFILE CREATION VIEWS
// ==========================================
function renderAuthView() {
    appContainer.innerHTML = `
        <div class="flex flex-col items-center justify-between flex-1 px-4 py-12 min-h-screen">
            <div class="flex flex-col items-center justify-center flex-1 w-full max-w-md mx-auto">
                <h1 class="text-4xl font-bold text-pink-600 mb-2">mysugarpartner.in ❤️</h1>
                <p class="text-gray-600 mb-8">Connecting Type 1 Diabetic Hearts Worldwide</p>
                <div class="bg-white p-8 rounded-2xl shadow-xl w-full">
                    <h2 class="text-2xl font-bold mb-6 text-gray-700" id="form-title">Welcome Back</h2>
                    <input type="email" id="email" placeholder="Enter your email id" class="w-full px-4 py-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400">
                    <input type="password" id="password" placeholder="Enter password" class="w-full px-4 py-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400">
                    <button id="auth-btn" class="w-full bg-pink-600 text-white py-3 rounded-lg font-semibold hover:bg-pink-700 transition">Login</button>
                    <div class="flex justify-between mt-4 text-sm">
                        <button id="toggle-mode" class="text-pink-600 hover:underline">Create new account</button>
                        <button id="forgot-password" class="text-gray-500 hover:underline">Forgot password?</button>
                    </div>
                </div>
            </div>
            <footer class="text-center text-xs text-gray-500 mt-8 py-4 border-t w-full">
                Designed & Developed By MR. PRIYANK PANCHAL. All Rights Reserved.
            </footer>
        </div>
    `;

    let isLogin = true;
    document.getElementById("toggle-mode").addEventListener("click", () => {
        isLogin = !isLogin;
        document.getElementById("form-title").innerText = isLogin ? "Welcome Back" : "Register Unique Email";
        document.getElementById("auth-btn").innerText = isLogin ? "Login" : "Sign Up & Verify Mail";
        document.getElementById("toggle-mode").innerText = isLogin ? "Create new account" : "Already have an account? Login";
    });

    document.getElementById("auth-btn").addEventListener("click", async () => {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const userCred = await createUserWithEmailAndPassword(auth, email, password);
                await sendEmailVerification(userCred.user);
                alert("Verification email sent! Click the link in your inbox before logging in.");
            }
        } catch (error) {
            alert(error.message);
        }
    });

    document.getElementById("forgot-password").addEventListener("click", async () => {
        const email = prompt("Enter your registered email address for password reset link:");
        if (email) {
            try {
                await sendPasswordResetEmail(auth, email);
                alert("Password reset link sent to your mail!");
            } catch (err) {
                alert(err.message);
            }
        }
    });
}

function renderVerificationPendingView(user) {
    appContainer.innerHTML = `
        <div class="flex flex-col items-center justify-between flex-1 p-6 text-center min-h-screen">
            <div class="flex flex-col items-center justify-center flex-1 w-full max-w-md mx-auto">
                <div class="bg-white p-8 rounded-2xl shadow-lg w-full">
                    <h2 class="text-2xl font-bold text-red-500 mb-4">Email Verification Required</h2>
                    <p class="text-gray-600 mb-6">We sent a verification link to <b>${user.email}</b>. Confirm it in your inbox, then click below.</p>
                    <button id="check-verification-btn" class="w-full bg-pink-600 text-white py-3 rounded-lg font-semibold mb-3 hover:bg-pink-700 transition">I Have Verified, Continue</button>
                    <button onclick="handleLogout()" class="text-gray-500 text-sm hover:underline">Reject / Sign Out</button>
                </div>
            </div>
            <footer class="text-center text-xs text-gray-500 mt-8 py-4 border-t w-full">
                Designed & Developed By MR. PRIYANK PANCHAL. All Rights Reserved.
            </footer>
        </div>
    `;

    document.getElementById("check-verification-btn").addEventListener("click", async () => {
        try {
            const btn = document.getElementById("check-verification-btn");
            btn.innerText = "Checking verification...";
            btn.disabled = true;

            await user.reload();

            if (auth.currentUser.emailVerified) {
                alert("Email verified successfully!");
                window.location.reload(); 
            } else {
                alert("Email not verified yet. Please click the link sent to your inbox first.");
                btn.innerText = "I Have Verified, Continue";
                btn.disabled = false;
            }
        } catch (error) {
            alert("Error checking verification: " + error.message);
            const btn = document.getElementById("check-verification-btn");
            btn.innerText = "I Have Verified, Continue";
            btn.disabled = false;
        }
    });
}

function renderProfileCreationView(user) {
    let countryOptions = countries.map(c => `<option value="${c}">${c}</option>`).join('');
    
    appContainer.innerHTML = `
        <div class="flex flex-col justify-between min-h-screen">
            <div class="max-w-xl mx-auto bg-white my-10 p-8 rounded-2xl shadow-xl w-full relative">
                <h2 class="text-2xl font-bold text-pink-600 mb-6">Create Your Type 1 Profile ❤️</h2>
                <div class="space-y-4">
                    <input type="text" id="p-name" placeholder="Full Name" class="w-full px-4 py-2 border rounded-lg">
                    <input type="number" id="p-age" placeholder="Age" class="w-full px-4 py-2 border rounded-lg">
                    <select id="p-country" class="w-full px-4 py-2 border rounded-lg">${countryOptions}</select>
                    <select id="p-interest" class="w-full px-4 py-2 border rounded-lg">
                        <option value="Dating">Dating</option>
                        <option value="Short-term relationship">Short-term relationship</option>
                        <option value="Long-term relationship">Long-term relationship</option>
                        <option value="Marriage">Marriage</option>
                    </select>
                    <input type="number" id="p-diagnosed" placeholder="Diagnosed Year (e.g., 2015)" class="w-full px-4 py-2 border rounded-lg">
                    <input type="text" id="p-hobbies" placeholder="Hobbies (comma separated)" class="w-full px-4 py-2 border rounded-lg">
                    <div>
                        <label class="block text-sm text-gray-600 mb-1">Profile Picture</label>
                        <input type="file" id="p-img" accept="image/*" class="w-full">
                    </div>

                    <!-- TERMS & CONDITIONS CHECKBOX -->
                    <div class="flex items-start space-x-2 pt-2">
                        <input type="checkbox" id="p-terms" class="mt-1 h-4 w-4 text-pink-600 rounded border-gray-300 focus:ring-pink-500">
                        <label for="p-terms" class="text-sm text-gray-600">
                            I agree to the <button id="open-terms-btn" type="button" class="text-pink-600 font-semibold underline hover:text-pink-700">Terms & Conditions</button>.
                        </label>
                    </div>

                    <button id="save-profile-btn" disabled class="w-full bg-pink-600 text-white py-3 rounded-lg font-semibold hover:bg-pink-700 opacity-50 cursor-not-allowed transition">Save & Complete Profile</button>
                </div>
            </div>

            <!-- TERMS & CONDITIONS MODAL -->
            <div id="terms-modal" class="hidden fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                <div class="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl relative">
                    <h3 class="text-xl font-bold text-pink-600 mb-4" id="terms-title">Terms & Conditions</h3>
                    <div class="text-sm text-gray-700 space-y-3" id="terms-content"></div>
                    <div class="mt-6 flex justify-end">
                        <button id="close-terms-btn" type="button" class="bg-pink-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-pink-700">I Understand & Close</button>
                    </div>
                </div>
            </div>

            <footer class="text-center text-xs text-gray-500 py-4 border-t w-full bg-white">
                Designed & Developed By MR. PRIYANK PANCHAL. All Rights Reserved.
            </footer>
        </div>
    `;

    const termsCheckbox = document.getElementById("p-terms");
    const saveBtn = document.getElementById("save-profile-btn");
    const openTermsBtn = document.getElementById("open-terms-btn");
    const closeTermsBtn = document.getElementById("close-terms-btn");
    const termsModal = document.getElementById("terms-modal");
    const termsContent = document.getElementById("terms-content");
    const countrySelect = document.getElementById("p-country");

    // Enable/Disable Save Button based on Checkbox
    termsCheckbox.addEventListener("change", (e) => {
        if (e.target.checked) {
            saveBtn.disabled = false;
            saveBtn.classList.remove("opacity-50", "cursor-not-allowed");
        } else {
            saveBtn.disabled = true;
            saveBtn.classList.add("opacity-50", "cursor-not-allowed");
        }
    });

    // Open Modal and render country-specific Terms & Conditions
    openTermsBtn.addEventListener("click", () => {
        const selectedCountry = countrySelect.value;
        if (selectedCountry === "India") {
            termsContent.innerHTML = `
                <p><b>1. User Responsibility & Risk:</b> Users join and interact on the platform entirely at their own risk.</p>
                <p><b>2. Community Standards:</b> Any unusual, harmful, abusive, or misleading behavior toward other users is strictly prohibited and will result in an immediate permanent account ban.</p>
            `;
        } else {
            termsContent.innerHTML = `
                <p><b>1. User Responsibility & Risk:</b> Users join and interact on the platform entirely at their own risk.</p>
                <p><b>2. Community Standards:</b> Any unusual, harmful, abusive, or misleading behavior toward other users is strictly prohibited and will result in an immediate permanent account ban.</p>
                <p><b>3. No-Refund Policy:</b> All subscription payments ($10/year) are strictly non-refundable under any circumstances once processed.</p>
            `;
        }
        termsModal.classList.remove("hidden");
    });

    closeTermsBtn.addEventListener("click", () => {
        termsModal.classList.add("hidden");
    });

    // Save Profile Handler
    saveBtn.addEventListener("click", async () => {
        if (!termsCheckbox.checked) {
            alert("You must accept the Terms & Conditions to proceed.");
            return;
        }

        const country = countrySelect.value;
        const name = document.getElementById("p-name").value;

        if (!name) {
            alert("Please enter your name.");
            return;
        }

        const fileInput = document.getElementById("p-img");
        let imageUrl = "";
        if (fileInput.files[0]) {
            imageUrl = await convertImageToBase64(fileInput.files[0]);
        }

        if (country === "India") {
            await saveUserProfileToFirestore(user, country, imageUrl, "free", null);
        } else {
            initiatePaddleCheckout(user, country, imageUrl, false);
        }
    });
}

async function saveUserProfileToFirestore(user, country, imageUrl, subscriptionType, expiryTimestamp) {
    const profileData = {
        uid: user.uid,
        email: user.email,
        name: document.getElementById("p-name") ? document.getElementById("p-name").value : "",
        age: document.getElementById("p-age") ? document.getElementById("p-age").value : "",
        country: country, 
        interest: document.getElementById("p-interest") ? document.getElementById("p-interest").value : "",
        diagnosedYear: document.getElementById("p-diagnosed") ? document.getElementById("p-diagnosed").value : "",
        hobbies: document.getElementById("p-hobbies") ? document.getElementById("p-hobbies").value : "",
        profilePic: imageUrl,
        profileCompleted: true,
        isLive: true,
        subscriptionType: subscriptionType, 
        subscriptionExpiresAt: expiryTimestamp, 
        blockedUsers: []
    };

    await setDoc(doc(db, "users", user.uid), profileData, { merge: true });
    alert("Profile created successfully!");
    renderMainDashboard(user);
    listenForIncomingCalls(user.uid);
}

function convertImageToBase64(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 400, MAX_HEIGHT = 400;
                let width = img.width, height = img.height;
                if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } }
                else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// ==========================================
// SECTION 5: MAIN DASHBOARD & TABS
// ==========================================
function renderMainDashboard(user) {
    appContainer.innerHTML = `
        <div class="flex flex-col min-h-screen justify-between">
            <div>
                <nav class="bg-white shadow-md px-6 py-4 flex justify-between items-center sticky top-0 z-50">
                    <h1 class="text-xl font-bold text-pink-600">mysugarpartner.love ❤️</h1>
                    <div class="flex space-x-6 text-sm font-medium items-center">
                        <button onclick="switchTab('profile')" class="hover:text-pink-600">My Profile</button>
                        <button onclick="switchTab('edit')" class="hover:text-pink-600">Edit Profile</button>
                        <button onclick="switchTab('finding')" class="hover:text-pink-600">Finding Buddy</button>
                        <button onclick="switchTab('requests')" class="hover:text-pink-600">Requests</button>
                        <button onclick="switchTab('chat')" class="hover:text-pink-600">Chat</button>
                        <button onclick="switchTab('delete')" class="text-red-500 hover:underline">Delete Profile</button>
                        <button onclick="handleLogout()" class="bg-gray-100 px-3 py-1 rounded text-gray-700 hover:bg-gray-200">Logout</button>
                    </div>
                </nav>
                <div id="dashboard-content" class="flex-1 p-6 max-w-6xl mx-auto w-full"></div>
            </div>
            <footer class="text-center text-xs text-gray-500 py-4 border-t bg-white mt-auto">
                Designed & Developed By MR. PRIYANK PANCHAL. All Rights Reserved.
            </footer>
        </div>
    `;
    window.switchTab('profile');
}

window.switchTab = async function(tab) {
    if (tab !== 'chat') {
        currentActiveBuddyId = null;
    }

    if (activeChatUnsubscribe) {
        activeChatUnsubscribe();
        activeChatUnsubscribe = null;
    }

    const container = document.getElementById("dashboard-content");
    const currentUser = auth.currentUser;
    const userDocSnap = await getDoc(doc(db, "users", currentUser.uid));
    const userData = userDocSnap.data();

    if (tab === 'profile') {
        const subStatusText = userData.country === "India" ? "Free Access (India)" : `Paid Subscription ($10/yr) - Expires: ${new Date(userData.subscriptionExpiresAt).toLocaleDateString()}`;
        container.innerHTML = `
            <div class="max-w-md mx-auto bg-white p-6 rounded-xl shadow border text-center">
                <h2 class="text-2xl font-bold text-pink-600 mb-4">My Profile Card</h2>
                <img src="${userData.profilePic || 'https://via.placeholder.com/150'}" class="w-32 h-32 mx-auto rounded-full object-cover mb-4 border-4 border-pink-100">
                <h3 class="font-bold text-xl">${userData.name || 'User'}, ${userData.age || ''}</h3>
                <p class="text-gray-500 text-sm mt-1">Country: <b>${userData.country || ''}</b></p>
                <p class="text-pink-600 font-medium text-sm mt-1">Looking for: ${userData.interest || ''}</p>
                <p class="text-gray-600 text-xs mt-2">Diagnosed Year: ${userData.diagnosedYear || ''}</p>
                <p class="text-gray-600 text-xs mt-1">Hobbies: ${userData.hobbies || ''}</p>
                <div class="mt-4 pt-4 border-t text-xs text-gray-400">
                    Membership: <span class="text-pink-600 font-semibold">${subStatusText}</span>
                </div>
            </div>
        `;
    }
    else if (tab === 'edit') {
        container.innerHTML = `
            <div class="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-xl">
                <h2 class="text-2xl font-bold text-pink-600 mb-6">Edit Profile</h2>
                <div class="space-y-4">
                    <input type="text" id="e-name" value="${userData.name || ''}" class="w-full px-4 py-2 border rounded-lg" placeholder="Full Name">
                    <input type="number" id="e-age" value="${userData.age || ''}" class="w-full px-4 py-2 border rounded-lg" placeholder="Age">
                    
                    <div>
                        <label class="block text-xs font-semibold text-gray-400 mb-1">Country (Locked permanently)</label>
                        <input type="text" value="${userData.country || ''}" disabled class="w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed">
                    </div>

                    <select id="e-interest" class="w-full px-4 py-2 border rounded-lg">
                        <option value="Dating" ${userData.interest === 'Dating' ? 'selected' : ''}>Dating</option>
                        <option value="Short-term relationship" ${userData.interest === 'Short-term relationship' ? 'selected' : ''}>Short-term relationship</option>
                        <option value="Long-term relationship" ${userData.interest === 'Long-term relationship' ? 'selected' : ''}>Long-term relationship</option>
                        <option value="Marriage" ${userData.interest === 'Marriage' ? 'selected' : ''}>Marriage</option>
                    </select>
                    <input type="number" id="e-diagnosed" value="${userData.diagnosedYear || ''}" class="w-full px-4 py-2 border rounded-lg" placeholder="Diagnosed Year">
                    <input type="text" id="e-hobbies" value="${userData.hobbies || ''}" class="w-full px-4 py-2 border rounded-lg" placeholder="Hobbies">
                    <div>
                        <label class="block text-sm text-gray-600 mb-1">Change Profile Picture</label>
                        <input type="file" id="e-img" accept="image/*" class="w-full">
                    </div>
                    <input type="password" id="e-newpass" placeholder="New Password (optional)" class="w-full px-4 py-2 border rounded-lg">
                    <button id="update-profile-btn" class="w-full bg-pink-600 text-white py-3 rounded-lg font-semibold">Save Changes</button>
                </div>
            </div>
        `;

        document.getElementById("update-profile-btn").addEventListener("click", async () => {
            const newPass = document.getElementById("e-newpass").value;
            if (newPass) await updatePassword(currentUser, newPass);

            const fileInput = document.getElementById("e-img");
            let imageUrl = userData.profilePic || "";
            if (fileInput.files[0]) {
                imageUrl = await convertImageToBase64(fileInput.files[0]);
            }

            await updateDoc(doc(db, "users", currentUser.uid), {
                name: document.getElementById("e-name").value,
                age: document.getElementById("e-age").value,
                interest: document.getElementById("e-interest").value,
                diagnosedYear: document.getElementById("e-diagnosed").value,
                hobbies: document.getElementById("e-hobbies").value,
                profilePic: imageUrl
            });
            alert("Profile updated successfully!");
            window.switchTab('profile');
        });
    }
    else if (tab === 'finding') {
        let countryOptions = countries.map(c => `<option value="${c}">${c}</option>`).join('');
        container.innerHTML = `
            <div class="bg-white p-6 rounded-xl shadow-md mb-6 flex gap-4">
                <select id="search-country" class="border p-2 rounded-lg"><option value="">All Countries</option>${countryOptions}</select>
                <select id="search-interest" class="border p-2 rounded-lg">
                    <option value="">All Interests</option>
                    <option value="Dating">Dating</option>
                    <option value="Short-term relationship">Short-term relationship</option>
                    <option value="Long-term relationship">Long-term relationship</option>
                    <option value="Marriage">Marriage</option>
                </select>
                <button id="filter-btn" class="bg-pink-600 text-white px-6 py-2 rounded-lg font-semibold">Search Buddies</button>
            </div>
            <div id="buddies-grid" class="grid grid-cols-1 md:grid-cols-3 gap-6"></div>
        `;
        
        document.getElementById("filter-btn").addEventListener("click", async () => {
            const sCountry = document.getElementById("search-country").value;
            const sInterest = document.getElementById("search-interest").value;
            const snap = await getDocs(collection(db, "users"));
            const grid = document.getElementById("buddies-grid");
            grid.innerHTML = "";
            
            snap.forEach(docSnap => {
                const data = docSnap.data();
                if (data.uid === currentUser.uid) return;
                if (data.blockedUsers && data.blockedUsers.includes(currentUser.uid)) return;
                if (sCountry && data.country !== sCountry) return;
                if (sInterest && data.interest !== sInterest) return;

                grid.innerHTML += `
                    <div class="bg-white p-4 rounded-xl shadow border text-center">
                        <img src="${data.profilePic || 'https://via.placeholder.com/150'}" class="w-24 h-24 mx-auto rounded-full object-cover mb-3">
                        <h3 class="font-bold text-lg">${data.name}, ${data.age}</h3>
                        <p class="text-gray-500 text-sm">${data.country}</p>
                        <p class="text-pink-600 font-medium text-xs mt-1">Looking for: ${data.interest}</p>
                        <p class="text-gray-400 text-xs mt-1">Diagnosed: ${data.diagnosedYear} | Hobbies: ${data.hobbies}</p>
                        <button onclick="sendRequest('${data.uid}')" class="mt-4 bg-pink-100 text-pink-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-pink-200">Send Buddy Request</button>
                    </div>
                `;
            });
        });
        document.getElementById("filter-btn").click();
    }
    else if (tab === 'requests') {
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-white p-6 rounded-xl shadow"><h3 class="text-xl font-bold mb-4">Incoming Requests</h3><div id="incoming-list"></div></div>
                <div class="bg-white p-6 rounded-xl shadow"><h3 class="text-xl font-bold mb-4">Outgoing Requests</h3><div id="outgoing-list"></div></div>
            </div>
        `;

        const incQuery = query(collection(db, "requests"), where("receiverId", "==", currentUser.uid), where("status", "==", "pending"));
        const incSnap = await getDocs(incQuery);
        const incList = document.getElementById("incoming-list");
        incSnap.forEach(async (reqDoc) => {
            const req = reqDoc.data();
            const senderDoc = await getDoc(doc(db, "users", req.senderId));
            const sender = senderDoc.data();
            if (sender) {
                incList.innerHTML += `
                    <div class="flex items-center justify-between border-b py-3">
                        <div><b>${sender.name}</b> (${sender.country})</div>
                        <div class="space-x-2">
                            <button onclick="respondRequest('${reqDoc.id}', 'accepted')" class="bg-green-500 text-white px-3 py-1 rounded">Accept</button>
                            <button onclick="respondRequest('${reqDoc.id}', 'rejected')" class="bg-red-500 text-white px-3 py-1 rounded">Reject</button>
                        </div>
                    </div>
                `;
            }
        });

        const outQuery = query(collection(db, "requests"), where("senderId", "==", currentUser.uid));
        const outSnap = await getDocs(outQuery);
        const outList = document.getElementById("outgoing-list");
        outSnap.forEach(async (reqDoc) => {
            const req = reqDoc.data();
            const receiverDoc = await getDoc(doc(db, "users", req.receiverId));
            const receiver = receiverDoc.data();
            if (receiver) {
                outList.innerHTML += `
                    <div class="flex items-center justify-between border-b py-3">
                        <div><b>${receiver.name}</b></div>
                        <span class="text-sm font-semibold px-2 py-1 rounded ${req.status === 'accepted' ? 'bg-green-100 text-green-700' : req.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}">${req.status}</span>
                    </div>
                `;
            }
        });
    }
    else if (tab === 'chat') {
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white rounded-xl shadow h-[75vh] overflow-hidden">
                <div class="border-r p-4 overflow-y-auto"><h3 class="font-bold mb-4">Accepted Buddies</h3><div id="chat-buddies-list"></div></div>
                <div class="col-span-2 flex flex-col h-full overflow-hidden p-4" id="chat-window-container">
                    <div class="text-center text-gray-400 my-auto">Select a buddy from the left to start chatting</div>
                </div>
            </div>
        `;

        const buddyListContainer = document.getElementById("chat-buddies-list");
        
        const sentQuery = query(collection(db, "requests"), where("senderId", "==", currentUser.uid), where("status", "==", "accepted"));
        const recvQuery = query(collection(db, "requests"), where("receiverId", "==", currentUser.uid), where("status", "==", "accepted"));
        const [sentSnap, recvSnap] = await Promise.all([getDocs(sentQuery), getDocs(recvQuery)]);
        
        const acceptedRequests = [];
        const seenReqs = new Set();
        [...sentSnap.docs, ...recvSnap.docs].forEach(docSnap => {
            if (!seenReqs.has(docSnap.id)) {
                seenReqs.add(docSnap.id);
                acceptedRequests.push(docSnap.data());
            }
        });

        for (const r of acceptedRequests) {
            const buddyId = r.senderId === currentUser.uid ? r.receiverId : r.senderId;
            const buddyDoc = await getDoc(doc(db, "users", buddyId));
            const bData = buddyDoc.data();
            if (bData) {
                const liveDotHtml = bData.isLive ? `<span class="live-dot ml-2" title="Live Now"></span>` : '';
                
                const msgQuery = query(collection(db, "messages"), where("receiverId", "==", currentUser.uid), where("senderId", "==", buddyId));
                onSnapshot(msgQuery, (snapshot) => {
                    if (currentActiveBuddyId === buddyId) return;

                    let unreadCount = snapshot.docs.filter(d => !d.data().read).length;
                    let badgeHtml = unreadCount > 0 ? `<span class="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-auto">${unreadCount} new</span>` : '';
                    
                    let buddyEl = document.getElementById(`buddy-item-${buddyId}`);
                    if (buddyEl) {
                        let badgeContainer = buddyEl.querySelector('.buddy-badge');
                        if (badgeContainer) badgeContainer.innerHTML = badgeHtml;
                    }
                });

                buddyListContainer.innerHTML += `
                    <div id="buddy-item-${buddyId}" onclick="openChat('${bData.uid}', '${bData.name}')" class="flex items-center p-3 hover:bg-pink-50 rounded-lg cursor-pointer border-b">
                        <img src="${bData.profilePic || 'https://via.placeholder.com/150'}" class="w-10 h-10 rounded-full object-cover mr-3">
                        <div class="flex-1">
                            <h4 class="font-semibold text-sm flex items-center">${bData.name} ${liveDotHtml}</h4>
                            <span class="text-xs text-gray-400">Click to chat</span>
                        </div>
                        <div class="buddy-badge"></div>
                    </div>
                `;
            }
        }
    }
    else if (tab === 'delete') {
        if (confirm("Are you sure you want to completely delete your profile? This action cannot be undone.")) {
            try {
                await deleteUser(currentUser);
                
                try {
                    await deleteDoc(doc(db, "users", currentUser.uid));
                } catch (firestoreErr) {
                    console.warn("Firestore doc deletion skipped or pending rules update:", firestoreErr);
                }

                alert("Profile deleted successfully.");
                window.location.reload();
            } catch (error) {
                if (error.code === 'auth/requires-recent-login') {
                    const password = prompt("For security reasons, please enter your password to confirm profile deletion:");
                    if (password) {
                        try {
                            const credential = EmailAuthProvider.credential(currentUser.email, password);
                            await reauthenticateWithCredential(currentUser, credential);
                            
                            await deleteUser(currentUser);
                            
                            try {
                                await deleteDoc(doc(db, "users", currentUser.uid));
                            } catch (e) {}

                            alert("Profile deleted successfully.");
                            window.location.reload();
                        } catch (reAuthErr) {
                            alert("Re-authentication failed: " + reAuthErr.message);
                        }
                    }
                } else {
                    alert("Error deleting profile: " + error.message);
                }
            }
        }
    }
};

window.sendRequest = async function(receiverId) {
    const senderId = auth.currentUser.uid;
    await setDoc(doc(db, "requests", `${senderId}_${receiverId}`), {
        senderId, receiverId, status: "pending", timestamp: Date.now()
    });
    alert("Buddy request sent successfully!");
};

window.respondRequest = async function(reqId, status) {
    await updateDoc(doc(db, "requests", reqId), { status });
    window.switchTab('requests');
};

// ==========================================
// SECTION 6: REALTIME CHAT SYSTEM
// ==========================================
window.openChat = async function(buddyId, buddyName, autoStartVideo = false) {
    currentActiveBuddyId = buddyId;

    const buddyEl = document.getElementById(`buddy-item-${buddyId}`);
    if (buddyEl) {
        const badgeContainer = buddyEl.querySelector('.buddy-badge');
        if (badgeContainer) badgeContainer.innerHTML = '';
    }

    if (activeChatUnsubscribe) {
        activeChatUnsubscribe();
        activeChatUnsubscribe = null;
    }

    const currentUid = auth.currentUser.uid;
    const chatId = [currentUid, buddyId].sort().join('_');
    const chatMetaRef = doc(db, "chatMeta", chatId);
    const chatMetaSnap = await getDoc(chatMetaRef);
    const chatMetaData = chatMetaSnap.exists() ? chatMetaSnap.data() : {};
    const myClearTime = chatMetaData[`cleared_${currentUid}`] || 0;

    const container = document.getElementById("chat-window-container");
    container.innerHTML = `
        <div class="flex justify-between items-center border-b pb-3 mb-2">
            <h3 class="font-bold text-lg">${buddyName}</h3>
            <div class="space-x-3 flex items-center">
                <button onclick="startInAppVideoCall('${buddyId}')" class="bg-pink-600 text-white px-3 py-1 rounded text-sm font-semibold">📹 Video Call</button>
                <button onclick="clearChatHistory('${buddyId}')" class="text-gray-500 text-sm hover:underline">Clear Chat</button>
                <button onclick="blockBuddy('${buddyId}')" class="text-red-500 text-sm hover:underline">Block</button>
            </div>
        </div>
        <div id="video-container" class="hidden relative bg-black rounded-xl overflow-hidden mb-3 h-64 flex items-center justify-center">
            <video id="remote-video" autoplay playsinline class="w-full h-full object-cover"></video>
            <video id="local-video" autoplay playsinline muted class="absolute bottom-3 right-3 w-28 h-20 object-cover rounded-lg border-2 border-white shadow-lg"></video>
            <button onclick="endInAppVideoCall()" class="absolute top-3 right-3 bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-bold shadow">End Call</button>
        </div>
        <div id="messages-box" class="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col" style="-webkit-overflow-scrolling: touch;"></div>
        <div class="flex gap-2 pt-3 border-t mt-2">
            <input type="file" id="media-input" class="hidden" onchange="sendMediaMessage('${buddyId}')">
            <button onclick="document.getElementById('media-input').click()" class="bg-gray-200 px-3 py-2 rounded">📎</button>
            <input type="text" id="chat-msg-input" placeholder="Type a message..." class="flex-1 border px-3 py-2 rounded-lg">
            <button onclick="sendTextMessage('${buddyId}')" class="bg-pink-600 text-white px-4 py-2 rounded-lg">Send</button>
        </div>
    `;

    document.getElementById("chat-msg-input").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            window.sendTextMessage(buddyId);
        }
    });

    const q = query(collection(db, "messages"), where("chatId", "==", chatId));
    activeChatUnsubscribe = onSnapshot(q, (snapshot) => {
        const msgBox = document.getElementById("messages-box");
        if (!msgBox) return;
        
        const docList = [];
        snapshot.forEach(docSnap => docList.push(docSnap));
        docList.sort((a, b) => (a.data().timestamp || 0) - (b.data().timestamp || 0));

        msgBox.innerHTML = "";
        docList.forEach(docSnap => {
            const m = docSnap.data();
            
            if (m.timestamp > myClearTime) {
                if (m.receiverId === currentUid && !m.read) {
                    updateDoc(doc(db, "messages", docSnap.id), { read: true });
                }

                let contentHtml = m.type === 'text' ? `<p>${m.content}</p>` : `<a href="${m.content}" download="${m.fileName || 'file'}" class="text-blue-500 underline text-sm">📥 Download ${m.fileName || 'Attachment'}</a>`;
                if (m.type === 'image') contentHtml = `<img src="${m.content}" class="max-w-xs rounded-lg mb-1"><a href="${m.content}" download="image.jpg" class="text-xs text-blue-500 underline">Save Image</a>`;

                const isMe = m.senderId === currentUid;
                const bubbleStyle = isMe ? 'bg-pink-100 text-gray-800' : 'bg-gray-100 text-gray-800';

                msgBox.innerHTML += `
                    <div class="flex ${isMe ? 'justify-end' : 'justify-start'} w-full">
                        <div class="${bubbleStyle} p-3 rounded-xl max-w-xs">
                            ${contentHtml}
                        </div>
                    </div>
                `;
            }
        });
        msgBox.scrollTop = msgBox.scrollHeight;
    });

    if (autoStartVideo && activeCallId) {
        window.answerInAppVideoCall(activeCallId, buddyId);
    }
};

window.sendTextMessage = async function(buddyId) {
    const input = document.getElementById("chat-msg-input");
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    const currentUid = auth.currentUser.uid;
    const chatId = [currentUid, buddyId].sort().join('_');

    input.value = "";

    try {
        await addDoc(collection(db, "messages"), {
            senderId: currentUid,
            receiverId: buddyId,
            chatId: chatId,
            type: "text",
            content: text,
            timestamp: Date.now(),
            read: false
        });
    } catch (error) {
        console.error("Error sending message: ", error);
        alert("Failed to send message.");
    }
};

window.sendMediaMessage = async function(buddyId) {
    const fileInput = document.getElementById("media-input");
    const file = fileInput.files[0];
    if (!file) return;
    const base64Data = await convertImageToBase64(file);

    const currentUid = auth.currentUser.uid;
    const chatId = [currentUid, buddyId].sort().join('_');
    const isImage = file.type.includes('image');

    fileInput.value = "";

    try {
        await addDoc(collection(db, "messages"), {
            senderId: currentUid,
            receiverId: buddyId,
            chatId: chatId,
            type: isImage ? 'image' : 'file',
            fileName: file.name,
            content: base64Data,
            timestamp: Date.now(),
            read: false
        });
    } catch (error) {
        console.error("Error sending media: ", error);
        alert("Failed to send attachment.");
    }
};

window.clearChatHistory = async function(buddyId) {
    if (confirm("Are you sure you want to clear your chat history? This will only remove messages from your view.")) {
        const currentUid = auth.currentUser.uid;
        const chatId = [currentUid, buddyId].sort().join('_');
        const chatMetaRef = doc(db, "chatMeta", chatId);
        
        await setDoc(chatMetaRef, {
            [`cleared_${currentUid}`]: Date.now()
        }, { merge: true });

        window.openChat(buddyId, document.querySelector('#chat-window-container h3').innerText);
    }
};

window.blockBuddy = async function(buddyId) {
    if (confirm("Are you sure you want to block this user?")) {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userDoc = await getDoc(userRef);
        let blocked = userDoc.data().blockedUsers || [];
        blocked.push(buddyId);
        await updateDoc(userRef, { blockedUsers: blocked });
        alert("User blocked successfully.");
        window.switchTab('finding');
    }
};

// ==========================================
// SECTION 7: WEBRTC VIDEO CALL ENGINE
// ==========================================
function listenForIncomingCalls(userId) {
    if (globalCallUnsubscribe) globalCallUnsubscribe();

    const q = query(collection(db, "videoCalls"), where("receiverId", "==", userId), where("status", "==", "ringing"));
    globalCallUnsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.forEach(async (docSnap) => {
            const callData = docSnap.data();
            const callerDoc = await getDoc(doc(db, "users", callData.callerId));
            const callerData = callerDoc.data() || { name: "Buddy" };

            const existingModal = document.getElementById("incoming-call-modal");
            if (existingModal) existingModal.remove();

            const modalHtml = `
                <div id="incoming-call-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-pulse">
                    <div class="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center">
                        <h3 class="text-xl font-bold text-pink-600 mb-2">📹 Incoming Video Call</h3>
                        <p class="text-gray-700 mb-6"><b>${callerData.name}</b> is calling you for an in-app video chat.</p>
                        <div class="flex gap-4">
                            <button onclick="acceptInAppCall('${docSnap.id}', '${callData.callerId}')" class="flex-1 bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600">Accept</button>
                            <button onclick="rejectInAppCall('${docSnap.id}')" class="flex-1 bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600">Reject</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        });
    });
}

window.acceptInAppCall = async function(callId, callerId) {
    activeCallId = callId;
    const modal = document.getElementById("incoming-call-modal");
    if (modal) modal.remove();

    window.switchTab('chat');
    setTimeout(() => {
        window.openChat(callerId, "Buddy", true);
    }, 500);
};

window.rejectInAppCall = async function(callId) {
    await updateDoc(doc(db, "videoCalls", callId), { status: "rejected" });
    const modal = document.getElementById("incoming-call-modal");
    if (modal) modal.remove();
};

window.startInAppVideoCall = async function(buddyId) {
    const currentUid = auth.currentUser.uid;
    const callRef = doc(collection(db, "videoCalls"));
    activeCallId = callRef.id;

    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('video-container').classList.remove('hidden');
        document.getElementById('local-video').srcObject = localStream;

        peerConnection = new RTCPeerConnection(rtcConfig);
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        peerConnection.ontrack = (event) => {
            document.getElementById('remote-video').srcObject = event.streams[0];
        };

        const offerCandidates = collection(callRef, "offerCandidates");
        const answerCandidates = collection(callRef, "answerCandidates");

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                addDoc(offerCandidates, event.candidate.toJSON());
            }
        };

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        await setDoc(callRef, {
            callerId: currentUid,
            receiverId: buddyId,
            offer: { type: offer.type, sdp: offer.sdp },
            status: "ringing",
            timestamp: Date.now()
        });

        alert("Calling buddy... Waiting for them to answer.");

        callDocUnsubscribe = onSnapshot(callRef, async (docSnap) => {
            const data = docSnap.data();
            if (!data) return;

            if (data.status === 'accepted' && !peerConnection.currentRemoteDescription && data.answer) {
                const answer = new RTCSessionDescription(data.answer);
                await peerConnection.setRemoteDescription(answer);
            } else if (data.status === 'rejected') {
                alert("Call rejected by your buddy.");
                window.endInAppVideoCall();
            }
        });

        onSnapshot(answerCandidates, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const candidate = new RTCIceCandidate(change.doc.data());
                    peerConnection.addIceCandidate(candidate);
                }
            });
        });

    } catch (err) {
        alert("Camera/Microphone access error or permission denied.");
        console.error(err);
    }
};

window.answerInAppVideoCall = async function(callId, buddyId) {
    activeCallId = callId;
    const callRef = doc(db, "videoCalls", callId);
    const callSnap = await getDoc(callRef);
    if (!callSnap.exists()) return;

    const callData = callSnap.data();

    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('video-container').classList.remove('hidden');
        document.getElementById('local-video').srcObject = localStream;

        peerConnection = new RTCPeerConnection(rtcConfig);
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        peerConnection.ontrack = (event) => {
            document.getElementById('remote-video').srcObject = event.streams[0];
        };

        const offerCandidates = collection(callRef, "offerCandidates");
        const answerCandidates = collection(callRef, "answerCandidates");

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                addDoc(answerCandidates, event.candidate.toJSON());
            }
        };

        const offer = new RTCSessionDescription(callData.offer);
        await peerConnection.setRemoteDescription(offer);

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        await updateDoc(callRef, {
            answer: { type: answer.type, sdp: answer.sdp },
            status: "accepted"
        });

        onSnapshot(offerCandidates, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const candidate = new RTCIceCandidate(change.doc.data());
                    peerConnection.addIceCandidate(candidate);
                }
            });
        });

    } catch (err) {
        alert("Camera/Microphone permission denied.");
        console.error(err);
    }
};

window.endInAppVideoCall = async function() {
    if (activeCallId) {
        try {
            await updateDoc(doc(db, "videoCalls", activeCallId), { status: "ended" });
        } catch (e) {}
    }

    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }

    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    if (callDocUnsubscribe) {
        callDocUnsubscribe();
        callDocUnsubscribe = null;
    }

    activeCallId = null;
    const videoContainer = document.getElementById('video-container');
    if (videoContainer) videoContainer.classList.add('hidden');
};

// ==========================================
// SECTION 8: GLOBAL LOGOUT HANDLER
// ==========================================
window.handleLogout = async function() {
    try {
        window.endInAppVideoCall();
        if (activeChatUnsubscribe) activeChatUnsubscribe();
        if (globalCallUnsubscribe) globalCallUnsubscribe();
        await signOut(auth);
        window.location.reload();
    } catch (error) {
        alert(error.message);
    }
};