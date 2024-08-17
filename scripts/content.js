{
  /* <button class="btn btn-primary">
  تجميع الخطة الاسبوعية <i class="fa-regular fa-calendar-days"></i>
</button>; */
}

console.log("content.js loaded outside");

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

function getWeeklyPlan() {
  const schoolId = getSchoolIdFromCookies();
  console.log(schoolId, "heloooooooooooo");
}

function getCurrentUrl() {
  return window.location.href;
}

function getSchoolIdFromCookies() {
  console.log("getting school id from cookies");
  let sid;
  chrome.runtime.sendMessage({ action: "getCookie" }, function (response) {
    if (response.value) {
      console.log(response.value);
      sid = response.value;
    }
  });

  return sid;
}
