const bellIcon = document.getElementById("bell");
const popup = document.getElementById("popup");

bellIcon.addEventListener("click", function () {
  console.log("click");
  popup.style.display = popup.style.display === "block" ? "none" : "block";
});

window.addEventListener("click", function (event) {
  if (!event.target.matches("#bell") && !event.target.matches(".popup")) {
    popup.style.display = "none";
  }
});
