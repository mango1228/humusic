const { put } = require("@vercel/blob");
const { verifyUser } = require("./_auth");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const user = await verifyUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { audioBase64 } = req.body;
    if (!audioBase64) return res.status(400).json({ error: "audioBase64 is required" });

    // Check size: base64 string ~= 1.33x raw size, Vercel limit 4.5MB
    if (audioBase64.length > 3500000) {
      return res.status(413).json({ error: "Audio file too large. Please record a shorter clip (under 25 seconds)." });
    }

    const audioBuffer = Buffer.from(audioBase64, "base64");

    const blob = await put("humming-" + Date.now() + ".wav", audioBuffer, {
      access: "public",
      contentType: "audio/wav"
    });

    return res.status(200).json({
      success: true,
      blobUrl: blob.url
    });

  } catch (error) {
    return res.status(500).json({ error: "Upload failed", details: error.message });
  }
};
