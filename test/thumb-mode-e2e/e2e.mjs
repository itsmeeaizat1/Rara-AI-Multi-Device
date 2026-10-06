// E2E: notif card gif/mp4 + mode, command .setusagethumb/.setnotifthumb, resolver
import fs from "fs"; import path from "path";
const R = path.resolve("."); process.chdir(R);
let pass = 0, fail = 0; const w = (s) => process.stdout.write(s + "\n");
const t = (n, c, x) => { c ? (pass++, w("  ✅ " + n)) : (fail++, w("  ❌ " + n + (x ? " — " + x : ""))); };
const { initDatabase, getDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase("/tmp/thumbmode-e2e-db/rara.json");
const db = getDatabase();
const { sendNotifCard } = await import(R + "/src/lib/rara-notif-card.js");
const { normalizeMode, resolveThumbAsset } = await import(R + "/src/lib/rara-thumb-asset.js");
const plug = await import(R + "/plugins/owner/setusagethumb.js");

t("n1. normalizeMode alias", normalizeMode("gambar") === "image" && normalizeMode("gif") === "video" && normalizeMode("OTOMATIS") === "auto" && normalizeMode("xx") === null);

const dir = path.join(R, "assets/image/notif/system");
fs.mkdirSync(dir, { recursive: true });
const clean = () => { for (const f of fs.readdirSync(dir)) if (f.startsWith("zz")) fs.rmSync(path.join(dir, f)); };
const mk = () => { const o = {}; o.sock = { user: { id: "1:5@s.whatsapp.net" },
  waUploadToServer: async () => ({ url: "u", mediaKey: Buffer.alloc(32), fileSha256: Buffer.alloc(32), fileEncSha256: Buffer.alloc(32), directPath: "/x" }),
  relayMessage: async (j, st) => { o.st = st; return {}; }, sendMessage: async (j, p) => { o.plain = p; return {}; } }; return o; };
const hdr = (o) => o.st?.viewOnceMessage?.message?.interactiveMessage?.header;
try {
  clean(); db.setting("notifThumbMode", "auto");
  fs.writeFileSync(path.join(dir, "zznotif.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  let o = mk(); await sendNotifCard(o.sock, "1@s.whatsapp.net", "tes", { name: "zznotif" });
  t("n2. notif png → imageMessage", !!hdr(o)?.imageMessage);
  fs.writeFileSync(path.join(dir, "zznotif.mp4"), Buffer.from("....ftypmp42"));
  o = mk(); await sendNotifCard(o.sock, "1@s.whatsapp.net", "tes", { name: "zznotif" });
  t("n3. auto: mp4 menang → videoMessage", !!hdr(o)?.videoMessage);
  db.setting("notifThumbMode", "image");
  o = mk(); await sendNotifCard(o.sock, "1@s.whatsapp.net", "tes", { name: "zznotif" });
  t("n4. mode image: mp4 diabaikan", !!hdr(o)?.imageMessage && !hdr(o)?.videoMessage);
  clean(); db.setting("notifThumbMode", "auto");
  o = mk(); await sendNotifCard(o.sock, "1@s.whatsapp.net", "tes", { name: "zznotif", image: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) });
  t("n5. tanpa asset fitur + canvas opts.image → canvas kepakai", !!hdr(o)?.imageMessage);
  o = mk(); await sendNotifCard(o.sock, "1@s.whatsapp.net", "tes", { name: "zznotif" });
  t("n6. tanpa asset & tanpa canvas → placeholder", !!hdr(o));
  o = mk(); await sendNotifCard(o.sock, "120@newsletter", "tes", { name: "zznotif" });
  t("n7. saluran tetap polos", !!o.plain && !o.st);
} finally { clean(); db.setting("notifThumbMode", "auto"); }

// command owner
const reps = []; const mm = (cmd, args) => ({ command: cmd, args, prefix: ".", reply: async (x) => reps.push(x) });
await plug.handler(mm("setusagethumb", ["video"]), { db });
t("c1. .setusagethumb video → usageThumbMode=video", db.setting("usageThumbMode") === "video");
await plug.handler(mm("setnotifthumb", ["gambar"]), { db });
t("c2. .setnotifthumb gambar → notifThumbMode=image", db.setting("notifThumbMode") === "image");
await plug.handler(mm("setusagethumb", ["ngawur"]), { db });
t("c3. mode ngawur ditolak, setting tetap", db.setting("usageThumbMode") === "video" && /tidak valid/i.test(reps.at(-1)));
await plug.handler(mm("setusagethumb", []), { db });
t("c4. tanpa argumen → tampil mode aktif", /video/.test(reps.at(-1)));
await plug.handler(mm("setusagethumb", ["auto"]), { db }); await plug.handler(mm("setnotifthumb", ["auto"]), { db });
t("c5. balik auto", db.setting("usageThumbMode") === "auto" && db.setting("notifThumbMode") === "auto");

w(`\n===== ${pass} PASS, ${fail} FAIL =====`); process.exit(fail ? 1 : 0);
