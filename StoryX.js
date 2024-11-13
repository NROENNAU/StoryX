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
const imageCollageContainer = document.getElementById('imageCollageContainer')

// Zeige den Benutzernamen, wenn der Benutzer angemeldet ist
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        usernameDisplay.innerText = user.email; // oder user.displayName, wenn du es beim Registrieren festlegst
        loadUserGroupAndStories();
        authContainer.classList.add('hidden');
        contentContainer.classList.remove('hidden');
    } else {
        // Wenn kein Benutzer angemeldet ist, prüfen, ob eine groupId im URL-Hash vorhanden ist
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        const groupId = hashParams.get('groupId'); // groupId aus dem URL-Hash extrahieren

        if (groupId) {
            // Falls groupId vorhanden ist, zur Login-Seite mit groupId als URL-Parameter umleiten
            window.location.href = `login.html?groupId=${groupId}`;
        } else {
            // Ansonsten einfach zur Login-Seite ohne groupId
            window.location.href = 'login.html';
        }
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

// Funktion zum Ausblenden aller Container
function hideAllContainers() {
    storyListContainer.classList.add('hidden');
    addStoryContainer.classList.add('hidden');
    randomStoryContainer.classList.add('hidden');
imageCollageContainer.classList.add('hidden'); // Verstecke den Collage-Container

}

// Function to display all stories
function showAllStories() {
    hideAllContainers();
    storyListContainer.classList.remove('hidden');
    document.getElementById('searchContainer').classList.remove('hidden'); // Show search functionality

    const userId = firebase.auth().currentUser.uid;
    const userGroupRef = firebase.database().ref(`users/${userId}/currentGroup`);

    userGroupRef.once('value').then((snapshot) => {
        const groupId = snapshot.val();
        if (groupId) {
            const storiesRef = firebase.database().ref(`groups/${groupId}/stories`);
            storiesRef.once('value').then((snapshot) => {
                storyListContainer.innerHTML = ''; // Clear existing stories

                // Array to store story elements
                const storiesArray = [];

                snapshot.forEach((childSnapshot) => {
                    const story = childSnapshot.val();
                    const storyItem = document.createElement('div');
                    storyItem.classList.add('story-item');

                    storyItem.innerHTML = `<div class="story-content">${story.text || "Inhalt nicht verfügbar"}</div>`;

                    // Container for the buttons
                    const buttonContainer = document.createElement('div');
                    buttonContainer.classList.add('story-buttons');

                    // Edit button, visible only if the user is the creator
                    if (story.creatorId === userId) {
                        const editButton = document.createElement('button');
                        editButton.textContent = '✏️';
                        editButton.classList.add('edit-button');
                        editButton.addEventListener('click', () => {
                            openEditPopup(childSnapshot.key, story.text);
                        });
                        buttonContainer.appendChild(editButton);
                    }

                    // "Details" button, always visible
                    const detailsButton = document.createElement('button');
                    detailsButton.textContent = 'Details';
                    detailsButton.classList.add('details-button');
                    detailsButton.addEventListener('click', () => {
                        openDetailsPopup(childSnapshot.key); // Open details pop-up
                    });
                    buttonContainer.appendChild(detailsButton);

                    storyItem.appendChild(buttonContainer);
                    storyItem.dataset.storyId = childSnapshot.key; // Store story ID for search
                    storiesArray.push(storyItem); // Add story element to array
                });

                // Add all story elements to the top of the container
                storiesArray.reverse().forEach(item => {
                    storyListContainer.appendChild(item);
                });

                // Add event listener for the search functionality
                document.getElementById('searchInput').addEventListener('input', filterStories);
            }).catch((error) => console.error("Fehler beim Abrufen der Stories: ", error));
        } else {
            storyListContainer.innerHTML = "Keine Gruppe zugeordnet.";
        }
    }).catch((error) => console.error("Fehler beim Abrufen der Gruppeninformationen: ", error));
}

// Function to open the edit pop-up
function openEditPopup(storyId, currentText) {
    const popupContainer = document.createElement('div');
    popupContainer.classList.add('popup-container');

    const popupContent = document.createElement('div');
    popupContent.classList.add('popup-content');

    const title = document.createElement('h2');
    title.innerText = "Story bearbeiten";
    popupContent.appendChild(title);

    const storyInput = document.createElement('textarea');
    storyInput.value = currentText; // Pre-fill with current text
    popupContent.appendChild(storyInput);

    const saveButton = document.createElement('button');
    saveButton.innerText = "Speichern";
    saveButton.onclick = () => {
        const newText = storyInput.value.trim();
        if (newText.length === 0) {
            alert("Die Story darf nicht leer sein.");
            return;
        } else if (newText.length > 50) {
            alert("Die Story darf maximal 50 Zeichen lang sein.");
            return;
        }
        updateStory(storyId, newText);
        document.body.removeChild(popupContainer); // Close pop-up
    };
    popupContent.appendChild(saveButton);

    const deleteButton = document.createElement('button');
    deleteButton.innerText = "Löschen";
    deleteButton.onclick = () => {
        const confirmation = confirm('Möchten Sie diese Story wirklich löschen?');
        if (confirmation) {
            deleteStory(storyId);
        }
        document.body.removeChild(popupContainer); // Close pop-up
    };
    popupContent.appendChild(deleteButton);

    const cancelButton = document.createElement('button');
    cancelButton.innerText = "Abbrechen";
    cancelButton.onclick = () => {
        document.body.removeChild(popupContainer); // Close pop-up
    };
    popupContent.appendChild(cancelButton);

    popupContainer.appendChild(popupContent);
    document.body.appendChild(popupContainer);
}

// Function to update a story
function updateStory(storyId, newText) {
    const userId = firebase.auth().currentUser.uid;
    const userGroupRef = firebase.database().ref(`users/${userId}/currentGroup`);

    userGroupRef.once('value').then((snapshot) => {
        const groupId = snapshot.val();
        if (groupId) {
            const storyRef = firebase.database().ref(`groups/${groupId}/stories/${storyId}`);
            storyRef.update({ text: newText })
                .then(() => {
                    console.log("Story erfolgreich aktualisiert");
                    showAllStories(); // Refresh the list
                })
                .catch((error) => console.error("Fehler beim Aktualisieren der Story: ", error));
        }
    }).catch((error) => console.error("Fehler beim Abrufen der Gruppeninformationen: ", error));
}

// Function to open the details pop-up
function openDetailsPopup(storyId) {
    const popup = document.createElement('div');
    popup.classList.add('popup');

    // Pop-up content
    popup.innerHTML = `
        <div class="popup-content">
            <h2>Details Optionen</h2>
            <button id="viewDetails">Details ansehen</button>
            <button id="insertDetails">Details einfügen</button>
            <button id="closePopup">Schließen</button>
        </div>
    `;

    // Append the pop-up to the body
    document.body.appendChild(popup);

    // Add event listeners for the buttons
    document.getElementById('viewDetails').addEventListener('click', () => {
        viewDetailsFunction(storyId); // Pass the storyId to the function
        closePopup(popup);
    });

    document.getElementById('insertDetails').addEventListener('click', () => {
        insertDetailsFunction(storyId); // Update story ID and redirect to addVersion.html
        closePopup(popup);
    });

    document.getElementById('closePopup').addEventListener('click', () => {
        closePopup(popup);
    });
}

// Function to close the pop-up
function closePopup(popup) {
    document.body.removeChild(popup);
}

// Function to handle "Details ansehen"
function viewDetailsFunction(storyId) {
    const userId = firebase.auth().currentUser.uid;

    // Update the current story ID in the user's data
    const userStoryRef = firebase.database().ref(`users/${userId}/currentRandomStoryId`);

    userStoryRef.set(storyId) // Set the new story ID
        .then(() => {
            console.log(`Story-ID ${storyId} erfolgreich gespeichert`);
            window.location.href = 'versions.html'; // Redirect to versions.html
        })
        .catch((error) => {
            console.error("Fehler beim Aktualisieren der Story-ID: ", error);
        });
}

// Function to handle "Details einfügen"
function insertDetailsFunction(storyId) {
    const userId = firebase.auth().currentUser.uid;

    // Update the current story ID in the user's data
    firebase.database().ref(`users/${userId}/currentRandomStoryId`).set(storyId)
        .then(() => {
            window.location.href = 'AddVersion.html'; // Redirect to addVersion.html
        })
        .catch((error) => {
            console.error("Fehler beim Aktualisieren der Story-ID: ", error);
        });
}

// Function to delete a story
function deleteStory(storyId) {
    const userId = firebase.auth().currentUser.uid;
    const userGroupRef = firebase.database().ref(`users/${userId}/currentGroup`);

    userGroupRef.once('value').then((snapshot) => {
        const groupId = snapshot.val();
        if (groupId) {
            const storyRef = firebase.database().ref(`groups/${groupId}/stories/${storyId}`);
            storyRef.remove()
                .then(() => {
                    console.log("Story erfolgreich gelöscht");
                    showAllStories(); // Refresh the list
                })
                .catch((error) => console.error("Fehler beim Löschen der Story: ", error));
        }
    }).catch((error) => console.error("Fehler beim Abrufen der Gruppeninformationen: ", error));
}



// Funktion zur Filterung der Geschichten
function filterStories() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const storyItems = document.querySelectorAll('.story-item');

    storyItems.forEach(item => {
        const storyContent = item.querySelector('.story-content').textContent.toLowerCase();
        // Überprüfen, ob die Story mit dem Suchbegriff übereinstimmt
        if (storyContent.includes(searchTerm)) {
            item.style.display = ''; // Sichtbar
        } else {
            item.style.display = 'none'; // Ausblenden
        }
    });
}

// Wenn ein anderer Container angezeigt wird, verstecke die Suchfunktion
function hideAllContainers() {
    storyListContainer.classList.add('hidden');
    addStoryContainer.classList.add('hidden');
    randomStoryContainer.classList.add('hidden');
	imageCollageContainer.classList.add('hidden');
    document.getElementById('searchContainer').classList.add('hidden'); // Suchfunktion ausblenden
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

	initializeStoryBox();

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
                    stories.push({ id: childSnapshot.key, text: story.text });
                });

                if (stories.length > 0) {
                    let randomStory;

                    do {
                        const randomIndex = Math.floor(Math.random() * stories.length);
                        randomStory = stories[randomIndex];
                    } while (randomStory.id === currentRandomStoryId);

                    currentRandomStoryId = randomStory.id;

                    document.getElementById('storyText').textContent = randomStory.text;

                    const userRandomStoryRef = firebase.database().ref(`users/${userId}/currentRandomStoryId`);
                    userRandomStoryRef.set(randomStory.id).then(() => {
                        loadCollageForStory(randomStory.id); // Collage nach Story laden
                        updateVersionsButton(); // Anzahl der Versionen aktualisieren
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

function adjustForKeyboard() {
  const storyListContainer = document.querySelector('.story-list-container');
  const footer = document.querySelector('.footer');
  
  // Berechne die Höhe des sichtbaren Bereichs
  const windowHeight = window.innerHeight;
  const footerHeight = footer.offsetHeight;

  // Setze die maximale Höhe der Story-Liste
  storyListContainer.style.maxHeight = (windowHeight - footerHeight - 20) + 'px'; // 20px für Padding oder Margins
}

// Event Listener für das Resize-Ereignis
window.addEventListener('resize', adjustForKeyboard);
window.addEventListener('load', adjustForKeyboard); // Damit es beim ersten Laden auch angepasst wird

function updateVersionsButton() {
    const userId = firebase.auth().currentUser.uid;
    const userGroupRef = firebase.database().ref(`users/${userId}/currentGroup`);
    const versionsButton = document.querySelector("button[onclick='redirectToVersionsPage()']");

    if (!versionsButton) {
        console.error("Versions-Button nicht gefunden.");
        return;
    }

    userGroupRef.once('value').then((snapshot) => {
        const groupId = snapshot.val();
        if (groupId) {
            const currentStoryRef = firebase.database().ref(`users/${userId}/currentRandomStoryId`);

            currentStoryRef.once('value').then((storySnapshot) => {
                const storyId = storySnapshot.val();
                if (storyId) {
                    const versionsRef = firebase.database().ref(`groups/${groupId}/stories/${storyId}/versions`);

                    versionsRef.once('value').then((versionsSnapshot) => {
                        const versionCount = versionsSnapshot.exists() ? versionsSnapshot.numChildren() : 0;

                        // Setze den Button-Text mit der Anzahl der Versionen
                        versionsButton.innerHTML = `🎉<br>Details (${versionCount})`;
                    }).catch((error) => {
                        console.error("Fehler beim Abrufen der Versionsanzahl: ", error);
                        versionsButton.innerHTML = `🎉<br>Details (0)`;
                    });
                } else {
                    versionsButton.innerHTML = `🎉<br>Details (0)`;
                }
            }).catch((error) => {
                console.error("Fehler beim Abrufen der aktuellen Story-ID: ", error);
                versionsButton.innerHTML = `🎉<br>Details (0)`;
            });
        } else {
            versionsButton.innerHTML = `🎉<br>Details (0)`;
        }
    }).catch((error) => {
        console.error("Fehler beim Abrufen der Gruppeninformationen: ", error);
        versionsButton.innerHTML = `🎉<br>Details (0)`;
    });
}

window.onload = function() {
    updateVersionsButton();
};

// Funktion zum Abrufen der Bild-URLs direkt aus der Firebase Realtime Database
async function fetchImageUrlsFromDatabase(groupId, storyId, versionIds) {
    const imageUrls = [];

    // Iteriere über alle Versionen und hole die Bild-URLs
    for (const versionId of versionIds) {
        const versionRef = firebase.database().ref(`groups/${groupId}/stories/${storyId}/versions/${versionId}/images`);
        
        try {
            const imageSnapshot = await versionRef.once('value');
            const images = imageSnapshot.val();
            
            // Debugging-Ausgabe
            console.log(`Bilder für Version ${versionId}:`, images); 

            if (images) {
                Object.values(images).forEach(imageUrl => {
                    imageUrls.push(imageUrl); // Alle Bild-URLs zur Liste hinzufügen
                });
            } else {
                console.log(`Keine Bilder für Version ${versionId} gefunden.`); // Debugging-Ausgabe
            }
        } catch (error) {
            console.error(`Fehler beim Abrufen der Bilder für Version ${versionId}:`, error);
        }
    }

    console.log("Gefundene Bild-URLs:", imageUrls); // Debugging-Ausgabe
    return imageUrls;
}

// Funktion zum Abrufen der Versionen-IDs aus der Firebase Realtime Database
async function fetchVersionIds(groupId, storyId) {
    const versionIds = [];
    const versionsRef = firebase.database().ref(`groups/${groupId}/stories/${storyId}/versions`);

    try {
        const versionsSnapshot = await versionsRef.once('value');
        versionsSnapshot.forEach((childSnapshot) => {
            versionIds.push(childSnapshot.key); // Version-IDs sammeln
        });

        console.log("Gefundene Versionen:", versionIds); // Debugging-Ausgabe
    } catch (error) {
        console.error("Fehler beim Abrufen der Versionen:", error);
    }

    return versionIds;
}

// Funktion zum Anzeigen des Collage-Containers
function showCollageContainer() {
    imageCollageContainer.classList.remove('hidden'); // Collage-Container anzeigen
}

function loadCollageForStory(storyId) {
    showCollageContainer(); // Collage-Container anzeigen

    const collageContainer = document.getElementById('imageCollageContainer'); // Container für die Collage
    collageContainer.innerHTML = ''; // Vorherige Collage entfernen

    // Lade die Bild-URLs von der Funktion
    getImagesForStory(storyId).then(imageUrls => {
        if (imageUrls.length > 0) {
            // Das erste Bild als Hintergrund im storyBoxContainer setzen
            const firstImageUrl = imageUrls[0];
            const storyBoxContainer = document.getElementById('storyBoxContainer');

            if (storyBoxContainer) {
                storyBoxContainer.style.backgroundImage = `url(${firstImageUrl})`;
                storyBoxContainer.style.backgroundSize = 'cover'; // Bildgröße anpassen
                storyBoxContainer.style.backgroundPosition = 'center'; // Position des Hintergrunds anpassen
            }

            // Bilder in den Collage-Container einfügen
            imageUrls.forEach(url => {
                const img = document.createElement('img');
                img.src = url; // URL als Quelle
                img.alt = 'Bild der Story'; // Alternativtext für das Bild

                // Event Listener hinzufügen, damit das Bild in der StoryBox angezeigt wird
                img.addEventListener('click', () => {
                    if (storyBoxContainer) {
                        storyBoxContainer.style.backgroundImage = `url(${url})`;
                        storyBoxContainer.style.backgroundSize = 'cover';
                        storyBoxContainer.style.backgroundPosition = 'center';
                    }
                });

                collageContainer.appendChild(img); // Bild in den Container einfügen
            });
        } else {
            console.log('Keine Bilder für diese Story gefunden.');
            // Wenn keine Bilder gefunden werden, setze das Standardbild als Hintergrund
            const storyBoxContainer = document.getElementById('storyBoxContainer');
            if (storyBoxContainer) {
                storyBoxContainer.style.backgroundImage = `url('Hintergrund_StoryX.jpg')`;
                storyBoxContainer.style.backgroundSize = 'cover';
                storyBoxContainer.style.backgroundPosition = 'center';
            }
        }
    }).catch(error => {
        console.error("Fehler beim Laden der Bilder:", error);
        // Im Fehlerfall auch das Standardbild setzen
        const storyBoxContainer = document.getElementById('storyBoxContainer');
        if (storyBoxContainer) {
            storyBoxContainer.style.backgroundImage = `url('Hintergrund_StoryX.jpg')`;
            storyBoxContainer.style.backgroundSize = 'cover';
            storyBoxContainer.style.backgroundPosition = 'center';
        }
    });
}

async function getImagesForStory(storyId) {
    const userId = firebase.auth().currentUser.uid; // Benutzer-ID für die Firebase-Datenbank
    const groupId = await getUserGroup(userId); // Holen der Gruppen-ID für den Benutzer

    // Holen der Versionen und Bilder für eine Story aus der Firebase-Datenbank
    const versionIds = await fetchVersionIds(groupId, storyId);
    const imageUrls = await fetchImageUrlsFromDatabase(groupId, storyId, versionIds);

    console.log("Gefundene Bild-URLs:", imageUrls); // Debugging-Ausgabe
    return imageUrls; // Rückgabe der URLs
}

async function getUserGroup(userId) {
    const userGroupRef = firebase.database().ref(`users/${userId}/currentGroup`);
    const snapshot = await userGroupRef.once('value');
    return snapshot.val(); // Rückgabe der Gruppen-ID
}

async function fetchImageUrlsFromDatabase(groupId, storyId, versionIds) {
    const imageUrls = [];

    // Iteriere über alle Versionen und hole die Bild-URLs
    for (const versionId of versionIds) {
        const versionRef = firebase.database().ref(`groups/${groupId}/stories/${storyId}/versions/${versionId}/images`);
        
        try {
            const imageSnapshot = await versionRef.once('value');
            const images = imageSnapshot.val();
            
            // Debugging-Ausgabe
            console.log(`Bilder für Version ${versionId}:`, images); 

            if (images) {
                Object.values(images).forEach(imageUrl => {
                    imageUrls.push(imageUrl); // Alle Bild-URLs zur Liste hinzufügen
                });
            } else {
                console.log(`Keine Bilder für Version ${versionId} gefunden.`); // Debugging-Ausgabe
            }
        } catch (error) {
            console.error(`Fehler beim Abrufen der Bilder für Version ${versionId}:`, error);
        }
    }

    console.log("Gefundene Bild-URLs:", imageUrls); // Debugging-Ausgabe
    return imageUrls;
}

function initializeStoryBox() {
    const storyBoxContainer = document.getElementById('storyBoxContainer');
    if (storyBoxContainer) {
        storyBoxContainer.style.backgroundImage = 'url(default-image.jpg)'; // Standard-Hintergrundbild
        storyBoxContainer.style.backgroundSize = 'cover';
        storyBoxContainer.style.backgroundPosition = 'center';
    }
}

window.onload = function() {
    initializeStoryBox(); // Story-Box initialisieren
    loadCollageForStory(someStoryId); // Deine Funktion aufrufen
};

window.onload = function() {
    // Extrahieren der groupId aus dem Hash-Teil der URL
    const groupIdFromHash = window.location.hash ? new URLSearchParams(window.location.hash.substr(1)).get('groupId') : null;

    console.log("Group ID aus URL (Hash):", groupIdFromHash); // Debug: Zeigt die groupId aus dem Hash-Teil der URL

    if (groupIdFromHash) {
        // Wenn eine gültige groupId im Hash-Teil vorhanden ist, zeige sofort das Pop-up zur Gruppenmitgliedschaft
        showGroupPopup(groupIdFromHash);
    } else {
        console.log("Keine groupId im Hash gefunden, keine Aktion erforderlich.");
    }
};

// Funktion zum Anzeigen des Pop-ups zur Bestätigung des Gruppenbeitritts
function showGroupPopup(groupId) {
    console.log("Pop-up zur Gruppenmitgliedschaft wird angezeigt.");
    
    const popup = createPopup("Möchten Sie der Gruppe beitreten?", () => {
        // Wenn der Benutzer auf "Beitreten" klickt, prüfen wir, ob er Mitglied ist
        checkGroupMembership(groupId);
    });
    document.body.appendChild(popup);
}

// Funktion zum Bestätigen des Gruppenbeitritts
function checkGroupMembership(groupId) {
    console.log("Prüfung der Gruppenmitgliedschaft...");

    const userId = firebase.auth().currentUser?.uid;
    if (!userId) {
        alert("Bitte melden Sie sich an, um der Gruppe beizutreten.");
        return;
    }

    const userGroupRef = firebase.database().ref(`groups/${groupId}/members/${userId}`);
    userGroupRef.once('value').then(snapshot => {
        if (snapshot.exists()) {
            // Der Benutzer ist bereits Mitglied der Gruppe
            alert("Sie sind bereits Mitglied dieser Gruppe.");
        } else {
            // Der Benutzer ist noch kein Mitglied, füge ihn hinzu
            addUserToGroup(groupId);
        }
    }).catch(error => {
        console.error("Fehler bei der Überprüfung der Gruppenmitgliedschaft: ", error);
    });
}

// Funktion zum Hinzufügen des Benutzers zur Gruppe
function addUserToGroup(groupId) {
    console.log("Füge den Benutzer der Gruppe hinzu...");

    const userId = firebase.auth().currentUser?.uid;
    if (!userId) {
        alert("Benutzer ist nicht eingeloggt.");
        return;
    }

    firebase.database().ref(`groups/${groupId}/members/${userId}`).set(true)
    .then(() => {
        alert("Sie sind erfolgreich der Gruppe beigetreten.");
        updateCurrentGroup(groupId); // Aktualisiere die Gruppe des Benutzers
    })
    .catch((error) => {
        alert("Fehler beim Beitreten der Gruppe: " + error.message);
    });
}

// Funktion zum Aktualisieren der aktuellen Gruppe des Benutzers
function updateCurrentGroup(groupId) {
    console.log("Aktualisiere die aktuelle Gruppe des Benutzers...");

    const userId = firebase.auth().currentUser?.uid;
    if (!userId) {
        alert("Benutzer ist nicht eingeloggt.");
        return;
    }

    firebase.database().ref(`users/${userId}/currentGroup`).set(groupId)
    .then(() => {
        console.log("Aktuelle Gruppe erfolgreich aktualisiert.");
        // Nach dem Hinzufügen zur Gruppe könnte man auch auf eine neue Seite umleiten oder die UI entsprechend anpassen
    })
    .catch(error => {
        alert("Fehler beim Wechseln der Gruppe: " + error.message);
    });
}

// Funktion zur Pop-up-Erstellung
function createPopup(messageText, onConfirm) {
    const popup = document.createElement('div');
    popup.style.position = 'fixed';
    popup.style.left = '50%';
    popup.style.top = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.padding = '20px';
    popup.style.backgroundColor = '#fff';
    popup.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    popup.style.zIndex = '1000';

    const message = document.createElement('p');
    message.textContent = messageText;
    popup.appendChild(message);

    const confirmButton = document.createElement('button');
    confirmButton.textContent = 'Ja';
    confirmButton.onclick = () => {
        onConfirm(); // Bestätigung, dass der Benutzer der Gruppe beitreten möchte
        document.body.removeChild(popup); // Schließt das Pop-up
    };
    popup.appendChild(confirmButton);

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Nein';
    cancelButton.onclick = () => document.body.removeChild(popup); // Schließt das Pop-up
    popup.appendChild(cancelButton);

    return popup;
}
