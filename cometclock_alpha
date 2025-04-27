import json
import os
from datetime import datetime
import tkinter as tk
from tkinter import messagebox

month_to_number = {
    "january": "01", "february": "02", "march": "03", "april": "04", "may": "05", "june": "06",
    "july": "07", "august": "08", "september": "09", "october": "10", "november": "11", "december": "12"
}

month_days = {
    "01": 31, "02": 29, "03": 31, "04": 30, "05": 31, "06": 30, "07": 31, "08": 31, "09": 30,
    "10": 31, "11": 30, "12": 31
}

assignments = []

def load_assignments():
    if os.path.exists("assignments.json"):
        with open("assignments.json", "r") as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []
    return []

def save_assignments():
    with open("assignments.json", "w") as f:
        json.dump(assignments, f, indent=4)

def get_time_left(due_str):
    try:
        due = datetime.strptime(due_str, "%Y-%m-%d %H:%M")
    except ValueError as e:
        return "Invalid date format"
    
    now = datetime.now()
    difference = due - now
    if difference.total_seconds() < 0:
        return "Done! ✅"
    days = difference.days
    hours, rem = divmod(difference.seconds, 3600)
    minutes = rem // 60
    return f"{days}d {hours}h {minutes}m left"

def add_assignment(name, due_date):
    assignments.append({"name": name, "due": due_date})
    save_assignments()
    update_assignment_list()

def delete_assignment(idx):
    if idx < len(assignments):
        deleted_assignment = assignments.pop(idx)
        save_assignments()
        update_assignment_list()
        messagebox.showinfo("Deleted", f"Deleted assignment '{deleted_assignment['name']}'")

def update_assignment_list():
    for widget in assignment_list_frame.winfo_children():
        widget.destroy()
    
    if not assignments:
        no_assignments_label = tk.Label(assignment_list_frame, text="No assignments added.")
        no_assignments_label.pack()

    for idx, assignment in enumerate(assignments):
        time_left = get_time_left(assignment["due"])
        assignment_label = tk.Label(assignment_list_frame, text=f"{assignment['name']} - Due: {assignment['due']} - {time_left}")
        assignment_label.pack()

        delete_button = tk.Button(assignment_list_frame, text="Delete", command=lambda idx=idx: delete_assignment(idx))
        delete_button.pack()

def show_add_assignment_dialog():
    def add():
        name = name_entry.get()
        due_date = due_date_entry.get()
        add_assignment(name, due_date)
        add_window.destroy()

    add_window = tk.Toplevel(window)
    add_window.title("Add Assignment")
    
    name_label = tk.Label(add_window, text="Assignment Name:")
    name_label.pack()
    name_entry = tk.Entry(add_window)
    name_entry.pack()

    due_date_label = tk.Label(add_window, text="Due Date (YYYY-MM-DD HH:MM):")
    due_date_label.pack()
    due_date_entry = tk.Entry(add_window)
    due_date_entry.pack()

    add_button = tk.Button(add_window, text="Add Assignment", command=add)
    add_button.pack()

window = tk.Tk()
window.title("Assignment Tracker")

assignment_list_frame = tk.Frame(window)
assignment_list_frame.pack()

add_button = tk.Button(window, text="Add Assignment", command=show_add_assignment_dialog)
add_button.pack()

view_button = tk.Button(window, text="View Assignments", command=update_assignment_list)
view_button.pack()

assignments = load_assignments()

window.mainloop()
