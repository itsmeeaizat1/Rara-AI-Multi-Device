// RARA AI WHATSAPP BOT — E2E: AUTOSUMMARY UPGRADE HISTORI PERSISTEN
// Fitur #1 owner 21 Sep: ringkasan grup terjadwal kini baca chathistory.json
// (persisten, tetap ada walau restart) — buffer in-memory jadi fallback.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const R = path.resolve(".");
let pass = 0, fail = 0;
const t = (name, cond, extra = "") => {
  if (cond) { pass++; }
  else { fail++; console.log(`  ❌ ${name}${extra ? " → " + JSON.stringify(extra)?.slice(0, 200) : ""}`); }
};

// ── setup: database tmp ──
const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), "autosum-e2e-"));
const { initDatabase, getDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(path.join(dbDir, "db"));

const chatlog = await import(R + "/src/lib/rara-chat-log.js");
const as = await import(R + "/plugins/owner/autosummary.js");
const { collectMessages, groupJidsWithMessages, messageBuffers, generateFallbackSummary, DEFAULT_AUTOSUMMARY, getSettings } = as._autosummaryInternalsForTest();

const cfg = { command: { prefix: "." } };
const GRP = "62812 grup test@g.us".replace(/\s+/g, ""); // 62812gruptest@g.us
const GRP2 = "62813grupkedua@g.us";
const PRIVATE = "628111111111@s.whatsapp.net";
const now = Date.now();
const OLD = Math.floor((now - 30 * 60 * 60 * 1000) / 1000); // 30 jam lalu (luar jendela 24h)
const FRESH = Math.floor(now / 1000);

const mkRaw = (body, sender, chat, ts, type = "conversation") => ({
  key: { remoteJid: chat, participant: sender + "@s.whatsapp.net", fromMe: false },
  message: type === "conversation" ? { conversation: body } : { [type]: { caption: body } },
  messageTimestamp: ts,
});

console.log("— section 1: collectMessages dari histori persisten —");
{
  // grup utama: 3 pesan segar + 1 pesan lama (harus kebuang dari jendela 24h)
  chatlog.recordChatMessage(mkRaw("rapat besok jam 8", "62811", GRP, FRESH - 100), cfg);
  chatlog.recordChatMessage(mkRaw("siapa yang bawa kabel hdmi?", "62822", GRP, FRESH - 50), cfg);
  chatlog.recordChatMessage(mkRaw("aku bawa deh", "62833", GRP, FRESH - 10), cfg);
  chatlog.recordChatMessage(mkRaw("pesan kemarin lusa", "62811", GRP, OLD), cfg);
  // media tanpa caption → placeholder jenis
  chatlog.recordChatMessage(mkRaw("", "62844", GRP, FRESH - 5, "imageMessage"), cfg);

  const msgs = collectMessages(GRP);
  t("1a. pesan segar kebaca dari persisten", msgs.length === 4, msgs.length);
  t("1b. pesan 30 jam lalu kebuang (jendela 24h)", !msgs.some((x) => x.text === "pesan kemarin lusa"), msgs.map(x=>x.text));
  t("1c. isi + sender kebaca", msgs.some((x) => x.sender === "62822" && x.text.includes("hdmi")), msgs[0]);
  t("1d. media tanpa caption → placeholder (foto)", msgs.some((x) => x.text === "(foto)"), msgs.map(x=>x.text));
}

console.log("— section 2: groupJidsWithMessages —");
{
  // grup kedua: hanya pesan LAMA → gak masuk daftar
  chatlog.recordChatMessage(mkRaw("obrolan basi", "62877", GRP2, OLD), cfg);
  // chat PRIVATE dengan pesan segar → gak boleh ikut (bukan grup)
  chatlog.recordChatMessage(mkRaw("halo di dm", "62811", PRIVATE, FRESH), cfg);

  const jids = groupJidsWithMessages();
  t("2a. grup dengan pesan segar masuk daftar", jids.includes(GRP), jids);
  t("2b. grup cuma pesan lama gak masuk", !jids.includes(GRP2), jids);
  t("2c. chat private gak ikut (khusus @g.us)", !jids.includes(PRIVATE), jids);
}

console.log("— section 3: fallback buffer in-memory —");
{
  // grup TANPA histori → buffer fallback (buffer cuma nyala saat fitur ON — by design)
  getSettings().enabled = true;
  getDatabase().db.write();
  const GRP3 = "62814grupbuffer@g.us";
  as.logMessageForSummary({ isGroup: true, fromMe: false, chat: GRP3, sender: "62899@s.whatsapp.net", pushName: "Budi", text: "buffer aja nih" });
  const msgs = collectMessages(GRP3);
  t("3a. histori kosong → buffer fallback jalan", msgs.length === 1 && msgs[0].text === "buffer aja nih", msgs.length);
  t("3b. buffer pakai pushName", msgs[0]?.sender === "Budi", msgs[0]);
  const jids = groupJidsWithMessages();
  t("3c. grup buffer ikut daftar", jids.includes(GRP3), jids);
  // histori utama TETAP diprioritaskan, bukan buffer
  const msgsGrp = collectMessages(GRP);
  t("3d. histori persisten diprioritaskan atas buffer", msgsGrp.every((x) => typeof x.sender === "string" && !isNaN(Number(x.sender)) || x.sender === "user") && !msgsGrp.some((x) => x.text === "buffer aja nih"), true);
}

console.log("— section 4: persisten — tetap ada walau restart —");
{
  getDatabase().flushAll?.();
  await new Promise((r) => setTimeout(r, 700));
  const histFile = path.join(dbDir, "db", "chathistory.json");
  const onDisk = JSON.parse(fs.readFileSync(histFile, "utf8"));
  const rows = onDisk?.[GRP] || [];
  t("4a. pesan grup nyimpen di chathistory.json (persisten)", Array.isArray(rows) && rows.length === 5, rows.length);
  // baca ulang dari disk (seperi restart) → jendela tetap kebaca
  const reloaded = JSON.parse(fs.readFileSync(histFile, "utf8"));
  const freshRows = (reloaded?.[GRP] || []).filter((r) => r.t >= now - 24 * 60 * 60 * 1000);
  t("4b. setelah restart jendela 24h tetap ada isinya", freshRows.length === 4, freshRows.length);
}

console.log("— section 5: default & fallback summary —");
{
  t("5a. default kirim PAGI 07:00", DEFAULT_AUTOSUMMARY.sendTime === "07:00", DEFAULT_AUTOSUMMARY.sendTime);
  t("5b. default kirim ke DM owner", DEFAULT_AUTOSUMMARY.sendTo === "owner", DEFAULT_AUTOSUMMARY.sendTo);
  const msgs = collectMessages(GRP);
  const fb = generateFallbackSummary("Grup Test", msgs);
  t("5c. fallback stats-based summary tetap jalan (AI mati gak mati fitur)", typeof fb === "string" && fb.length > 30, fb?.slice(0, 60));
  const s = getSettings();
  t("5d. settings db jalan (merge default)", s && typeof s.enabled === "boolean", s?.enabled);
}

console.log("— section 6: handler dasar —");
{
  const { handler, config: pc } = as;
  const replies = [];
  const m = {
    text: "", args: [], chat: "628111111111@s.whatsapp.net",
    sender: "628111111111@s.whatsapp.net", isOwner: true, isGroup: false,
    reply: async (x) => { replies.push(String(x)); },
  };
  await handler(m, { sock: null, db: getDatabase(), config: cfg });
  t("6a. dashboard status dibalas", replies.length === 1, replies.length);
  const flat = replies[0] || "";
  t("6b. nunjukin kirim 07:00", flat.includes("07:00"), flat.slice(0, 80));
  t("6c. sendto owner kebaca", /owner/i.test(flat), flat.slice(0, 80));
  t("6d. owner-only flag aktif", pc.isOwner === true, pc.isOwner);
}

console.log(`\n===== ${pass} PASS, ${fail} FAIL =====`);
fs.rmSync(dbDir, { recursive: true, force: true });
process.exit(fail > 0 ? 1 : 0);
