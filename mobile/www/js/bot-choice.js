const socket = io("https://quanridor.ps8.academy/api/game");

const AI0 = document.getElementById("AI0");
const AI1 = document.getElementById("AI1");
const AI2 = document.getElementById("AI2");

let difficulty;

AI0.addEventListener("click", () => {
  difficulty = 0;
  socket.emit("createGameAI", {
    difficulty: difficulty,
    token: localStorage.getItem("token"),
  });
});

AI1.addEventListener("click", () => {
  difficulty = 1;
  socket.emit("createGameAI", {
    difficulty: difficulty,
    token: localStorage.getItem("token"),
  });
});

AI2.addEventListener("click", () => {
  difficulty = 2;
  socket.emit("createGameAI", {
    difficulty: difficulty,
    token: localStorage.getItem("token"),
  });
});

socket.on("gameCreated", (game) => {
  window.location.href =
    "ai-game.html?difficulty=" + difficulty + "&id=" + game._id;
});
