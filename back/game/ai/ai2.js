const p1_goals = [
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
const p2_goals = [
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

let ourGameState = {
  opponentWalls: [],
  ownWalls: [],
  board: board,
};

let board = [];
let ownPosition = "";
let opponentPosition = "";
let player;

function initBoard(player) {
  if (player == 1) {
    board = [
      [-1, -1, -1, -1, -1, -1, -1, -1, -1],
      [-1, -1, -1, -1, -1, -1, -1, -1, -1],
      [-1, -1, -1, -1, -1, -1, -1, -1, -1],
      [-1, -1, -1, -1, -1, -1, -1, -1, -1],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 1, 0, 0, 0, 0],
    ];
  } else {
    board = [
      [0, 0, 0, 0, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [-1, -1, -1, -1, -1, -1, -1, -1, -1],
      [-1, -1, -1, -1, -1, -1, -1, -1, -1],
      [-1, -1, -1, -1, -1, -1, -1, -1, -1],
      [-1, -1, -1, -1, -1, -1, -1, -1, -1],
    ];
  }
}

function retrieveOpponentPosition(board) {
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (board[i][j] == 2) {
        return [j, i];
      }
    }
  }
  return [];
}

exports.setup = function (AIplay) {
  return new Promise((resolve, reject) => {
    player = AIplay;
    ownPosition = AIplay == 1 ? "48" : "40";
    initBoard(AIplay);
    resolve(ownPosition);
  });
};

/*
const move = {
    action: "move",
    value: "12"
};

const move = {
    action: "wall",
    value: ["12", 0 <- h]
};

const move = {
    action: "idle"
};
*/

function shortestPath(start, goals, walls) {
  //return shortest path from start to one of goals
}

exports.nextMove = function (gameState) {
  return new Promise((resolve, reject) => {
    let move;
    let ownPath = shortestPath(
      [ownPos[0], ownPos[1]],
      player == 1 ? p1_goals : p2_goals,
      [gameState.opponentWalls + gameState.ownWalls],
    );
    let opponentPath;

    let tempPosition = retrieveOpponentPosition(gameState.board);
    if (tempPosition == []) opponentPosition = "";
    else opponentPosition = tempPosition[0] + "" + tempPosition[1];

    if (opponentPosition != "") {
      opponentPath = shortestPath(
        [opponentPosition[0], opponentPosition[1]],
        player == 1
          ? p2_goals
          : p1_goals[gameState.opponentWalls + gameState.ownWalls],
      );
    }
    if (ownPath.length >= opponentPath.length) {
      coordToMoveTo = ownPath[1];
      move = {
        action: "move",
        value: coordToMoveTo[0] + "" + coordToMoveTo[1],
      };
    } else if (ownPath.length) {
    }
    resolve(move);
  });
};

exports.correction = function (rightMove) {
  return new Promise((resolve, reject) => {
    resolve(true);
  });
};

exports.updateBoard = function (gameState) {
  return new Promise((resolve, reject) => {
    ourGameState = gameState;
    resolve(true);
  });
};

class Node {
  constructor(gameState, action = null, parent = null) {
    this.gameState = gameState;
    this.action = action;
    this.parent = parent;
    this.children = [];
    this.visits = 0;
    this.totalReward = 0;
  }

  isTerminal() {
    return this.gameState.isGameOver();
  }

  isFullyExpanded() {
    return this.children.length === this.getUntriedActions().length;
  }

  getUntriedActions() {
    return getLegalActions(this.gameState);
  }

  selectChild() {
    // Implement UCB1 selection
    const logTotalVisits = Math.log(this.visits);
    const child = this.children.reduce(
      (selected, current) => {
        const ucb1Value =
          current.totalReward / current.visits +
          C * Math.sqrt(logTotalVisits / current.visits);
        return ucb1Value > selected.ucb1Value
          ? { node: current, ucb1Value: ucb1Value }
          : selected;
      },
      { node: null, ucb1Value: -Infinity },
    );

    return child.node;
  }

  expand(action, gameState) {
    const childNode = new Node(gameState, action, this);
    this.children.push(childNode);
    return childNode;
  }

  update(reward) {
    this.visits++;
    this.totalReward += reward;
  }
}
