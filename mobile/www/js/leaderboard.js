document.addEventListener("DOMContentLoaded", function () {
  const globalLeaderboardElement =
    document.getElementById("global-leaderboard");
  const friendsLeaderboardElement = document.getElementById(
    "friends-leaderboard",
  );

  async function retrieveLeaderboard() {
    try {
      const baseUrl = "https://quanridor.ps8.academy";
      const [globalResponse, friendsResponse] = await Promise.all([
        fetch(`${baseUrl}/api/leaderboard`, {
          method: "GET",
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token"),
            "Content-Type": "application/json",
          },
        }),
        fetch(`${baseUrl}/api/leaderboard/friends`, {
          method: "GET",
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token"),
            "Content-Type": "application/json",
          },
        }),
      ]);

      if (!globalResponse.ok || !friendsResponse.ok) {
        throw new Error("Failed to retrieve leaderboard");
      }

      const globalLeaderboard = await globalResponse.json();
      const friendsLeaderboard = await friendsResponse.json();

      // Clear existing leaderboards
      globalLeaderboardElement.innerHTML = "";
      friendsLeaderboardElement.innerHTML = "";

      // Render global leaderboard
      renderLeaderboard(
        globalLeaderboardElement,
        globalLeaderboard,
        "No users found 💨",
      );

      // Render friends leaderboard
      renderLeaderboard(
        friendsLeaderboardElement,
        friendsLeaderboard,
        "No friends found 💨",
      );
    } catch (error) {
      console.error("Error retrieving leaderboard:", error);
    }
  }

  function renderLeaderboard(leaderboardElement, leaderboard, emptyMessage) {
    if (!leaderboard.length || leaderboard.length === 0) {
      const noUsersElement = document.createElement("div");
      noUsersElement.className = "no-users";
      noUsersElement.textContent = emptyMessage;
      leaderboardElement.appendChild(noUsersElement);
      return;
    }

    leaderboard.forEach((user, index) => {
      const userItemElement = document.createElement("div");
      userItemElement.className = "leaderboard-item";

      if (index === 0) {
        userItemElement.classList.add("gold"); // Or pour le rang 1
      } else if (index === 1) {
        userItemElement.classList.add("silver"); // Argent pour le rang 2
      } else if (index === 2) {
        userItemElement.classList.add("bronze"); // Bronze pour le rang 3
      }

      const rankElement = document.createElement("span");
      rankElement.className = "rank";
      rankElement.textContent = `${index + 1}. `;
      userItemElement.appendChild(rankElement);

      const usernameElement = document.createElement("span");
      usernameElement.className = "username";
      usernameElement.textContent = user.username;
      userItemElement.appendChild(usernameElement);

      const eloElement = document.createElement("span");
      eloElement.className = "elo";
      eloElement.textContent = ` : ${user.elo}`;
      userItemElement.appendChild(eloElement);

      leaderboardElement.appendChild(userItemElement);
    });
  }

  retrieveLeaderboard();
});
