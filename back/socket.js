const { Server } = require("socket.io");
const AI0 = require("./logic/ai.js");

function createSocket(server) {
    const io = new Server(server);

    const gameNamespace = io.of("/api/game");
    gameNamespace.on("connection", (socket) => {
        console.log("a user connected");

        socket.on("sendGameState", (gameState) => {
            console.log(gameState);
            let newCoord = AI0(gameState);
            console.log(newCoord);
            socket.emit("aiMove", newCoord);
        });
    });

    return io;
}

module.exports = createSocket;