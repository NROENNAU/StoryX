// Firebase-Konfiguration
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

// UI-Elemente
const authContainer = document.getElementById('authContainer');
const contentContainer = document.getElementById('contentContainer');
const usernameDisplay = document.getElementById('usernameDisplay');
const storyListContainer = document.getElementById('storyListContainer');
const addStoryContainer = document.getElementById('addStoryContainer');
const randomStoryContainer = document.getElementById('randomStoryContainer');
const storyInput = document.getElementById('storyInput');

// Zeige den Benutzernamen, wenn der Benutzer angemeldet ist
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        usernameDisplay.innerText = user.email; // oder user.displayName, wenn du es beim Registrieren festlegst
        loadUserGroupAndStories();
        authContainer.classList.add('hidden');
        contentContainer.classList.remove('hidden');
    } else {
        // Umleitung zur Login-Seite, wenn kein Benutzer angemeldet ist
        window.location.href = 'login.html';
    }
});

// Logout-Funktion
function logout() {
    firebase.auth().signOut().then(() => {
        // Erfolgreich abgemeldet
        usernameDisplay.innerText = ''; // Benutzernamen zurücksetzen
        authContainer.classList.remove('hidden');
        contentContainer.classList.add('hidden');
        console.log("Benutzer erfolgreich abgemeldet");
    }).catch((error) => {
        console.error("Fehler beim Abmelden: ", error);
    });
}

// Toggle-Dropdown für Benutzersymbole
function toggleDropdown() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('hidden');
}



// Load user's group name and stories
function loadUserGroupAndStories() {
    const userId = firebase.auth().currentUser.uid;
    const userGroupRef = firebase.database().ref(`users/${userId}/currentGroup`);

    userGroupRef.once('value').then((snapshot) => {
        const groupId = snapshot.val();
        if (groupId) {
            const groupRef = firebase.database().ref(`groups/${groupId}`);
            groupRef.once('value').then((groupSnapshot) => {
                const groupName = groupSnapshot.val()?.name || "Keine Gruppe"; // Optional chaining verwenden
                document.getElementById("currentGroupName").innerText = groupName;
                goToRandomStory(); // Zufällige Geschichte anzeigen
            }).catch((error) => console.error("Fehler beim Abrufen der Gruppendaten: ", error));
        } else {
            document.getElementById("currentGroupName").innerText = "Keine Gruppe";
        }
    }).catch((error) => console.error("Fehler beim Abrufen der Gruppeninformationen: ", error));
}

// Funktion zum Ausblenden aller Container
function hideAllContainers() {
    storyListContainer.classList.add('hidden');
    addStoryContainer.classList.add('hidden');
    randomStoryContainer.classList.add('hidden');
}

// Funktion zur Anzeige aller Stories
function showAllStories() {
    hideAllContainers();
    storyListContainer.classList.remove('hidden');

    const userId = firebase.auth().currentUser.uid;
    const userGroupRef = firebase.database().ref(`users/${userId}/currentGroup`);

    userGroupRef.once('value').then((snapshot) => {
        const groupId = snapshot.val();
        if (groupId) {
            const storiesRef = firebase.database().ref(`groups/${groupId}/stories`);
            storiesRef.once('value').then((snapshot) => {
                storyListContainer.innerHTML = '';
                snapshot.forEach((childSnapshot) => {
                    const story = childSnapshot.val();
                    const storyItem = document.createElement('div');
                    storyItem.classList.add('story-item');
                    storyItem.innerHTML = `<div class="story-content">${story.text || "Inhalt nicht verfügbar"}</div>`;

                    if (story.creatorId === userId) {
    // Löschen-Button hinzufügen, wenn Benutzer der Ersteller ist
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Löschen';
    deleteButton.classList.add('delete-button'); // CSS-Klasse hinzufügen
    deleteButton.addEventListener('click', () => {
        const confirmation = confirm('Möchten Sie diese Story wirklich löschen?'); // Bestätigungsdialog
        if (confirmation) {
            deleteStory(groupId, childSnapshot.key); // Story löschen, wenn bestätigt
        }
    });
    storyItem.appendChild(deleteButton);
}

                    storyListContainer.appendChild(storyItem);
                });
            }).catch((error) => console.error("Fehler beim Abrufen der Stories: ", error));
        } else {
            storyListContainer.innerHTML = "Keine Gruppe zugeordnet.";
        }
    }).catch((error) => console.error("Fehler beim Abrufen der Gruppeninformationen: ", error));
}

// Story löschen
function deleteStory(groupId, storyId) {
    const storyRef = firebase.database().ref(`groups/${groupId}/stories/${storyId}`);
    storyRef.remove()
        .then(() => {
            console.log("Story erfolgreich gelöscht");
            showAllStories(); // Liste aktualisieren
        })
        .catch((error) => console.error("Fehler beim Löschen der Story: ", error));
}


// Funktion zum Anzeigen des Story-Hinzufügen-Containers
function goToAddStory() {
    hideAllContainers();
    addStoryContainer.classList.remove('hidden');
}

// Funktion zum Hinzufügen einer neuen Story
function addStory() {
    const userId = firebase.auth().currentUser.uid;
    const userGroupRef = firebase.database().ref(`users/${userId}/currentGroup`);
    const storyText = storyInput.value.trim();
    const isHidden = document.getElementById('hiddenStoryCheckbox')?.checked || false; // Prüfen, ob die Checkbox ausgewählt ist

    if (storyText.length === 0) {
        alert("Story darf nicht leer sein.");
        return;
    } else if (storyText.length > 50) {
        alert("Die Story darf maximal 50 Zeichen lang sein.");
        return;
    }

    userGroupRef.once('value').then((snapshot) => {
        const groupId = snapshot.val();
        if (groupId) {
            const storiesRef = firebase.database().ref(`groups/${groupId}/stories`);
            storiesRef.once('value').then((snapshot) => {
                const similarStories = [];
                snapshot.forEach((childSnapshot) => {
                    const story = childSnapshot.val();
                    // Hier wird eine einfache Ähnlichkeitsprüfung durchgeführt
                    if (hasCommonKeyword(story.text, storyText)) {
                        similarStories.push(story);
                    }
                });

                // Wenn ähnliche Stories gefunden wurden, zeige ein Pop-up an
                if (similarStories.length > 0) {
                    showSimilarStoriesPopup(similarStories, storyText, groupId, userId, isHidden);
                } else {
                    // Wenn keine ähnlichen Stories vorhanden sind, speichere die neue Story direkt
                    saveNewStory(groupId, userId, storyText, isHidden);
                }
            }).catch((error) => console.error("Fehler beim Abrufen der Stories: ", error));
        }
    }).catch((error) => console.error("Fehler beim Abrufen der Gruppeninformationen: ", error));
}

// Funktion zur Überprüfung der Ähnlichkeit basierend auf Schlüsselwörtern
function hasCommonKeyword(text1, text2) {
    const words1 = text1.toLowerCase().split(/\W+/);
    const words2 = text2.toLowerCase().split(/\W+/);
    const wordSet1 = new Set(words1);

    for (const word of words2) {
        if (wordSet1.has(word) && word.length > 0) {
            return true;
        }
    }
    return false;
}

// Funktion zum Speichern der neuen Story, einschließlich des Hidden-Flags
function saveNewStory(groupId, userId, storyText, isHidden) {
    const storiesRef = firebase.database().ref(`groups/${groupId}/stories`);
    const newStory = { 
        text: storyText, 
        creatorId: userId, 
        hidden: isHidden // Hier wird das Hidden-Flag gespeichert
    };
    storiesRef.push(newStory).then(() => {
        storyInput.value = '';
        showAllStories();
    }).catch((error) => console.error("Fehler beim Hinzufügen der Story: ", error));
}

// Funktion zum Anzeigen des Pop-ups mit ähnlichen Stories
function showSimilarStoriesPopup(similarStories, storyText, groupId, userId, isHidden) {
    const popupContainer = document.createElement('div');
    popupContainer.classList.add('popup-container');

    const popupContent = document.createElement('div');
    popupContent.classList.add('popup-content');

    const title = document.createElement('h2');
    title.innerText = "Ähnliche Stories gefunden:";
    popupContent.appendChild(title);

    similarStories.forEach(story => {
        const storyItem = document.createElement('div');
        storyItem.innerText = story.text;
        popupContent.appendChild(storyItem);
    });

    const saveButton = document.createElement('button');
    saveButton.innerText = "Story speichern";
    saveButton.onclick = () => {
        saveNewStory(groupId, userId, storyText, isHidden); // Speichern mit Hidden-Flag
        document.body.removeChild(popupContainer); // Schließt das Pop-up
    };
    popupContent.appendChild(saveButton);

    const cancelButton = document.createElement('button');
    cancelButton.innerText = "Abbrechen";
    cancelButton.onclick = () => {
        document.body.removeChild(popupContainer); // Schließt das Pop-up
    };
    popupContent.appendChild(cancelButton);

    popupContainer.appendChild(popupContent);
    document.body.appendChild(popupContainer);
}
// Event-Listener für den Schließen-Button
document.getElementById('closeStoryButton').addEventListener('click', function() {
    const storyOverlay = document.getElementById('storyOverlay');
    storyOverlay.classList.add('hidden'); // Overlay ausblenden
});



// Funktion zum Hinzufügen einer Version und Speichern der aktuellen zufälligen Story-ID
function goToAddVersion() {
    const userId = firebase.auth().currentUser.uid;
    const userRandomStoryRef = firebase.database().ref(`users/${userId}/currentRandomStoryId`);

    userRandomStoryRef.once('value').then((snapshot) => {
        const storyId = snapshot.val();
        if (storyId) {
            // Speichern der Story-ID im Benutzerbereich
            const userVersionStoryRef = firebase.database().ref(`users/${userId}/versionStoryId`);
            userVersionStoryRef.set(storyId).then(() => {
                console.log("Story-ID erfolgreich für die Version gespeichert.");
                // Weiterleitung zur Seite zum Hinzufügen einer Version
                window.location.href = 'AddVersion.html';
            }).catch((error) => console.error("Fehler beim Speichern der Story-ID für die Version: ", error));
        } else {
            console.error("Keine zufällige Story-ID gefunden.");
            alert("Es wurde keine zufällige Story gefunden. Bitte zuerst eine zufällige Story anzeigen.");
        }
    }).catch((error) => console.error("Fehler beim Abrufen der zufälligen Story-ID: ", error));
}

let currentRandomStoryId = null; // Variable für die aktuelle zufällige Story-ID

function goToRandomStory() {
    hideAllContainers();
    randomStoryContainer.classList.remove('hidden');

    const userId = firebase.auth().currentUser.uid;
    const userGroupRef = firebase.database().ref(`users/${userId}/currentGroup`);

    userGroupRef.once('value').then((snapshot) => {
        const groupId = snapshot.val();
        if (groupId) {
            const storiesRef = firebase.database().ref(`groups/${groupId}/stories`);
            storiesRef.once('value').then((snapshot) => {
                const stories = [];
                snapshot.forEach((childSnapshot) => {
                    const story = childSnapshot.val();
                    stories.push({ id: childSnapshot.key, text: story.text }); // Die ID der Story speichern
                });

                if (stories.length > 0) {
                    let randomStory;

                    do {
                        const randomIndex = Math.floor(Math.random() * stories.length);
                        randomStory = stories[randomIndex];
                    } while (randomStory.id === currentRandomStoryId); // Überprüfen, ob die zufällige Story gleich der aktuellen ist

                    currentRandomStoryId = randomStory.id; // Aktuelle Story-ID speichern

                    // Story-Text setzen
                    document.getElementById('storyText').textContent = randomStory.text;

                    // Speichern der ID der aktuellen zufälligen Story in Firebase für den Benutzer
                    const userRandomStoryRef = firebase.database().ref(`users/${userId}/currentRandomStoryId`);
                    userRandomStoryRef.set(randomStory.id).then(() => {
                        // Lade die Versionen der Story
                        loadVersions(randomStory.id); // Stelle sicher, dass dies hier aufgerufen wird
                    });
                } else {
                    document.getElementById('storyText').textContent = "Keine Stories verfügbar.";
                }
            }).catch((error) => console.error("Fehler beim Abrufen der Stories: ", error));
        }
    }).catch((error) => console.error("Fehler beim Abrufen der Gruppeninformationen: ", error));
}

// Funktion zum Abrufen des Benutzernamens anhand der Benutzer-ID
async function getUsername(userId) {
    const userRef = firebase.database().ref(`users/${userId}`);
    const snapshot = await userRef.once('value');
    return snapshot.val().username || 'Unbekannt'; // Standardwert, falls kein Benutzername gefunden wird
}

// Funktion zum Abbrechen und Schließen des Formulars
function cancel() {
    addStoryContainer.classList.add('hidden');
    storyInput.value = '';
}

function loadUserGroups() {
    // Hier wird die Seite umgeleitet
    window.location.href = 'otherGroups.html';
}

// Lade die Versionen der Story aus der Datenbank
firebase.database().ref(`groups/${currentGroupId}/stories/${storyId}/versions`).once('value').then(versionsSnapshot => {
    console.log(`Versions-Snapshot vorhanden: ${versionsSnapshot.exists()}`);

    if (!versionsSnapshot.exists()) {
        versionsList.innerHTML = '<div>Keine Versionen verfügbar.</div>';
        return; // Beende die Funktion, wenn keine Versionen vorhanden sind
    }

    let versionCount = 0; // Zähler für die Anzahl der Versionen

    versionsSnapshot.forEach(versionSnapshot => {
        versionCount++; // Zähle jede gefundene Version
        const versionData = versionSnapshot.val();
        const userId = versionData.userId; // Angenommene Struktur der Version-Daten

        console.log(`Version gefunden: ${JSON.stringify(versionData)}`);

        // Erstelle einen Container für jede Version
        const versionContainer = document.createElement('div');
        versionContainer.classList.add('version-container');

        // Lade den Benutzernamen basierend auf der userId
        firebase.database().ref(`users/${userId}`).once('value').then(userSnapshot => {
            const userName = userSnapshot.val().username || "Unbekannter Benutzer"; // Benutzername abrufen

            // Füge den Benutzernamen als Text hinzu
            const userIdElement = document.createElement('div');
            userIdElement.textContent = userName; // Hier den Benutzernamen hinzufügen
            userIdElement.classList.add('version-user');

            // Füge einen Löschen-Button hinzu, wenn der aktuelle Benutzer die Berechtigung hat
            if (currentUser.uid === userId) {
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Löschen';
                deleteButton.classList.add('delete-button');
                deleteButton.onclick = () => deleteVersion(storyId, versionSnapshot.key);
                versionContainer.appendChild(deleteButton);
            }

            // Füge alles zum Container hinzu
            versionContainer.appendChild(userIdElement);
            versionsList.appendChild(versionContainer);
        });
    });

    // Zeige die Anzahl der Versionen an
    const versionCountElement = document.createElement('div');
    versionCountElement.textContent = `Anzahl der Versionen: ${versionCount}`;
    versionsList.prepend(versionCountElement); // Füge die Anzahl oben in der Liste hinzu

}).catch(error => {
    console.error("Fehler beim Laden der Versionen:", error);
});
// Funktion zur Weiterleitung zur Versionsseite
function redirectToVersionsPage() {
    window.location.href = 'versions.html';
}