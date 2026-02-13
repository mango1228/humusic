const fetch = require("node-fetch");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { audioUrl, duration } = req.body;

    if (!audioUrl) {
      return res.status(400).json({ success: false, error: "audioUrl is required" });
    }

    const API_KEY = (process.env.SUNO_V2_API_KEY || "").trim();

    const response = await fetch("https://api.sunoapi.org/api/v1/generate/upload-extend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + API_KEY
      },
      body: JSON.stringify({
        uploadUrl: audioUrl,
        defaultParamFlag: false,
        callBackUrl: "https://humusic.vercel.app/api/callback",
        model: "V4_5",
        continueAt: Math.max(1, Math.floor(duration || 10))
      })
    });

    const data = await response.json();

    if (data.code === 200 && data.data && data.data.taskId) {
      return res.status(200).json({ success: true, taskId: data.data.taskId });
    } else {
      return res.status(200).json({
        success: false,
        error: data.msg || "API error",
        code: data.code
      });
    }

  } catch (error) {
    return res.status(500).json({ error: "Generation failed", details: error.message });
  }
};
