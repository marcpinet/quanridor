const socket = io("/api/game");

socket.on("connect", () => {
  console.log("Connected to server.");
});

socket.emit("searchGame", {
  token: localStorage.getItem("token"),
});

socket.on("waiting", () => {
  console.log("waiting");
});

let gameId;
let difficulty;
let roomId;
export let player;
let timer;
let timerInterval;
let waitingTimerInterval;
let players = [];
let playersElo = [];
let finished = false;

let board_visibility = [];
let lastMove = false;

const canvas = document.querySelector("canvas");
const context = canvas.getContext("2d");
const win = document.getElementById("win");
const smoke = document.getElementById("smoke");
const player1Name = document.getElementById("player1-name");
const player2Name = document.getElementById("player2-name");
const timePerMove = 10;
const p1Timer = document.getElementById("p1-timer-text");
const p2Timer = document.getElementById("p2-timer-text");
const p1Elo = document.getElementById("player1-elo");
const p2Elo = document.getElementById("player2-elo");
const waitingText = document.getElementById("waiting-text");

const eloLost = document.getElementById("elo-score-lose");
const eloWin = document.getElementById("elo-score-win");

let timeRemaining = timePerMove;
let waiting = 1;

//A CHANGER CAR CA PUE LA MERDE
smoke.style.display = "block";
function updateWaitingTimer() {
  let dots = ".".repeat(waiting);
  waitingText.textContent = "Waiting for player" + dots;
  if (waiting == 3) {
    waiting = 0;
  }
  waiting++;
}
waitingTimerInterval = setInterval(updateWaitingTimer, 500);

socket.on("startGame", (data) => {
  clearInterval(waitingTimerInterval);
  roomId = data;
  smoke.style.display = "none";
  socket.emit("userData", {
    roomId: roomId,
    player: player,
    token: localStorage.getItem("token"),
  });
});

socket.on("assignedPlayer", (data) => {
  player = data;
  if (player == 1) {
    board_visibility = [
      [-1, -1, -1, -1, -1, -1, -1, -1, -1],
      [-1, -1, -1, -1, -1, -1, -1, -1, -1],
      [-1, -1, -1, -1, -1, -1, -1, -1, -1],
      [-1, -1, -1, -1, -1, -1, -1, -1, -1],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1],
    ];
  } else {
    board_visibility = [
      [1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [-1, -1, -1, -1, -1, -1, -1, -1, -1],
      [-1, -1, -1, -1, -1, -1, -1, -1, -1],
      [-1, -1, -1, -1, -1, -1, -1, -1, -1],
      [-1, -1, -1, -1, -1, -1, -1, -1, -1],
    ];
  }
  drawBoard();
});

socket.on("usersData", (data) => {
  if (data[0] !== null && data[1] !== null) {
    players.push(data[0].username);
    players.push(data[1].username);
    playersElo.push(data[0].elo);
    playersElo.push(data[1].elo);
    console.log(playersElo);
    player1Name.textContent = data[0].username;
    player2Name.textContent = data[1].username;
    p1Elo.textContent = data[0].elo;
    p2Elo.textContent = data[1].elo;
    socket.emit("readyToPlace", {
      roomId: roomId,
    });
  }
});

const confirmWallButton = document.getElementById("confirm");
const leaveButton = document.getElementById("leave");

const transparent = "rgba(70, 80, 168, 0)";
const colored = "rgba(70, 80, 168, 1)";

const leftProfileBox = document.getElementById("left-player");
const rightProfileBox = document.getElementById("right-player");

leftProfileBox.style.borderColor = colored;
rightProfileBox.style.borderColor = transparent;

canvas.width = 703;
canvas.height = 703;

const winPopup = document.getElementById("result-popup");

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
let p1_coord = [0, 0];
let p2_coord = [0, 0];
let playing = false;
let select1 = false;
let select2 = false;
let p1_walls = 10;
let p2_walls = 10;
let v_walls = [];
let h_walls = [];
let current_direction = "v";
let temp_wall = [];
let isPlayer1Placed = false;
let isPlayer2Placed = false;

// Load the game state from the server and initialize the game with it (only if a gameId is present in the URL)
document.addEventListener("DOMContentLoaded", () => {
  winPopup.style.display = "none";
});

function initializeGame(gameState) {
  // TODO : when multiplayer is implemented, indice will have to be better handled (see https://i.imgur.com/uZXRibi.png)
  p1_coord = gameState.playerspositions[0];
  p2_coord = gameState.playerspositions[1];
  p1_walls = gameState.p1walls;
  p2_walls = gameState.p2walls;
  v_walls = gameState.vwalls;
  h_walls = gameState.hwalls;
  difficulty = gameState.difficulty;
  tour = gameState.turn;
  board_visibility = gameState.board_visibility;
  players = gameState.players;
  drawBoard();
  initWallBar(p1_walls, 0);
  initWallBar(p2_walls, 1);
}

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

function isWallLegal(playerWall, coord) {
  let isPossible;
  if ((playerWall == 1 && p1_walls == 0) || (playerWall == 2 && p2_walls == 0))
    return false;
  if (coord[0] > 7 || coord[0] < 0 || coord[1] > 7 || coord[1] < 0)
    return false;
  for (let wall of v_walls) {
    if (
      wall[0] == coord[0] &&
      ((Math.abs(wall[1] - coord[1]) == 1 && current_direction == "v") ||
        Math.abs(wall[1] - coord[1]) == 0)
    )
      return false;
  }
  for (let wall of h_walls) {
    if (
      wall[1] == coord[1] &&
      ((Math.abs(wall[0] - coord[0]) == 1 && current_direction == "h") ||
        Math.abs(wall[0] - coord[0]) == 0)
    )
      return false;
  }
  let p1CoordTemp = [p1_coord[0], p1_coord[1]];
  let p2CoordTemp = [p2_coord[0], p2_coord[1]];
  p1_coord = [-1, -1];
  p2_coord = [-1, -1];
  if (current_direction == "v") {
    v_walls.push(coord);
    isPossible = !!(
      aStarPathfinding(p1CoordTemp, p1_goals) &&
      aStarPathfinding(p2CoordTemp, p2_goals)
    );
    v_walls.pop();
  } else {
    h_walls.push(coord);
    isPossible = !!(
      aStarPathfinding(p1CoordTemp, p1_goals) &&
      aStarPathfinding(p2CoordTemp, p2_goals)
    );
    h_walls.pop();
  }
  p1_coord = p1CoordTemp;
  p2_coord = p2CoordTemp;
  return isPossible;
}

function canJump(coord) {
  let temp;
  if (
    Math.abs(p1_coord[0] - coord[0]) == 1 &&
    p1_coord[1] == coord[1] &&
    isLegal(p1_coord, [2 * p1_coord[0] - coord[0], coord[1]])
  ) {
    temp = [p2_coord[0], p2_coord[1]];
    p2_coord = [9, 9];
    if (isLegal(p1_coord, temp)) {
      p2_coord = [temp[0], temp[1]];
      return [2 * p1_coord[0] - coord[0], coord[1]];
    }
    p2_coord = [temp[0], temp[1]];
  } else if (
    Math.abs(p2_coord[0] - coord[0]) == 1 &&
    p2_coord[1] == coord[1] &&
    isLegal(p2_coord, [2 * p2_coord[0] - coord[0], coord[1]])
  ) {
    temp = [p2_coord[0], p2_coord[1]];
    p2_coord = [9, 9];
    if (isLegal(p1_coord, temp)) {
      p2_coord = [temp[0], temp[1]];
      return [2 * p2_coord[0] - coord[0], coord[1]];
    }
    p2_coord = [temp[0], temp[1]];
  } else if (
    p1_coord[0] == coord[0] &&
    Math.abs(p1_coord[1] - coord[1]) == 1 &&
    isLegal(p1_coord, [coord[0], 2 * p1_coord[1] - coord[1]])
  ) {
    temp = [p1_coord[0], p1_coord[1]];
    p1_coord = [9, 9];
    if (isLegal(p2_coord, temp)) {
      p1_coord = [temp[0], temp[1]];
      return [coord[0], 2 * p1_coord[1] - coord[1]];
    }
    p1_coord = [temp[0], temp[1]];
  } else if (
    p2_coord[0] == coord[0] &&
    Math.abs(p2_coord[1] - coord[1]) == 1 &&
    isLegal(p2_coord, [coord[0], 2 * p2_coord[1] - coord[1]])
  ) {
    temp = [p1_coord[0], p1_coord[1]];
    p1_coord = [9, 9];
    if (isLegal(p2_coord, temp)) {
      p1_coord = [temp[0], temp[1]];
      return [coord[0], 2 * p2_coord[1] - coord[1]];
    }
    p1_coord = [temp[0], temp[1]];
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
      color = board_visibility[j][i] >= 0 ? "#EE4F3A" : "#FFFFFF"; //'rgba(238, 79, 58, 0.5)'
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
  if (player == 1 && isPlayer1Placed) {
    drawRoundedRect(
      (p1_coord[0] + 1) * 10 + p1_coord[0] * 67,
      (p1_coord[1] + 1) * 10 + p1_coord[1] * 67,
      67,
      67,
      20,
      "#EE4F3A",
    );
    drawPlayer(42 + p1_coord[0] * 77, 42 + p1_coord[1] * 77, "#FFFFFF");
    if (board_visibility[p2_coord[1]][p2_coord[0]] < 0) {
      clearPlayer(42 + p2_coord[0] * 77, 42 + p2_coord[1] * 77);
    } else {
      drawPlayer(42 + p2_coord[0] * 77, 42 + p2_coord[1] * 77, "#000000");
    }
  } else if (player == 2 && isPlayer2Placed) {
    drawRoundedRect(
      (p2_coord[0] + 1) * 10 + p2_coord[0] * 67,
      (p2_coord[1] + 1) * 10 + p2_coord[1] * 67,
      67,
      67,
      20,
      "#EE4F3A",
    );
    drawPlayer(42 + p2_coord[0] * 77, 42 + p2_coord[1] * 77, "#000000");
    if (board_visibility[p1_coord[1]][p1_coord[0]] < 0) {
      clearPlayer(42 + p1_coord[0] * 77, 42 + p1_coord[1] * 77);
    } else {
      drawPlayer(42 + p1_coord[0] * 77, 42 + p1_coord[1] * 77, "#FFFFFF");
    }
  }
  if (
    (Math.abs(p1_coord[0] - p2_coord[0]) == 1 && p1_coord[1] == p2_coord[1]) ||
    (Math.abs(p1_coord[1] - p2_coord[1]) == 1 && p1_coord[0] == p2_coord[0])
  ) {
    let color = "#EE4F3A";
    drawRoundedRect(
      (p1_coord[0] + 1) * 10 + p1_coord[0] * 67,
      (p1_coord[1] + 1) * 10 + p1_coord[1] * 67,
      67,
      67,
      20,
      color,
    );
    drawRoundedRect(
      (p2_coord[0] + 1) * 10 + p2_coord[0] * 67,
      (p2_coord[1] + 1) * 10 + p2_coord[1] * 67,
      67,
      67,
      20,
      color,
    );
    drawPlayer(42 + p1_coord[0] * 77, 42 + p1_coord[1] * 77, "#FFFFFF");
    drawPlayer(42 + p2_coord[0] * 77, 42 + p2_coord[1] * 77, "#000000");
  }
  drawWalls();
}

//drawBoard();

function getCaseFromCoord(x, y) {
  return [Math.floor(x / 77), Math.floor(y / 77)];
}

function clearAfterWin() {
  clearInterval(timerInterval);
  clearTimeout(timer);
  confirmWallButton.style.display = "none";
  leaveButton.style.display = "none";
  clearPlayer(42 + p1_coord[0] * 77, 42 + p1_coord[1] * 77);
  clearPlayer(42 + p2_coord[0] * 77, 42 + p2_coord[1] * 77);
}

const winText = document.getElementById("win-text");

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
  tour++;
  leftProfileBox.style.borderColor = tour % 2 == 0 ? colored : transparent;
  rightProfileBox.style.borderColor = tour % 2 == 1 ? colored : transparent;
}

socket.on("win", (gameStateReturned) => {
  clearAfterWin();
  winPopup.style.display = "block";

  winText.textContent = gameStateReturned.winner + " WON!";

  const eloWin = document.getElementById("elo-score-win");
  eloWin.textContent = gameStateReturned.winner + ": +144";

  const eloLost = document.getElementById("elo-score-lose");
  let loser = gameStateReturned.winner == players[0] ? players[1] : players[0];
  rightProfileBox.style.borderColor = transparent;
  leftProfileBox.style.borderColor = transparent;
  eloLost.textContent = loser + ": -144";
  playing = false;
});

socket.on("draw", () => {
  clearAfterWin();
  winPopup.style.display = "block";
  winText.textContent = "DRAW!";
  playing = false;
});

function getWallFromCoord(x, y) {
  return [Math.floor((x - 67 / 2) / 77), Math.floor((y - 67 / 2) / 77)];
}

function getMouseCoordOnCanvas(event) {
  let x = event.clientX - canvas.getBoundingClientRect().left;
  let y = event.clientY - canvas.getBoundingClientRect().top;
  let new_coord = getCaseFromCoord(x, y);
  if (player == 1 && !isPlayer1Placed) {
    p1_coord = [new_coord[0], 8];
    isPlayer1Placed = true;
    updateFogOfWar(1);
    drawBoard();
    canvas.removeEventListener("mousemove", handleMouseOverCanvas);
    socket.emit("player1Placed", {
      coord: p1_coord,
      roomId: roomId,
    });
    return;
  }
  if (player == 2 && !isPlayer2Placed && isPlayer1Placed) {
    p2_coord = [new_coord[0], 0];
    isPlayer2Placed = true;
    updateFogOfWarReverse(2);
    drawBoard();
    canvas.removeEventListener("mousemove", handleMouseOverCanvas);
    socket.emit("player2Placed", {
      coord: p2_coord,
      roomId: roomId,
    });
    return;
  }
  if (!playing) return;
  let jump_coord = canJump(tour % 2 == 0 ? p1_coord : p2_coord);
  if (
    player == 1 &&
    !select1 &&
    new_coord[0] == p1_coord[0] &&
    new_coord[1] == p1_coord[1]
  ) {
    displayPossibleMoves(1);
  } else if (
    player == 2 &&
    !select2 &&
    new_coord[0] == p2_coord[0] &&
    new_coord[1] == p2_coord[1]
  ) {
    displayPossibleMoves(2);
  } else if (
    select1 &&
    (isLegal(p1_coord, new_coord) ||
      (jump_coord[0] == new_coord[0] && jump_coord[1] == new_coord[1]))
  ) {
    clearTimeout(timer);
    clearInterval(timerInterval);
    timeRemaining = timePerMove;
    socket.emit("isPlayer1MoveLegal", {
      roomId: roomId,
      newCoord: new_coord,
      gameState: getGameState(),
    });
  } else if (
    select2 &&
    (isLegal(p2_coord, new_coord) ||
      (jump_coord[0] == new_coord[0] && jump_coord[1] == new_coord[1]))
  ) {
    clearTimeout(timer);
    clearInterval(timerInterval);
    timeRemaining = timePerMove;
    socket.emit("isPlayer2MoveLegal", {
      roomId: roomId,
      newCoord: new_coord,
      gameState: getGameState(),
    });
  } else if ((player == 1 && tour % 2 == 0) || (player == 2 && tour % 2 == 1)) {
    select1 = false;
    select2 = false;
    drawBoard();
    let wall_coord = getWallFromCoord(x, y);
    current_direction = current_direction == "v" ? "h" : "v";
    let playerWall = tour % 2 == 0 ? 1 : 2;
    if (isWallLegal(playerWall, wall_coord)) {
      drawTempWall(wall_coord, current_direction);
    } else {
      current_direction = current_direction == "v" ? "h" : "v";
      clearTempWall(current_direction);
      drawWalls();
      current_direction = current_direction == "v" ? "h" : "v";
    }
  }
}

socket.on("player1MoveIsLegal", (data) => {
  if (player == 1) {
    updateFogOfWarReverse(1);
    movePlayer(1, data);
    updateFogOfWar(1);
    drawBoard();
    if (checkWin(1)) {
      socket.emit("lastMoveToPlay", {
        roomId: roomId,
        coord: data,
      });
    } else {
      socket.emit("movePlayer1", {
        roomId: roomId,
        coord: data,
      });
    }
  }
});

socket.on("player2MoveIsLegal", (data) => {
  if (player == 2) {
    updateFogOfWar(2);
    movePlayer(2, data);
    updateFogOfWarReverse(2);
    drawBoard();
    if (!lastMove && checkWin(2)) {
      socket.emit("player2Win", {
        roomId: roomId,
      });
    } else if (lastMove && checkWin(2)) {
      socket.emit("draw", {
        roomId: roomId,
      });
    } else if (lastMove) {
      socket.emit("player1Win", {
        roomId: roomId,
      });
    } else {
      socket.emit("movePlayer2", {
        roomId: roomId,
        coord: data,
      });
    }
  }
});

socket.on("player2LastMove", (data) => {
  lastMove = true;
  playing = !playing;
  if (player == 2) {
    updateFogOfWar(1);
    movePlayer(1, data);
    updateFogOfWarReverse(1);
  }
  drawBoard();
});

socket.on("updateAfterPayer1Move", (data) => {
  p1Timer.textContent = `Timer: ${timePerMove} sec`;
  p2Timer.textContent = `Timer: ${timePerMove} sec`;
  timeRemaining = timePerMove;
  playing = !playing;
  clearInterval(timerInterval);
  if (player == 2) {
    updateFogOfWar(1);
    movePlayer(1, data);
    updateFogOfWarReverse(1);

    timer = setTimeout(() => {
      clearTimeout(timer);
      clearInterval(timerInterval);
      clearTempWall();
      drawBoard();
      socket.emit("timeIsUpForPlayer2", {
        roomId: roomId,
        gameState: getGameState(),
      });
    }, timePerMove * 1000);
  }

  drawBoard();
  timerInterval = setInterval(updateTimer, 1000);
});

socket.on("updateAfterPayer2Move", (data) => {
  p1Timer.textContent = `Timer: ${timePerMove} sec`;
  p2Timer.textContent = `Timer: ${timePerMove} sec`;
  timeRemaining = timePerMove;
  playing = !playing;
  clearInterval(timerInterval);
  if (player == 1) {
    updateFogOfWarReverse(2);
    movePlayer(2, data);
    updateFogOfWar(2);

    timer = setTimeout(() => {
      clearTempWall();
      drawBoard();
      clearTimeout(timer);
      clearInterval(timerInterval);
      socket.emit("timeIsUpForPlayer1", {
        roomId: roomId,
        gameState: getGameState(),
      });
    }, timePerMove * 1000);
  }

  drawBoard();
  timerInterval = setInterval(updateTimer, 1000);
});

socket.on("timeIsUp", () => {
  p1Timer.textContent = `Timer: ${timePerMove} sec`;
  p2Timer.textContent = `Timer: ${timePerMove} sec`;
  timeRemaining = timePerMove;
  clearInterval(timerInterval);
  clearTimeout(timer);
  playing = !playing;
  tour++;
  leftProfileBox.style.borderColor = tour % 2 == 0 ? colored : transparent;
  rightProfileBox.style.borderColor = tour % 2 == 1 ? colored : transparent;
  if (tour % 2 == 0 && player == 1) {
    timer = setTimeout(() => {
      clearTempWall();
      drawBoard();
      clearTimeout(timer);
      clearInterval(timerInterval);
      socket.emit("timeIsUpForPlayer1", {
        roomId: roomId,
        gameState: getGameState(),
      });
    }, timePerMove * 1000);
  } else if (tour % 2 == 1 && player == 2) {
    timer = setTimeout(() => {
      clearTempWall();
      drawBoard();
      clearTimeout(timer);
      clearInterval(timerInterval);
      socket.emit("timeIsUpForPlayer2", {
        roomId: roomId,
        gameState: getGameState(),
      });
    }, timePerMove * 1000);
  }

  timerInterval = setInterval(updateTimer, 1000);
});

function updateTimer() {
  if (tour % 2 == 0) {
    p1Timer.textContent = `Timer: ${timeRemaining - 1} sec`;
    p2Timer.textContent = `Timer: ${timePerMove} sec`;
  } else {
    p2Timer.textContent = `Timer: ${timeRemaining - 1} sec`;
    p1Timer.textContent = `Timer: ${timePerMove} sec`;
  }

  timeRemaining--;

  if (timeRemaining < 0) {
    clearInterval(timeRemaining);
  }
}

function displayPossibleMoves(player) {
  console.log(tour);
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
  } else if (player == 2 && tour % 2 == 1) {
    clearTempWall(current_direction);
    drawWalls();
    select2 = true;
    for (let coord of getPlayerNeighbour(p2_coord)) {
      if (isLegal(p2_coord, coord)) {
        drawRoundedRect(
          (coord[0] + 1) * 10 + coord[0] * 67,
          (coord[1] + 1) * 10 + coord[1] * 67,
          67,
          67,
          20,
          color,
        );
      }
      let jump_coord = canJump(p2_coord);
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

function updateFogOfWar(playerTurn) {
  if (playerTurn == 1) {
    for (let coord of getPlayerNeighbour(p1_coord)) {
      board_visibility[coord[1]][coord[0]]++;
    }
  } else {
    for (let coord of getPlayerNeighbour(p2_coord)) {
      board_visibility[coord[1]][coord[0]]--;
    }
  }
}

function updateFogOfWarReverse(playerTurn) {
  if (playerTurn == 1) {
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
  if ((tour % 2 == 0 && player == 1) || (tour % 2 == 1 && player == 2)) {
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

function confirmWall() {
  clearTimeout(timer);
  clearInterval(timerInterval);
  timeRemaining = timePerMove;
  if (!playing) return;
  if (temp_wall.length > 0) {
    if (player == 1) {
      socket.emit("isPlayer1WallLegal", {
        roomId: roomId,
        wall: [temp_wall[0], temp_wall[1], current_direction],
        gameState: getGameState(),
      });
    } else {
      socket.emit("isPlayer2WallLegal", {
        roomId: roomId,
        wall: [temp_wall[0], temp_wall[1], current_direction],
        gameState: getGameState(),
      });
    }
    /*
    updateFogOfWarWall(temp_wall);
    placeWall(temp_wall, current_direction);
    if (tour % 2 == 0) {
      updateWallBar(p1_walls, tour);
      p1_walls--;
      socket.emit("player1Wall", {
        roomId: roomId,
        wall: [temp_wall[0], temp_wall[1], current_direction],
      });
    } else {
      updateWallBar(p2_walls, tour);
      p2_walls--;
      socket.emit("player2Wall", {
        roomId: roomId,
        wall: [temp_wall[0], temp_wall[1], current_direction],
      });
    }
    tour++;
    leftProfileBox.style.borderColor = tour % 2 == 0 ? colored : transparent;
    rightProfileBox.style.borderColor = tour % 2 == 1 ? colored : transparent;
  */
  }
  temp_wall = [];
  drawBoard();
}

socket.on("player1WallIsLegal", (data) => {
  if (player == 1) {
    current_direction = data[2];
    temp_wall = [data[0], data[1]];
    updateFogOfWarWall(temp_wall);
    placeWall(temp_wall, current_direction);
    updateWallBar(p1_walls, tour);
    p1_walls--;
    socket.emit("player1Wall", {
      roomId: roomId,
      wall: [temp_wall[0], temp_wall[1], current_direction],
    });
    tour++;
    leftProfileBox.style.borderColor = tour % 2 == 0 ? colored : transparent;
    rightProfileBox.style.borderColor = tour % 2 == 1 ? colored : transparent;
  }
});

socket.on("player2WallIsLegal", (data) => {
  if (player == 2) {
    current_direction = data[2];
    temp_wall = [data[0], data[1]];
    updateFogOfWarWall(temp_wall);
    placeWall(temp_wall, current_direction);
    updateWallBar(p2_walls, tour);
    p2_walls--;
    socket.emit("player2Wall", {
      roomId: roomId,
      wall: [temp_wall[0], temp_wall[1], current_direction],
    });
    tour++;
    leftProfileBox.style.borderColor = tour % 2 == 0 ? colored : transparent;
    rightProfileBox.style.borderColor = tour % 2 == 1 ? colored : transparent;
  }
});

socket.on("updateAfterPayer1Wall", (data) => {
  p1Timer.textContent = `Timer: ${timePerMove} sec`;
  p2Timer.textContent = `Timer: ${timePerMove} sec`;
  timeRemaining = timePerMove;
  playing = !playing;
  clearInterval(timerInterval);
  if (player == 2) {
    current_direction = data[2];
    temp_wall = [data[0], data[1]];
    updateFogOfWarWall(temp_wall);
    placeWall(temp_wall, current_direction);
    updateWallBar(p1_walls, tour);
    p1_walls--;
    tour++;
    leftProfileBox.style.borderColor = tour % 2 == 0 ? colored : transparent;
    rightProfileBox.style.borderColor = tour % 2 == 1 ? colored : transparent;

    timer = setTimeout(() => {
      clearTempWall();
      drawBoard();
      clearTimeout(timer);
      clearInterval(timerInterval);
      socket.emit("timeIsUpForPlayer2", {
        roomId: roomId,
        gameState: getGameState(),
      });
    }, timePerMove * 1000);
  }
  temp_wall = [];
  drawBoard();
  timerInterval = setInterval(updateTimer, 1000);
});

socket.on("updateAfterPayer2Wall", (data) => {
  p1Timer.textContent = `Timer: ${timePerMove} sec`;
  p2Timer.textContent = `Timer: ${timePerMove} sec`;
  timeRemaining = timePerMove;
  playing = !playing;
  clearInterval(timerInterval);
  if (player == 1) {
    current_direction = data[2];
    temp_wall = [data[0], data[1]];
    updateFogOfWarWall(temp_wall);
    placeWall(temp_wall, current_direction);
    updateWallBar(p2_walls, tour);
    p2_walls--;
    tour++;
    leftProfileBox.style.borderColor = tour % 2 == 0 ? colored : transparent;
    rightProfileBox.style.borderColor = tour % 2 == 1 ? colored : transparent;

    timer = setTimeout(() => {
      clearTempWall();
      drawBoard();
      clearTimeout(timer);
      clearInterval(timerInterval);
      socket.emit("timeIsUpForPlayer1", {
        roomId: roomId,
        gameState: getGameState(),
      });
    }, timePerMove * 1000);
  }
  temp_wall = [];
  drawBoard();
  timerInterval = setInterval(updateTimer, 1000);
});

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
  if (!isPlayer1Placed) return;
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

confirmWallButton.addEventListener("click", confirmWall);

// ALLOW POSTING TO BACKEND
export function getGameState() {
  return {
    players: players,
    playerspositions: [p1_coord, p2_coord],
    p1walls: p1_walls,
    p2walls: p2_walls,
    vwalls: v_walls,
    hwalls: h_walls,
    turn: tour,
    board_visibility: board_visibility,
  };
}

socket.on("illegal", () => {
  alert("Illegal Move !");
  wallChecking = false;
  checking = false;
});

window.addEventListener("unload", function (event) {
  if (player == 1) {
    socket.emit("player1Leave", {
      roomId: roomId,
      username: players[0],
    });
  } else if (player == 2) {
    socket.emit("player2Leave", {
      roomId: roomId,
      username: players[1],
    });
  } else {
    socket.emit("leaveWhileSearching", {
      token: localStorage.getItem("token"),
    });
  }
});

function updateWallBar(value, t) {
  var wallId = "p" + ((t % 2) + 1) + "-wall" + value;
  makeSquareTransparent(wallId);
}

function makeSquareTransparent(squareId) {
  console.log(squareId);
  var square = document.getElementById(squareId);
  square.classList.add("transparent");
}

function initWallBar(value, p) {
  for (var i = 10; i > value; i--) {
    updateWallBar(i, p);
  }
}

document.getElementById("replay").addEventListener("click", () => {
  window.location.href = "online-game.html";
});

let placing = false;

socket.on("placePlayer1", () => {
  if (!placing) {
    placing = true;
    if (player == 1) {
      canvas.addEventListener("mousemove", handleMouseOverCanvas);
      timer = setTimeout(() => {
        p1_coord = [4, 8];
        isPlayer1Placed = true;
        updateFogOfWar(1);
        canvas.removeEventListener("mousemove", handleMouseOverCanvas);
        drawBoard();
        socket.emit("player1Placed", {
          coord: p1_coord,
          roomId: roomId,
        });
      }, timePerMove * 1000);
    }
    timerInterval = setInterval(updateTimer, 1000);
  }
});

socket.on("placePlayer2", (data) => {
  clearTimeout(timer);
  clearInterval(timerInterval);
  timeRemaining = timePerMove;
  isPlayer1Placed = true;
  tour++;
  leftProfileBox.style.borderColor = transparent;
  rightProfileBox.style.borderColor = colored;
  if (player == 2) {
    p1_coord = data;
    updateFogOfWarReverse(1);
    canvas.addEventListener("mousemove", handleMouseOverCanvas);
    timer = setTimeout(() => {
      p2_coord = [4, 0];
      isPlayer1Placed = true;
      updateFogOfWar(2);
      canvas.removeEventListener("mousemove", handleMouseOverCanvas);
      drawBoard();
      socket.emit("player2Placed", {
        coord: p2_coord,
        roomId: roomId,
      });
    }, timePerMove * 1000);
  }
  timerInterval = setInterval(updateTimer, 1000);
});

socket.on("readyToStart", (data) => {
  clearTimeout(timer);
  clearInterval(timerInterval);
  timeRemaining = timePerMove;
  tour = 0;
  leftProfileBox.style.borderColor = colored;
  rightProfileBox.style.borderColor = transparent;
  isPlayer2Placed = true;
  if (player == 1) {
    p2_coord = data;
    updateFogOfWar(2);
    playing = true;
    timer = setTimeout(() => {
      clearTempWall();
      drawBoard();
      clearTimeout(timer);
      clearInterval(timerInterval);
      socket.emit("timeIsUpForPlayer1", {
        roomId: roomId,
        gameState: getGameState(),
      });
    }, timePerMove * 1000);
  }
  timerInterval = setInterval(updateTimer, 1000);
});

window.addEventListener("message", (event) => {
  if (event.data === "forcewin") {
    socket.emit("forcewin", {
      roomId: roomId,
      gameState: getGameState(),
      token: localStorage.getItem("token"),
    });
  }
});

function handleMouseOverCanvas(event) {
  let x = event.clientX - canvas.getBoundingClientRect().left;
  let y = event.clientY - canvas.getBoundingClientRect().top;
  let hoverCoord = getCaseFromCoord(x, y);
  if (!isPlayer1Placed) hoverCoord = [hoverCoord[0], 8];
  else hoverCoord = [hoverCoord[0], 0];
  drawBoard();
  drawRoundedRect(
    (hoverCoord[0] + 1) * 10 + hoverCoord[0] * 67,
    (hoverCoord[1] + 1) * 10 + hoverCoord[1] * 67,
    67,
    67,
    20,
    "#888888",
  );
}

socket.on("player1Win", () => {
  finished = true;
  clearAfterWin();
  winPopup.style.display = "block";
  let D = playersElo[0] - playersElo[1];
  let p;
  let W;
  let newElo;
  if (player == 1) {
    p = 1 / (1 + 10 ** (-D / 400));
    W = 1;
    newElo = Math.round(playersElo[0] + 40 * (W - p));
    winText.textContent = "YOU WON!";
    eloWin.textContent = "+" + Math.abs(playersElo[0] - newElo);
    p1Elo.textContent = newElo;
    p = 1 / (1 + 10 ** (D / 400));
    let opponentNewElo = Math.round(playersElo[1] + 40 * (0 - p));
    p2Elo.textContent = opponentNewElo;
    socket.emit("updatePlayerElo", {
      roomId: roomId,
      newElo: newElo,
      player: players[0],
    });
  } else {
    p = 1 / (1 + 10 ** (D / 400));
    W = 0;
    newElo = Math.round(playersElo[1] + 40 * (W - p));
    winText.textContent = "YOU LOST!";
    eloLost.textContent = "-" + Math.abs(playersElo[1] - newElo);
    p2Elo.textContent = newElo;
    p = 1 / (1 + 10 ** (-D / 400));
    let opponentNewElo = Math.round(playersElo[0] + 40 * (1 - p));
    p1Elo.textContent = opponentNewElo;
    socket.emit("updatePlayerElo", {
      roomId: roomId,
      newElo: newElo,
      player: players[1],
    });
  }
});

socket.on("player2Win", () => {
  finished = true;
  clearAfterWin();
  winPopup.style.display = "block";
  let D = playersElo[0] - playersElo[1];
  let p;
  let W;
  let newElo;
  if (player == 2) {
    p = 1 / (1 + 10 ** (D / 400));
    W = 1;
    newElo = Math.round(playersElo[1] + 40 * (W - p));
    console.log(newElo);
    winText.textContent = "YOU WON!";
    eloWin.textContent = "+" + Math.abs(playersElo[1] - newElo);
    p2Elo.textContent = newElo;
    p = 1 / (1 + 10 ** (-D / 400));
    let opponentNewElo = Math.round(playersElo[0] + 40 * (0 - p));
    console.log(opponentNewElo);
    p1Elo.textContent = opponentNewElo;
    socket.emit("updatePlayerElo", {
      roomId: roomId,
      newElo: newElo,
      player: players[1],
    });
  } else {
    p = 1 / (1 + 10 ** (-D / 400));
    W = 0;
    newElo = Math.round(playersElo[0] + 40 * (W - p));
    console.log(newElo);
    winText.textContent = "YOU LOST!";
    eloLost.textContent = "-" + Math.abs(playersElo[0] - newElo);
    p1Elo.textContent = newElo;
    p = 1 / (1 + 10 ** (D / 400));
    let opponentNewElo = Math.round(playersElo[1] + 40 * (1 - p));
    console.log(opponentNewElo);
    p2Elo.textContent = opponentNewElo;
    socket.emit("updatePlayerElo", {
      roomId: roomId,
      newElo: newElo,
      player: players[0],
    });
  }
});

socket.on("draw", () => {
  finished = true;
  clearAfterWin();
  winPopup.style.display = "block";
  let D = playersElo[0] - playersElo[1];
  let p;
  let W = 0.5;
  let newElo;
  let eloText;
  if (player == 1) {
    p = 1 / (1 + 10 ** (-D / 400));
    newElo = Math.round(playersElo[0] + 40 * (W - p));
    eloText = Math.abs(playersElo[0] - newElo);
    p1Elo.textContent = newElo;
    p = 1 / (1 + 10 ** (-D / 400));
    let opponentNewElo = Math.round(playersElo[1] + 40 * (W - p));
    p2Elo.textContent = opponentNewElo;
    socket.emit("updatePlayerElo", {
      roomId: roomId,
      newElo: newElo,
      player: players[0],
    });
  } else {
    p = 1 / (1 + 10 ** (D / 400));
    newElo = Math.round(playersElo[1] + 40 * (W - p));
    eloText = Math.abs(playersElo[1] - newElo);
    p2Elo.textContent = newElo;
    p = 1 / (1 + 10 ** (D / 400));
    let opponentNewElo = Math.round(playersElo[0] + 40 * (W - p));
    p1Elo.textContent = opponentNewElo;
    socket.emit("updatePlayerElo", {
      roomId: roomId,
      newElo: newElo,
      player: players[1],
    });
  }
  winText.textContent = "DRAW!";
  if (newElo >= 0) {
    eloWin.textContent = "+" + eloText;
  } else {
    eloLost.textContent = "-" + eloText;
  }
});

socket.on("opponentLeave", () => {
  clearTimeout(timer);
  clearInterval(timerInterval);
  playing = false;
  clearTempWall();
  drawBoard();
  clearAfterWin();
  let D = playersElo[0] - playersElo[1];
  let p;
  let W = 1;
  let newElo;
  if (!finished) {
    finished = true;
    winPopup.style.display = "block";
    winText.textContent = "OPPONENT LEFT, YOU WON!";
    if (player == 1) {
      p = 1 / (1 + 10 ** (-D / 400));
      newElo = Math.round(playersElo[0] + 40 * (W - p));
      eloWin.textContent = "+" + Math.abs(playersElo[0] - newElo);
      p1Elo.textContent = newElo;
      p = 1 / (1 + 10 ** (D / 400));
      let opponentNewElo = Math.round(playersElo[1] + 40 * (0 - p));
      p2Elo.textContent = opponentNewElo;
      socket.emit("updatePlayerElo", {
        roomId: roomId,
        newElo: newElo,
        player: players[0],
      });
      socket.emit("updatePlayerElo", {
        roomId: roomId,
        newElo: opponentNewElo,
        player: players[1],
      });
    } else {
      p = 1 / (1 + 10 ** (D / 400));
      newElo = Math.round(playersElo[1] + 40 * (W - p));
      eloWin.textContent = "+" + Math.abs(playersElo[1] - newElo);
      p2Elo.textContent = newElo;
      p = 1 / (1 + 10 ** (-D / 400));
      let opponentNewElo = Math.round(playersElo[0] + 40 * (0 - p));
      p1Elo.textContent = opponentNewElo;
      socket.emit("updatePlayerElo", {
        roomId: roomId,
        newElo: newElo,
        player: players[1],
      });
      socket.emit("updatePlayerElo", {
        roomId: roomId,
        newElo: opponentNewElo,
        player: players[0],
      });
    }
  }
});
