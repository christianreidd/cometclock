let taskList = [];
noAssignmentsText(taskList);

function noAssignmentsText(taskList) {
    if (taskList.length === 0) {
    document.getElementById("taskList").innerText = "You have no assignments! 🎉 \n Click 'Add Assignment' to create one"
    }
}

function addAssignmentButtonClicked() {
    document.getElementById("creationWindow").style.display = "block";
}

function createTask() {
    const assignmentName = document.getElementById("nameInput").value;
    const assignmentDate = document.getElementById("dueDate").value;
    const assignmentTime = document.getElementById("dueTime").value;

    const taskInfo  = {
        name: assignmentName,
        dueDate: assignmentDate,
        dueTime: assignmentTime
    };

    const newTask = document.createElement("p");
    if (assignmentName === "") {
    }
    else {
        if (taskList.length === 0) {
            document.getElementById("taskList").innerText = ""
        }
        const timeLeft = timeRemaining(taskInfo);
        const units = timeUnits(timeLeft);
        const dateString = convertDate(taskInfo);
        newTask.innerText = `${taskInfo.name} - Due on the ${dateString} at ${convertTime(taskInfo)} (${units.days}d ${units.hours}h ${units.minutes}m ${units.seconds}s remaining)`;
        document.getElementById("taskList").appendChild(newTask);
        document.getElementById("nameInput").value = "";
        document.getElementById("dueDate").value = "";
        document.getElementById("dueTime").value = "";  
        taskList.push(taskInfo);
    document.getElementById("creationWindow").style.display = "none";
    }
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
    // if negative timeLeft, overdue
    // else, show time remaining
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
    let hour = timeArray[0];
    const min = timeArray[1];
    let timeSuffix = "am";

    if ((hour - 12) >= 0) {
        if (hour != 12) {
            hour = hour - 12;
        }
        timeSuffix = "pm";
    }

    if (hour === 0) {
        hour = 12;
        timeSuffix = "am";
    }

    return `${hour}:${min} ${timeSuffix}`
}

function daySuffix(day) {
    let suffix;
    if (day === "11" || day === "12" || day === "13") {
        suffix = "th";
    } else if (day.slice(-1) === 1) {
        suffix = "st";
    } else if (day.slice(-1) === 2) {
        suffix = "nd";
    } else if (day.slice(-1) === 3) {
        suffix = "rd";
    } else {
        suffix = "th"
    }
    return suffix;
}