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

function getPossibleMoves(gameState, pos, player) {
  let possibleMoves = [];
  let tmp = gameState.playerspositions[player - 1];
  gameState.playerspositions[player - 1] = pos;

  const directions = [
    [0, 1],
    [-1, 0],
    [1, 0],
    [0, -1],
  ];

  for (let [dx, dy] of directions) {
    let newPos = [pos[0] + dx, pos[1] + dy];
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

  // Check if jumping is possible.
  let jump_coord = canJump(
    pos,
    gameState.playerspositions[0],
    gameState.playerspositions[1],
    gameState.vwalls,
    gameState.hwalls,
  );
  if (jump_coord.length > 0) possibleMoves.push(jump_coord);

  // Remove current position from possible moves
  possibleMoves = possibleMoves.filter((move) => {
    return move[0] !== pos[0] || move[1] !== pos[1];
  });

  gameState.playerspositions[player - 1] = tmp;

  return possibleMoves;
}

function checkGameEnd(gameState) {
  return (
    gameState.playerspositions[0][1] === 0 ||
    gameState.playerspositions[1][1] === 8
  );
}

function getPossibleMovesAndStrategicWalls(gameState, player) {
  let pos = gameState.playerspositions[player - 1];
  let possibleMoves = getPossibleMoves(gameState, pos, player);
  let possibleWalls = getStrategicWalls(gameState, player);

  return { possibleMoves, possibleWalls };
}

function getAllWallsNoMatterIfPossible(gameState, player) {
  let possibleWalls = [];
  let wallsLeft = player === 1 ? gameState.p1walls : gameState.p2walls;

  if (wallsLeft === 0) {
    return [];
  }

  // Check if placing a vertical wall is possible.
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      possibleWalls.push([i, j, "v"]);
    }
  }

  // Check if placing a horizontal wall is possible.
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      possibleWalls.push([i, j, "h"]);
    }
  }

  return possibleWalls;
}

function getPossibleWalls(gameState, player) {
  let possibleWalls = [];
  let wallsLeft = player === 1 ? gameState.p1walls : gameState.p2walls;

  if (wallsLeft === 0) {
    return [];
  }

  // Check if placing a vertical wall is possible.
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (
        isWallLegal(
          2,
          [i, j],
          "v",
          gameState.p1walls,
          gameState.p2walls,
          gameState.vwalls,
          gameState.hwalls,
          gameState.playerspositions[0],
          gameState.playerspositions[1],
        )
      )
        possibleWalls.push([i, j, "v"]);
    }
  }

  // Check if placing a horizontal wall is possible.
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (
        isWallLegal(
          2,
          [i, j],
          "h",
          gameState.p1walls,
          gameState.p2walls,
          gameState.vwalls,
          gameState.hwalls,
          gameState.playerspositions[0],
          gameState.playerspositions[1],
        )
      )
        possibleWalls.push([i, j, "h"]);
    }
  }

  return possibleWalls;
}

function getStrategicWalls(gameState, player) {
  let possibleWalls = getAllWallsNoMatterIfPossible(gameState, player);

  if (possibleWalls.length === 0) {
    return [];
  }

  const playerGoals = player === 1 ? p1goals : p2goals;
  const opponentGoals = player === 1 ? p2goals : p1goals;
  const gameStateCopy = cloneGameState(gameState);
  const playerPath = getShortestPath(
    gameState.playerspositions[player - 1],
    playerGoals,
    gameStateCopy,
    player,
  );
  const opponentPath = getShortestPath(
    gameState.playerspositions[1 - (player - 1)],
    opponentGoals,
    gameStateCopy,
    player === 1 ? 2 : 1,
  );
  // Keep only walls around the opponent's current position and not too close to the goals or the player
  possibleWalls = possibleWalls.filter((wall) => {
    // Apply the wall temporarily to the game state
    if (wall[2] === "v") {
      gameStateCopy.vwalls.push([wall[0], wall[1]]);
    } else {
      gameStateCopy.hwalls.push([wall[0], wall[1]]);
    }

    // Calculate the new shortest paths for both players
    const newPlayerPath = getShortestPath(
      gameStateCopy.playerspositions[player - 1],
      playerGoals,
      gameStateCopy,
      player,
    );
    const newOpponentPath = getShortestPath(
      gameStateCopy.playerspositions[1 - (player - 1)],
      opponentGoals,
      gameStateCopy,
      player === 1 ? 2 : 1,
    );

    // Remove the temporary wall
    if (wall[2] === "v") {
      gameStateCopy.vwalls.pop();
    } else {
      gameStateCopy.hwalls.pop();
    }

    // Keep the wall if it significantly lengthens the opponent's path without severely impacting the player's path
    return (
      newOpponentPath.length > opponentPath.length &&
      newPlayerPath.length <= playerPath.length + 2
    );
  });

  // Only keep legal walls
  possibleWalls = possibleWalls.filter((wall) => {
    return isWallLegal(
      player,
      [wall[0], wall[1]],
      wall[2],
      gameState.p1walls,
      gameState.p2walls,
      gameState.vwalls,
      gameState.hwalls,
      gameState.playerspositions[0],
      gameState.playerspositions[1],
    );
  });

  return possibleWalls;
}

function cloneGameState(gameState) {
  let copy = {
    playerspositions: gameState.playerspositions.map((pos) => [...pos]),
    p1walls: gameState.p1walls,
    p2walls: gameState.p2walls,
    vwalls: gameState.vwalls.map((wall) => [...wall]),
    hwalls: gameState.hwalls.map((wall) => [...wall]),
    turn: gameState.turn,
    winner: gameState.winner,
  };

  if (gameState.board_visibility) {
    copy.board_visibility = gameState.board_visibility.map((innerArray) => [
      ...innerArray,
    ]);
  }

  return copy;
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
  for (let subArray of array) {
    if (coord[0] == subArray[0] && coord[1] == subArray[1]) return true;
  }
  return false;
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
  let playerPath = getShortestPath(
    playerPosition,
    playerGoals,
    gameState,
    player,
  );
  return { canWin: playerPath.length <= 2, path: playerPath };
}

function getPlayerNeighbour(coord) {
  const x = coord[0];
  const y = coord[1];
  const neighbors = [];

  neighbors.push([x, y]);
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

// BFS
function getShortestPath(start, goals, gameState, player) {
  let queue = []; // Utiliser une file d'attente pour gérer les nœuds à explorer
  let visited = new Set(); // Garde une trace des positions déjà visitées
  let cameFrom = new Map(); // Trace le chemin parcouru
  let startKey = start.join(",");
  visited.add(startKey);
  queue.push(start);

  // Fonction pour reconstruire le chemin une fois l'objectif atteint
  function reconstructPath(cameFrom, current) {
    let totalPath = [current];
    while (cameFrom.has(current.join(","))) {
      current = cameFrom.get(current.join(","));
      totalPath.unshift(current);
    }
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
  let isPossible;
  if ((player == 1 && p1_walls == 0) || (player == 2 && p2_walls == 0))
    return false;
  if (coord[0] > 7 || coord[0] < 0 || coord[1] > 7 || coord[1] < 0)
    return false;
  for (let wall of v_walls) {
    if (
      wall[0] == coord[0] &&
      ((Math.abs(wall[1] - coord[1]) == 1 && current_direction == "v") ||
        Math.abs(wall[1] - coord[1]) == 0)
    )
      return false;
  }
  for (let wall of h_walls) {
    if (
      wall[1] == coord[1] &&
      ((Math.abs(wall[0] - coord[0]) == 1 && current_direction == "h") ||
        Math.abs(wall[0] - coord[0]) == 0)
    )
      return false;
  }
  if (current_direction == "v") {
    v_walls.push(coord);
    isPossible = !!(
      aStarPathfinding(
        p1_coord,
        p1goals,
        [-1, -1],
        [-1, -1],
        v_walls,
        h_walls,
      ) &&
      aStarPathfinding(p2_coord, p2goals, [-1, -1], [-1, -1], v_walls, h_walls)
    );
    v_walls.pop();
  } else {
    h_walls.push(coord);
    isPossible = !!(
      aStarPathfinding(
        p1_coord,
        p1goals,
        [-1, -1],
        [-1, -1],
        v_walls,
        h_walls,
      ) &&
      aStarPathfinding(p2_coord, p2goals, [-1, -1], [-1, -1], v_walls, h_walls)
    );
    h_walls.pop();
  }
  return isPossible;
}

function checkWin(player, { p1_coord, p2_coord }) {
  return (player == 1 && p1_coord[1] == 0) || (player == 2 && p2_coord[1] == 8);
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

function hasAtteignedGoal(playerPos, goals) {
  for (let goal of goals) {
    if (playerPos[0] === goal[0] && playerPos[1] === goal[1]) {
      return true;
    }
  }
  return false;
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
  if (shortestPath.length < 1) {
    return playerPosition;
  }
  return shortestPath[1];
}

function areGoalsInsidePath(goals, path) {
  const pathSet = new Set(path.map((point) => JSON.stringify(point)));

  for (let goal of goals) {
    if (pathSet.has(JSON.stringify(goal))) {
      return true;
    }
  }

  return false;
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
};
