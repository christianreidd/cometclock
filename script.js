let taskList = [];
let currentSortField = "due";
let currentSortDirection = "asc";
let selectedTaskId = null;
const APP_VERSION = "cometclock v0.1.8";
let userSettings = {
    theme: "dark",
    showSeconds: true,
};

let autoRefreshIntervalId = null;

window.addEventListener("DOMContentLoaded", async () => {
    const sortSelect = document.getElementById("sortMode");
    if (sortSelect) {
        sortSelect.value = currentSortField;
        sortSelect.addEventListener("change", (e) => {
            currentSortField = e.target.value;
            renderTasks();
        });
    }

    const sortDirectionButton = document.getElementById("sortDirectionButton");
    if (sortDirectionButton) {
        sortDirectionButton.addEventListener("click", () => {
            currentSortDirection =
                currentSortDirection === "asc" ? "desc" : "asc";
            updateSortDirectionButton(sortDirectionButton);
            renderTasks();
        });
        updateSortDirectionButton(sortDirectionButton);
    }

    await loadSettings();
    const infoVersion = document.getElementById("infoVersion");
    if (infoVersion) {
        infoVersion.textContent = APP_VERSION;
    }
    await loadTasks();
    startAutoRefresh();
});

function startAutoRefresh() {
    if (autoRefreshIntervalId) return;
    autoRefreshIntervalId = setInterval(() => {
        refreshTaskCountdowns();
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
    key: "cometclock.tasks",
    async load() {
        try {
            const raw = localStorage.getItem(this.key);
            if (!raw) return [];
            return JSON.parse(raw);
        } catch (e) {
            console.warn("Failed to load tasks from localStorage", e);
            return [];
        }
    },
    async save(tasks) {
        try {
            localStorage.setItem(this.key, JSON.stringify(tasks));
        } catch (e) {
            console.warn("Failed to save tasks to localStorage", e);
        }
    },
};

const settingsAdapter = {
    key: "cometclock.settings",
    async load() {
        try {
            const raw = localStorage.getItem(this.key);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            console.warn("Failed to load settings from localStorage", e);
            return null;
        }
    },
    async save(settings) {
        try {
            localStorage.setItem(this.key, JSON.stringify(settings));
        } catch (e) {
            console.warn("Failed to save settings to localStorage", e);
        }
    },
};

// Ensure a task object has the expected fields (migration helper)
function ensureTaskShape(t) {
    const makeId = () =>
        typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `t-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    return {
        id: t.id || makeId(),
        name: t.name || "",
        dueDate: t.dueDate || "",
        dueTime: t.dueTime || "",
        dateAdded: t.dateAdded || new Date().toISOString(),
        notes: String(t.notes || ""),
        completed: Boolean(t.completed),
        recurrenceId: t.recurrenceId || "",
        recurrence: t.recurrence || "none",
        recurrenceInterval: Number.isInteger(t.recurrenceInterval)
            ? t.recurrenceInterval
            : 1,
    };
}

function noAssignmentsText() {
    if (taskList.length === 0) {
        const container = document.getElementById("taskList");
        container.innerHTML = "";

        const emptyState = document.createElement("div");
        emptyState.className = "empty-state";
        emptyState.innerHTML =
            'You have no assignments! 🎉<br>Click "+" to create one';
        container.appendChild(emptyState);
    }
}

function applyTheme() {
    const isLight = userSettings.theme === "light";
    document.body.classList.toggle("light-mode", isLight);

    const themeToggleButton = document.getElementById("themeToggleButton");
    if (themeToggleButton) {
        themeToggleButton.innerHTML = isLight
            ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sun-icon lucide-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`
            : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-moon-icon lucide-moon"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/></svg>`;
    }
}

function getDurationText(timeLeft, includeSeconds = true) {
    const absoluteTimeLeft = Math.max(0, Math.abs(timeLeft));
    const days = Math.floor(absoluteTimeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor(absoluteTimeLeft / (1000 * 60 * 60)) % 24;
    const minutes = Math.floor(absoluteTimeLeft / (1000 * 60)) % 60;
    const seconds = Math.floor(absoluteTimeLeft / 1000) % 60;

    const parts = [
        `${days}d`,
        `${hours}h`,
        `${minutes}m`,
    ];

    if (includeSeconds) {
        parts.push(`${seconds}s`);
    }

    return parts.join(" ");
}

async function loadSettings() {
    const savedSettings = await settingsAdapter.load();
    if (savedSettings && typeof savedSettings === "object") {
        userSettings = {
            ...userSettings,
            ...savedSettings,
        };
    }

    const showSecondsToggle = document.getElementById("showSecondsToggle");
    if (showSecondsToggle) {
        showSecondsToggle.checked = Boolean(userSettings.showSeconds);
        showSecondsToggle.addEventListener("change", async (event) => {
            userSettings.showSeconds = event.target.checked;
            await settingsAdapter.save(userSettings);
            renderTasks();
        });
    }

    applyTheme();
}

async function saveSettings() {
    await settingsAdapter.save(userSettings);
}

function openSettingsModal() {
    document.getElementById("settingsModal").classList.add("open");
}

function closeSettingsModal() {
    document.getElementById("settingsModal").classList.remove("open");
}

function openInfoModal() {
    document.getElementById("infoModal").classList.add("open");
}

function closeInfoModal() {
    document.getElementById("infoModal").classList.remove("open");
}

async function toggleTheme() {
    userSettings.theme = userSettings.theme === "dark" ? "light" : "dark";
    applyTheme();
    await saveSettings();
}

function updateSortDirectionButton(button) {
    if (!button) return;

    button.innerHTML =
        currentSortDirection === "asc"
            ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-down-icon lucide-arrow-down"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>`
            : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-up-icon lucide-arrow-up"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>`;
}

function getLocalDateValue(referenceDate = new Date()) {
    const year = referenceDate.getFullYear();
    const month = String(referenceDate.getMonth() + 1).padStart(2, "0");
    const day = String(referenceDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function setCreateTaskDefaults() {
    const dueDateInput = document.getElementById("dueDate");
    const dueTimeInput = document.getElementById("dueTime");
    const recurrenceInput = document.getElementById("recurrence");
    const recurrenceEndDateInput = document.getElementById("recurrenceEndDate");

    if (dueDateInput) {
        dueDateInput.value = getLocalDateValue();
    }

    if (dueTimeInput) {
        dueTimeInput.value = "23:59";
    }

    if (recurrenceInput) {
        recurrenceInput.value = "none";
    }

    if (recurrenceEndDateInput) {
        recurrenceEndDateInput.value = "";
    }

    toggleRecurrenceEndDate();
}

function toggleRecurrenceEndDate() {
    const recurrenceInput = document.getElementById("recurrence");
    const endDateRow = document.getElementById("recurrenceEndDateRow");
    const customRecurrenceRow = document.getElementById("customRecurrenceRow");
    const endDateInput = document.getElementById("recurrenceEndDate");
    const intervalInput = document.getElementById("recurrenceInterval");
    const isRecurring = recurrenceInput && recurrenceInput.value !== "none";
    const isCustom = recurrenceInput && recurrenceInput.value === "custom";

    if (endDateRow) {
        endDateRow.hidden = !isRecurring;
    }

    if (endDateInput) {
        endDateInput.required = Boolean(isRecurring);
    }

    if (customRecurrenceRow) {
        customRecurrenceRow.hidden = !isCustom;
    }

    if (intervalInput) {
        intervalInput.required = Boolean(isCustom);
    }
}

function addAssignmentButtonClicked() {
    setCreateTaskDefaults();
    document.getElementById("creationWindow").classList.add("open");
}

function closeCreateTaskModal() {
    document.getElementById("creationWindow").classList.remove("open");
}

async function loadTasks() {
    const raw = await storageAdapter.load();
    taskList = (raw || []).map(ensureTaskShape);
    renderTasks();
}

function renderTasks() {
    const container = document.getElementById("taskList");
    container.innerHTML = "";
    if (taskList.length === 0) {
        noAssignmentsText();
        return;
    }
    const sortedTasks = getSortedTasks(
        taskList,
        currentSortField,
        currentSortDirection,
    );
    sortedTasks.forEach((task) => {
        const el = document.createElement("div");
        el.className = "task-item";
        el.dataset.taskId = task.id;
        if (task.completed) {
            el.classList.add("completed");
        }

        const taskText = buildTaskText(task);
        updateTaskItemState(el, task);

        const content = document.createElement("div");
        content.className = "task-content";
        const hasNote = String(task.notes || "").trim().length > 0;
        if (hasNote) {
            content.classList.add("expandable");
            content.tabIndex = 0;
            content.setAttribute("role", "button");
            content.setAttribute("aria-label", `Show note for ${task.name}`);
            content.setAttribute("aria-expanded", "false");
        }
        const summary = document.createElement("div");
        summary.className = "task-summary";
        summary.innerHTML = taskText.replace(/\n/g, "<br>");

        if (hasNote) {
            const note = document.createElement("div");
            note.className = "task-note";
            note.hidden = true;
            note.textContent = task.notes;

            const toggleDetails = () => {
                const isExpanded = !note.hidden;
                note.hidden = isExpanded;
                content.setAttribute("aria-expanded", String(!isExpanded));
                el.classList.toggle("expanded", !isExpanded);
            };
            content.addEventListener("click", toggleDetails);
            content.addEventListener("keydown", (event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                toggleDetails();
            });
            content.appendChild(note);
        }

        const actions = document.createElement("div");
        actions.className = "task-action-buttons";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "task-action-btn";
        editButton.setAttribute("aria-label", "Edit task");
        editButton.dataset.tooltip = "Edit task";
        editButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>`;
        editButton.addEventListener("click", (event) => {
            event.stopPropagation();
            openTaskModal(task.id);
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "task-action-btn delete-btn";
        deleteButton.setAttribute("aria-label", "Delete task");
        deleteButton.dataset.tooltip = "Delete task";
        deleteButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
        deleteButton.addEventListener("click", async (event) => {
            event.stopPropagation();
            await deleteTask(task.id);
        });

        const completeButton = document.createElement("button");
        completeButton.type = "button";
        completeButton.className = "task-action-btn complete-btn";
        const completionLabel = task.completed
            ? "Mark as not complete"
            : "Mark as complete";
        completeButton.setAttribute("aria-label", completionLabel);
        completeButton.dataset.tooltip = completionLabel;
        completeButton.innerHTML = task.completed
            ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`
            : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`;
        completeButton.addEventListener("click", async (event) => {
            event.stopPropagation();
            await toggleTaskCompletion(task.id);
        });

        actions.appendChild(editButton);
        actions.appendChild(deleteButton);
        actions.appendChild(completeButton);
        content.prepend(summary);
        el.appendChild(content);
        el.appendChild(actions);
        container.appendChild(el);
    });
}

function buildTaskText(task) {
    const timeLeft = timeRemaining(task);
    const dateString = convertDate(task);
    const dueInfo = `Due on the ${dateString} at ${convertTime(task)}`;
    const noteIndicator = String(task.notes || "").trim()
        ? '<span class="task-note-indicator" aria-label="Has notes">📎</span> '
        : "";
    const taskName = `${noteIndicator}<strong>${task.name}</strong>`;

    if (task.completed) {
        return `✅ ${taskName}\n${dueInfo} (Done!)`;
    }

    if (timeLeft < 0) {
        return `❌ ${taskName}\n${dueInfo} (Overdue by ${getDurationText(timeLeft, userSettings.showSeconds)})`;
    }

    return `${timeLeft <= 3 * 24 * 60 * 60 * 1000 ? "⏰ " : ""}${taskName}\n${dueInfo} (${getDurationText(timeLeft, userSettings.showSeconds)} remaining)`;
}

function updateTaskItemState(el, task) {
    const timeLeft = timeRemaining(task);
    el.classList.toggle("completed", task.completed);
    el.classList.toggle("overdue", !task.completed && timeLeft < 0);
    el.classList.toggle(
        "due-soon",
        !task.completed && timeLeft >= 0 && timeLeft <= 3 * 24 * 60 * 60 * 1000,
    );
}

function refreshTaskCountdowns() {
    const container = document.getElementById("taskList");
    if (!container) return;

    taskList.forEach((task) => {
        const el = container.querySelector(`[data-task-id="${task.id}"]`);
        if (!el) return;

        updateTaskItemState(el, task);

        const summary = el.querySelector(".task-summary");
        if (summary) {
            summary.innerHTML = buildTaskText(task).replace(/\n/g, "<br>");
        }
    });
}

function getSortedTasks(tasks, field, direction = "asc") {
    const sorted = [...tasks];

    const dueTimestamp = (task) =>
        new Date(`${task.dueDate}T${task.dueTime || "23:59"}`).getTime();
    const createdTimestamp = (task) => new Date(task.dateAdded || 0).getTime();
    const nameValue = (task) => (task.name || "").toLowerCase();

    const multiplier = direction === "asc" ? 1 : -1;

    if (field === "due") {
        sorted.sort((a, b) => (dueTimestamp(a) - dueTimestamp(b)) * multiplier);
    } else if (field === "name") {
        sorted.sort(
            (a, b) => nameValue(a).localeCompare(nameValue(b)) * multiplier,
        );
    } else if (field === "created") {
        sorted.sort(
            (a, b) => (createdTimestamp(a) - createdTimestamp(b)) * multiplier,
        );
    }

    return sorted;
}

async function saveTasks() {
    await storageAdapter.save(taskList);
}

async function createTask() {
    const assignmentName = document.getElementById("nameInput").value.trim();
    const assignmentNotes = document
        .getElementById("notesInput")
        .value.trim();
    const assignmentDate = document.getElementById("dueDate").value;
    const assignmentTime = document.getElementById("dueTime").value;
    const recurrence = document.getElementById("recurrence").value;
    const recurrenceEndDate =
        document.getElementById("recurrenceEndDate").value;
    const recurrenceInterval = Number.parseInt(
        document.getElementById("recurrenceInterval").value,
        10,
    );

    const makeId = () =>
        typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `t-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    if (!assignmentName) {
        alert("Task Name cannot be empty.");
        return;
    }

    if (!assignmentDate || !assignmentTime) {
        alert("Due date and time are required.");
        return;
    }

    if (recurrence !== "none" && !recurrenceEndDate) {
        alert("Choose an end date for the recurring task.");
        return;
    }

    if (
        recurrence === "custom" &&
        (!Number.isInteger(recurrenceInterval) || recurrenceInterval < 1)
    ) {
        alert("The custom interval must be a whole number of at least 1 day.");
        return;
    }

    if (
        recurrence !== "none" &&
        new Date(`${recurrenceEndDate}T00:00`) <
            new Date(`${assignmentDate}T00:00`)
    ) {
        alert("The recurrence end date must be on or after the first due date.");
        return;
    }

    const recurrenceId = recurrence === "none" ? "" : makeId();
    const tasksToCreate = [];
    let occurrenceDate = new Date(`${assignmentDate}T00:00`);
    const monthlyDay = occurrenceDate.getDate();
    const endDate =
        recurrence === "none"
            ? occurrenceDate
            : new Date(`${recurrenceEndDate}T00:00`);

    while (occurrenceDate <= endDate) {
        tasksToCreate.push({
            id: makeId(),
            name: assignmentName,
            dueDate: getLocalDateValue(occurrenceDate),
            dueTime: assignmentTime,
            dateAdded: new Date().toISOString(),
            notes: assignmentNotes,
            completed: false,
            recurrenceId,
            recurrence,
            recurrenceInterval: recurrence === "custom" ? recurrenceInterval : 1,
        });

        if (recurrence === "none") break;
        if (recurrence === "daily") {
            occurrenceDate.setDate(occurrenceDate.getDate() + 1);
        } else if (recurrence === "weekly") {
            occurrenceDate.setDate(occurrenceDate.getDate() + 7);
        } else if (recurrence === "fortnightly") {
            occurrenceDate.setDate(occurrenceDate.getDate() + 14);
        } else if (recurrence === "monthly") {
            const nextMonth = occurrenceDate.getMonth() + 1;
            const lastDayOfNextMonth = new Date(
                occurrenceDate.getFullYear(),
                nextMonth + 1,
                0,
            ).getDate();
            occurrenceDate = new Date(
                occurrenceDate.getFullYear(),
                nextMonth,
                Math.min(monthlyDay, lastDayOfNextMonth),
            );
        } else {
            occurrenceDate.setDate(
                occurrenceDate.getDate() + recurrenceInterval,
            );
        }
    }

    if (taskList.length === 0) {
        document.getElementById("taskList").textContent = "";
    }
    taskList.push(...tasksToCreate);
    document.getElementById("nameInput").value = "";
    document.getElementById("notesInput").value = "";
    document.getElementById("dueDate").value = "";
    document.getElementById("dueTime").value = "";
    document.getElementById("recurrence").value = "none";
    document.getElementById("recurrenceEndDate").value = "";
    document.getElementById("recurrenceInterval").value = "3";
    toggleRecurrenceEndDate();
    closeCreateTaskModal();
    renderTasks();
    await saveTasks();
}

function findTaskById(taskId) {
    return taskList.find((t) => t.id === taskId);
}

function openTaskModal(taskId) {
    const task = findTaskById(taskId);
    if (!task) return;

    selectedTaskId = taskId;
    document.getElementById("modalTaskName").value = task.name || "";
    document.getElementById("modalDueDate").value = task.dueDate || "";
    document.getElementById("modalDueTime").value = task.dueTime || "";
    document.getElementById("modalTaskNotes").value = task.notes || "";

    document.getElementById("taskModal").classList.add("open");
}

function closeTaskModal() {
    selectedTaskId = null;
    document.getElementById("taskModal").classList.remove("open");
}

async function saveTaskEdits() {
    if (!selectedTaskId) return;
    const task = findTaskById(selectedTaskId);
    if (!task) return;

    const name = document.getElementById("modalTaskName").value.trim();
    if (!name) {
        alert("Task Name cannot be empty.");
        return;
    }

    task.name = name;
    task.dueDate = document.getElementById("modalDueDate").value;
    task.dueTime = document.getElementById("modalDueTime").value;
    task.notes = document.getElementById("modalTaskNotes").value;

    await saveTasks();
    renderTasks();
    closeTaskModal();
}

async function toggleTaskCompletion(taskId) {
    const task = findTaskById(taskId);
    if (!task) return;

    task.completed = !task.completed;
    await saveTasks();
    renderTasks();
}

async function deleteTask(taskId) {
    if (!taskId) return;
    const confirmed = confirm("Delete this task? This cannot be undone.");
    if (!confirmed) return;

    taskList = taskList.filter((t) => t.id !== taskId);
    await saveTasks();
    renderTasks();
    if (selectedTaskId === taskId) {
        closeTaskModal();
    }
}

async function deleteSelectedTask() {
    if (!selectedTaskId) return;
    await deleteTask(selectedTaskId);
}

// Export current tasks as a JSON file
function exportTasks() {
    const filename = `cometclock-tasks-${new Date().toISOString().slice(0, 10)}.json`;
    const data = JSON.stringify(taskList, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
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
                alert("Imported file must be a JSON array of tasks.");
                return;
            }
            if (taskList.length > 0) {
                const keep = confirm(
                    "Replace current tasks with imported tasks? Click Cancel to merge instead.",
                );
                if (keep) {
                    taskList = parsed;
                } else {
                    // merge: append items that don't already exist (prefer id, fallback to name+due)
                    parsed.forEach((orig) => {
                        const t = ensureTaskShape(orig);
                        const dupById = taskList.some((et) => et.id === t.id);
                        const dupByFields = taskList.some(
                            (et) =>
                                et.name === t.name &&
                                et.dueDate === t.dueDate &&
                                et.dueTime === t.dueTime,
                        );
                        if (!dupById && !dupByFields) taskList.push(t);
                    });
                }
            } else {
                taskList = parsed.map(ensureTaskShape);
            }
            saveTasks();
            renderTasks();
            alert("Import successful.");
        } catch (err) {
            console.error(err);
            alert("Failed to parse JSON file.");
        }
    };
    reader.readAsText(file);
}

// Wire hidden file input
const importInput = document.getElementById("importFile");
if (importInput) {
    importInput.addEventListener("change", (ev) => {
        const f = ev.target.files && ev.target.files[0];
        if (f) importTasksFromFile(f);
        // reset so the same file can be re-selected later
        importInput.value = "";
    });
}

function lightMode() {
    document.body.classList.toggle("light-mode");
    const btn = document.querySelector("#lightMode");
    if (document.body.classList.contains("light-mode")) {
        btn.textContent = "🌑";
    } else {
        btn.textContent = "🌕";
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
    return { days: days, hours: hours, minutes: minutes, seconds: seconds };
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
        10: "October",
        11: "November",
        12: "December",
    };

    const dateArray = taskInfo.dueDate.split("-");
    const year = dateArray[0];
    const month = monthNames[dateArray[1]];
    const day = Number(dateArray[2]);

    return `${day}${daySuffix(day)} of ${month} ${year}`;
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

    return `${hour}:${min}${timeSuffix}`;
}

function daySuffix(day) {
    let suffix;
    if (day === 11 || day === 12 || day === 13) {
        suffix = "th";
    } else if (day % 10 === 1) {
        suffix = "st";
    } else if (day % 10 === 2) {
        suffix = "nd";
    } else if (day % 10 === 3) {
        suffix = "rd";
    } else {
        suffix = "th";
    }
    return suffix;
}
