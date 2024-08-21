document.addEventListener("DOMContentLoaded", function () {
  chrome.runtime.sendMessage(
    { action: "getWeeklyPlanData" },
    function (response) {
      if (response && response.result) {
        console.log("Weekly plan data received:", response.result);
        displayWeeklyPlan(response.result);
      } else {
        document.getElementById("plan-content").innerHTML =
          "لا يوجد تجميعات الاسبوع الحالي.";
      }
    }
  );
});

function displayWeeklyPlan(result) {
  console.log("displayWeeklyPlan:", result["finalTimeTable"]);
  let html = "";
  const gradeMapping = {
    firstGrade: "اول متوسط",
    secondGrade: "ثاني متوسط",
    thirdGrade: "ثالث متوسط",
  };
  for (const [grade, subjects] of Object.entries(result["finalTimeTable"])) {
    html += `<div class="flex justify-between mb-1"> <h1 class="text-xs">الخطة الاسبوعية</h1> <h1 class="text-xs">${gradeMapping[grade]}</h1>  </div>`;
    html += "<table class='w-full border border-black mb-10'>";
    html += `<thead> <tr class="bg-[#2ca2a2] text-white"> <th class="border">اليوم</th> <th class="border">الأحد</th> <th class="border">الاثنين</th> <th class="border">الثلاثاء</th> <th class="border">الأربعاء</th> <th class="border">الخميس</th> </tr> </thead>`;
    html += `<tbody> <tr class="bg-[#2ca2a2] text-white"> <th class="border">التاريخ</th>`;
    for (const date of result["weekDates"]) {
      html += `<td class="border text-center">${date}</td>`;
    }
    for (const subject of subjects) {
      html += `<tr> <td class="border bg-[#b3a48c] text-white text-center text-wrap w-20">${subject["subjectName"]}</td>`;
      html += `<td class="border border-white bg-[#e8e8e8]" colspan="5"><p dir=${
        subject["subjectName"] === "Super Goal" ? "ltr" : "rtl"
      }> <span class="text-red-500">${
        subject["subjectName"] === "Super Goal" ? "Subjects" : "الموضوع"
      }</span>: `;
      let subjectCounter = 1;
      for (const timetableEntries of subject["timetableEntries"]) {
        html += `
         ${subjectCounter} - ${timetableEntries.title}
        `;
        subjectCounter++;
      }
      let goalsCounter = 1;
      html += `&emsp;<span class="text-red-500">${
        subject["subjectName"] === "Super Goal" ? "Goals" : "الاهداف"
      }</span>:`;
      for (const timetableEntries of subject["timetableEntries"]) {
        for (const goal of timetableEntries["goals"]) {
          html += `
         ${goalsCounter} - ${goal}
        `;
          goalsCounter++;
        }
      }
      html += `</p></td> </tr>`;
      html += `<tr> <td class="border bg-[#2ca2a2] text-white text-center">الواجبات المنزلية</td>`;
      html += `<td class="border border-white bg-[#e8e8e8]" colspan="5"> `;
      let homeworksCounter = 0;
      for (const timetableEntries of subject["timetableEntries"]) {
        if (timetableEntries["homeworks"] === true) {
          homeworksCounter++;
        }
      }
      if (homeworksCounter > 0) {
        html += `عدد الواجبات المنزلية: ${homeworksCounter}`;
        html += " تجد التفاصيل في المنصة";
      }
      html += `</td> </tr>`;
    }

    html += `</tr> </tbody> </table>`;
  }
  document.getElementById("plan-content").innerHTML = html;
}
