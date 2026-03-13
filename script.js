let taskList = [];
noAssignmentsText(taskList);

function noAssignmentsText(taskList) {
    if (taskList.length == 0) {
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
    if (assignmentName == "") {
    }
    else {
        if (taskList.length == 0) {
            document.getElementById("taskList").innerText = ""
        }
        newTask.innerText = `${taskInfo.name} - Due: ${taskInfo.dueDate} at ${taskInfo.dueTime}`;
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
    btn.textContent = 'Dark Mode';
    } else {
    btn.textContent = 'Light Mode';
    }
}
/* 
- time remaining until due date
- better formatting for date and time display
- automatic refresh every second
- sort by due date, name, date added both forwards and backwards i.e. due soonest, due latest, a-z, z-a, recently added, added first/earliest
- autofill time and date etc. (1 week from current date, default 11:59pm, automatically detect year)
- space for additional info under each task e.g. links
*/