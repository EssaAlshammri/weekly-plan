let weeklyPlanData = null;

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "getCookie") {
    chrome.cookies.get(
      { url: "https://schools.madrasati.sa", name: "SId" },
      function (cookie) {
        if (cookie) {
          sendResponse({ value: cookie.value });
        } else {
          sendResponse({ value: null });
        }
      }
    );
    return true;
  } else if (request.action === "openWeeklyPlanTab") {
    weeklyPlanData = request.result;
    chrome.tabs.create({ url: chrome.runtime.getURL("weekly_plan.html") });
  } else if (request.action === "getWeeklyPlanData") {
    sendResponse({ result: weeklyPlanData });
    weeklyPlanData = null; // Clear the data after sending
  }
});
