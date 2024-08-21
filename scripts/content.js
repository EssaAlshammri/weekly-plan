console.log("content.js loaded");

if (chrome && chrome.runtime) {
  console.log("chrome.runtime is available");
} else {
  console.error("chrome.runtime is not available");
}

var buttonPosition = document.querySelector(".page-title");
const csrfTokenW = document.getElementById("csrfid").value;
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
    const subjectsMapping = await getSubjectsMapping(schoolId);
    const teachersIds = await getAllTeachersIds(schoolId);
    const sundayDate = getSundayDate();
    const teachersTimeTables = await getAllTeachersTimeTables(
      teachersIds,
      sundayDate,
      schoolId
    );

    const addedPeriods = await getAddedPeriodsOnly(teachersTimeTables);
    const cleanedTimeTable = await keepOneLesson(addedPeriods);
    const timeTableSubjectsOnly = getTimeTableSubjectsOnly(cleanedTimeTable);

    const TimeTable = addTimetableEntries(
      subjectsMapping,
      timeTableSubjectsOnly
    );
    console.log(sundayDate);
    await getTimeTableDetails(TimeTable);
    console.log(TimeTable);

    chrome.runtime.sendMessage({
      action: "openWeeklyPlanTab",
      teachersTimeTables: teachersTimeTables,
    });
  } catch (error) {
    console.error("Error in getWeeklyPlan:", error);
  }
}

async function getLessonAndGoalsIds(data) {
  const parser = new DOMParser();
  const periodDoc = parser.parseFromString(data, "text/html");
  const scripts = periodDoc.querySelectorAll("script");

  for (let i = 0; i < scripts.length; i++) {
    let scriptContent = scripts[i].textContent || scripts[i].innerText;

    if (
      scriptContent.includes(
        "AddDataToSelectedLesssonPlayerListAndRanderHtmlData"
      )
    ) {
      let jsonStartIndex = scriptContent.indexOf("[{");
      let jsonEndIndex = scriptContent.indexOf("] || []");

      if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
        let jsonData = JSON.parse(
          `${scriptContent.substring(jsonStartIndex, jsonEndIndex)}]`
        );
        return {
          LectureClassId: periodDoc.getElementById("Id").value,
          lessonId: jsonData[0].lesssonId,
          goalsIds: jsonData[0].goalsIds,
        };
      }
    }
  }
}

async function getGoalsText(lessonAndGoalsIds) {
  const goalsText = [];
  try {
    const formData = new URLSearchParams({
      LectureClassId: lessonAndGoalsIds["LectureClassId"],
      CopyMode: "False",
      lessonId: lessonAndGoalsIds["lessonId"],
      "LessonGoalsAndActivity[0][lesssonId]": lessonAndGoalsIds["lessonId"],
    });
    for (const id of lessonAndGoalsIds["goalsIds"]) {
      formData.append("LessonGoalsAndActivity[0][goalsIds][]", id);
    }
    const response = await fetch(
      "https://schools.madrasati.sa/Teacher/LectureTools/GetLessonPlayerForComponent",
      {
        headers: {
          requestverificationtoken: csrfTokenW,
        },
        body: formData,
        method: "POST",
        mode: "cors",
        credentials: "include",
      }
    );
    const data = await response.text();

    const parser = new DOMParser();
    const periodDoc = parser.parseFromString(data, "text/html");
    const goals = periodDoc.querySelectorAll('label[for^="goal_"]');

    for (const goal of goals) {
      goalsText.push(goal.innerText);
    }
    return goalsText;
  } catch (error) {
    console.log(error);
  }
}

async function processTimetableEntries(entry) {
  const result = {};
  try {
    const response = await fetch(
      `https://schools.madrasati.sa/Teacher/Lessons/viewLectureDetails?Data=${entry["data"]}`
    );
    const data = await response.text();
    const lessonAndGoalsIds = await getLessonAndGoalsIds(data);
    const goalsText = await getGoalsText(lessonAndGoalsIds);
    // const parser = new DOMParser();
    // const periodDoc = parser.parseFromString(data, "text/html");
    // const goals = periodDoc.querySelectorAll('label[for^="goal_"]');

    result["goals"] = goalsText;
  } catch (error) {
    console.log(error);
  }
  return result;
}

async function addProcessedResult(entries) {
  for (const entry of entries) {
    entry.processedResult = await processTimetableEntries(entry);
  }
}

async function getTimeTableDetails(TimeTable) {
  for (const grade in TimeTable) {
    if (TimeTable.hasOwnProperty(grade)) {
      for (const subject of TimeTable[grade]) {
        await addProcessedResult(subject.timetableEntries);
        // console.log(subject.timetableEntries)
      }
    }
  }
}

async function getAllTeachersIds(schoolId, page = 1) {
  let teachersPageUrl = `https://schools.madrasati.sa/SchoolManagment/Teachers?SchoolId=${schoolId}`;
  if (page > 1) {
    teachersPageUrl += `&PageNumber=${page}`;
  }

  console.log(`Fetching teachers data from page ${page}...`);

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
  const teachersTimeTables = {};
  for (const teacherId of teacherIds) {
    teachersTimeTables[teacherId] = {};
    for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
      try {
        let response = await fetch(
          "https://schools.madrasati.sa/SchoolManagment/Lessons/GetCal",
          {
            headers: {
              "content-type": "application/json; charset=utf-8",
              requestverificationtoken: csrfTokenW,
            },
            body: JSON.stringify({
              Date: sundayDate,
              index: dayIndex,
              schoolId: schoolId,
              TechearId: teacherId,
            }),
            method: "POST",
            mode: "cors",
            credentials: "include",
          }
        );
        let data = await response.json();
        if (data["TimeTable"].length > 0) {
          teachersTimeTables[teacherId][dayIndex] = data;
        }
      } catch (error) {
        console.log(error);
      }
    }
  }
  return teachersTimeTables;
}

async function getAddedPeriodsOnly(teachersTimeTables) {
  const addedPeriods = {};
  for (const [teacherId, timeTable] of Object.entries(teachersTimeTables)) {
    addedPeriods[teacherId] = {};
    if (Object.keys(timeTable).length > 0) {
      for (const [dayIndex, timeTableResponse] of Object.entries(timeTable)) {
        const timeTableDetails = timeTableResponse["TimeTable"];
        addedPeriods[teacherId][dayIndex] = [];
        for (const period of timeTableDetails) {
          if (period["LectureId"]) {
            addedPeriods[teacherId][dayIndex].push(period);
          }
        }
        if (addedPeriods[teacherId][dayIndex].length === 0) {
          delete addedPeriods[teacherId][dayIndex];
        }
      }
    }
    if (Object.keys(addedPeriods[teacherId]).length === 0) {
      delete addedPeriods[teacherId];
    }
  }
  return addedPeriods;
}

async function keepOneLesson(addedPeriods) {
  const result = {};

  // Iterate through the main object
  for (const key in addedPeriods) {
    if (addedPeriods.hasOwnProperty(key)) {
      const sections = addedPeriods[key];
      const seenLessonContentIds = new Set(); // To track seen LessonContentId

      for (const subKey in sections) {
        if (sections.hasOwnProperty(subKey)) {
          // Iterate through each array of objects
          sections[subKey] = sections[subKey].filter((item) => {
            // Check if the LessonContentId has been seen before
            if (seenLessonContentIds.has(item.LessonContentId)) {
              return false; // Exclude this item
            } else {
              seenLessonContentIds.add(item.LessonContentId); // Add to set
              return true; // Include this item
            }
          });
        }
      }

      // Remove empty arrays
      for (const subKey in sections) {
        if (sections.hasOwnProperty(subKey)) {
          if (sections[subKey].length === 0) {
            delete sections[subKey];
          }
        }
      }

      // If the sections object is empty after cleanup, delete it
      if (Object.keys(sections).length === 0) {
        delete result[key];
      } else {
        result[key] = sections;
      }
    }
  }
  return result;
}

async function getSubjectsMapping(schoolId) {
  const subjectsMapping = {};

  // these are for the first term only
  const gradeIds = {
    firstGrade: 40,
    secondGrade: 41,
    thirdGrade: 42,
  };

  try {
    for (const [grade, gradeId] of Object.entries(gradeIds)) {
      subjectsMapping[grade] = [];
      const response = await fetch(
        `https://schools.madrasati.sa/SchoolManagment/Subjects/GetSubjects?SchoolId=${schoolId}&treeId=${gradeId}`,
        {
          headers: {
            "content-type": "application/json; charset=utf-8",
            requestverificationtoken: csrfTokenW,
          },
          body: JSON.stringify({
            teacherId: null,
            parentId: "2",
            pageNumber: 1,
          }),
          method: "POST",
          mode: "cors",
          credentials: "include",
        }
      );
      const data = await response.json();
      const parser = new DOMParser();
      const subjectsDoc = parser.parseFromString(data["html"], "text/html");
      const subjectsElements = subjectsDoc.querySelector(
        ".ibox:not(.fadeInRight)"
      ).children;
      for (const subjectsElement of subjectsElements) {
        const subjectNameElement = subjectsElement.querySelector(
          ".allsubjects-box h3"
        );
        const subjectName = subjectNameElement
          ? subjectNameElement.textContent.split("-")[3].trim()
          : "Not found";

        // Get the subject ID from the links
        const subjectIdElement = subjectsElement.querySelector(
          '.contact-box-footer a[href*="SubjectId="]'
        );
        const url = subjectIdElement ? subjectIdElement.href : "";
        const urlParams = new URLSearchParams(new URL(url).search);
        const subjectId = urlParams.get("SubjectId") || "Not found";

        subjectsMapping[grade].push({ subjectName, subjectId });
      }
    }
  } catch (error) {
    console.log(error);
  }
  return cleanSubjects(subjectsMapping);
}

function cleanSubjects(subjectsMapping) {
  const subjectNamesToRemove = [
    "التربية الفنية",
    "التربية البدنية والدفاع عن النفس",
    "التجويد (التحفيظ)",
    "تأملات في الفن السعودي والعالمي",
    "الثقافة الموسيقية",
    "رسم قصص المانجا",
    "المقامات الشرقية",
  ];
  for (let grade in subjectsMapping) {
    subjectsMapping[grade] = subjectsMapping[grade].filter(
      (subject) => !subjectNamesToRemove.includes(subject.subjectName)
    );
  }
  return subjectsMapping;
}

function getTimeTableSubjectsOnly(cleanedTimeTable) {
  const timeTableSubjectsOnly = [];
  for (const days of Object.values(cleanedTimeTable)) {
    for (const lectures of Object.values(days)) {
      for (const lecture of lectures) {
        timeTableSubjectsOnly.push(lecture);
      }
    }
  }
  return timeTableSubjectsOnly;
}

function addTimetableEntries(grades, timetable) {
  const clonedGrades = JSON.parse(JSON.stringify(grades));

  for (const grade in clonedGrades) {
    clonedGrades[grade].forEach((subject) => {
      subject.timetableEntries = [];
      timetable.forEach((entry) => {
        if (entry.SubjectId === parseInt(subject.subjectId)) {
          subject.timetableEntries.push({
            subjectId: entry["SubjectId"],
            data: entry["Data"],
            title: entry["Title"],
          });
        }
      });
    });
  }

  return clonedGrades;
}
