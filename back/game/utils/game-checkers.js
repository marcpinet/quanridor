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

const pathCache = new Map();

function getPossibleMoves(gameState, pos, player) {
  const possibleMoves = [];
  const directions = [
    [0, 1],
    [-1, 0],
    [1, 0],
    [0, -1],
  ];

  for (const [dx, dy] of directions) {
    const newPos = [pos[0] + dx, pos[1] + dy];
    if (
      isLegal(
        pos,
        newPos,
        gameState.vwalls,
        gameState.hwalls,
        gameState.playerspositions[0],
        gameState.playerspositions[1],
      )
    ) {
      possibleMoves.push(newPos);
    }
  }

  const jumpCoord = canJump(
    pos,
    gameState.playerspositions[0],
    gameState.playerspositions[1],
    gameState.vwalls,
    gameState.hwalls,
  );
  if (jumpCoord.length > 0) {
    possibleMoves.push(jumpCoord);
  }

  return possibleMoves.filter(
    (move) => move[0] !== pos[0] || move[1] !== pos[1],
  );
}

function getPossibleMovesAndStrategicWalls(gameState, player) {
  const pos = gameState.playerspositions[player - 1];
  const possibleMoves = getPossibleMoves(gameState, pos, player);
  const possibleWalls = getStrategicWalls(gameState, player);

  return { possibleMoves, possibleWalls };
}

function getPossibleWalls(gameState, player) {
  const possibleWalls = [];
  const wallsLeft = player === 1 ? gameState.p1walls : gameState.p2walls;

  if (wallsLeft === 0) {
    return [];
  }

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (
        isWallLegal(
          player,
          [i, j],
          "v",
          gameState.p1walls,
          gameState.p2walls,
          gameState.vwalls,
          gameState.hwalls,
          gameState.playerspositions[0],
          gameState.playerspositions[1],
        )
      ) {
        possibleWalls.push([i, j, "v"]);
      }
      if (
        isWallLegal(
          player,
          [i, j],
          "h",
          gameState.p1walls,
          gameState.p2walls,
          gameState.vwalls,
          gameState.hwalls,
          gameState.playerspositions[0],
          gameState.playerspositions[1],
        )
      ) {
        possibleWalls.push([i, j, "h"]);
      }
    }
  }

  return possibleWalls;
}

function getStrategicWalls(gameState, player) {
  const possibleWalls = getPossibleWalls(gameState, player);

  if (possibleWalls.length === 0) {
    return [];
  }

  const playerGoals = player === 1 ? p1goals : p2goals;
  const opponentGoals = player === 1 ? p2goals : p1goals;
  const playerPath = getShortestPath(
    gameState.playerspositions[player - 1],
    playerGoals,
    gameState,
    player,
  );
  const opponentPath = getShortestPath(
    gameState.playerspositions[1 - (player - 1)],
    opponentGoals,
    gameState,
    player === 1 ? 2 : 1,
  );

  return possibleWalls.filter((wall) => {
    const tempGameState = cloneGameState(gameState);
    if (wall[2] === "v") {
      tempGameState.vwalls.push([wall[0], wall[1]]);
    } else {
      tempGameState.hwalls.push([wall[0], wall[1]]);
    }

    const newPlayerPath = getShortestPath(
      tempGameState.playerspositions[player - 1],
      playerGoals,
      tempGameState,
      player,
    );
    const newOpponentPath = getShortestPath(
      tempGameState.playerspositions[1 - (player - 1)],
      opponentGoals,
      tempGameState,
      player === 1 ? 2 : 1,
    );

    return (
      newOpponentPath.length > opponentPath.length &&
      newPlayerPath.length <= playerPath.length + 2
    );
  });
}

function cloneGameState(gameState) {
  return {
    playerspositions: gameState.playerspositions.map((pos) => [...pos]),
    p1walls: gameState.p1walls,
    p2walls: gameState.p2walls,
    vwalls: gameState.vwalls.map((wall) => [...wall]),
    hwalls: gameState.hwalls.map((wall) => [...wall]),
    turn: gameState.turn,
    winner: gameState.winner,
    board_visibility: gameState.board_visibility
      ? gameState.board_visibility.map((row) => [...row])
      : undefined,
  };
}

function isLegal(
  current_coord,
  new_coord,
  v_walls,
  h_walls,
  p1_coord,
  p2_coord,
) {
  let x = new_coord[0];
  let y = new_coord[1];
  if (x < 0 || x > 8 || y < 0 || y > 8) return false;
  if (
    (x == p1_coord[0] && y == p1_coord[1]) ||
    (x == p2_coord[0] && y == p2_coord[1])
  )
    return false;
  if (Math.abs(x - current_coord[0]) > 1 || Math.abs(y - current_coord[1]) > 1)
    return false;
  if (
    Math.abs(x - current_coord[0]) == 1 &&
    Math.abs(y - current_coord[1]) == 1
  )
    return false;
  for (let wall of v_walls) {
    if (
      wall[0] == current_coord[0] &&
      (wall[1] == current_coord[1] || wall[1] == current_coord[1] - 1) &&
      x - current_coord[0] == 1
    )
      return false;
    if (
      wall[0] == current_coord[0] - 1 &&
      (wall[1] == current_coord[1] || wall[1] == current_coord[1] - 1) &&
      current_coord[0] - x == 1
    )
      return false;
  }
  for (let wall of h_walls) {
    if (
      wall[1] == current_coord[1] &&
      (wall[0] == current_coord[0] || wall[0] == current_coord[0] - 1) &&
      y - current_coord[1] == 1
    )
      return false;
    if (
      wall[1] == current_coord[1] - 1 &&
      (wall[0] == current_coord[0] || wall[0] == current_coord[0] - 1) &&
      current_coord[1] - y == 1
    )
      return false;
  }
  return true;
}

function isInclude(array, coord) {
  return array.some(
    (subArray) => coord[0] === subArray[0] && coord[1] === subArray[1],
  );
}

function canJump(coord, p1coord, p2coord, v_walls, h_walls) {
  let temp;
  let p1_coord = [p1coord[0], p1coord[1]];
  let p2_coord = [p2coord[0], p2coord[1]];
  if (
    Math.abs(p1_coord[0] - coord[0]) == 1 &&
    p1_coord[1] == coord[1] &&
    isLegal(
      p1_coord,
      [2 * p1_coord[0] - coord[0], coord[1]],
      v_walls,
      h_walls,
      p1_coord,
      p2_coord,
    )
  ) {
    temp = [p2_coord[0], p2_coord[1]];
    p2_coord = [9, 9];
    if (isLegal(p1_coord, temp, v_walls, h_walls, p1_coord, p2_coord)) {
      return [2 * p1_coord[0] - coord[0], coord[1]];
    }
  } else if (
    Math.abs(p2_coord[0] - coord[0]) == 1 &&
    p2_coord[1] == coord[1] &&
    isLegal(
      p2_coord,
      [2 * p2_coord[0] - coord[0], coord[1]],
      v_walls,
      h_walls,
      p1_coord,
      p2_coord,
    )
  ) {
    temp = [p2_coord[0], p2_coord[1]];
    p2_coord = [9, 9];
    if (isLegal(p1_coord, temp, v_walls, h_walls, p1_coord, p2_coord)) {
      p2_coord = [temp[0], temp[1]];
      return [2 * p2_coord[0] - coord[0], coord[1]];
    }
  } else if (
    p1_coord[0] == coord[0] &&
    Math.abs(p1_coord[1] - coord[1]) == 1 &&
    isLegal(
      p1_coord,
      [coord[0], 2 * p1_coord[1] - coord[1]],
      v_walls,
      h_walls,
      p1_coord,
      p2_coord,
    )
  ) {
    temp = [p1_coord[0], p1_coord[1]];
    p1_coord = [9, 9];
    if (isLegal(p2_coord, temp, v_walls, h_walls, p1_coord, p2_coord)) {
      p1_coord = [temp[0], temp[1]];
      return [coord[0], 2 * p1_coord[1] - coord[1]];
    }
  } else if (
    p2_coord[0] == coord[0] &&
    Math.abs(p2_coord[1] - coord[1]) == 1 &&
    isLegal(
      p2_coord,
      [coord[0], 2 * p2_coord[1] - coord[1]],
      v_walls,
      h_walls,
      p1_coord,
      p2_coord,
    )
  ) {
    temp = [p1_coord[0], p1_coord[1]];
    p1_coord = [9, 9];
    if (isLegal(p2_coord, temp, v_walls, h_walls, p1_coord, p2_coord)) {
      return [coord[0], 2 * p2_coord[1] - coord[1]];
    }
  }
  return [];
}

function canWin(gameState, player) {
  const playerGoals = player === 1 ? p1goals : p2goals;
  const playerPosition = gameState.playerspositions[player - 1];
  const playerPath = getShortestPath(
    playerPosition,
    playerGoals,
    gameState,
    player,
  );
  return {
    canWin:
      playerPath.length === 2 &&
      areGoalsInsidePath(player === 1 ? p1goals : p2goals, playerPath),
    path: playerPath,
  };
}

function getPlayerNeighbour(coord) {
  const [x, y] = coord;
  const neighbors = [[x, y]];

  if (x > 0) neighbors.push([x - 1, y]);
  if (x < 8) neighbors.push([x + 1, y]);
  if (y > 0) neighbors.push([x, y - 1]);
  if (y < 8) neighbors.push([x, y + 1]);

  return neighbors;
}

function aStarPathfinding(start, goals, p1_coord, p2_coord, v_walls, h_walls) {
  let player = start == p1_coord ? 1 : 2;
  let openSet = [];
  let closedSet = [];
  let current;
  openSet.push(start);

  while (openSet.length > 0) {
    current = openSet.pop();

    if (isInclude(goals, current)) return true;
    closedSet.push(current);

    let neighbors = getPlayerNeighbour(current);

    for (let neighbor of neighbors) {
      if (
        isInclude(closedSet, neighbor) ||
        !isLegal(current, neighbor, v_walls, h_walls, p1_coord, p2_coord)
      )
        continue;

      if (!isInclude(openSet, neighbor)) {
        openSet.push(neighbor);
      }
    }
    let jump_coord = canJump(
      current,
      player == 1 ? current : p1_coord,
      player == 1 ? p2_coord : current,
      v_walls,
      h_walls,
    );
    if (
      jump_coord.length > 0 &&
      !isInclude(closedSet, jump_coord) &&
      !isInclude(openSet, jump_coord)
    ) {
      openSet.push(jump_coord);
    }
  }

  return false;
}

function getShortestPath(start, goals, gameState, player) {
  const startKey = `${start.join(",")}|${goals.map((goal) => goal.join(",")).join(",")}|${gameState.vwalls.map((wall) => wall.join(",")).join(",")}|${gameState.hwalls.map((wall) => wall.join(",")).join(",")}|${player}`;

  if (pathCache.has(startKey)) {
    return pathCache.get(startKey);
  }

  let queue = []; // Utiliser une file d'attente pour gérer les nœuds à explorer
  let visited = new Set(); // Garde une trace des positions déjà visitées
  let cameFrom = new Map(); // Trace le chemin parcouru
  let startKey2 = start.join(",");
  visited.add(startKey2);
  queue.push(start);

  // Fonction pour reconstruire le chemin une fois l'objectif atteint
  function reconstructPath(cameFrom, current) {
    let totalPath = [current];
    while (cameFrom.has(current.join(","))) {
      current = cameFrom.get(current.join(","));
      totalPath.unshift(current);
    }
    pathCache.set(startKey, totalPath);
    return totalPath;
  }

  while (queue.length > 0) {
    let current = queue.shift();

    // Vérifier si le but est atteint
    for (let goal of goals) {
      if (current[0] === goal[0] && current[1] === goal[1]) {
        return reconstructPath(cameFrom, current);
      }
    }

    let possibleMoves = getPossibleMoves(gameState, current, player);

    for (let neighbor of possibleMoves) {
      let neighborKey = neighbor.join(",");
      if (!visited.has(neighborKey)) {
        visited.add(neighborKey);
        cameFrom.set(neighborKey, current);
        queue.push(neighbor);
      }
    }
  }

  return []; // Aucun chemin trouvé
}

function isWallLegal(
  player,
  coord,
  current_direction,
  p1_walls,
  p2_walls,
  v_walls,
  h_walls,
  p1_coord,
  p2_coord,
) {
  if ((player === 1 && p1_walls === 0) || (player === 2 && p2_walls === 0))
    return false;
  if (coord[0] > 7 || coord[0] < 0 || coord[1] > 7 || coord[1] < 0)
    return false;
  if (
    v_walls.some(
      (wall) =>
        wall[0] === coord[0] &&
        ((Math.abs(wall[1] - coord[1]) === 1 && current_direction === "v") ||
          Math.abs(wall[1] - coord[1]) === 0),
    )
  )
    return false;
  if (
    h_walls.some(
      (wall) =>
        wall[1] === coord[1] &&
        ((Math.abs(wall[0] - coord[0]) === 1 && current_direction === "h") ||
          Math.abs(wall[0] - coord[0]) === 0),
    )
  )
    return false;

  if (current_direction === "v") {
    v_walls.push(coord);
  } else {
    h_walls.push(coord);
  }

  const isPossible =
    aStarPathfinding(p1_coord, p1goals, [-1, -1], [-1, -1], v_walls, h_walls) &&
    aStarPathfinding(p2_coord, p2goals, [-1, -1], [-1, -1], v_walls, h_walls);

  if (current_direction === "v") {
    v_walls.pop();
  } else {
    h_walls.pop();
  }

  return isPossible;
}

function checkWin(gameState, player) {
  const p1_coord = gameState.playerspositions[0];
  const p2_coord = gameState.playerspositions[1];
  return (
    (player === 1 && p1_coord[1] === 0) || (player === 2 && p2_coord[1] === 8)
  );
}

function applyMove(gameState, move, player) {
  const newGameState = cloneGameState(gameState);
  if (move.length === 3) {
    const wallsnum = player === 1 ? newGameState.p1walls : newGameState.p2walls;
    if (wallsnum <= 0) {
      console.error(
        "Player",
        player,
        "tried to play",
        move,
        "but has no walls left",
      );
      return null;
    }

    if (move[2] === "v") {
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

function hasAtteignedGoal(playerPos, goals) {
  return goals.some(
    (goal) => playerPos[0] === goal[0] && playerPos[1] === goal[1],
  );
}

function getNextMoveToFollowShortestPath(gameState, player) {
  const playerPosition = gameState.playerspositions[player - 1];
  const playerGoals = player === 1 ? p1goals : p2goals;
  const shortestPath = getShortestPath(
    playerPosition,
    playerGoals,
    gameState,
    player,
  );

  return shortestPath.length < 1 ? playerPosition : shortestPath[1];
}

function areGoalsInsidePath(goals, path) {
  const pathSet = new Set(path.map((point) => JSON.stringify(point)));
  return goals.some((goal) => pathSet.has(JSON.stringify(goal)));
}

function getManhattanDistance(pos, goals) {
  return Math.min(
    ...goals.map(
      (goal) => Math.abs(pos[0] - goal[0]) + Math.abs(pos[1] - goal[1]),
    ),
  );
}

function getPawnDistance(p1pos, p2pos, state) {
  return getShortestPath(p1pos, [p2pos], state, 1).length - 1;
}

function isOnGoalSide(pos, state) {
  const middleRow = 4;
  return state.turn % 2 === 0 ? pos[1] <= middleRow : pos[1] >= middleRow;
}

module.exports = {
  isLegal,
  canJump,
  isWallLegal,
  checkWin,
  getPossibleMovesAndStrategicWalls,
  getShortestPath,
  cloneGameState,
  getPossibleMoves,
  getPossibleWalls,
  applyMove,
  canWin,
  hasAtteignedGoal,
  getNextMoveToFollowShortestPath,
  areGoalsInsidePath,
  getPlayerNeighbour,
  getManhattanDistance,
  getPawnDistance,
  isOnGoalSide,
};
