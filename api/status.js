const fetch = require("node-fetch");
const { verifyUser } = require("./_auth");

async function generateTitle(lyrics, tags) {
  const key = (process.env.GEMINI_API_KEY || "").trim();
  if (!key) return null;
  const input = (lyrics || "").slice(0, 500) + (tags ? "\n장르: " + tags : "");
  if (!input.trim()) return null;
  try {
    const r = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + key,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "다음 노래의 가사와 장르를 보고 감성적이고 짧은 한국어 노래 제목을 하나만 지어줘. 제목만 출력해. 따옴표나 부가 설명 없이 제목 텍스트만.\n\n" + input }] }],
          generationConfig: { maxOutputTokens: 30, temperature: 0.9 }
        })
      }
    );
    const d = await r.json();
    const text = d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts && d.candidates[0].content.parts[0] && d.candidates[0].content.parts[0].text;
    if (text) return text.replace(/["""'''\n]/g, "").trim().slice(0, 50);
  } catch (e) { /* ignore */ }
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await verifyUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { taskId } = req.query;
  if (!taskId) return res.status(400).json({ error: "taskId is required" });

  try {
    const API_KEY = (process.env.SUNO_V2_API_KEY || "").trim();

    const response = await fetch("https://api.sunoapi.org/api/v1/generate/record-info?taskId=" + taskId, {
      method: "GET",
      headers: {
        "Authorization": "Bearer " + API_KEY
      }
    });

    const data = await response.json();

    if (data.code !== 200 || !data.data) {
      return res.status(200).json({ status: "processing", progress: 0 });
    }

    const record = data.data;
    const status = record.status;

    if (status === "SUCCESS") {
      // sunoData is inside record.response.sunoData
      const sunoData = (record.response && record.response.sunoData) || record.sunoData || [];
      const song = sunoData[0];

      // Fetch actual lyrics from timestamped lyrics endpoint
      var lyrics = "";
      if (song && song.id) {
        try {
          const lyricsResponse = await fetch("https://api.sunoapi.org/api/v1/generate/get-timestamped-lyrics", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + API_KEY
            },
            body: JSON.stringify({
              taskId: taskId,
              audioId: song.id
            })
          });
          const lyricsData = await lyricsResponse.json();
          console.log("[LYRICS API] Response:", JSON.stringify(lyricsData, null, 2));

          if (lyricsData.code === 200 && lyricsData.data && lyricsData.data.alignedWords) {
            console.log("[LYRICS API] Aligned words count:", lyricsData.data.alignedWords.length);
            // Reconstruct lyrics from aligned words
            lyrics = lyricsData.data.alignedWords
              .map(function(w) { return w.word; })
              .join("")
              .replace(/\n{3,}/g, "\n\n")
              .trim();
            console.log("[LYRICS API] Extracted lyrics:", lyrics);
          } else {
            console.log("[LYRICS API] No aligned words found, lyricsData:", lyricsData);
          }
        } catch (e) {
          console.log("[LYRICS API] Error:", e.message);
          // Fallback to prompt field if lyrics fetch fails
          lyrics = song.prompt || "";
        }
      }
      // If timestamped lyrics are empty, fallback to prompt
      if (!lyrics && song) {
        console.log("[LYRICS API] Using fallback prompt:", song.prompt);
        lyrics = song.prompt || "";
      }

      // AI 제목 생성
      var title = song ? song.title : "";
      if (!title || title === "나의 노래") {
        var aiTitle = await generateTitle(lyrics, song ? song.tags : "");
        if (aiTitle) title = aiTitle;
        else title = "나의 노래";
      }

      return res.status(200).json({
        status: "completed",
        song: {
          title: title,
          audioUrl: song ? (song.audioUrl || song.sourceAudioUrl || "") : "",
          imageUrl: song ? (song.imageUrl || song.sourceImageUrl || "") : "",
          lyrics: lyrics,
          tags: song ? (song.tags || "") : "",
          duration: song ? (song.duration || 0) : 0
        }
      });
    }

    if (status === "CREATE_TASK_FAILED" || status === "GENERATE_AUDIO_FAILED" || status === "SENSITIVE_WORD_ERROR") {
      return res.status(200).json({
        status: "failed",
        error: record.errorMessage || "Generation failed"
      });
    }

    // PENDING, TEXT_SUCCESS, FIRST_SUCCESS = in progress
    var progress = 0;
    if (status === "PENDING") progress = 10;
    else if (status === "TEXT_SUCCESS") progress = 40;
    else if (status === "FIRST_SUCCESS") progress = 70;

    return res.status(200).json({ status: "processing", progress: progress });

  } catch (error) {
    return res.status(500).json({ error: "Status check failed", details: error.message });
  }
};
