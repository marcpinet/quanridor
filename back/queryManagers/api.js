const http = require('http');
const url = require('url');
const { connectDB, getDB } = require('./db');
const jwt = require('jsonwebtoken');

const apiPath = '/api';

async function manageRequest(request, response) {
    console.log(`Request URL: ${request.url}`);

    await connectDB();
    const parsedUrl = url.parse(request.url, true);
    const path = parsedUrl.pathname;
    const normalizedPath = path.endsWith('/') ? path.slice(0, -1) : path;
    if (normalizedPath === `${apiPath}/signup` && request.method === 'POST') {
        handleSignup(request, response);
    } else {
        response.statusCode = 404;
        response.end(`Endpoint ${path} not found!`);
    }
}

function handleSignup(request, response) {
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

            // Generate JWT
            const token = jwt.sign({ username }, 'secret', { expiresIn: '72h' });
            
            response.statusCode = 200;
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({ token }));
        } catch (e) {
            response.statusCode = 400;
            response.end("Invalid JSON");
        }
    });
}

const server = http.createServer(manageRequest);

server.listen(4200, () => {
    console.log('Server listening on port 4200');
});
