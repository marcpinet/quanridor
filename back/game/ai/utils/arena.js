const Random = require("../random-ai.js");
const Minimax = require("../minimax-ai.js");
const MCTS = require("../mcts-ai.js");

const { initializeGame } = require("../../utils/game-initializer.js");
const { applyMove, checkWin } = require("../../utils/game-checkers.js");

let game = initializeGame();

function simulateGameBetween2AI() {
  const playsAsPlayer1 = 1;
  const playsAsPlayer2 = 2;

  game.playerspositions[0] = [4, 8];
  game.playerspositions[1] = [4, 0];

  console.log("Game started");

  let totalTime = 0;
  let totalTimeP1 = 0;
  let totalTimeP2 = 0;

  while (true) {
    let move;
    let startTime = performance.now();
    if (game.turn % 2 === 0) {
      move = Minimax.computeMove(game, playsAsPlayer1);
      console.log("Player1 played", move);
      game = applyMove(game, move, 1);
      totalTimeP1 += performance.now() - startTime;
    } else {
      move = MCTS.computeMove(game, playsAsPlayer2);
      console.log("Player2 played", move);
      game = applyMove(game, move, 2);
      totalTimeP2 += performance.now() - startTime;
    }
    let endTime = performance.now();
    let elapsedTime = endTime - startTime;
    console.log(`Le temps écoulé: ${Math.round(elapsedTime)} millisecondes`);
    totalTime += elapsedTime;
    if (
      checkWin(1, {
        p1_coord: game.playerspositions[0],
        p2_coord: game.playerspositions[1],
      })
    ) {
      console.log("\n");
      console.log(game);
      console.log("\n");
      console.log("Player1 won");
      break;
    } else if (
      checkWin(2, {
        p1_coord: game.playerspositions[0],
        p2_coord: game.playerspositions[1],
      })
    ) {
      console.log("\n");
      console.log(game);
      console.log("\n");
      console.log("Player2 won");
      break;
    }
  }

  console.log("Total time: ", Math.round(totalTime), "ms");
  console.log("Total time P1: ", Math.round(totalTimeP1), "ms");
  console.log("Total time P2: ", Math.round(totalTimeP2), "ms");
  console.log(
    "Average time P1: ",
    Math.round(totalTimeP1 / (game.turn / 2)),
    "ms",
  );
  console.log(
    "Average time P2: ",
    Math.round(totalTimeP2 / (game.turn / 2)),
    "ms",
  );
  console.log("Turns: ", game.turn);
}

simulateGameBetween2AI();
