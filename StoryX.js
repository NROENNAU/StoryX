// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAXFprdg5CbyxCSi7qXmy4BoAdwDdxmHZw",
  authDomain: "stories-c4b2e.firebaseapp.com",
  databaseURL: "https://stories-c4b2e-default-rtdb.firebaseio.com",
  projectId: "stories-c4b2e",
  storageBucket: "stories-c4b2e.appspot.com",
  messagingSenderId: "843705586806",
  appId: "1:843705586806:web:7a287b6ef958aba73afb57",
  measurementId: "G-TGV27NXDRD"
};
firebase.initializeApp(firebaseConfig);

// UI elements
const authContainer = document.getElementById('authContainer');
const registerContainer = document.getElementById('registerContainer');
const contentContainer = document.getElementById('contentContainer');
const loginMessage = document.getElementById('loginMessage');
const registerMessage = document.getElementById('registerMessage');

const userDropdown = document.getElementById('userDropdown');
const usernameDisplay = document.getElementById('usernameDisplay');

// Toggle dropdown display
function toggleDropdown() {
  userDropdown.classList.toggle('hidden');
}

// Show the username if logged in
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    usernameDisplay.innerText = user.email;
  }
});

// Logout function
function logout() {
  firebase.auth().signOut().then(() => {
    usernameDisplay.innerText = "";
    toggleDropdown();
    alert("Erfolgreich abgemeldet.");
  }).catch((error) => {
    alert(`Fehler: ${error.message}`);
  });
}

// Check if user is logged in
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    loadUserGroupAndRandomStory();
    authContainer.classList.add('hidden');
    contentContainer.classList.remove('hidden');
    document.getElementById('usernameDisplay').innerText = user.email;
  } else {
    authContainer.classList.remove('hidden');
    contentContainer.classList.add('hidden');
  }
});

// Toggle between login and registration modes
function toggleAuthMode() {
  const authContainer = document.getElementById('authContainer');
  const registerContainer = document.getElementById('registerContainer');
  
  authContainer.classList.toggle('hidden');
  registerContainer.classList.toggle('hidden');
  
  const title = document.getElementById('authTitle');
  if (authContainer.classList.contains('hidden')) {
    title.innerText = "Registrieren";
  } else {
    title.innerText = "Anmelden";
  }
}

// Login function with feedback
function login() {
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  const loginMessage = document.getElementById('loginMessage');
  
  loginMessage.innerText = "Anmeldung läuft...";
  firebase.auth().signInWithEmailAndPassword(email, password)
    .then(() => {
      loginMessage.innerText = "Anmeldung erfolgreich!";
      // Additional actions on successful login
      // Load user's group and stories
    })
    .catch((error) => {
      loginMessage.innerText = `Fehler: ${error.message}`;
    });
}

// Registration function
function register() {
  const username = document.getElementById('registerUsername').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  const registerMessage = document.getElementById('registerMessage');

  registerMessage.innerText = "Registrierung läuft...";
  firebase.auth().createUserWithEmailAndPassword(email, password)
    .then(() => {
      // Optionally save the username in the database here
      registerMessage.innerText = "Registrierung erfolgreich!";
      // Load user's group and stories
    })
    .catch((error) => {
      registerMessage.innerText = `Fehler: ${error.message}`;
    });
}

// Logout function
function logout() {
  firebase.auth().signOut().then(() => {
    loginMessage.innerText = "Erfolgreich abgemeldet.";
    document.getElementById("usernameDisplay").innerText = "";
  }).catch((error) => {
    loginMessage.innerText = `Fehler: ${error.message}`;
  });
}

// Load user's group and a random story if logged in
function loadUserGroupAndRandomStory() {
  const userId = firebase.auth().currentUser.uid;
  const userGroupRef = firebase.database().ref(`users/${userId}/group`);

  userGroupRef.once('value').then((snapshot) => {
    const groupName = snapshot.val();
    document.getElementById("currentGroupName").innerText = groupName || "Keine Gruppe";
    goToRandomStory();
  }).catch((error) => console.error(error));
}

// Show registration screen
function showRegistration() {
  authContainer.classList.add('hidden');
  registerContainer.classList.remove('hidden');
}

// Show login screen
function showLogin() {
  registerContainer.classList.add('hidden');
  authContainer.classList.remove('hidden');
}