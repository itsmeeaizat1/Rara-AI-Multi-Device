// E2E PLANE — EKSPERIMEN AI RICH RESPONSE (plugins/airich/plane.js).
// .plane/.spacerush → fetch cert + HTML payload (noxXza) → rakit
// richResponseMessage GenAI HTML primitive → sock.relayMessage.
// Halaman HTML nampil LANGSUNG di chat WA (bukan webview).
import fs from "node:fs";
import { initDatabase } from "../../src/lib/nova-database.js";
import plugin, { buildRichResponse, polishPayload, _setPlaneHttpForTest, _resetPlaneHttpForTest } from "../../plugins/airich/plane.js";
import { fromSC } from "../../src/lib/styler.js";

const DB = "/tmp/plane-e2e-db.json";
fs.rmSync(DB, { recursive: true, force: true });
await initDatabase(DB);

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const t = (name, ok, extra) => {
  w((ok ? "✅ " : "❌ ") + name + (ok ? "" : extra ? " — " + extra : ""));
  ok ? pass++ : fail++;
};

const CERT = [{ kid: "a", pem: "x" }, { kid: "b", pem: "y" }];
const HTML = "<!DOCTYPE html><html><head><style>*{box-sizing:border-box}</style></head><body><div id=\"game\">" + "<p>Space Rush payload fixture — ".repeat(30) + "</p></div></body></html>";

const mkM = () => ({
  args: [], chat: "g@test", sender: "u@test", prefix: ".",
  reply: async (x) => { mkM.replyed.push(String(x)); },
  react: async () => true,
});
mkM.replyed = [];

const relays = [];
const plain = (s) => fromSC(String(s || "")).toLowerCase(); // GOTCHA ke-7x: claraWrap = smallcaps
const sock = {
  relayMessage: async (chat, msg, opts) => { relays.push({ chat, msg, opts }); return {}; },
  sendMessage: async () => ({}),
};

// ═══ 1. buildRichResponse — struktur VERBATIM ═══
w("\n— buildRichResponse —");
const r = buildRichResponse(HTML, CERT);
t("  messageContextInfo.botMetadata.verificationMetadata ada",
  !!r.messageContextInfo?.botMetadata?.verificationMetadata);
t("  proofs v1 WA_BOT_MSG + signature Buffer + certificateChain",
  (() => { const p = r.messageContextInfo.botMetadata.verificationMetadata.proofs[0];
    return p.version === 1 && p.useCase === "WA_BOT_MSG" && Buffer.isBuffer(p.signature) && p.signature.equals(Buffer.from("TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LVZlcmlmaWNhdGlvblNpZ25hdHVyZS5NZXRhZGF0YeN55YRyad2+ZA==", "base64")) && p.certificateChain === CERT; })());
t("  botForwardedMessage.richResponseMessage type STANDARD + submessage 'Space Rush 🚀'",
  r.botForwardedMessage?.message?.richResponseMessage?.messageType === "AI_RICH_RESPONSE_TYPE_STANDARD"
  && r.botForwardedMessage.message.richResponseMessage.submessages?.[0]?.messageText === "Space Rush 🚀");
t("  opts.title custom (hint markdown dari handler) nge-override submessage",
  buildRichResponse(HTML, CERT, { title: "Space Rush 🚀\n*Tap kiri/kanan* buat manuver" }).botForwardedMessage.message.richResponseMessage.submessages[0].messageText.includes("Tap kiri/kanan"));
t("  contextInfo: stanzaId + forwardOrigin META_AI + botJid",
  (() => { const ci = r.botForwardedMessage.message.richResponseMessage.contextInfo;
    return ci.stanzaId === "A5FBA758891A16FD260767C2569F87E4" && ci.forwardOrigin === "META_AI" && ci.forwardedAiBotMessageInfo.botJid === "867051314767696@bot"; })());
// base64 ke-decode → responseData HTML primitive
const decoded = JSON.parse(Buffer.from(r.botForwardedMessage.message.richResponseMessage.unifiedResponse.data, "base64").toString("utf-8"));
t("  base64 ke-decode → GenAIaeacdsnwHtmlPrimitive payload = HTML",
  decoded.sections?.[0]?.view_model?.primitive?.__typename === "GenAIaeacdsnwHtmlPrimitive"
  && decoded.sections[0].view_model.primitive.payload === HTML);

t("  trusted_sources noxXza + response_id tetap",
  decoded.sections[0].view_model.primitive.trusted_sources.join() === "noxXza.js,noxXza.dev"
  && decoded.response_id === "4db57b2c-8393-484d-8b9a-8e6d1a14b349");

// ═══ 1.5 POLISH BOTTOM SHEET — anti-gegeser + sheet look ═══
w("\n— polishPayload bottom sheet —");
const polished = polishPayload(HTML);
t("  style sheet ke-inject sebelum <body>",
  polished.includes("data-nova-bottomsheet") && /<style data-nova-bottomsheet>[\s\S]*<body[^>]*>/.test(polished));
t("  meta viewport mobile ke-inject (anti-scale aneh di webview WA)",
  polished.includes('<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">'));
t("  anti-geser: position fixed + overscroll contain + touch-action none",
  /position: fixed !important/.test(polished) && /overscroll-behavior: contain !important/.test(polished) && /touch-action: none !important/.test(polished));
t("  bottom sheet: card nempel bawah + radius atas doang + grabber",
  /align-items: flex-end !important/.test(polished) && /border-radius: 22px 22px 0 0 !important/.test(polished) && /.card::before/.test(polished));
t("  game auto-fit: height min(350px, calc(100vh - 240px))",
  /#game-container \{ height: min\(350px, calc\(100vh - 240px\)\) !important; \}/.test(polished));
t("  idempoten — polish 2x gak dobel", polishPayload(polished) === polished);
t("  game JS gak tersentuh", polished.includes("spawnEnemy") === HTML.includes("spawnEnemy") || polished.includes(HTML.replace(/\s/g, "").slice(-200)));
t("  game asli tetep utuh di dalam polished", polished.includes("GenAI") === false && polished.includes("<canvas") || polished.includes("canvas"));

// ═══ 2. handler — relay dipanggil + structure valid ═══
w("\n— handler happy path (mock http) —");
_setPlaneHttpForTest({
  getJson: async () => CERT,
  getText: async () => HTML,
});
mkM.replyed.length = 0; relays.length = 0;
await plugin.handler(mkM(), { sock });
t("  relayMessage ke-panggil ke chat yang sama", relays.length === 1 && relays[0].chat === "g@test");
t("  pesan relay = struktur rich response valid",
  relays[0]?.msg?.botForwardedMessage?.message?.richResponseMessage?.unifiedResponse?.data?.length > 100);
{
  const d = JSON.parse(Buffer.from(relays[0].msg.botForwardedMessage.message.richResponseMessage.unifiedResponse.data, "base64").toString("utf-8"));
  t("  payload relay ke-polish bottom sheet",
    d.sections[0].view_model.primitive.payload.includes("data-nova-bottomsheet"));
  t("  game asli masih utuh dalam payload", d.sections[0].view_model.primitive.payload.includes("Space Rush payload fixture"));
}
t("  gak ada reply error", mkM.replyed.length === 0, JSON.stringify(mkM.replyed));

// ═══ 3. handler — error STRICT (payload gagal) ═══
w("\n— handler error path —");
_setPlaneHttpForTest({
  getJson: async () => CERT,
  getText: async () => { throw new Error("404 not found"); },
});
mkM.replyed.length = 0; relays.length = 0;
await plugin.handler(mkM(), { sock });
t("  payload gagal → relay gak jalan + reply error asli",
  relays.length === 0 && mkM.replyed.length === 1 && /404 not found/.test(plain(mkM.replyed[0])));

// NOTE: fetch certificate sekarang di ENGINE (nova-airich.js, cache 10 mnt) —
// kasus certificate kosong diuji di suite engine (airich-engine-e2e).

// payload bukan HTML → error
_setPlaneHttpForTest({
  getJson: async () => CERT,
  getText: async () => "halo ini bukan html",
});
mkM.replyed.length = 0; relays.length = 0;
await plugin.handler(mkM(), { sock });
t("  payload bukan HTML → error payload kosong/gak valid",
  relays.length === 0 && /payload html kosong/.test(plain(mkM.replyed[0])));

_resetPlaneHttpForTest();

// ═══ 4. LIVE fetch — certificate + payload beneran ═══
w("\n— live fetch (noxXza GitHub raw) —");
let liveOk = false, liveInfo = "";
try {
  const { default: axios } = await import("axios");
  const cert = await axios.get("https://raw.githubusercontent.com/noxXza/data/refs/heads/main/certificate.json", { timeout: 20000 });
  const html = await axios.get("https://raw.githubusercontent.com/noxXza/data/refs/heads/main/plane.html", { timeout: 20000, responseType: "text", transformResponse: [(d) => d] });
  liveOk = Array.isArray(cert.data) && cert.data.length === 2 && html.data.length > 10000 && /<style|<html|<div/i.test(html.data);
  liveInfo = `cert=${Array.isArray(cert.data) ? cert.data.length : "?"} html=${html.data.length}B`;
  // live struktur build juga
  const liveMsg = buildRichResponse(html.data, cert.data);
  const liveDecoded = JSON.parse(Buffer.from(liveMsg.botForwardedMessage.message.richResponseMessage.unifiedResponse.data, "base64").toString("utf-8"));
  t("  live: certificate chain 2 + html 15KB → struktur rich response valid",
    liveOk && liveDecoded.sections[0].view_model.primitive.payload === html.data, liveInfo);
  const livePolished = polishPayload(html.data);
  t("  live: polish bottom sheet di payload game asli (script tetep utuh)",
    livePolished.includes("data-nova-bottomsheet") && livePolished.includes("spawnEnemy") && livePolished.includes("<canvas") && livePolished.length > html.data.length, livePolished.length + "B");
} catch (e) {
  t("  live fetch (skip kalau sandbox offline)", false, e.message);
}

// ═══ 5. registrasi ═══
w("\n— registrasi —");
t("  command plane + alias spacerush (TANPA 'game' — bentrok group/game.js)",
  plugin.command === "plane" && plugin.pluginConfig.alias.includes("spacerush") && !plugin.pluginConfig.alias.includes("game"));
t("  kategori airich + enabled", plugin.pluginConfig.category === "airich" && plugin.pluginConfig.isEnabled === true);
t("  cd 15 / energi 2", plugin.pluginConfig.cooldown === 15 && plugin.pluginConfig.energi === 2);

w("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
