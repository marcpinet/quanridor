document.addEventListener("DOMContentLoaded", function () {
  const permanent_socket = io("https://quanridor.ps8.academy/api/social");

  const token = localStorage.getItem("token");
  const baseUrl = "https://quanridor.ps8.academy";
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
      permanent_socket.emit("joinRoom", currentUserId); // Join a room based on the user ID
      permanent_socket.emit("userConnected", currentUserId); // Notify that the user is currently online
    })
    .catch((error) => {
      console.error("Error fetching user data:", error);
    });

  permanent_socket.on("newMessageNotification", function (notification) {
    if (
      notification.type === "friendRequest" ||
      notification.type === "battleRequest"
    ) {
      cordova.plugins.notification.local.schedule(
        {
          title: notification.title,
          text: notification.message,
          foreground: true,
          actions: [
            { id: "accept", title: "Accept" },
            { id: "decline", title: "Decline" },
          ],
        },
        (notification) => {
          if (notification.action === "accept") {
            if (notification.type === "friendRequest") {
              acceptFriendRequest(notification._id);
            } else if (notification.type === "battleRequest") {
              acceptBattleRequest(notification._id);
            }
          } else if (notification.action === "decline") {
            if (notification.type === "friendRequest") {
              declineFriendRequest(notification._id);
            } else if (notification.type === "battleRequest") {
              declineBattleRequest(notification._id);
            }
          }
        },
      );
    } else {
      console.log("Scheduling chat notification");
      cordova.plugins.notification.local.schedule({
        title: notification.title,
        text: notification.message,
        foreground: true,
      });
    }
  });

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

  function declineFriendRequest(notificationId) {
    const token = localStorage.getItem("token");

    fetch(`${baseUrl}/api/notifications/${notificationId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ type: "friendRequest" }),
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
  async function acceptBattleRequest(notificationId) {
    socket2.emit("test");
    const token = localStorage.getItem("token");
    try {
      const notificationResponse = await fetch(
        `${baseUrl}/api/notifications/${notificationId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const notification = await notificationResponse.json();
      const friendName = notification.message.split(" ")[0];

      const friendResponse = await fetch(
        `${baseUrl}/api/users?username=${friendName}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const friend = await friendResponse.json();
      console.log(friend.username);
      console.log(friend.socketId);

      const roomId = `battle_${Math.floor(Math.random() * 1000)}`;
      console.log(friend.socketId);
      socket2.emit("redirectToGame", {
        roomId: roomId,
        friendSocketId: friend.socketId,
      });

      await fetch(`${baseUrl}/api/notifications/${notificationId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: "battleRequest" }),
      });

      window.location.href = `online-game.html?roomId=${roomId}`;
    } catch (error) {
      console.error("Error accepting battle request:", error);
    }
  }

  function declineBattleRequest(notificationId) {
    const token = localStorage.getItem("token");

    fetch(`${baseUrl}/api/notifications/${notificationId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ type: "battleRequest" }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Battle request declined successfully");
        // Remove the notification from the UI
        const notificationContainer = document.getElementById(
          `notification-${notificationId}`,
        );
        if (notificationContainer) {
          notificationContainer.remove();
        }
      })
      .catch((error) => {
        console.error("Error declining battle request:", error);
      });
  }
});
