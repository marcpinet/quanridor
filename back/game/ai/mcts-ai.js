const {
  isLegal,
  canJump,
  checkWin,
  isWallLegal,
  getPossibleMovesAndWalls,
  getShortestPath,
} = require("../utils/game-checkers.js");

class MCTSNode {
  constructor(gameState, parent = null) {
    this.gameState = gameState;
    this.parent = parent;
    this.children = [];
    this.wins = 0;
    this.visits = 0;
    let { possibleMoves, possibleWalls } = getPossibleMovesAndWalls(
      gameState,
      (gameState.turn % 2) + 1,
    );
    this.untriedMoves = possibleMoves.concat(possibleWalls);
  }

  selectChild() {
    // Sélectionner l'enfant avec le plus haut score UCB1
    return this.children.reduce((prev, current) =>
      prev.ucb1Score() > current.ucb1Score() ? prev : current,
    );
  }

  ucb1Score() {
    const C = Math.sqrt(2); // Constante d'exploration
    return (
      this.wins / this.visits +
      C * Math.sqrt(Math.log(this.parent.visits) / this.visits)
    );
  }

  addChild(move, gameState) {
    const childNode = new MCTSNode(gameState, this);
    this.untriedMoves.splice(this.untriedMoves.indexOf(move), 1);
    this.children.push(childNode);
    return childNode;
  }

  update(result) {
    this.visits += 1;
    this.wins += result;
  }
}

function MCTS(rootGameState, iterations) {
  const rootNode = new MCTSNode(rootGameState);

  for (let i = 0; i < iterations; i++) {
    let node = rootNode;
    let gameState = cloneGameState(rootGameState);

    // Selection
    while (node.untriedMoves.length === 0 && node.children.length !== 0) {
      node = node.selectChild();
      let moveThatLedToThisNode =
        node.gameState.playerspositions[node.gameState.turn % 2];
      gameState = applyMove(
        gameState,
        moveThatLedToThisNode,
        (node.gameState.turn % 2) + 1,
      );
    }

    // Expansion
    if (node.untriedMoves.length > 0) {
      const move = selectRandom(node.untriedMoves);
      gameState = applyMove(gameState, move, gameState.turn);
      node = node.addChild(move, gameState);
    }

    // Simulation
    let outcome = simulateToEnd(gameState);

    // Backpropagation
    while (node !== null) {
      node.update(outcome);
      node = node.parent;
    }
  }

  let bestMove = rootNode.children.reduce((prev, current) =>
    prev.visits > current.visits ? prev : current,
  ).gameState.move;
  return bestMove;
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

function cloneGameState(gameState) {
  return {
    playerspositions: JSON.parse(JSON.stringify(gameState.playerspositions)),
    p1walls: gameState.p1walls,
    p2walls: gameState.p2walls,
    vwalls: JSON.parse(JSON.stringify(gameState.vwalls)),
    hwalls: JSON.parse(JSON.stringify(gameState.hwalls)),
    turn: gameState.turn,
    winner: gameState.winner,
    board_visibility: JSON.parse(JSON.stringify(gameState.board_visibility)),
  };
}

function selectRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function isGameOver(gameState) {
  return (
    checkWin(1, {
      p1_coord: gameState.playerspositions[0],
      p2_coord: gameState.playerspositions[1],
    }) ||
    checkWin(2, {
      p1_coord: gameState.playerspositions[0],
      p2_coord: gameState.playerspositions[1],
    })
  );
}

function simulateToEnd(gameState) {
  while (!isGameOver(gameState)) {
    let { possibleMoves, possibleWalls } = getPossibleMovesAndWalls(
      gameState,
      (gameState.turn % 2) + 1,
    );
    let moves = possibleMoves.concat(possibleWalls);
    let move = selectRandom(moves);
    if (move === undefined) {
      gameState.turn++;
      continue;
    }
    gameState = applyMove(gameState, move, (gameState.turn % 2) + 1);
  }
  return getWinner(gameState);
}

function getWinner(gameState) {
  if (
    checkWin(1, {
      p1_coord: gameState.playerspositions[0],
      p2_coord: gameState.playerspositions[1],
    })
  ) {
    return 1;
  }
  if (
    checkWin(2, {
      p1_coord: gameState.playerspositions[0],
      p2_coord: gameState.playerspositions[1],
    })
  ) {
    return 2;
  }
  return 0;
}

function computeMove(gameState) {
  let bestMove = MCTS(gameState, 10);
  console.log("AI played!", bestMove);
  return bestMove;
}

module.exports = { computeMove };
