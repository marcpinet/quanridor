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

const p1goals = [
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
const p2goals = [
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

class TranspositionTable {
  constructor() {
    this.table = new Map();
  }

  set(key, value) {
    this.table.set(key, value);
  }

  get(key) {
    return this.table.get(key);
  }
}

const transpositionTable = new TranspositionTable();

function createUniqueKey(gameState, player) {
  const { playerspositions, p1walls, p2walls, vwalls, hwalls } = gameState;
  const [p1x, p1y, p2x, p2y] = [...playerspositions[0], ...playerspositions[1]];
  const vwallsSum = vwalls.reduce((sum, [x, y]) => sum + x + y, 0);
  const hwallsSum = hwalls.reduce((sum, [x, y]) => sum + x + y, 0);
  return `${p1x}${p1y}${p2x}${p2y}${p1walls}${p2walls}${vwallsSum}${hwallsSum}${player}`;
}

function determineDefaultMove(gameState, player) {
  const possibleMoves = getPossibleMoves(
    gameState,
    gameState.playerspositions[player - 1],
    player,
  );
  if (possibleMoves.length > 0) {
    return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
  }
  const possibleWalls = getPossibleWalls(gameState, player);
  if (possibleWalls.length > 0) {
    return possibleWalls[Math.floor(Math.random() * possibleWalls.length)];
  }
  return gameState.playerspositions[player - 1];
}

function minimax(
  gameState,
  depth,
  alpha,
  beta,
  maximizingPlayer,
  initialDepth,
  player,
) {
  const key = createUniqueKey(gameState, player);
  const opponentPlayer = player === 1 ? 2 : 1;
  const ttEntry = transpositionTable.get(key);
  if (ttEntry) {
    return ttEntry;
  }

  const [p1_coord, p2_coord] = gameState.playerspositions;
  const defaultMove = determineDefaultMove(
    gameState,
    maximizingPlayer ? player : opponentPlayer,
  );
  if (!defaultMove) {
    return { value: -Infinity, move: null };
  }

  let best = maximizingPlayer
    ? { value: -Infinity, move: defaultMove }
    : { value: Infinity, move: defaultMove };

  if (
    depth === 0 ||
    checkWin(1, { p1_coord, p2_coord }) ||
    checkWin(2, { p1_coord, p2_coord })
  ) {
    const value = evaluate(
      gameState,
      maximizingPlayer ? player : opponentPlayer,
      initialDepth - depth,
    );
    return { value, move: defaultMove };
  }

  const { possibleMoves, possibleWalls } = getPossibleMovesAndStrategicWalls(
    gameState,
    maximizingPlayer ? player : opponentPlayer,
  );
  const allMoves = [...possibleMoves, ...possibleWalls];
  if (allMoves.length === 0) {
    return { value: -Infinity, move: defaultMove };
  }

  for (const move of allMoves) {
    const nextGameState = applyMove(
      gameState,
      move,
      maximizingPlayer ? player : opponentPlayer,
    );
    if (!nextGameState) {
      continue;
    }

    const { value } = minimax(
      nextGameState,
      depth - 1,
      alpha,
      beta,
      !maximizingPlayer,
      initialDepth,
      player,
    );

    if (maximizingPlayer) {
      if (value > best.value) {
        best = { value, move };
      }
      alpha = Math.max(alpha, value);
    } else {
      if (value < best.value) {
        best = { value, move };
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
  const [playerPosition, opponentPosition] = gameState.playerspositions;
  const opponent = player === 1 ? 2 : 1;

  const { canWin: canWinPlayer, path: playerPath } = canWin(gameState, player);
  const { canWin: canWinOpponent, path: opponentPath } = canWin(
    gameState,
    opponent,
  );

  if (canWinPlayer && !canWinOpponent) {
    return Infinity - depthPenalty;
  }
  if (canWinOpponent) {
    return -Infinity + depthPenalty;
  }

  let score = 0;

  // Distance to the goal
  const playerDistanceToGoal = playerPath.length;
  const opponentDistanceToGoal = opponentPath.length;
  score += (opponentDistanceToGoal - playerDistanceToGoal) * 10;

  // Wall placement
  const playerWalls = player === 1 ? gameState.p1walls : gameState.p2walls;
  const opponentWalls = player === 1 ? gameState.p2walls : gameState.p1walls;
  const wallsDifference = playerWalls - opponentWalls;
  score += wallsDifference * 5;

  // Mobility
  const playerMoves = getPossibleMoves(
    gameState,
    playerPosition,
    player,
  ).length;
  const opponentMoves = getPossibleMoves(
    gameState,
    opponentPosition,
    opponent,
  ).length;
  score += (playerMoves - opponentMoves) * 3;

  // Parity
  if (player === 2) {
    score += 2;
  }

  return score;
}

function computeMove(gameState, player) {
  const depth = 2;
  const aiPlayer = player;
  const opponent = player === 1 ? 2 : 1;
  const aiGoals = aiPlayer === 1 ? p1goals : p2goals;
  const opponentGoals = opponent === 1 ? p1goals : p2goals;
  const aiPath = getShortestPath(
    gameState.playerspositions[aiPlayer - 1],
    aiGoals,
    gameState,
    aiPlayer,
  );
  const opponentPath = getShortestPath(
    gameState.playerspositions[opponent - 1],
    opponentGoals,
    gameState,
    opponent,
  );

  if (
    opponentPath.length > 2 &&
    aiPath.length <= 2 &&
    areGoalsInsidePath(aiGoals, aiPath)
  ) {
    return aiPath[aiPath.length - 1];
  }

  const aiWalls = getPossibleWalls(gameState, aiPlayer);
  const aiMoves = getPossibleMoves(
    gameState,
    gameState.playerspositions[aiPlayer - 1],
    aiPlayer,
  );
  if (aiWalls.length === 0) {
    if (aiPath.length > 1) {
      return aiPath[1];
    } else if (aiMoves.length > 0) {
      return aiMoves[0];
    } else {
      return gameState.playerspositions[aiPlayer - 1];
    }
  }

  const { move } = minimax(
    gameState,
    depth,
    -Infinity,
    Infinity,
    true,
    depth,
    player,
  );

  if (
    !move ||
    move.length === 0 ||
    move[0] === null ||
    isNaN(move[0]) ||
    move[0] === undefined
  ) {
    const possibleMoves = getPossibleMoves(
      gameState,
      gameState.playerspositions[player - 1],
      player,
    );
    if (possibleMoves.length > 0) {
      return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    }
    const possibleWalls = getPossibleWalls(gameState, player);
    if (possibleWalls.length > 0) {
      return possibleWalls[Math.floor(Math.random() * possibleWalls.length)];
    }
    return gameState.playerspositions[player - 1];
  }

  return move;
}

module.exports = { computeMove };
