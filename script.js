
let startTime = null;
let stopTime = null;
let timerInterval = null;

const timerDisplay = document.getElementById('timer-display');
const timerStatusText = document.getElementById('timer-status-text');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const jobStatusDropdown = document.getElementById('jobStatus');
const sessionHistoryList = document.getElementById('sessionHistoryList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
const sessionHistoryContainer = document.getElementById('sessionHistoryContainer');

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

  const agentName = document.getElementById('agentName').value || 'N/A';
  const jobNo = document.getElementById('jobNo').value || 'N/A';
  const jobStatus = jobStatusDropdown.value || 'N/A';
  const jobDifficultyDropdown = document.getElementById('jobDifficulty');
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
    history[index][key] = value;
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
        // Add classes for sticky positioning, background, z-index, padding, border, and BORDER-RADIUS
        // Applying rounded-t-lg here for the top corners of the sticky header itself
        sessionHistoryHeader.className = 'sticky top-0 bg-gray-100 z-10 py-2 border-b border-gray-300 rounded-t-lg';
        // Insert it before the main sessionHistoryList
        sessionHistoryContainer.insertBefore(sessionHistoryHeader, sessionHistoryList);
    }

    // Clear previous header content before rendering new
    sessionHistoryHeader.innerHTML = '';

    // Header row - This LI will now be contained within the rounded UL
    const header = document.createElement('li');
    // We don't add border-radius or background here, as the parent UL handles it
    header.className = 'grid grid-cols-6 gap-2 text-xs font-bold text-gray-600 px-1 min-w-[520px]';
    header.innerHTML = `
        <span class="text-center">Name</span>
        <span class="text-center">Job No</span>
        <span class="text-center">Status</span>
        <span class="text-center">Difficulty</span>
        <span class="text-center">AHT</span>
        <span class="text-center">Action</span>
    `;
    sessionHistoryHeader.appendChild(header); // Append to the new header UL


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
            'group grid grid-cols-6 gap-2 items-center bg-white border p-1 rounded text-xs transition-colors duration-200 min-w-[520px]';

        const statusDropdown = document.createElement('select');
        statusDropdown.className = 'border rounded px-1 py-0.5 w-full';
        ['On-going', 'Pending', 'Completed', 'Reviewed', 'Rejected', 'On-hold', 'Awaiting Feedback', 'In Progress'].forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            if (opt === entry.jobStatus) option.selected = true;
            statusDropdown.appendChild(option);
        });
        statusDropdown.addEventListener('change', () => {
            updateEntryField(index, 'jobStatus', statusDropdown.value);
        });

        const difficultyDropdown = document.createElement('select');
        difficultyDropdown.className = 'border rounded px-1 py-0.5 w-full';
        ['Easy', 'Moderate', 'Hard', 'Very Hard'].forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            if (opt === entry.jobDifficulty) option.selected = true;
            difficultyDropdown.appendChild(option);
        });
        difficultyDropdown.addEventListener('change', () => {
            updateEntryField(index, 'jobDifficulty', difficultyDropdown.value);
        });

        li.innerHTML = `
            <span class="truncate text-center">${entry.agentName}</span>
            <span class="truncate text-center">${entry.jobNo}</span>
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
  jobStatusDropdown.value = '';
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

    // Re-introducing Start Time and Stop Time headers, but clarifying they are just times
    const headers = ['Agent Name', 'Job No.', 'Job Status', 'Job Difficulty', 'Start Time (HH:MM:SS AM/PM)', 'Stop Time (HH:MM:SS AM/PM)', 'AHT (minutes)'];
    const csv = [headers.join(',')];

    session.forEach(row => {
        // Convert AHT from seconds to minutes
        const ahtMinutes = (parseFloat(row.ahtSeconds) / 60).toFixed(2); // Convert to minutes and format to 2 decimal places

        // Extract only the time part from startStr and stopStr
        // row.startStr and row.stopStr are created using toLocaleString(), which includes date and time.
        // We'll create new Date objects from these to reliably get just the time.
        const startTimeOnly = new Date(row.startStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        const stopTimeOnly = new Date(row.stopStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });


        csv.push([
            row.agentName,
            row.jobNo,
            row.jobStatus,
            row.jobDifficulty,
            startTimeOnly, // Only the time
            stopTimeOnly,  // Only the time
            ahtMinutes     // AHT in minutes
        ].join(','));
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



c