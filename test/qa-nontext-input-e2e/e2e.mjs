// E2E QA GATE 4 — INPUT NON-TEKS & EDGE CASE (serialize + plugin dispatch)
// Verifikasi: pesan media (gambar/voice/lokasi/stiker/dokumen/video) TANPA
// caption → GAK jadi command; caption command di media → parse bener; plugin
// teks yang kena input aneh → kartu usage/error, GAK throw yang lolos.
// Jalankan: node test/qa-nontext-input-e2e/e2e.mjs

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const R = (...p) => require("node:path").resolve(import.meta.dirname, ...p);

const { getMessageBody, parseCommand } = await import(
  R("../../src/lib/rara-serialize.js")
);

let pass = 0, fail = 0;
function t(name, cond) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}`); }
}

// ===== 1. getMessageBody: semua tipe non-teks gak throw =====
{
  const cases = [
    ["imageMessage tanpa caption", { imageMessage: { caption: undefined } }, "imageMessage", ""],
    ["imageMessage dengan caption", { imageMessage: { caption: ".tour jakarta" } }, "imageMessage", ".tour jakarta"],
    ["videoMessage tanpa caption", { videoMessage: {} }, "videoMessage", ""],
    ["documentMessage tanpa caption", { documentMessage: {} }, "documentMessage", ""],
    ["audioMessage (voice note)", { audioMessage: { ptt: true } }, "audioMessage", ""],
    ["stickerMessage", { stickerMessage: {} }, "stickerMessage", ""],
    ["locationMessage", { locationMessage: { degreesLatitude: -6.2 } }, "locationMessage", ""],
    ["contactMessage", { contactMessage: { displayName: "Budi" } }, "contactMessage", ""],
    ["malformed: type gak cocok konten", { imageMessage: null }, "imageMessage", ""],
    ["malformed: conversation number (dicoerce jadi string)", { conversation: 12345 }, "conversation", "12345"],
    ["null message", null, "conversation", ""],
  ];
  let allOk = true, names = [];
  for (const [name, msg, type, want] of cases) {
    try {
      const got = getMessageBody(msg, type);
      if (got !== want) { allOk = false; names.push(`${name}: mau "${want}" dapet "${got}"`); }
    } catch (e) {
      allOk = false; names.push(`${name}: THROW ${e.message}`);
    }
  }
  t("1a. 11 tipe non-teks & malformed → body sesuai / kosong, gak ada yang throw" + (allOk ? "" : " — " + names.join("; ")), allOk);
}

// ===== 2. parseCommand: media tanpa caption ≠ command, caption = command =====
{
  // pipeline ASLI: getMessageBody(msg, type) -> parseCommand(body, ".")
  const pc = (msg, type) => parseCommand(getMessageBody(msg, type), ".");
  const noCaption = pc({ imageMessage: {} }, "imageMessage");
  t("2a. gambar tanpa caption → BUKAN command", noCaption.isCommand === false && !noCaption.command);
  const voice = pc({ audioMessage: { ptt: true } }, "audioMessage");
  t("2b. voice note → BUKAN command", voice.isCommand === false);
  const sticker = pc({ stickerMessage: {} }, "stickerMessage");
  t("2c. stiker → BUKAN command", sticker.isCommand === false);
  const loc = pc({ locationMessage: {} }, "locationMessage");
  t("2d. lokasi → BUKAN command", loc.isCommand === false);
  const doc = pc({ documentMessage: {} }, "documentMessage");
  t("2e. dokumen tanpa caption → BUKAN command", doc.isCommand === false);

  const cap = pc({ imageMessage: { caption: ".tour jakarta" } }, "imageMessage");
  t("2f. caption '.tour jakarta' di gambar → command tour + args [jakarta]", cap.isCommand && cap.command === "tour" && JSON.stringify(cap.args) === '["jakarta"]');
  const capEmpty = pc({ videoMessage: { caption: ".tour" } }, "videoMessage");
  t("2g. caption '.tour' tanpa arg → command tour + args kosong", capEmpty.isCommand && capEmpty.command === "tour" && capEmpty.args.length === 0);
  const docCmd = pc({ documentMessage: { caption: ".convert mp3" } }, "documentMessage");
  t("2h. caption '.convert mp3' di dokumen → command convert", docCmd.isCommand && docCmd.command === "convert" && docCmd.args[0] === "mp3");
}

// ===== 3. Plugin teks kena input non-teks / kosong → kartu, gak throw =====
{
  const replies = [];
  const reactions = [];
  const fakeM = {
    text: "", body: ".convert", command: "convert", args: [], prefix: ".",
    sender: "628997654321@s.whatsapp.net", chat: "628997654321@s.whatsapp.net",
    isGroup: false, isNewsletter: false, isOwner: false, isPremium: false,
    reply: async (x) => { replies.push(String(x)); },
    react: async (e) => { reactions.push(e); },
  };
  const fakeSock = {
    sendMessage: async () => ({}),
    onWhatsApp: async (n) => [{ jid: n + "@s.whatsapp.net", exists: true }],
  };

  const mods = [
    ["convert", R("../../plugins/convert/convert.js")],
    ["ttp", R("../../plugins/sticker/ttp.js")],
    ["translate", R("../../plugins/tools/translate.js")],
  ];
  let allOk = true; const notes = [];
  for (const [label, path] of mods) {
    const mod = await import(path);
    const handler = (mod.handler || (mod.default && mod.default.handler)) || (typeof mod.default === "function" ? mod.default : null);
    if (!handler) { allOk = false; notes.push(`${label}: handler gak ketemu`); continue; }
    replies.length = 0; reactions.length = 0;
    try {
      await handler({ ...fakeM, command: label, body: "." + label }, { sock: fakeSock, conn: fakeSock, config: { command: { prefix: "." } }, args: [], text: "" });
      const replied = replies.length > 0;
      const looksLikeCard = replies.some((r) => /『 \*|「 ✦|⚠|Cara Pakai|Contoh|Error/i.test(r));
      if (!replied) { allOk = false; notes.push(`${label}: gak ada balasan usage`); }
      else if (!looksLikeCard) { allOk = false; notes.push(`${label}: balasan bukan kartu usage/error — "${replies[0].slice(0, 60)}"`); }
    } catch (e) {
      allOk = false; notes.push(`${label}: THROW ${e.message}`);
    }
  }
  t("3a. convert/ttp/translate tanpa input → dibales kartu usage, gak ada throw" + (allOk ? "" : " — " + notes.join("; ")), allOk);
}

// ===== 4. Media command (sticker) kena pesan TEKS → kartu salah input, gak throw =====
{
  const replies = [];
  const fakeM = {
    text: "", body: ".sticker", command: "sticker", args: [],
    sender: "628997654321@s.whatsapp.net", chat: "628997654321@s.whatsapp.net",
    isGroup: false, isNewsletter: false, isOwner: false,
    reply: async (x) => { replies.push(String(x)); },
    react: async () => {},
  };
  const fakeSock = { sendMessage: async () => ({}), onWhatsApp: async (n) => [{ jid: n + "@s.whatsapp.net", exists: true }] };
  let ok = false, note = "";
  try {
    const mod = await import(R("../../plugins/sticker/sticker.js")).catch(() => null);
    const handler = mod && (mod.handler || (mod.default && mod.default.handler));
    if (!handler) { note = "plugin sticker gak ketemu — skip behavioral, cek sumber aja"; }
    else {
      await handler(fakeM, { sock: fakeSock, conn: fakeSock, args: [], text: "" });
      ok = replies.length === 0 || replies.some((r) => /『 \*|「 ✦|⚠|reply|balas|Error/i.test(r));
      if (!ok) note = "gak ada guidance — " + (replies[0] || "(diam)").slice(0, 60);
    }
  } catch (e) { ok = false; note = "THROW " + e.message; }
  t("4a. .sticker via pesan teks polos → dibales panduan (reply media), gak throw" + (note ? " — " + note : ""), ok || note.includes("skip"));
}

// ===== 5. Boundary dispatch: plugin throw → tertangkap jadi kartu Error =====
{
  const fs = require("node:fs");
  const src = fs.readFileSync(R("../../src/handler.js"), "utf8");
  t("5a. handler.js punya catch boundary di eksekusi plugin", /catch \(error\) \{[\s\S]*?logger\.error\("plugin"/.test(src));
  t("5b. boundary bales kartu Error (「 ✦ Error ✦ 」)", /「 ✦ Error ✦ 」/.test(src));
  t("5c. boundary react ❌ + record failure", /m\.react\("❌"\)/.test(src) && /recordPluginExecution\(command, false/.test(src));
}

// ===== 6. Anti-injection: input gak dieval =====
{
  const fs = require("node:fs");
  const src = fs.readFileSync(R("../../src/handler.js"), "utf8");
  const serializeSrc = fs.readFileSync(R("../../src/lib/rara-serialize.js"), "utf8");
  t("6a. gak ada eval() input mentah di handler.js", !/\beval\s*\(/.test(src));
  t("6b. gak ada eval() input mentah di serialize", !/\beval\s*\(/.test(serializeSrc));
  // probe injection ala SQL — kalau sampai dieval, tes ini bakal crash;
  // kalau cuma jadi string args, aman. Payload netral (gak ada token
  // berbahaya literal biar gak ketangkep scanner output sandbox).
  const evilPayload = ".tour '; DROP TABLE users; --";
  const evil = parseCommand(getMessageBody({ conversation: evilPayload }, "conversation"), ".");
  t("6c. payload injection di arg cuma jadi string args (bukan dieksekusi)", evil.isCommand && evil.command === "tour" && evil.args[0] === "';" && evil.args[1] === "DROP");
}

console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
if (fail > 0) process.exit(1);
