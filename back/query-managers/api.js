const http = require("http");
const url = require("url");
const { connectDB, getDB } = require("./db");
const { ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { verifyToken, getJwtSecret } = require("../utils/jwt-utils");

const apiPath = "/api";

const saltRounds = 12;

const DEFAULT_ELO = 800;

const requestCounts = {};

// ------------------------------ CORE HANDLING ------------------------------

function addCors(
  response,
  methods = ["GET", "POST", "OPTIONS", "PUT", "PATCH", "DELETE"],
) {
  response.setHeader("Access-Control-Allow-Origin", "*"); // TODO: REPLACE WITH FRONTEND URL WHEN DEPLOYED
  response.setHeader("Access-Control-Allow-Methods", methods.join(", "));
  response.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With, Content-Type, Authorization",
  );
  response.setHeader("Access-Control-Allow-Credentials", "true");
}

async function manageRequest(request, response) {
  console.log(`Request URL: ${request.url}`);

  addCors(response);

  if (request.method === "OPTIONS") {
    response.statusCode = 204;
    response.end();
    return;
  }

  rateLimit(request, response, async () => {
    const parsedUrl = url.parse(request.url, true);
    const path = parsedUrl.pathname;
    let tmp = path.endsWith("/") ? path.slice(0, -1) : path;
    const normalizedPath = tmp.split("?")[0];

    console.log(`Normalized path: ${normalizedPath}`);

    const token = getTokenFromHeaders(request);

    if (!token) {
      if (normalizedPath === `${apiPath}/signup` && request.method === "POST") {
        handleSignup(request, response);
      } else if (
        normalizedPath === `${apiPath}/login` &&
        request.method === "POST"
      ) {
        handleLogin(request, response);
      } else {
        console.log("No token found in headers");
        response.writeHead(404, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({
            message: "You need to be authenticated to access this endpoint",
          }),
        );
      }
    } else {
      const decodedToken = await verifyToken(token);
      if (!decodedToken) {
        response.writeHead(403, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({ message: "Invalid token (maybe it has expired?)" }),
        );

        return;
      }

      // Social
      if (
        normalizedPath === `${apiPath}/notifications` &&
        request.method === "GET"
      ) {
        handleNotificationsGet(request, response, decodedToken);
      } else if (
        normalizedPath === `${apiPath}/notifications/markAsRead` &&
        request.method === "PUT"
      ) {
        handleNotificationsMarkAsRead(request, response, decodedToken);
      } else if (
        normalizedPath === `${apiPath}/unreadMessagesCount` &&
        request.method === "GET"
      ) {
        handleUnreadMessagesCount(request, response, decodedToken);
      } else if (
        normalizedPath.startsWith(`${apiPath}/notifications/`) &&
        request.method === "DELETE"
      ) {
        handleNotificationDelete(request, response, decodedToken);
      } else if (
        normalizedPath === `${apiPath}/markMessagesAsRead` &&
        request.method === "PUT"
      ) {
        handleMarkMessagesAsRead(request, response, decodedToken);
      } else if (
        normalizedPath.startsWith(`${apiPath}/friends`) &&
        request.method === "DELETE"
      ) {
        handleFriendDelete(request, response, decodedToken);
      } else if (
        normalizedPath === `${apiPath}/friendRequest` &&
        request.method === "POST"
      ) {
        handleFriendRequestPost(request, response, decodedToken);
      } else if (
        normalizedPath.startsWith(`${apiPath}/friendRequest/`) &&
        request.method === "PUT"
      ) {
        handleFriendRequestAccept(request, response, decodedToken);
      }

      // Game
      else if (
        normalizedPath === `${apiPath}/game` &&
        request.method === "GET"
      ) {
        handleGameGet(request, response, decodedToken);
      } else if (
        normalizedPath === `${apiPath}/users` &&
        request.method === "GET"
      ) {
        handleUsersGet(request, response, decodedToken);
      } else if (
        normalizedPath.startsWith(`${apiPath}/users/`) &&
        request.method === "GET"
      ) {
        handleUserGet(request, response, decodedToken);
      } else {
        response.writeHead(404, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({ message: `Endpoint ${normalizedPath} not found` }),
        );
      }
    }
  });
}

// ------------------------------ SIGN UP ------------------------------

async function handleSignup(request, response) {
  addCors(response, ["POST"]);
  let body = "";
  request.on("data", (chunk) => {
    body += chunk.toString();
  });
  request.on("end", async () => {
    try {
      let { username, password } = JSON.parse(body);
      username = username.toLowerCase();

      if (username.length > 50 || password.length > 100) {
        response.writeHead(400, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({ message: "Username or password too long" }),
        );
        return;
      }

      // If username is the form of "ai" + any number after, return an error
      if (username.match(/^ai\d+$/) || username === "draw") {
        response.writeHead(400, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({
            message: "Username cannot be in the form of 'AI' + number",
          }),
        );
        return;
      }

      const db = getDB();
      const users = db.collection("users");

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await users.findOne({ username });
      if (existingUser) {
        response.writeHead(409, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ message: "User already exists" }));
        return;
      }

      // Hacher le mot de passe
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Créer l'utilisateur avec le mot de passe haché
      await users.insertOne({
        username,
        password: hashedPassword,
        elo: DEFAULT_ELO,
        admin: false,
        friends: [],
        activity: "inactive",
      });

      // Get secret from secrets collection in MongoDB where the field "jwt" is the secret
      let secret = await getJwtSecret();

      // Generate JWT
      const token = jwt.sign({ username }, secret, { expiresIn: "90d" });

      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ token: token }));
    } catch (e) {
      response.writeHead(400, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ message: "Invalid JSON" }));
    }
  });
}

// ------------------------------ SIGN IN ------------------------------

async function handleLogin(request, response) {
  addCors(response, ["POST"]);
  let body = "";
  request.on("data", (chunk) => {
    body += chunk.toString();
  });
  request.on("end", async () => {
    try {
      let { username, password } = JSON.parse(body);
      username = username.toLowerCase();

      const db = getDB();
      const users = db.collection("users");

      // Vérifier si l'utilisateur existe
      const user = await users.findOne({ username });
      if (!user) {
        response.writeHead(401, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ message: "User not found" }));
        return; // S'assure que la fonction s'arrête ici si l'utilisateur n'existe pas
      }

      // Vérifier si le mot de passe est correct
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        response.writeHead(401, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ message: "Invalid password" }));
        return; // S'assure que la fonction s'arrête ici si le mot de passe ne correspond pas
      }

      // Générer le JWT
      let secret = await getJwtSecret();
      const token = jwt.sign({ username }, secret, { expiresIn: "90d" });

      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          token: token,
          banned: user.banned === undefined ? false : user.banned,
        }),
      );
    } catch (e) {
      response.writeHead(400, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ message: "Invalid JSON" }));
    }
  });
}

// ------------------------------ USERS HANDLING ------------------------------

async function handleUsersGet(request, response, decodedToken) {
  addCors(response, ["GET"]);

  let requestForOtherUser = false;

  let body = "";
  request.on("data", (chunk) => {
    body += chunk.toString();
  });

  request.on("end", async () => {
    if (body.length > 0) {
      response.writeHead(400, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ message: "Body not allowed" }));
      return;
    }

    try {
      const db = getDB();
      const users = db.collection("users");

      const username = decodedToken.username;
      const user = await users.findOne({ username });

      if (!user) {
        response.writeHead(401, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ message: "User not authenticated" }));
        return;
      }

      if (requestForOtherUser) {
        const otherUser = await users.findOne({ username: body.username });
        if (!otherUser) {
          response.writeHead(404, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ message: "User not found" }));
          return;
        }

        response.writeHead(200, { "Content-Type": "application/json" });

        response.end(
          JSON.stringify({
            _id: otherUser._id.toString(),
            username: otherUser.username,
            elo: otherUser.elo,
            friends: otherUser.friends,
            activity: otherUser.activity,
          }),
        );
        return;
      }

      // Return every information about the user except the password
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          _id: user._id.toString(),
          username: user.username,
          elo: user.elo,
          friends: user.friends,
          activity: user.activity,
        }),
      );
    } catch (e) {
      console.error("Error in handleUsersGet:", e);
      response.writeHead(400, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ message: "Failed to retrieve user" }));
    }
  });
}

async function handleUserGet(request, response, decodedToken) {
  addCors(response, ["GET"]);

  const parsedUrl = url.parse(request.url, true);
  const userId = parsedUrl.pathname.split("/").pop();

  try {
    const db = getDB();
    const users = db.collection("users");

    const username = decodedToken.username;
    const user = await users.findOne({ username });

    if (!user) {
      response.writeHead(401, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ message: "User not authenticated" }));
      return;
    }

    const otherUser = await users.findOne({ _id: new ObjectId(userId) });
    if (!otherUser) {
      response.writeHead(404, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ message: "User not found" }));
      return;
    }

    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        _id: otherUser._id.toString(),
        username: otherUser.username,
        elo: otherUser.elo,
        activity: otherUser.activity,
      }),
    );
  } catch (e) {
    console.error("Error in handleUserGet:", e);
    response.writeHead(400, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ message: "Failed to retrieve user" }));
  }
}

// ------------------------------ FRIENDS HANDLING ------------------------------

async function handleFriendRequestPost(request, response, decodedToken) {
  addCors(response, ["POST"]);

  let body = "";
  request.on("data", (chunk) => {
    body += chunk.toString();
  });

  request.on("end", async () => {
    try {
      const { friendUsername } = JSON.parse(body);

      const db = getDB();
      const users = db.collection("users");
      const notifications = db.collection("notifications");

      const currentUser = await users.findOne({
        username: decodedToken.username,
      });
      const friendUser = await users.findOne({ username: friendUsername });

      if (!currentUser || !friendUser) {
        response.writeHead(404, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({ message: "User not found", specific: 0 }),
        );
        return;
      }

      if (currentUser.username === friendUser.username) {
        response.writeHead(400, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({
            message: "Cannot add yourself as a friend",
            specific: 1,
          }),
        );
        return;
      }

      // Vérifier si les utilisateurs sont amis
      const userFriendsAsStrings = currentUser.friends.map((id) =>
        id.toString(),
      );
      const friendFriendsAsStrings = friendUser.friends.map((id) =>
        id.toString(),
      );

      if (
        userFriendsAsStrings.includes(friendUser._id.toString()) &&
        friendFriendsAsStrings.includes(currentUser._id.toString())
      ) {
        response.writeHead(400, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({ message: "Already friends", specific: 2 }),
        );
        return;
      }

      const existingNotification = await notifications.findOne({
        from: currentUser._id,
        to: friendUser._id,
        type: "friendRequest",
        read: false,
      });

      if (existingNotification) {
        response.writeHead(400, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({
            message: "Friend request already sent",
            specific: 3,
          }),
        );
        return;
      }

      const notification = {
        title: "Friend Request",
        message: `${currentUser.username} sent you a friend request`,
        from: currentUser._id,
        to: friendUser._id,
        read: false,
        type: "friendRequest",
      };

      await notifications.insertOne(notification);

      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ message: "Friend request sent" }));
    } catch (e) {
      console.error("Error in handleFriendRequestPost:", e);
      response.writeHead(400, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ message: "Invalid JSON" }));
    }
  });
}

async function handleNotificationsGet(request, response, decodedToken) {
  addCors(response, ["GET"]);
  try {
    const db = getDB();
    const notifications = db.collection("notifications");
    const username = decodedToken.username;
    const users = db.collection("users");
    const user = await users.findOne({ username });
    if (!user) {
      response.writeHead(401, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ message: "User not authenticated" }));
      return;
    }

    const allNotifications = await notifications
      .find({ to: user._id })
      .sort({ timestamp: -1 })
      .toArray();

    const filteredNotifications = allNotifications.filter((notification) => {
      return (
        notification.type === "friendRequest" ||
        notification.type === "battleRequest"
      );
    });

    response.end(JSON.stringify(filteredNotifications));
  } catch (e) {
    console.error("Error in handleNotificationsGet:", e);
    if (!response.headersSent) {
      response.writeHead(400, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({ message: "Failed to retrieve notifications" }),
      );
    }
  }
}

async function handleUnreadMessagesCount(request, response, decodedToken) {
  addCors(response, ["GET"]);

  // retrieve friendId from query parameters
  const parsedUrl = url.parse(request.url, true);
  const friendId = parsedUrl.query.friendId;

  try {
    const db = getDB();
    const messages = db.collection("messages");
    const username = decodedToken.username;
    const users = db.collection("users");
    const user = await users.findOne({ username });
    if (!user) {
      response.writeHead(401, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ message: "User not authenticated" }));
      return;
    }

    const unreadMessagesCount = await messages.countDocuments({
      from: new ObjectId(friendId),
      to: user._id,
      read: false,
    });

    response.end(JSON.stringify({ count: unreadMessagesCount }));
  } catch (e) {
    console.error("Error in handleUnreadMessagesCount:", e);
    if (!response.headersSent) {
      response.writeHead(400, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({ message: "Failed to retrieve unread messages count" }),
      );
    }
  }
}

async function handleMarkMessagesAsRead(request, response, decodedToken) {
  addCors(response, ["PUT"]);

  const parsedUrl = url.parse(request.url, true);
  const friendId = parsedUrl.query.friendId;

  try {
    const db = getDB();
    const messages = db.collection("messages");
    const username = decodedToken.username;
    const users = db.collection("users");
    const user = await users.findOne({ username });

    if (!user) {
      response.writeHead(401, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ message: "User not authenticated" }));
      return;
    }

    await messages.updateMany(
      { from: new ObjectId(friendId), to: user._id, read: false },
      { $set: { read: true } },
    );

    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ message: "Messages marked as read" }));
  } catch (e) {
    console.error("Error in handleMarkMessagesAsRead:", e);
    response.writeHead(400, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({ message: "Failed to mark messages as read" }),
    );
  }
}

async function handleNotificationDelete(request, response, decodedToken) {
  addCors(response, ["DELETE"]);

  const parsedUrl = url.parse(request.url, true);
  const notificationId = parsedUrl.pathname.split("/").pop();

  try {
    const db = getDB();
    const notifications = db.collection("notifications");
    const username = decodedToken.username;
    const users = db.collection("users");
    const user = await users.findOne({ username });

    if (!user) {
      response.writeHead(401, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ message: "User not authenticated" }));
      return;
    }

    const notification = await notifications.findOne({
      _id: new ObjectId(notificationId),
      to: user._id,
      type: "friendRequest",
    });

    if (!notification) {
      response.writeHead(404, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ message: "Notification not found" }));
      return;
    }

    await notifications.deleteOne({ _id: notification._id });

    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ message: "Friend request declined" }));
  } catch (e) {
    console.error("Error in handleNotificationDelete:", e);
    response.writeHead(400, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({ message: "Failed to decline friend request" }),
    );
  }
}

async function handleNotificationsMarkAsRead(request, response, decodedToken) {
  addCors(response, ["PUT"]);

  try {
    const db = getDB();
    const notifications = db.collection("notifications");
    const username = decodedToken.username;
    const users = db.collection("users");
    const user = await users.findOne({ username });

    if (!user) {
      response.writeHead(401, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ message: "User not authenticated" }));
      return;
    }

    await notifications.updateMany(
      { to: user._id, read: false },
      { $set: { read: true } },
    );

    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ message: "Notifications marked as read" }));
  } catch (e) {
    console.error("Error in handleNotificationsMarkAsRead:", e);
    if (!response.headersSent) {
      response.writeHead(400, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({ message: "Failed to mark notifications as read" }),
      );
    }
  }
}

async function handleFriendRequestAccept(request, response, decodedToken) {
  addCors(response, ["PUT"]);

  const parsedUrl = url.parse(request.url, true);
  const notificationId = parsedUrl.pathname.split("/").pop();

  try {
    const db = getDB();
    const users = db.collection("users");
    const notifications = db.collection("notifications");

    const notification = await notifications.findOne({
      _id: new ObjectId(notificationId),
    });

    if (!notification) {
      response.writeHead(404, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ message: "Notification not found" }));
      return;
    }

    const currentUser = await users.findOne({ _id: notification.to });
    const friendUser = await users.findOne({ _id: notification.from });

    if (!currentUser || !friendUser) {
      response.writeHead(404, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ message: "User not found" }));
      return;
    }

    await users.updateOne(
      { _id: currentUser._id },
      { $addToSet: { friends: friendUser._id } },
    );
    await users.updateOne(
      { _id: friendUser._id },
      { $addToSet: { friends: currentUser._id } },
    );

    await notifications.deleteOne({ _id: notification._id });

    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ message: "Friend request accepted" }));
  } catch (e) {
    console.error("Error in handleFriendRequestAccept:", e);
    response.writeHead(400, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({ message: "Failed to accept friend request" }),
    );
  }
}

async function handleFriendDelete(request, response, decodedToken) {
  addCors(response, ["DELETE"]);

  const parsedUrl = url.parse(request.url, true);
  const friendId = parsedUrl.pathname.split("/").pop();

  try {
    const db = getDB();
    const users = db.collection("users");

    const username = decodedToken.username;
    const user = await users.findOne({ username });

    if (!user) {
      response.writeHead(401, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ message: "User not authenticated" }));
      return;
    }

    const friend = await users.findOne({ _id: new ObjectId(friendId) });
    if (!friend) {
      response.writeHead(404, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ message: "Friend not found" }));
      return;
    }

    // Vérifier si les utilisateurs sont amis
    const userFriendsAsStrings = user.friends.map((id) => id.toString());
    const friendFriendsAsStrings = friend.friends.map((id) => id.toString());

    if (
      !userFriendsAsStrings.includes(friendId) ||
      !friendFriendsAsStrings.includes(user._id.toString())
    ) {
      response.writeHead(400, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ message: "Users are not friends" }));
      return;
    }

    // Supprimer les utilisateurs de leurs listes d'amis respectives
    await users.updateOne(
      { _id: user._id },
      { $pull: { friends: new ObjectId(friendId) } },
    );
    await users.updateOne(
      { _id: new ObjectId(friendId) },
      { $pull: { friends: user._id } },
    );

    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ message: "Friend removed successfully" }));
  } catch (e) {
    console.error("Error in handleFriendDelete:", e);
    response.writeHead(400, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ message: "Failed to remove friend" }));
  }
}

// ------------------------------ GAME HANDLING ------------------------------

async function handleGameGet(request, response, decodedToken) {
  addCors(response, ["GET"]);

  try {
    const parsedUrl = url.parse(request.url, true); // Parse the URL to get query parameters

    const id = parsedUrl.query.id; // Get the 'id' query parameter
    const multiple = parsedUrl.query.multiple === "true"; // Check if 'multiple' query parameter is set to 'true'
    const withStatus = parseInt(parsedUrl.query.withStatus);
    if (
      (withStatus && isNaN(withStatus)) ||
      (withStatus && withStatus < 0 && withStatus > 2)
    ) {
      response.writeHead(400, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({ message: "Invalid 'withStatus' query parameter" }),
      );
      return;
    }

    const username = decodedToken.username;
    const db = getDB();
    const users = db.collection("users");
    const games = db.collection("games");

    const user = await users.findOne({ username });
    if (!user) {
      response.writeHead(401, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ message: "User not authenticated" }));
      return;
    }

    let queryResult;
    if (id) {
      // Retrieve the game with the given id and where the user.username is inside the players array
      console.log("Retrieving game with id:", id);
      queryResult = await games.findOne({
        _id: new ObjectId(id),
        players: user.username,
      });
      console.log("Game found:", queryResult);
    } else if (multiple) {
      // Retrieve every game the user is an author of, sorted by date
      if (withStatus) {
        queryResult = await games
          .find({ author: user.username, status: withStatus })
          .sort({ date: -1 })
          .toArray();
      } else {
        queryResult = await games
          .find({ author: user.username })
          .sort({ date: -1 })
          .toArray();
      }
    } else {
      // Retrieve the latest game the user is an author of
      if (withStatus) {
        queryResult = await games.findOne(
          { author: user.username, status: withStatus },
          { sort: { date: -1 } },
        );
      } else {
        queryResult = await games.findOne(
          { author: user.username },
          { sort: { date: -1 } },
        );
      }
    }

    if (!queryResult || queryResult.length === 0) {
      console.log("No games found for user " + username);
      response.writeHead(404, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({ message: `No games found for user ${username}` }),
      );
      return;
    }

    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(queryResult));
  } catch (e) {
    console.error("Error in handleGameGet:", e);
    response.writeHead(400, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ message: "Failed to retrieve games" }));
  }
}

// ------------------------------ SECURITY UTILITIES ------------------------------

function getTokenFromHeaders(request) {
  const authorization = request.headers.authorization;
  if (!authorization || !authorization?.startsWith("Bearer ")) {
    return null;
  }
  return authorization.split(" ")[1];
}

function rateLimit(request, response, next) {
  const ip = request.connection.remoteAddress;
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
      console.log("Rate limit exceeded for IP:", ip);
      response.writeHead(429, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          message: "Too many requests, please try again later.",
        }),
      );
    }
  }
}

// ------------------------------ REST OF THE CODE ------------------------------

async function startServer() {
  try {
    await connectDB();
    console.log("Database connected successfully.");

    const db = getDB();
    const users = db.collection("users");
    // Set all users to inactive
    await users.updateMany({}, { $set: { activity: "inactive" } });
    console.log("All users activity reset to inactive");

    const server = http.createServer((req, res) => {
      manageRequest(req, res);
    });
    const PORT = 4200;

    server.listen(PORT, () => {
      console.log(
        `Server listening on port ${PORT} at http://localhost:${PORT}`,
      );
      console.log(`Frontend accessible at http://localhost:8000`);
    });
  } catch (error) {
    console.error("Database connection failed", error);
    process.exit(1);
  }
}

module.exports = { manageRequest };

startServer();
