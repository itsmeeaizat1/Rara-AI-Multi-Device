// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// cuki-api.js — Scraper untuk api.cuki.biz.id (Naya AI dll)
import axios from "axios";

const CUKI_BASE = "https://api.cuki.biz.id";

async function callCuki({ endpoint, prompt, ...extra } = {}) {
  try {
    const url = `${CUKI_BASE}${endpoint}`;
    const res = await axios.post(url, { prompt, ...extra }, {
      headers: { "Content-Type": "application/json" },
      timeout: 30000,
    });

    if (res.data) {
      const answer = res.data.result || res.data.data || res.data.response || res.data.answer || (typeof res.data === "string" ? res.data : null);
      if (answer) {
        return { status: true, answer, raw: res.data };
      }
    }
    return { status: false, error: res.data?.message || "No response from Cuki API" };
  } catch (err) {
    return { status: false, error: err.response?.data?.message || err.message };
  }
}

// Naya AI
async function nayaAI(prompt) {
  return callCuki({ endpoint: "/api/ai/naya", prompt });
}

// Generic Cuki AI
async function cukiAI(endpoint, prompt) {
  return callCuki({ endpoint, prompt });
}

export { callCuki, nayaAI, cukiAI };
