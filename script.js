function createTask(nameInput, taskDueDate, taskDueTime, dateCreated) { // four parameters that will be helpful for tracking the tasks and also for sorting
    taskList.push(nameInput)
}

let taskList = [];

function noAssignmentsText(taskList) {
    if (taskList.length == 0) {
    document.getElementById("taskList").innerText = "You have no assignments! 🎉 \n Click 'Add Assignment' to create one"
    }
}

function addAssignmentButtonClicked() {
    const assignmentName = document.getElementById("nameInput").value;
    const newTask = document.createElement("p");
    if (assignmentName == "") {
    }
    else {
        if (taskList.length == 0) {
            document.getElementById("taskList").innerText = ""
        }
        newTask.innerText = assignmentName;
        document.getElementById("taskList").appendChild(newTask);
        document.getElementById("nameInput").value = "";
        taskList.push(assignmentName);
    }
}
noAssignmentsText(taskList);

function lightMode() {
    document.body.classList.toggle('light-mode');
    const btn = document.querySelector('lightMode');
    if (document.body.classList.contains('light-mode')) {
    btn.textContent = 'Dark Mode';
    } else {
    btn.textContent = 'Light Mode';
    }
}
/* 
- when you click Add Assignment button, open a popup (maybe integrated with device date and time system) where you have text entry fields for the assignment name, due date and time
- automatic refresh every second
- sort by due date, name, date added both forwards and backwards i.e. due soonest, due latest, a-z, z-a, recently added, added first/earliest
- autofill time and date etc. (1 week from current date, default 11:59pm, automatically detect year)
- space for additional info e.g. links
*/