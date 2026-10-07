// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 AI RICH ENGINE (rara-airich.js) — infrastruktur BERSAMA buat
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
// 🔹 VARIAN EKSPERIMEN (WA menandai "Diteruskan / tidak bisa memverifikasi"
//   di device owner 17 Sep 2026): set env AIRICH_MODE di service bot utama
//   lalu restart PM2, gak perlu ubah kode —
//   full      = struktur verbatim asli (DEFAULT, perilaku semula)
//   nofwd     = buang tanda forward (forwardingScore/isForwarded/
//               forwardedAiBotMessageInfo/forwardOrigin) — dugaan sumber
//               label "Diteruskan"
//   noverify  = buang verificationMetadata (signature+cert) — dugaan sumber
//               peringatan "tidak bisa memverifikasi keamanan media ini"
//   clean     = nofwd + noverify sekaligus
// ============================================================
import axios from "axios";
import crypto from "crypto";
import { raraWrap } from "./rara-menu-style.js";

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
  const raw = await get(CERT_URL);
  // cert.json dari noxXza/data = array karakter per entri → JOIN jadi string base64
  const cert = (Array.isArray(raw) ? raw : []).map((e) => (Array.isArray(e) ? e.join("") : String(e))).filter(Boolean);
  if (!cert.length) throw new Error("certificate chain kosong/gak valid");
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
// ── varian eksperimen (AIRICH_MODE) — baca env tiap kirim, urusannya murah ──
export function airichMode() {
  const m = String(process.env.AIRICH_MODE || "").trim().toLowerCase();
  return (m === "nofwd" || m === "noverify" || m === "clean") ? m : "full";
}

// strip field dugaan sumber label "Diteruskan" + peringatan verifikasi.
// msg dimutasi DLM PLACE (struktur verbatim buildRichResponse gak disentuh).
export function applyAirichVariant(msg, mode) {
  mode = mode || airichMode();
  const ci = msg?.botForwardedMessage?.message?.richResponseMessage?.contextInfo;
  if (mode === "nofwd" || mode === "clean") {
    if (ci) {
      delete ci.forwardingScore;
      delete ci.isForwarded;
      delete ci.forwardedAiBotMessageInfo;
      delete ci.forwardOrigin;
    }
  }
  if (mode === "noverify" || mode === "clean") {
    // struktur HIROBOT-exact emang gak ada verificationMetadata — no-op aman
    delete msg?.messageContextInfo?.botMetadata?.verificationMetadata;
  }
  return msg;
}

// ── VERIFICATION METADATA LOKAL (pola NIXCODE MessageBuilderV4.7 — dipakai
// bot-bot lain yang AI Rich-nya TETAP muncul): signature + cert chain cukup
// material string + random bytes, GAK perlu fetch cert dari GitHub. Sumber
// noxXza lama dilepas: fetch bisa gagal + isinya bisa dicabut kapan saja.
export function generateVerificationMetadata() {
  const sigMat = Buffer.from("NIXEL.MessageBuilderV4.7-VerificationSignature.Metadata");
  const certMat = Buffer.from("NIXEL.MessageBuilderV4.7-CertificateChain.Metadata");
  const signature = Buffer.concat([sigMat, crypto.randomBytes(Math.max(0, 64 - sigMat.length))]).toString("base64");
  const certificateChain = [
    Buffer.concat([certMat, crypto.randomBytes(Math.max(0, 684 - certMat.length))]).toString("base64"),
    Buffer.concat([certMat, crypto.randomBytes(Math.max(0, 892 - certMat.length))]).toString("base64"),
  ];
  return {
    proofs: [
      { version: 1, useCase: 1, signature, certificateChain },
    ],
  };
}

export function buildRichResponse(htmlPayload, opts = {}) {
  // ── HIROBOT-EXACT (7 Okt 2026, owner: "cba ke script hirobot cra kerja
  // ai rich mereka gmna") — port verbatim class AIRich.build():
  //   addHtml → section GenAIaeacdsnwHtmlPrimitive { payload, url,
  //   trusted_sources } ; submessages [{ messageType: 2, "[ CANNOT_LOAD_HTML ]" }]
  //   contextInfo: forwardingScore 1 + botJid "0@bot" + forwardOrigin 4
  //   (TANPA stanzaId/participant/quotedMessage — dulu hardcode punya orang
  //   lain = dugaan pesan dilenyapkan WA)
  //   botMetadata: messageDisclaimerText + richResponseSourcesMetadata
  //   (TANPA botResponseId — HIROBOT gak pernah ngirim)
  const responseData = {
    response_id: opts.responseId || crypto.randomUUID(),
    sections: [
      {
        view_model: {
          primitive: {
            payload: htmlPayload,
            url: opts.url || "",
            trusted_sources: opts.trustedSources || [],
            __typename: "GenAIaeacdsnwHtmlPrimitive",
          },
          __typename: "GenAISingleLayoutViewModel",
        },
      },
    ],
  };
  const dataBase64 = Buffer.from(JSON.stringify(responseData)).toString("base64");
  return {
    messageContextInfo: {
      deviceListMetadata: {},
      deviceListMetadataVersion: 2,
      botMetadata: {
        messageDisclaimerText: opts.title || "",
        richResponseSourcesMetadata: { sources: opts.sources || [] },
      },
    },
    botForwardedMessage: {
      message: {
        richResponseMessage: {
          messageType: 1,
          submessages: [
            {
              messageType: 2,
              messageText: "[ CANNOT_LOAD_HTML ]",
            },
          ],
          unifiedResponse: {
            data: dataBase64,
          },
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedAiBotMessageInfo: { botJid: "0@bot" },
            forwardOrigin: 4,
          },
        },
      },
    },
  };
}

// ── satu pintu: polish → rakit → relay. Plugin baru tinggal panggil ini ──
export async function sendRichResponse(sock, chat, html, opts = {}) {
  // cert fetch dari GitHub DIBUANG (17 Sep 2026, report "ai rich g muncul"):
  // verifikasi sekarang digenerate LOKAL ala NIXCODE V4.7 — gak ada lagi titik
  // gagal jaringan sebelum relay.

  const payload = polishPayload(html);
  console.log(`[airich] kirim rich response: payload ${Buffer.byteLength(payload)} B, ${process.env.RARA_AIRICH_VERIFY === "1" ? "verifikasi lokal" : "HIROBOT-exact (tanpa verify)"}, ke ${chat}`);
  const msg = applyAirichVariant(buildRichResponse(payload, opts));
  const rid = (() => { try {
    return JSON.parse(Buffer.from(msg.botForwardedMessage.message.richResponseMessage.unifiedResponse.data, "base64").toString("utf-8")).response_id;
  } catch { return "?"; } })();
  try {
    await sock.relayMessage(chat, msg, {});
    console.log(`[airich] ✅ relay diterima server (response_id=${String(rid).slice(0, 12)}...)`);
  } catch (err) {
    console.error(`[airich] ❌ relay DITOLAK: ${err?.message || err}`);
    throw err;
  }
  return msg;
}

// ── notif tombol unduh (request owner 4 Okt 2026): WA nampilin bubble AI Rich
//    sebagai lampiran — user harus KLIK TOMBOL UNDUH baru kartu muncul.
//    Kirim teks kecil DULUAN sebelum kartu biar user gak bingung. ──
export async function notifyRichDownload(m) {
  try {
    return await m.reply(raraWrap("AI Rich", [
      "ℹ️ Kartu AI Rich sedang dikirim.",
      "",
      "Klik tombol *Unduh* di kartu untuk membuka fiturnya.",
    ].join("\n"), "info"));
  } catch { return null; }
}
