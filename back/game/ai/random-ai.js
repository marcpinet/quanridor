const {
  isLegal,
  canJump,
  checkWin,
  isWallLegal,
  getPossibleMovesAndStrategicWalls,
} = require("../utils/game-checkers.js");

function decide(possibleMoves, possibleWalls) {
  // 1/3 chance of placing a wall
  if (Math.floor(Math.random() * 3) == 0 && possibleWalls.length > 0) {
    let wallIndex = Math.floor(Math.random() * possibleWalls.length);
    return possibleWalls[wallIndex];
  } else {
    let moveIndex = Math.floor(Math.random() * possibleMoves.length);
    return possibleMoves[moveIndex];
  }
}

function computeMove(gameState) {
  let { possibleMoves, possibleWalls } = getPossibleMovesAndStrategicWalls(
    gameState,
    2,
  );
  return decide(possibleMoves, possibleWalls);
}

module.exports = { computeMove };
