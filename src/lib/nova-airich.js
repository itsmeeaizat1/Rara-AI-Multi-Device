// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 AI RICH ENGINE (nova-airich.js) — infrastruktur BERSAMA buat
//   fitur kategori airich/ (richResponseMessage GenAI HTML primitive).
// 🔹 Supaya bikin plugin airich baru dari NOL gampang: plugin cuma
//   nyuplain STRING HTML — engine yang urus certificate, polish
//   bottom sheet, perakitan relay, dan pengiriman.
// 🔹 Recipe fitur airich baru:
//   1. import { sendRichResponse, polishPayload } dari sini
//   2. bikin HTML payload (self-contained, meta viewport GAK perlu —
//      polishPayload yang nambah, JS opsional sebagai progressive
//      enhancement — kalau webview Meta ngeblok JS, tampilan tetep jalan)
//   3. await sendRichResponse(sock, m.chat, html, { title: "..." })
// 🔹 Struktur relay VERBATIM dari kode owner (.plane) — kalau Meta
//   ubah format, cukup update buildRichResponse() di sini, SEMUA
//   plugin airich ikut kebagian perbaikan.
// ============================================================
import axios from "axios";

const CERT_URL = "https://raw.githubusercontent.com/noxXza/data/refs/heads/main/certificate.json";

// ── seams http buat e2e offline ──
const __airichHttp = {};
export function _setAirichHttpForTest(h) { Object.assign(__airichHttp, h); }
export function _resetAirichHttpForTest() { for (const k of Object.keys(__airichHttp)) delete __airichHttp[k]; }

// ── certificate: fetch + cache 10 menit (jarang berubah, hemat request) ──
let __certCache = null;
let __certTs = 0;
export async function fetchCertificate(force = false) {
  if (!force && __certCache && Date.now() - __certTs < 10 * 60 * 1000) return __certCache;
  const get = __airichHttp.getJson || ((url) => axios.get(url, { timeout: 15000 }).then((r) => r.data));
  const cert = await get(CERT_URL);
  if (!Array.isArray(cert) || !cert.length) throw new Error("certificate chain kosong/gak valid");
  __certCache = cert;
  __certTs = Date.now();
  return cert;
}

// ── POLISH BOTTOM SHEET + ANTI-GESESER + META VIEWPORT ──
// Post-process payload SEBELUM dirakit: (1) kartu jadi bottom sheet
// (nempel bawah + grabber + radius atas), (2) anti-geser total (fixed +
// overscroll contain + touch-action none), (3) meta viewport (payload
// tanpa meta → webview mobile render 980px), (4) idempoten.
export function polishPayload(html) {
  if (html.includes("data-nova-bottomsheet")) return html;
  const meta = '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">';
  const css = [
    meta,
    "<style data-nova-bottomsheet>",
    // anti-geser: gak ada scroll di dalam gelembung sama sekali
    "html, body { position: fixed !important; inset: 0 !important; width: 100% !important; height: 100% !important; overflow: hidden !important; overscroll-behavior: contain !important; touch-action: none !important; }",
    // layout bottom sheet: konten nempel bawah, sisa ruang di atas
    "body { display: flex !important; align-items: flex-end !important; }",
    // kartu = sheet: radius atas doang, tanpa garis samping/bawah, full lebar
    ".card { width: 100% !important; margin: 0 !important; border-radius: 22px 22px 0 0 !important; border-left: none !important; border-right: none !important; border-bottom: none !important; padding-bottom: max(12px, env(safe-area-inset-bottom, 12px)) !important; }",
    // grab handle klasik bottom sheet di atas kartu
    ".card::before { content: '' !important; display: block !important; width: 38px !important; height: 4px !important; border-radius: 2px !important; background: #64748b !important; margin: 0 auto 10px auto !important; box-shadow: none !important; }",
    // game auto-fit biar kartu selalu muat viewport (canvas nge-scale, tap tetep akurat)
    "#game-container { height: min(350px, calc(100vh - 240px)) !important; }",
    "#game-container, canvas, .btn { touch-action: none !important; }",
    ".wrapper { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }",
    "</style>",
  ].join(" ");
  // inject tepat sebelum <body> — kalau gak ada, tempel di depan
  if (/<body[^>]*>/i.test(html)) return html.replace(/(<body[^>]*>)/i, css + "$1");
  return css + html;
}

// ── perakit pesan — struktur VERBATIM kode owner (jangan diutak-atik) ──
// opts: { responseId, botResponseId, title } — semuanya opsional, default
// nilai dari eksperimen .plane (id unik per pesan biar gak nyangkut cache).
export function buildRichResponse(htmlPayload, certChain, opts = {}) {
  const responseData = {
    response_id: opts.responseId || "4db57b2c-8393-484d-8b9a-8e6d1a14b349",
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
        botResponseId: opts.botResponseId || "b2e40280-433c-45d8-9c1a-270bec558860",
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
              messageText: opts.title || "Space Rush 🚀",
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

// ── satu pintu: polish → rakit → relay. Plugin baru tinggal panggil ini ──
export async function sendRichResponse(sock, chat, html, opts = {}) {
  const certChain = await fetchCertificate();
  const msg = buildRichResponse(polishPayload(html), certChain, opts);
  await sock.relayMessage(chat, msg, {});
  return msg;
}
