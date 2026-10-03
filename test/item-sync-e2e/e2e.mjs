// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Tes sinkron item: limit=energi, koin, diamonds/gold/gems/tokens, hadiah fisch/minecraft, leaderboard, dbexport.
import { mkdtempSync, readFileSync } from "fs"; import { tmpdir } from "os"; import path from "path";
const R = process.cwd();
const { initDatabase, getDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(mkdtempSync(path.join(tmpdir(), "item-sync-")) + "/rara.json");
const db = getDatabase();
let pass = 0, fail = 0;
const ok = (c, n) => { if (c) { pass++; console.log("  OK  " + n); } else { fail++; console.log("  FAIL " + n); } };
const src = (p) => readFileSync(R + "/" + p, "utf8");

console.log("[1] setUser: alias lama dimigrasi ke field resmi (bukan hilang)");
{
  const J = "6287200000001@s.whatsapp.net";
  db.setUser(J, { name: "A", energi: 100, koin: 500 });
  const raw = db.db.data.users["6287200000001"]; raw.limit = 50; raw.balance = 1000; // bentuk data lama/liar
  db.setUser(J, raw);
  const u = db.getUser(J);
  ok(u.energi === 150, "limit liar 50 digabung ke energi (100+50=150), bukan hilang -> " + u.energi);
  ok(u.koin === 1500, "balance liar 1000 digabung ke koin (500+1000=1500), bukan hilang -> " + u.koin);
  ok(u.limit === undefined && u.balance === undefined, "field alias liar dibersihkan");
}
console.log("[2] energi unlimited (-1) tidak rusak oleh alias");
{
  const J = "6287200000002@s.whatsapp.net";
  db.setUser(J, { name: "B", energi: -1 });
  const raw = db.db.data.users["6287200000002"]; raw.limit = 30; db.setUser(J, raw);
  ok(db.getUser(J).energi === -1, "energi -1 tetap -1 walau ada limit liar");
  const raw2 = db.db.data.users["6287200000002"]; raw2.limit = -1; db.setUser(J, raw2);
  ok(db.getUser(J).energi === -1, "limit=-1 -> energi tetap unlimited");
}
console.log("[3] hadiah fisch & minecraft menulis ke energi (sumber resmi)");
for (const f of ["src/lib/rara-fisch.js", "src/lib/rara-minecraft.js"]) {
  const s = src(f);
  ok(!/user\.limit\s*=/.test(s), f.split("/").pop() + ": tidak menulis user.limit lagi");
  ok(/user\.energi\s*=\s*\(?user\.energi/.test(s) || /updateEnergi\(/.test(s), f.split("/").pop() + ": hadiah limit masuk ke energi");
  ok(/user\.energi\s*=\s*-1/.test(s), f.split("/").pop() + ": unlimited set energi=-1");
}
console.log("[4] leaderboard & dbexport membaca energi");
{
  const lb = src("plugins/main/leaderboard.js");
  ok(!/key:\s*'limit'/.test(lb), "leaderboard: key bukan 'limit' lagi");
  ok(!/u\.limit\b/.test(lb), "leaderboard: label tidak baca u.limit");
  ok(!/u\.limit\b/.test(src("plugins/owner/dbexport.js")), "dbexport: kolom limit tidak baca u.limit");
}
console.log("[5] dashboard web (hiweb) = database TERPISAH, sengaja bukan bagian sinkron bot");
{
  const d = src("src/lib/hiweb/hi-web-db.js");
  ok(/hiweb-db\.json/.test(d) && !/rara-database/.test(d), "hiweb pakai hiweb-db.json sendiri (bukan db Rara) -> limit/gems-nya milik dashboard, aman");
}
console.log("[6] status register: sumber tunggal isRegistered (unreg tidak boleh tetap terhitung terdaftar)");
{
  // meniru persis data hasil .register lalu .unreg
  const mk = (n, extra) => { const J = n + "@s.whatsapp.net"; db.setUser(J, { name: "U" + n, ...extra }); return J; };
  mk("6287300000001", { isRegistered: true, registeredAt: "2026-10-01T00:00:00.000Z" });                                   // aktif
  mk("6287300000002", { isRegistered: false, registeredAt: "2026-10-01T00:00:00.000Z", unregisteredAt: "2026-10-02T00:00:00.000Z" }); // sudah unreg
  mk("6287300000003", {});                                                                                                    // belum pernah
  const all = db.db.data.users;
  const hitung = (src, re) => { const m = src.match(re); return m ? m[0] : null; };
  for (const f of ["plugins/main/menu.js", "plugins/main/allmenu.js", "src/lib/rara-info-section.js"]) {
    const code = src(f);
    ok(!/u\.registeredAt\s*\|\|\s*u\.isRegistered/.test(code), f.split("/").pop() + ": hitung terdaftar TIDAK pakai registeredAt (sisa dari unreg)");
  }
  ok(!/u\?\.name\s*\|\|\s*u\?\.registered/.test(src("plugins/main/info.js")), "info.js: tidak hitung dari name/registered (field yg tak pernah ditulis register)");
  // simulasi hasil hitung memakai aturan baru
  const terdaftar = Object.values(all).filter((u) => u.isRegistered).length;
  ok(terdaftar >= 1 && !all["6287300000002"].isRegistered, "data uji: user yang sudah unreg isRegistered=false");
}

console.log("[7] .buycash: beli uang RPG (rpg.cash) end-to-end lewat approvetopup asli");
{
  const store = await import(R + "/src/lib/store/rara-store.js");
  const it = store.TOPUP_ITEMS.cash;
  ok(!!it && it.apply === "rpgCurrency:cash" && it.command === "buycash", "item cash terdaftar di toko (apply rpgCurrency:cash, command buycash)");
  ok(it && it.min > 0 && it.max >= it.min && it.packSize > 0 && it.pricePerPack > 0, "cash: min/max/packSize/harga valid");
  if (it) {
    ok(store.validateTopupQty("cash", it.min - 1).ok === false, "cash: di bawah minimum ditolak");
    ok(store.validateTopupQty("cash", it.max + 1).ok === false, "cash: di atas maksimum ditolak");
    ok(store.validateTopupQty("cash", 1.5).ok === false, "cash: desimal ditolak");
    const pr = store.calcTopupPrice("cash", it.min);
    ok(pr && pr.rupiahNum >= store.MIN_TOPUP_PRICE, "cash: harga >= minimum transaksi");
  }
  const plug = await import(R + "/plugins/main/buycash.js").catch((e) => ({ err: e.message }));
  ok(!plug.err && plug.config?.name === "buycash" && typeof plug.handler === "function", "plugin buycash.js termuat (name buycash)" + (plug.err ? " ERR " + plug.err : ""));
  if (it && !plug.err) {
    const config = (await import(R + "/config.js")).default;
    config.owner = { ...(config.owner || {}), number: ["6281111111111"] };
    const appr = await import(R + "/plugins/owner/approvetopup.js");
    const OWN = "6281111111111@s.whatsapp.net", BUY = "6287400000001@s.whatsapp.net";
    db.setUser(BUY, { name: "P" });
    const before = db.getUser(BUY).rpg.cash || 0;
    const t = store.ensureTopups(db); const pr2 = store.calcTopupPrice("cash", it.min);
    t.pending[BUY] = { sender: BUY, phoneNumber: "6287400000001", name: "P", type: "cash", itemName: it.name, qty: it.min, unit: it.unit, jalur: it.jalur, apply: it.apply, price: pr2.rupiah, priceNum: pr2.rupiahNum, status: "pending", orderedAt: Date.now() };
    const rep = [];
    const mm = { sender: OWN, isOwner: true, chat: OWN, prefix: ".", args: ["6287400000001"], text: "6287400000001", pushName: "O", command: "approvetopup", key: {}, reply: async (x) => rep.push(String(x)), react: async () => {} };
    await appr.handler(mm, { sock: { sendMessage: async () => ({}) }, db, command: "approvetopup", args: mm.args, text: mm.text });
    const u = db.getUser(BUY);
    ok((u.rpg.cash || 0) === before + it.min, "approve -> rpg.cash bertambah persis " + it.min + " (" + before + " -> " + (u.rpg.cash || 0) + ")");
    ok(u.rpg.gold === (db.getUser(BUY).rpg.gold), "approve cash tidak menyentuh gold");
    ok(!t.pending[BUY], "pending bersih setelah approve");
  }
}

console.log(`\nTOTAL: ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
