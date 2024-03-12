const {
  getPlayerNeighbour,
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

function selectRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
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

  if (depth === 0 || checkWin(gameState, 1) || checkWin(gameState, 2)) {
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
  const [playerPosition, opponentPosition] = gameState.playerspositions;
  const opponent = player === 1 ? 2 : 1;

  const { canWin: canWinPlayer, path: playerPath } = canWin(gameState, player);
  const { canWin: canWinOpponent, path: opponentPath } = canWin(
    gameState,
    opponent,
  );

  if (canWinPlayer) {
    return 1000000 - depthPenalty;
  }
  if (canWinOpponent) {
    return -1000000 + depthPenalty;
  }

  let score = 0;

  // Distance to the goal
  const playerDistanceToGoal = playerPath.length;
  const opponentDistanceToGoal = opponentPath.length;
  score += (opponentDistanceToGoal - playerDistanceToGoal) * 100;

  // Favoriser les positions proches de la ligne d'arrivée
  const playerVerticalDistance = Math.min(...playerPath.map(([x, y]) => y));
  const opponentVerticalDistance = Math.min(
    ...opponentPath.map(([x, y]) => 8 - y),
  );
  score += (opponentVerticalDistance - playerVerticalDistance) * 50;

  // Wall placement
  const playerWalls = player === 1 ? gameState.p1walls : gameState.p2walls;
  const opponentWalls = player === 1 ? gameState.p2walls : gameState.p1walls;
  const wallsDifference = playerWalls - opponentWalls;
  score += wallsDifference * 30;

  // Pénaliser le gaspillage de murs
  const playerWallsPlaced = 10 - playerWalls;
  const opponentWallsPlaced = 10 - opponentWalls;
  const excessWalls = playerWallsPlaced - opponentWallsPlaced;
  if (excessWalls > 2) {
    score -= excessWalls * 50;
  }

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
  score += (playerMoves - opponentMoves) * 20;

  // Bloquer l'adversaire
  if (opponentDistanceToGoal <= 3) {
    score -= (4 - opponentDistanceToGoal) * 200;
  }

  // Favoriser le placement de murs près de l'adversaire
  const opponentNeighbors = getPlayerNeighbour(opponentPosition);
  const wallsNearOpponent = opponentNeighbors.filter(
    ([x, y]) =>
      gameState.vwalls.some(
        ([wx, wy]) => wx === x && (wy === y || wy === y - 1),
      ) ||
      gameState.hwalls.some(
        ([wx, wy]) => wy === y && (wx === x || wx === x - 1),
      ),
  ).length;
  score += wallsNearOpponent * 50;

  // Parity
  if (player === 2) {
    score += 10;
  }

  return score;
}

function computeMove(gameState, player, depth = 2) {
  const aiPlayer = player;
  const opponent = player === 1 ? 2 : 1;
  const playerWalls = player === 1 ? gameState.p1walls : gameState.p2walls;
  const opponentGoals = opponent === 1 ? p1goals : p2goals;
  let { canWin: canWinPlayer, path: aiPath } = canWin(gameState, player);
  let { canWin: canWinOpponent, path: opponentPath } = canWin(
    gameState,
    opponent,
  );

  if (
    (aiPath.length >= 2 && canWinPlayer && !canWinOpponent) ||
    playerWalls === 0
  ) {
    console.log("Minimax follows path", aiPath);
    return aiPath[1];
  }

  if (aiPath.length <= 4 || opponentPath.length <= 4) {
    depth = 4;
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

  if (move.length === 3) {
    const gameStateAfterWall = applyMove(gameState, move, player);
    const opponentPathAfterWall = getShortestPath(
      gameStateAfterWall.playerspositions[opponent - 1],
      opponentGoals,
      gameStateAfterWall,
      opponent,
    );
    if (opponentPathAfterWall.length > opponentPath.length + 2) {
      return move;
    }
  }

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
