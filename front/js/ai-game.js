const socket = io("/api/game");

socket.on("connect", () => {
  console.log("Connected to server.");
});

const urlParams = new URLSearchParams(window.location.search);
let gameId;

const canvas = document.querySelector("canvas");
const context = canvas.getContext("2d");
const win = document.getElementById("win");
const smoke = document.getElementById("smoke");
const confirm = document.getElementById("confirm");

canvas.width = 703;
canvas.height = 703;

function drawRoundedRect(x, y, width, height, radius, color) {
  context.beginPath();

  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);

  context.fillStyle = color;
  context.fill();
  context.closePath();

  // Return the rectangle information for clearing
  return { x: x, y: y, width: width, height: height };
}

function clearRoundedRect(rect) {
  context.clearRect(rect.x, rect.y, rect.width, rect.height);
}

const canvasRect = canvas.getBoundingClientRect();
const canvasLeft = canvasRect.left - 8;
const canvasTop = canvasRect.top + 9;

let tour = 0;
let p1_coord = [4, 8];
let p2_coord = [4, 0];
let playing = true;
let select1 = false;
let select2 = false;
let p1_walls = 10;
let p2_walls = 10;
let v_walls = [];
let h_walls = [];
let current_direction = "v";
let temp_wall = [];
let players;

// Load the game state from the server and initialize the game with it (only if a gameId is present in the URL)
document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  gameId = urlParams.get("id");

  if (gameId) {
    socket.emit("gameId", {
      gameId: gameId,
      token: localStorage.getItem("token"),
    });
    socket.on("retrieveGame", (game) => {
      // Check if game has ended
      if (game.status === 2) {
        alert(
          "Game has already ended, you can't join it. Redirecting to home page...",
        );
        window.location.href = "home.html";
      }

      initializeGame(game);
    });
  } else {
    socket.emit("createGameAI", {
      difficulty: 0,
      token: localStorage.getItem("token"),
    });
    socket.on("gameCreated", (game) => {
      gameId = game._id;
      initializeGame(game);
      window.location.href = "http://localhost:8000/ai-game.html?id=" + gameId;

      // Setting the game info display
      // Usernames
      const player1name = document.getElementById("player1-name");
      player1name.textContent = game.players[0];
      const player2name = document.getElementById("player2-name");
      player2name.textContent = game.players[1];
      // ELO
      const player1elo = document.getElementById("player1-elo");
      const player2elo = document.getElementById("player2-elo");
      player1elo.textContent = game.elos?.[0] ?? "ELO : N/A";
      player2elo.textContent = game.elos?.[1] ?? "ELO : N/A";
    });
  }
});

function initializeGame(gameState) {
  // TODO : when multiplayer is implemented, indice will have to be better handled (see https://i.imgur.com/uZXRibi.png)
  p1_coord = gameState.playerspositions[0];
  p2_coord = gameState.playerspositions[1];
  p1_walls = gameState.p1walls;
  p2_walls = gameState.p2walls;
  v_walls = gameState.vwalls;
  h_walls = gameState.hwalls;
  tour = gameState.turn;
  board_visibility = gameState.board_visibility;
  players = gameState.players;
  drawBoard();
}

let board_visibility = [
  [-1, -1, -1, -2, -2, -2, -1, -1, -1],
  [-1, -1, -1, -1, -2, -1, -1, -1, -1],
  [-1, -1, -1, -1, -1, -1, -1, -1, -1],
  [-1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 2, 1, 1, 1, 1],
  [1, 1, 1, 2, 2, 2, 1, 1, 1],
];

let p1_goals = [
  [0, 0],
  [1, 0],
  [2, 0],
  [3, 0],
  [4, 0],
  [5, 0],
  [6, 0],
  [7, 0],
  [8, 0],
];
let p2_goals = [
  [0, 8],
  [1, 8],
  [2, 8],
  [3, 8],
  [4, 8],
  [5, 8],
  [6, 8],
  [7, 8],
  [8, 8],
];

function isLegal(current_coord, new_coord) {
  let x = new_coord[0];
  let y = new_coord[1];
  if (x < 0 || x > 8 || y < 0 || y > 8) return false;
  if (
    (x == p1_coord[0] && y == p1_coord[1]) ||
    (x == p2_coord[0] && y == p2_coord[1])
  )
    return false;
  if (Math.abs(x - current_coord[0]) > 1 || Math.abs(y - current_coord[1]) > 1)
    return false;
  if (
    Math.abs(x - current_coord[0]) == 1 &&
    Math.abs(y - current_coord[1]) == 1
  )
    return false;
  for (let wall of v_walls) {
    if (
      wall[0] == current_coord[0] &&
      (wall[1] == current_coord[1] || wall[1] == current_coord[1] - 1) &&
      x - current_coord[0] == 1
    )
      return false;
    if (
      wall[0] == current_coord[0] - 1 &&
      (wall[1] == current_coord[1] || wall[1] == current_coord[1] - 1) &&
      current_coord[0] - x == 1
    )
      return false;
  }
  for (let wall of h_walls) {
    if (
      wall[1] == current_coord[1] &&
      (wall[0] == current_coord[0] || wall[0] == current_coord[0] - 1) &&
      y - current_coord[1] == 1
    )
      return false;
    if (
      wall[1] == current_coord[1] - 1 &&
      (wall[0] == current_coord[0] || wall[0] == current_coord[0] - 1) &&
      current_coord[1] - y == 1
    )
      return false;
  }
  return true;
}

function isWallLegal(player, coord) {
  let isPossible;
  if ((player == 1 && p1_walls == 0) || (player == 2 && p2_walls == 0))
    return false;
  if (coord[0] > 7 || coord[0] < 0 || coord[1] > 7 || coord[1] < 0)
    return false;
  if (current_direction == "v") {
    for (let wall of v_walls) {
      if (wall[0] == coord[0] && Math.abs(wall[1] - coord[1]) <= 1)
        return false;
    }
    v_walls.push(coord);
    isPossible = !!(
      aStarPathfinding(p1_coord, p1_goals) &&
      aStarPathfinding(p2_coord, p2_goals)
    );
    v_walls.pop();
  } else {
    for (let wall of h_walls) {
      if (wall[1] == coord[1] && Math.abs(wall[0] - coord[0]) <= 1)
        return false;
    }
    h_walls.push(coord);
    isPossible = !!(
      aStarPathfinding(p1_coord, p1_goals) &&
      aStarPathfinding(p2_coord, p2_goals)
    );
    h_walls.pop();
  }
  return isPossible;
}

function canJump(coord) {
  let temp;
  if (
    Math.abs(p1_coord[0] - coord[0]) == 1 &&
    p1_coord[1] == coord[1] &&
    isLegal(p1_coord, [2 * p1_coord[0] - coord[0], coord[1]])
  ) {
    temp = p2_coord;
    p2_coord = [9, 9];
    if (isLegal(p1_coord, temp)) {
      p2_coord = temp;
      return [2 * p1_coord[0] - coord[0], coord[1]];
    }
    p2_coord = temp;
  } else if (
    Math.abs(p2_coord[0] - coord[0]) == 1 &&
    p2_coord[1] == coord[1] &&
    isLegal(p2_coord, [2 * p2_coord[0] - coord[0], coord[1]])
  ) {
    temp = p2_coord;
    p2_coord = [9, 9];
    if (isLegal(p1_coord, temp)) {
      p2_coord = temp;
      return [2 * p2_coord[0] - coord[0], coord[1]];
    }
    p2_coord = temp;
  } else if (
    p1_coord[0] == coord[0] &&
    Math.abs(p1_coord[1] - coord[1]) == 1 &&
    isLegal(p1_coord, [coord[0], 2 * p1_coord[1] - coord[1]])
  ) {
    temp = p1_coord;
    p1_coord = [9, 9];
    if (isLegal(p2_coord, temp)) {
      p1_coord = temp;
      return [coord[0], 2 * p1_coord[1] - coord[1]];
    }
    p1_coord = temp;
  } else if (
    p2_coord[0] == coord[0] &&
    Math.abs(p2_coord[1] - coord[1]) == 1 &&
    isLegal(p2_coord, [coord[0], 2 * p2_coord[1] - coord[1]])
  ) {
    temp = p1_coord;
    p1_coord = [9, 9];
    if (isLegal(p2_coord, temp)) {
      p1_coord = temp;
      return [coord[0], 2 * p2_coord[1] - coord[1]];
    }
    p1_coord = temp;
  }
  return [];
}

function getPlayerNeighbour(coord) {
  const x = coord[0];
  const y = coord[1];
  const neighbors = [];

  neighbors.push([x, y]);
  if (x > 0) neighbors.push([x - 1, y]);
  if (x < 8) neighbors.push([x + 1, y]);
  if (y > 0) neighbors.push([x, y - 1]);
  if (y < 8) neighbors.push([x, y + 1]);

  return neighbors;
}

function checkWin(player) {
  return (player == 1 && p1_coord[1] == 0) || (player == 2 && p2_coord[1] == 8);
}

function placeWall(coord, direction) {
  if (direction == "v") v_walls.push(coord);
  else h_walls.push(coord);
}

function drawWalls() {
  for (let wall of v_walls) {
    drawRoundedRect(
      77 * (wall[0] + 1),
      10 + wall[1] * 77,
      10,
      2 * 67 + 10,
      5,
      "#FFFFFF",
    );
  }

  for (let wall of h_walls) {
    drawRoundedRect(
      10 + wall[0] * 77,
      77 * (wall[1] + 1),
      2 * 67 + 10,
      10,
      5,
      "#FFFFFF",
    );
  }
}

function clearTempWall() {
  temp_wall = [];
  drawBoard();
}

function drawTempWall(coord, direction) {
  let color = "#F1A7FF";
  clearTempWall();
  if (direction == "v") {
    drawRoundedRect(
      77 * (coord[0] + 1),
      10 + coord[1] * 77,
      10,
      2 * 67 + 10,
      5,
      color,
    );
  }
  if (direction == "h") {
    drawRoundedRect(
      10 + coord[0] * 77,
      77 * (coord[1] + 1),
      2 * 67 + 10,
      10,
      5,
      color,
    );
  }
  temp_wall = coord;
}

function drawBoard() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  let gradient = context.createLinearGradient(0, 0, 0, canvas.height);

  gradient.addColorStop(0, "rgba(255, 0, 61, 0.5)");
  gradient.addColorStop(1, "rgba(94, 0, 188, 0.5)");
  // '#161A3D'
  drawRoundedRect(0, 0, 703, 703, 20, gradient);

  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      let color;
      color =
        board_visibility[j][i] >= 0 || (i == p1_coord[0] && j == p1_coord[1])
          ? "#EE4F3A"
          : "#FFFFFF"; //'rgba(238, 79, 58, 0.5)'
      drawRoundedRect(
        (i + 1) * 10 + i * 67,
        (j + 1) * 10 + j * 67,
        67,
        67,
        20,
        color,
      );
    }
  }
  drawWalls();

  drawPlayer(42 + p1_coord[0] * 77, 42 + p1_coord[1] * 77, "#FFFFFF");
  if (board_visibility[p2_coord[1]][p2_coord[0]] < 0) {
    clearPlayer(42 + p2_coord[0] * 77, 42 + p2_coord[1] * 77);
  } else {
    drawPlayer(42 + p2_coord[0] * 77, 42 + p2_coord[1] * 77, "#000000");
  }
}

drawBoard();

function getCaseFromCoord(x, y) {
  return [Math.floor(x / 77), Math.floor(y / 77)];
}

function movePlayer(player, coord) {
  if (player == 1) {
    p1_coord = coord;
    drawPlayer(42 + coord[0] * 77, 42 + coord[1] * 77, "#FFFFFF");
    select1 = false;
  } else {
    p2_coord = coord;
    drawPlayer(42 + coord[0] * 77, 42 + coord[1] * 77, "#000000");
    select2 = false;
  }
  socket.emit("win?", {
    gameId: gameId,
    gameState: getGameState(),
    token: localStorage.getItem("token"),
  });
  socket.on("win", (gameStateReturned) => {
    clearPlayer(42 + p1_coord[0] * 77, 42 + p1_coord[1] * 77);
    clearPlayer(42 + p2_coord[0] * 77, 42 + p2_coord[1] * 77);
    smoke.style.display = "block";
    clearPlayer(42 + p1_coord[0] * 77, 42 + p1_coord[1] * 77);
    clearPlayer(42 + p2_coord[0] * 77, 42 + p2_coord[1] * 77);
    smoke.style.display = "block";

    // Créez une div pour le popup avec la classe "custom-popup"
    const popup = document.createElement("div");
    popup.classList.add("custom-popup");
    popup.classList.add("bold-text");
    popup.textContent = gameStateReturned.winner + " won!";

    // Ajoutez un bouton "home" au popup
    const homeButton = document.createElement("button");
    homeButton.textContent = "Home";
    homeButton.classList.add("big-button");
    homeButton.addEventListener("click", function () {
      window.location.href = "home.html"; // Redirection vers la page d'accueil
    });
    popup.appendChild(homeButton);

    // Ajoutez la div du popup au body de la page
    document.body.appendChild(popup);
  });
}

function getWallFromCoord(x, y) {
  return [Math.floor((x - 67 / 2) / 77), Math.floor((y - 67 / 2) / 77)];
}

let checking = false;

socket.on("legalMove", (new_coord) => {
  checking = false;
  updateFogOfWarReverse(1);
  movePlayer(1, new_coord);
  updateFogOfWar(1);
  socket.emit("sendGameState", {
    gameId: gameId,
    gameState: getGameState(),
  });
  tour++;
});

function getMouseCoordOnCanvas(event) {
  let x = event.clientX - canvas.getBoundingClientRect().left;
  let y = event.clientY - canvas.getBoundingClientRect().top;
  let new_coord = getCaseFromCoord(x, y);
  let jump_coord = canJump(tour % 2 == 0 ? p1_coord : p2_coord);
  if (!select1 && new_coord[0] == p1_coord[0] && new_coord[1] == p1_coord[1]) {
    displayPossibleMoves(1);
  } else if (
    select1 &&
    (isLegal(p1_coord, new_coord) ||
      (jump_coord[0] == new_coord[0] && jump_coord[1] == new_coord[1]))
  ) {
    const dataToSend = {
      gameId: gameId,
      gameState: getGameState(),
      newCoord: new_coord,
    };
    if (!checking) {
      socket.emit("isMoveLegal", dataToSend);
      checking = true;
    }
  } else {
    select1 = false;
    select2 = false;
    drawBoard();
    let wall_coord = getWallFromCoord(x, y);
    current_direction = current_direction == "v" ? "h" : "v";
    let player = tour % 2 == 0 ? 1 : 2;
    if (isWallLegal(player, wall_coord) && player == 1) {
      drawTempWall(wall_coord, current_direction);
    } else {
      current_direction = current_direction == "v" ? "h" : "v";
      clearTempWall(current_direction);
      drawWalls();
      current_direction = current_direction == "v" ? "h" : "v";
    }
  }
}

function displayPossibleMoves(player) {
  let color = "#F1A7FF";
  if (player == 1 && tour % 2 == 0) {
    clearTempWall(current_direction);
    drawWalls();
    select1 = true;
    for (let coord of getPlayerNeighbour(p1_coord)) {
      if (isLegal(p1_coord, coord)) {
        drawRoundedRect(
          (coord[0] + 1) * 10 + coord[0] * 67,
          (coord[1] + 1) * 10 + coord[1] * 67,
          67,
          67,
          20,
          color,
        );
      }
      let jump_coord = canJump(p1_coord);
      if (jump_coord.length > 0) {
        drawRoundedRect(
          (jump_coord[0] + 1) * 10 + jump_coord[0] * 67,
          (jump_coord[1] + 1) * 10 + jump_coord[1] * 67,
          67,
          67,
          20,
          color,
        );
      }
    }
  }
}

function updateFogOfWar(player) {
  if (player == 1) {
    for (let coord of getPlayerNeighbour(p1_coord)) {
      board_visibility[coord[1]][coord[0]]++;
    }
  } else {
    for (let coord of getPlayerNeighbour(p2_coord)) {
      board_visibility[coord[1]][coord[0]]--;
    }
  }
}

function updateFogOfWarReverse(player) {
  if (player == 1) {
    for (let coord of getPlayerNeighbour(p1_coord)) {
      board_visibility[coord[1]][coord[0]]--;
    }
  } else {
    for (let coord of getPlayerNeighbour(p2_coord)) {
      board_visibility[coord[1]][coord[0]]++;
    }
  }
}

function updateFogOfWarWall(wall_coord) {
  let x = wall_coord[0];
  let y = wall_coord[1];
  if (tour % 2 == 0) {
    board_visibility[y][x] += 2;
    board_visibility[y + 1][x + 1] += 2;
    board_visibility[y + 1][x] += 2;
    board_visibility[y][x + 1] += 2;
    if (y > 0) {
      board_visibility[y - 1][x] += 1;
      board_visibility[y - 1][x + 1] += 1;
    }
    if (y < 7) {
      board_visibility[y + 2][x] += 1;
      board_visibility[y + 2][x + 1] += 1;
    }
    if (x > 0) {
      board_visibility[y][x - 1] += 1;
      board_visibility[y + 1][x - 1] += 1;
    }
    if (x < 7) {
      board_visibility[y][x + 2] += 1;
      board_visibility[y + 1][x + 2] += 1;
    }
  } else {
    board_visibility[y][x] -= 2;
    board_visibility[y + 1][x + 1] -= 2;
    board_visibility[y + 1][x] -= 2;
    board_visibility[y][x + 1] -= 2;
    if (y > 0) {
      board_visibility[y - 1][x] -= 1;
      board_visibility[y - 1][x + 1] -= 1;
    }
    if (y < 7) {
      board_visibility[y + 2][x] -= 1;
      board_visibility[y + 2][x + 1] -= 1;
    }
    if (x > 0) {
      board_visibility[y][x - 1] -= 1;
      board_visibility[y + 1][x - 1] -= 1;
    }
    if (x < 7) {
      board_visibility[y][x + 2] -= 1;
      board_visibility[y + 1][x + 2] -= 1;
    }
  }
}

let wallChecking = false;

socket.on("legalWall", () => {
  wallChecking = false;
  if (temp_wall.length > 0) {
    updateFogOfWarWall(temp_wall);
    placeWall(temp_wall, current_direction);
    if (tour % 2 == 0) p1_walls--;
    else p2_walls--;
    tour++;
  }
  drawBoard();
  const dataToSend = { gameId: gameId, gameState: getGameState() };
  socket.emit("sendGameState", dataToSend);
});

function confirmWall() {
  if (temp_wall.length > 0 && !wallChecking) {
    wallChecking = true;
    socket.emit("isWallLegal", [temp_wall, current_direction, getGameState()]);
  }
}

function isInclude(array, coord) {
  for (let subArray of array) {
    if (coord[0] == subArray[0] && coord[1] == subArray[1]) return true;
  }
  return false;
}

function aStarPathfinding(start, goals) {
  let openSet = [];
  let closedSet = [];
  let current;
  openSet.push(start);

  while (openSet.length > 0) {
    current = openSet.pop();

    if (isInclude(goals, current)) return true;
    closedSet.push(current);

    let neighbors = getPlayerNeighbour(current);

    for (let neighbor of neighbors) {
      if (isInclude(closedSet, neighbor) || !isLegal(current, neighbor))
        continue;

      if (!isInclude(openSet, neighbor)) {
        openSet.push(neighbor);
      }
    }
    let jump_coord = canJump(current);
    if (
      jump_coord.length > 0 &&
      !isInclude(closedSet, jump_coord) &&
      !isInclude(openSet, jump_coord)
    ) {
      openSet.push(jump_coord);
    }
  }

  return false;
}

function drawPlayer(x, y, color) {
  if (color === "none") {
    clearPlayer(x, y);
  } else {
    context.beginPath();
    context.arc(x, y, 20, 0, 2 * Math.PI);
    context.fillStyle = color;
    context.fill();
    context.closePath();
  }
}

function clearPlayer(x, y) {
  // Récupérer la couleur environnante aux coordonnées (x, y)
  const surroundingColor = context.getImageData(x, y, 1, 1).data;
  const rgbaColor = `rgba(${surroundingColor[0]}, ${surroundingColor[1]}, ${surroundingColor[2]}, ${surroundingColor[3] / 255})`;

  // Remplir le joueur avec la couleur environnante
  drawPlayer(x, y, rgbaColor);
}

canvas.addEventListener("click", getMouseCoordOnCanvas);

confirm.addEventListener("click", confirmWall);

// ALLOW POSTING TO BACKEND
export function getGameState() {
  return {
    players: players,
    playerspositions: [p1_coord, p2_coord],
    status: playing ? 1 : 2,
    p1walls: p1_walls,
    p2walls: p2_walls,
    vwalls: v_walls,
    hwalls: h_walls,
    turn: tour,
    board_visibility: board_visibility,
  };
}

socket.on("aiMove", (newCoord) => {
  updateFogOfWarReverse(2);
  if (newCoord[2] !== undefined) {
    placeWall(newCoord, newCoord[2]);
    updateFogOfWarWall(newCoord);
  } else {
    movePlayer(2, newCoord);
  }
  tour++;
  updateFogOfWar(2);
  drawBoard();
});

socket.on("illegal", () => {
  alert("Illegal Move !");
  wallChecking = false;
  checking = false;
});

window.addEventListener("onbeforeunload", function (event) {
  socket.emit("leave", { gameId: gameId, gameState: getGameState() });
});

window.addEventListener("unload", function (event) {
  socket.emit("leave", { gameId: gameId, gameState: getGameState() });
});
