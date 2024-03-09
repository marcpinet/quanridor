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
    player,
  ).length;
  const opponentPathLength = getShortestPath(
    opponentPosition,
    opponentGoals,
    gameState,
    player === 1 ? 2 : 1,
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
      player,
    ).length;
    const newOpponentPathLength = getShortestPath(
      newState.playerspositions[player === 1 ? 1 : 0],
      opponentGoals,
      newState,
      player === 1 ? 2 : 1,
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
  let aiPlayer = player;
  let opponent = player === 1 ? 2 : 1;
  let aiPath = getShortestPath(
    gameState.playerspositions[aiPlayer - 1],
    aiPlayer === 1 ? p1goals : p2goals,
    gameState,
    aiPlayer,
  );
  let opponentPath = getShortestPath(
    gameState.playerspositions[opponent - 1],
    opponent === 1 ? p1goals : p2goals,
    gameState,
    opponent,
  );

  if (
    opponentPath.length > 2 &&
    aiPath.length <= 2 &&
    areGoalsInsidePath(aiPlayer === 1 ? p1goals : p2goals, aiPath)
  ) {
    console.log("MCTS can win!");
    return aiPath[aiPath.length - 1];
  }

  let aiWalls = aiPlayer === 1 ? gameState.p1walls : gameState.p2walls;
  if (aiWalls === 0) {
    console.log(
      "MCTS has no wall left and will just follow the shortest path.",
    );
    return aiPath[1];
  }

  let root = new Node(null, null, gameState, player);
  let iterations = 50; // Default value for the number of iterations, can be changed to increase the AI's strength (similar to depth in minimax).

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
