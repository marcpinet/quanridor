import { determinePlayerTurn } from "./game-utils.js";

// INITIALIZE NEW GAME AGAINST AI
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("againstAI").addEventListener("click", async () => {
    console.log("Creating game against AI...");
    // The game will be initialized server side and sent to the client
    // The client needs to provide the AI difficulty in the request body (default: 0)
    // And its token in the request headers
    try {
      const response = await fetch("http://localhost:4200/api/game", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ difficulty: 0 }), // Change according to the user's choice
      });

      if (!response.ok) {
        console.error("Failed to create game:", response.status);
      }

      const newlyCreatedEntry = await response.json();
      console.log(newlyCreatedEntry);
      window.location.href = `ai-game.html?id=${newlyCreatedEntry.id}`; // Safe cuz the jwt token is checked on the server side
    } catch (error) {
      console.error("Error creating game:", error);
    }
  });
});

// CONTINUE GAME
document.addEventListener("DOMContentLoaded", function () {
  const gamesListElement = document.querySelector(".game-list");
  if (!gamesListElement) {
    console.warn("No game list class element found");
    return;
  }

  // Function to retrieve games and update the UI
  async function retrieveGamesInProgress() {
    try {
      const response = await fetch(
        "http://localhost:4200/api/game?multiple=true&withStatus=1",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token"),
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        if (response.status !== 404) {
          throw new Error("Failed to retrieve games");
        }
      }

      let games;
      const contentType = response.headers.get("Content-Type");
      if (contentType && contentType?.includes("application/json")) {
        games = await response.json();
      } else {
        games = [];
      }

      // Clear existing games
      gamesListElement.innerHTML = "";

      if (!games.length || games.length === 0) {
        // Display No game found
        const noGameElement = document.createElement("div");
        noGameElement.className = "no-game";
        noGameElement.textContent = "No game found 💨";
        gamesListElement.appendChild(noGameElement);

        return;
      }

      games.forEach((game) => {
        console.log(game._id);
        const gameItemElement = document.createElement("div");
        gameItemElement.className = "game-item";
        gameItemElement.id = game._id;

        const playerNameElement = document.createElement("span");
        playerNameElement.className = "player-name";
        playerNameElement.textContent =
          game.players[0] + " vs " + game.players[1];

        // Add date between playernamelement and turnindicatorelement
        const date = new Date(game.date).toLocaleString();
        const dateElement = document.createElement("span");
        dateElement.className = "date";
        dateElement.textContent = date;
        gameItemElement.appendChild(dateElement);

        const turnIndicatorElement = document.createElement("span");
        turnIndicatorElement.className = "turn-indicator";
        turnIndicatorElement.textContent =
          determinePlayerTurn(game) === game.author
            ? "Your turn..."
            : `${determinePlayerTurn(game)}'s turn...`;

        gameItemElement.appendChild(playerNameElement);
        gameItemElement.appendChild(turnIndicatorElement);
        gamesListElement.appendChild(gameItemElement);

        gameItemElement.addEventListener("click", () => {
          // TODO: Add a check if it was a game against AI or not and adapt the redirection
          window.location.href = `ai-game.html?id=${game._id}`; // Safe cuz the jwt token is checked on the server side
        });
      });
    } catch (error) {
      console.error("Error retrieving games:", error);
    }
  }

  retrieveGamesInProgress();
});
