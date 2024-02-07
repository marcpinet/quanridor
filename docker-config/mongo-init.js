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
