const fetch = require("node-fetch");

const SUPABASE_URL = "https://xjuzejvrzhzwjcwcmgmv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqdXplanZyemh6d2pjd2NtZ212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MzkyOTcsImV4cCI6MjA4NjUxNTI5N30.cMJGmuIZ7_LsBvHcmqxOmkWoPx1jCrAp4_W4CYg8_uE";

async function verifyUser(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return null;

  try {
    const res = await fetch(SUPABASE_URL + "/auth/v1/user", {
      headers: {
        "Authorization": "Bearer " + token,
        "apikey": SUPABASE_KEY
      }
    });
    if (!res.ok) return null;
    const user = await res.json();
    return user && user.id ? user : null;
  } catch (e) {
    return null;
  }
}

module.exports = { verifyUser };
