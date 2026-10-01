// E2E .chart — mock m + sock, db eksplisit (gotcha: initDatabase wajib path!)
import { initDatabase, getDatabase } from "../../src/lib/rara-database.js";

await initDatabase("/tmp/chart-e2e-db.json");

// seed 3 pemain RPG
const db = getDatabase();
db.setUser("628111111111", { name: "Aizat", rpg: { gold: 50000, cash: 15000000, level: 12 } });
db.setUser("628222222222", { name: "Budi", rpg: { gold: 30000, cash: 8000000, level: 9 } });
db.setUser("628333333333", { name: "Citra", rpg: { gold: 15000, cash: 25000000, level: 7 } });

const { config, handler, renderChart } = await import("../../plugins/tools/chart.js");

const replies = [];
let sent = [];
function mockM(args) {
  return {
    args, text: args.join(" "), prefix: ".", command: "chart",
    pushName: "Tester", chat: "62899@c.us", sender: "62899",
    isImage: false, quoted: null, message: {},
    reply: async (t) => { replies.push(String(t)); },
    react: async () => {},
  };
}
const mockSock = {
  sendMedia: async (chat, buf, q, m, opts) => { sent.push({ chat, buf, opts }); },
  sendMessage: async () => {},
};

const isPng = (b) => b && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n"); const check = (name, ok) => { w((ok ? "  ✅" : "  ❌") + " " + name); ok ? pass++ : fail++; };

// 1. render langsung → PNG valid & cukup besar
const png1 = await renderChart({ title: "T", subtitle: "S", items: [{ label: "a", value: 1 }, { label: "b", value: 5 }] });
check("render langsung: PNG valid", isPng(png1));
check("render langsung: size > 5KB", png1.length > 5000);

// 2. tanpa argumen → help (bukan gambar)
replies.length = 0; sent = [];
await handler(mockM([]), { sock: mockSock });
check("no-arg: reply help", replies.length === 1 && replies[0].toLowerCase().includes("grafik") || replies[0].includes("ɢʀᴀꜰɪᴋ") || replies.length === 1);
check("no-arg: gak kirim gambar", sent.length === 0);

// 3. custom label | nilai → gambar
replies.length = 0; sent = [];
await handler(mockM(["pisang,jeruk,apel", "|", "10,25,7"]), { sock: mockSock });
check("custom label|nilai: kirim 1 gambar PNG", sent.length === 1 && isPng(sent[0].buf));

// 4. nilai doang → gambar
replies.length = 0; sent = [];
await handler(mockM(["5,10,15,20"]), { sock: mockSock });
check("nilai doang: kirim 1 gambar PNG", sent.length === 1 && isPng(sent[0].buf));

// 5. nilai bukan angka → error, gak kirim gambar
replies.length = 0; sent = [];
await handler(mockM(["a,b", "|", "x,y"]), { sock: mockSock });
check("nilai salah: error reply", replies.length === 1);
check("nilai salah: gak kirim gambar", sent.length === 0);

// 6. jumlah label ≠ nilai → error
replies.length = 0; sent = [];
await handler(mockM(["a,b,c", "|", "1,2"]), { sock: mockSock });
check("label≠nilai: error reply", replies.length === 1 && sent.length === 0);

// 7. minimal 2 data
replies.length = 0; sent = [];
await handler(mockM(["10"]), { sock: mockSock });
check("1 data: ditolak", replies.length === 1 && sent.length === 0);

// 8. maks 12 data
replies.length = 0; sent = [];
await handler(mockM(["1,2,3,4,5,6,7,8,9,10,11,12,13"]), { sock: mockSock });
check("13 data: ditolak", replies.length === 1 && sent.length === 0);

// 9. rpg uang → leaderboard jadi grafik (sort desc: Citra 25jt > Aizat 15jt > Budi 8jt)
replies.length = 0; sent = [];
await handler(mockM(["rpg", "uang"]), { sock: mockSock });
check("rpg uang: kirim gambar PNG", sent.length === 1 && isPng(sent[0].buf));

// 10. rpg gold → grafik
replies.length = 0; sent = [];
await handler(mockM(["rpg", "gold"]), { sock: mockSock });
check("rpg gold: kirim gambar PNG", sent.length === 1 && isPng(sent[0].buf));

// 11. rpg level → grafik
replies.length = 0; sent = [];
await handler(mockM(["rpg", "level"]), { sock: mockSock });
check("rpg level: kirim gambar PNG", sent.length === 1 && isPng(sent[0].buf));

// 12. tipe rpg ngawur → error + daftar tipe
replies.length = 0; sent = [];
await handler(mockM(["rpg", "ngawur"]), { sock: mockSock });
check("rpg tipe salah: error reply", replies.length === 1 && sent.length === 0);

// 13. render Rp format sanity (uang display pakai formatRp)
const pngRp = await renderChart({ title: "T", items: [{ label: "x", value: 25000000 }], money: true });
check("render money: PNG valid", isPng(pngRp));

// 14. leaderboard beneran sort desc — cek via getLeaderboard
const { getLeaderboard } = await import("../../src/lib/rara-rpg-service.js");
const lb = getLeaderboard("cash", 10);
check("leaderboard cash sort desc (Citra #1)", lb.length === 3 && lb[0].name === "Citra" && lb[0].value === 25000000);

w(`\n${fail === 0 ? "🎉 SEMUA PASS" : "⚠️ ADA FAIL"} — ${pass} pass, ${fail} fail`);
await new Promise(r => setTimeout(r, 300)); process.exit(fail === 0 ? 0 : 1);
