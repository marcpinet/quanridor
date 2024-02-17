const { getShortestPath, isWallLegal } = require("../utils/game-checkers.js");
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

let board = [];
let ownPosition = [];
let opponentPosition = [];
let player;

let ourGameState = {
  opponentWalls: [],
  ownWalls: [],
  board: board,
};

function initGame(player) {
  if (player == 1) {
    ownPosition = [4, 8];
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
    ownPosition = [4, 0];
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
  ourGameState.board = board;
}

function convertWalls(ownWalls, opponentWalls) {
  let vwalls;
  let hwalls;
  for (let wall of ownWalls.concat(opponentWalls)) {
    if (wall[1] == 0) hwalls.push([wall[0][0], wall[0][1]]);
    else vwalls.push([wall[0][0], wall[0][1]]);
  }
}

function retrievePosition(board, player) {
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (board[i][j] == player) {
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
    initGame(AIplay);
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

function computeDirection(firstCase, secondCase) {
  if (firstCase[0] - secondCase[0] >= 1) return "l";
  else if (secondCase[0] - firstCase[0] >= 1) return "r";
  else if (firstCase[1] - secondCase[1] >= 1) return "u";
  else return "d";
}

exports.nextMove = function (gameState) {
  return new Promise((resolve, reject) => {
    let move;
    ourGameState = gameState;
    let walls = convertWalls(ourGameState.ownWalls, ourGameState.opponentWalls);
    opponentPosition = retrievePosition(ourGameState.board, (player % 2) + 1);
    ownPosition = retrievePosition(ourGameState.board, player);
    if (opponentPosition.length == 0) {
      let shortestPath = getShortestPath(
        ownPosition,
        player == 1 ? p1_goals : p2_goals,
        {
          playerspositions:
            player == 1 ? [ownPosition, [-1, -1]] : [[-1, -1], ownPosition],
          hwalls: walls.hwalls,
          vwalls: walls.vwalls,
        },
      );
      move = {
        action: "move",
        value: shortestPath[0] + "" + shortestPath[1],
      };
    } else {
      let ourShortestPath = getShortestPath(
        ownPosition,
        player == 1 ? p1_goals : p2_goals,
        {
          playerspositions:
            player == 1
              ? [ownPosition, opponentPosition]
              : [opponentPosition, ownPosition],
          hwalls: walls.hwalls,
          vwalls: walls.vwalls,
        },
      );
      let opponentShortestPath = getShortestPath(
        opponentPosition,
        player == 1 ? p2_goals : p1_goals,
        {
          playerspositions:
            player == 1
              ? [ownPosition, opponentPosition]
              : [opponentPosition, ownPosition],
          hwalls: walls.hwalls,
          vwalls: walls.vwalls,
        },
      );
      if (ourShortestPath.length <= opponentShortestPath) {
        move = {
          action: "move",
          value: ourShortestPath[0] + "" + ourShortestPath[1],
        };
      } else {
        let wallCoord = [];
        for (let i = 0; i < opponentShortestPath.length - 1; i++) {
          let direction = computeDirection(
            opponentShortestPath[i],
            opponentShortestPath[i + 1],
          );
          if (
            (direction == "l" || direction == "r") &&
            isWallLegal(
              player,
              opponentShortestPath[1],
              "v",
              1,
              1,
              walls.vwalls,
              walls.hwalls,
              ownPosition,
              opponentPosition,
            )
          ) {
            wallCoord = opponentShortestPath[1] + ["v"];
          } else if (
            isWallLegal(
              player,
              opponentShortestPath[1],
              "h",
              1,
              1,
              walls.vwalls,
              walls.hwalls,
              ownPosition,
              opponentPosition,
            )
          ) {
            wallCoord = opponentShortestPath[1] + ["h"];
          }
          if (wallCoord.length != 0) break;
        }
        if (wallCoord.length == 0) {
          move = {
            action: "move",
            value: ourShortestPath[0] + "" + ourShortestPath[1],
          };
        } else {
          move = {
            action: "wall",
            value: [
              wallCoord[0][0] + "" + wallCoord[0][1],
              wallCoord[1][0] == "h" ? 0 : 1,
            ],
          };
        }
      }
    }
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

function computeMove(gameState) {
  let move;
  let ownPosition = gameState.playerspositions[1];
  let opponentPosition =
    gameState.board_visibility[gameState.playerspositions[0][1]][
      gameState.playerspositions[0][0]
    ] <= 0
      ? gameState.playerspositions[0]
      : [];
  player = 2;
  let walls = {
    vwalls: gameState.vwalls,
    hwalls: gameState.hwalls,
  };
  if (opponentPosition.length == 0) {
    let shortestPath = getShortestPath(
      ownPosition,
      player == 1 ? p1_goals : p2_goals,
      {
        playerspositions:
          player == 1 ? [ownPosition, [-1, -1]] : [[-1, -1], ownPosition],
        hwalls: walls.hwalls,
        vwalls: walls.vwalls,
      },
    );
    move = {
      action: "move",
      value: shortestPath[1][0] + "" + shortestPath[1][1],
    };
  } else {
    let ourShortestPath = getShortestPath(
      ownPosition,
      player == 1 ? p1_goals : p2_goals,
      {
        playerspositions:
          player == 1
            ? [ownPosition, opponentPosition]
            : [opponentPosition, ownPosition],
        hwalls: walls.hwalls,
        vwalls: walls.vwalls,
      },
    );
    let opponentShortestPath = getShortestPath(
      opponentPosition,
      player == 1 ? p2_goals : p1_goals,
      {
        playerspositions:
          player == 1
            ? [ownPosition, opponentPosition]
            : [opponentPosition, ownPosition],
        hwalls: walls.hwalls,
        vwalls: walls.vwalls,
      },
    );
    if (ourShortestPath.length <= opponentShortestPath.length) {
      move = {
        action: "move",
        value: ourShortestPath[1][0] + "" + ourShortestPath[1][1],
      };
    } else {
      let wallCoord = [];
      if (gameState.p2walls > 0) {
        for (let i = 0; i < opponentShortestPath.length - 1; i++) {
          let direction = computeDirection(
            opponentShortestPath[i],
            opponentShortestPath[i + 1],
          );
          switch (direction) {
            case "l":
              if (
                isWallLegal(
                  player,
                  opponentShortestPath[1],
                  "v",
                  1,
                  1,
                  walls.vwalls,
                  walls.hwalls,
                  ownPosition,
                  opponentPosition,
                )
              ) {
                wallCoord = [opponentShortestPath[1], "v"];
              } else if (
                isWallLegal(
                  player,
                  [opponentShortestPath[1][0], opponentShortestPath[1][1] - 1],
                  "v",
                  1,
                  1,
                  walls.vwalls,
                  walls.hwalls,
                  ownPosition,
                  opponentPosition,
                )
              ) {
                wallCoord = [
                  [opponentShortestPath[1][0], opponentShortestPath[1][1] - 1],
                  "v",
                ];
              }
              break;
            case "r":
              if (
                isWallLegal(
                  player,
                  opponentShortestPath[0],
                  "v",
                  1,
                  1,
                  walls.vwalls,
                  walls.hwalls,
                  ownPosition,
                  opponentPosition,
                )
              ) {
                wallCoord = [opponentShortestPath[0], "v"];
              } else if (
                isWallLegal(
                  player,
                  [opponentShortestPath[0][0], opponentShortestPath[0][1] - 1],
                  "v",
                  1,
                  1,
                  walls.vwalls,
                  walls.hwalls,
                  ownPosition,
                  opponentPosition,
                )
              ) {
                wallCoord = [
                  [opponentShortestPath[0][0], opponentShortestPath[0][1] - 1],
                  "v",
                ];
              }
              break;
            case "d":
              if (
                isWallLegal(
                  player,
                  opponentShortestPath[0],
                  "h",
                  1,
                  1,
                  walls.vwalls,
                  walls.hwalls,
                  ownPosition,
                  opponentPosition,
                )
              ) {
                wallCoord = [opponentShortestPath[0], "h"];
              } else if (
                isWallLegal(
                  player,
                  [opponentShortestPath[0][0] - 1, opponentShortestPath[0][1]],
                  "h",
                  1,
                  1,
                  walls.vwalls,
                  walls.hwalls,
                  ownPosition,
                  opponentPosition,
                )
              ) {
                wallCoord = [
                  [opponentShortestPath[0][0] - 1, opponentShortestPath[0][1]],
                  "h",
                ];
              }
              break;
            case "u":
              if (
                isWallLegal(
                  player,
                  opponentShortestPath[1],
                  "h",
                  1,
                  1,
                  walls.vwalls,
                  walls.hwalls,
                  ownPosition,
                  opponentPosition,
                )
              ) {
                wallCoord = [opponentShortestPath[1], "h"];
              } else if (
                isWallLegal(
                  player,
                  [opponentShortestPath[1][0] - 1, opponentShortestPath[1][1]],
                  "h",
                  1,
                  1,
                  walls.vwalls,
                  walls.hwalls,
                  ownPosition,
                  opponentPosition,
                )
              ) {
                wallCoord = [
                  [opponentShortestPath[1][0] - 1, opponentShortestPath[1][1]],
                  "h",
                ];
              }
              break;
          }
          if (wallCoord.length != 0) break;
        }
      }
      if (wallCoord.length == 0) {
        move = {
          action: "move",
          value: ourShortestPath[1][0] + "" + ourShortestPath[1][1],
        };
      } else {
        move = {
          action: "wall",
          value: [
            wallCoord[0][0] + "" + wallCoord[0][1],
            wallCoord[1][0] == "h" ? 0 : 1,
          ],
        };
      }
    }
  }
  if (move.action == "move") {
    return [parseInt(move.value[0]), parseInt(move.value[1])];
  } else if (move.action == "wall") {
    return [
      parseInt(move.value[0][0]),
      parseInt(move.value[0][1]),
      move.value[1] == 0 ? "h" : "v",
    ];
  } else {
    return [];
  }
}

module.exports = { computeMove };