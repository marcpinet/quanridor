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

db.users.insertOne({ 
    username: "admin",
    password: "admin",
    admin: true
});

db.createCollection("secrets");

db.secrets.insertOne({
  name: "jwtSecret",
  value: "PS8C'ESTTROPBIEN@E&*F!p0lYt3cH"
});

// TODO: Add more more fields for statistics and other stuff