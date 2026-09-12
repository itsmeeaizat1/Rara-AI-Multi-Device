// E2E Fitness Coach AI (ide fitur no 8, 12 Sep 2026).
// Deps AI/vision di-inject via seam — gak nyamber AI live.
import path from "node:path";
import fs from "node:fs";

const out = (s) => process.stdout.write(s + "\n");
let pass = 0, fail = 0;
function t(label, cond, extra) {
  if (cond) { pass++; out("✅ " + label); }
  else { fail++; out("❌ " + label + (extra ? " — " + extra : "")); }
}
const low = (s) => String(s || "").toLowerCase();

const R = path.resolve(".");
fs.rmSync("/tmp/coach-e2e-db", { recursive: true, force: true });
const { initDatabase, getDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase("/tmp/coach-e2e-db/nova.json");
const db = getDatabase();

const { config, handler, parseProgram, parseBody, localProgram, streakInfo, consistency, _setCoachDepsForTest } = await import(R + "/plugins/ai/coach.js");
const { fromSC } = await import(R + "/src/lib/styler.js");
const norm = (s) => fromSC(low(s));

t("1a. plugin coach kategori ai", config.name === "coach" && config.category === "ai" && config.alias.includes("fitnes"));

// ═══ 2. unit: parser + streak ═══
out("\n— unit —");
const pp = parseProgram('blabla {"program":[{"hari":1,"fokus":"Push","latihan":[{"nama":"Push up","set":"3x12","catatan":"pelan"},{"nama":"Plank","set":"3x30 detik","catatan":""}]}]}');
t("2a. parseProgram valid 1 hari → ditolak (<4 hari)", pp === null);
const pp2 = parseProgram('{"program":[' + Array.from({ length: 7 }, (_, i) => `{"hari":${i + 1},"fokus":"H${i + 1}","latihan":[{"nama":"Latihan ${i + 1}","set":"3x10"}]}`).join(",") + ']}');
t("2b. parseProgram 7 hari → urut + latihan ke-parse", pp2 && pp2.length === 7 && pp2[0].hari === 1 && pp2[0].latihan[0].nama === "Latihan 1");
t("2c. parseBody BUKAN_FOTO_BADAN → null", parseBody('{"postur":"BUKAN_FOTO_BADAN","catatan":"","rekomendasi":""}') === null);
t("2d. localProgram otot ada rest day", localProgram("naik otot").some((d) => /rest/i.test(d.fokus)) && localProgram("naik otot").length === 7);
t("2e. localProgram turun berat beda sama otot", JSON.stringify(localProgram("turun berat")) !== JSON.stringify(localProgram("naik otot")));

// streak unit
const ymd = (offset) => {
  const d = new Date(Date.now() + offset * 86400000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
t("2f. streak 3 hari beruntun", streakInfo([{ d: ymd(0), done: 1 }, { d: ymd(-1), done: 1 }, { d: ymd(-2), done: 1 }]).streak === 3);
t("2g. streak putus kemarin (2 hari lalu doang) → 0", streakInfo([{ d: ymd(-2), done: 1 }, { d: ymd(-3), done: 1 }]).streak === 0);
t("2h. best streak tersimpan walau putus", streakInfo([{ d: ymd(0), done: 1 }, { d: ymd(-5), done: 1 }, { d: ymd(-6), done: 1 }, { d: ymd(-7), done: 1 }]).best === 3);
t("2i. consistency 7 hari = 43% (3 dari 7)", consistency([{ d: ymd(0), done: 1 }, { d: ymd(-1), done: 1 }, { d: ymd(-4), done: 1 }], 7) === 43);

// ═══ 3. handler ═══
out("\n— handler —");
const replies = [];
const media = [];
function mockM(args, opts = {}) {
  return {
    command: "coach", args, text: args.join(" "), prefix: ".",
    chat: "628770@s.whatsapp.net", sender: "628770@s.whatsapp.net", pushName: "Atlet",
    isGroup: false, isOwner: false, isImage: !!opts.isImage,
    quoted: opts.quoted || null,
    react: async () => {},
    reply: async (txt) => { replies.push(String(txt)); return { key: { id: "r" } }; },
  };
}
const sockMock = { sendMedia: async (chat, buf, q, m, opts) => { media.push({ buf, opts }); }, sendMessage: async () => {} };

let aiCalls = 0;
_setCoachDepsForTest({
  ai: async (p) => {
    aiCalls++;
    if (p.includes("personal trainer")) {
      return '{"program":[' + Array.from({ length: 7 }, (_, i) => `{"hari":${i + 1},"fokus":"AI Hari ${i + 1}","latihan":[{"nama":"AI Move ${i + 1}","set":"3x12","catatan":"mantap"},{"nama":"AI Move B${i + 1}","set":"3x10","catatan":""}]}`).join(",") + ']}';
    }
    if (p.includes("sebut angka berat badan".replace("sebut angka berat badan", "JANGAN")) || true) return "bukan json";
    return "x";
  },
  vision: async () => { return { status: true, text: '{"postur":"bahu membungkuk","catatan":"Postur cenderung maju ke depan.","rekomendasi":"Mulai penguatan punggung dan core."}' }; },
});

// guide
await handler(mockM([]), { sock: sockMock, config: { command: { prefix: "." } } });
t("3a. no-arg → guide", /coach/.test(norm(replies.at(-1))) && /mulai/.test(norm(replies.at(-1))));

// mulai tanpa goal
await handler(mockM(["mulai"]), { sock: sockMock, config: { command: { prefix: "." } } });
t("3b. mulai tanpa goal → minta goal", /goal-nya apa/.test(norm(replies.at(-1))));

// mulai AI
replies.length = 0;
await handler(mockM(["mulai", "naik", "otot"]), { sock: sockMock, config: { command: { prefix: "." } } });
const r1 = norm(replies.at(-1) || "");
t("3c. mulai → program 7 hari AI + goal", r1.includes("program latihan 7 hari") && r1.includes("naik otot") && r1.includes("ai hari 7"), r1.slice(0, 140));
const s1 = db.getUser("628770@s.whatsapp.net")?.coach;
t("3d. program ke-persist db", s1?.program?.length === 7 && s1?.goal === "naik otot");

// jadwal
replies.length = 0;
await handler(mockM(["jadwal"]), { sock: sockMock, config: { command: { prefix: "." } } });
t("3e. jadwal tampil program + streak 0", /program: naik otot/.test(norm(replies.at(-1))) && /streak: 0/.test(norm(replies.at(-1))));

// done hari 1
replies.length = 0;
await handler(mockM(["done"]), { sock: sockMock, config: { command: { prefix: "." } } });
t("3f. done → streak 1 dimulai", /streak 1 hari|dimulai dari 1/.test(norm(replies.at(-1))), norm(replies.at(-1)).slice(0, 90));

// done dobel ditolak
replies.length = 0;
await handler(mockM(["done"]), { sock: sockMock, config: { command: { prefix: "." } } });
t("3g. done dobel → ditolak sopan", /udah di-check-in/.test(norm(replies.at(-1))));

// reply foto badan → vision → regen program ikut analisis
replies.length = 0;
await handler(mockM([], { quoted: { isImage: true, download: async () => Buffer.from("body") } }), { sock: sockMock, config: { command: { prefix: "." } } });
t("3h. foto badan → analisis postur + hint regen", /analisis badan/.test(norm(replies.at(-1))) && /bahu membungkuk/.test(norm(replies.at(-1))), norm(replies.at(-1)).slice(0, 120));
const s2 = db.getUser("628770@s.whatsapp.net")?.coach;
t("3i. vision note ke-persist", s2?.vision?.postur === "bahu membungkuk");

// mulai ulang → regen + catatan disesuaikan badan
replies.length = 0;
await handler(mockM(["mulai", "ulang"]), { sock: sockMock, config: { command: { prefix: "." } } });
t("3j. mulai ulang → regen program (🔄) + analisis badan disebut", /program latihan 7 hari/.test(norm(replies.at(-1))) && /analisis badanmu/.test(norm(replies.at(-1))), norm(replies.at(-1)).slice(0, 140));

// progress + chart
media.length = 0;
replies.length = 0;
await handler(mockM(["progress"]), { sock: sockMock, config: { command: { prefix: "." } } });
const rP = norm(replies.at(-1) || "");
t("3k. progress: streak + konsistensi 7/30 hari", rP.includes("streak: 1") && rP.includes("7 hari terakhir: 14%"), rP.slice(0, 140));
t("3l. chart konsistensi terkirim", media.length === 1 && !!media[0].buf, `media=${media.length}`);

// AI down → fallback lokal program (sesi gak pernah batal)
_setCoachDepsForTest({ ai: async () => { throw new Error("ai down"); }, vision: async () => { throw new Error("v down"); } });
replies.length = 0;
await handler(mockM(["reset"]), { sock: sockMock, config: { command: { prefix: "." } } });
await handler(mockM(["mulai", "turun", "berat"]), { sock: sockMock, config: { command: { prefix: "." } } });
const rFb = norm(replies.at(-1) || "");
const sFb = db.getUser("628770@s.whatsapp.net")?.coach;
t("3m. AI down → program fallback lokal (kardio turun berat)", rFb.includes("program latihan 7 hari") && sFb?.program?.some((d) => /kardio|hiit/i.test(d.fokus)), JSON.stringify(sFb?.program?.map((d) => d.fokus) || []).slice(0, 100));
t("3n. reset bersihin streak → history kosong", (sFb?.history || []).length === 0);

// bukan foto badan → ditolak
_setCoachDepsForTest({
  ai: async () => { throw new Error("down"); },
  vision: async () => ({ status: true, text: '{"postur":"BUKAN_FOTO_BADAN","catatan":"","rekomendasi":""}' }),
});
replies.length = 0;
await handler(mockM([], { quoted: { isImage: true, download: async () => Buffer.from("meme") } }), { sock: sockMock, config: { command: { prefix: "." } } });
t("3o. bukan foto badan → ditolak jelas", /gak kedeteksi foto badan/.test(norm(replies.at(-1))));

// sub gak dikenal
replies.length = 0;
await handler(mockM(["apaaja"]), { sock: sockMock, config: { command: { prefix: "." } } });
t("3p. sub gak dikenal → daftar subcommand", /mulai.*jadwal.*done|gak dikenal/.test(norm(replies.at(-1))));

out(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
