// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 SPACE RUSH .plane — EKSPERIMEN AI RICH RESPONSE (plugin pertama
//   kategori airich/). BUKAN fitur biasa: WhatsApp nge-render HALAMAN
//   HTML LANGSUNG di chat (bukan webview/link) via richResponseMessage
//   GenAI HTML primitive (pola pesan bot Meta AI) yang di-relay manual.
// 🔹 Sumber (karya noxXza — request owner 14 Sep 2026, eksperimen):
//   certificate: raw noxXza/data certificate.json (chain 2 — WAVERIFIED)
//   payload:     raw noxXza/data plane.html (game HTML 15.5KB)
// 🔹 Struktur pesan VERBATIM dari kode owner — jangan diutak-atik:
//   messageContextInfo.botMetadata.verificationMetadata (proofs v1
//   NOXZA_EXE + signature + certificateChain) + botForwardedMessage
//   richResponseMessage AI_RICH_RESPONSE_TYPE_STANDARD +
//   unifiedResponse.data = base64(JSON { sections → GenAI HTML payload }).
// 🔹 Catatan: kalau format ini ditolak/diubah Meta, tinggal update
//   struktur di buildRichResponse() — sumber & alur gak berubah.
// ============================================================
import axios from "axios";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "plane",
  // NOTE: "game" SENGAJA gak jadi alias — bentrok sama plugins/group/game.js
  // (kejadian .absen: loader last-wins, dead code).
  alias: ["plane", "spacerush", "airichgame"],
  category: "airich",
  description: "Space Rush 🚀 — game HTML AI Rich Response langsung di chat (EKSPERIMEN)",
  usage: ".plane",
  example: ".plane",
  isOwner: false, isPremium: false, isGroup: true, isPrivate: true,
  cooldown: 15, energi: 2, isEnabled: true,
};

const CERT_URL = "https://raw.githubusercontent.com/noxXza/data/refs/heads/main/certificate.json";
const PAYLOAD_URL = "https://raw.githubusercontent.com/noxXza/data/refs/heads/main/plane.html";

// ── seams http buat e2e offline ──
const __planeHttp = {};
export function _setPlaneHttpForTest(h) { Object.assign(__planeHttp, h); }
export function _resetPlaneHttpForTest() { for (const k of Object.keys(__planeHttp)) delete __planeHttp[k]; }

async function fetchCertificate() {
  const get = __planeHttp.getJson || ((url) => axios.get(url, { timeout: 15000 }).then((r) => r.data));
  const cert = await get(CERT_URL);
  if (!Array.isArray(cert) || !cert.length) throw new Error("certificate chain kosong/gak valid");
  return cert;
}

async function fetchPayload() {
  const get = __planeHttp.getText
    || ((url) => axios.get(url, { timeout: 20000, responseType: "text", transformResponse: [(d) => d] }).then((r) => r.data));
  const html = await get(PAYLOAD_URL);
  if (!html || html.length < 500 || !/<[a-z]/i.test(html)) throw new Error("payload HTML kosong/gak valid");
  return html;
}

// 🔹 Rakit richResponseMessage — VERBATIM struktur owner (base64 JSON:
// sections[0].view_model.primitive GenAIaeacdsnwHtmlPrimitive payload HTML)
export function buildRichResponse(htmlPayload, certChain) {
  const responseData = {
    response_id: "4db57b2c-8393-484d-8b9a-8e6d1a14b349",
    sections: [
      {
        view_model: {
          primitive: {
            __typename: "GenAIaeacdsnwHtmlPrimitive",
            payload: htmlPayload,
            trusted_sources: ["noxXza.js", "noxXza.dev"],
          },
          __typename: "GenAISingleLayoutViewModel",
        },
      },
    ],
  };
  const dataBase64 = Buffer.from(JSON.stringify(responseData, null, 2)).toString("base64");
  return {
    messageContextInfo: {
      deviceListMetadata: {},
      deviceListMetadataVersion: 2,
      botMetadata: {
        messageDisclaimerText: "",
        botResponseId: "b2e40280-433c-45d8-9c1a-270bec558860",
        verificationMetadata: {
          proofs: [
            {
              version: 1,
              useCase: "NOXZA_EXE",
              signature: "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LVZlcmlmaWNhdGlvblNpZ25hdHVyZS5NZXRhZGF0YeN55YRyad2+ZA==",
              certificateChain: certChain,
            },
          ],
        },
      },
    },
    botForwardedMessage: {
      message: {
        richResponseMessage: {
          messageType: "AI_RICH_RESPONSE_TYPE_STANDARD",
          submessages: [
            {
              messageType: "AI_RICH_RESPONSE_TEXT",
              messageText: "Space Rush 🚀",
            },
          ],
          unifiedResponse: {
            data: dataBase64,
          },
          contextInfo: {
            stanzaId: "A5FBA758891A16FD260767C2569F87E4",
            quotedMessage: {
              extendedTextMessage: {
                previewType: "NONE",
                inviteLinkGroupTypeV2: "DEFAULT",
              },
            },
            forwardingScore: 1,
            isForwarded: true,
            forwardedAiBotMessageInfo: {
              botJid: "867051314767696@bot",
            },
            forwardOrigin: "META_AI",
          },
        },
      },
    },
  };
}

async function handler(m, { sock }) {
  try {
    await m.react("🧠");

    const [certChain, htmlPayload] = await Promise.all([
      fetchCertificate(),
      fetchPayload(),
    ]);
    await m.react("🛠️");

    const richMsg = buildRichResponse(htmlPayload, certChain);
    await sock.relayMessage(m.chat, richMsg, {});

    await m.react("🐣");
  } catch (err) {
    console.error("plane error:", err);
    await m.react("❌");
    return m.reply(claraWrap("plane", "gagal memuat game: " + (err?.message || "error"), "error"));
  }
}

export default { pluginConfig, handler, command: "plane" };
