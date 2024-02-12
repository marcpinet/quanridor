// This function doesn't handle walls.
function computeMove(gameState) {
  let pos = gameState.playerspositions[1];
  let possibleMoves = [];
  // Check if moving left is possible.
  if (pos[0] > 0) possibleMoves.push([pos[0] - 1, pos[1]]);
  // Check if moving right is possible.
  if (pos[0] < 8) possibleMoves.push([pos[0] + 1, pos[1]]);
  // Check if moving down is possible.
  if (pos[1] < 8) possibleMoves.push([pos[0], pos[1] + 1]);
  // Check if moving up is possible.
  if (pos[1] > 0) possibleMoves.push([pos[0], pos[1] - 1]);

  // Get a random integer between 0 and possibleMoves.length-1
  let moveIndex = Math.floor(Math.random() * possibleMoves.length);
  return possibleMoves[moveIndex];
}

module.exports = computeMove;
