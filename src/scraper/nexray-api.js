// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// nexray-api.js — Scraper untuk api.nexray.web.id (multiple AI endpoints)
import axios from "axios";

const NEXRAY_BASE = "https://api.nexray.web.id";

async function callNexray({ endpoint, prompt, ...extra } = {}) {
  try {
    const url = `${NEXRAY_BASE}${endpoint}`;
    const res = await axios.post(url, { prompt, ...extra }, {
      headers: { "Content-Type": "application/json" },
      timeout: 30000,
    });

    if (res.data?.status || res.data?.result) {
      return {
        status: true,
        answer: res.data.result || res.data.data || res.data.response || res.data.answer || String(res.data),
        raw: res.data,
      };
    }
    return { status: false, error: res.data?.message || "No response from Nexray API" };
  } catch (err) {
    return { status: false, error: err.response?.data?.message || err.message };
  }
}

// AI4Chat
async function ai4chat(prompt) {
  return callNexray({ endpoint: "/api/ai/ai4chat", prompt });
}

// AI Math solver
async function aimath(prompt) {
  return callNexray({ endpoint: "/api/ai/aimath", prompt });
}

// Character AI
async function characterAI(prompt, character = "") {
  return callNexray({ endpoint: "/api/ai/character-ai", prompt, character });
}

// Aoyo AI
async function aoyo(prompt) {
  return callNexray({ endpoint: "/api/ai/aoyo", prompt });
}

// PowerBrain AI
async function powerbrain(prompt) {
  return callNexray({ endpoint: "/api/ai/powerbrain", prompt });
}

// AlyaMind AI
async function alyamind(prompt) {
  return callNexray({ endpoint: "/api/ai/alyamind", prompt });
}

export { callNexray, ai4chat, aimath, characterAI, aoyo, powerbrain, alyamind };
