const { ObjectId } = require("mongodb");
const { Server } = require("socket.io");
const Rulebased = require("./rulebased-ai.js");
const Minimax = require("./minimax-ai.js");
const MCTS = require("./mcts-ai.js");
const { getDB } = require("../../query-managers/db.js");
const { initializeGame } = require("../utils/game-initializer.js");
const { verifyToken } = require("../../utils/jwt-utils.js");
const {
  isLegal,
  canJump,
  checkWin,
  isWallLegal,
  getNextMoveToFollowShortestPath,
  getPossibleMoves,
  getPossibleWalls,
} = require("../utils/game-checkers.js");

function createSocket(server) {
  let waitingPlayer = null;
  const rooms = {};
  const io = new Server(server);

function createSocketGame(io) {
  const gameNamespace = io.of("/api/game");
  gameNamespace.on("connection", (socket) => {
    socket.on("createGameAI", async (data) => {
      // Verify the token
      const decoded = await verifyToken(data.token);
      if (!decoded) {
        socket.emit("error", "Invalid token");
        return;
      }

      const db = getDB();
      const games = db.collection("games");
      const users = db.collection("users");

      // Find the user
      const user = await users.findOne({ username: decoded.username });
      if (!user) {
        socket.emit("error", "User not found");
        return;
      }

      // Create a new game
      const emptyGame = initializeGame(user);
      if (!emptyGame) {
        socket.emit("error", "Failed to create game");
        return;
      }

      // Manually setting some initial values
      emptyGame.difficulty = data.difficulty;
      emptyGame.author = user.username;
      emptyGame.status = 1;
      emptyGame.players = [user.username, `AI${data.difficulty}`];

      // Insert the game into the database
      const result = await games.insertOne(emptyGame);

      // Get the game from the database
      const game = await games.findOne({
        _id: new ObjectId(result.insertedId),
      });

      console.log(game.playerspositions);
      // Get users elo
      const userElo = user.elo;
      const aiElo = 450 + 450 * data.difficulty;

      game.elos = [userElo, aiElo];

      // Join the game
      socket.join(game._id.toString());
      socket.emit("gameCreated", game);

      let userId = user._id;
      await users.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { activity: "playing" } },
      );
    });

    socket.on("gameId", async (data) => {
      const token = data.token;
      const gameId = data.gameId;
      const db = getDB();
      const games = db.collection("games");
      const users = db.collection("users");

      // Find the user
      const decoded = await verifyToken(token);
      if (!decoded) {
        socket.emit("error", "Invalid token");
        return;
      }

      const user = await users.findOne({ username: decoded.username });
      if (!user) {
        socket.emit("error", "User not found");
        return;
      }

      // Get the game from the database
      const game = await games.findOne({ _id: new ObjectId(gameId) });
      if (!game) {
        socket.emit("error", "Game not found");
        return;
      }

      // Get users elo
      const userElo = user.elo;
      const aiElo = 450 + 450 * data.difficulty;

      game.elos = [userElo, aiElo];

      // Check if user is part of the game
      if (game.players.includes(user.username)) {
        socket.join(game._id.toString());
        socket.emit("retrieveGame", game);
      }

      let userId = user._id;
      await users.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { activity: "playing" } },
      );
    });

    socket.on("isMoveLegal", async (data) => {
      let gameState = data.gameState;
      let newCoord = data.newCoord;
      let jump_coord = canJump(
        gameState.playerspositions[0],
        gameState.playerspositions[0],
        gameState.playerspositions[1],
        gameState.vwalls,
        gameState.hwalls,
      );
      if (
        isLegal(
          gameState.playerspositions[0],
          newCoord,
          gameState.vwalls,
          gameState.hwalls,
          gameState.playerspositions[0],
          gameState.playerspositions[1],
        ) ||
        (jump_coord[0] == newCoord[0] && jump_coord[1] == newCoord[1])
      ) {
        socket.emit("legalMove", newCoord);
      } else {
        socket.emit("illegal");
      }
    });

    socket.on("win?", async (data) => {
      const gameId = data.gameId;
      const gameState = data.gameState;
      // Check if someone won
      if (checkWin(gameState, 1)) {
        const gameId = data.gameId;

        // @arol90 c'est quoi cette merde
        // const gameState = data.gameState;
        // let newCoord = Rulebased.computeMove(gameState);
        // gameState.playerspositions[1] = newCoord;

        // Tiens voilà mieux
        let newCoord = getNextMoveToFollowShortestPath(gameState, 2);
        gameState.playerspositions[1] = newCoord;

        const db = getDB();
        const games = db.collection("games");

        // Check if the game is over
        const game = await games.findOne({ _id: new ObjectId(gameId) });
        if (game.status === 2) {
          socket.emit("gameOver", game);
          return;
        }

        let res = await games.updateOne(
          { _id: new ObjectId(gameId) },
          { $set: gameState },
        );

        socket.emit("aiLastMove", newCoord);

        const users = db.collection("users");
        const token = data.token;
        const decoded = await verifyToken(token);
        if (!decoded) {
          socket.emit("error", "Invalid token");
          return;
        }

        const user = await users.findOne({ username: decoded.username });
        if (!user) {
          socket.emit("error", "User not found");
          return;
        }

        let res1 = await games.updateOne(
          { _id: new ObjectId(gameId) },
          { $set: gameState },
        );

        if (checkWin(gameState, 2)) {
          const games = db.collection("games");
          let res2 = await games.updateOne(
            { _id: new ObjectId(gameId) },
            {
              $set: {
                status: 2,
                winner: "draw",
              },
            },
          );
          const game = await games.findOne({ _id: new ObjectId(gameId) });
          socket.emit("draw", game);
        } else {
          const games = db.collection("games");
          let res2 = await games.updateOne(
            { _id: new ObjectId(gameId) },
            {
              $set: {
                status: 2,
                winner: gameState.players[0],
              },
            },
          );

          const game = await games.findOne({ _id: new ObjectId(gameId) });
          socket.emit("win", game);
        }
      } else if (checkWin(gameState, 2)) {
        const db = getDB();
        const games = db.collection("games");
        const users = db.collection("users");
        const token = data.token;

        // Check if user is part of the game
        const decoded = await verifyToken(token);
        if (!decoded) {
          socket.emit("error", "Invalid token");
          return;
        }

        const user = await users.findOne({ username: decoded.username });
        if (!user) {
          socket.emit("error", "User not found");
          return;
        }

        let res1 = await games.updateOne(
          { _id: new ObjectId(gameId) },
          { $set: gameState },
        );

        let res2 = await games.updateOne(
          { _id: new ObjectId(gameId) },
          {
            $set: {
              status: 2,
              winner: gameState.players[1],
            },
          },
        );

        const game = await games.findOne({ _id: new ObjectId(gameId) });
        socket.emit("win", game);
      }
    });

    socket.on("sendGameState", async (data) => {
      const gameId = data.gameId;
      const gameState = data.gameState;
      let newCoord;
      let startTime = performance.now();
      if (gameState.difficulty === 0) {
        newCoord = Rulebased.computeMove(gameState, 2);
      } else if (gameState.difficulty === 1) {
        newCoord = Minimax.computeMove(gameState, 2);
      } else if (gameState.difficulty === 2) {
        newCoord = MCTS.computeMove(gameState, 2);
      } else {
        throw new Error("Invalid difficulty");
      }
      let endTime = performance.now();
      let elapsedTime = endTime - startTime;
      console.log("AI played", newCoord);
      console.log(`Time elapsed: ${Math.round(elapsedTime)} millisecondes`);
      gameState.playerspositions[1] = newCoord;
      const db = getDB();
      const games = db.collection("games");

      // Check if the game is over
      const game = await games.findOne({ _id: new ObjectId(gameId) });
      if (game.status === 2) {
        socket.emit("gameOver", game);
        return;
      }

      let res = await games.updateOne(
        { _id: new ObjectId(gameId) },
        { $set: gameState },
      );

      socket.emit("aiMove", newCoord);
    });

    socket.on("isWallLegal", (data) => {
      let temp_wall = data[0];
      let current_direction = data[1];
      let gameState = data[2];
      if (
        !isWallLegal(
          1,
          temp_wall,
          current_direction,
          gameState.p1walls,
          gameState.p2walls,
          gameState.vwalls,
          gameState.hwalls,
          gameState.playerspositions[0],
          gameState.playerspositions[1],
        )
      ) {
        socket.emit("illegal");
      } else {
        socket.emit("legalWall");
      }
    });

    socket.on("leave", async (data) => {
      const gameId = data.gameId;
      const gameState = data.gameState;
      const db = getDB();
      const games = db.collection("games");

      // Check if the game is over
      const game = await games.findOne({ _id: new ObjectId(gameId) });
      if (game.status === 2) {
        socket.emit("gameOver", game);
        return;
      }

      let res = await games.updateOne(
        { _id: new ObjectId(gameId) },
        { $set: gameState },
      );

      let username = gameState.players[0];
      let users = db.collection("users");
      let user = await users.findOne({ username: username });
      let userId = user._id;

      await users.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { activity: "inactive" } },
      );
    });

    /*----------------------------------------------*/

    socket.on("searchGame", async (data) => {
      console.log("search game");
      const decoded = await verifyToken(data.token);
      if (!decoded) {
        socket.emit("error", "Invalid token");
        return;
      }

      const db = getDB();
      const users = db.collection("users");

      const user = await users.findOne({ username: decoded.username });
      if (!user) {
        socket.emit("error", "User not found");
        return;
      }

      if (waitingPlayer) {
        console.log("find game");
        const roomId = `room_${Math.floor(Math.random() * 1000)}`;
        const socketPlayerRole = Math.random() < 0.5 ? 1 : 2;

        socket.join(roomId);
        socket.emit("assignedPlayer", socketPlayerRole);

        waitingPlayer.join(roomId);
        waitingPlayer.emit("assignedPlayer", (socketPlayerRole % 2) + 1);

        rooms[roomId] = [null, null];
        gameNamespace.to(roomId).emit("startGame", roomId);

        waitingPlayer = null;
      } else {
        waitingPlayer = socket;
        socket.emit("waiting");
      }

      let userId = user._id;
      await users.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { activity: "playing" } },
      );
    });

    socket.on("userData", async (data) => {
      const decoded = await verifyToken(data.token);
      if (!decoded) {
        return;
      }

      const db = getDB();
      const users = db.collection("users");

      const user = await users.findOne({ username: decoded.username });
      if (!user) {
        return;
      }

      rooms[data.roomId][data.player - 1] = user;

      gameNamespace.to(data.roomId).emit("usernames", rooms[data.roomId]);
    });

    socket.on("readyToPlace", (data) => {
      gameNamespace.to(data.roomId).emit("placePlayer1");
    });

    socket.on("player1Placed", (data) => {
      gameNamespace.to(data.roomId).emit("placePlayer2", data.coord);
    });

    socket.on("player2Placed", (data) => {
      gameNamespace.to(data.roomId).emit("readyToStart", data.coord);
    });

    socket.on("movePlayer1", (data) => {
      gameNamespace.to(data.roomId).emit("updateAfterPayer1Move", data.coord);
    });

    socket.on("movePlayer2", (data) => {
      gameNamespace.to(data.roomId).emit("updateAfterPayer2Move", data.coord);
    });

    socket.on("player1Wall", (data) => {
      gameNamespace.to(data.roomId).emit("updateAfterPayer1Wall", data.wall);
    });

    socket.on("player2Wall", (data) => {
      gameNamespace.to(data.roomId).emit("updateAfterPayer2Wall", data.wall);
    });

    socket.on("lastMoveToPlay", (data) => {
      console.log("caca");
      gameNamespace.to(data.roomId).emit("player2LastMove", data.coord);
    });

    socket.on("player1Win", (data) => {
      gameNamespace.to(data.roomId).emit("player1Win");
    });

    socket.on("player2Win", (data) => {
      gameNamespace.to(data.roomId).emit("player2Win");
    });

    socket.on("draw", (data) => {
      gameNamespace.to(data.roomId).emit("draw");
    });

    socket.on("timeIsUp", (data) => {
      gameNamespace.to(data.roomId).emit("timeIsUp");
    });

    socket.on("timeIsUpForPlayer2", (data) => {
      let gameState = data.gameState;
      let possibleMoves = getPossibleMoves(
        gameState,
        gameState.playerspositions[1],
        2,
      );
      let possibleWalls = getPossibleWalls(gameState, 2);
      possibleMoves = possibleMoves.concat(possibleWalls);
      let move =
        possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
      if (move.length == 0) {
        gameNamespace.to(data.roomId).emit("timeIsUp");
      } else if (move.length == 2) {
        gameNamespace.to(data.roomId).emit("player2MoveIsLegal", move);
      } else {
        gameNamespace.to(data.roomId).emit("player2WallIsLegal", move);
      }
    });

    socket.on("timeIsUpForPlayer1", (data) => {
      let gameState = data.gameState;
      let possibleMoves = getPossibleMoves(
        gameState,
        gameState.playerspositions[0],
        1,
      );
      let possibleWalls = getPossibleWalls(gameState, 1);
      possibleMoves = possibleMoves.concat(possibleWalls);
      let move =
        possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
      if (move.length == 0) {
        gameNamespace.to(data.roomId).emit("timeIsUp");
      } else if (move.length == 2) {
        gameNamespace.to(data.roomId).emit("player1MoveIsLegal", move);
      } else {
        gameNamespace.to(data.roomId).emit("player1WallIsLegal", move);
      }
    });

    socket.on("isPlayer1MoveLegal", (data) => {
      let gameState = data.gameState;
      let newCoord = data.newCoord;
      let jump_coord = canJump(
        gameState.playerspositions[0],
        gameState.playerspositions[0],
        gameState.playerspositions[1],
        gameState.vwalls,
        gameState.hwalls,
      );
      if (
        isLegal(
          gameState.playerspositions[0],
          newCoord,
          gameState.vwalls,
          gameState.hwalls,
          gameState.playerspositions[0],
          gameState.playerspositions[1],
        ) ||
        (jump_coord[0] == newCoord[0] && jump_coord[1] == newCoord[1])
      ) {
        gameNamespace.to(data.roomId).emit("player1MoveIsLegal", newCoord);
      } else {
        gameNamespace.to(data.roomId).emit("illegal");
      }
    });

    socket.on("isPlayer2MoveLegal", (data) => {
      let gameState = data.gameState;
      let newCoord = data.newCoord;
      let jump_coord = canJump(
        gameState.playerspositions[1],
        gameState.playerspositions[0],
        gameState.playerspositions[1],
        gameState.vwalls,
        gameState.hwalls,
      );
      if (
        isLegal(
          gameState.playerspositions[1],
          newCoord,
          gameState.vwalls,
          gameState.hwalls,
          gameState.playerspositions[0],
          gameState.playerspositions[1],
        ) ||
        (jump_coord[0] == newCoord[0] && jump_coord[1] == newCoord[1])
      ) {
        gameNamespace.to(data.roomId).emit("player2MoveIsLegal", newCoord);
      } else {
        gameNamespace.to(data.roomId).emit("illegal");
      }
    });

    socket.on("isPlayer1WallLegal", (data) => {
      let temp_wall = [data.wall[0], data.wall[1]];
      let current_direction = data.wall[2];
      let gameState = data.gameState;
      if (
        !isWallLegal(
          1,
          temp_wall,
          current_direction,
          gameState.p1walls,
          gameState.p2walls,
          gameState.vwalls,
          gameState.hwalls,
          gameState.playerspositions[0],
          gameState.playerspositions[1],
        )
      ) {
        gameNamespace.to(data.roomId).emit("illegal");
      } else {
        gameNamespace.to(data.roomId).emit("player1WallIsLegal", data.wall);
      }
    });

    socket.on("isPlayer2WallLegal", (data) => {
      let temp_wall = [data.wall[0], data.wall[1]];
      let current_direction = data.wall[2];
      let gameState = data.gameState;
      if (
        !isWallLegal(
          2,
          temp_wall,
          current_direction,
          gameState.p1walls,
          gameState.p2walls,
          gameState.vwalls,
          gameState.hwalls,
          gameState.playerspositions[0],
          gameState.playerspositions[1],
        )
      ) {
        gameNamespace.to(data.roomId).emit("illegal");
      } else {
        gameNamespace.to(data.roomId).emit("player2WallIsLegal", data.wall);
      }
    });

    socket.on("player1Leave", async (data) => {
      const db = getDB();
      const users = db.collection("users");

      const user = await users.findOne({ username: data.username });

      let userId = user._id;
      await users.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { activity: "inactive" } },
      );
      gameNamespace.to(data.roomId).emit("opponentLeave");
    });

    socket.on("player2Leave", async (data) => {
      const db = getDB();
      const users = db.collection("users");

      const user = await users.findOne({ username: data.username });

      let userId = user._id;
      await users.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { activity: "inactive" } },
      );
      gameNamespace.to(data.roomId).emit("opponentLeave");
    });
  });

  return io;
}

module.exports = createSocketGame;
