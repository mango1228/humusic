const fetch = require("node-fetch");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { genre, mood, audioData } = req.body;

    const genreMap = {
      pop: "pop", rnb: "R&B soul", hiphop: "hip-hop rap",
      ballad: "Korean ballad", rock: "rock", jazz: "jazz",
      electronic: "electronic EDM", indie: "indie alternative"
    };
    const moodMap = {
      chill: "relaxing chill", energetic: "upbeat energetic",
      melancholy: "emotional melancholic", romantic: "romantic love",
      epic: "epic cinematic", dreamy: "dreamy ethereal"
    };

    const prompt = (genreMap[genre] || genre) + ", " + (moodMap[mood] || mood) + ", modern production, full song with vocals and lyrics in Korean";

    const API_KEY = process.env.SUNO_API_KEY;

    const response = await fetch("https://api.apiframe.pro/suno/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": API_KEY
      },
      body: JSON.stringify({
        prompt: prompt,
        make_instrumental: false,
        wait_audio: false
      })
    });

    const data = await response.json();
    return res.status(200).json({ success: true, taskId: data.task_id || data.id, raw: data });

  } catch (error) {
    return res.status(500).json({ error: "Generation failed", details: error.message });
  }
};
