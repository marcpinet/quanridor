// IMPORTANT NOTE :
// When modifying this file, delete and recreate the docker container and image to apply the changes

db.createUser({
  user: "quanridor",
  pwd: "ps8vella",
  roles: [
    {
      role: "dbOwner",
      db: "quanridor",
    },
  ],
});

db.createCollection("users");
db.users.createIndex({ username: 1 }, { unique: true });

db.users.insertOne({
  username: "admin",
  password: "$2b$10$n9CCIS8IkSm7NQgUrfn3f.gNElHGHN3HwVJUKkphnLF1jHo1viVC2",
  admin: true,
  elo: 800,
  friends: [], // Friends list containing ObjectIds
});

db.createCollection("secrets");

db.secrets.insertOne({
  name: "jwtSecret",
  value: "PS8C'ESTTROPBIEN@E&*F!p0lYt3cH",
});

db.createCollection("games");

db.games.insertOne({
  // Example of a game
  author: "admin",
  players: ["admin", "AI0"], // Players [player1, player2] where playerx is a username (ai1, ai2 and ai3 are different levels of AI)
  p1walls: 10, // Number of walls of player 1
  p2walls: 10, // Number of walls of player 2
  vwalls: [], // Vertical walls of each player [vw1, vw2, vw3] where vwx is a coordinate
  hwalls: [], // Horizontal walls of each player [hw1, hw2, hw3] where hwx is a coordinate
  turn: 0, // Turn number (can be used to know which player is playing by doing turn % players.length)
  playerspositions: [
    [4, 8],
    [4, 0],
  ], // Players positions [[x1, y1], [x2, y2]] where x and y are coordinates
  status: 1, // Status 0 = waiting for players, 1 = in progress, 2 = finished
  date: new Date(), // Creation date
  winner: null,
  difficulty: 0, // Difficulty of the AI (null if it's a game against a player, 0 = easy, 1 = medium, 2 = hard)
});

db.createCollection("messages");

db.messages.insertOne({
  // Example of a message
  content: "Hello world!",
  from: null, // Will be an object ID
  to: null, // Will be an object ID
  date: new Date(),
});

// TODO: Add more more fields for statistics and other stuff
