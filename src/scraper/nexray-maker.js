// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nexray-maker.js — Scraper untuk nexray maker & tools endpoints
import axios from "axios";

const BASE = "https://api.nexray.web.id";
const HEADERS = { "User-Agent": "Mozilla/5.0" };

async function nexrayBrat(text) {
  try {
    const { data } = await axios.get(`${BASE}/maker/brat?text=${encodeURIComponent(text)}`, {
      responseType: "arraybuffer", timeout: 30000, headers: HEADERS,
    });
    return { status: true, buffer: Buffer.from(data) };
  } catch (err) {
    return { status: false, message: err.message };
  }
}

async function nexrayNulis(text) {
  try {
    const { data } = await axios.get(`${BASE}/maker/nulis?text=${encodeURIComponent(text)}`, {
      responseType: "arraybuffer", timeout: 30000, headers: HEADERS,
    });
    return { status: true, buffer: Buffer.from(data) };
  } catch (err) {
    return { status: false, message: err.message };
  }
}

async function nexrayFakeThreads(username, text, likes, replies) {
  try {
    const { data } = await axios.get(`${BASE}/maker/fakethreads?username=${encodeURIComponent(username)}&text=${encodeURIComponent(text)}&likes=${likes || 0}&replies=${replies || 0}`, {
      responseType: "arraybuffer", timeout: 30000, headers: HEADERS,
    });
    return { status: true, buffer: Buffer.from(data) };
  } catch (err) {
    return { status: false, message: err.message };
  }
}

async function nexrayUpscale(imageUrl) {
  try {
    const { data } = await axios.get(`${BASE}/tools/upscale?url=${encodeURIComponent(imageUrl)}`, {
      responseType: "arraybuffer", timeout: 60000, headers: HEADERS,
    });
    return { status: true, buffer: Buffer.from(data) };
  } catch (err) {
    return { status: false, message: err.message };
  }
}

export { nexrayBrat, nexrayNulis, nexrayFakeThreads, nexrayUpscale };
