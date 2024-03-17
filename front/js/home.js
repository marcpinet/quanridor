const bellIcon = document.getElementById("bell");
const popup = document.getElementById("popup");
const unreadCount = document.getElementById("unread-count");
const sideNotification = document.getElementById("side-notification");
const closeArrowSide = document.getElementById("close-arrow");

let notificationCount = 0;

function incrementNotificationCount() {
  if (popup.style.display !== "none") return;
  notificationCount++;
  unreadCount.textContent = notificationCount;
  unreadCount.style.display = "block";
}

// Example: Call incrementNotificationCount when a new notification is received
// For demonstration purposes, I'm simulating a new notification every 3 seconds
/*setInterval(function() {
  incrementNotificationCount();
  displaySideNotification('New Notification', 'You have a new notification');
}, 3000);
*/

function displaySideNotification(title, message) {
  sideNotification.style.display = "block";
  sideNotification.querySelector(".notification").textContent = title;
  sideNotification.querySelector(".notification-content").textContent = message;
}

bellIcon.addEventListener("click", () => {
  togglePopup();
});

window.addEventListener("click", (event) => {
  if (
    !event.target.matches("#bell") &&
    !event.target.matches(".popup") &&
    !event.target.matches("#side-notification") &&
    !sideNotification.contains(event.target)
  ) {
    popup.style.display = "none";
  }
});

sideNotification.addEventListener("click", (event) => {
  if (event.target.matches("#close-arrow")) return;
  togglePopup(false);
  sideNotification.style.display = "none";
});

closeArrowSide.addEventListener("click", () => {
  sideNotification.style.display = "none";
});

function togglePopup(toggle = true) {
  if (toggle) {
    popup.style.display = popup.style.display === "block" ? "none" : "block";
  } else {
    popup.style.display = "block";
  }

  unreadCount.style.display = "none";
  unreadCount.textContent = "0";
  notificationCount = 0;
}
