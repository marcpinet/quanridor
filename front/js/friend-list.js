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

              const friendName = document.createElement("div");
              friendName.classList.add("text");
              friendName.textContent = friendData.username;
              friendContainer.appendChild(friendName);

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
                  selectedFriendName;
                document.getElementById("selected-friend-id").value =
                  selectedFriendId;
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
    })
    .catch((error) => {
      console.error("Error fetching user data:", error);
    });

  const sendMessage = function () {
    let friendId = document.getElementById("selected-friend-id").value;

    const content = messageInput.value.trim();
    if (content !== "") {
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
  });

  socket.on("messageHistory", function (messages) {
    messages.forEach((message) => {
      addMessageToChat(message, message.from !== currentUserId);
    });
  });

  friendList.addEventListener("click", function (event) {
    const friendContainer = event.target.closest(".friend-container");
    if (friendContainer) {
      // Récupérer l'ID de l'ami à partir de l'attribut data-friendId
      const friendId = friendContainer.getAttribute("data-friendId");
      const friendName = friendIdToUsername[friendId];

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
});

function addMessageToChat(message, isFromFriend) {
  const messageList = document.getElementById("message-list");
  const messageElement = document.createElement("div");
  messageElement.classList.add("friend-text-container");

  if (isFromFriend) {
    messageElement.style.flexDirection = "row-reverse";
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