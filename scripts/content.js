console.log("content.js loaded");

// Example to test if chrome.runtime is accessible
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
  };

  buttonPosition.insertAdjacentElement("afterend", createPlanBtn);
}

async function getWeeklyPlan() {
  try {
    const schoolId = await getSchoolIdFromCookies();
  } catch (error) {
    console.error("Error retrieving school ID:", error);
  }
}

function getSchoolIdFromCookies() {
  return new Promise((resolve, reject) => {
    console.log("getting school id from cookies");
    chrome.runtime.sendMessage({ action: "getCookie" }, function (response) {
      if (response.value) {
        console.log(response.value);
        resolve(response.value); // Resolve the promise with the retrieved value
      } else {
        resolve(null); // Resolve the promise with null if the cookie is not found
      }
    });
  });
}
