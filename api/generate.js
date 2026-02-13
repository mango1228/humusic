const fetch = require("node-fetch");
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
    const { audioUrl, duration, instrumental, prompt } = req.body;

    console.log("[GENERATE] Request body:", { audioUrl, duration, instrumental, prompt });

    if (!audioUrl) {
      return res.status(400).json({ success: false, error: "audioUrl is required" });
    }

    const API_KEY = (process.env.SUNO_V2_API_KEY || "").trim();

    const hasPrompt = prompt && prompt.trim().length > 0;

    const requestBody = {
      uploadUrl: audioUrl,
      defaultParamFlag: true, // Always use custom mode to ensure lyrics generation
      callBackUrl: "https://humusic.vercel.app/api/callback",
      model: "V4_5",
      instrumental: !!instrumental,
      continueAt: Math.max(1, Math.floor(duration || 10))
    };

    // Add prompt - include lyrics instruction for vocal mode
    if (!instrumental) {
      // Vocal mode: explicitly request lyrics
      const basePrompt = hasPrompt ? prompt.trim() : "";
      requestBody.prompt = basePrompt ? `${basePrompt}, 가사를 포함한 노래` : "가사를 포함한 노래";
    } else if (hasPrompt) {
      // Instrumental mode with custom prompt
      requestBody.prompt = prompt.trim();
    }

    console.log("[GENERATE] Sending to Suno:", JSON.stringify(requestBody, null, 2));

    const response = await fetch("https://api.sunoapi.org/api/v1/generate/upload-extend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + API_KEY
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    console.log("[GENERATE] Suno response:", JSON.stringify(data, null, 2));

    if (data.code === 200 && data.data && data.data.taskId) {
      console.log("[GENERATE] Success! TaskId:", data.data.taskId);
      return res.status(200).json({ success: true, taskId: data.data.taskId });
    } else {
      console.log("[GENERATE] Failed:", data.msg, "Code:", data.code);
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
