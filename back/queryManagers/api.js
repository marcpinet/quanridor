const http = require("http");
const url = require("url");
const { connectDB, getDB } = require("./db");
const { ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const { initializeGame } = require("./game-initializer");

const apiPath = "/api";

const saltRounds = 10;

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

  await connectDB();
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
      response.statusCode = 404;
      response.end(`You need to be authenticated to access this endpoint`);
    }
  } else {
    const decodedToken = await verifyToken(token);
    if (!decodedToken) {
      response.statusCode = 403;
      response.end("Invalid token (maybe expired?)");
      return;
    }

    if (normalizedPath === `${apiPath}/game` && request.method === "GET") {
      handleGameGet(request, response, decodedToken);
    } else if (
      normalizedPath === `${apiPath}/game` &&
      request.method === "POST"
    ) {
      handleGamePost(request, response, decodedToken);
    } else if (
      normalizedPath === `${apiPath}/game` &&
      request.method === "PATCH"
    ) {
      handleGamePatch(request, response, decodedToken);
    } else {
      response.statusCode = 404;
      response.end(`Endpoint ${path} not found`);
    }
  }
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

      // If username is the form of "ai" + any number after, return an error
      if (username.match(/^ai\d+$/)) {
        response.statusCode = 400;
        response.end("Username cannot be in the form of 'AI' + number");
        return;
      }

      const db = getDB();
      const users = db.collection("users");

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await users.findOne({ username });
      if (existingUser) {
        response.statusCode = 409;
        response.end("Username already exists");
        return;
      }

      // Hacher le mot de passe
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Créer l'utilisateur avec le mot de passe haché
      await users.insertOne({ username, password: hashedPassword });

      // Get secret from secrets collection in MongoDB where the field "jwt" is the secret
      let secret = await getJwtSecret();

      // Generate JWT
      const token = jwt.sign({ username }, secret, { expiresIn: "72h" });

      response.statusCode = 200;
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ token }));
    } catch (e) {
      response.statusCode = 400;
      response.end("Invalid JSON");
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
        response.statusCode = 401;
        response.end("User not found");
        return;
      }

      // Vérifier si le mot de passe est correct
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        response.statusCode = 401;
        response.end("Invalid password");
        return;
      }

      // Get secret from secrets collection in MongoDB where the field "jwt" is the secret
      let secret = await getJwtSecret();

      // Generate JWT
      const token = jwt.sign({ username }, secret, { expiresIn: "72h" });

      response.statusCode = 200;
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ token }));
    } catch (e) {
      response.statusCode = 400;
      response.end("Invalid JSON");
    }
  });
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
      response.statusCode = 400;
      response.end("Invalid 'withStatus' query parameter");
      return;
    }

    const username = decodedToken.username;
    const db = getDB();
    const users = db.collection("users");
    const games = db.collection("games");

    const user = await users.findOne({ username });
    if (!user) {
      response.statusCode = 401;
      response.end("User not authenticated");
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
      response.statusCode = 404;
      response.end("No games found for user");
      return;
    }

    response.statusCode = 200;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(queryResult));
  } catch (e) {
    console.error("Error in handleGameGet:", e);
    response.statusCode = 400;
    response.end("Failed to retrieve game state");
  }
}

async function handleGamePost(request, response, decodedToken) {
  addCors(response, ["POST"]);

  let body = "";
  request.on("data", (chunk) => {
    body += chunk.toString();
  });

  request.on("end", async () => {
    try {
      const gameData = JSON.parse(body);

      console.log("Initializing game with data:", gameData);

      const username = decodedToken.username;
      const db = getDB();
      const users = db.collection("users");
      const games = db.collection("games");

      const user = await users.findOne({ username });
      if (!user) {
        console.log("User not found");
        response.statusCode = 401;
        response.end("User not found");
        return;
      }

      const game = initializeGame();
      if (!isNaN(gameData.difficulty)) {
        console.log("AI game");
        game.difficulty = gameData.difficulty;
        game.author = user.username;
        game.players = [user.username, `AI${gameData.difficulty}`];
      } else {
        console.log("Multiplayer game");
        game.author = user.username;
        game.players = [user.username, gameData.otherPlayer]; // TODO: Check if the other player exists when multiplayer is implemented
      }

      // TODO: Handle the case where the player can choose its color when against AI, and if multi then shuffle the colors

      const result = await games.insertOne(game);

      if (!result.insertedId) {
        console.error("Failed to initialize game");
        response.statusCode = 400;
        response.end("Failed to initialize game");
        return;
      }

      response.statusCode = 200;
      console.log("Game initialized:", result.insertedId);
      response.end(JSON.stringify({ id: result.insertedId }));
    } catch (e) {
      console.error("Error initializing game:", e);
      response.statusCode = 400;
      response.end("Failed to initialize game");
    }
  });
}

async function handleGamePatch(request, response, decodedToken) {
  addCors(response, ["PATCH"]);

  let body = "";
  request.on("data", (chunk) => {
    body += chunk.toString();
  });

  request.on("end", async () => {
    try {
      const gameData = JSON.parse(body);
      const username = decodedToken.username;
      const db = getDB();
      const users = db.collection("users");
      const games = db.collection("games");

      const user = await users.findOne({ username });
      if (!user) {
        response.statusCode = 401;
        response.end("User not found");
        return;
      }

      // Retrieve the game id from the body using gameData._id
      let res = await games.updateOne(
        { _id: gameData._id },
        { $set: gameData },
      );

      if (!res.upsertedId) {
        response.statusCode = 400;
        response.end("Failed to update game state");
      }

      response.statusCode = 200;
      response.end(JSON.stringify({ message: "Game updated successfully" }));
    } catch (e) {
      response.statusCode = 400;
      response.end("Failed to update game state");
    }
  });
}

// ------------------------------ SECURITY UTILITIES ------------------------------

function getTokenFromHeaders(request) {
  const authorization = request.headers.authorization;
  if (!authorization || !authorization?.startsWith("Bearer ")) {
    return null;
  }
  return authorization.split(" ")[1];
}

async function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, await getJwtSecret());
    return decoded;
  } catch (error) {
    console.error("JWT verification error:", error);
    return null;
  }
}

// ------------------------------ RANDOM QUERIES TO MONGO ------------------------------

async function getJwtSecret() {
  try {
    const db = getDB();
    const secrets = db.collection("secrets");

    const secretDocument = await secrets.findOne({ name: "jwtSecret" });

    if (secretDocument) {
      console.log("JWT Secret:", secretDocument.value);
      return secretDocument.value;
    } else {
      console.log("Secret not found");
      return null;
    }
  } catch (e) {
    console.error("Error fetching JWT secret:", e);
    return null;
  }
}

// ------------------------------ REST OF THE CODE ------------------------------

const server = http.createServer(manageRequest);

server.listen(4200, () => {
  console.log("Server listening on port 4200 at http://localhost:4200/");
  console.log("Frontend accessible at http://localhost:8000/");
});
