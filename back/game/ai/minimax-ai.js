const {
  isLegal,
  canJump,
  checkWin,
  isWallLegal,
  cloneGameState,
  getPossibleMovesAndStrategicWalls,
  getShortestPath,
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
  let turn = gameState.turn;
  let winner = gameState.winner;
  return JSON.stringify({
    p1_coord: p1_coord,
    p2_coord: p2_coord,
    p1walls: p1walls,
    p2walls: p2walls,
    vwalls: vwalls,
    hwalls: hwalls,
    turn: turn,
    winner: winner,
  });
}

function minimax(gameState, depth, alpha, beta, maximizingPlayer) {
  let key = createUniqueKey(gameState);

  if (transpositionTable.get(key)) {
    return transpositionTable.get(key);
  }

  let p1_coord = gameState.playerspositions[0];
  let p2_coord = gameState.playerspositions[1];
  let best = maximizingPlayer
    ? { value: -Infinity, move: null }
    : { value: Infinity, move: null };

  if (
    depth == 0 ||
    checkWin(1, { p1_coord: p1_coord, p2_coord: p2_coord }) ||
    checkWin(2, { p1_coord: p1_coord, p2_coord: p2_coord })
  ) {
    return {
      value: evaluate(gameState, maximizingPlayer ? 2 : 1),
      move: gameState.playerspositions[maximizingPlayer ? 1 : 0],
    };
  }

  let { possibleMoves, possibleWalls } = getPossibleMovesAndStrategicWalls(
    gameState,
    maximizingPlayer ? 2 : 1,
  );
  // add walls to possible moves
  possibleMoves = possibleMoves.concat(possibleWalls);

  if (possibleMoves.length == 0) {
    return {
      value: -10000000,
      move: gameState.playerspositions[1],
    };
  }

  for (let someMove of possibleMoves) {
    let chosenMove = applyMove(gameState, someMove, maximizingPlayer ? 2 : 1);
    if (!chosenMove) {
      continue;
    }

    let { value, move } = minimax(
      chosenMove,
      depth - 1,
      alpha,
      beta,
      !maximizingPlayer,
    );

    if (maximizingPlayer) {
      if (value > best.value) {
        best.value = value;
        best.move = someMove;
      }
      alpha = Math.max(alpha, value);
      if (beta <= alpha) {
        break;
      }
    } else {
      if (value < best.value) {
        best.value = value;
        best.move = someMove;
      }
      beta = Math.min(beta, value);
      if (beta <= alpha) {
        break;
      }
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

function evaluate(gameState, player) {
  const playerGoals = player === 1 ? p1goals : p2goals;
  const opponentGoals = player === 1 ? p2goals : p1goals;
  const playerPosition = gameState.playerspositions[player - 1];
  const opponentPosition = gameState.playerspositions[player === 1 ? 1 : 0];

  if (canWin(gameState, player)) return 100000;
  if (canWin(gameState, player === 1 ? 2 : 1)) return -100000;

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

function computeMove(gameState) {
  let depth = 2;
  let { value, move } = minimax(gameState, depth, -Infinity, +Infinity, true);
  console.log("AI played!", move);
  return move;
}

module.exports = { computeMove };
