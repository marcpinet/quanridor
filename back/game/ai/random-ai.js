const {
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

function computeMove(gameState, player) {
  let { possibleMoves, possibleWalls } = getPossibleMovesAndStrategicWalls(
    gameState,
    player,
  );
  return decide(possibleMoves, possibleWalls);
}

module.exports = { computeMove };
