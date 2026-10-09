# Starboard (Planning/Summary)

I'm adding a to-do list feature to my existing assignment tracker, which is plain JavaScript, HTML and CSS (no frameworks) with localStorage persistence.

Structure

A chain of day-lists (Today, Tomorrow, Day after tomorrow, in 3 days etc). user can add or remove days from the chain which all act as individual lsits that can cycle tasks between them.

A separate Long-term list that isn't part of the chain. Tasks stay there until I check them off.
Cycling

A "cycle" action shifts every list forward one step: list[i+1] moves into list[i], and the last list ends up empty.

Trigger it with a manual "cycle" button, and optionally automatically by comparing a stored last-seen date to today's date on page load.
Overdue

Before cycling, any unfinished task in Today gets an overdue: true flag.

Overdue tasks show a red label and carry into the new Today.
Storage

Save the lists (and the last-seen date, if using auto-cycle) in localStorage.
Later integration

Tasks could optionally reference a tracked assignment by ID, so they can show its due date or countdown.