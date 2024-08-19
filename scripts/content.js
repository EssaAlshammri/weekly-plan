console.log("content.js loaded");

if (chrome && chrome.runtime) {
  console.log("chrome.runtime is available");
} else {
  console.error("chrome.runtime is not available");
}

var buttonPosition = document.querySelector(".page-title");
const csrfTokenW = document.getElementById("csrfid").value
if (buttonPosition) {
  console.log("Button position found, inserting createPlanBtn...");
  var createPlanBtn = document.createElement("button");

  createPlanBtn.innerHTML =
    "تجميع الخطة الاسبوعية <i class='fa-regular fa-calendar-days'></i>";
  createPlanBtn.className = "btn btn-primary";

  createPlanBtn.onclick = function () {
    console.log("createPlanBtn clicked, initiating getWeeklyPlan...");
    getWeeklyPlan();

    createPlanBtn.innerHTML = "يرجى الانتظار";
    createPlanBtn.className = "btn btn-primary disabled";
  };

  buttonPosition.insertAdjacentElement("afterend", createPlanBtn);
} else {
  console.warn("Button position not found, createPlanBtn not inserted.");
}

async function getWeeklyPlan() {
  try {
    console.log("getWeeklyPlan started...");
    const schoolId = await getSchoolIdFromCookies();
    console.log("School ID retrieved:", schoolId);
    if (!schoolId) {
      console.error("No school ID found.");
      return;
    }
    const teachersIds = await getAllTeachersIds(schoolId);
    console.log("Teachers IDs retrieved:", teachersIds);
    const sundayDate = getSundayDate();
    const teachersTimeTables = await getAllTeachersTimeTables(teachersIds, sundayDate, schoolId)
    console.log(teachersTimeTables)
  } catch (error) {
    console.error("Error in getWeeklyPlan:", error);
  }
}

async function getAllTeachersIds(schoolId, page = 1) {
  let teachersPageUrl = `https://schools.madrasati.sa/SchoolManagment/Teachers?SchoolId=${schoolId}`;
  if (page > 1) {
    teachersPageUrl += `&PageNumber=${page}`;
  }

  console.log(`Fetching teachers data from page ${page}...`, teachersPageUrl);

  try {
    const response = await fetch(teachersPageUrl);
    const data = await response.text();
    console.log("Teachers page data retrieved for page", page);

    const parser = new DOMParser();
    const teachersDoc = parser.parseFromString(data, "text/html");

    const teacherLinks = teachersDoc.querySelectorAll(
      'a[href^="/SchoolManagment/Teachers/ManageTeacherCourses"]'
    );

    const teacherIds = Array.from(teacherLinks).map((link) => {
      const href = link.getAttribute("href");
      const urlParams = new URLSearchParams(href.split("?")[1]);
      return urlParams.get("Teacherid");
    });

    console.log("Teacher IDs extracted from page", page, teacherIds);

    const paginationInfo = teachersDoc.querySelector(".pagination-page-info");
    let maxPage = 1;
    if (paginationInfo) {
      const pageInfoText = paginationInfo.textContent;
      const match = pageInfoText.split(" ");
      if (match) {
        maxPage = parseInt(match[match.length - 1]);
      }
    }

    if (page < maxPage) {
      console.log(`Page ${page} completed. Fetching next page...`);
      const nextPageIds = await getAllTeachersIds(schoolId, page + 1);
      return [...teacherIds, ...nextPageIds];
    }

    console.log("All pages fetched. Returning teacher IDs...");
    return teacherIds;
  } catch (error) {
    console.error("Error fetching teacher data:", error);
    return [];
  }
}

function getSchoolIdFromCookies() {
  return new Promise((resolve, reject) => {
    console.log("Requesting school ID from cookies...");
    chrome.runtime.sendMessage({ action: "getCookie" }, function (response) {
      if (response.value) {
        console.log("School ID retrieved from cookies:", response.value);
        resolve(response.value);
      } else {
        console.warn("No school ID found in cookies.");
        resolve(null);
      }
    });
  });
}

function getSundayDate(today = new Date()) {
  const dayOfWeek = today.getDay();
  let targetSunday = new Date(today);

  if (dayOfWeek >= 0 && dayOfWeek <= 4) {
    targetSunday.setDate(today.getDate() - dayOfWeek);
  } else {
    targetSunday.setDate(today.getDate() + (7 - dayOfWeek));
  }

  targetSunday.setHours(6, 0, 0, 0);

  const formattedDate = targetSunday.toLocaleString("en-SA", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log("Calculated Sunday date:", formattedDate);
  return formattedDate;
}

async function getAllTeachersTimeTables(teacherIds, sundayDate, schoolId) {
  for (const teacherId of teacherIds) {
    try {

      let response = await fetch("https://schools.madrasati.sa/SchoolManagment/Lessons/GetCal", {
        headers: {
          "content-type": "application/json; charset=utf-8",
          requestverificationtoken: csrfTokenW
        },
        body: JSON.stringify({ Date: sundayDate, index: 0, schoolId: schoolId, TechearId: teacherId }),
        method: "POST",
        mode: "cors",
        credentials: "include"
      });
      let data = await response.json();
      console.log(data)
    } catch (error) {
      console.log(error)
      return []
    }

  }
  return 1
}
