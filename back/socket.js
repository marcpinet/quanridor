const { ObjectId } = require("mongodb");
const { Server } = require("socket.io");
const AI0 = require("./logic/ai.js");
const { getDB } = require("./queryManagers/db");

function createSocket(server) {
    const io = new Server(server);

    const gameNamespace = io.of("/api/game");
    gameNamespace.on("connection", (socket) => {
        console.log("a user connected");

        socket.on("sendGameState", async (data) => {
            const gameState = data[0];
            const gameId = data[1];
            let newCoord = AI0(gameState);
            gameState.playerspositions[1] = newCoord;
            const db = getDB();
            //const users = db.collection("users");
            const games = db.collection("games");
            console.log(games);
            let res = await games.updateOne(
                { _id: new ObjectId(gameId) },
                { $set: gameState },
            );
            
            console.log(res);

            socket.emit("aiMove", newCoord);
        });

        socket.on("leave", async (data) => {
            const gameState = data[0];
            const gameId = data[1];
            const db = getDB();
            //const users = db.collection("users");
            const games = db.collection("games");
            console.log(games);
            let res = await games.updateOne(
                { _id: new ObjectId(gameId) },
                { $set: gameState },
            );

            console.log(res);
        })

        socket.on("win", async (data) => {
            
        })
    });

    return io;
}

module.exports = createSocket;