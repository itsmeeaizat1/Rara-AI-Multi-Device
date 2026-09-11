// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// src/scraper/evernight.js — KuroNeko AI via wilz.web.id/api/ai/evernight
// Request owner 12 Sep 2026: "buat fitur ai baru .kuroai" — API punya sistem
// SESSION sendiri (token opaque dibalas tiap request) — kirim session lama →
// AI inget percakapan sebelumnya. STRICT SATU RUTE (pola satuan owner):
// API down / q kosong → error jelas, gak nyamber provider lain.

const EVERNIGHT_URL = "https://www.wilz.web.id/api/ai/evernight";

/**
 * Chat dengan KuroNeko AI (evernight API).
 * @param {string} prompt — pertanyaan/pesan user
 * @param {object} opts — { session: token session sebelumnya (opsional) }
 * @returns {Promise<{ response: string, session: string }>}
 */
export async function kuroaiChat(prompt, { session = "" } = {}) {
  const q = String(prompt || "").trim();
  if (!q) throw new Error("Pertanyaan kosong — ketik pesannya setelah .kuroai");

  const url = `${EVERNIGHT_URL}?q=${encodeURIComponent(q)}${session ? `&session=${encodeURIComponent(session)}` : ""}`;

  let res;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(60000),
    });
  } catch (e) {
    throw new Error(`API evernight gak kebuka: ${e.message}`);
  }

  if (res.status !== 200) throw new Error(`API evernight balas HTTP ${res.status}`);

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error("Respon API bukan JSON yang valid");
  }

  if (data.status !== true) {
    throw new Error(data.message || "API evernight nolak request");
  }
  if (!data.response) throw new Error("API evernight gak ngasih jawaban");

  return { response: String(data.response).trim(), session: data.session || "" };
}
