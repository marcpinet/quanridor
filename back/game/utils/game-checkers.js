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

function getPossibleMovesAndWalls(gameState, player) {
  let pos = gameState.playerspositions[player - 1];
  let possibleMoves = [];
  let possibleWalls = [];

  // Check if moving left is possible.
  if (
    isLegal(
      pos,
      [pos[0] - 1, pos[1]],
      gameState.vwalls,
      gameState.hwalls,
      gameState.playerspositions[0],
      gameState.playerspositions[1],
    )
  )
    possibleMoves.push([pos[0] - 1, pos[1]]);

  // Check if moving right is possible.
  if (
    isLegal(
      pos,
      [pos[0] + 1, pos[1]],
      gameState.vwalls,
      gameState.hwalls,
      gameState.playerspositions[0],
      gameState.playerspositions[1],
    )
  )
    possibleMoves.push([pos[0] + 1, pos[1]]);

  // Check if moving down is possible.
  if (
    isLegal(
      pos,
      [pos[0], pos[1] + 1],
      gameState.vwalls,
      gameState.hwalls,
      gameState.playerspositions[0],
      gameState.playerspositions[1],
    )
  )
    possibleMoves.push([pos[0], pos[1] + 1]);

  // Check if moving up is possible.
  if (
    isLegal(
      pos,
      [pos[0], pos[1] - 1],
      gameState.vwalls,
      gameState.hwalls,
      gameState.playerspositions[0],
      gameState.playerspositions[1],
    )
  )
    possibleMoves.push([pos[0], pos[1] - 1]);

  // Check if jumping is possible.
  let jump_coord = canJump(
    gameState.playerspositions[1],
    gameState.playerspositions[0],
    gameState.playerspositions[1],
    gameState.vwalls,
    gameState.hwalls,
  );
  if (jump_coord.length > 0) possibleMoves.push(jump_coord);

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

  if (player === 1) {
    if (gameState.p1walls === 0) {
      possibleWalls = [];
    }
  } else {
    if (gameState.p2walls === 0) {
      possibleWalls = [];
    }
  }

  // Keep only walls close to the opponent and not too close to the player
  possibleWalls = possibleWalls.filter((wall) => {
    if (wall[2] === "v") {
      return (
        wall[0] < 7 &&
        !gameState.vwalls.some((w) => w[0] === wall[0] && w[1] === wall[1]) &&
        !gameState.vwalls.some((w) => w[0] === wall[0] + 1 && w[1] === wall[1])
      );
    } else {
      return (
        wall[1] < 7 &&
        !gameState.hwalls.some((w) => w[1] === wall[1] && w[0] === wall[0]) &&
        !gameState.hwalls.some((w) => w[1] === wall[1] + 1 && w[0] === wall[0])
      );
    }
  });

  // Remove current position from possible moves
  possibleMoves = possibleMoves.filter((move) => {
    return move[0] !== pos[0] || move[1] !== pos[1];
  });

  return { possibleMoves, possibleWalls };
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

function canJump(coord, p1_coord, p2_coord, v_walls, h_walls) {
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
  )
    return [2 * p1_coord[0] - coord[0], coord[1]];
  else if (
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
  )
    return [2 * p2_coord[0] - coord[0], coord[1]];
  else if (
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
  )
    return [coord[0], 2 * p1_coord[1] - coord[1]];
  else if (
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
  )
    return [coord[0], 2 * p2_coord[1] - coord[1]];
  return [];
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
    let jump_coord = canJump(current, p1_coord, p2_coord, v_walls, h_walls);
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

function getShortestPath(start, goals, p1_coord, p2_coord, v_walls, h_walls) {
  let openSet = [];
  let closedSet = [];
  let cameFrom = new Map(); // To track the path
  let current;
  openSet.push(start);

  while (openSet.length > 0) {
    current = openSet.pop();

    if (isInclude(goals, current)) {
      return reconstructPath(cameFrom, current);
    }
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
        cameFrom.set(neighbor, current); // Track path
      }
    }
    let jump_coord = canJump(current, p1_coord, p2_coord, v_walls, h_walls);
    if (
      jump_coord.length > 0 &&
      !isInclude(closedSet, jump_coord) &&
      !isInclude(openSet, jump_coord)
    ) {
      openSet.push(jump_coord);
      cameFrom.set(jump_coord, current); // Track path for jump
    }
  }

  return false; // Return false if no path is found
}

// Helper function to reconstruct the path from cameFrom map
function reconstructPath(cameFrom, current) {
  let totalPath = [current];
  while (cameFrom.has(current)) {
    current = cameFrom.get(current);
    totalPath.unshift(current); // Add to the beginning of the path
  }
  return totalPath;
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
  if (current_direction == "v") {
    for (let wall of v_walls) {
      if (wall[0] == coord[0] && Math.abs(wall[1] - coord[1]) <= 1)
        return false;
    }
    v_walls.push(coord);
    isPossible = !!(
      aStarPathfinding(
        p1_coord,
        p1_goals,
        p1_coord,
        p2_coord,
        v_walls,
        h_walls,
      ) &&
      aStarPathfinding(p2_coord, p2_goals, p1_coord, p2_coord, v_walls, h_walls)
    );
    v_walls.pop();
  } else {
    for (let wall of h_walls) {
      if (wall[1] == coord[1] && Math.abs(wall[0] - coord[0]) <= 1)
        return false;
    }
    h_walls.push(coord);
    isPossible = !!(
      aStarPathfinding(
        p1_coord,
        p1_goals,
        p1_coord,
        p2_coord,
        v_walls,
        h_walls,
      ) &&
      aStarPathfinding(p2_coord, p2_goals, p1_coord, p2_coord, v_walls, h_walls)
    );
    h_walls.pop();
  }
  return isPossible;
}

function checkWin(player, { p1_coord, p2_coord }) {
  return (player == 1 && p1_coord[1] == 0) || (player == 2 && p2_coord[1] == 8);
}

module.exports = {
  isLegal,
  canJump,
  isWallLegal,
  checkWin,
  getPossibleMovesAndWalls,
  getShortestPath,
};
