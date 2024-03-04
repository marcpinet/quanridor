const {
  hasAtteignedGoal,
  checkWin,
  getPossibleMovesAndStrategicWalls,
  getShortestPath,
  getPossibleMoves,
  getPossibleWalls,
  applyMove,
  areGoalsInsidePath,
  canWin,
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

function createUniqueKey(gameState, player) {
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
    player: player,
  });
}

function determineDefaultMove(gameState, player) {
  let possibleMoves = getPossibleMoves(
    gameState,
    gameState.playerspositions[player - 1],
    player,
  );
  if (possibleMoves.length > 0)
    return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
  let possibleWalls = getPossibleWalls(gameState, player);
  if (possibleWalls.length > 0)
    return possibleWalls[Math.floor(Math.random() * possibleWalls.length)];
  return gameState.playerspositions[player - 1]; // can be null
}

function minimax(
  gameState,
  depth,
  alpha,
  beta,
  maximizingPlayer,
  initialDepth = depth,
  player,
) {
  let key = createUniqueKey(gameState, player);
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

  if (defaultMove === null) {
    return {
      value: -10000000,
      move: defaultMove,
    };
  }

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
      player,
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

function evaluate(gameState, player, depthPenalty) {
  const playerGoals = player === 1 ? p1goals : p2goals;
  const opponentGoals = player === 1 ? p2goals : p1goals;
  const playerPosition = gameState.playerspositions[player - 1];
  const opponentPosition = gameState.playerspositions[player === 1 ? 1 : 0];

  if (canWin(gameState, player)) return 10000000000 - depthPenalty;
  if (canWin(gameState, player === 1 ? 2 : 1))
    return -10000000000 + depthPenalty;

  let playerPath = getShortestPath(
    playerPosition,
    playerGoals,
    gameState,
    player,
  );
  let opponentPath = getShortestPath(
    opponentPosition,
    opponentGoals,
    gameState,
    player === 1 ? 2 : 1,
  );

  if (
    playerPath.length === 0 &&
    !hasAtteignedGoal(playerPosition, playerGoals)
  ) {
    // Force the player to get gloser to the opponent position
    playerPath = getShortestPath(
      playerPosition,
      [opponentPosition],
      gameState,
      player,
    );
  }

  let score = 0;

  // Adjust score based on path length difference ONLY IF the player still has walls
  const playerWalls = player === 1 ? gameState.p1walls : gameState.p2walls;
  if (playerWalls > 0) score += (opponentPath.length - playerPath.length) * 10;
  // If he has no walls, he just needs to get to the goal as fast as possible
  else return -playerPath.length * 10;

  // Adjust for remaining walls - incentivize saving walls for critical moments
  let wallsDifference = gameState.p1walls - gameState.p2walls;
  score += player === 1 ? wallsDifference * 5 : -wallsDifference * 5;

  return score;
}

function computeMove(gameState, player) {
  let depth = 2;
  let aiPlayer = player;
  let aiPath = getShortestPath(
    gameState.playerspositions[aiPlayer - 1],
    aiPlayer === 1 ? p1goals : p2goals,
    gameState,
    aiPlayer,
  );

  if (
    aiPath.length <= 2 &&
    areGoalsInsidePath(aiPlayer === 1 ? p1goals : p2goals, aiPath)
  ) {
    console.log("Minimax can win!");
    return aiPath[aiPath.length - 1];
  }

  let aiWalls = getPossibleWalls(gameState, aiPlayer);
  let aiMoves = getPossibleMoves(
    gameState,
    gameState.playerspositions[aiPlayer - 1],
    aiPlayer,
  );
  if (aiWalls.length === 0) {
    console.log("Minimax has no walls, following path...");
    if (aiPath.length > 1) return aiPath[1];
    else if (aiMoves.length > 0) return aiMoves[0];
    else return gameState.playerspositions[aiPlayer - 1];
  }

  let { move } = minimax(
    gameState,
    depth,
    -Infinity,
    +Infinity,
    true,
    depth,
    player,
  );

  if (
    move === null ||
    move === undefined ||
    move.length === 0 ||
    move[0] === null ||
    isNaN(move[0]) ||
    move[0] === undefined
  ) {
    console.log(
      "Minimax returned null or undefined move, checking for default...",
    );
    let possibleMoves = getPossibleMoves(
      gameState,
      gameState.playerspositions[player - 1],
      player,
    );
    if (possibleMoves.length > 0) {
      console.log("Minimax found a default move.");
      return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    }
    let possibleWalls = getPossibleWalls(gameState, player);
    if (possibleWalls.length > 0) {
      console.log("Minimax found a default wall.");
      return possibleWalls[Math.floor(Math.random() * possibleWalls.length)];
    }
    console.log("Minimax found no moves, returning idling position.");
    return gameState.playerspositions[player - 1];
  }

  return move;
}

/*

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

function retrieveOurPosition(board) {
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (board[i][j] == 1) {
        return [i, 8 - j];
      }
    }
  }
  return [];
}

function retrieveOpponentPosition(board) {
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (board[i][j] == 2) {
        return [i, 8 - j];
      }
    }
  }
  return [];
}

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
    opponentPosition = retrieveOpponentPosition(gameState.board);
    ownPosition = retrieveOurPosition(gameState.board);
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
        player,
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

*/

module.exports = { computeMove };
