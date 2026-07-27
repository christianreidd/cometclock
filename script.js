let taskList = [];
let currentSortMode = 'due-asc';

let autoRefreshIntervalId = null;

window.addEventListener('DOMContentLoaded', async () => {
    const sortSelect = document.getElementById('sortMode');
    if (sortSelect) {
        sortSelect.value = currentSortMode;
        sortSelect.addEventListener('change', (e) => {
            currentSortMode = e.target.value;
            renderTasks();
        });
    }
    await loadTasks();
    startAutoRefresh();
});

function startAutoRefresh() {
    if (autoRefreshIntervalId) return;
    autoRefreshIntervalId = setInterval(() => {
        renderTasks();
    }, 1000);
}

function stopAutoRefresh() {
    if (!autoRefreshIntervalId) return;
    clearInterval(autoRefreshIntervalId);
    autoRefreshIntervalId = null;
}
// Persistence adapter: default to localStorage for now.
// Swap this object for a server-backed adapter later without changing the rest of the code.
const storageAdapter = {
    key: 'cometclock.tasks',
    async load() {
        try {
            const raw = localStorage.getItem(this.key);
            if (!raw) return [];
            return JSON.parse(raw);
        } catch (e) {
            console.warn('Failed to load tasks from localStorage', e);
            return [];
        }
    },
    async save(tasks) {
        try {
            localStorage.setItem(this.key, JSON.stringify(tasks));
        } catch (e) {
            console.warn('Failed to save tasks to localStorage', e);
        }
    }
};

// Ensure a task object has the expected fields (migration helper)
function ensureTaskShape(t) {
    const makeId = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `t-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    return {
        id: t.id || makeId(),
        name: t.name || '',
        dueDate: t.dueDate || '',
        dueTime: t.dueTime || '',
        dateAdded: t.dateAdded || new Date().toISOString()
    };
}

function noAssignmentsText() {
    if (taskList.length === 0) {
        document.getElementById("taskList").innerText = "You have no assignments! 🎉 \n Click 'Add Assignment' to create one";
    }
}

function addAssignmentButtonClicked() {
    document.getElementById("creationWindow").style.display = "block";
}

async function loadTasks() {
    const raw = await storageAdapter.load();
    taskList = (raw || []).map(ensureTaskShape);
    renderTasks();
}

function renderTasks() {
    const container = document.getElementById('taskList');
    container.innerHTML = '';
    if (taskList.length === 0) {
        noAssignmentsText();
        return;
    }
    const sortedTasks = getSortedTasks(taskList, currentSortMode);
    sortedTasks.forEach(task => {
        const el = document.createElement('p');
        const timeLeft = timeRemaining(task);
        const dateString = convertDate(task);
        if (timeLeft < 0) {
            const units = timeUnits(Math.abs(timeLeft));
            el.innerText = `❌ ${task.name} - Due on the ${dateString} at ${convertTime(task)} (Overdue by ${units.days}d ${units.hours}h ${units.minutes}m ${units.seconds}s)`;
            el.style.color = '#ff0000';
        } else if (timeLeft <= 3 * 24 * 60 * 60 * 1000) {
            const units = timeUnits(timeLeft);
            el.innerText = `⏰ ${task.name} - Due on the ${dateString} at ${convertTime(task)} (${units.days}d ${units.hours}h ${units.minutes}m ${units.seconds}s remaining)`;
            el.style.color = '#ff6200';
        } else {
            const units = timeUnits(timeLeft);
            const dateString = convertDate(task);
            el.innerText = `${task.name} - Due on the ${dateString} at ${convertTime(task)} (${units.days}d ${units.hours}h ${units.minutes}m ${units.seconds}s remaining)`;
        }
        container.appendChild(el);
    });
}

function getSortedTasks(tasks, mode) {
    const sorted = [...tasks];

    const dueTimestamp = (task) => new Date(`${task.dueDate}T${task.dueTime || '23:59'}`).getTime();
    const createdTimestamp = (task) => new Date(task.dateAdded || 0).getTime();
    const nameValue = (task) => (task.name || '').toLowerCase();

    if (mode === 'due-asc') {
        sorted.sort((a, b) => dueTimestamp(a) - dueTimestamp(b));
    } else if (mode === 'due-desc') {
        sorted.sort((a, b) => dueTimestamp(b) - dueTimestamp(a));
    } else if (mode === 'name-asc') {
        sorted.sort((a, b) => nameValue(a).localeCompare(nameValue(b)));
    } else if (mode === 'name-desc') {
        sorted.sort((a, b) => nameValue(b).localeCompare(nameValue(a)));
    } else if (mode === 'created-asc') {
        sorted.sort((a, b) => createdTimestamp(a) - createdTimestamp(b));
    } else if (mode === 'created-desc') {
        sorted.sort((a, b) => createdTimestamp(b) - createdTimestamp(a));
    }

    return sorted;
}

async function saveTasks() {
    await storageAdapter.save(taskList);
}

function createTask() {
    const assignmentName = document.getElementById("nameInput").value;
    const assignmentDate = document.getElementById("dueDate").value;
    const assignmentTime = document.getElementById("dueTime").value;

    const makeId = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `t-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const taskInfo  = {
        id: makeId(),
        name: assignmentName,
        dueDate: assignmentDate,
        dueTime: assignmentTime,
        dateAdded: new Date().toISOString()
    };

    if (!assignmentName) return;

    if (taskList.length === 0) {
        document.getElementById("taskList").innerText = "";
    }
    taskList.push(taskInfo);
    document.getElementById("nameInput").value = "";
    document.getElementById("dueDate").value = "";
    document.getElementById("dueTime").value = "";  
    document.getElementById("creationWindow").style.display = "none";
    renderTasks();
    saveTasks();
}

// Export current tasks as a JSON file
function exportTasks() {
    const filename = `cometclock-tasks-${new Date().toISOString().slice(0,10)}.json`;
    const data = JSON.stringify(taskList, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// Import tasks from a user-selected JSON file. Replaces current tasks by default.
function importTasksFromFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const parsed = JSON.parse(e.target.result);
            if (!Array.isArray(parsed)) {
                alert('Imported file must be a JSON array of tasks.');
                return;
            }
            if (taskList.length > 0) {
                const keep = confirm('Replace current tasks with imported tasks? Click Cancel to merge instead.');
                if (keep) {
                    taskList = parsed;
                } else {
                    // merge: append items that don't already exist (prefer id, fallback to name+due)
                    parsed.forEach(orig => {
                        const t = ensureTaskShape(orig);
                        const dupById = taskList.some(et => et.id === t.id);
                        const dupByFields = taskList.some(et => et.name === t.name && et.dueDate === t.dueDate && et.dueTime === t.dueTime);
                        if (!dupById && !dupByFields) taskList.push(t);
                    });
                }
            } else {
                taskList = parsed.map(ensureTaskShape);
            }
            saveTasks();
            renderTasks();
            alert('Import successful.');
        } catch (err) {
            console.error(err);
            alert('Failed to parse JSON file.');
        }
    };
    reader.readAsText(file);
}

// Wire hidden file input
const importInput = document.getElementById('importFile');
if (importInput) {
    importInput.addEventListener('change', (ev) => {
        const f = ev.target.files && ev.target.files[0];
        if (f) importTasksFromFile(f);
        // reset so the same file can be re-selected later
        importInput.value = '';
    });
}

function lightMode() {
    document.body.classList.toggle('light-mode');
    const btn = document.querySelector('#lightMode');
    if (document.body.classList.contains('light-mode')) {
        btn.textContent = '🌑';    
    } else {
        btn.textContent = '🌕';
    }
}

function timeRemaining(task) {
    const currentTime = new Date();
    const dueTime = new Date(`${task.dueDate}T${task.dueTime}`);
    const timeLeft = dueTime - currentTime;
    return timeLeft;
}

function timeUnits(timeLeft) {
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor(timeLeft / (1000 * 60 * 60)) % 24;
    const minutes = Math.floor(timeLeft / (1000 * 60)) % 60;
    const seconds = Math.floor(timeLeft / 1000) % 60;
    return {days: days, hours: hours, minutes: minutes, seconds: seconds};
}

function convertDate(taskInfo) {
    const monthNames = {
        "01": "January",
        "02": "February",
        "03": "March",
        "04": "April",
        "05": "May",
        "06": "June",
        "07": "July",
        "08": "August",
        "09": "September",
        "10": "October",
        "11": "November",
        "12": "December"
    };

    const dateArray = taskInfo.dueDate.split("-");
    const year = dateArray[0];
    const month = monthNames[dateArray[1]];
    const day = dateArray[2];

    return `${day}${daySuffix(day)} of ${month} ${year}`
}

function convertTime(taskInfo) {
    const timeArray = taskInfo.dueTime.split(":");
    let hour = Number(timeArray[0]);
    const min = timeArray[1];
    let timeSuffix = "am";

    if (hour === 0) {
        hour = 12;
    } else if (hour === 12) {
        timeSuffix = "pm";
    } else if (hour > 12) {
        hour -= 12;
        timeSuffix = "pm";
    }

    return `${hour}:${min}${timeSuffix}`
}

function daySuffix(day) {
    let suffix;
    if (day === "11" || day === "12" || day === "13") {
        suffix = "th";
    } else if (day.slice(-1) === "1") {
        suffix = "st";
    } else if (day.slice(-1) === "2") {
        suffix = "nd";
    } else if (day.slice(-1) === "3") {
        suffix = "rd";
    } else {
        suffix = "th"
    }
    return suffix;
}