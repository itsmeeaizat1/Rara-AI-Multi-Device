// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// src/scraper/spicychat.js — SpicyChat AI (uncensored character chat,
// guest-based, tanpa API key). Port dari script CLI owner 9 Sep 2026.
//
// API: https://prod.nd-api.com (spicychat.ai) — karakter default
// "Wormgpt" (asisten tanpa sensor), engine NextDayAI/G4-26B.
// Session per-user: guestUserId + conversationId, persist di db.

import crypto from "crypto";
import { getDatabase } from "../lib/rara-database.js";

const BASE_URL = "https://prod.nd-api.com";
const DEFAULT_CHARACTER_ID = "bfcbb334-183c-4c5e-9dde-c544a5a67795";
const SESSION_DB_KEY = "spicychatSession";
const TIMEOUT_MS = 90 * 1000;

function buildHeaders(guestUserId) {
  return {
    "x-platform": "WEB",
    "x-platform-os": "ANDROID",
    "x-guest-userid": guestUserId,
    "x-app-id": "spicychat",
    "x-app-version": "2.44.0",
    "x-country": "ID",
    "content-type": "application/json",
    "accept": "application/json, text/plain, */*",
    "origin": "https://spicychat.ai",
    "referer": "https://spicychat.ai/",
    "user-agent":
      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36",
  };
}

async function request(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...options,
      headers: options.headers,
      signal: controller.signal,
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    if (!response.ok) {
      const err = new Error(
        `HTTP ${response.status}: ${typeof data === "string" ? data.slice(0, 200) : JSON.stringify(data).slice(0, 200)}`
      );
      err.status = response.status;
      throw err;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

// ── Session per-user (persist db) ──
export function getSession(sender) {
  try {
    const s = getDatabase().getPlayerData(sender, SESSION_DB_KEY);
    if (s?.guestUserId) return s;
  } catch {}
  // session baru
  const fresh = { guestUserId: crypto.randomUUID(), conversationId: null };
  try { getDatabase().setPlayerData(sender, SESSION_DB_KEY, fresh); } catch {}
  return fresh;
}

export function resetSession(sender) {
  const fresh = { guestUserId: crypto.randomUUID(), conversationId: null };
  try { getDatabase().setPlayerData(sender, SESSION_DB_KEY, fresh); } catch {}
  return fresh;
}

function saveConversationId(sender, conversationId) {
  if (!conversationId) return;
  const s = getSession(sender);
  s.conversationId = conversationId;
  try { getDatabase().setPlayerData(sender, SESSION_DB_KEY, s); } catch {}
}

// ── Kirim chat. Kalau conversation mati/expired (404/400) → auto-reset sekali & retry ──
export async function spicyChat(sender, message, opts = {}) {
  const characterId = opts.characterId || process.env.SPICY_CHARACTER_ID || DEFAULT_CHARACTER_ID;
  const body = (s) => ({
    conversation_id: s.conversationId,
    character_id: characterId,
    language: "id",
    inference_model: "default",
    inference_settings: {
      max_new_tokens: opts.maxTokens || 180,
      temperature: 0.7,
      top_p: 0.7,
      top_k: 90,
    },
    autopilot: false,
    continue_chat: false,
    message,
  });

  const attempt = async () => {
    const s = getSession(sender);
    const data = await request(`${BASE_URL}/chat`, {
      method: "POST",
      headers: buildHeaders(s.guestUserId),
      body: JSON.stringify(body(s)),
    });
    const conversationId =
      data?.message?.conversation_id ??
      data?.conversation_id ??
      data?.conversation?.id ??
      data?.data?.conversation_id;
    saveConversationId(sender, conversationId);
    return data;
  };

  try {
    return await attempt();
  } catch (err) {
    // conversation mati/expired → reset session & retry sekali
    if ([400, 404, 410].includes(err.status)) {
      resetSession(sender);
      return await attempt();
    }
    throw err;
  }
}

// ── Ambil pesan dari conversation aktif ──
export async function spicyGetMessages(sender, limit = 50, opts = {}) {
  const characterId = opts.characterId || process.env.SPICY_CHARACTER_ID || DEFAULT_CHARACTER_ID;
  const s = getSession(sender);
  if (!s.conversationId) throw new Error("Belum ada percakapan. Kirim chat dulu.");
  const url =
    `${BASE_URL}/characters/${characterId}/messages/${s.conversationId}?limit=${limit}`;
  return request(url, { method: "GET", headers: buildHeaders(s.guestUserId) });
}

// ── Ekstrak balasan bot dari response API ──
export function extractReply(data) {
  return (
    data?.message?.content ??
    data?.content ??
    data?.response ??
    data?.reply ??
    data?.data?.message?.content ??
    data?.data?.response ??
    null
  );
}

export function getEngine(data) {
  return data?.engine || null;
}

export { DEFAULT_CHARACTER_ID, SESSION_DB_KEY };
