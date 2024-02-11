const jwt = require("jsonwebtoken");

async function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, await getJwtSecret());
    return decoded;
  } catch (error) {
    console.error("JWT verification error:", error);
    return null;
  }
}

module.exports = { verifyToken };
