const p1_goals = [
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
const p2_goals = [
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

let ourGameState = {
  opponentWalls: [],
  ownWalls: [],
  board: board,
};

let board = [];
let ownPosition = "";
let opponentPosition = "";
let player;

function initBoard(player) {
  if (player == 1) {
    board = [
      [-1, -1, -1, -1, -1, -1, -1, -1, -1],
      [-1, -1, -1, -1, -1, -1, -1, -1, -1],
      [-1, -1, -1, -1, -1, -1, -1, -1, -1],
      [-1, -1, -1, -1, -1, -1, -1, -1, -1],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 1, 0, 0, 0, 0],
    ];
  } else {
    board = [
      [0, 0, 0, 0, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [-1, -1, -1, -1, -1, -1, -1, -1, -1],
      [-1, -1, -1, -1, -1, -1, -1, -1, -1],
      [-1, -1, -1, -1, -1, -1, -1, -1, -1],
      [-1, -1, -1, -1, -1, -1, -1, -1, -1],
    ];
  }
}

function retrieveOpponentPosition(board) {
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (board[i][j] == 2) {
        return [j, i];
      }
    }
  }
  return [];
}

exports.setup = function (AIplay) {
  return new Promise((resolve, reject) => {
    player = AIplay;
    ownPosition = AIplay == 1 ? "48" : "40";
    initBoard(AIplay);
    resolve(ownPosition);
  });
};

/*
const move = {
    action: "move",
    value: "12"
};

const move = {
    action: "wall",
    value: ["12", 0 <- h]
};

const move = {
    action: "idle"
};
*/

function shortestPath(start, goals, walls) {
  //return shortest path from start to one of goals
}

exports.nextMove = function (gameState) {
  return new Promise((resolve, reject) => {
    const move = {
      action: "idle",
    };
    resolve(move);
  });
};

exports.correction = function (rightMove) {
  return new Promise((resolve, reject) => {
    resolve(true);
  });
};

exports.updateBoard = function (gameState) {
  return new Promise((resolve, reject) => {
    ourGameState = gameState;
    resolve(true);
  });
};
