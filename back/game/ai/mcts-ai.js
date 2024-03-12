const {
  checkWin,
  cloneGameState,
  getPossibleMovesAndStrategicWalls,
  getShortestPath,
  applyMove,
  getNextMoveToFollowShortestPath,
  canWin,
  areGoalsInsidePath,
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

function selectRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function heuristicSelect(moves, gameState, player) {
  const playerGoals = player === 1 ? p1goals : p2goals;
  const opponentGoals = player === 1 ? p2goals : p1goals;
  const playerPosition = gameState.playerspositions[player - 1];
  const opponentPosition = gameState.playerspositions[player === 1 ? 1 : 0];

  const playerPathLength = getShortestPath(
    playerPosition,
    playerGoals,
    gameState,
    player,
  ).length;
  const opponentPathLength = getShortestPath(
    opponentPosition,
    opponentGoals,
    gameState,
    player === 1 ? 2 : 1,
  ).length;

  let bestMove = null;
  let highestScore = -Infinity;

  for (let move of moves) {
    const newState = applyMove(gameState, move, player);
    if (!newState) continue;

    const newPlayerPathLength = getShortestPath(
      newState.playerspositions[player - 1],
      playerGoals,
      newState,
      player,
    ).length;
    const newOpponentPathLength = getShortestPath(
      newState.playerspositions[player === 1 ? 1 : 0],
      opponentGoals,
      newState,
      player === 1 ? 2 : 1,
    ).length;

    const pathShorteningScore = playerPathLength - newPlayerPathLength;
    const opponentHindranceScore = newOpponentPathLength - opponentPathLength;

    // Augmenter le poids du score d'entrave de l'adversaire s'il est proche de la ligne d'arrivée
    const opponentHindranceWeight = opponentPathLength <= 3 ? 3.0 : 1.5;

    const score =
      pathShorteningScore * 2.0 +
      opponentHindranceScore * opponentHindranceWeight;

    if (score > highestScore) {
      highestScore = score;
      bestMove = move;
    }
  }

  return bestMove || getNextMoveToFollowShortestPath(gameState, player);
}

class Node {
  constructor(parent, move, gameState, player) {
    this.parent = parent;
    this.move = move;
    this.gameState = gameState;
    this.children = [];
    this.wins = 0;
    this.visits = 0;
    this.untriedMoves = getPossibleMovesAndStrategicWalls(gameState, player);
    this.untriedMoves = this.untriedMoves.possibleMoves.concat(
      this.untriedMoves.possibleWalls,
    );
  }

  selectChild(explorationParam = Math.sqrt(2)) {
    let selectedChild = null;
    let bestUCTValue = -Infinity;

    for (let child of this.children) {
      const uctValue =
        child.wins / child.visits +
        explorationParam * Math.sqrt(Math.log(this.visits) / child.visits);
      if (uctValue > bestUCTValue) {
        selectedChild = child;
        bestUCTValue = uctValue;
      }
    }

    return selectedChild;
  }

  addChild(move, gameState, player) {
    const child = new Node(this, move, gameState, player);
    this.untriedMoves = this.untriedMoves.filter((m) => m !== move);
    this.children.push(child);
    return child;
  }

  update(outcome) {
    this.visits++;
    this.wins += outcome;
  }

  simulate(player) {
    let state = cloneGameState(this.gameState);
    let currentPlayer = player;

    while (true) {
      const { possibleMoves, possibleWalls } =
        getPossibleMovesAndStrategicWalls(state, currentPlayer);
      const concatenatedMoves = possibleMoves.concat(possibleWalls);

      if (concatenatedMoves.length === 0) break;

      const move = heuristicSelect(concatenatedMoves, state, currentPlayer);
      if (move === undefined) break;

      state = applyMove(state, move, currentPlayer);
      currentPlayer = currentPlayer === 1 ? 2 : 1;

      if (checkWin(state, player)) return 1;
      if (checkWin(state, player === 1 ? 2 : 1)) return -1;
      if (state.turn >= 200) return 0;
    }

    return 0;
  }

  bestChild(exploitationParam = 0) {
    let bestScore = -Infinity;
    let bestChild = null;

    for (let child of this.children) {
      const score =
        child.wins / child.visits +
        exploitationParam *
          Math.sqrt((2 * Math.log(this.visits)) / child.visits);
      if (score > bestScore) {
        bestScore = score;
        bestChild = child;
      }
    }

    return bestChild;
  }
}

function computeMove(
  gameState,
  player,
  iterations = 1000,
  timeLimit = 500,
  explorationParam = Math.sqrt(2),
) {
  const startTime = Date.now();

  let { canWin: canWinPlayer, path: playerPath } = canWin(gameState, player);

  if (canWinPlayer) {
    return playerPath[1];
  }

  const root = new Node(null, null, gameState, player);
  let bestMove = null;
  let bestWinRatio = -Infinity;

  for (let i = 0; i < iterations; i++) {
    if (Date.now() - startTime > timeLimit) {
      break;
    }

    let node = root;
    let state = cloneGameState(gameState);

    // Selection
    while (node.untriedMoves.length === 0 && node.children.length > 0) {
      node = node.selectChild(explorationParam);
      state = applyMove(state, node.move, player);
    }

    // Expansion
    if (node.untriedMoves.length > 0) {
      const move = heuristicSelect(node.untriedMoves, state, player);
      state = applyMove(state, move, player);
      node = node.addChild(move, state, player);
    }

    // Expansion
    if (node.untriedMoves.length > 0) {
      const move = heuristicSelect(node.untriedMoves, state, player);
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
      bestMove = root.bestChild().move;
      bestWinRatio = winRatio;
    }
  }

  return bestMove;
}

module.exports = { computeMove };
