const {
  isLegal,
  canJump,
  checkWin,
  isWallLegal,
  getPossibleMovesAndWalls,
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

  let { possibleMoves, possibleWalls } = getPossibleMovesAndWalls(
    gameState,
    maximizingPlayer ? 2 : 1,
  );
  // add walls to possible moves
  possibleMoves = possibleMoves.concat(possibleWalls);
  if (possibleMoves.length == 0) {
    return {
      value: -Infinity,
      move: gameState.playerspositions[1],
    };
  }

  for (let someMove of possibleMoves) {
    let { value, move } = minimax(
      applyMove(gameState, someMove, maximizingPlayer ? 2 : 1),
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

function evaluate(gameState, player) {
  // Basic win condition checks
  let p1_coord = gameState.playerspositions[0];
  let p2_coord = gameState.playerspositions[1];
  if (checkWin(player, { p1_coord: p1_coord, p2_coord: p2_coord }))
    return Infinity;
  if (
    checkWin(player === 1 ? 2 : 1, { p1_coord: p1_coord, p2_coord: p2_coord })
  )
    return -Infinity;

  let score = 0;
  let playerDistance = calculateDistanceToGoal(gameState, player);
  let opponentDistance = calculateDistanceToGoal(
    gameState,
    player === 1 ? 2 : 1,
  );
  let wallDifference =
    player === 2
      ? gameState.p2walls - gameState.p1walls
      : gameState.p1walls - gameState.p2walls;

  // Prioritize advancing towards the goal
  score += (opponentDistance - playerDistance) * 10;

  // Wall placement strategy
  if (gameState.p1walls > 0 || gameState.p2walls > 0) {
    score += evaluateWallPlacement(gameState, player);
  }

  // Endgame strategy: if the opponent has no walls, focus on path advancement
  //if ((player === 1 && gameState.p2walls === 0) || (player === 2 && gameState.p1walls === 0)) {
  //  score += evaluateEndgameStrategy(gameState, player);
  //}

  // Wall difference impact
  score += wallDifference;

  return score;
}

function evaluateWallPlacement(gameState, player) {
  let score = 0;
  let opponent = player === 1 ? 2 : 1;
  let playerShortestPath = getShortestPath(
    gameState.playerspositions[player - 1],
    player === 1 ? p1goals : p2goals,
    gameState.playerspositions[0],
    gameState.playerspositions[1],
    gameState.vwalls,
    gameState.hwalls,
  ).length;
  let opponentShortestPath = getShortestPath(
    gameState.playerspositions[player - 1],
    player === 1 ? p1goals : p2goals,
    gameState.playerspositions[0],
    gameState.playerspositions[1],
    gameState.vwalls,
    gameState.hwalls,
  ).length;

  // Assume gameState has a method to simulate wall placement without permanently altering the state
  let simulatedGameState = cloneGameState(gameState); // Deep copy to simulate wall placements

  // Iterate through all possible wall placements (this is a simplification)
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      // Simulate placing a wall and calculate its impact
      simulateWall(simulatedGameState, i, j, "v"); // Simulate a vertical wall
      let newOpponentPath = getShortestPath(
        simulatedGameState.playerspositions[player - 1],
        player === 1 ? p1goals : p2goals,
        simulatedGameState.playerspositions[0],
        simulatedGameState.playerspositions[1],
        simulatedGameState.vwalls,
        simulatedGameState.hwalls,
      ).length;
      let newPlayerPath = getShortestPath(
        simulatedGameState.playerspositions[player - 1],
        player === 1 ? p1goals : p2goals,
        simulatedGameState.playerspositions[0],
        simulatedGameState.playerspositions[1],
        simulatedGameState.vwalls,
        simulatedGameState.hwalls,
      ).length;

      // Evaluate the impact
      if (newOpponentPath > opponentShortestPath) {
        // The wall placement increases the opponent's path length
        score += (newOpponentPath - opponentShortestPath) * 5; // Weight the score by the increase
      }
      if (newPlayerPath <= playerShortestPath) {
        // The wall does not negatively impact, or even potentially aids, the player's path
        score += (playerShortestPath - newPlayerPath) * 3; // Reward for aiding the player's path
      } else {
        // Penalize wall placements that worsen the player's path significantly
        score -= (newPlayerPath - playerShortestPath) * 10;
      }

      // Reset simulated game state for the next iteration
      simulatedGameState = cloneGameState(gameState);
    }
  }

  return score;
}

function simulateWall(gameState, x, y, orientation) {
  if (orientation === "v") {
    gameState.vwalls.push([x, y]);
  } else {
    gameState.hwalls.push([x, y]);
  }
}

function applyMove(gameState, move, player) {
  const newGameState = cloneGameState(gameState);
  if (move.length == 3) {
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

function cloneGameState(gameState) {
  const simplifiedGameState = {
    playerspositions: [
      [4, 8],
      [4, 0],
    ],
    p1walls: 10,
    p2walls: 10,
    vwalls: [],
    hwalls: [],
    turn: 0,
    winner: null,
    board_visibility: [
      [-1, -1, -1, -2, -2, -2, -1, -1, -1],
      [-1, -1, -1, -1, -2, -1, -1, -1, -1],
      [-1, -1, -1, -1, -1, -1, -1, -1, -1],
      [-1, -1, -1, -1, -1, -1, -1, -1, -1],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 2, 1, 1, 1, 1],
      [1, 1, 1, 2, 2, 2, 1, 1, 1],
    ],
  };

  simplifiedGameState.playerspositions = gameState.playerspositions;
  simplifiedGameState.p1walls = gameState.p1walls;
  simplifiedGameState.p2walls = gameState.p2walls;
  simplifiedGameState.vwalls = gameState.vwalls;
  simplifiedGameState.hwalls = gameState.hwalls;
  simplifiedGameState.turn = gameState.turn;
  simplifiedGameState.winner = gameState.winner;
  simplifiedGameState.board_visibility = gameState.board_visibility;

  return simplifiedGameState;
}

function calculateDistanceToGoal(gameState, player) {
  let playerPosition = gameState.playerspositions[player - 1];
  let goals = player == 1 ? p1goals : p2goals;
  let minDistance = Infinity;

  for (let goal of goals) {
    let distance =
      Math.abs(goal[0] - playerPosition[0]) +
      Math.abs(goal[1] - playerPosition[1]);
    if (distance < minDistance) {
      minDistance = distance;
    }
  }

  return minDistance;
}

function computeMove(gameState) {
  let depth = 3;
  let { value, move } = minimax(gameState, depth, -Infinity, +Infinity, true);
  console.log("AI played!", move);
  return move;
}

module.exports = { computeMove };
