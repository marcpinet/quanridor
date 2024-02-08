const http = require('http');
const url = require('url');
const { connectDB, getDB } = require('./db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const apiPath = '/api';

const saltRounds = 10;

// ------------------------------ CORE HANDLING ------------------------------

function addCors(response, methods = ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE']) {
    response.setHeader('Access-Control-Allow-Origin', '*'); // Adjust this as necessary
    response.setHeader('Access-Control-Allow-Methods', methods.join(', '));
    response.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    response.setHeader('Access-Control-Allow-Credentials', 'true');
}

async function manageRequest(request, response) {
    console.log(`Request URL: ${request.url}`);

    addCors(response);

    if (request.method === 'OPTIONS') {
        response.statusCode = 204;
        response.end();
        return;
    }

    await connectDB();
    const parsedUrl = url.parse(request.url, true);
    const path = parsedUrl.pathname;
    const normalizedPath = path.endsWith('/') ? path.slice(0, -1) : path;

    const token = getTokenFromHeaders(request);

    if(!token) {
        if (normalizedPath === `${apiPath}/signup` && request.method === 'POST') {
            handleSignup(request, response);
        }
        else if (normalizedPath === `${apiPath}/login` && request.method === 'POST') {
            handleLogin(request, response);
        }
        else {
            response.statusCode = 404;
            response.end(`Endpoint ${path} not found`);
        }
    }
    else {

        const decodedToken = await verifyToken(token);
        if (!decodedToken) {
            response.statusCode = 403;
            response.end("Invalid token (maybe expired?)");
            return;
        }

        if (normalizedPath === `${apiPath}/game` && request.method === 'GET') {
            handleGameGet(request, response, decodedToken);
        }
        else if (normalizedPath === `${apiPath}/game` && request.method === 'POST') {
            handleGamePost(request, response, decodedToken);
        }
        else {
            response.statusCode = 404;
            response.end(`Endpoint ${path} not found`);
        }

    }
}

// ------------------------------ SIGN UP ------------------------------

async function handleSignup(request, response) {
    addCors(response, ['POST']);
    let body = '';
    request.on('data', chunk => {
        body += chunk.toString();
    });
    request.on('end', async () => {
        try {
            let { username, password } = JSON.parse(body);
            username = username.toLowerCase();

            const db = getDB();
            const users = db.collection('users');
            
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
            const token = jwt.sign({ username }, secret, { expiresIn: '72h' });
            
            response.statusCode = 200;
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({ token }));
        } catch (e) {
            response.statusCode = 400;
            response.end("Invalid JSON");
        }
    });
}

// ------------------------------ SIGN IN ------------------------------

async function handleLogin(request, response) {
    addCors(response, ['POST']);
    let body = '';
    request.on('data', chunk => {
        body += chunk.toString();
    });
    request.on('end', async () => {
        try {
            let { username, password } = JSON.parse(body);
            username = username.toLowerCase();

            const db = getDB();
            const users = db.collection('users');
            
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
            const token = jwt.sign({ username }, secret, { expiresIn: '72h' });
            
            response.statusCode = 200;
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({ token }));
        } catch (e) {
            response.statusCode = 400;
            response.end("Invalid JSON");
        }
    });
}

// ------------------------------ GAME HANDLING ------------------------------

async function handleGameGet(request, response, decodedToken) {
    addCors(response, ['GET']);
    
    try {
        const parsedUrl = url.parse(request.url, true); // Parse the URL to get query parameters
        const multiple = parsedUrl.query.multiple === 'true'; // Check if 'multiple' query parameter is set to 'true'

        const username = decodedToken.username;
        const db = getDB();
        const users = db.collection('users');
        const games = db.collection('games');
        
        const user = await users.findOne({ username });
        if (!user) {
            response.statusCode = 401;
            response.end("User not authenticated");
            return;
        }

        let queryResult;
        if (multiple) {
            // Retrieve every game the user is an author of, sorted by date
            queryResult = await games.find({ author: user._id }).sort({ created: -1 }).toArray();
        } else {
            // Retrieve the latest game the user is an author of
            queryResult = await games.findOne({ author: user._id }, { sort: { created: -1 } });
        }

        if (!queryResult || queryResult.length === 0) {
            response.statusCode = 404;
            response.end("No games found for user");
            return;
        }

        response.statusCode = 200;
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify(queryResult));
    } catch (e) {
        console.error("Error in handleGameGet:", e);
        response.statusCode = 400;
        response.end("Failed to retrieve game state");
    }
}

async function handleGamePost(request, response, decodedToken) {
    addCors(response, ['POST']);
    
    let body = '';
    request.on('data', chunk => {
        body += chunk.toString();
    });
    request.on('end', async () => {
        try {
            const gameData = JSON.parse(body);
            const username = decodedToken.username;
            const db = getDB();
            const users = db.collection('users');
            const games = db.collection('games');
            
            const user = await users.findOne({ username });
            if (!user) {
                response.statusCode = 401;
                response.end("User not found");
                return;
            }
            
            const existingGame = await games.findOne({ author: user._id });
            
            if (existingGame) {
                await games.updateOne({ _id: existingGame._id }, { $set: gameData });
            } else {
                gameData.author = user._id;
                await games.insertOne(gameData);
            }
            
            response.statusCode = 200;
            response.end(JSON.stringify({ message: "Game saved successfully" }));
        } catch (e) {
            response.statusCode = 400;
            response.end("Failed to save game state");
        }
    });
}

// ------------------------------ SECURITY UTILITIES ------------------------------

function getTokenFromHeaders(request) {
    const authorization = request.headers.authorization;
    if (!authorization || !authorization?.startsWith('Bearer ')) {
        return null;
    }
    return authorization.split(' ')[1];
}

async function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, await getJwtSecret());
        return decoded;
    } catch (error) {
        console.error('JWT verification error:', error);
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
    console.log('Server listening on port 4200 at http://localhost:4200/');
});
