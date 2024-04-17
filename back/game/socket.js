const { ObjectId } = require("mongodb");
const { Server } = require("socket.io");
const Rulebased = require("./ai/rulebased-ai.js");
const Minimax = require("./ai/minimax-ai.js");
const MCTS = require("./ai/mcts-ai.js");
const { getDB } = require("../query-managers/db.js");
const { initializeGame } = require("./utils/game-initializer.js");
const { verifyToken } = require("../utils/jwt-utils.js");
const {
  isLegal,
  canJump,
  checkWin,
  isWallLegal,
  getNextMoveToFollowShortestPath,
  getPossibleMoves,
  getPossibleWalls,
} = require("./utils/game-checkers.js");

const requestCounts = {};

function rateLimitSocket(socket, next) {
  const ip = socket.handshake.address;
  const currentTime = Date.now();

  if (!requestCounts[ip]) {
    requestCounts[ip] = { count: 1, lastRequestTime: currentTime };
    next();
  } else {
    const { count, lastRequestTime } = requestCounts[ip];
    const timeDiff = currentTime - lastRequestTime;

    if (timeDiff > 600000) {
      // 10 minutes have passed, reset the count
      requestCounts[ip] = { count: 1, lastRequestTime: currentTime };
      next();
    } else if (count < 100) {
      requestCounts[ip].count++;
      next();
    } else {
      console.log(`Too many requests from IP: ${ip}`);
      socket.disconnect();
    }
  }
}

function checkAndUnlockAchievement(userId, achievement) {
  console.log("Checking achievement", achievement + " for user", userId);
  try {
    const db = getDB();
    const users = db.collection("users");

    try {
      users.findOne({ _id: new ObjectId(userId) }).then((user) => {
        if (!user.achievements.includes(achievement)) {
          users
            .updateOne(
              { _id: new ObjectId(userId) },
              { $push: { achievements: achievement } },
            )
            .then(() => {
              const notifications = db.collection("notifications");
              notifications.insertOne({
                content: `You unlocked the achievement: ${achievement}`,
                from: "[SYSTEM]",
                to: user._id,
                date: new Date(),
                type: "achievement",
                read: false,
              });
            });
        }
      });
    } catch (err) {
      try {
        users.findOne({ username: userId }).then((user) => {
          if (!user.achievements.includes(achievement)) {
            users
              .updateOne(
                { username: userId },
                { $push: { achievements: achievement } },
              )
              .then(() => {
                const notifications = db.collection("notifications");
                notifications.insertOne({
                  content: `You unlocked the achievement: ${achievement}`,
                  from: "[SYSTEM]",
                  to: user._id,
                  date: new Date(),
                  type: "achievement",
                  read: false,
                });
              });
          }
        });
      } catch (err) {
        console.error(err);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

function createSocketGame(io) {
  let waitingPlayer = null;
  const rooms = {};
  let waitingPlayerForBattle = null;
  const battleRooms = {};
  const gameNamespace = io.of("/api/game");
  gameNamespace.use(rateLimitSocket).on("connection", (socket) => {
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
        checkAndUnlockAchievement(data.userId, "Cheater!");
      }
    });

    socket.on("win?", async (data) => {
      const gameId = data.gameId;
      const gameState = data.gameState;
      // Check if someone won
      if (checkWin(gameState, 1)) {
        const gameId = data.gameId;

        // Tiens voilà mieux
        let newCoord = getNextMoveToFollowShortestPath(gameState, 2);
        gameState.playerspositions[1] = newCoord;

        const db = getDB();
        const games = db.collection("games");
        const game = await games.findOne({ _id: new ObjectId(gameId) });

        // Check if one of the user is an AI, if no, then add achievements
        if (
          !game.players[0].startsWith("AI") &&
          !game.players[1].startsWith("AI")
        ) {
          checkAndUnlockAchievement(game.players[0], "First Win");
          checkAndUnlockAchievement(game.players[1], "First Loss");
        }

        // Check if the game is over
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

          // Check if one of the user is an AI, if no, then add achievements
          if (
            !game.players[0].startsWith("AI") &&
            !game.players[1].startsWith("AI")
          ) {
            checkAndUnlockAchievement(game.players[1], "First Win");
            checkAndUnlockAchievement(game.players[0], "First Loss");
          }
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
        checkAndUnlockAchievement(data.userId, "Cheater!");
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

      socket.emit("leaveSuccess");
      socket.disconnect();
    });

    socket.on("updateGameState", async (data) => {
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

    /*----------------------------------------------*/

    socket.on("setSocket", async (data) => {
      const db = getDB();
      const users = db.collection("users");
      const decoded = await verifyToken(data.token);
      if (!decoded) {
        socket.emit("error", "Invalid token");
        return;
      }
      await users.updateOne(
        { username: decoded.username },
        { $set: { socketId: data.socketId } },
      );
      const user = await users.findOne({ username: decoded.username });
      console.log(user);
    });

    socket.on("redirectToGame", (data) => {
      gameNamespace.to(data.friendSocketId).emit("redirectToGame", data.roomId);
    });

    socket.on("joinRoom", async (data) => {
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

      if (waitingPlayerForBattle) {
        console.log("find game");
        const roomId = data.roomId;
        const socketPlayerRole = Math.random() < 0.5 ? 1 : 2;

        socket.join(roomId);
        socket.emit("assignedPlayer", socketPlayerRole);

        waitingPlayerForBattle.join(roomId);
        waitingPlayerForBattle.emit(
          "assignedPlayer",
          (socketPlayerRole % 2) + 1,
        );

        rooms[roomId] = [null, null];
        gameNamespace.to(roomId).emit("startGame", roomId);

        waitingPlayerForBattle = null;
      } else {
        waitingPlayerForBattle = socket;
        socket.emit("waiting");
      }

      let userId = user._id;
      await users.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { activity: "playing" } },
      );
    });

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

    socket.on("forcewin", async (data) => {
      const gameState = data.gameState;
      const userToken = data.token;

      const db = getDB();
      const users = db.collection("users");

      // Check if user is admin
      const decoded = await verifyToken(userToken);
      if (!decoded) {
        socket.emit("error", "Invalid token");
        return;
      }

      const user = await users.findOne({ username: decoded.username });
      if (!user) {
        socket.emit("error", "User not found");
        return;
      }

      // Teleport demanding player to the end
      if (gameState.players[0] === user.username) {
        gameState.playerspositions[0] = [8, 4];
      } else {
        gameState.playerspositions[1] = [0, 4];
      }

      const whoWon =
        gameState.players[0] === user.username ? "player1Win" : "player2Win";
      gameNamespace.to(data.roomId).emit(whoWon);
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

      // Sécurité par l'obscurité monsieur Arol90
      const userInfos = {
        username: user.username,
        elo: user.elo,
      };

      rooms[data.roomId][data.player - 1] = userInfos;

      gameNamespace.to(data.roomId).emit("usersData", rooms[data.roomId]);
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
      gameNamespace.to(data.roomId).emit("updateAfterPlayer1Move", data.coord);
    });

    socket.on("movePlayer2", (data) => {
      gameNamespace.to(data.roomId).emit("updateAfterPlayer2Move", data.coord);
    });

    socket.on("player1Wall", (data) => {
      gameNamespace.to(data.roomId).emit("updateAfterPlayer1Wall", data.wall);

      // Check if player1 has no more walls
      if (rooms[data.roomId][0].p1walls === 0) {
        checkAndUnlockAchievement(
          rooms[data.roomId][0].username,
          "Walls Master",
        );
      }
    });

    socket.on("player2Wall", (data) => {
      gameNamespace.to(data.roomId).emit("updateAfterPlayer2Wall", data.wall);

      // Check if player2 has no more walls
      if (rooms[data.roomId][1].p2walls === 0) {
        checkAndUnlockAchievement(
          rooms[data.roomId][1].username,
          "Walls Master",
        );
      }
    });

    socket.on("lastMoveToPlay", (data) => {
      gameNamespace.to(data.roomId).emit("player2LastMove", data.coord);
    });

    socket.on("player1Win", (data) => {
      gameNamespace.to(data.roomId).emit("player1Win");

      checkAndUnlockAchievement(rooms[data.roomId][0].username, "First Win");
      checkAndUnlockAchievement(rooms[data.roomId][1].username, "First Loss");
    });

    socket.on("player2Win", (data) => {
      gameNamespace.to(data.roomId).emit("player2Win");

      checkAndUnlockAchievement(rooms[data.roomId][1].username, "First Win");
      checkAndUnlockAchievement(rooms[data.roomId][0].username, "First Loss");
    });

    socket.on("draw", (data) => {
      gameNamespace.to(data.roomId).emit("draw");

      checkAndUnlockAchievement(rooms[data.roomId][0].username, "First Draw");
      checkAndUnlockAchievement(rooms[data.roomId][1].username, "First Draw");
    });

    socket.on("timeIsUp", (data) => {
      gameNamespace.to(data.roomId).emit("timeIsUp");
    });

    socket.on("timeIsUpForPlayer2", (data) => {
      checkAndUnlockAchievement(rooms[data.roomId][1].username, "Slow Brain");

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
      checkAndUnlockAchievement(rooms[data.roomId][0].username, "Slow Brain");

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
        checkAndUnlockAchievement(data.userId, "Cheater!");
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
        checkAndUnlockAchievement(data.userId, "Cheater!");
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
        checkAndUnlockAchievement(data.userId, "Cheater!");
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
        checkAndUnlockAchievement(data.userId, "Cheater!");
      } else {
        gameNamespace.to(data.roomId).emit("player2WallIsLegal", data.wall);
      }
    });

    socket.on("player1Leave", async (data) => {
      waitingPlayer = null;
      const db = getDB();
      const users = db.collection("users");

      const user = await users.findOne({ username: data.username });

      let userId = user._id;
      await users.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { activity: "inactive" } },
      );
      gameNamespace.to(data.roomId).emit("opponentLeave");
      socket.disconnect();

      checkAndUnlockAchievement(data.username, "Rage Quit");
    });

    socket.on("player2Leave", async (data) => {
      waitingPlayer = null;
      const db = getDB();
      const users = db.collection("users");

      const user = await users.findOne({ username: data.username });

      let userId = user._id;
      await users.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { activity: "inactive" } },
      );
      gameNamespace.to(data.roomId).emit("opponentLeave");
      socket.disconnect();

      checkAndUnlockAchievement(data.username, "Rage Quit");
    });

    socket.on("leaveWhileSearching", async (data) => {
      waitingPlayer = null;
      const decoded = await verifyToken(data.token);
      if (!decoded) {
        return;
      }

      const db = getDB();
      const users = db.collection("users");

      const user = await users.findOne({ username: decoded.username });

      let userId = user._id;
      await users.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { activity: "inactive" } },
      );

      socket.emit("leaveSuccess");
      socket.disconnect();
    });

    socket.on("updatePlayerElo", async (data) => {
      const db = getDB();
      const users = db.collection("users");
      const user = await users.findOne({ username: data.player });

      let userId = user._id;
      await users.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { elo: data.newElo } },
      );
    });
  });

  return io;
}

module.exports = createSocketGame;
