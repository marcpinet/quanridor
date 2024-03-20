const bellIcon = document.getElementById("bell");
const popup = document.getElementById("popup");
const unreadCount = document.getElementById("unread-count");
const sideNotification = document.getElementById("side-notification");
const closeArrowSide = document.getElementById("close-arrow");
const friendContainerList = document.getElementsByClassName("friend-container");
const friendProfile = document.getElementById("friend-profile");
const chatButton = document.getElementById("chat");
const friendList = document.getElementById("friend-list");
const friendChat = document.getElementById("friend-chat");
const closeChatButton = document.getElementById("close-chat");
const searchHeader = document.getElementById("friend-search");
const friendButtons = document.getElementById("friend-buttons");
const searchButton = document.getElementById("search");
const friendSearchBar = document.getElementById("search-input");
const closeSearchButton = document.getElementById("close-search");
const messageCountList = document.getElementsByClassName(
  "unread-message-count",
);

let notificationCount = 0;

function incrementNotificationCount() {
  notificationCount++;
  updateNotificationDisplay();
}

function updateNotificationDisplay() {
  unreadCount.textContent = notificationCount;
  unreadCount.style.display = notificationCount > 0 ? "block" : "none";
}

// Example: Call incrementNotificationCount when a new notification is received
// For demonstration purposes, I'm simulating a new notification every 3 seconds
/*setInterval(function() {
  incrementNotificationCount();
  displaySideNotification('New Notification', 'You have a new notification');
}, 3000);
*/

function incrementMessageCount() {
  notificationCount++;
  updateNotificationDisplay();
  for (const element of messageCountList) {
    element.textContent = parseInt(element.textContent) + 1;
    element.style.display = "block";
  }
}

function displaySideNotification(title, message) {
  sideNotification.style.display = "block";
  sideNotification.querySelector(".notification").textContent = title;
  sideNotification.querySelector(".notification-content").textContent = message;
}

closeSearchButton.addEventListener("click", function () {
  searchHeader.style.display = "none";
  friendButtons.style.display = "flex";
});

searchButton.addEventListener("click", function () {
  friendButtons.style.display = "none";
  searchHeader.style.display = "flex";
  friendSearchBar.focus();
});

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

  if (
    !event.target.matches(".friend-container") &&
    !event.target.matches("#friend-profile") &&
    !friendProfile.contains(event.target) &&
    !friendsContainer.contains(event.target)
  ) {
    if (currentSelectedFriendContainer !== null) {
      currentSelectedFriendContainer.style.backgroundColor =
        "rgba(1, 5, 37, 1)";
    }
    currentSelectedFriendContainer = null;
    friendProfile.style.display = "none";
  }
});

const friendsContainer = document.querySelector(".friends");
let currentSelectedFriendContainer = null;

friendsContainer.addEventListener("click", (event) => {
  const clickedElement = event.target.closest(".friend-container");

  if (!clickedElement || !friendsContainer.contains(clickedElement)) return;

  clickedElement.querySelector(".unread-message-count").style.display = "none";
  clickedElement.querySelector(".unread-message-count").textContent = "0";

  if (currentSelectedFriendContainer !== null) {
    currentSelectedFriendContainer.onmouseover = function () {
      this.style.backgroundColor = "rgb(28, 32, 67)";
    };
    currentSelectedFriendContainer.onmouseout = function () {
      this.style.backgroundColor = "rgba(1, 5, 37, 1)"; // Restore original color when not hovering
    };
    currentSelectedFriendContainer.style.backgroundColor = "rgba(1, 5, 37, 1)";
  }

  if (clickedElement === currentSelectedFriendContainer) {
    currentSelectedFriendContainer = null;
    friendProfile.style.display = "none";
    return;
  }

  currentSelectedFriendContainer = clickedElement;
  currentSelectedFriendContainer.style.backgroundColor = "#4650A8";

  currentSelectedFriendContainer.onmouseover = null;
  currentSelectedFriendContainer.onmouseout = null;

  friendProfile.style.display =
    currentSelectedFriendContainer == null ? "none" : "block";
  friendProfile.querySelector(".text").textContent =
    clickedElement.querySelector(".text").textContent;
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

chatButton.addEventListener("click", function () {
  friendProfile.style.display = "none";
  friendList.style.display = "none";
  friendChat.style.display = "block";
  var scrollableDiv = document.getElementById("message-list");
  scrollableDiv.scrollTop = scrollableDiv.scrollHeight;
  friendChat.querySelector(".text").textContent =
    currentSelectedFriendContainer.querySelector(".text").textContent;
});

closeChatButton.addEventListener("click", function () {
  friendChat.style.display = "none";
  friendList.style.display = "block";
  currentSelectedFriendContainer.style.backgroundColor = "rgba(1, 5, 37, 1)";
  currentSelectedFriendContainer = null;
});
