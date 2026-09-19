// E2E: penilaian — tombol Support menu "Beri Penilaian" + flow rating popup
// Jalankan dari repo root: node test/penilaian-e2e/e2e.mjs
import path from "node:path";
import { pathToFileURL } from "node:url";
import fs from "node:fs";

const out = (s) => process.stdout.write(s + "\n");
let pass = 0, fail = 0;
function t(label, cond, extra) {
  if (cond) pass++;
  else { fail++; out("FAIL: " + label + " " + (extra || "")); }
}

const REPO = path.resolve(".");
const { fromSC, toSC } = await import(pathToFileURL(path.join(REPO, "src/lib/styler.js")).href);

// DB real (pola welcome-e2e): handler manggil getDatabase() internal
fs.rmSync("/tmp/penilaian-e2e-db", { recursive: true, force: true });
const { initDatabase, getDatabase } = await import(pathToFileURL(path.join(REPO, "src/lib/nova-database.js")).href);
await initDatabase("/tmp/penilaian-e2e-db/nova.json");
const db = getDatabase();

const { config: pluginConfig, handler: penilaianHandler } =
  await import(pathToFileURL(path.join(REPO, "plugins/info/penilaian.js")).href);

// ── plugin config ──
t("config: name = penilaian", pluginConfig.name === "penilaian");
t("config: alias ada (rating/rate/nilaibot)", ["rating", "rate", "nilaibot"].every((a) => pluginConfig.alias.includes(a)));
t("config: kategori info, isEnabled", pluginConfig.category === "info" && pluginConfig.isEnabled === true);

// ── mock util ──
const sent = [], replies = [];
function mockM(text, opts = {}) {
  return {
    text, prefix: ".", command: "penilaian", args: text.split(/\s+/),
    chat: opts.chat || "628111122222@s.whatsapp.net",
    sender: opts.sender || "6289999000001@s.whatsapp.net",
    pushName: opts.pushName || "Penguji",
    chatName: opts.chatName || "Private Chat",
    isGroup: false, isOwner: false, quoted: null,
    react: async () => {},
    reply: async (txt) => replies.push(String(txt)),
  };
}
function mockSock() {
  return {
    sendMessage: async (jid, payload) => { sent.push({ jid, payload }); return true; },
  };
}
const botConfig = {
  bot: { name: "Nova AI", version: "9.0" },
  command: { prefix: "." },
  owner: { number: ["6281234567890"] },
};

// ── case 1: tanpa argumen → kartu popup rating (interactiveMessage) ──
{
  replies.length = 0; sent.length = 0;
  db.data.penilaian = [];
  await db.save();
  const m = mockM(".penilaian");
  await penilaianHandler(m, { sock: mockSock(), config: botConfig });
  t("no-arg: interactiveMessage terkirim", sent.length === 1 && !!sent[0].payload.interactiveMessage);
  const im = sent[0]?.payload?.interactiveMessage;
  const body = im ? fromSC(im.body?.text || "") : "";
  t("no-arg: body mengundang kasih penilaian", /beri penilaian bot/i.test(body), body.slice(0, 120));
  t("no-arg: body nunjukin belum ada penilaian (stats kosong)", /belum ada yang kasih penilaian/i.test(body));
  const btns = im?.nativeFlowMessage?.buttons || [];
  const selectBtn = btns.find((b) => {
    try { return b.name === "single_select" && JSON.parse(b.buttonParamsJson).sections?.[0]?.rows?.length; } catch { return false; }
  });
  t("no-arg: ada 2 placeholder unlock dulu (trik Elaina V3)",
    btns.length >= 3 && btns[0].name === "single_select" && btns[1].name === "call_permission_request");
  t("no-arg: popup single_select ada", !!selectBtn);
  if (selectBtn) {
    const params = JSON.parse(selectBtn.buttonParamsJson);
    const rows = params.sections[0].rows;
    t("no-arg: 5 pilihan rating di popup", rows.length === 5, "dapat " + rows.length);
    t("no-arg: ada pilihan Puas Banget ⭐⭐⭐⭐⭐", rows.some((r) => /puas banget/i.test(fromSC(r.title)) && (r.title.match(/⭐/g) || []).length === 5));
    t("no-arg: ada pilihan Kecewa ⭐", rows.some((r) => /kecewa/i.test(fromSC(r.title))));
    t("no-arg: id row format .penilaian <nilai>", rows.every((r) => /^\.penilaian [1-5]$/.test(r.id || r.rowId || "")), JSON.stringify(rows.map((r) => r.id || r.rowId)));
  }
}

// ── case 2: .penilaian 5 → simpan + makasih + notif owner ──
{
  replies.length = 0; sent.length = 0;
  db.data.penilaian = [];
  await db.save();
  await penilaianHandler(mockM(".penilaian 5"), { sock: mockSock(), config: botConfig });
  const rec = (db.data.penilaian || [])[0];
  t("nilai 5: tersimpan ke db.data.penilaian", !!rec && rec.rating === 5, JSON.stringify(rec));
  t("nilai 5: label Puas Banget + nama pengirim", rec && rec.label === "Puas Banget" && rec.fromName === "Penguji");
  const thanks = fromSC(replies[0] || "");
  t("nilai 5: reply terima kasih + bintang", /terima kasih/i.test(thanks) && thanks.includes("⭐⭐⭐⭐⭐"));
  t("nilai 5: reply nunjukin owner dapet notifikasi", /owner udah dapet notifikasi/i.test(thanks));
  const dmOwner = sent.find((s) => s.jid === "6281234567890@s.whatsapp.net");
  t("nilai 5: DM ke owner terkirim", !!dmOwner);
  if (dmOwner) {
    const dm = fromSC(dmOwner.payload.text || "");
    t("nilai 5: DM label 'Penilaian Masuk' + rating", /penilaian masuk/i.test(dm) && /puas banget/i.test(dm));
  }
}

// ── case 3: label santai — ".penilaian puas banget" & "kecewa" ──
{
  replies.length = 0; sent.length = 0;
  db.data.penilaian = [];
  await db.save();
  await penilaianHandler(mockM(".penilaian puas banget"), { sock: mockSock(), config: botConfig });
  t("label 'puas banget' → rating 5", (db.data.penilaian[0] || {}).rating === 5);
  await penilaianHandler(mockM(".penilaian kecewa"), { sock: mockSock(), config: botConfig });
  t("label 'kecewa' → rating 1", (db.data.penilaian[1] || {}).rating === 1);
}

// ── case 4: argumen invalid (99/abc) → popup lagi, gak nyimpen ──
{
  sent.length = 0; replies.length = 0;
  db.data.penilaian = [];
  await db.save();
  await penilaianHandler(mockM(".penilaian 99"), { sock: mockSock(), config: botConfig });
  t("invalid '99': gak nyimpen, popup dikirim", (db.data.penilaian || []).length === 0 && sent.length === 1 && !!sent[0].payload.interactiveMessage);
  sent.length = 0;
  await penilaianHandler(mockM(".penilaian abc"), { sock: mockSock(), config: botConfig });
  t("invalid 'abc': popup lagi", sent.length === 1 && !!sent[0].payload.interactiveMessage);
}

// ── case 5: owner kosong → tetap makasih, tanpa klaim notifikasi ──
{
  replies.length = 0; sent.length = 0;
  db.data.penilaian = [];
  await db.save();
  const cfgNoOwner = { ...botConfig, owner: { number: [] } };
  await penilaianHandler(mockM(".penilaian 4"), { sock: mockSock(), config: cfgNoOwner });
  const thanks = fromSC(replies[0] || "");
  t("owner kosong: tetap tersimpan + makasih", /terima kasih/i.test(thanks) && (db.data.penilaian[0] || {}).rating === 4);
  t("owner kosong: gak klaim 'owner udah dapet notifikasi'", !/owner udah dapet notifikasi/i.test(thanks));
  t("owner kosong: gak ada DM terkirim", sent.length === 0);
}

// ── case 6: stats kosong vs isi ──
{
  replies.length = 0;
  db.data.penilaian = [];
  await db.save();
  await penilaianHandler(mockM(".penilaian stats"), { sock: mockSock(), config: botConfig });
  t("stats kosong: 'belum ada penilaian'", /belum ada penilaian/i.test(fromSC(replies[0] || "")));

  replies.length = 0;
  db.data.penilaian = [
    { rating: 5, createdAt: Date.now() },
    { rating: 4, createdAt: Date.now() },
    { rating: 5, createdAt: Date.now() },
  ];
  await db.save();
  await penilaianHandler(mockM(".penilaian stats"), { sock: mockSock(), config: botConfig });
  const s = fromSC(replies[0] || "");
  t("stats isi: rata-rata 4.7 dari 3 penilai", /4\.7\/5/.test(s) && /\(3 penilai\)/.test(s), s.slice(0, 150));
  t("stats isi: breakdown bintang tampil", /⭐⭐⭐⭐⭐\s+2/.test(s) && /⭐⭐⭐⭐\s+1/.test(s), s.slice(0, 200));
}

// ── case 7: tombol Support menu card ada row "Beri Penilaian" ──
{
  const { buildNavButtons } = await import(pathToFileURL(path.join(REPO, "src/lib/nova-menu-card.js")).href);
  const m = { sender: "6289999000001@s.whatsapp.net", isGroup: false };
  const btns = buildNavButtons(m, db, ".");
  const support = btns.find((b) => b.type === "single_select" && /support/i.test(fromSC(b.text || "")));
  t("menu card: tombol Support ada", !!support);
  const rows = support?.sections?.[0]?.rows || [];
  const rateRow = rows.find((r) => /beri penilaian/i.test(fromSC(r.title || "")));
  t("menu card: Support popup ada row 'Beri Penilaian'", !!rateRow);
  t("menu card: row id = .penilaian", rateRow && rateRow.id === ".penilaian", JSON.stringify(rateRow));
}

// ── case 8: info section menu/allmenu nunjukin Rating dari db (persist) ──
{
  const { buildMenuInfo } = await import(pathToFileURL(path.join(REPO, "src/lib/nova-info-section.js")).href);
  const m = { sender: "6289999000001@s.whatsapp.net", isGroup: false, isOwner: false, isPremium: false, timestamp: 0 };

  // kosong → "-/5.0 (belum ada)"
  db.data.penilaian = [];
  await db.save();
  let res = await buildMenuInfo(m, { db, config: botConfig, uptime: 60000 });
  let row = res.info.find((r) => r && r.label === "Rating");
  t("info section: row Rating ada", !!row);
  t("info section: kosong → '-/5.0 (belum ada)'", row && row.value === "-/5.0 (belum ada)", JSON.stringify(row));

  // isi 3 rating (5,4,5 → 4.7) → "4.7/5.0 (3 penilai)"
  db.data.penilaian = [
    { rating: 5, createdAt: Date.now() },
    { rating: 4, createdAt: Date.now() },
    { rating: 5, createdAt: Date.now() },
  ];
  await db.save(); // persist biar gak ilang — sumber db.data.penilaian beneran
  res = await buildMenuInfo(m, { db, config: botConfig, uptime: 60000 });
  row = res.info.find((r) => r && r.label === "Rating");
  t("info section: 3 penilai → '4.7/5.0 (3 penilai)'", row && row.value === "4.7/5.0 (3 penilai)", JSON.stringify(row));
  t("info section: label Rating smallcaps utuh (dari toSC pipeline gak nyampur)", typeof row?.value === "string");

  // rating sampah gak dihitung (0, 99, abc → di-filter)
  db.data.penilaian = [{ rating: 0 }, { rating: 99 }, { rating: "abc" }, { rating: 5 }];
  await db.save();
  res = await buildMenuInfo(m, { db, config: botConfig, uptime: 60000 });
  row = res.info.find((r) => r && r.label === "Rating");
  t("info section: rating invalid di-filter (cuma 5 → '5.0/5.0 (1 penilai)')", row && row.value === "5.0/5.0 (1 penilai)", JSON.stringify(row));
}

out(`\n${pass}/${pass + fail} pass`);
process.exit(fail ? 1 : 0);
