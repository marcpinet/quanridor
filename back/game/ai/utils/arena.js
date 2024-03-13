const Random = require("../random-ai.js");
const Minimax = require("../minimax-ai.js");
const MCTS = require("../mcts-ai.js");

const { initializeGame } = require("../../utils/game-initializer.js");
const {
  applyMove,
  checkWin,
  canWin,
  getShortestPath,
} = require("../../utils/game-checkers.js");

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
      move = MCTS.computeMove(game, playsAsPlayer1);
      console.log("Player1 played", move);
      game = applyMove(game, move, 1);
      totalTimeP1 += performance.now() - startTime;
    } else {
      move = Minimax.computeMove(game, playsAsPlayer2);
      console.log("Player2 played", move);
      game = applyMove(game, move, 2);
      totalTimeP2 += performance.now() - startTime;
    }

    let endTime = performance.now();
    let elapsedTime = endTime - startTime;
    console.log(`Time elapsed: ${Math.round(elapsedTime)} milliseconds`);

    if (checkWin(game, 1)) {
      console.log("\n");
      console.log(game);
      console.log("\n");

      let { canWin: canWinPlayer2, player2path: path } = canWin(game, 2);

      if (canWinPlayer2) {
        game = applyMove(game, path[1], 2);
        console.log("It's a draw");
        break;
      }

      console.log("Player1 won");
      break;
    } else if (checkWin(game, 2)) {
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

// USE THIS TO FIX GETSHORTESTPATH
//const test = {playerspositions:[[4,4],[0,2]],p1walls:0,p2walls:0,vwalls:[[4,1,"v"],[7,4,"v"],[1,4,"v"],[4,5,"v"]],hwalls:[[2,2,"h"],[4,2,"h"],[0,2,"h"],[6,1,"h"],[3,1,"h"],[1,1,"h"],[6,3,"h"],[4,3,"h"],[7,0,"h"],[7,6,"h"],[7,5,"h"],[2,3,"h"],[0,6,"h"],[2,6,"h"],[4,6,"h"],[4,4,"h"]],turn:100,winner:null,board_visibility:[[1,1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1]],author:"admin",players:["admin","debug"],status:1,created:"2024-03-13T02:41:32.514Z"};
//const p2goals = [
//  [0, 8],
//  [1, 8],
//  [2, 8],
//  [3, 8],
//  [4, 8],
//  [5, 8],
//  [6, 8],
//  [7, 8],
//  [8, 8],
//];
//console.log(getShortestPath(test.playerspositions[1], p2goals, test, 2));

try {
  simulateGameBetween2AI();
} catch (e) {
  console.log(e);
  console.log("########## PASTE THIS IN MONGODB TO VISUALIZE ##########");
  game.author = "admin";
  game.players = ["admin", "debug"];
  game.status = 1;
  game.created = new Date();
  game.board_visibility = game.board_visibility.map((row) =>
    row.map((cell) => (cell !== 1 ? 1 : cell)),
  );
  // Stringify the gameobject and print it to the console so it fits 1 line
  console.log("db.games.insertOne(" + JSON.stringify(game) + ")");
}
