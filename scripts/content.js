console.log("content.js loaded");

if (chrome && chrome.runtime) {
  console.log("chrome.runtime is available");
} else {
  console.error("chrome.runtime is not available");
}

var buttonPosition = document.querySelector(".ibox.fadeInRight");
if (buttonPosition) {
  var createPlanBtn = document.createElement("button");

  createPlanBtn.innerHTML =
    "تجميع الخطة الاسبوعية <i class='fa-regular fa-calendar-days'></i>";
  createPlanBtn.className = "btn btn-primary";

  createPlanBtn.onclick = function () {
    getWeeklyPlan();

    createPlanBtn.innerHTML = "يرجى الانتظار";
    createPlanBtn.className = "btn btn-primary disabled";
  };

  buttonPosition.insertAdjacentElement("afterend", createPlanBtn);
}

async function getWeeklyPlan() {
  try {
    const schoolId = await getSchoolIdFromCookies();
    const teachersIds = await getAllTeachersIds(schoolId);
  } catch (error) {
    console.error("Error retrieving school ID:", error);
  }
}

async function getAllTeachersIds(schoolId, page = 1) {
  let teachersPageUrl = `https://schools.madrasati.sa/SchoolManagment/Teachers?SchoolId=${schoolId}`;
  if (page > 1) {
    teachersPageUrl += `&PageNumber=${page}`;
  }

  try {
    const response = await fetch(teachersPageUrl);
    const data = await response.text();

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
      const nextPageIds = await getAllTeachersIds(schoolId, page + 1);
      return [...teacherIds, ...nextPageIds];
    }

    return teacherIds;
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
}

function getSchoolIdFromCookies() {
  return new Promise((resolve, reject) => {
    console.log("getting school id from cookies");
    chrome.runtime.sendMessage({ action: "getCookie" }, function (response) {
      if (response.value) {
        console.log(response.value);
        resolve(response.value);
      } else {
        resolve(null);
      }
    });
  });
}
