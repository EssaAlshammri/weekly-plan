document.addEventListener("DOMContentLoaded", function () {
  chrome.runtime.sendMessage(
    { action: "getWeeklyPlanData" },
    function (response) {
      if (response && response.teachersTimeTables) {
        console.log("Weekly plan data received:", response.teachersTimeTables);
        displayWeeklyPlan(response.teachersTimeTables);
      } else {
        document.getElementById("plan-content").innerHTML =
          "No data available.";
      }
    }
  );
});

function displayWeeklyPlan(teachersTimeTables) {
  let html = "<table>";
  html += "<tr><th>Teacher ID</th><th>Day</th><th>Lessons</th></tr>";

  for (let teacherId in teachersTimeTables) {
    for (let dayIndex in teachersTimeTables[teacherId]) {
      let lessons = teachersTimeTables[teacherId][dayIndex];
      html += `<tr>
                <td>${teacherId}</td>
                <td>${getDayName(dayIndex)}</td>
                <td>${formatLessons(lessons)}</td>
            </tr>`;
    }
  }

  html += "</table>";
  document.getElementById("plan-content").innerHTML = html;
}

function getDayName(dayIndex) {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
  ];
  return days[dayIndex] || "Unknown";
}

function formatLessons(lessons) {
  if (!lessons || lessons.length === 0) return "No lessons";
  return lessons
    .map(
      (lesson) => `${lesson.Subject}: ${lesson.StartTime} - ${lesson.EndTime}`
    )
    .join("<br>");
}
