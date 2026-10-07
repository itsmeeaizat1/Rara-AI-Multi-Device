// E2E AI RICH ENGINE (src/lib/nova-airich.js) — infrastruktur bersama
// fitur airich/: certificate cache, polishPayload bottom sheet,
// buildRichResponse, sendRichResponse. Plugin baru dari nol tinggal
// nyuplain HTML → ini ngejamin struktur relay-nya bener.
import fs from "node:fs";
import { initDatabase } from "../../src/lib/rara-database.js";
import {
  fetchCertificate, polishPayload, buildRichResponse, sendRichResponse,
  applyAirichVariant, airichMode,
  _setAirichHttpForTest, _resetAirichHttpForTest,
  notifyRichDownload,
} from "../../src/lib/rara-airich.js";

const DB = "/tmp/airich-engine-db.json";
fs.rmSync(DB, { recursive: true, force: true });
await initDatabase(DB);

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const t = (name, ok, extra) => {
  w((ok ? "✅ " : "❌ ") + name + (ok ? "" : extra ? " — " + extra : ""));
  ok ? pass++ : fail++;
};

const CERT_RAW = [Array.from("Y2VydDAx"), Array.from("Y2VydDAy")]; // char-array persis format noxXza/data
const CERT = ["Y2VydDAx", "Y2VydDAy"]; // hasil join
const HTML = "<!DOCTYPE html><html><body><div class=\"card\"><canvas id=\"c\"></canvas>" + "<p>engine fixture </p>".repeat(40) + "</div></body></html>";

// ═══ 1. buildRichResponse — v2 NIXCODE-align (17 Sep 2026 fix "g mncul") ═══
w("\n— buildRichResponse —");
const r = buildRichResponse(HTML);
t("  HIROBOT-EXACT 7 Okt: botJid 0@bot + TANPA stanzaId/participant/quotedMessage (spoof dibuang)",
  (() => { const ci = r.botForwardedMessage.message.richResponseMessage.contextInfo;
    return r.botForwardedMessage.message.richResponseMessage.messageType === 1
      && ci.forwardedAiBotMessageInfo.botJid === "0@bot"
      && ci.forwardOrigin === 4 && ci.forwardingScore === 1
      && ci.stanzaId === undefined && ci.participant === undefined && ci.quotedMessage === undefined; })());
t("  HIROBOT-EXACT: submessages messageType 2 (angka) + [ CANNOT_LOAD_HTML ]",
  (() => { const sm = r.botForwardedMessage.message.richResponseMessage.submessages[0];
    return sm.messageType === 2 && sm.messageText === "[ CANNOT_LOAD_HTML ]"; })());
t("  HIROBOT-EXACT: botMetadata = disclaimer + richResponseSourcesMetadata, TANPA botResponseId/verify",
  (() => { const bm = r.messageContextInfo.botMetadata;
    return typeof bm.messageDisclaimerText === "string"
      && bm.richResponseSourcesMetadata && Array.isArray(bm.richResponseSourcesMetadata.sources)
      && bm.botResponseId === undefined && bm.verificationMetadata === undefined; })());
t("  primitive HTML: payload + url + trusted_sources (HIROBOT addHtml shape)",
  (() => { const pr = JSON.parse(Buffer.from(r.botForwardedMessage.message.richResponseMessage.unifiedResponse.data, "base64").toString("utf-8")).sections[0].view_model.primitive;
    return pr.__typename === "GenAIaeacdsnwHtmlPrimitive" && typeof pr.url === "string" && Array.isArray(pr.trusted_sources); })());
process.env.RARA_AIRICH_VERIFY = "1";
const rv = buildRichResponse(HTML);
delete process.env.RARA_AIRICH_VERIFY;
t("  RARA_AIRICH_VERIFY=1 kini NO-OP (HIROBOT gak pernah kirim verificationMetadata)",
  (() => { return !rv.messageContextInfo.botMetadata.verificationMetadata
    && rv.botForwardedMessage.message.richResponseMessage.submessages[0].messageType === 2; })());
t("  ID SEGAR tiap build (response_id beda antar pesan — akar dedupe)",
  (() => { const r2 = buildRichResponse(HTML);
    const id1 = JSON.parse(Buffer.from(r.botForwardedMessage.message.richResponseMessage.unifiedResponse.data, "base64").toString("utf-8")).response_id;
    const id2 = JSON.parse(Buffer.from(r2.botForwardedMessage.message.richResponseMessage.unifiedResponse.data, "base64").toString("utf-8")).response_id;
    return id1 !== id2 && /^[0-9a-f-]{36}$/.test(id1) && /^[0-9a-f-]{36}$/.test(id2); })());
t("  payload base64 ke-decode = HTML asli",
  JSON.parse(Buffer.from(r.botForwardedMessage.message.richResponseMessage.unifiedResponse.data, "base64").toString("utf-8")).sections[0].view_model.primitive.payload === HTML);
t("  payload COMPACT (gak ada indent 2 spasi versi lama)",
  !Buffer.from(r.botForwardedMessage.message.richResponseMessage.unifiedResponse.data, "base64").toString("utf-8").includes("\n  "));
t("  opts: title → messageDisclaimerText + responseId eksplisit dihormati",
  (() => { const r2 = buildRichResponse(HTML, { title: "T", responseId: "rid-fix" });
    return r2.messageContextInfo.botMetadata.messageDisclaimerText === "T"
      && r2.botForwardedMessage.message.richResponseMessage.submessages[0].messageText === "[ CANNOT_LOAD_HTML ]"
      && JSON.parse(Buffer.from(r2.botForwardedMessage.message.richResponseMessage.unifiedResponse.data, "base64").toString("utf-8")).response_id === "rid-fix"; })());

// ═══ 2. polishPayload ═══
w("\n— polishPayload —");
const p = polishPayload(HTML);
t("  7 Okt: gaya HIROBOT — center + meta viewport, TANPA paksaan fullscreen/width100%",
  p.includes("data-nova-bottomsheet") && p.includes("<meta name=\"viewport\"") && /justify-content: center/.test(p)
  && !/position: fixed/.test(p) && !/max-width: none/.test(p) && !/width: 100% !important; margin: 0 !important; border-radius: 22px 22px 0 0/.test(p));
t("  idempoten", polishPayload(p) === p);

// ═══ 3. fetchCertificate — cache 10 mnt + error kosong ═══
w("\n— fetchCertificate —");
_setAirichHttpForTest({ getJson: async () => CERT_RAW });
const c1 = await fetchCertificate(true);
t("  fetch ok (char-array di-join jadi string) + cache hit (call ke-2 gak nyentuh http)",
  JSON.stringify(c1) === JSON.stringify(CERT) && JSON.stringify(await fetchCertificate()) === JSON.stringify(CERT));
_setAirichHttpForTest({ getJson: async () => [] });
let certErr = "";
try { await fetchCertificate(true); } catch (e) { certErr = e.message; }
t("  certificate kosong → throw ramah", /certificate chain kosong/.test(certErr));
_resetAirichHttpForTest();

// ═══ 4. sendRichResponse — satu pintu ═══
w("\n— sendRichResponse —");
const relays = [];
const sock = { relayMessage: async (chat, msg, o) => { relays.push({ chat, msg }); return {}; } };
await sendRichResponse(sock, "g@test", HTML, { title: "Google 🔍" });
t("  polish→rakit→relay: 1x relay ke chat, payload ke-polish",
  relays.length === 1 && relays[0].chat === "g@test"
  && JSON.parse(Buffer.from(relays[0].msg.botForwardedMessage.message.richResponseMessage.unifiedResponse.data, "base64").toString("utf-8")).sections[0].view_model.primitive.payload.includes("data-nova-bottomsheet"));
t("  opts.title nyampe ke messageDisclaimerText (HIROBOT-exact)", relays[0].msg.messageContextInfo.botMetadata.messageDisclaimerText === "Google 🔍");

// ═══ 4b. varian eksperimen AIRICH_MODE ═══
w("\n— varian AIRICH_MODE —");
const baseMsg = () => buildRichResponse(HTML);
{
  const m = applyAirichVariant(baseMsg(), "nofwd");
  const ci = m.botForwardedMessage.message.richResponseMessage.contextInfo;
  t("  nofwd: tanda forward kehapus (forwardingScore/isForwarded/botInfo/origin)",
    !("forwardingScore" in ci) && !("isForwarded" in ci) && !("forwardedAiBotMessageInfo" in ci) && !("forwardOrigin" in ci));
  t("  nofwd: verificationMetadata mengikuti default (absen — HIROBOT-EXACT 5 Okt)", !m.messageContextInfo.botMetadata.verificationMetadata);
  t("  nofwd: gak ada stanzaId/participant (spoof udah dibuang 7 Okt)", ci.stanzaId === undefined && ci.participant === undefined);
}
{
  const m = applyAirichVariant(baseMsg(), "noverify");
  const ci = m.botForwardedMessage.message.richResponseMessage.contextInfo;
  t("  noverify: verificationMetadata kehapus", !m.messageContextInfo.botMetadata.verificationMetadata);
  t("  noverify: tanda forward TETAP ADA", ci.forwardingScore === 1 && ci.isForwarded === true && ci.forwardOrigin === 4);
}
{
  const m = applyAirichVariant(baseMsg(), "clean");
  const ci = m.botForwardedMessage.message.richResponseMessage.contextInfo;
  t("  clean: dua-duanya kehapus",
    !m.messageContextInfo.botMetadata.verificationMetadata && !("forwardingScore" in ci) && !("forwardOrigin" in ci));
}
{
  const m = applyAirichVariant(baseMsg(), "full");
  const ci = m.botForwardedMessage.message.richResponseMessage.contextInfo;
  t("  full/unknown: struktur forward verbatim gak tersentuh",
    ci.forwardingScore === 1 && ci.isForwarded === true && ci.forwardOrigin === 4);
}
{
  process.env.AIRICH_MODE = "clean";
  const m = applyAirichVariant(baseMsg());
  t("  tanpa argumen → baca env AIRICH_MODE", !m.messageContextInfo.botMetadata.verificationMetadata);
  delete process.env.AIRICH_MODE;
  t("  env dibalikin → mode full", airichMode() === "full");
}
{
  const relays2 = [];
  const sock2 = { relayMessage: async (chat, msg, o) => { relays2.push({ chat, msg }); return {}; } };
  process.env.AIRICH_MODE = "nofwd";
  await sendRichResponse(sock2, "g@test", HTML, { title: "tes" });
  delete process.env.AIRICH_MODE;
  const ci = relays2[0].msg.botForwardedMessage.message.richResponseMessage.contextInfo;
  t("  sendRichResponse mengikuti AIRICH_MODE env (nofwd) + verify default absen", !("forwardOrigin" in ci) && !relays2[0].msg.messageContextInfo.botMetadata.verificationMetadata);
}

// ═══ 5. TANPA cert fetch — sendRichResponse murni offline (akar "g mncul": titik gagal jaringan ke GitHub dibuang) ═══
w("\n— tanpa cert fetch (offline murni) —");
{
  let httpCalled = 0;
  _setAirichHttpForTest({ getJson: async () => { httpCalled++; return ["x"]; } });
  const relays3 = [];
  const sock3 = { relayMessage: async (chat, msg, o) => { relays3.push({ chat, msg }); return {}; } };
  await sendRichResponse(sock3, "g@test", HTML, { title: "offline" });
  t("  relay sukses TANPA nyentuh http (cert lokal)", httpCalled === 0 && relays3.length === 1, "http=" + httpCalled);
  _resetAirichHttpForTest();
}

// ═══ 6. notif tombol unduh (request owner 4 Okt 2026) ═══
w("\n— notif tombol unduh —");
{
  let replied = null;
  const mMock = { reply: async (t) => { replied = t; return t; } };
  const r = await notifyRichDownload(mMock);
  t("  notifyRichDownload ngirim reply", typeof r === "string" && !!replied);
  t("  isi notif menyebut tombol Unduh", (replied || "").includes("Unduh"), JSON.stringify(replied).slice(0, 80));
  const throwM = { reply: async () => { throw new Error("boom"); } };
  const r2 = await notifyRichDownload(throwM);
  t("  notifyRichDownload anti-throw (gagal reply = null)", r2 === null);
}
{
  const fs = await import("node:fs/promises");
  for (const f of ["plugins/airich/googleairich.js", "plugins/airich/youtubeairich.js", "plugins/airich/plane.js", "plugins/ai/aicard.js"]) {
    const src = await fs.readFile(new URL("../../" + f, import.meta.url), "utf-8");
    t("  " + f.split("/").pop() + " manggil notifyRichDownload sebelum kartu", src.includes("await notifyRichDownload(m);"));
  }
  const hub = await fs.readFile(new URL("../../plugins/airich/airich.js", import.meta.url), "utf-8");
  t("  hub .airich tips nyebut tombol Unduh", hub.includes("Unduh"));
}

w("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
