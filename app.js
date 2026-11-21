// ==========================================
// SECTION 1: FIREBASE INITIALIZATION & IMPORTS
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
    sendEmailVerification, sendPasswordResetEmail, updatePassword, signOut, onAuthStateChanged 
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
let globalMsgUnsubscribe = null;
let peerConnection = null;
let localStream = null;
let activeCallId = null;
let callDocUnsubscribe = null;
let activeChatUnsubscribe = null;
let unreadUnsubscribes = [];
let currentActiveBuddyId = null; // Tracks currently active chat room to prevent conversation breaks
const notifiedMessageIds = new Set();
let chatAppStartedAt = Date.now();

const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

function cleanupUnreadListeners() {
    unreadUnsubscribes.forEach((unsub) => {
        if (typeof unsub === "function") unsub();
    });
    unreadUnsubscribes = [];
}

function escapeHtml(str = "") {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

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
                renderMainDashboard(user);
                listenForIncomingCalls(user.uid);
                listenForIncomingMessages(user.uid);
            }
        }
    } else {
        if (globalCallUnsubscribe) globalCallUnsubscribe();
        if (globalMsgUnsubscribe) globalMsgUnsubscribe();
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
                    <p class="text-gray-600 mb-6">We sent a verification link to <b>${user.email}</b>. Confirm it, then click below.</p>
                    <button onclick="window.location.reload()" class="w-full bg-pink-600 text-white py-3 rounded-lg font-semibold mb-3">I Have Verified, Continue</button>
                    <button onclick="handleLogout()" class="text-gray-500 text-sm hover:underline">Reject / Sign Out</button>
                </div>
            </div>
            <footer class="text-center text-xs text-gray-500 mt-8 py-4 border-t w-full">
                Designed & Developed By MR. PRIYANK PANCHAL. All Rights Reserved.
            </footer>
        </div>
    `;
}

function renderProfileCreationView(user) {
    let countryOptions = countries.map(c => `<option value="${c}">${c}</option>`).join('');
    appContainer.innerHTML = `
        <div class="flex flex-col justify-between min-h-screen">
            <div class="max-w-xl mx-auto bg-white my-10 p-8 rounded-2xl shadow-xl w-full">
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
                    <button id="save-profile-btn" class="w-full bg-pink-600 text-white py-3 rounded-lg font-semibold hover:bg-pink-700">Save Profile</button>
                </div>
            </div>
            <footer class="text-center text-xs text-gray-500 py-4 border-t w-full bg-white">
                Designed & Developed By MR. PRIYANK PANCHAL. All Rights Reserved.
            </footer>
        </div>
    `;

    document.getElementById("save-profile-btn").addEventListener("click", async () => {
        const fileInput = document.getElementById("p-img");
        let imageUrl = "";
        if (fileInput.files[0]) {
            imageUrl = await convertImageToBase64(fileInput.files[0]);
        }

        const profileData = {
            uid: user.uid,
            email: user.email,
            name: document.getElementById("p-name").value,
            age: document.getElementById("p-age").value,
            country: document.getElementById("p-country").value,
            interest: document.getElementById("p-interest").value,
            diagnosedYear: document.getElementById("p-diagnosed").value,
            hobbies: document.getElementById("p-hobbies").value,
            profilePic: imageUrl,
            profileCompleted: true,
            isLive: true,
            blockedUsers: []
        };

        await setDoc(doc(db, "users", user.uid), profileData, { merge: true });
        renderMainDashboard(user);
        listenForIncomingCalls(user.uid);
    });
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
                    <h1 class="text-xl font-bold text-pink-600">mysugarpartner.in ❤️</h1>
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

    cleanupUnreadListeners();

    const container = document.getElementById("dashboard-content");
    const currentUser = auth.currentUser;
    const userDocSnap = await getDoc(doc(db, "users", currentUser.uid));
    const userData = userDocSnap.data() || {};

    if (tab === 'profile') {
        container.innerHTML = `
            <div class="max-w-md mx-auto bg-white p-6 rounded-xl shadow border text-center">
                <h2 class="text-2xl font-bold text-pink-600 mb-4">My Profile Card</h2>
                <img src="${userData.profilePic || 'https://via.placeholder.com/150'}" class="w-32 h-32 mx-auto rounded-full object-cover mb-4 border-4 border-pink-100">
                <h3 class="font-bold text-xl">${escapeHtml(userData.name || 'User')}, ${escapeHtml(userData.age || '')}</h3>
                <p class="text-gray-500 text-sm mt-1">Country: ${escapeHtml(userData.country || '')}</p>
                <p class="text-pink-600 font-medium text-sm mt-1">Looking for: ${escapeHtml(userData.interest || '')}</p>
                <p class="text-gray-600 text-xs mt-2">Diagnosed Year: ${escapeHtml(userData.diagnosedYear || '')}</p>
                <p class="text-gray-600 text-xs mt-1">Hobbies: ${escapeHtml(userData.hobbies || '')}</p>
            </div>
        `;
    }
    else if (tab === 'edit') {
        let countryOptions = countries.map(c => `<option value="${escapeHtml(c)}" ${userData.country === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('');
        container.innerHTML = `
            <div class="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-xl">
                <h2 class="text-2xl font-bold text-pink-600 mb-6">Edit Profile</h2>
                <div class="space-y-4">
                    <input type="text" id="e-name" value="${escapeHtml(userData.name || '')}" class="w-full px-4 py-2 border rounded-lg" placeholder="Full Name">
                    <input type="number" id="e-age" value="${escapeHtml(userData.age || '')}" class="w-full px-4 py-2 border rounded-lg" placeholder="Age">
                    <select id="e-country" class="w-full px-4 py-2 border rounded-lg">${countryOptions}</select>
                    <select id="e-interest" class="w-full px-4 py-2 border rounded-lg">
                        <option value="Dating" ${userData.interest === 'Dating' ? 'selected' : ''}>Dating</option>
                        <option value="Short-term relationship" ${userData.interest === 'Short-term relationship' ? 'selected' : ''}>Short-term relationship</option>
                        <option value="Long-term relationship" ${userData.interest === 'Long-term relationship' ? 'selected' : ''}>Long-term relationship</option>
                        <option value="Marriage" ${userData.interest === 'Marriage' ? 'selected' : ''}>Marriage</option>
                    </select>
                    <input type="number" id="e-diagnosed" value="${escapeHtml(userData.diagnosedYear || '')}" class="w-full px-4 py-2 border rounded-lg" placeholder="Diagnosed Year">
                    <input type="text" id="e-hobbies" value="${escapeHtml(userData.hobbies || '')}" class="w-full px-4 py-2 border rounded-lg" placeholder="Hobbies">
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
                country: document.getElementById("e-country").value,
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
        let countryOptions = countries.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
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
                        <h3 class="font-bold text-lg">${escapeHtml(data.name || 'Buddy')}, ${escapeHtml(data.age || '')}</h3>
                        <p class="text-gray-500 text-sm">${escapeHtml(data.country || '')}</p>
                        <p class="text-pink-600 font-medium text-xs mt-1">Looking for: ${escapeHtml(data.interest || '')}</p>
                        <p class="text-gray-400 text-xs mt-1">Diagnosed: ${escapeHtml(data.diagnosedYear || '')} | Hobbies: ${escapeHtml(data.hobbies || '')}</p>
                        <button onclick="sendRequest('${escapeHtml(data.uid)}')" class="mt-4 bg-pink-100 text-pink-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-pink-200">Send Buddy Request</button>
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
                        <div><b>${escapeHtml(sender.name || 'Buddy')}</b> (${escapeHtml(sender.country || '')})</div>
                        <div class="space-x-2">
                            <button onclick="respondRequest('${escapeHtml(reqDoc.id)}', 'accepted')" class="bg-green-500 text-white px-3 py-1 rounded">Accept</button>
                            <button onclick="respondRequest('${escapeHtml(reqDoc.id)}', 'rejected')" class="bg-red-500 text-white px-3 py-1 rounded">Reject</button>
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
                        <div><b>${escapeHtml(receiver.name || 'Buddy')}</b></div>
                        <span class="text-sm font-semibold px-2 py-1 rounded ${req.status === 'accepted' ? 'bg-green-100 text-green-700' : req.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}">${escapeHtml(req.status)}</span>
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
                const buddyNameSafe = escapeHtml(bData.name || "Buddy");
                const liveDotHtml = bData.isLive ? `<span class="live-dot ml-2" title="Live Now"></span>` : '';

                const itemEl = document.createElement("div");
                itemEl.id = `buddy-item-${buddyId}`;
                itemEl.className = "flex items-center p-3 hover:bg-pink-50 rounded-lg cursor-pointer border-b";
                itemEl.innerHTML = `
                    <img src="${bData.profilePic || 'https://via.placeholder.com/150'}" class="w-10 h-10 rounded-full object-cover mr-3">
                    <div class="flex-1">
                        <h4 class="font-semibold text-sm flex items-center">${buddyNameSafe} ${liveDotHtml}</h4>
                        <span class="text-xs text-gray-400">Click to chat</span>
                    </div>
                    <div class="buddy-badge"></div>
                `;
                itemEl.addEventListener("click", () => {
                    window.openChat(bData.uid, bData.name || "Buddy");
                });
                buddyListContainer.appendChild(itemEl);

                const msgQuery = query(collection(db, "messages"), where("receiverId", "==", currentUser.uid), where("senderId", "==", buddyId));
                const unsub = onSnapshot(msgQuery, (snapshot) => {
                    if (currentActiveBuddyId === buddyId) return;

                    const unreadCount = snapshot.docs.filter(d => !d.data().read).length;
                    const badgeHtml = unreadCount > 0
                        ? `<span class="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-auto">${unreadCount} new</span>`
                        : '';

                    const buddyEl = document.getElementById(`buddy-item-${buddyId}`);
                    if (buddyEl) {
                        const badgeContainer = buddyEl.querySelector('.buddy-badge');
                        if (badgeContainer) badgeContainer.innerHTML = badgeHtml;
                    }
                });
                unreadUnsubscribes.push(unsub);
            }
        }
    }
    else if (tab === 'delete') {
        if (confirm("Are you sure you want to completely delete your profile?")) {
            await deleteDoc(doc(db, "users", currentUser.uid));
            await currentUser.delete();
            alert("Profile deleted successfully.");
            window.location.reload();
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
const renderedMessageIds = new Set();

function showNewMessageAlert(senderName, text, senderId) {
    const existing = document.getElementById("new-msg-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "new-msg-toast";
    toast.className = "fixed bottom-5 right-5 bg-white border-l-4 border-pink-600 shadow-2xl rounded-xl p-4 max-w-sm z-50 cursor-pointer";
    toast.innerHTML = `
        <p class="text-xs font-bold text-pink-600">New message from ${escapeHtml(senderName)}</p>
        <p class="text-sm text-gray-800 mt-1 break-words">${escapeHtml(text)}</p>
    `;
    toast.addEventListener("click", async () => {
        toast.remove();
        await window.switchTab("chat");
        setTimeout(() => window.openChat(senderId, senderName), 250);
    });
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);

    if ("Notification" in window && Notification.permission === "granted") {
        const n = new Notification(`New message from ${senderName}`, { body: text });
        n.onclick = async () => {
            window.focus();
            await window.switchTab("chat");
            setTimeout(() => window.openChat(senderId, senderName), 250);
        };
    }
}

function listenForIncomingMessages(userId) {
    if (globalMsgUnsubscribe) {
        globalMsgUnsubscribe();
        globalMsgUnsubscribe = null;
    }
    chatAppStartedAt = Date.now();

    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
    }

    const q = query(collection(db, "messages"), where("receiverId", "==", userId));
    globalMsgUnsubscribe = onSnapshot(q, async (snapshot) => {
        for (const change of snapshot.docChanges()) {
            if (change.type !== "added") continue;
            const msgId = change.doc.id;
            const m = change.doc.data();

            if (notifiedMessageIds.has(msgId)) continue;
            notifiedMessageIds.add(msgId);

            if ((m.timestamp || 0) < chatAppStartedAt - 2000) continue;
            if (m.read || currentActiveBuddyId === m.senderId) continue;

            const senderSnap = await getDoc(doc(db, "users", m.senderId));
            const senderName = (senderSnap.exists() && senderSnap.data().name) || "Buddy";
            const preview = m.type === "text" ? (m.content || "") : `Sent a ${m.type || "file"}`;
            showNewMessageAlert(senderName, preview, m.senderId);
        }
    }, (error) => {
        console.error("Incoming message listener error:", error);
    });
}

function appendMessageToBox(msgBox, msgId, m, currentUid) {
    if (!msgBox || !msgId) return;
    if (msgBox.querySelector(`[data-msg-id="${CSS.escape(msgId)}"]`)) return;

    const safeContent = escapeHtml(m.content || "");
    const safeFileName = escapeHtml(m.fileName || "file");
    let contentHtml = `<p class="break-words">${safeContent}</p>`;

    if (m.type === "image") {
        contentHtml = `<img src="${m.content}" alt="${safeFileName}" class="max-w-xs rounded-lg mb-1"><a href="${m.content}" download="${safeFileName}" class="text-xs text-blue-500 underline">Save Image</a>`;
    } else if (m.type === "file") {
        contentHtml = `<a href="${m.content}" download="${safeFileName}" class="text-blue-500 underline text-sm">📥 Download ${safeFileName}</a>`;
    }

    const isMe = m.senderId === currentUid;
    const bubbleStyle = isMe ? "bg-pink-100 text-gray-800" : "bg-gray-100 text-gray-800";

    const row = document.createElement("div");
    row.className = `flex ${isMe ? "justify-end" : "justify-start"} w-full`;
    row.setAttribute("data-msg-id", msgId);
    row.dataset.timestamp = String(m.timestamp || 0);
    row.innerHTML = `<div class="${bubbleStyle} p-3 rounded-xl max-w-xs">${contentHtml}</div>`;

    msgBox.appendChild(row);
    msgBox.scrollTop = msgBox.scrollHeight;
}

window.openChat = async function(buddyId, buddyName, autoStartVideo = false) {
    currentActiveBuddyId = buddyId;

    const buddyEl = document.getElementById(`buddy-item-${buddyId}`);
    if (buddyEl) {
        const badgeContainer = buddyEl.querySelector(".buddy-badge");
        if (badgeContainer) badgeContainer.innerHTML = "";
    }

    if (activeChatUnsubscribe) {
        activeChatUnsubscribe();
        activeChatUnsubscribe = null;
    }

    const currentUid = auth.currentUser ? auth.currentUser.uid : null;
    if (!currentUid) return;

    const chatId = [currentUid, buddyId].sort().join("_");
    const safeBuddyName = escapeHtml(buddyName || "Buddy");
    const container = document.getElementById("chat-window-container");

    container.innerHTML = `
        <div class="flex justify-between items-center border-b pb-3 mb-2">
            <h3 id="chat-buddy-title" class="font-bold text-lg">${safeBuddyName}</h3>
            <div class="space-x-3 flex items-center">
                <button onclick="startInAppVideoCall('${escapeHtml(buddyId)}')" class="bg-pink-600 text-white px-3 py-1 rounded text-sm font-semibold">📹 Video Call</button>
                <button onclick="clearChatHistory('${escapeHtml(buddyId)}')" class="text-gray-500 text-sm hover:underline">Clear Chat</button>
                <button onclick="blockBuddy('${escapeHtml(buddyId)}')" class="text-red-500 text-sm hover:underline">Block</button>
            </div>
        </div>
        <div id="video-container" class="hidden relative bg-black rounded-xl overflow-hidden mb-3 h-64 flex items-center justify-center">
            <video id="remote-video" autoplay playsinline class="w-full h-full object-cover"></video>
            <video id="local-video" autoplay playsinline muted class="absolute bottom-3 right-3 w-28 h-20 object-cover rounded-lg border-2 border-white shadow-lg"></video>
            <button onclick="endInAppVideoCall()" class="absolute top-3 right-3 bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-bold shadow">End Call</button>
        </div>
        <div id="messages-box" class="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col" style="-webkit-overflow-scrolling: touch;"></div>
        <div class="flex gap-2 pt-3 border-t mt-2">
            <input type="file" id="media-input" class="hidden" onchange="sendMediaMessage('${escapeHtml(buddyId)}')">
            <button onclick="document.getElementById('media-input').click()" class="bg-gray-200 px-3 py-2 rounded">📎</button>
            <input type="text" id="chat-msg-input" placeholder="Type a message..." class="flex-1 border px-3 py-2 rounded-lg">
            <button onclick="sendTextMessage('${escapeHtml(buddyId)}')" class="bg-pink-600 text-white px-4 py-2 rounded-lg">Send</button>
        </div>
    `;

    document.getElementById("chat-msg-input").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            window.sendTextMessage(buddyId);
        }
    });

    let myClearTime = 0;
    try {
        const chatMetaSnap = await getDoc(doc(db, "chatMeta", chatId));
        if (chatMetaSnap.exists()) {
            myClearTime = chatMetaSnap.data()[`cleared_${currentUid}`] || 0;
        }
    } catch (err) {
        console.error("chatMeta read error:", err);
    }

    const q = query(collection(db, "messages"), where("chatId", "==", chatId));
    activeChatUnsubscribe = onSnapshot(q, (snapshot) => {
        const msgBox = document.getElementById("messages-box");
        if (!msgBox) return;

        // Collect all visible messages, sort chronologically, and append any new ones
        const visibleDocs = [];
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if ((data.timestamp || 0) > myClearTime) {
                if (data.receiverId === currentUid && !data.read) {
                    updateDoc(doc(db, "messages", docSnap.id), { read: true }).catch(() => {});
                }
                visibleDocs.push({ id: docSnap.id, data });
            }
        });

        visibleDocs.sort((a, b) => (a.data.timestamp || 0) - (b.data.timestamp || 0));

        // Remove any cleared temp/local rows if clear happened
        msgBox.innerHTML = "";
        visibleDocs.forEach(({ id, data }) => {
            appendMessageToBox(msgBox, id, data, currentUid);
        });
    }, (error) => {
        console.error("Chat room listener error:", error);
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

    const currentUid = auth.currentUser ? auth.currentUser.uid : null;
    if (!currentUid) {
        alert("Session expired. Please log in again.");
        return;
    }

    const chatId = [currentUid, buddyId].sort().join("_");
    const msgPayload = {
        senderId: currentUid,
        receiverId: buddyId,
        chatId,
        type: "text",
        content: text,
        timestamp: Date.now(),
        read: false
    };

    input.value = "";

    try {
        const docRef = await addDoc(collection(db, "messages"), msgPayload);
        const msgBox = document.getElementById("messages-box");
        if (msgBox && currentActiveBuddyId === buddyId) {
            appendMessageToBox(msgBox, docRef.id, msgPayload, currentUid);
        }
    } catch (error) {
        console.error("Error sending message:", error);
        alert("Failed to send message: " + error.message);
    }
};

window.sendMediaMessage = async function(buddyId) {
    const fileInput = document.getElementById("media-input");
    const file = fileInput.files[0];
    if (!file) return;

    if (file.size > 700 * 1024) {
        alert("Please choose a file smaller than 700 KB.");
        fileInput.value = "";
        return;
    }

    const isImage = file.type.startsWith("image/");
    const fileData = isImage
        ? await convertImageToBase64(file)
        : await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

    const currentUid = auth.currentUser.uid;
    const chatId = [currentUid, buddyId].sort().join("_");
    fileInput.value = "";

    const msgPayload = {
        senderId: currentUid,
        receiverId: buddyId,
        chatId,
        type: isImage ? "image" : "file",
        fileName: file.name,
        content: fileData,
        timestamp: Date.now(),
        read: false
    };

    try {
        const docRef = await addDoc(collection(db, "messages"), msgPayload);
        const msgBox = document.getElementById("messages-box");
        if (msgBox && currentActiveBuddyId === buddyId) {
            appendMessageToBox(msgBox, docRef.id, msgPayload, currentUid);
        }
    } catch (error) {
        console.error("Error sending media:", error);
        alert("Failed to send attachment.");
    }
};

window.clearChatHistory = async function(buddyId) {
    if (confirm("Are you sure you want to clear your chat history? This will only remove messages from your view.")) {
        const currentUid = auth.currentUser.uid;
        const chatId = [currentUid, buddyId].sort().join("_");
        const chatMetaRef = doc(db, "chatMeta", chatId);

        await setDoc(chatMetaRef, {
            [`cleared_${currentUid}`]: Date.now()
        }, { merge: true });

        const titleEl = document.getElementById("chat-buddy-title");
        const buddyName = titleEl ? titleEl.textContent : "Buddy";
        window.openChat(buddyId, buddyName);
    }
};

window.blockBuddy = async function(buddyId) {
    if (confirm("Are you sure you want to block this user?")) {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userDoc = await getDoc(userRef);
        let blocked = (userDoc.data() && userDoc.data().blockedUsers) || [];
        if (!blocked.includes(buddyId)) {
            blocked.push(buddyId);
        }
        await updateDoc(userRef, { blockedUsers: blocked });
        alert("User blocked successfully.");
        window.switchTab("finding");
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
        if (globalMsgUnsubscribe) globalMsgUnsubscribe();
        cleanupUnreadListeners();
        await signOut(auth);
        window.location.reload();
    } catch (error) {
        alert(error.message);
    }
};