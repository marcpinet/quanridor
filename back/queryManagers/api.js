const http = require('http');
const url = require('url');

// API Path
const apiPath = '/api';

// Mock database for storing user data
let users = {};

function manageRequest(request, response) {
    const parsedUrl = url.parse(request.url, true);
    const path = parsedUrl.pathname;
    
    // Check if it's the signup endpoint
    if (path === `${apiPath}/signup` && request.method === 'POST') {
        handleSignup(request, response);
    } else {
        response.statusCode = 404;
        response.end(`Endpoint ${path} not found!`);
    }
}

function handleSignup(request, response) {
    let body = '';
    request.on('data', chunk => {
        body += chunk.toString(); // convert Buffer to string
    });
    request.on('end', () => {
        try {
            const user = JSON.parse(body);
            // Basic validation
            if (!user.mail || !user.username || !user.password) {
                response.statusCode = 400;
                response.end("Missing fields in user data");
                return;
            }
            // Store user data (replace with database logic in a real app)
            users[user.username] = user;
            response.statusCode = 200;
            response.end(`User ${user.username} registered successfully`);
        } catch (e) {
            response.statusCode = 400;
            response.end("Invalid JSON");
        }
    });
}

exports.manage = manageRequest;
