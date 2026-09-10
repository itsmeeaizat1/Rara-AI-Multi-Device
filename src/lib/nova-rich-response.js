// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// rich — RICH RESPONSE MESSAGE ala Meta AI (request owner 10 Sep 2026:
// ".search itu cm nampikin link web dan tombol ke arah link trsebut, aku
//  maunya nampilin web didalam chat kayak ai rich gini" + script contoh
//  google search rich bot).
// Payload verbatim script owner: relayMessage → messageContextInfo
// (botMetadata) + botForwardedMessage.richResponseMessage (messageType 1,
// submessages header, unifiedResponse.data = BASE64 JSON sections primitives
// GenAI: text/image/suggest/table). TANPA forwardingScore/isForwarded
// (biar gak ada label "Diteruskan").
import crypto from "crypto";
import { logger } from "./nova-logger.js";

// ───────────────────────────── primitives ─────────────────────────────

/**
 * Bangun richData (belum base64). part.type:
 *  - { type: "text",   content }            → GenAIaeacdsnwTextPrimitive
 *  - { type: "image",  url }                → GenAIaeacdsnwImagePrimitive
 *  - { type: "suggest", prompts: [..] }     → GenAIaeacdsnwSuggestPrimitive
 *  - { type: "table",  rows }               → GenAIaeacdsnwTablePrimitive
 */
export function buildRichResponse(parts, headerText = "", footerText = "") {
  const responseId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
  const sections = (parts || []).map((part) => {
    if (!part || typeof part !== "object") return null;
    if (part.type === "text") {
      return {
        view_model: {
          primitive: {
            __typename: "GenAIaeacdsnwTextPrimitive",
            text: part.content,
          },
          __typename: "GenAISingleLayoutViewModel",
        },
      };
    }
    if (part.type === "image") {
      return {
        view_model: {
          primitive: {
            __typename: "GenAIaeacdsnwImagePrimitive",
            image: part.url,
          },
          __typename: "GenAISingleLayoutViewModel",
        },
      };
    }
    if (part.type === "suggest") {
      return {
        view_model: {
          primitive: {
            __typename: "GenAIaeacdsnwSuggestPrimitive",
            prompts: part.prompts,
          },
          __typename: "GenAIActionRowLayoutViewModel",
        },
      };
    }
    if (part.type === "table") {
      return {
        view_model: {
          primitive: {
            __typename: "GenAIaeacdsnwTablePrimitive",
            table: part.rows,
          },
          __typename: "GenAISingleLayoutViewModel",
        },
      };
    }
    if (part.type === "video") {
      return {
        view_model: {
          primitive: {
            __typename: "GenAIaeacdsnwVideoPrimitive",
            video: part.url,
            duration: part.duration || 0,
          },
          __typename: "GenAISingleLayoutViewModel",
        },
      };
    }
    return null;
  }).filter(Boolean);
  return {
    response_id: responseId,
    sections,
    headerText: headerText || "",
    footerText: footerText || "",
  };
}

/**
 * Kirim rich message via relayMessage (struktur script owner).
 * Return true/false — caller WAJIB punya fallback plain text
 * (richResponseMessage cuma ke-render di client yang dukung;
 *  kalau throw/gagal → balik ke format list lama).
 */
export async function sendRichMessage(sock, jid, richData) {
  try {
    const responseId = richData.response_id || (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString());
    const jsonString = JSON.stringify(richData);
    const dataBase64 = Buffer.from(jsonString).toString("base64");
    await sock.relayMessage(jid, {
      messageContextInfo: {
        deviceListMetadata: {},
        deviceListMetadataVersion: 2,
        botMetadata: {
          messageDisclaimerText: "",
          botResponseId: responseId,
        },
      },
      botForwardedMessage: {
        message: {
          richResponseMessage: {
            messageType: 1,
            submessages: [
              { messageType: 2, messageText: richData.headerText || "Nova AI" },
            ],
            unifiedResponse: { data: dataBase64 },
            contextInfo: {
              forwardedAiBotMessageInfo: { botJid: "867051314767696@bot" },
              forwardOrigin: 4,
            },
          },
        },
      },
    }, { messageId: responseId });
    return true;
  } catch (e) {
    logger.error?.("rich", `sendRichMessage gagal: ${e.message}`);
    return false;
  }
}

// ───────────────────────── sumber pelengkap (gratis tanpa key) ───────────────
// ala script owner: Wikipedia summary (thumbnail + ringkasan) +
// Google suggest (pencarian terkait → suggest chips).

const WIKI_API = "https://id.wikipedia.org/api/rest_v1/page/summary/";
const GOOGLE_SUGGEST = "https://suggestqueries.google.com/complete/search";

// seam http buat e2e
let richHttp = null;
export function setRichHttp(fn) { richHttp = fn; }
export function resetRichHttp() { richHttp = null; }

async function httpJson(url, timeoutMs = 10_000) {
  if (richHttp) return richHttp(url);
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/139.0.0.0 Mobile Safari/537.36" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Ringkasan Wikipedia ID utk query — { title, extract, thumbnail, url } | null. */
export async function getWikiSummary(query) {
  try {
    const d = await httpJson(`${WIKI_API}${encodeURIComponent(query)}`);
    if (!d || !d.extract) return null;
    return {
      title: d.title,
      extract: d.extract,
      thumbnail: d.thumbnail?.source || null,
      url: d.content_urls?.desktop?.page || null,
    };
  } catch {
    return null; // gak ketemu di wiki / network → lanjut tanpa wiki
  }
}

/** Saran pencarian terkait dari Google Suggest (array string, maks n). */
export async function getGoogleSuggest(query, max = 4) {
  try {
    const d = await httpJson(`${GOOGLE_SUGGEST}?client=firefox&q=${encodeURIComponent(query)}&hl=id`);
    const list = Array.isArray(d?.[1]) ? d[1] : [];
    return list.slice(0, max).filter((s) => typeof s === "string");
  } catch {
    return [];
  }
}
