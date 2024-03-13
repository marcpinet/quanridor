const {
  getShortestPath,
  getStrategicWalls,
  p1goals,
  p2goals,
  cloneGameState,
} = require("../utils/game-checkers.js");

function computeMove(gameState, player) {
  let playerPosition = gameState.playerspositions[player - 1];
  let opponent = player === 1 ? 2 : 1;
  let opponentPosition = gameState.playerspositions[opponent - 1];

  let playerPath = getShortestPath(
    playerPosition,
    player === 1 ? p1goals : p2goals,
    gameState,
    player,
  );

  if (gameState.turn <= 2) {
    return playerPath[1];
  }

  let opponentPath = getShortestPath(
    opponentPosition,
    player === 1 ? p2goals : p1goals,
    gameState,
    opponent,
  );

  let walls = getStrategicWalls(gameState, player);

  if (playerPath.length === 0) {
    playerPath = getShortestPath(
      playerPosition,
      [opponentPosition],
      gameState,
      player,
    );
  }
  if (opponentPath.length === 0) {
    opponentPath = getShortestPath(
      opponentPosition,
      [playerPosition],
      gameState,
      opponent,
    );
  }

  if (playerPath.length === 0 && walls.length === 0) {
    return playerPosition;
  }

  if (playerPath.length < opponentPath.length || walls.length === 0) {
    return playerPath[1];
  }

  return walls[Math.floor(Math.random() * walls.length)];
}

module.exports = { computeMove };
