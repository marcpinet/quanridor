const jwt = require("jsonwebtoken");
const { getDB } = require("../queryManagers/db");

async function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, await getJwtSecret());
    return decoded;
  } catch (error) {
    console.error("JWT verification error:", error);
    return null;
  }
}

async function getJwtSecret() {
  try {
    const db = getDB();
    const secrets = db.collection("secrets");

    const secretDocument = await secrets.findOne({ name: "jwtSecret" });

    if (secretDocument) {
      console.log("JWT Secret:", secretDocument.value);
      return secretDocument.value;
    } else {
      console.log("Secret not found");
      return null;
    }
  } catch (e) {
    console.error("Error fetching JWT secret:", e);
    return null;
  }
}

module.exports = { verifyToken };
