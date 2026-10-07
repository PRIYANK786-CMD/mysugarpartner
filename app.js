// Import Firebase modules from CDN (Modular SDK v10)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
    sendEmailVerification, sendPasswordResetEmail, updatePassword, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, 
    collection, query, where, getDocs, addDoc, orderBy, limit, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your Firebase Console configuration credentials
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

// Comprehensive A-to-Z Country List
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
    "Yemen",
    "Zambia", "Zimbabwe"
];

// Router state handler
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
            }
        }
    } else {
        renderAuthView();
    }
});

function renderAuthView() {
    appContainer.innerHTML = `
        <div class="flex flex-col items-center justify-between flex-1 px-4 py-12 min-h-screen">
            <div class="flex flex-col items-center justify-center flex-1 w-full max-w-md mx-auto">
                <h1 class="text-4xl font-bold text-pink-600 mb-2">mysugarpartner.love ❤️</h1>
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

let activeChatUnsubscribe = null;

window.switchTab = async function(tab) {
    if (activeChatUnsubscribe) {
        activeChatUnsubscribe();
        activeChatUnsubscribe = null;
    }

    const container = document.getElementById("dashboard-content");
    const currentUser = auth.currentUser;
    const userDocSnap = await getDoc(doc(db, "users", currentUser.uid));
    const userData = userDocSnap.data();

    if (tab === 'profile') {
        container.innerHTML = `
            <div class="max-w-md mx-auto bg-white p-6 rounded-xl shadow border text-center">
                <h2 class="text-2xl font-bold text-pink-600 mb-4">My Profile Card</h2>
                <img src="${userData.profilePic || 'https://via.placeholder.com/150'}" class="w-32 h-32 mx-auto rounded-full object-cover mb-4 border-4 border-pink-100">
                <h3 class="font-bold text-xl">${userData.name || 'User'}, ${userData.age || ''}</h3>
                <p class="text-gray-500 text-sm mt-1">Country: ${userData.country || ''}</p>
                <p class="text-pink-600 font-medium text-sm mt-1">Looking for: ${userData.interest || ''}</p>
                <p class="text-gray-600 text-xs mt-2">Diagnosed Year: ${userData.diagnosedYear || ''}</p>
                <p class="text-gray-600 text-xs mt-1">Hobbies: ${userData.hobbies || ''}</p>
            </div>
        `;
    }
    else if (tab === 'edit') {
        let countryOptions = countries.map(c => `<option value="${c}" ${userData.country === c ? 'selected' : ''}>${c}</option>`).join('');
        container.innerHTML = `
            <div class="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-xl">
                <h2 class="text-2xl font-bold text-pink-600 mb-6">Edit Profile</h2>
                <div class="space-y-4">
                    <input type="text" id="e-name" value="${userData.name || ''}" class="w-full px-4 py-2 border rounded-lg" placeholder="Full Name">
                    <input type="number" id="e-age" value="${userData.age || ''}" class="w-full px-4 py-2 border rounded-lg" placeholder="Age">
                    <select id="e-country" class="w-full px-4 py-2 border rounded-lg">${countryOptions}</select>
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

        const reqsSnap = await getDocs(collection(db, "requests"));
        const buddyListContainer = document.getElementById("chat-buddies-list");
        
        reqsSnap.forEach(async (reqDoc) => {
            const r = reqDoc.data();
            if (r.status === 'accepted' && (r.senderId === currentUser.uid || r.receiverId === currentUser.uid)) {
                const buddyId = r.senderId === currentUser.uid ? r.receiverId : r.senderId;
                const buddyDoc = await getDoc(doc(db, "users", buddyId));
                const bData = buddyDoc.data();
                if (bData) {
                    const liveDotHtml = bData.isLive ? `<span class="live-dot ml-2" title="Live Now"></span>` : '';
                    
                    const msgQuery = query(collection(db, "messages"), where("receiverId", "==", currentUser.uid), where("senderId", "==", buddyId));
                    onSnapshot(msgQuery, (snapshot) => {
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
        });
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

window.openChat = async function(buddyId, buddyName) {
    if (activeChatUnsubscribe) {
        activeChatUnsubscribe();
        activeChatUnsubscribe = null;
    }

    const container = document.getElementById("chat-window-container");
    container.innerHTML = `
        <div class="flex justify-between items-center border-b pb-3 mb-2">
            <h3 class="font-bold text-lg">${buddyName}</h3>
            <div class="space-x-3">
                <button onclick="startVideoCall('${buddyId}')" class="bg-pink-600 text-white px-3 py-1 rounded text-sm">📹 Video Call</button>
                <button onclick="blockBuddy('${buddyId}')" class="text-red-500 text-sm hover:underline">Block</button>
            </div>
        </div>
        <div id="messages-box" class="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col" style="-webkit-overflow-scrolling: touch;"></div>
        <div class="flex gap-2 pt-3 border-t mt-2">
            <input type="file" id="media-input" class="hidden" onchange="sendMediaMessage('${buddyId}')">
            <button onclick="document.getElementById('media-input').click()" class="bg-gray-200 px-3 py-2 rounded">📎</button>
            <input type="text" id="chat-msg-input" placeholder="Type a message..." class="flex-1 border px-3 py-2 rounded-lg">
            <button onclick="sendTextMessage('${buddyId}')" class="bg-pink-600 text-white px-4 py-2 rounded-lg">Send</button>
        </div>
    `;

    // Listen for Enter key on the input field
    document.getElementById("chat-msg-input").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            window.sendTextMessage(buddyId);
        }
    });

    const q = query(collection(db, "messages"), orderBy("timestamp", "asc"), limit(50));
    activeChatUnsubscribe = onSnapshot(q, (snapshot) => {
        const msgBox = document.getElementById("messages-box");
        if (!msgBox) return;
        const currentUser = auth.currentUser;
        
        msgBox.innerHTML = "";
        snapshot.forEach(docSnap => {
            const m = docSnap.data();
            if ((m.senderId === currentUser.uid && m.receiverId === buddyId) || (m.senderId === buddyId && m.receiverId === currentUser.uid)) {
                if (m.receiverId === currentUser.uid && !m.read) {
                    updateDoc(doc(db, "messages", docSnap.id), { read: true });
                }

                let contentHtml = m.type === 'text' ? `<p>${m.content}</p>` : `<a href="${m.content}" download="${m.fileName || 'file'}" class="text-blue-500 underline text-sm">📥 Download ${m.fileName || 'Attachment'}</a>`;
                if (m.type === 'image') contentHtml = `<img src="${m.content}" class="max-w-xs rounded-lg mb-1"><a href="${m.content}" download="image.jpg" class="text-xs text-blue-500 underline">Save Image</a>`;

                msgBox.innerHTML += `
                    <div class="flex ${m.senderId === currentUser.uid ? 'justify-end' : 'justify-start'} w-full">
                        <div class="bg-${m.senderId === currentUser.uid ? 'pink-100 text-gray-800' : 'gray-100'} p-3 rounded-xl max-w-xs">
                            ${contentHtml}
                        </div>
                    </div>
                `;
            }
        });
        msgBox.scrollTop = msgBox.scrollHeight;
    });
};

window.sendTextMessage = async function(buddyId) {
    const input = document.getElementById("chat-msg-input");
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    await addDoc(collection(db, "messages"), {
        senderId: auth.currentUser.uid,
        receiverId: buddyId,
        type: "text",
        content: text,
        timestamp: Date.now(),
        read: false
    });
    input.value = "";
    const msgBox = document.getElementById("messages-box");
    if (msgBox) msgBox.scrollTop = msgBox.scrollHeight;
};

window.sendMediaMessage = async function(buddyId) {
    const file = document.getElementById("media-input").files[0];
    if (!file) return;
    const base64Data = await convertImageToBase64(file);

    await addDoc(collection(db, "messages"), {
        senderId: auth.currentUser.uid,
        receiverId: buddyId,
        type: file.type.includes('image') ? 'image' : 'file',
        fileName: file.name,
        content: base64Data,
        timestamp: Date.now(),
        read: false
    });
    const msgBox = document.getElementById("messages-box");
    if (msgBox) msgBox.scrollTop = msgBox.scrollHeight;
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

window.startVideoCall = function(buddyId) {
    const currentUid = auth.currentUser.uid;
    const roomUsers = [currentUid, buddyId].sort().join('-');
    window.open(`https://meet.jit.si/mysugarpartner-${roomUsers}`, '_blank');
};

window.handleLogout = async function() {
    try {
        if (activeChatUnsubscribe) activeChatUnsubscribe();
        await signOut(auth);
        window.location.reload();
    } catch (error) {
        alert(error.message);
    }
};