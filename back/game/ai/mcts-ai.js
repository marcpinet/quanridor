const {
  checkWin,
  getPossibleMoves,
  getPossibleMovesAndStrategicWalls,
  getShortestPath,
  applyMove,
  getNextMoveToFollowShortestPath,
  canWin,
  areGoalsInsidePath,
  getManhattanDistance,
  getPawnDistance,
  isOnGoalSide,
  getStrategicWalls,
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

function heuristicEvaluation(state, player) {
  const playerGoals = player === 1 ? p1goals : p2goals;
  const opponentGoals = player === 1 ? p2goals : p1goals;
  const playerPosition = state.playerspositions[player - 1];
  const opponentPosition = state.playerspositions[player === 1 ? 1 : 0];

  const playerPathLength = getShortestPath(
    playerPosition,
    playerGoals,
    state,
    player,
  ).length;
  const opponentPathLength = getShortestPath(
    opponentPosition,
    opponentGoals,
    state,
    player === 1 ? 2 : 1,
  ).length;

  const playerManhattanDist = getManhattanDistance(playerPosition, playerGoals);
  const opponentManhattanDist = getManhattanDistance(
    opponentPosition,
    opponentGoals,
  );
  const pawnDistance = getPawnDistance(playerPosition, opponentPosition, state);
  const playerOnGoalSide = isOnGoalSide(playerPosition, state);
  const opponentOnGoalSide = isOnGoalSide(opponentPosition, state);
  const playerWallsRemaining = player === 1 ? state.p1walls : state.p2walls;
  const opponentWallsRemaining = player === 1 ? state.p2walls : state.p1walls;

  const lateGameWeight =
    playerPathLength <= 3 || opponentPathLength <= 3 ? 2 : 1;

  const eval =
    (playerPathLength * -3.0 +
      opponentPathLength * 2.0 +
      playerManhattanDist * -1.0 +
      opponentManhattanDist * 0.8 +
      pawnDistance * 1.5 +
      (playerOnGoalSide ? 2.0 : 0) +
      (opponentOnGoalSide ? -2.0 : 0) +
      playerWallsRemaining * 0.3 +
      opponentWallsRemaining * -0.2) *
    lateGameWeight;

  return eval;
}

function heuristicSelect(moves, state, player) {
  let bestMove = null;
  let bestEval = -Infinity;

  for (let move of moves) {
    const newState = applyMove(state, move, player);
    if (!newState) continue;

    const eval = heuristicEvaluation(newState, player);

    if (eval > bestEval) {
      bestEval = eval;
      bestMove = move;
    }
  }

  return bestMove || getNextMoveToFollowShortestPath(state, player);
}

class Node {
  constructor(parent, move, state, player) {
    this.parent = parent;
    this.move = move;
    this.state = state;
    this.children = [];
    this.wins = 0;
    this.visits = 0;
    const { possibleMoves, possibleWalls } = getPossibleMovesAndStrategicWalls(
      state,
      player,
    );
    this.untriedMoves = new Set(possibleMoves.concat(possibleWalls));
  }

  selectChild(explorationParam = 1.414) {
    let selectedChild = null;
    let bestUCTValue = -Infinity;

    for (let child of this.children) {
      const uctValue =
        child.wins / child.visits +
        explorationParam *
          Math.sqrt(Math.log(this.visits) / child.visits) *
          (1 + Math.sqrt(this.visits) / (1 + child.visits));
      if (uctValue > bestUCTValue) {
        selectedChild = child;
        bestUCTValue = uctValue;
      }
    }

    return selectedChild;
  }

  addChild(move, gameState, player) {
    const child = new Node(this, move, gameState, player);
    this.untriedMoves.delete(move);
    this.children.push(child);
    return child;
  }

  update(outcome) {
    this.visits++;
    this.wins += outcome;
  }

  simulate(player, depth = 0, maxDepth = 50) {
    if (depth >= maxDepth) return 0;

    let state = this.state;
    let currentPlayer = player;

    while (true) {
      const possibleWalls = getStrategicWalls(state, currentPlayer);
      const wallsLeft = currentPlayer === 1 ? state.p1walls : state.p2walls;

      if (Math.random() < 0.7 || wallsLeft === 0) {
        // Move the pawn to one of the shortest paths
        const move = getNextMoveToFollowShortestPath(state, currentPlayer);
        if (!move) break;
        state = applyMove(state, move, currentPlayer);
      } else {
        // Place a probable wall randomly or move the pawn backwards
        if (possibleWalls.length > 0) {
          const randomWall =
            possibleWalls[Math.floor(Math.random() * possibleWalls.length)];
          state = applyMove(state, randomWall, currentPlayer);
        } else {
          const backwardMove = getBackwardMove(state, currentPlayer);
          if (!backwardMove) break;
          state = applyMove(state, backwardMove, currentPlayer);
        }
      }

      currentPlayer = currentPlayer === 1 ? 2 : 1;

      if (checkWin(state, player)) return 1;
      if (checkWin(state, player === 1 ? 2 : 1)) return -1;
      if (canWin(state, player).canWin) return 1;
      if (canWin(state, player === 1 ? 2 : 1).canWin) return -1;
      if (state.turn >= 200) return 0;

      depth++;
      if (depth >= maxDepth) return 0;
    }

    return 0;
  }
}

function computeMove(
  gameState,
  player,
  timeLimit = 500,
  explorationParam = 1.414,
) {
  const playerWalls = player === 1 ? gameState.p1walls : gameState.p2walls;
  const { canWin: canWinPlayer, path: playerPath } = canWin(gameState, player);
  const { canWin: canWinOpponent, path: opponentPath } = canWin(
    gameState,
    player === 1 ? 2 : 1,
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

  const root = new Node(null, null, gameState, player);
  let bestMove = null;
  let bestWinRatio = -Infinity;

  const endTime = Date.now() + timeLimit;

  while (Date.now() < endTime) {
    let node = root;
    let state = node.state;

    // Selection
    while (node.untriedMoves.size === 0 && node.children.length > 0) {
      node = node.selectChild(explorationParam);
      state = node.state;
    }

    // Expansion
    if (node.untriedMoves.size > 0) {
      const opponentWallsLeft = player === 1 ? state.p2walls : state.p1walls;
      let move;

      if (opponentWallsLeft === 0) {
        const { possibleMoves, possibleWalls } =
          getPossibleMovesAndStrategicWalls(state, player);
        const candidateMoves = [...possibleMoves, ...possibleWalls];
        move = heuristicSelect(candidateMoves, state, player);
      } else {
        move = heuristicSelect(Array.from(node.untriedMoves), state, player);
      }

      state = applyMove(state, move, player);
      node = node.addChild(move, state, player);
    }

    // Simulation
    const outcome = node.simulate(player);

    // Backpropagation
    while (node !== null) {
      node.update(outcome);
      node = node.parent;
    }

    // Update best move
    const winRatio = root.wins / root.visits;
    if (winRatio > bestWinRatio) {
      bestMove = root.children.reduce(
        (best, child) => (child.visits > best.visits ? child : best),
        root.children[0],
      ).move;
      bestWinRatio = winRatio;
    }
  }

  return bestMove;
}

function getBackwardMove(gameState, player) {
  const playerPosition = gameState.playerspositions[player - 1];
  const opponentPosition = gameState.playerspositions[player === 1 ? 1 : 0];
  const playerGoals = player === 1 ? p1goals : p2goals;

  const possibleMoves = getPossibleMoves(gameState, playerPosition, player);

  let maxDistanceMove = null;
  let maxDistance = -Infinity;

  for (const move of possibleMoves) {
    const distance =
      getManhattanDistance(move, playerGoals) +
      getManhattanDistance(move, opponentPosition);

    if (distance > maxDistance) {
      maxDistance = distance;
      maxDistanceMove = move;
    }
  }

  return maxDistanceMove;
}

module.exports = { computeMove };
