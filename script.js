let startTime = null;
let stopTime = null;
let timerInterval = null;

const timerDisplay = document.getElementById('timer-display');
const timerStatusText = document.getElementById('timer-status-text');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const jobStatusDropdown = document.getElementById('jobStatus');
const jobDifficultyDropdown = document.getElementById('jobDifficulty');
const sessionHistoryList = document.getElementById('sessionHistoryList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
const sessionHistoryContainer = document.getElementById('sessionHistoryContainer');
const downloadCsvBtn = document.getElementById('downloadCsvBtn'); // Assuming you have a button with this ID for CSV download

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = ms % 1000;

    const pad = n => String(n).padStart(2, '0');
    const padMs = n => String(n).padStart(3, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${padMs(milliseconds)}`;
}

function updateTimerDisplay() {
    if (startTime) {
        const now = Date.now();
        const elapsed = now - startTime;
        timerDisplay.textContent = formatTime(elapsed);
    }
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    startTime = Date.now();
    stopTime = null;
    timerDisplay.textContent = '00:00:00.000';
    timerStatusText.textContent = 'Timer running...';
    startButton.disabled = true;
    stopButton.disabled = false;

    timerInterval = setInterval(updateTimerDisplay, 10);
}

function stopTimer() {
    if (!startTime) return;
    clearInterval(timerInterval);
    stopTime = Date.now();
    timerStatusText.textContent = 'Timer stopped.';
    startButton.disabled = false;
    stopButton.disabled = true;

    // Use .value || 'N/A' for inputs and dropdowns, assuming empty string for unselected
    const agentName = document.getElementById('agentName').value.trim() || 'N/A'; // Trim to handle whitespace
    const jobNo = document.getElementById('jobNo').value.trim() || 'N/A';       // Trim to handle whitespace
    const jobStatus = jobStatusDropdown.value || 'N/A';
    const jobDifficulty = jobDifficultyDropdown.value || 'N/A';

    const startStr = new Date(startTime).toLocaleString();
    const stopStr = new Date(stopTime).toLocaleString();
    const ahtSeconds = ((stopTime - startTime) / 1000).toFixed(2);

    const entry = {
        agentName,
        jobNo,
        jobStatus,
        jobDifficulty,
        startStr,
        stopStr,
        ahtSeconds
    };

    saveSessionEntry(entry);
    renderSessionHistory();
    resetForm();

    fetch('https://script.google.com/macros/s/AKfycbypZz8qf1w4XGDeHOPfzo5lO29OLjhJRhupKYnBM0h9/dev', {
        method: 'POST',
        body: JSON.stringify(entry),
        headers: {
            'Content-Type': 'application/json'
        }
    }).then(res => res.text())
        .then(msg => console.log('Google Sheet Response:', msg))
        .catch(err => console.error('Failed to send data to Google Sheets:', err));
}

function saveSessionEntry(entry) {
    const existing = JSON.parse(localStorage.getItem('sessionHistory') || '[]');
    existing.unshift(entry);
    localStorage.setItem('sessionHistory', JSON.stringify(existing));
}

function updateEntryField(index, key, value) {
    const history = JSON.parse(localStorage.getItem('sessionHistory') || '[]');
    if (history[index]) {
        // Ensure that empty strings are saved as 'N/A' for agentName and jobNo
        if (key === 'agentName' || key === 'jobNo') {
            history[index][key] = value.trim() || 'N/A';
        } else {
            history[index][key] = value;
        }
        localStorage.setItem('sessionHistory', JSON.stringify(history));
    }
}

function renderSessionHistory() {
    const history = JSON.parse(localStorage.getItem('sessionHistory') || '[]');
    sessionHistoryList.innerHTML = '';

    // Find or create a dedicated header container if it doesn't exist
    let sessionHistoryHeader = document.getElementById('sessionHistoryHeader');
    if (!sessionHistoryHeader) {
        sessionHistoryHeader = document.createElement('ul');
        sessionHistoryHeader.id = 'sessionHistoryHeader';
        sessionHistoryHeader.className = 'sticky top-0 bg-gray-100 z-10 py-2 border-b border-gray-300 rounded-t-lg';
        sessionHistoryContainer.insertBefore(sessionHistoryHeader, sessionHistoryList);
    }

    sessionHistoryHeader.innerHTML = '';

    const header = document.createElement('li');
    header.className = 'grid grid-cols-6 gap-2 text-xs font-bold text-gray-600 px-1 min-w-[520px]';
    header.innerHTML = `
        <span class="text-center">Name</span>
        <span class="text-center">Job No</span>
        <span class="text-center">Status</span>
        <span class="text-center">Difficulty</span>
        <span class="text-center">AHT</span>
        <span class="text-center">Action</span>
    `;
    sessionHistoryHeader.appendChild(header);

    if (history.length === 0) {
        const empty = document.createElement('li');
        empty.textContent = 'No entries yet.';
        empty.className = 'text-gray-400 text-center py-4';
        sessionHistoryList.appendChild(empty);
        return;
    }

    history.forEach((entry, index) => {
        const rawAHT = parseFloat(entry.ahtSeconds);
        const ahtFormatted = rawAHT < 60 ? `${rawAHT.toFixed(2)}s` : `${(rawAHT / 60).toFixed(2)} min`;

        const li = document.createElement('li');
        li.className =
            'group grid grid-cols-6 gap-2 items-center bg-white border p-1 rounded text-xs transition-all duration-300 ease-out min-w-[520px]';

        // Agent Name Input Field (Editable)
        const agentNameInput = document.createElement('input');
        agentNameInput.type = 'text';
        agentNameInput.value = entry.agentName; // Set initial value from history
        agentNameInput.className = 'border rounded px-1 py-0.5 w-full text-center truncate';
        agentNameInput.placeholder = 'N/A'; // Visual hint for empty state
        agentNameInput.addEventListener('change', (e) => { // 'change' event fires on commit (enter or blur)
            updateEntryField(index, 'agentName', e.target.value);
        });
        agentNameInput.addEventListener('blur', (e) => { // 'blur' event fires when focus leaves
            updateEntryField(index, 'agentName', e.target.value);
        });


        // Job No Input Field (Editable)
        const jobNoInput = document.createElement('input');
        jobNoInput.type = 'text';
        jobNoInput.value = entry.jobNo; // Set initial value from history
        jobNoInput.className = 'border rounded px-1 py-0.5 w-full text-center truncate';
        jobNoInput.placeholder = 'N/A'; // Visual hint for empty state
        jobNoInput.addEventListener('change', (e) => { // 'change' event fires on commit (enter or blur)
            updateEntryField(index, 'jobNo', e.target.value);
        });
        jobNoInput.addEventListener('blur', (e) => { // 'blur' event fires when focus leaves
            updateEntryField(index, 'jobNo', e.target.value);
        });


        // STATUS DROPDOWN LOGIC
        const statusDropdown = document.createElement('select');
        statusDropdown.className = 'border rounded px-1 py-0.5 w-full';
        // Include 'N/A' as a selectable option in the history dropdown for completeness
        const statusOptions = ['N/A', 'On-going', 'Pending', 'Completed', 'Reviewed', 'Rejected', 'On-hold', 'Awaiting Feedback', 'In Progress'];
        statusOptions.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            if (opt === entry.jobStatus) option.selected = true;
            statusDropdown.appendChild(option);
        });
        statusDropdown.addEventListener('change', () => {
            updateEntryField(index, 'jobStatus', statusDropdown.value);
        });

        // DIFFICULTY DROPDOWN LOGIC
        const difficultyDropdown = document.createElement('select');
        difficultyDropdown.className = 'border rounded px-1 py-0.5 w-full';
        // Include 'N/A' as a selectable option in the history dropdown for completeness
        const difficultyOptions = ['N/A', 'Easy', 'Moderate', 'Hard', 'Very Hard'];
        difficultyOptions.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            if (opt === entry.jobDifficulty) option.selected = true;
            difficultyDropdown.appendChild(option);
        });
        difficultyDropdown.addEventListener('change', () => {
            updateEntryField(index, 'jobDifficulty', difficultyDropdown.value);
        });

        // Construct the list item's inner HTML and prepare containers for appending elements
        li.innerHTML = `
            <span id="agentName-container-${index}" class="flex justify-center items-center"></span>
            <span id="jobNo-container-${index}" class="flex justify-center items-center"></span>
            <span id="status-container-${index}" class="flex justify-center items-center"></span>
            <span id="difficulty-container-${index}" class="flex justify-center items-center"></span>
            <span class="text-center">${ahtFormatted}</span>
            <span class="flex justify-center items-center">
                <button onclick="deleteSession(${index})" class="text-red-500 hover:text-red-700 font-medium group-hover:bg-red-50 px-1 py-0.5 rounded">
                    Delete
                </button>
            </span>
        `;

        sessionHistoryList.appendChild(li);

        // Append the input fields and dropdowns to their respective containers
        document.getElementById(`agentName-container-${index}`).appendChild(agentNameInput);
        document.getElementById(`jobNo-container-${index}`).appendChild(jobNoInput);
        document.getElementById(`status-container-${index}`).appendChild(statusDropdown);
        document.getElementById(`difficulty-container-${index}`).appendChild(difficultyDropdown);
    });
}


function deleteSession(index) {
    const history = JSON.parse(localStorage.getItem('sessionHistory') || '[]');
    history.splice(index, 1);
    localStorage.setItem('sessionHistory', JSON.stringify(history));
    renderSessionHistory();
}

function clearSessionHistory() {
    localStorage.removeItem('sessionHistory');
    renderSessionHistory();
}

function resetForm() {
    document.getElementById('agentName').value = '';
    document.getElementById('jobNo').value = '';
    jobStatusDropdown.value = ''; // Set to empty string to show "Select Job Status" placeholder
    jobDifficultyDropdown.value = ''; // Set to empty string to show "Difficulty" placeholder
    timerDisplay.textContent = '00:00:00.000';
    timerStatusText.textContent = 'Ready to start';
    startButton.disabled = false;
    stopButton.disabled = true;
    startTime = null;
    stopTime = null;
    clearInterval(timerInterval);
    timerInterval = null;
}

toggleHistoryBtn.addEventListener('click', () => {
    const isHidden = sessionHistoryContainer.classList.toggle('hidden');
    toggleHistoryBtn.textContent = isHidden ? 'Show Session History' : 'Hide Session History';
});

startButton.addEventListener('click', startTimer);
stopButton.addEventListener('click', stopTimer);
clearHistoryBtn.addEventListener('click', clearSessionHistory);
if (downloadCsvBtn) { // Check if the button exists before adding listener
    downloadCsvBtn.addEventListener('click', generateAndDownloadCSV);
}

document.addEventListener('DOMContentLoaded', () => {
    resetForm();
    renderSessionHistory();
});


// CSV download
function generateAndDownloadCSV() {
    const session = JSON.parse(localStorage.getItem('sessionHistory') || '[]');
    if (!session.length) {
        // Assuming displayMessage is a function you have for user feedback
        if (typeof displayMessage === 'function') {
            displayMessage("No session data to export.", "Error");
        } else {
            console.warn("No session data to export. displayMessage function not found.");
        }
        return;
    }

    const headers = ['Agent Name', 'Job No.', 'Job Status', 'Job Difficulty', 'Start Time (HH:MM:SS AM/PM)', 'Stop Time (HH:MM:SS AM/PM)', 'AHT (minutes)'];
    const csv = [headers.join(',')];

    session.forEach(row => {
        const ahtMinutes = (parseFloat(row.ahtSeconds) / 60).toFixed(2);

        // Ensure these date strings are valid for new Date()
        const startTimeOnly = new Date(row.startStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        const stopTimeOnly = new Date(row.stopStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

        // Wrap each item in quotes for CSV safety, especially if values contain commas
        csv.push([
            row.agentName,
            row.jobNo,
            row.jobStatus,
            row.jobDifficulty,
            startTimeOnly,
            stopTimeOnly,
            ahtMinutes
        ].map(item => `"${String(item).replace(/"/g, '""')}"`).join(',')); // Added String(item) and replace for robust CSV
    });

    const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const year = now.getFullYear();

    let agentName = localStorage.getItem('agentName') || 'Agent';
    // Use the agent name from the first entry if available, otherwise default.
    if (session.length > 0 && session[0].agentName && session[0].agentName !== 'N/A') {
        agentName = session[0].agentName;
    }
    agentName = agentName.trim().replace(/\s+/g, '_');


    const filename = `${agentName}_AHT_${month}-${day}-${year}.csv`;

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Assuming displayMessage is a function you have for user feedback
    if (typeof displayMessage === 'function') {
        displayMessage("CSV downloaded.", "Success");
    } else {
        console.log("CSV downloaded. displayMessage function not found.");
    }
}




// Help button
// Add these new constant declarations near the top of your JS file,
// alongside your other document.getElementById calls
const helpBtn = document.getElementById('helpBtn');
const helpBox = document.getElementById('helpBox');


// Add this new event listener section at the bottom of your JS file,
// preferably inside the DOMContentLoaded listener or right after other main event listeners.
helpBtn.addEventListener('click', () => {
    helpBox.classList.toggle('hidden'); // This will toggle the 'hidden' class
});

// Optional: Add a way to close the help box if clicking outside of it
document.addEventListener('click', (event) => {
    // If the click is not on the help button AND not inside the help box
    if (helpBox && !helpBox.contains(event.target) && event.target !== helpBtn) {
        helpBox.classList.add('hidden'); // Hide the help box
    }
});
