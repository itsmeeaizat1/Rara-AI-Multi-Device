// E2E Dompet AI (ide fitur no 1, 12 Sep 2026): catat natural/foto struk +
// saldo + log + laporan chart + budget warning + insight AI + hapus/reset.
// Parser AI di-inject via seam — AI insight degrade silent.
import path from "node:path";
import fs from "node:fs";

const out = (s) => process.stdout.write(s + "\n");
let pass = 0, fail = 0;
function t(label, cond, extra) {
  if (cond) { pass++; out("✅ " + label); }
  else { fail++; out("❌ " + label + (extra ? " — " + extra : "")); }
}

const R = path.resolve(".");
// db path fresh tiap run
fs.rmSync("/tmp/dompet-e2e-db", { recursive: true, force: true });
const { initDatabase, getDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase("/tmp/dompet-e2e-db/nova.json");
const db = getDatabase();

const { config, handler, parseLocal, parseAmount } = await import(R + "/plugins/ai/wallet.js");
const { fromSC } = await import(R + "/src/lib/styler.js");
const norm = (s) => fromSC(String(s || "")).toLowerCase();

t("1a. plugin dompet kategori ai + alias", config.name === "dompet" && config.category === "ai" && config.alias.includes("dompetai"));

// ═══ 2. parser lokal ═══
out("\n— parseLocal —");
let e = parseLocal("makan siang 25rb di warteg");
t("2a. 25rb → keluar 25000 makan", e && e.type === "keluar" && e.amount === 25000 && e.cat === "makan", JSON.stringify(e));
e = parseLocal("gajian 5jt dari kantor");
t("2b. gajian 5jt → masuk 5000000 gaji", e && e.type === "masuk" && e.amount === 5000000 && e.cat === "gaji", JSON.stringify(e));
e = parseLocal("beli skincare 150.000 di shopee");
t("2c. 150.000 → belanja 150000", e && e.amount === 150000 && e.cat === "belanja", JSON.stringify(e));
e = parseLocal("bayar token listrik 350rb");
t("2d. token listrik → tagihan", e && e.cat === "tagihan" && e.amount === 350000, JSON.stringify(e));
e = parseLocal("topup diamond ml 100k");
t("2e. topup ml → hiburan 100000", e && e.cat === "hiburan" && e.amount === 100000, JSON.stringify(e));
t("2f. tanpa nominal → null (jatuh ke AI)", parseLocal("beli kopi dulu") === null);
t("2g. parseAmount 1,5jt → 1500000", parseAmount("dapet bonus 1,5jt") === 1500000);

// ═══ 3. handler flow ═══
out("\n— handler —");
const replies = [];
const sent = [];
function mockM(args, opts = {}) {
  return {
    command: "dompet", args, text: args.join(" "), prefix: ".",
    chat: "6288888@s.whatsapp.net", sender: "6288888@s.whatsapp.net", pushName: "Tester",
    isGroup: false, isOwner: false, isImage: !!opts.isImage,
    quoted: opts.quoted || null,
    react: async () => {},
    reply: async (txt) => { replies.push(String(txt)); return { key: { id: "r" } }; },
  };
}
const sockMock = {
  sendMedia: async (chat, buf, q, m, opts) => { sent.push({ chat, buf, opts }); },
  sendMessage: async () => {},
};

// AI seam: parse natural + insight (string balasan)
let aiReplies = 0;
const { _setDompetParsersForTest } = await import(R + "/plugins/ai/wallet.js");
_setDompetParsersForTest({
  text: async () => { aiReplies++; return '{"type":"keluar","amount":18000,"cat":"makan","desc":"kopi susu kekinian"}'; },
  vision: async () => ({ status: true, text: '{"items":[{"nama":"Indomie Goreng","harga":3500},{"nama":"Teh Kotak","harga":5000}],"total":8500,"toko":"Indomaret"}', engine: "vision-test" }),
});

// entry lokal (tanpa AI)
await handler(mockM(["makan siang 25rb di warteg"]), { sock: sockMock, config: { command: { prefix: "." } } });
const r1 = replies.at(-1) || "";
t("3a. catat lokal 25rb", /uang keluar/.test(norm(r1)) && norm(r1).includes("rp25.000"), norm(r1).slice(0, 80));
t("3b. engine lokal (gak nyamber AI)", norm(r1).includes("lokal"), norm(r1).slice(0, 120));

// entry masuk
await handler(mockM(["gajian 5jt"]), { sock: sockMock, config: { command: { prefix: "." } } });
const r2 = replies.at(-1) || "";
t("3c. gajian → UANG MASUK 5jt", /uang masuk/.test(norm(r2)) && norm(r2).includes("rp5.000.000"), norm(r2).slice(0, 80));

// entry AI (tanpa nominal)
await handler(mockM(["beli kopi dulu"]), { sock: sockMock, config: { command: { prefix: "." } } });
const r3 = replies.at(-1) || "";
t("3d. tanpa nominal → AI parse 18000", aiReplies === 1 && /uang keluar/.test(norm(r3)) && norm(r3).includes("rp18.000"), norm(r3).slice(0, 90));
const userNow = db.getUser("6288888@s.whatsapp.net") || {};
t("3e. 3 entri ke-persist db", ((userNow.dompet?.entries) || []).length === 3, String((userNow.dompet?.entries || []).length));

// foto struk (vision seam)
await handler(mockM([], { isImage: true, quoted: { isImage: true, download: async () => Buffer.from("fake-img") } }), { sock: sockMock, config: { command: { prefix: "." } } });
const r4 = replies.at(-1) || "";
t("3f. struk vision → total 8500 + rincian items", /uang keluar/.test(norm(r4)) && norm(r4).includes("rp8.500") && norm(r4).includes("indomie"), norm(r4).slice(0, 110));
t("3g. cat struk → belanja", (db.getUser("6288888@s.whatsapp.net")?.dompet?.entries || []).at(-1)?.cat === "belanja");

// vision gagal — seam diganti dulu SEBELUM handler dipanggil (bukan setelah)
_setDompetParsersForTest({
  text: async () => { aiReplies++; return '{"type":"keluar","amount":18000,"cat":"makan","desc":"kopi susu kekinian"}'; },
  vision: async () => ({ status: false, error: "vision down" }),
});
replies.length = 0;
await handler(mockM([], { isImage: true, quoted: { isImage: true, download: async () => Buffer.from("y") } }), { sock: sockMock, config: { command: { prefix: "." } } });
t("3h. vision gagal → error jelas", /vision down/.test(norm(replies.at(-1) || "")) || /gagal/i.test(norm(replies.at(-1) || "")), norm(replies.at(-1) || "").slice(0, 60));

// ═══ 4. saldo ═══
out("\n— saldo/budget/log/laporan —");
replies.length = 0;
await handler(mockM(["saldo"]), { sock: sockMock, config: { command: { prefix: "." } } });
const rS = norm(replies.at(-1) || "");
// masuk 5.000.000, keluar 25.000 + 18.000 + 8.500 = 51.500 → saldo 4.948.500
t("4a. saldo akurat 4.948.500", rS.includes("rp4.948.500"), rS.slice(0, 100));
t("4b. saldo ada arus masuk/keluar bulan ini", rS.includes("rp5.000.000") && rS.includes("rp51.500"), rS.slice(0, 160));

// budget set + warning
await handler(mockM(["budget", "100rb"]), { sock: sockMock, config: { command: { prefix: "." } } });
t("4c. budget 100rb disimpan", /disimpan/.test(norm(replies.at(-1) || "")) && norm(replies.at(-1)).includes("rp100.000"));
replies.length = 0;
await handler(mockM(["beli baju baru 60rb"]), { sock: sockMock, config: { command: { prefix: "." } } });
t("4d. warning budget >=80% (51.500+60.000=111.500/100.000)", /budget habis|terpakai/.test(norm(replies.at(-1) || "")), norm(replies.at(-1) || "").slice(0, 150));

// log
replies.length = 0;
await handler(mockM(["log"]), { sock: sockMock, config: { command: { prefix: "." } } });
t("4e. log hari ini tampil transaksi", /log hari ini/.test(norm(replies.at(-1) || "")) && norm(replies.at(-1)).includes("warteg"), norm(replies.at(-1)).slice(0, 90));

// laporan mingguan (chart + insight AI seam)
sent.length = 0;
replies.length = 0;
await handler(mockM(["laporan"]), { sock: sockMock, config: { command: { prefix: "." } } });
t("4f. laporan kirim chart PNG", sent.length === 1 && !!sent[0].buf, `sent=${sent.length}`);
const rL = norm(replies.at(-1) || "");
t("4g. laporan ada total + kategori + insight AI", rL.includes("rekap 7 hari") && rL.includes("kategori terbesar") && (rL.includes("makan") || rL.includes("belanja")), rL.slice(0, 140));

// budget 0 = reset
await handler(mockM(["budget", "0"]), { sock: sockMock, config: { command: { prefix: "." } } });
t("4h. budget 0 reset", /reset/i.test(norm(replies.at(-1) || "")));
t("4i. budget db jadi 0", (db.getUser("6288888@s.whatsapp.net")?.dompet?.budget || 0) === 0);

// hapus + reset
const before = (db.getUser("6288888@s.whatsapp.net")?.dompet?.entries || []).length;
await handler(mockM(["hapus"]), { sock: sockMock, config: { command: { prefix: "." } } });
const after = (db.getUser("6288888@s.whatsapp.net")?.dompet?.entries || []).length;
t("4j. hapus pop entri terakhir", after === before - 1, `${before}→${after}`);
await handler(mockM(["reset"]), { sock: sockMock, config: { command: { prefix: "." } } });
t("4k. reset bersihin entries", (db.getUser("6288888@s.whatsapp.net")?.dompet?.entries || []).length === 0);

// guide no-arg
replies.length = 0;
await handler(mockM([]), { sock: sockMock, config: { command: { prefix: "." } } });
t("4l. no-arg → guide usage", /dompet/i.test(norm(replies.at(-1) || "")) && /saldo/.test(norm(replies.at(-1) || "")));

out(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
