const { connectDB, getDB } = require("../query-managers/db.js");
const { ObjectId } = require("mongodb");

function createSocketSocial(io) {
  const socialNamespace = io.of("/api/social");

  socialNamespace.on("connection", (socket) => {
    let userId;

    socket.on("joinRoom", (id) => {
      socket.userId = id;
      socket.join(id);
    });

    socket.on("userConnected", async (userId) => {
      const db = getDB();
      const users = db.collection("users");
      console.log(userId + " connected");
      await users.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { activity: "active" } },
      );
    });

    socket.on("disconnect", async () => {
      console.log(socket.userId + " disconnected");
      const db = getDB();
      const users = db.collection("users");
      await users.updateOne(
        { _id: new ObjectId(socket.userId) },
        { $set: { activity: "inactive" } },
      );
    });

    socket.on("sendMessage", async (data, callback) => {
      const { content, from, to } = data;
      console.log(from, "sent a message to", to, ":", content);

      // Vérifier si les utilisateurs sont amis
      const db = getDB();
      const users = db.collection("users");
      const sender = await users.findOne({ _id: new ObjectId(from) });
      const recipient = await users.findOne({ _id: new ObjectId(to) });

      if (!sender || !recipient) {
        console.log("Invalid sender or recipient");
        return callback("Invalid sender or recipient");
      }

      const senderFriendsAsStrings = sender.friends.map((id) => id.toString());
      const recipientFriendsAsStrings = recipient.friends.map((id) =>
        id.toString(),
      );

      if (
        !senderFriendsAsStrings.includes(to) ||
        !recipientFriendsAsStrings.includes(from)
      ) {
        console.log("Users are not friends");
        return callback("Users are not friends");
      }

      // Stocker le message dans la base de données
      const messages = db.collection("messages");
      const message = {
        content,
        from: new ObjectId(from),
        to: new ObjectId(to),
        timestamp: new Date(),
        read: false,
      };

      try {
        await messages.insertOne(message);
        socialNamespace.to(to).emit("newMessage", message);
        console.log("Message transferred to recipient");
      } catch (error) {
        console.log(error);
        callback(error);
      }

      const notifications = db.collection("notifications");
      const notification = {
        title: sender.username + ":",
        message: content,
        to: new ObjectId(to),
        read: false,
        timestamp: new Date(),
      };

      try {
        await notifications.insertOne(notification);
        socialNamespace.to(to).emit("newMessageNotification", notification);
        console.log("Notification sent to recipient");
        callback();
      } catch (error) {
        console.log(error);
        callback(error);
      }
    });

    socket.on("retrieveMessages", async (data) => {
      const { from, to } = data;

      // Vérifier si les utilisateurs sont amis
      const db = getDB();
      const users = db.collection("users");
      const sender = await users.findOne({ _id: new ObjectId(from) });
      const recipient = await users.findOne({ _id: new ObjectId(to) });

      if (!sender || !recipient) {
        socket.emit("error", "Invalid sender or recipient");
        return;
      }

      const senderFriendsAsStrings = sender.friends.map((id) => id.toString());
      const recipientFriendsAsStrings = recipient.friends.map((id) =>
        id.toString(),
      );

      if (
        !senderFriendsAsStrings.includes(to) ||
        !recipientFriendsAsStrings.includes(from)
      ) {
        console.log("Users are not friends");
        socket.emit("error", "Users are not friends");
        return;
      }

      // Récupérer les messages de la base de données
      const messages = db.collection("messages");
      const query = {
        $or: [
          { from: new ObjectId(from), to: new ObjectId(to) },
          { from: new ObjectId(to), to: new ObjectId(from) },
        ],
      };
      const messageDocs = await messages
        .find(query)
        .sort({ timestamp: 1 })
        .toArray();

      // Envoyer les messages à l'utilisateur
      socket.emit("messageHistory", messageDocs);
    });

    socialNamespace.on("sendMessageNotification", async (data, callback) => {
      const { title, message, to } = data;
      console.log("Sending notification to", to, ":", title, message);

      // Stocker la notification dans la base de données
      const db = getDB();
      const notifications = db.collection("notifications");
      const notification = {
        title,
        message,
        to: new ObjectId(to),
        read: false,
        timestamp: new Date(),
      };

      try {
        await notifications.insertOne(notification);
        socialNamespace.to(to).emit("newMessageNotification", notification);
        console.log("Notification sent to recipient");
        callback();
      } catch (error) {
        console.log(error);
        callback(error);
      }
    });

    socket.on("dialogue", (data) => {
      const { player, message } = data;
      console.log(`Received dialogue: ${message} from player: ${player}`);
      socket.broadcast.emit("dialogue", { player, message });
    });

    socket.on("emoji", (data) => {
      const { player, message } = data;
      console.log(`Received emoji: ${message} from player: ${player}`);
      socket.broadcast.emit("emoji", { player, message });
    });
  });

  return io;
}

module.exports = createSocketSocial;
