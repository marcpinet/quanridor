// IMPORTANT NOTE :
// When modifying this file, delete and recreate the docker container and image to apply the changes

db.createUser({
  user: "quanridor",
  pwd: "ps8vella",
  roles: [
    {
      role: "readWrite",
      db: "quanridor",
    },
  ],
});

db.createCollection("users");
db.users.createIndex({ username: 1 }, { unique: true });

db.users.insertOne({ 
    username: "admin",
    password: "$2b$10$n9CCIS8IkSm7NQgUrfn3f.gNElHGHN3HwVJUKkphnLF1jHo1viVC2",
    admin: true
});

db.createCollection("secrets");

db.secrets.insertOne({
  name: "jwtSecret",
  value: "PS8C'ESTTROPBIEN@E&*F!p0lYt3cH"
});

db.createCollection("games");

db.games.insertOne({  // Example of a game (null is for ObjectID representing a player) (status 0 = waiting for players, 1 = in progress, 2 = finished)
  author: null,
  players: [],
  vwalls: [],
  hwalls: [],
  turn: 0,
  playerspositions: [],
  status: 2,
  created: new Date(),
  winner: null
});


// TODO: Add more more fields for statistics and other stuff