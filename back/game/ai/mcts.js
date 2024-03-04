const {
  checkWin,
  cloneGameState,
  getPossibleMovesAndStrategicWalls,
  getShortestPath,
  getPossibleMoves,
  getPossibleWalls,
  applyMove,
} = require("../utils/game-checkers.js");

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

function selectRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getNextMoveToFollowShortestPath(gameState, player) {
  const playerPosition = gameState.playerspositions[player - 1];
  const playerGoals = player === 1 ? p1goals : p2goals;
  const shortestPath = getShortestPath(playerPosition, playerGoals, gameState);
  if (shortestPath.length < 1) {
    return playerPosition;
  }
  return shortestPath[1];
}

function heuristicSelect(moves, gameState, player) {
  const playerGoals = player === 1 ? p1goals : p2goals;
  const opponentGoals = player === 1 ? p2goals : p1goals;
  const playerPosition = gameState.playerspositions[player - 1];
  const opponentPosition = gameState.playerspositions[player === 1 ? 1 : 0];

  // Get the current shortest path to the goal for both players.
  const playerPathLength = getShortestPath(
    playerPosition,
    playerGoals,
    gameState,
  ).length;
  const opponentPathLength = getShortestPath(
    opponentPosition,
    opponentGoals,
    gameState,
  ).length;

  // Filter moves based on the opponent's proximity to the goal compared to the player.
  let filteredMoves = moves;
  if (playerPathLength <= opponentPathLength) {
    // If the player is not further from the goal than the opponent, remove wall moves.
    filteredMoves = moves.filter((move) => move.length !== 3); // Assuming wall moves are represented by arrays of length 3.
  }

  let bestMove = null;
  let highestScore = -Infinity;

  for (let move of filteredMoves) {
    // Apply the move to simulate the gameState after the move.
    const newState = applyMove(gameState, move, player);
    if (!newState) continue; // Skip invalid moves.

    // Calculate the new path lengths after the move.
    const newPlayerPathLength = getShortestPath(
      newState.playerspositions[player - 1],
      playerGoals,
      newState,
    ).length;
    const newOpponentPathLength = getShortestPath(
      newState.playerspositions[player === 1 ? 1 : 0],
      opponentGoals,
      newState,
    ).length;

    // Define the scores based on path lengths.
    const pathShorteningScore = playerPathLength - newPlayerPathLength; // Positive if the path is shortened.
    const opponentHindranceScore = newOpponentPathLength - opponentPathLength; // Positive if the opponent's path is lengthened.

    // Weight components according to their importance.
    const score = pathShorteningScore * 2.0 + opponentHindranceScore * 1.5;

    // Update bestMove if the current move has a higher score.
    if (score > highestScore) {
      highestScore = score;
      bestMove = move;
    }
  }

  // Fallback to random selection if no heuristic-based move is found among the filtered moves.
  return bestMove || getNextMoveToFollowShortestPath(gameState, player);
}

function filterMoves(moves, gameState, player) {
  // Filter moves based on the opponent's proximity to the goal compared to the player.
  const playerGoals = player === 1 ? p1goals : p2goals;
  const opponentGoals = player === 1 ? p2goals : p1goals;
  const playerPosition = gameState.playerspositions[player - 1];
  const opponentPosition = gameState.playerspositions[player === 1 ? 1 : 0];

  const playerPathLength = getShortestPath(
    playerPosition,
    playerGoals,
    gameState,
  ).length;
  const opponentPathLength = getShortestPath(
    opponentPosition,
    opponentGoals,
    gameState,
  ).length;

  if (playerPathLength <= opponentPathLength) {
    // If the player is not further from the goal than the opponent, remove wall moves.
    return moves.filter((move) => move.length !== 3); // Assuming wall moves are represented by arrays of length 3.
  }

  return moves;
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

  selectChild() {
    let selected = null;
    let bestValue = -Infinity;
    for (let child of this.children) {
      let uctValue =
        child.wins / child.visits +
        Math.sqrt((2 * Math.log(this.visits)) / child.visits);
      if (uctValue > bestValue) {
        selected = child;
        bestValue = uctValue;
      }
    }
    return selected;
  }

  addChild(move, gameState, player) {
    let child = new Node(this, move, gameState, player);
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
      let moves = getPossibleMovesAndStrategicWalls(state, currentPlayer);

      let concatenedMoves = moves.possibleMoves.concat(moves.possibleWalls);

      if (concatenedMoves.length === 0) break;

      let move = getNextMoveToFollowShortestPath(state, currentPlayer);

      if (move === undefined) {
        break;
      }

      state = applyMove(state, move, currentPlayer);
      currentPlayer = currentPlayer === 1 ? 2 : 1;
    }
    let result = checkWin(state, player) ? 1 : -1;
    return result;
  }

  bestChild() {
    let bestScore = -Infinity;
    let bestChild = null;

    for (let child of this.children) {
      let score = child.wins / child.visits;
      if (score > bestScore) {
        bestScore = score;
        bestChild = child;
      }
    }

    return bestChild;
  }
}

function computeMove(gameState, player) {
  if (
    checkWin(gameState, player) ||
    checkWin(gameState, player === 1 ? 2 : 1)
  ) {
    let path = getShortestPath(gameState, player);
    if (path.length > 1) return path[1];
    return gameState.playerspositions[player - 1];
  }

  let root = new Node(null, null, gameState, player);
  let iterations = 10; // Default value for the number of iterations, can be changed to increase the AI's strength (similar to depth in minimax).

  for (let i = 0; i < iterations; i++) {
    let node = root;
    let state = cloneGameState(gameState);

    // Selection
    while (node.untriedMoves.length === 0 && node.children.length > 0) {
      node = node.selectChild();
      applyMove(state, node.move);
    }

    // Expansion
    if (node.untriedMoves.length > 0) {
      let move = heuristicSelect(node.untriedMoves, state, player);
      state = applyMove(state, move, player);
      node = node.addChild(move, state, player);
    }

    // Simulation
    let outcome = node.simulate(player);

    // Backpropagation
    while (node !== null) {
      node.update(outcome, player);
      node = node.parent;
    }
  }

  return root.bestChild().move;
}

module.exports = { computeMove };
