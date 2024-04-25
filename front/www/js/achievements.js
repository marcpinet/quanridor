document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("token");

  if (!token) {
    console.log("No token found in local storage.");
    return;
  }

  const baseUrl = "https://quanridor.ps8.academy";
  fetch(`${baseUrl}/api/achievements`, {
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
      const achievements = data.achievements;
      console.log("Achievements:", achievements);

      if (achievements && achievements.length > 0) {
        const achievementContainers = document.querySelectorAll(
          ".achievement-container",
        );
        achievementContainers.forEach((container) => {
          const achievementTextContainer = container.querySelector(".text");

          if (!achievementTextContainer) {
            // Skipping this container as it does not have the achievement text.
            return;
          }

          const achievementText = achievementTextContainer.textContent;
          if (achievements.includes(achievementText)) {
            container.id = "";
          }
        });
      } else {
        console.log("No achievements found for the user.");
      }
    })
    .catch((error) => {
      console.error("Error fetching user data:", error);
    });
});
