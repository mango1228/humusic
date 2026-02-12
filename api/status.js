const fetch = require("node-fetch");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { taskId } = req.query;
  if (!taskId) return res.status(400).json({ error: "taskId is required" });

  try {
    const API_KEY = process.env.SUNO_API_KEY;

    const response = await fetch("https://api.apiframe.pro/suno/fetch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": API_KEY
      },
      body: JSON.stringify({ task_id: taskId })
    });

    const data = await response.json();
    const status = data.status || "processing";

    if (status === "completed" || status === "done") {
      const songs = data.output || data.songs || data.clips || [];
      const song = Array.isArray(songs) ? songs[0] : songs;
      return res.status(200).json({
        status: "completed",
        song: {
          title: song?.title || "나의 노래",
          audioUrl: song?.audio_url || song?.song_url || "",
          imageUrl: song?.image_url || "",
          lyrics: song?.lyrics || "",
          duration: song?.duration || 0
        }
      });
    } else if (status === "failed" || status === "error") {
      return res.status(200).json({ status: "failed", error: data.error || "Generation failed" });
    }

    return res.status(200).json({ status: "processing", progress: data.progress || 0 });

  } catch (error) {
    return res.status(500).json({ error: "Status check failed", details: error.message });
  }
};
