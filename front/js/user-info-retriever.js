document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("token");

  if (!token) {
    console.log("No token found in local storage.");
    return;
  }

  fetch("http://localhost:4200/api/users", {
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
        document.querySelector("#username").textContent = username;
        document.getElementById("player1-elo").textContent =
          data.elos?.[0] ?? "ELO : N/A";
        document.getElementById("player2-elo").textContent =
          data.elos?.[1] ?? "ELO : N/A";
      } else {
        console.log("Username not found in response.");
      }
    })
    .catch((error) => {
      console.error("Error fetching user data:", error);
    });
});
