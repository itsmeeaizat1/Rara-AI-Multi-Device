// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// blackbox-api.js — Scraper untuk Blackbox AI (free, no API key)
import axios from "axios";

async function blackboxAI(prompt, options = {}) {
  try {
    const { model = "blackbox", systemPrompt = "" } = options;

    // Blackbox API endpoint (free tier)
    const res = await axios.post(
      "https://www.blackbox.ai/api/chat",
      {
        messages: [
          ...(systemPrompt
            ? [{ role: "system", content: systemPrompt }]
            : []),
          { role: "user", content: prompt },
        ],
        model: model,
        max_tokens: 2000,
        temperature: 0.7,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10)",
        },
        timeout: 30000,
      }
    );

    const answer =
      res.data?.choices?.[0]?.message?.content ||
      res.data?.response ||
      res.data?.answer ||
      res.data?.data;

    if (answer) {
      return { status: true, answer, model };
    }
    return { status: false, error: "Blackbox tidak memberikan respons" };
  } catch (err) {
    // Fallback: pakai endpoint alternatif
    try {
      const res = await axios.get(
        `https://api.blackbox.ai/api?prompt=${encodeURIComponent(prompt)}`,
        { timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" } }
      );
      const answer = res.data?.response || res.data?.answer || res.data?.data;
      if (answer) return { status: true, answer, model: "blackbox" };
      return { status: false, error: "Blackbox API down" };
    } catch (e2) {
      return { status: false, error: err.message };
    }
  }
}

export { blackboxAI };
