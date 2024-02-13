const {
  isLegal,
  canJump,
  checkWin,
  isWallLegal,
} = require("../utils/game-checkers.js");

function computeMove(gameState) {
  let pos = gameState.playerspositions[1];
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
  if (jump_coord[0] != -1) possibleMoves.push(jump_coord);

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

  // 1/3 chance of placing a wall
  if (Math.floor(Math.random() * 3) == 0 && possibleWalls.length > 0) {
    let wallIndex = Math.floor(Math.random() * possibleWalls.length);
    return possibleWalls[wallIndex];
  } else {
    let moveIndex = Math.floor(Math.random() * possibleMoves.length);
    return possibleMoves[moveIndex];
  }
}

module.exports = computeMove;
