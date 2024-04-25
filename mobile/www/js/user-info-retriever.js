document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("token");

  if (!token) {
    console.log("No token found in local storage.");
    return;
  }
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
      const username = data.username;
      if (username) {
        document.getElementById("username").textContent = username;
        if (data.elo) {
          document.getElementById("player1-elo").textContent =
            "ELO: " + data.elo;
        } else {
          document.getElementById("player1-elo").textContent = "ELO: " + "N/A";
        }
      } else {
        console.log("Username not found in response.");
      }
    })
    .catch((error) => {
      console.error("Error fetching user data:", error);
    });
});
