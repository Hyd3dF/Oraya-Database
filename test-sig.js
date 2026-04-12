const crypto = require('crypto');

function createSessionTokenNode(userId) {
  const secret = process.env.DB_COOKIE_SECRET || "development-only-cookie-secret-change-me";
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(userId);
  const signature = hmac.digest("base64url");
  return `${userId}.${signature}`;
}

async function verifySessionTokenEdgeSim(token) {
  const [userId, signature] = token.split(".");
  const secret = process.env.DB_COOKIE_SECRET || "development-only-cookie-secret-change-me";
  const encoder = new TextEncoder();
  
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const expectedSigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(userId)
  );
  
  let expectedSigBase64Url = btoa(String.fromCharCode(...new Uint8Array(expectedSigBuffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
    
  return signature === expectedSigBase64Url;
}

async function run() {
  const token = createSessionTokenNode("user-123");
  console.log("Token:", token);
  const isValid = await verifySessionTokenEdgeSim(token);
  console.log("Is Valid:", isValid);
}
run();
