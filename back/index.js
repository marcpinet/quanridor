// The http module contains methods to handle http queries.
const http = require("http");
// Let's import our logic.
const fileQuery = require("./query-managers/front.js");
const apiQuery = require("./query-managers/api.js");
const createSocketGame = require("./game/socket.js");
const createSocketSocial = require("./social/social.js");
const { Server } = require("socket.io");

/* The http module contains a createServer function, which takes one argument, which is the function that
 ** will be called whenever a new request arrives to the server.
 */
const server = http.createServer(function (request, response) {
  // First, let's check the URL to see if it's a REST request or a file request.
  // We will remove all cases of "../" in the url for security purposes.
  let filePath = request.url.split("/").filter(function (elem) {
    return elem !== "..";
  });

  try {
    // If the URL starts by /api, then it's a REST request (you can change that if you want).
    if (filePath[1] === "api") {
      apiQuery.manageRequest(request, response);
      // If it doesn't start by /api, then it's a request for a file.
    } else {
      fileQuery.manageRequest(request, response);
    }
  } catch (error) {
    console.log(`error while processing ${request.url}: ${error}`);
    response.statusCode = 400;
    response.end(`Something in your request (${request.url}) is strange...`);
  }
  // For the server to be listening to request, it needs a port, which is set thanks to the listen function.
});

// We need to create a socket server to handle real-time communication.
const io = new Server(server);
createSocketGame(io);
// For social
createSocketSocial(io);

server.listen(8000, () => {
  console.log("Server is running on port 8000");
});
