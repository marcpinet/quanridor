# PS8

The code of this repo is split in 2 folders:
* api/ manages the server. It contains a server which differentiate REST requests from HTTP file requests, and so
return either files or REST responses accordingly.
* front/ contains static files that should be returned by the HTTP server mentioned earlier.

Both folders contain a README with more details.

---

## Requirements to run the project

* Node.js
* Docker

---

## First launch

1. Run `npm install`

2. Run `docker compose up` to start the backend. This will also start a MongoDB instance.

3. Open `index.html` in your browser.  

---

## All runs

Run `npm start`. That's it, unless you need other scripts to run before or while the server is launched,
but then you (probably?) know what you are doing.