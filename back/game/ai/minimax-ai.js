const {
  getPlayerNeighbour,
  checkWin,
  getPossibleMovesAndStrategicWalls,
  getShortestPath,
  getPossibleMoves,
  getPossibleWalls,
  applyMove,
  canWin,
  areGoalsInsidePath,
  p1goals,
  p2goals,
} = require("../utils/game-checkers.js");

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
  const vwalls_s = vwalls
    .map(([x, y]) => `${x}${y}`)
    .sort()
    .join("");
  const hwalls_s = hwalls
    .map(([x, y]) => `${x}${y}`)
    .sort()
    .join("");
  return `${p1x}${p1y}${p2x}${p2y}${p1walls}${p2walls}${vwalls_s}${hwalls_s}${player}`;
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
  const playerPosition = gameState.playerspositions[player - 1];
  const opponentPosition = gameState.playerspositions[player === 1 ? 1 : 0];
  const opponent = player === 1 ? 2 : 1;

  let { canWin: canWinPlayer, path: playerPath } = canWin(gameState, player);
  let { canWin: canWinOpponent, path: opponentPath } = canWin(
    gameState,
    opponent,
  );

  if (playerPath.length === 0) {
    playerPath = getShortestPath(
      playerPosition,
      [opponentPosition],
      gameState,
      player,
    );
  } else if (opponentPath.length === 0) {
    opponentPath = getShortestPath(
      opponentPosition,
      [playerPosition],
      gameState,
      opponent,
    );
  }

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
  const opponent = player === 1 ? 2 : 1;
  const playerWalls = player === 1 ? gameState.p1walls : gameState.p2walls;
  let { canWin: canWinPlayer, path: playerPath } = canWin(gameState, player);
  let { canWin: canWinOpponent, path: opponentPath } = canWin(
    gameState,
    opponent,
  );

  if (playerPath.length === 0) {
    playerPath = getShortestPath(
      playerPosition,
      [opponentPosition],
      gameState,
      player,
    );

    if (playerPath.length === 0) {
      return gameState.playerspositions[player - 1];
    } else if (playerWalls === 0) {
      return playerPath[1];
    }
  }

  if (
    (playerPath.length > 1 &&
      canWinPlayer &&
      !canWinOpponent &&
      playerWalls === 0) ||
    playerWalls === 0
  ) {
    return playerPath[1];
  } else if (
    canWinOpponent &&
    areGoalsInsidePath(opponentPath, player === 1 ? p2goals : p1goals)
  ) {
    const wallMoves = getPossibleMovesAndStrategicWalls(
      gameState,
      player,
    ).possibleWalls;
    for (let wallMove of wallMoves) {
      const newState = applyMove(gameState, wallMove, player);
      if (!newState) continue;
      const { canWin: canStillWinOpponent } = canWin(
        newState,
        player === 1 ? 2 : 1,
      );
      if (!canStillWinOpponent) return wallMove;
    }
  }

  //if (playerPath.length <= 4 || opponentPath.length <= 4) {
  //  depth = 4;
  //}

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
