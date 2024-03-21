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
const unfriendIcon = document.getElementById("unfriend");
const removeFriendContainer = document.getElementById("remove-friend");
const keepFriendButton = document.getElementById("normal-button");
const removeFriendButton = document.getElementById("careful-button");
const addFriendPopupCross = document.getElementById("cross");
const addFriendPopup = document.getElementById("add-friend-container");
const addFriendButton = document.getElementById("add-friend");

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

function incrementMessageCount(friendId) {
  notificationCount++;
  updateNotificationDisplay();
  const friendContainer = document.querySelector(
    `[data-friendid="${friendId}"]`,
  );

  const unreadMessageCount = friendContainer.querySelector(
    ".unread-message-count",
  );
  unreadMessageCount.textContent = parseInt(unreadMessageCount.textContent) + 1;
  unreadMessageCount.style.display = "block";
}

function displaySideNotification(notification) {
  sideNotification.innerHTML = ""; // Clear existing notification

  const notificationTitle = document.createElement("div");
  notificationTitle.classList.add("notification");
  notificationTitle.textContent = notification.title;
  sideNotification.appendChild(notificationTitle);

  const closeArrow = document.createElement("svg");
  closeArrow.id = "close-arrow";
  sideNotification.appendChild(closeArrow);

  closeArrow.addEventListener("click", () => {
    sideNotification.style.display = "none";
  });

  if (notification.type === "friendRequest") {
    const verticalContainer = document.createElement("div");
    verticalContainer.classList.add("vertical-small-container");
    sideNotification.appendChild(verticalContainer);

    const friendName = document.createElement("span");
    friendName.classList.add("text");
    friendName.id = "friend-name";
    friendName.textContent = notification.message.split(" ")[0];
    verticalContainer.appendChild(friendName);

    const buttonContainer = document.createElement("div");
    buttonContainer.classList.add("horizontal-small-container");
    verticalContainer.appendChild(buttonContainer);

    const acceptButton = document.createElement("button");
    acceptButton.classList.add("choice-button");
    acceptButton.id = "accept-button";
    acceptButton.textContent = "Accept";
    acceptButton.addEventListener("click", () => {
      acceptFriendRequest(notification._id);
    });
    buttonContainer.appendChild(acceptButton);

    const declineButton = document.createElement("button");
    declineButton.classList.add("choice-button");
    declineButton.id = "decline-button";
    declineButton.textContent = "Decline";
    declineButton.addEventListener("click", () => {
      declineFriendRequest(notification._id);
    });
    buttonContainer.appendChild(declineButton);
  } else {
    const notificationContent = document.createElement("div");
    notificationContent.classList.add("notification-content");
    notificationContent.textContent = notification.message;
    sideNotification.appendChild(notificationContent);
  }

  console.log("Side Notification shown");
  sideNotification.style.display = "block";
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
    !popup.contains(event.target) &&
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

  if (
    !event.target.matches("#add-friend-container") &&
    !addFriendPopup.contains(event.target) &&
    !event.target.matches("#add-friend")
  ) {
    addFriendPopup.style.display = "none";
  }
});

const friendsContainer = document.querySelector(".friends");
let currentSelectedFriendContainer = null;

friendsContainer.addEventListener("click", (event) => {
  const clickedElement = event.target.closest(".friend-container");

  if (!clickedElement || !friendsContainer.contains(clickedElement)) return;

  toggleRemoveFriend(true);

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
    currentSelectedFriendContainer == null ? "none" : "flex";
  friendProfile.querySelector(".text").textContent =
    clickedElement.querySelector(".text").textContent;
});

sideNotification.addEventListener("click", (event) => {
  if (event.target.matches("#close-arrow")) return;
  sideNotification.style.display = "none";
  if (event.target.matches(".choice-button")) return;
  togglePopup(false);
});

const acceptRequestButton = document.getElementById("accept-button");
const declineRequestButton = document.getElementById("decline-button");

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

  if (currentSelectedFriendContainer !== null) {
    currentSelectedFriendContainer.querySelector(
      ".unread-message-count",
    ).style.display = "none";
    currentSelectedFriendContainer.querySelector(
      ".unread-message-count",
    ).textContent = "0";
  }

  currentSelectedFriendContainer = null;
});

unfriendIcon.addEventListener("click", function () {
  toggleRemoveFriend();
});

function toggleRemoveFriend(hide = false) {
  unfriendIcon.style.filter =
    unfriendIcon.style.filter === "invert(1)" ? "invert(0)" : "invert(1)";
  removeFriendContainer.style.display =
    removeFriendContainer.style.display === "flex" ? "none" : "flex";

  if (hide) {
    removeFriendContainer.style.display = "none";
    unfriendIcon.style.filter = "invert(0)";
  }
}

keepFriendButton.addEventListener("click", function () {
  toggleRemoveFriend(true);
});

addFriendPopupCross.addEventListener("click", function () {
  addFriendPopup.style.display = "none";
});

addFriendButton.addEventListener("click", function () {
  addFriendPopup.style.display = "flex";
});

const addFriendInput = document.getElementById("add-friend-input");
const sendFriendRequestButton = document.getElementById("add-friend-button");

addFriendInput.addEventListener("input", function () {
  if (addFriendInput.value.trim() !== "") {
    sendFriendRequestButton.removeAttribute("disabled");
  } else {
    sendFriendRequestButton.setAttribute("disabled", "disabled");
  }
});

// Make so that when we click on enter when focused on #add-friend-input, it will trigger the click event on #add-friend-button
addFriendInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    sendFriendRequestButton.click();
  }
});
