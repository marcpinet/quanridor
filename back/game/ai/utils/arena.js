const Random = require("../random-ai.js");
const Minimax = require("../minimax-ai.js");
const MCTS = require("../mcts.js");

const { initializeGame } = require("../../utils/game-initializer.js");
const { applyMove, checkWin } = require("../../utils/game-checkers.js");

function simulateGameBetween2AI() {
  let game = initializeGame();

  // Tu clc arthur mdr
  game.playerspositions[0] = [4, 8];
  game.playerspositions[1] = [4, 0];

  console.log("Game started");

  while (true) {
    let move;
    let startTime = performance.now();
    if (game.turn % 2 === 0) {
      move = Minimax.computeMove(game, 1);
      console.log("Player1 played", move);
      game = applyMove(game, move, 1);
    } else {
      move = MCTS.computeMove(game, 2);
      console.log("Player2 played", move);
      game = applyMove(game, move, 2);
    }
    let endTime = performance.now();
    let elapsedTime = endTime - startTime;
    console.log(`Le temps écoulé: ${Math.round(elapsedTime)} millisecondes`);
    if (
      checkWin(1, {
        p1_coord: game.playerspositions[0],
        p2_coord: game.playerspositions[1],
      })
    ) {
      console.log("Player1 won");
      break;
    } else if (
      checkWin(2, {
        p1_coord: game.playerspositions[0],
        p2_coord: game.playerspositions[1],
      })
    ) {
      console.log("Player2 won");
      break;
    }
  }
}

simulateGameBetween2AI();
