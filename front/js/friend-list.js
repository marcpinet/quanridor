// -------------------------- FRIENDS --------------------------

const friendIdToUsername = {};

document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("token");

  if (!token) {
    console.log("No token found in local storage.");
    return;
  }

  const baseUrl = window.location.origin;
  fetch(`${baseUrl}/api/users`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      const friendIds = data.friends;
      if (friendIds && friendIds.length > 0) {
        const friendList = document.querySelector(".friends");
        friendList.innerHTML = ""; // Clear existing friend list

        const fetchFriendDetails = (friendId) => {
          return fetch(`${baseUrl}/api/users/${friendId}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          })
            .then((response) => {
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              return response.json();
            })
            .then((friendData) => {
              const friendContainer = document.createElement("div");
              friendContainer.classList.add("friend-container");

              // Ajouter l'ID de l'ami comme un attribut data- pour une utilisation ultérieure
              friendContainer.setAttribute("data-friendId", friendData._id);

              const smallUser = document.createElement("svg");
              smallUser.id = "small-user";
              friendContainer.appendChild(smallUser);

              // Add <div class="small-activity" id="inactive"></div>
              const smallActivity = document.createElement("div");
              smallActivity.className = "small-activity";
              smallActivity.id = friendData.activity;
              friendContainer.appendChild(smallActivity);

              const friendName = document.createElement("div");
              friendName.classList.add("text");
              friendName.textContent = friendData.username;
              friendContainer.appendChild(friendName);

              // Add <span class="unread-message-count">0</span>
              const unreadMessageCount = document.createElement("span");
              unreadMessageCount.className = "unread-message-count";
              unreadMessageCount.textContent = "0";
              friendContainer.appendChild(unreadMessageCount);

              friendList.appendChild(friendContainer);

              // Ajouter l'ID et le nom d'utilisateur de l'ami au dictionnaire
              friendIdToUsername[friendData._id] = friendData.username;

              friendContainer.addEventListener("click", function () {
                const selectedFriendId = friendData._id;
                const selectedFriendName = friendData.username;
                console.log("Selected friend ID:", selectedFriendId);
                console.log("Selected friend name:", selectedFriendName);

                // Mettre à jour les éléments HTML avec le nom et l'ID de l'ami sélectionné
                document.getElementById("selected-friend-name").textContent =
                  friendName;
                document.getElementById("selected-friend-id").value = friendId;

                // Vérifier si l'élément <div class="big-activity"> existe déjà et le supprimer
                const friendProfile = document.getElementById("friend-profile");
                const existingBigActivity =
                  friendProfile.querySelector(".big-activity");
                if (existingBigActivity) {
                  existingBigActivity.remove();
                }

                // Ajouter l'élément <div class="big-activity"> après l'élément <svg id="user">
                const userSvg = friendProfile.querySelector("#user");
                const bigActivity = document.createElement("div");
                bigActivity.className = "big-activity";
                bigActivity.id = friendData.activity;
                const tooltipText = document.createElement("span");
                tooltipText.className = "tooltiptext";
                tooltipText.textContent =
                  friendData.activity === "active" ? "Active" : "Inactive";
                bigActivity.appendChild(tooltipText);
                userSvg.insertAdjacentElement("afterend", bigActivity);
              });
            })
            .catch((error) => {
              console.error(
                `Error fetching friend details for ${friendId}:`,
                error,
              );
            });
        };

        Promise.all(friendIds.map(fetchFriendDetails))
          .then(() => {
            console.log("All friend details fetched successfully.");
          })
          .catch((error) => {
            console.error("Error fetching friend details:", error);
          });
      } else {
        console.log("No friends found for the user.");
      }
    })
    .catch((error) => {
      console.error("Error fetching user data:", error);
    });
});

// -------------------------- CHAT --------------------------

let currentUserId;

document.addEventListener("DOMContentLoaded", function () {
  const socket = io("/api/social");

  const sendMessageButton = document.getElementById("send");
  const messageInput = document.getElementById("message-input");

  const token = localStorage.getItem("token");

  if (!token) {
    console.log("No token found in local storage.");
    return;
  }

  const baseUrl = window.location.origin;

  fetch(`${baseUrl}/api/users`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      currentUserId = data._id;
      socket.emit("joinRoom", currentUserId); // Join a room based on the user ID
      socket.emit("userConnected", currentUserId); // Notify that the user is currently online
    })
    .catch((error) => {
      console.error("Error fetching user data:", error);
    });

  const sendMessage = function () {
    let friendId = document.getElementById("selected-friend-id").value;

    const content = messageInput.value.trim();
    if (content !== "") {
      // Sending the message to the recipient
      socket.emit(
        "sendMessage",
        {
          content,
          from: currentUserId,
          to: friendId,
        },
        (error) => {
          if (error) {
            console.error("Error sending message:", error);
          } else {
            addMessageToChat({ content, from: currentUserId }, false);
            messageInput.value = "";
            console.log("Message sent successfully!");
          }
        },
      );
      // Sending notification to the recipient
      //socket.emit("sendMessageNotification", {
      //  title: "New message from X",
      //  message: content,
      //  to: friendId,
      //},
      //(error) => {
      //  if (error) {
      //    console.error("Error sending notification:", error);
      //  } else {
      //    console.log("Notification sent successfully!");
      //  }
      //});
    }
  };

  sendMessageButton.addEventListener("click", sendMessage);

  messageInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      sendMessage();
    }
  });

  socket.on("newMessage", function (message) {
    addMessageToChat(message, message.from !== currentUserId);

    if (message.from !== currentUserId) {
      const friendId = message.from;
      const friendContainer = document.querySelector(
        `[data-friendid="${friendId}"]`,
      );

      if (friendContainer !== currentSelectedFriendContainer) {
        const unreadMessageCount = friendContainer.querySelector(
          ".unread-message-count",
        );
        unreadMessageCount.textContent =
          parseInt(unreadMessageCount.textContent) + 1;
        unreadMessageCount.style.display = "block";
      }
    }
  });

  socket.on("messageHistory", function (messages) {
    const messageList = document.getElementById("message-list");
    messageList.innerHTML =
      '<div class="pink-text">Let\'s start chatting!</div><br />'; // Vider la liste des messages

    messages.forEach((message) => {
      addMessageToChat(message, message.from !== currentUserId);
    });
  });

  // Récupérer les notifications non lues lors du chargement de la page
  fetch(`${baseUrl}/api/notifications`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((notifications) => {
      notificationCount = notifications.length;
      updateNotificationDisplay();
    })
    .catch((error) => {
      console.error(
        "Error fetching notifications at",
        `${baseUrl}/api/notifications`,
        ":",
        error,
      );
    });

  const friendSearchBar = document.getElementById("search-input");

  friendSearchBar.addEventListener("input", function () {
    const searchTerm = friendSearchBar.value.toLowerCase();
    const friendContainers = document.querySelectorAll(".friend-container");

    friendContainers.forEach((friendContainer) => {
      const friendName = friendContainer
        .querySelector(".text")
        .textContent.toLowerCase();

      if (friendName.includes(searchTerm)) {
        friendContainer.style.display = "flex";
      } else {
        friendContainer.style.display = "none";
      }
    });
  });

  // Marquer les notifications comme lues lors de l'ouverture de la popup
  bellIcon.addEventListener("click", () => {
    fetch(`${baseUrl}/api/notifications`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((notifications) => {
        const notificationsContainer = document.querySelector(".notifications");
        notificationsContainer.innerHTML = ""; // Clear existing notifications

        if (notifications.length === 0) {
          const noNotificationsMessage = document.createElement("p");
          noNotificationsMessage.textContent = "No unread notifications";
          notificationsContainer.appendChild(noNotificationsMessage);
        } else {
          const dateElement = document.createElement("p");
          dateElement.classList.add("pink-text");
          dateElement.textContent = new Date().toLocaleString([], {
            weekday: "short",
            hour: "2-digit",
            minute: "2-digit",
          });
          notificationsContainer.appendChild(dateElement);

          notifications.forEach((notification) => {
            const notificationContainer = document.createElement("div");
            notificationContainer.classList.add("notification-container");
            notificationContainer.id = `notification-${notification._id}`;

            if (notification.type === "friendRequest") {
              const notificationTitle = document.createElement("div");
              notificationTitle.classList.add("notification");
              notificationTitle.textContent = "New friend request";
              notificationContainer.appendChild(notificationTitle);

              const verticalContainer = document.createElement("div");
              verticalContainer.classList.add("vertical-small-container");
              notificationContainer.appendChild(verticalContainer);

              const friendName = document.createElement("span");
              friendName.classList.add("text");
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
              const notificationTitle = document.createElement("span");
              notificationTitle.classList.add("notification");
              notificationTitle.textContent = notification.title;
              notificationContainer.appendChild(notificationTitle);

              const notificationContent = document.createElement("span");
              notificationContent.classList.add("notification-content");
              notificationContent.textContent = notification.message;
              notificationContainer.appendChild(notificationContent);
            }

            notificationsContainer.appendChild(notificationContainer);
          });
        }

        // Marquer les notifications comme lues
        fetch(`${baseUrl}/api/notifications/markAsRead`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            // Réinitialiser le compteur de notifications après les avoir marquées comme lues
            notificationCount = 0;
            updateNotificationDisplay();
          })
          .catch((error) => {
            console.error("Error marking notifications as read:", error);
          });
      })
      .catch((error) => {
        console.error("Error fetching notifications:", error);
      });
  });

  // Écouter les nouvelles notifications en temps réel
  socket.on("newMessageNotification", function (notification) {
    if (notification.type === "friendRequest") {
      displaySideNotification(notification);
      incrementNotificationCount();
    } else {
      const friendId = notification.from;
      incrementMessageCount(friendId);
      displaySideNotification(notification);
    }
  });

  friendList.addEventListener("click", function (event) {
    const friendContainer = event.target.closest(".friend-container");
    if (friendContainer) {
      // Récupérer l'ID de l'ami à partir de l'attribut data-friendId
      const friendId = friendContainer.getAttribute("data-friendId");
      const friendName = friendIdToUsername[friendId];

      // Réinitialiser le compteur de messages non lus pour l'ami sélectionné
      const unreadMessageCount = friendContainer.querySelector(
        ".unread-message-count",
      );
      unreadMessageCount.textContent = "0";
      unreadMessageCount.style.display = "none";

      console.log("Selected friend ID:", friendId);
      console.log("Selected friend name:", friendName);

      // Mettre à jour les éléments HTML avec le nom et l'ID de l'ami sélectionné
      document.getElementById("selected-friend-name").textContent = friendName;
      document.getElementById("selected-friend-id").value = friendId;

      // Récupérer l'historique des messages lorsqu'un ami est sélectionné
      socket.emit("retrieveMessages", {
        from: currentUserId,
        to: friendId,
      });
    }
  });

  const removeFriendButton = document.getElementById("careful-button");
  removeFriendButton.addEventListener("click", function () {
    const friendId =
      currentSelectedFriendContainer.getAttribute("data-friendId");

    fetch(`${baseUrl}/api/friends/${friendId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Friend removed successfully");
        // Mettre à jour la liste des amis après la suppression
        const friendContainer = document.querySelector(
          `[data-friendid="${friendId}"]`,
        );
        friendContainer.remove();
        toggleRemoveFriend(true);
        friendProfile.style.display = "none";
      })
      .catch((error) => {
        console.error("Error removing friend:", error);
      });
  });

  const sendFriendRequestButton = document.getElementById("add-friend-button");

  sendFriendRequestButton.addEventListener("click", function () {
    const friendUsername = addFriendInput.value.trim();
    sendFriendRequest(friendUsername);
  });

  function sendFriendRequest(friendUsername) {
    const token = localStorage.getItem("token");

    fetch(`${baseUrl}/api/friendRequest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ friendUsername }),
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(JSON.stringify(data));
          });
        }
        return response.json();
      })
      .then((data) => {
        console.log("Friend request sent successfully");
        const feedbackElement = document.getElementById("friend-request-sent");
        feedbackElement.style.display = "block";
        setTimeout(() => {
          feedbackElement.style.display = "none";
        }, 3000);
        addFriendInput.value = "";
        sendFriendRequestButton.setAttribute("disabled", "disabled");
      })
      .catch((error) => {
        console.error("Error sending friend request:", error);
        const errorData = JSON.parse(error.message);
        console.log("message:", errorData.message);
        console.log("specific:", errorData.specific);
        let feedbackElementId;
        if (errorData.specific !== undefined) {
          if (errorData.specific === 0) {
            feedbackElementId = "couldnt-find-user";
          } else if (errorData.specific === 1) {
            feedbackElementId = "cant-add-yourself";
          } else if (errorData.specific === 2) {
            feedbackElementId = "already-friends";
          } else if (errorData.specific === 3) {
            feedbackElementId = "friend-request-already-sent";
          } else {
            feedbackElementId = "unexpected-error";
          }
        } else {
          feedbackElementId = "unexpected-error";
        }
        const feedbackElement = document.getElementById(feedbackElementId);
        feedbackElement.style.display = "block";
        setTimeout(() => {
          feedbackElement.style.display = "none";
        }, 3000);
      });
  }

  function fetchFriendList() {
    const token = localStorage.getItem("token");

    if (!token) {
      console.log("No token found in local storage.");
      return;
    }

    const baseUrl = window.location.origin;
    fetch(`${baseUrl}/api/users`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        const friendIds = data.friends;
        if (friendIds && friendIds.length > 0) {
          const friendList = document.querySelector(".friends");
          friendList.innerHTML = ""; // Clear existing friend list

          const fetchFriendDetails = (friendId) => {
            return fetch(`${baseUrl}/api/users/${friendId}`, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            })
              .then((response) => {
                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
              })
              .then((friendData) => {
                const friendContainer = document.createElement("div");
                friendContainer.classList.add("friend-container");

                // Ajouter l'ID de l'ami comme un attribut data- pour une utilisation ultérieure
                friendContainer.setAttribute("data-friendId", friendData._id);

                const smallUser = document.createElement("svg");
                smallUser.id = "small-user";
                friendContainer.appendChild(smallUser);

                // Add <div class="small-activity" id="inactive"></div>
                const smallActivity = document.createElement("div");
                smallActivity.className = "small-activity";
                smallActivity.id = friendData.activity;
                friendContainer.appendChild(smallActivity);

                const friendName = document.createElement("div");
                friendName.classList.add("text");
                friendName.textContent = friendData.username;
                friendContainer.appendChild(friendName);

                // Add <span class="unread-message-count">0</span>
                const unreadMessageCount = document.createElement("span");
                unreadMessageCount.className = "unread-message-count";
                unreadMessageCount.textContent = "0";
                friendContainer.appendChild(unreadMessageCount);

                friendList.appendChild(friendContainer);

                // Ajouter l'ID et le nom d'utilisateur de l'ami au dictionnaire
                friendIdToUsername[friendData._id] = friendData.username;

                friendContainer.addEventListener("click", function () {
                  const selectedFriendId = friendData._id;
                  const selectedFriendName = friendData.username;
                  console.log("Selected friend ID:", selectedFriendId);
                  console.log("Selected friend name:", selectedFriendName);

                  // Mettre à jour les éléments HTML avec le nom et l'ID de l'ami sélectionné
                  document.getElementById("selected-friend-name").textContent =
                    friendName;
                  document.getElementById("selected-friend-id").value =
                    friendId;

                  // Vérifier si l'élément <div class="big-activity"> existe déjà et le supprimer
                  const friendProfile =
                    document.getElementById("friend-profile");
                  const existingBigActivity =
                    friendProfile.querySelector(".big-activity");
                  if (existingBigActivity) {
                    existingBigActivity.remove();
                  }

                  // Ajouter l'élément <div class="big-activity"> après l'élément <svg id="user">
                  const userSvg = friendProfile.querySelector("#user");
                  const bigActivity = document.createElement("div");
                  bigActivity.className = "big-activity";
                  bigActivity.id = friendData.activity;
                  const tooltipText = document.createElement("span");
                  tooltipText.className = "tooltiptext";
                  tooltipText.textContent =
                    friendData.activity === "active" ? "Active" : "Inactive";
                  bigActivity.appendChild(tooltipText);
                  userSvg.insertAdjacentElement("afterend", bigActivity);
                });
              })
              .catch((error) => {
                console.error(
                  `Error fetching friend details for ${friendId}:`,
                  error,
                );
              });
          };

          Promise.all(friendIds.map(fetchFriendDetails))
            .then(() => {
              console.log("All friend details fetched successfully.");
            })
            .catch((error) => {
              console.error("Error fetching friend details:", error);
            });
        } else {
          console.log("No friends found for the user.");
        }
      })
      .catch((error) => {
        console.error("Error fetching user data:", error);
      });
  }

  function acceptFriendRequest(notificationId) {
    const token = localStorage.getItem("token");

    fetch(`${baseUrl}/api/friendRequest/${notificationId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Friend request accepted successfully");
        // Mettre à jour la liste des amis après l'acceptation de la demande
        fetchFriendList();

        // Cacher les boutons "Accept" et "Decline"
        const notificationContainer = document.getElementById(
          `notification-${notificationId}`,
        );
        if (notificationContainer) {
          const acceptButton =
            notificationContainer.querySelector("#accept-button");
          const declineButton =
            notificationContainer.querySelector("#decline-button");
          if (acceptButton && declineButton) {
            acceptButton.style.display = "none";
            declineButton.style.display = "none";
          }
        }
      })
      .catch((error) => {
        console.error("Error accepting friend request:", error);
      });
  }

  // Fonction pour refuser une demande d'ami
  function declineFriendRequest(notificationId) {
    const token = localStorage.getItem("token");

    fetch(`${baseUrl}/api/notifications/${notificationId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Friend request declined successfully");
        // Supprimer la notification de la liste
        const notificationContainer = document.getElementById(
          `notification-${notificationId}`,
        );
        if (notificationContainer) {
          notificationContainer.remove();
        }

        // Cacher les boutons "Accept" et "Decline" dans la notification latérale
        const sideNotificationContainer =
          document.getElementById("side-notification");
        if (sideNotificationContainer) {
          const acceptButton =
            sideNotificationContainer.querySelector("#accept-button");
          const declineButton =
            sideNotificationContainer.querySelector("#decline-button");
          if (acceptButton && declineButton) {
            acceptButton.style.display = "none";
            declineButton.style.display = "none";
          }
        }
      })
      .catch((error) => {
        console.error("Error declining friend request:", error);
      });
  }
});

function addMessageToChat(message, isFromFriend) {
  const messageList = document.getElementById("message-list");
  const messageElement = document.createElement("div");
  messageElement.classList.add("friend-text-container");

  if (isFromFriend) {
    messageElement.style.flexDirection = "row-reverse";
    messageElement.style.marginRight = "auto";
  } else {
    messageElement.style.flexDirection = "row";
    messageElement.style.marginLeft = "auto";
  }

  const messageContainer = document.createElement("div");
  messageContainer.classList.add("message-container");
  messageElement.appendChild(messageContainer);

  const messageContent = document.createElement("div");
  messageContent.classList.add("message-content");
  messageContent.textContent = message.content;
  messageContainer.appendChild(messageContent);

  const smallUser = document.createElement("svg");
  smallUser.id = "small-user";
  messageElement.appendChild(smallUser);

  messageList.appendChild(messageElement);
  messageList.scrollTop = messageList.scrollHeight;
}
