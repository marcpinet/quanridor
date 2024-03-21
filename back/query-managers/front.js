// url will be used to parse the url (captain obvious at your service).
const url = require("url");
// fs stands for FileSystem, it's the module to use to manipulate files on the disk.
const fs = require("fs");
// path is used only for its parse method, which creates an object containing useful information about the path.
const path = require("path");

// We will limit the search of files in the front folder (../../front from here).
// Note that fs methods consider the current folder to be the one where the app is run, that's why we don't need the "../.." before front.
const baseFrontPath = path.join(__dirname, "../../front");
// If the user requests a directory, a file can be returned by default.
const defaultFileIfFolder = "index.html";

/* Dict associating files' extension to a MIME type browsers understand. The reason why this is needed is that only
 ** the file's content is sent to the browser, so it cannot know for sure what kind of file it was to begin with,
 ** and so how to interpret it. To help, we will send the type of file in addition to its content.
 ** Note that the list is not exhaustive, you may need it to add some other MIME types (google is your friend). */
const mimeTypes = {
  ".ico": "image/x-icon",
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".md": "text/plain",
  ".ico": "image/x-icon",
  default: "application/octet-stream",
};

// Main method, exported at the end of the file. It's the one that will be called when a file is requested.
function manageRequest(request, response) {
  const parsedUrl = url.parse(request.url);
  // Construire le chemin vers la ressource demandée
  let pathName = path.join(baseFrontPath, parsedUrl.pathname);

  // Check if the request is for the favicon
  if (parsedUrl.pathname === "/favicon.ico") {
    pathName = path.join(__dirname, "../..", "favicon.ico");
  }

  fs.stat(pathName, function (err, stats) {
    if (err) {
      send404(pathName, response);
      return;
    }

    if (stats.isDirectory()) {
      // Si c'est un dossier, servir index.html de ce dossier
      pathName = path.join(pathName, defaultFileIfFolder);
    }

    fs.readFile(pathName, function (error, data) {
      if (error) {
        send404(pathName, response);
        return;
      }

      const extension = path.extname(pathName);
      response.setHeader(
        "Content-type",
        mimeTypes[extension] || mimeTypes.default,
      );
      response.end(data);
    });
  });
}

function send404(path, response) {
  // Note that you can create a beautiful html page and return that page instead of the simple message below.
  response.statusCode = 404;
  response.end(`File ${path} not found!`);
}

module.exports = { manageRequest };
