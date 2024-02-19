const {
  checkWin,
  cloneGameState,
  getPossibleMovesAndStrategicWalls,
  getShortestPath,
  getPossibleMoves,
  getPossibleWalls,
} = require("../utils/game-checkers.js");

class TranspositionTable {
  constructor() {
    this.table = {};
  }

  set(key, { value, move }) {
    this.table[key] = { value, move };
  }

  get(key) {
    return this.table[key];
  }
}

let transpositionTable = new TranspositionTable();

let p1goals = [
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
let p2goals = [
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

function createUniqueKey(gameState) {
  let p1_coord = gameState.playerspositions[0];
  let p2_coord = gameState.playerspositions[1];
  let p1walls = gameState.p1walls;
  let p2walls = gameState.p2walls;
  let vwalls = gameState.vwalls;
  let hwalls = gameState.hwalls;
  return JSON.stringify({
    p1_coord: p1_coord,
    p2_coord: p2_coord,
    p1walls: p1walls,
    p2walls: p2walls,
    vwalls: vwalls,
    hwalls: hwalls,
  });
}

function determineDefaultMove(gameState, player) {
  let possibleMoves = getPossibleMoves(gameState, player);
  let possibleWalls = getPossibleWalls(gameState, player);
  if (possibleMoves.length > 0)
    return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
  if (possibleWalls.length > 0)
    return possibleWalls[Math.floor(Math.random() * possibleWalls.length)];
  return gameState.playerspositions[player - 1];
}

function minimax(
  gameState,
  depth,
  alpha,
  beta,
  maximizingPlayer,
  initialDepth = depth,
  player = 2,
) {
  let key = createUniqueKey(gameState);
  let currentPlayer = player;
  let opponentPlayer = player === 1 ? 2 : 1;

  if (transpositionTable.get(key)) {
    return transpositionTable.get(key);
  }

  let p1_coord = gameState.playerspositions[0];
  let p2_coord = gameState.playerspositions[1];

  let defaultMove = determineDefaultMove(
    gameState,
    maximizingPlayer ? player : opponentPlayer,
  );
  let best = maximizingPlayer
    ? { value: -Infinity, move: defaultMove }
    : { value: Infinity, move: defaultMove };

  if (
    depth == 0 ||
    checkWin(1, { p1_coord: p1_coord, p2_coord: p2_coord }) ||
    checkWin(2, { p1_coord: p1_coord, p2_coord: p2_coord })
  ) {
    return {
      value: evaluate(
        gameState,
        maximizingPlayer ? player : opponentPlayer,
        initialDepth - depth,
      ),
      move: defaultMove,
    };
  }

  let { possibleMoves, possibleWalls } = getPossibleMovesAndStrategicWalls(
    gameState,
    maximizingPlayer ? player : opponentPlayer,
  );
  possibleMoves = possibleMoves.concat(possibleWalls);

  if (possibleMoves.length == 0) {
    return {
      value: -10000000,
      move: defaultMove,
    };
  }

  for (let someMove of possibleMoves) {
    let chosenMove = applyMove(
      gameState,
      someMove,
      maximizingPlayer ? player : opponentPlayer,
    );
    if (chosenMove === null) {
      continue;
    }

    let { value, move } = minimax(
      chosenMove,
      depth - 1,
      alpha,
      beta,
      !maximizingPlayer,
      initialDepth,
      opponentPlayer,
    );

    if (maximizingPlayer) {
      if (value > best.value) {
        best.value = value;
        best.move = someMove;
      }
      alpha = Math.max(alpha, value);
    } else {
      if (value < best.value) {
        best.value = value;
        best.move = someMove;
      }
      beta = Math.min(beta, value);
    }
    if (beta <= alpha) {
      break;
    }
  }

  transpositionTable.set(key, best);
  return best;
}

function canWin(gameState, player) {
  const playerGoals = player === 1 ? p1goals : p2goals;
  const playerPosition = gameState.playerspositions[player - 1];
  let playerPath = getShortestPath(playerPosition, playerGoals, gameState);
  return playerPath.length <= 2;
}

function evaluate(gameState, player, depthPenalty) {
  const playerGoals = player === 1 ? p1goals : p2goals;
  const opponentGoals = player === 1 ? p2goals : p1goals;
  const playerPosition = gameState.playerspositions[player - 1];
  const opponentPosition = gameState.playerspositions[player === 1 ? 1 : 0];

  if (canWin(gameState, player)) return 10000000000 - depthPenalty;
  if (canWin(gameState, player === 1 ? 2 : 1))
    return -10000000000 + depthPenalty;

  let playerPath = getShortestPath(playerPosition, playerGoals, gameState);
  let opponentPath = getShortestPath(
    opponentPosition,
    opponentGoals,
    gameState,
  );

  let score = 0;

  // Adjust score based on path length difference
  score += (opponentPath.length - playerPath.length) * 10;

  // Prioritize endgame scenarios
  if (playerPath.length <= 2) score += 1000; // Near victory
  if (opponentPath.length <= 2) score -= 1000; // Opponent near victory

  // Adjust for remaining walls - incentivize saving walls for critical moments
  let wallsDifference = gameState.p1walls - gameState.p2walls;
  score += player === 1 ? wallsDifference * 5 : -wallsDifference * 5;

  return score;
}

function applyMove(gameState, move, player) {
  const newGameState = cloneGameState(gameState);
  if (move.length == 3) {
    let wallsnum = player === 1 ? newGameState.p1walls : newGameState.p2walls;
    if (wallsnum <= 0) {
      return null;
    }
    if (move[2] == "v") {
      newGameState.vwalls.push(move);
    } else {
      newGameState.hwalls.push(move);
    }
    player === 1 ? newGameState.p1walls-- : newGameState.p2walls--;
  } else {
    newGameState.playerspositions[player - 1] = move;
  }
  newGameState.turn++;
  return newGameState;
}

function computeMove(gameState, player) {
  let depth = 2;
  let aiPlayer = player;
  let aiPath = getShortestPath(
    gameState.playerspositions[1],
    aiPlayer === 1 ? p1goals : p2goals,
    gameState,
  );
  if (aiPath.length <= 2) {
    return aiPath[aiPath.length - 1];
  }
  let { value, move } = minimax(
    gameState,
    depth,
    -Infinity,
    +Infinity,
    true,
    player,
  );
  console.log("AI played!", move);
  return move;
}

let board = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0, 0, 0, 2],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

let testGameState = {
  board: board,
  ownWalls: [
    ["19", 1],
    ["27", 0],
    ["45", 1],
  ],
  opponentWalls: [
    ["65", 1],
    ["23", 0],
    ["42", 1],
  ],
};

let ownPosition = [];
let opponentPosition = [];
let player;

function convertWalls(ownWalls, opponentWalls) {
  let vwalls = [];
  let hwalls = [];
  let allWalls = ownWalls.concat(opponentWalls);
  for (let wall of allWalls) {
    if (wall[1] == 0)
      hwalls.push([parseInt(wall[0][0]) - 1, 9 - parseInt(wall[0][1])]);
    else vwalls.push([parseInt(wall[0][0]) - 1, 9 - parseInt(wall[0][1])]);
  }
  return {
    vwalls: vwalls,
    hwalls: hwalls,
  };
}

function retrievePosition(board, player) {
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (board[i][j] == player) {
        return [i, 8 - j];
      }
    }
  }
  return [];
}

function computeMove2(gameState) {
  let player = 2;
  let testwalls = convertWalls(
    testGameState.ownWalls,
    testGameState.opponentWalls,
  );
  let testopponentPosition = retrievePosition(
    testGameState.board,
    (player % 2) + 1,
  );
  let testownPosition = retrievePosition(testGameState.board, player);
  let move;
  let ownPosition = gameState.playerspositions[1];
  let opponentPosition =
    gameState.board_visibility[gameState.playerspositions[0][1]][
      gameState.playerspositions[0][0]
    ] <= 0
      ? gameState.playerspositions[0]
      : [];
  let walls = {
    vwalls: gameState.vwalls,
    hwalls: gameState.hwalls,
  };
  if (opponentPosition.length == 0) {
    let shortestPath = getShortestPath(
      ownPosition,
      player == 1 ? p1goals : p2goals,
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
    let moveToCast = {
      action: "move",
      value: shortestPath[1][0] + 1 + "" + (9 - shortestPath[1][1]),
    };
  } else {
    const ourGameState = {
      playerspositions: [opponentPosition, ownPosition],
      p1walls: 10,
      p2walls: 10,
      hwalls: gameState.hwalls,
      vwalls: gameState.vwalls,
      board_visibility: [],
    };
    let moveToCast = computeMove(ourGameState, player);
    if (moveToCast.length == 3) {
      move = {
        action: "wall",
        value: [
          moveToCast[0] + 1 + "" + (9 - moveToCast[1]),
          moveToCast[2] == "h" ? 0 : 1,
        ],
      };
    } else {
      move = {
        action: "move",
        value: moveToCast[0] + 1 + "" + (9 - moveToCast[1]),
      };
    }
    console.log(move);
    return moveToCast;
  }
  console.log(move);
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

module.exports = { computeMove, computeMove2 };

exports.setup = function (AIplay) {
  return new Promise((resolve, reject) => {
    player = AIplay;
    ownPosition = AIplay == 1 ? "51" : "59";
    resolve(ownPosition);
  });
};

exports.nextMove = function (gameState) {
  return new Promise((resolve, reject) => {
    let move;
    let walls = convertWalls(gameState.ownWalls, gameState.opponentWalls);
    opponentPosition = retrievePosition(gameState.board, (player % 2) + 1);
    ownPosition = retrievePosition(gameState.board, player);
    if (opponentPosition.length == 0) {
      let shortestPath = getShortestPath(
        ownPosition,
        player == 1 ? p1goals : p2goals,
        {
          playerspositions:
            player == 1 ? [ownPosition, [-1, -1]] : [[-1, -1], ownPosition],
          hwalls: walls.hwalls,
          vwalls: walls.vwalls,
        },
      );
      if (shortestPath.length == 0) {
        move = {
          action: "idle",
        };
      } else {
        move = {
          action: "move",
          value: shortestPath[1][0] + 1 + "" + (9 - shortestPath[1][1]),
        };
      }
    } else {
      const ourGameState = {
        playerspositions:
          player == 1
            ? [ownPosition, opponentPosition]
            : [opponentPosition, ownPosition],
        p1walls: 10 - gameState.ownWalls.length,
        p2walls: 10 - gameState.opponentWalls.length,
        hwalls: walls.hwalls,
        vwalls: walls.vwalls,
        board_visibility: [],
      };
      let moveToCast = computeMove(ourGameState, player);
      if (moveToCast == undefined) {
        move = {
          action: "idle",
        };
      } else if (moveToCast.length == 3) {
        move = {
          action: "wall",
          value: [
            moveToCast[0] + 1 + "" + (9 - moveToCast[1]),
            moveToCast[2] == "h" ? 0 : 1,
          ],
        };
      } else {
        move = {
          action: "move",
          value: moveToCast[0] + 1 + "" + (9 - moveToCast[1]),
        };
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
    resolve(true);
  });
};
