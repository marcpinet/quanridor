const http = require('http');
const url = require('url');
const { connectDB, getDB } = require('./db');
const jwt = require('jsonwebtoken');

const apiPath = '/api';

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
    if (normalizedPath === `${apiPath}/signup` && request.method === 'POST') {
        handleSignup(request, response);
    }
    else if (normalizedPath === `${apiPath}/login` && request.method === 'POST') {
        handleLogin(request, response);
    }
    else {
        response.statusCode = 404;
        response.end(`Endpoint ${path} not found!`);
    }
}

// ------------------------------ SIGN UP ------------------------------

function handleSignup(request, response) {
    addCors(response, ['POST']);
    let body = '';
    request.on('data', chunk => {
        body += chunk.toString();
    });
    request.on('end', async () => {
        console.log(body);
        try {
            const { username, password } = JSON.parse(body);
            const db = getDB();
            const users = db.collection('users');
            
            // Check if user already exists
            const existingUser = await users.findOne({ username });
            if (existingUser) {
                response.statusCode = 409;
                response.end("Username already exists");
                return;
            }

            // Create user
            await users.insertOne({ username, password });

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

function handleLogin(request, response) {
    addCors(response, ['POST']);
    let body = '';
    request.on('data', chunk => {
        body += chunk.toString();
    });
    request.on('end', async () => {
        console.log(body);
        try {
            let { username, password } = JSON.parse(body);
            const db = getDB();
            const users = db.collection('users');

            username = username.toLowerCase();
            
            // Check if user exists
            const user = await users.findOne({ username });
            if (!user) {
                response.statusCode = 401;
                response.end("User not found");
                return;
            }

            // Check if password is correct
            if (user.password !== password) {
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
