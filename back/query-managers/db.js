const { MongoClient } = require("mongodb");
const url = "mongodb://quanridor:ps8vella@db:27017/quanridor"; // "db" stands for the container name of mongodb defined in docker-compose.yml
const dbName = "quanridor";
const client = new MongoClient(url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let db = null;

async function connectDB() {
  await client.connect();
  db = client.db(dbName);
}

function getDB() {
  if (!db) {
    throw "Database connection is not established!";
  }
  return db;
}

module.exports = { connectDB, getDB };
