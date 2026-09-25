// Initial mock profiles of T1D members worldwide
let profiles = [
    { name: "Sarah Jenkins", age: 28, country: "United States", bio: "Dx in 2010. Loop user, marathon runner, and coffee enthusiast looking for my teammate!" },
    { name: "Liam O'Connor", age: 32, country: "Ireland", bio: "Dexcom G7 + Tandem t:slim. Love hiking and cooking low-carb meals." },
    { name: "Aarav Sharma", age: 26, country: "India", bio: "Software engineer living with T1D. Always down to geek out over CGM data trends." }
];

const profileGrid = document.getElementById("profile-grid");
const signupForm = document.getElementById("signup-form");

// Function to render profiles on the page
function renderProfiles() {
    profileGrid.innerHTML = "";
    profiles.forEach(p => {
        const card = document.createElement("div");
        card.className = "bg-white p-6 rounded-xl shadow-md border border-slate-100 hover:shadow-lg transition";
        card.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <h4 class="text-xl font-bold text-slate-900">${p.name},${p.age}</h4>
                <span class="bg-rose-100 text-rose-700 text-xs px-2.5 py-1 rounded-full font-semibold">${p.country}</span>
            </div>
            <p class="text-slate-600 mb-6">${p.bio}</p>
            <button onclick="alert('Connection request sent to ${p.name}!')" class="w-full bg-rose-50 text-rose-600 font-medium py-2 rounded-lg hover:bg-rose-600 hover:text-white transition">Connect ❤️</button>
        `;
        profileGrid.appendChild(card);
    });
}

// Handle new user signups
signupForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const newProfile = {
        name: document.getElementById("name").value,
        age: document.getElementById("age").value,
        country: document.getElementById("country").value,
        bio: document.getElementById("bio").value
    };

    profiles.unshift(newProfile); // Add to beginning of array
    renderProfiles();
    signupForm.reset();
    alert("Profile published successfully!");
});

// Initial load
renderProfiles();