let gameState = {
  opponentWalls: [],
  ownWalls: [],
  board: board,
};

let board = [
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

let p1_goals = [
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
let p2_goals = [
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

function retrieveOwnPosition(board) {
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (board[i][j] == 1) return [j, i];
    }
  }
}

function retrieveOpponentPosition(board) {
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (board[i][j] == 2) return [j, i];
    }
  }
}

function isInclude(array, coord) {
  for (let subArray of array) {
    if (coord[0] == subArray[0] && coord[1] == subArray[1]) return true;
  }
  return false;
}

function aStarPathfinding(start, goals) {
  let openSet = [];
  let closedSet = [];
  let cameFrom = {};
  let gScore = {};
  let fScore = {};

  openSet.push(start);
  gScore[start] = 0;
  fScore[start] = heuristic(start, goals); // Heuristic function to estimate distance to goal

  while (openSet.length > 0) {
    let current = getLowestFScoreNode(openSet, fScore);

    if (isInclude(goals, current)) {
      return reconstructPath(cameFrom, current);
    }

    openSet = openSet.filter((node) => node !== current);
    closedSet.push(current);

    let neighbors = getPlayerNeighbour(current);

    for (let neighbor of neighbors) {
      if (isInclude(closedSet, neighbor) || !isLegal(current, neighbor))
        continue;

      let tentative_gScore = gScore[current] + 1; // Assuming all edges have a weight of 1

      if (!openSet.includes(neighbor) || tentative_gScore < gScore[neighbor]) {
        cameFrom[neighbor] = current;
        gScore[neighbor] = tentative_gScore;
        fScore[neighbor] = gScore[neighbor] + heuristic(neighbor, goals);
        if (!openSet.includes(neighbor)) {
          openSet.push(neighbor);
        }
      }
    }
  }

  return false; // No path found
}

function getLowestFScoreNode(openSet, fScore) {
  let lowestNode = openSet[0];
  for (let node of openSet) {
    if (fScore[node] < fScore[lowestNode]) {
      lowestNode = node;
    }
  }
  return lowestNode;
}

function reconstructPath(cameFrom, current) {
  let totalPath = [current];
  while (cameFrom[current]) {
    current = cameFrom[current];
    totalPath.unshift(current);
  }
  return totalPath;
}

function heuristic(current, goals) {
  let minDistance = Infinity;
  for (let goal of goals) {
    let dx = Math.abs(current[0] - goal[0]);
    let dy = Math.abs(current[1] - goal[1]);
    let distance = dx + dy;
    if (distance < minDistance) {
      minDistance = distance;
    }
  }
  return minDistance;
}

exports.setup = function (AIplay) {
  return new Promise((resolve, reject) => {
    const position = AIplay == 1 ? "48" : "40";
    resolve(position);
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

exports.nextMove = function (gameState) {
  return new Promise((resolve, reject) => {
    const move = {
      action: "move",
      value: "41",
    };
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
