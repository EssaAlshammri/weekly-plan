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
  }
});
