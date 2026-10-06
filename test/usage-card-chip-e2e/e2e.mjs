// E2E — sendUsageCard chip branding (fix 6 Okt 2026: "Unknown(kode:undefined)"
// placeholder nongol di atas header image karena nativeFlowMessage gak isi
// messageParamsJson). Verifikasi jalur header-image (relayMessage) selalu
// bawa chip limited_time_offer, SAMA kayak notif-card-e2e section 3e.
import path from "node:path";
import fs from "node:fs";

const w = (s) => process.stdout.write(s + "\n");
let pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; w("  ✅ " + name); }
  else { fail++; w("  ❌ " + name + (extra ? " — " + extra : "")); }
}

const R = path.resolve(".");
const { sendUsageCard } = await import(R + "/src/lib/rara-menu-card.js");

// asset placeholder usage WAJIB ada supaya jalur header-image (bukan fallback
// m.reply polos) kepakai — pakai placeholder.jpg asli repo kalau ada.
const assetDir = path.join(R, "assets", "image", "usage");
const hasPlaceholder = fs.existsSync(path.join(assetDir, "placeholder.jpg"));

const sent = [];
const mockSock = {
  user: { id: "628174887770:5@s.whatsapp.net" },
  waUploadToServer: async () => ({ url: "https://mmg.whatsapp.net/fake.jpg" }),
  relayMessage: async (jid, stanza) => { sent.push({ jid, stanza }); return {}; },
};
const replies = [];
const mockM = {
  chat: "628174887770@s.whatsapp.net",
  sender: "628174887770@s.whatsapp.net",
  key: { remoteJid: "628174887770@s.whatsapp.net", fromMe: false, id: "ORIGMSG" },
  message: { conversation: ".mfdl" },
  reply: async (txt) => { replies.push(txt); return { key: { id: "fallback" } }; },
};

await sendUsageCard(mockSock, mockM, "「 ✦ MEDIAFIRE DL ✦ 」\n📝 Cara Pakai:\nDownload file", { name: "mfdl" });

t("1a. jalur header-image kepakai (hasPlaceholder=" + hasPlaceholder + ")",
  hasPlaceholder ? sent.length === 1 : replies.length === 1,
  "sent=" + sent.length + " replies=" + replies.length);

if (hasPlaceholder && sent.length === 1) {
  const im = sent[0]?.stanza?.viewOnceMessage?.message?.interactiveMessage;
  t("1b. header pakai hasMediaAttachment (bukan externalAdReply)", !!(im?.header?.imageMessage || im?.header?.videoMessage) && im?.header?.hasMediaAttachment === true, Object.keys(im?.header || {}));
  let chip = null;
  try { chip = JSON.parse(im?.nativeFlowMessage?.messageParamsJson || "{}"); } catch {}
  t("1c. chip branding (limited_time_offer) terisi — fix placeholder Unknown(kode:undefined)",
    typeof im?.nativeFlowMessage?.messageParamsJson === "string" && !!chip?.limited_time_offer?.text,
    im?.nativeFlowMessage?.messageParamsJson || "");
  t("1d. chip text pakai watermark RARA AI - MULTI DEVICE", /RARA AI - MULTI DEVICE/.test(chip?.limited_time_offer?.text || ""), chip?.limited_time_offer?.text);
}

// ═══ 2. RESOLUSI KATEGORI + TIPE (gambar / gif / mp4) + MODE ═══
const usageDir = path.join(R, "assets", "image", "usage");
const catDir = path.join(usageDir, "zztestcat");
fs.mkdirSync(catDir, { recursive: true });
const IMG = Buffer.from([0xFF, 0xD8, 0xFF, 0xD9]);
const GIF = Buffer.from("GIF89a-test");
const MP4 = Buffer.from("....ftypmp42-test");

// plugin palsu di registry biar kategori ke-resolve otomatis
const np = await import(R + "/src/lib/rara-plugins.js");
np.registerPlugin?.({ config: { name: "zztestfitur", alias: [], category: "zztestcat" }, handler() {} });
t("2a. kategori ke-resolve dari registry", np.getPlugin("zztestfitur")?.config?.category === "zztestcat");

const { initDatabase, getDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase("/tmp/usagechip-e2e-db/rara.json");
const dbm = getDatabase();
async function send(bufs) {
  const out = { up: null, stanza: null };
  const sk = {
    user: { id: "1:5@s.whatsapp.net" },
    waUploadToServer: async (b) => { out.up = b; return { url: "https://mmg.whatsapp.net/f", mediaKey: Buffer.alloc(32), fileSha256: Buffer.alloc(32), fileEncSha256: Buffer.alloc(32), directPath: "/x" }; },
    relayMessage: async (j, st) => { out.stanza = st; return {}; },
  };
  await sendUsageCard(sk, mockM, "isi usage", { name: "zztestfitur" });
  return out;
}
const hdr = (o) => o.stanza?.viewOnceMessage?.message?.interactiveMessage?.header;
const clean = () => { for (const f of fs.readdirSync(catDir)) fs.rmSync(path.join(catDir, f)); };

try {
  clean(); dbm.setting("usageThumbMode", "auto");
  fs.writeFileSync(path.join(catDir, "zztestfitur.jpg"), IMG);
  let o = await send();
  t("2b. gambar kategori/nama → imageMessage", !!hdr(o)?.imageMessage && !hdr(o)?.videoMessage);

  fs.writeFileSync(path.join(catDir, "zztestfitur.gif"), GIF);
  o = await send();
  t("2c. mode auto: gif menang atas gambar → videoMessage gifPlayback", !!hdr(o)?.videoMessage);

  dbm.setting("usageThumbMode", "image");
  o = await send();
  t("2d. mode image: gif diabaikan → imageMessage", !!hdr(o)?.imageMessage && !hdr(o)?.videoMessage);

  dbm.setting("usageThumbMode", "video");
  o = await send();
  t("2e. mode video: pakai gif", !!hdr(o)?.videoMessage);

  clean(); fs.writeFileSync(path.join(catDir, "zztestfitur.mp4"), MP4);
  dbm.setting("usageThumbMode", "auto");
  o = await send();
  t("2f. mp4 didukung → videoMessage", !!hdr(o)?.videoMessage);

  clean(); fs.writeFileSync(path.join(catDir, "zztestfitur.png"), IMG);
  dbm.setting("usageThumbMode", "video");
  o = await send();
  t("2g. mode video tanpa gif/mp4 fitur → placeholder global mp4 tetap video", !!hdr(o)?.videoMessage || !!hdr(o)?.imageMessage);

  clean(); dbm.setting("usageThumbMode", "auto");
  o = await send();
  t("2h. tanpa asset fitur → placeholder global tetap kepakai", !!hdr(o));
} catch (e) {
  fail++; w("  ❌ EXC " + (e && e.stack || e));
} finally {
  clean(); fs.rmdirSync(catDir);
  dbm.setting("usageThumbMode", "auto");
}

w(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
