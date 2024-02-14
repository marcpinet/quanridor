const { ObjectId } = require("mongodb");
const { Server } = require("socket.io");
const AI0 = require("./ai.js");
const { getDB } = require("../../query-managers/db.js");
const { initializeGame } = require("../utils/game-initializer.js");
const { verifyToken } = require("../../utils/jwt-utils.js");
const {
  isLegal,
  canJump,
  checkWin,
  isWallLegal,
} = require("../utils/game-checkers.js");

function createSocket(server) {
  const io = new Server(server);

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

      // Get users elo
      const userElo = user.elo;
      const aiElo = 450 + 450 * data.difficulty;

      game.elos = [userElo, aiElo];

      // Join the game
      socket.join(game._id.toString());
      socket.emit("gameCreated", game);

      console.log(game);
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
      if (
        checkWin(1, {
          p1_coord: gameState.playerspositions[0],
          p2_coord: gameState.playerspositions[1],
        }) ||
        checkWin(2, {
          p1_coord: gameState.playerspositions[0],
          p2_coord: gameState.playerspositions[1],
        })
      ) {
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
              winner: checkWin(1, {
                p1_coord: gameState.playerspositions[0],
                p2_coord: gameState.playerspositions[1],
              })
                ? gameState.players[0]
                : gameState.players[1],
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
      let newCoord = AI0(gameState);
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
    });
  });

  return io;
}

module.exports = createSocket;