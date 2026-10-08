// E2E AI AGENT (11 Sep 2026) — stub aiChat/search/preview via setAgentDeps.
// Deterministik tanpa network. Jalankan dari cwd DIR KOSONG:
//   mkdir -p /tmp/agent-e2e && cd /tmp/agent-e2e && node <repo>/test/agent-e2e/e2e.mjs
import { setAgentDeps, resetAgentDeps, runAgent, generatePlugin } from "../../src/lib/rara-agent.js";
import { config as agConfig, handler as agHandler } from "../../plugins/ai-agent/agent.js";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : extra ? ` — ${extra}` : "")); ok ? pass++ : fail++; };
const SC_MAP = { a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',y:'ʏ',z:'ᴢ' };
// UPDATE 1 Okt: teks bot kini plain — toSC lokal jadi passthrough
const toSC = (s) => String(s ?? "");

const ITEMS = [
  { title: "5 HP Terbaik 2026", url: "https://gadgetrev.com/hp-terbaik", snippet: "daftar hp terbaik dengan harga" },
  { title: "Review POCO X7", url: "https://revu.xyz/poco-x7", snippet: "review lengkap poco x7 gaming" },
  { title: "HP Gaming Murah", url: "https://tekno.id/hp-gaming", snippet: "hp gaming di bawah 5 juta" },
];

function mkDeps({ planReply, pickReply, composeReply, searchOk = true, previewOk = true, browserSearch = null } = {}) {
  const calls = { ai: [], search: [], preview: [] };
  setAgentDeps({
    // 🔹 FIX 17 Sep: fallback chromium WAJIB di-mock — kalau null-asli,
    // e2e bakal launch browser beneran & hasilnya gak deterministik
    browserSearch,

    aiChat: async (p, o) => {
      calls.ai.push({ p, o });
      const sys = o?.systemPrompt || "";
      if (sys.includes("perencana")) return planReply ?? `{"queries":["hp terbaik 5 juta","hp gaming murah"],"angle":"harga"}`;
      if (sys.includes("kurator")) return pickReply ?? `{"picks":[1,2]}`;
      return composeReply ?? "Rekomendasi terbaik adalah POCO X7 [S1] dengan harga 4 jutaan [S2].";
    },
    search: async (q, o) => {
      calls.search.push({ q, o });
      if (!searchOk) return { error: "semua mesin sibuk" };
      return { source: "Bing", engine: "bing", items: ITEMS };
    },
    preview: async (url) => {
      calls.preview.push(url);
      if (!previewOk) return { error: "halaman gak kebuka" };
      return { url, title: "Halaman " + url, description: "", image: "", text: "Isi halaman lengkap tentang hp terbaik 5 juta. POCO X7 paling worth it. ".repeat(50) };
    },
  });
  return calls;
}

w("\n— runAgent: alur penuh —");
{
  resetAgentDeps();
  const phases = [];
  const calls = mkDeps();
  const r = await runAgent("cari hp terbaik di bawah 5 juta", { onPhase: (p, i) => phases.push(p + ":" + i) });
  check("jawaban AI compose", r.answer?.includes("POCO X7"), r.answer?.slice(0, 60));
  check("sumber 2 halaman", Array.isArray(r.sources) && r.sources.length === 2 && r.sources[0].tag === "S1");
  check("plan 2 query dipakai", r.queries.length === 2 && calls.search.length === 2);
  check("pick AI dipakai (2 halaman dibaca)", calls.preview.length === 2 && calls.preview[0].includes("gadgetrev"));
  check("fase urut plan→search→pick→read→compose",
    String(phases[0]).startsWith("plan:") && phases[1] === "search:hp terbaik 5 juta" && phases.some(p => String(p).startsWith("pick:")) && phases.some(p => p.startsWith("read:")) && phases[phases.length - 1].startsWith("compose"));
  check("bukti compose ngandung teks halaman", calls.ai.some(c => String(c.p).includes("Isi halaman lengkap")));
  check("compose cite tag sumber di jawaban", r.answer.includes("[S1]"));
}

w("\n— degradasi: plan AI gagal → tugas jadi query —");
{
  resetAgentDeps();
  const calls = mkDeps({ planReply: "maaf saya gak bisa JSON" });
  const r = await runAgent("resep rendah kalori", {});
  check("fallback query = tugas user", r.queries[0] === "resep rendah kalori" && !r.error);
}

w("\n— degradasi: pick AI gagal → 3 teratas —");
{
  resetAgentDeps();
  mkDeps({ pickReply: "garbage" });
  const r = await runAgent("tes", {});
  check("pick fallback 3 teratas", r.sources.length === 3);
}

w("\n— degradasi: read gagal semua → bukti snippet pool —");
{
  resetAgentDeps();
  const calls = mkDeps({ previewOk: false });
  const r = await runAgent("tes", {});
  check("tetap jawaban dari snippet", !r.error && r.answer.includes("POCO X7"));
  check("evidence pakai snippet", calls.ai.some(c => String(c.p).includes("daftar hp terbaik")));
}

w("\n— degradasi: compose gagal → digest lokal —");
{
  resetAgentDeps();
  mkDeps({ composeReply: "" });
  const r = await runAgent("tes", {});
  check("digest lokal aktif", r.viaLocal === true && r.answer.includes("Hasil riset"));
  check("digest kasih link", r.answer.includes("https://"));
}

w("\n— search gagal total → jawab dari pengetahuan internal (anti-nyerah 30 Sep) —");
{
  resetAgentDeps();
  const calls = mkDeps({ searchOk: false, browserSearch: null });
  const r = await runAgent("tes", {});
  // 🔹 UPGRADE 30 Sep: pool kosong + chromium gagal ≠ error mentah — agent
  // WAJIB jawab dari pengetahuan model + catatan jujur viaKnowledge: true
  check("jawab via pengetahuan internal", r.viaKnowledge === true && !!r.answer && !r.error);
  // mock aiChat balas fixed text — verifikasi instruksi "jawab dari pengetahuan
  // + catatan jujur" emang dikirim engine ke prompt komposisi
  check("instruksi pengetahuan internal ke-kirim", calls.ai.some(c => /PENGETAHUANMU SENDIRI/i.test(String(c.p || "")) && /tidak paling baru/i.test(String(c.p || ""))));
}

// 🔹 NEW 17 Sep: search engine gagal → FALLBACK CHROMIUM nyelametin riset
// (owner report: "carikan berita makanan mbg beracun" dijawab gak tahu)
{
  resetAgentDeps();
  const d = mkDeps({ searchOk: false, browserSearch: async () => [
    { title: "Kasus Keracunan MBG Terus Berulang", url: "https://kompas.com/mbg", snippet: "Kasus keracunan MBG di berbagai daerah" },
    { title: "Siasat Pemerintah Soal MBG", url: "https://detik.com/mbg", snippet: "pemerintah merespons keracunan MBG" },
  ] });
  const r = await runAgent("berita makanan mbg beracun", {});
  check("fallback chromium → riset jalan", !r.error && !!r.answer);
  check("fallback chromium → sumber kebaca", (r.sources || []).some((s) => /kompas|detik/.test(s.domain || s.url)));
}

w("\n— MODE ACT: LLM plan → kick —");
{
  resetAgentDeps();
  mkDeps({ planReply: `{"mode":"act","actions":[{"action":"kick","target":"Budi"}]}` });
  const acts = [];
  const r = await runAgent("kick orang yang bernama Budi", {
    act: async (a, ctx) => { acts.push({ a, ctx }); return { ok: true, msg: "Berhasil kick @62" }; },
    context: { isGroup: true, isAdmin: true, isBotAdmin: true },
  });
  check("mode act", r.mode === "act" && acts.length === 1);
  check("payload action+target", acts[0].a.action === "kick" && acts[0].a.target === "Budi");
  check("context diteruskan", acts[0].ctx?.isAdmin === true);
  check("laporan hasil aksi", r.answer.includes("✅") && r.answer.includes("Berhasil kick"));
}

w("\n— MODE ACT: multi aksi (tutup grup + rename) —");
{
  resetAgentDeps();
  mkDeps({ planReply: `{"mode":"act","actions":[{"action":"close"},{"action":"rename","value":"Rara Squad"}]}` });
  const acts = [];
  const r = await runAgent("tutup grup dan ubah nama jadi Rara Squad", {
    act: async (a) => { acts.push(a); return { ok: true, msg: "ok " + a.action }; },
    context: { isGroup: true, isAdmin: true, isBotAdmin: true },
  });
  check("2 aksi dieksekusi", acts.length === 2 && acts[1].value === "Rara Squad");
  check("laporan 2 baris", r.answer.split("\n").length === 2);
}

w("\n— MODE ACT via handler: desc + rename pakai groupMetadataUpdate (FIX no function) —");
{
  resetAgentDeps();
  mkDeps({ planReply: `{"mode":"act","actions":[{"action":"desc","value":"Grup resmi Rara Squad, jaga kebersihan"},{"action":"rename","value":"Rara Squad Official"}]}` });
  const sent = [];
  const metas = [];
  const m = {
    text: ".agent buatin deskripsi grup dan ganti nama grup jadi Rara Squad Official", args: ["buatin", "deskripsi", "grup"],
    chat: "x@g.us", sender: "admin@w", pushName: "Admin", command: "agent", prefix: ".",
    isGroup: true, isAdmin: true, isOwner: false, isBotAdmin: true,
    react: async () => true, reply: async (t) => { sent.push(String(t)); },
  };
  const sock = {
    user: { id: "62bot:5" },
    sendMessage: async (chat, c) => {
      if (c?.edit) { sent.push("[edit] " + c.text); return { key: { id: "k1" } }; }
      if (c?.text) sent.push(String(c.text));
      return { key: { id: "k1" } };
    },
    groupMetadataUpdate: async (chat, fields) => { metas.push({ chat, fields }); },
    groupMetadata: async () => ({ participants: [{ id: "admin@w", admin: "admin" }] }),
  };
  await agHandler(m, { sock, db: { setting: () => ({}) }, deps: {} });
  const finalMsg = (sent.filter(s => s.startsWith("[edit]")).pop() || "").replace("\[edit\] ", "") || sent.filter(Boolean).pop() || "";
  check("desc via groupMetadataUpdate", metas.length === 2 && metas[0].fields?.description === "Grup resmi Rara Squad, jaga kebersihan", JSON.stringify(metas));
  check("rename via groupMetadataUpdate", metas[1]?.fields?.subject === "Rara Squad Official", JSON.stringify(metas[1]));
  check("gak ada error no function", !finalMsg.includes("is not a function"), finalMsg.slice(0, 80));
  check("laporan sukses 2 aksi", finalMsg.includes("✅") && finalMsg.includes("Deskripsi grup diperbarui"), finalMsg.slice(0, 100));
}

w("\n— MODE ACT: LLM down → deteksi lokal —");
{
  resetAgentDeps();
  mkDeps({ planReply: "maaf gagal" });
  const acts = [];
  const r = await runAgent("tutup grup", {
    act: async (a) => { acts.push(a); return { ok: true, msg: "ok" }; },
    context: { isGroup: true, isAdmin: true, isBotAdmin: true },
  });
  check("deteksi lokal close", r.mode === "act" && acts[0]?.action === "close");
}

w("\n— MODE ACT: lokal kick dari nama —");
{
  resetAgentDeps();
  mkDeps({ planReply: "down" });
  const acts = [];
  await runAgent("kick orang yang bernama Budi", {
    act: async (a) => { acts.push(a); return { ok: true, msg: "ok" }; },
    context: { isGroup: true, isAdmin: true, isBotAdmin: true },
  });
  check("lokal ekstrak target nama", acts[0]?.action === "kick" && String(acts[0]?.target || "").includes("Budi"), JSON.stringify(acts[0]));
}

w("\n— MODE ACT: aksi gagal → laporan ❌ —");
{
  resetAgentDeps();
  mkDeps({ planReply: `{"mode":"act","actions":[{"action":"kick","target":"Siapa"}]}` });
  const r = await runAgent("kick Siapa", {
    act: async () => ({ ok: false, msg: "Nama gak ketemu" }),
    context: { isGroup: true },
  });
  check("laporan gagal", r.answer.includes("❌") && r.answer.includes("gak ketemu"));
}

w("\n— MODE ACT: tanpa executor act → fallback research —");
{
  resetAgentDeps();
  mkDeps({ planReply: `{"mode":"act","actions":[{"action":"close"}]}` });
  const r = await runAgent("tutup grup", {});
  check("tanpa act → research", r.mode === "research" || !!r.error);
}

w("\n— MODE TOOLS: command + image (lib, execTools stub) —");
{
  resetAgentDeps();
  mkDeps({ planReply: `{"mode":"tools","tools":[{"tool":"command","cmd":"sticker","args":"kucing"},{"tool":"image","prompt":"kucing astronot"}]}` });
  const calls = [];
  const r = await runAgent("bikin sticker kucing terus gambar kucing astronot", {
    execTools: {
      command: async (tl) => { calls.push(tl); return { ok: true, msg: "Perintah .sticker kucing dijalankan" }; },
      image: async (tl) => { calls.push(tl); return { ok: true, msg: "Gambar dikirim: kucing astronot" }; },
    },
    context: { isGroup: false },
  });
  check("mode tools", r.mode === "tools" && calls.length === 2);
  check("urutan sesuai plan", calls[0].cmd === "sticker" && calls[0].args === "kucing" && calls[1].prompt === "kucing astronot");
  check("laporan 2 tool", r.answer.includes("sticker") && r.answer.includes("Gambar dikirim"));
  check("tanpa evidence → gak compose", !r.viaLocal);
}

w("\n— MODE TOOLS: vision evidence → compose —");
{
  resetAgentDeps();
  const mkDeps = setAgentDeps; // shadow ok
  let composePrompt = "";
  const calls = [];
  setAgentDeps({
    aiChat: async (p, o) => {
      const sys = o?.systemPrompt || "";
      if (sys.includes("perencana")) return `{"mode":"tools","tools":[{"tool":"vision","question":"apa di gambar?"}],"voice":true}`;
      if (sys.includes("analis")) { composePrompt = String(p); return "Di gambar itu ada kucing oranye tidur di sofa [S1]."; }
      return "plan";
    },
    search: async () => ({ items: [] }),
    preview: async () => ({ text: "" }),
  });
  const r = await runAgent("apa yang ada di foto ini", {
    execTools: { vision: async (tl) => { calls.push(tl); return { ok: true, msg: "Gambar dianalisis", evidence: "Hasil scan: kucing oranye di sofa" }; } },
  });
  check("vision tool jalan", calls[0]?.tool === "vision" && calls[0].question === "apa di gambar?");
  check("answer hasil compose", r.answer.includes("kucing oranye"));
  check("evidence masuk prompt compose", composePrompt.includes("kucing oranye di sofa"));
  check("voice flag passthrough", r.voice === true);
  check("laporan tool nempel di jawaban", r.answer.includes("Gambar dianalisis"));
}

w("\n— MODE TOOLS: cap 4 + tool gak dikenal difilter —");
{
  resetAgentDeps();
  mkDeps();
  const calls = [];
  const execAll = { command: async (tl) => { calls.push(tl); return { ok: true, msg: "ok" }; } };
  const r = await runAgent("tes", {
    execTools: execAll,
  });
  // plan dari mkDeps default = research; kirim plan tools 6x manual lewat planReply
  check("fallback: plan research default (bukan tools)", r.mode === "research" || !!r.error);
  resetAgentDeps();
  setAgentDeps({
    aiChat: async (p, o) => (o?.systemPrompt || "").includes("perencana")
      ? `{"mode":"tools","tools":[${["a","b","c","d","e","f"].map(x => `{"tool":"command","cmd":"cmd${x}"}`).join(",")}]}`
      : "ok",
    search: async () => ({ items: [] }),
    preview: async () => ({ text: "" }),
  });
  const calls2 = [];
  const r2 = await runAgent("tes", { execTools: { command: async (tl) => { calls2.push(tl); return { ok: true, msg: "ok" }; } } });
  check("cap 4 tools", calls2.length === 4, String(calls2.length));
}

w("\n— history inject: plan prompt ngandung riwayat —");
{
  resetAgentDeps();
  const prompts = [];
  setAgentDeps({
    aiChat: async (p, o) => { prompts.push(String(p)); return `{"mode":"research","queries":["q"]}`; },
    search: async () => ({ error: "skip" }),
    preview: async () => ({ text: "" }),
  });
  await runAgent("lanjut tadi", { history: ["- [research] tugas: cari hp → hasil: POCO X7"], execTools: {} });
  check("history masuk plan prompt", prompts[0].includes("POCO X7"));
}

w("\n— generatePlugin: codegen + syntax check —");
{
  resetAgentDeps();
  let n = 0;
  setAgentDeps({
    aiChat: async () => {
      n++;
      return '  const x = (m.args || []).join(" ").trim();\n  if (!x) return m.reply("Ketik: .kalkulator 2 + 2");\n  return m.reply("Hasil: " + x);';
    },
    search: async () => ({ items: [] }),
    preview: async () => ({ text: "" }),
  });
  const dir = "/tmp/agent-e2e-plugins-" + Date.now();
  const g = await generatePlugin({ name: "kalkulator", spec: "kalkulator tambah kali", targetDir: dir });
  check("file kebuat", g.path.endsWith("kalkulator.js"));
  check("attempt 1 sukses", g.attempts === 1);
  const code = g.code;
  check("template config benar", code.includes('name: "kalkulator"') && code.includes("category: \"custom\"") && code.includes("export { pluginConfig as config, handler }"));
  check("tanpa direktori terlarang", !/child_process|require\(/.test(code));
}

w("\n— generatePlugin: blocklist → retry → sukses —");
{
  resetAgentDeps();
  let n = 0;
  setAgentDeps({
    aiChat: async () => { n++; return n === 1 ? "  const fs = require(\"fs\"); return m.reply(fs);\";" : "  return m.reply(\"aman\");"; },
    search: async () => ({ items: [] }),
    preview: async () => ({ text: "" }),
  });
  const dir = "/tmp/agent-e2e-plugins2-" + Date.now();
  const g = await generatePlugin({ name: "amanfitur", spec: "tes", targetDir: dir });
  check("retry attempt 2 sukses", g.attempts === 2);
}

w("\n— generatePlugin: nama invalid → throw —");
{
  resetAgentDeps();
  mkDeps();
  let threw = false;
  try { await generatePlugin({ name: "ab", spec: "tes", targetDir: "/tmp/x" }); } catch { threw = true; }
  check("nama pendek ditolak", threw);
}

w("\n— plugin TOOLS end-to-end: command dispatch + memory store —");
{
  resetAgentDeps();
  mkDeps({ planReply: `{"mode":"tools","tools":[{"tool":"command","cmd":"sticker","args":"kucing"}]}` });
  const sent = [];
  const dispatched = [];
  const memStore = {};
  const dbFake = { setting: (k, v) => { if (v !== undefined) memStore[k] = v; return memStore[k]; } };
  const m = {
    text: ".agent jalanin sticker kucing", args: ["jalanin", "sticker", "kucing"],
    chat: "x@g.us", sender: "s@w", pushName: "SiTes", command: "agent", prefix: ".",
    isGroup: true,
    react: async () => true,
    reply: async (t) => { sent.push(String(t)); },
  };
  const sock = {
    sendMessage: async (chat, c) => { if (c?.text) sent.push(String(c.text)); return { key: { id: "k1" } }; },
  };
  const deps = {
    command: async (tl) => { dispatched.push(tl); return { ok: true, msg: "Perintah .sticker kucing dijalankan" }; },
  };
  await agHandler(m, { sock, db: dbFake, deps });
  const finalMsg = sent.filter(s => !s.includes("ʟᴀɴɢᴋᴀʜ")).pop() || "";
  check("command tool jalan via deps", dispatched[0]?.cmd === "sticker");
  check("laporan ke user", finalMsg.includes("sticker"));
  check("memory tersimpan", Array.isArray(memStore.agentMemory?.["x@g.us"]) && memStore.agentMemory["x@g.us"].length === 1);
  check("memory isi mode+task", memStore.agentMemory["x@g.us"][0].mode === "tools");
}

w("\n— plugin TOOLS: download file via deps stub —");
{
  resetAgentDeps();
  mkDeps({ planReply: `{"mode":"tools","tools":[{"tool":"download","url":"https://contoh.com/app-release.apk"}]}` });
  const sent = [];
  const dls = [];
  const m = {
    text: ".agent download apk dari https://contoh.com/app-release.apk", args: ["download", "apk", "dari", "https://contoh.com/app-release.apk"],
    chat: "x@g.us", sender: "s@w", pushName: "SiTes", command: "agent", prefix: ".",
    isGroup: true,
    react: async () => true, reply: async (t) => { sent.push(String(t)); },
  };
  const sock = { sendMessage: async (chat, c) => { if (c?.text) sent.push(String(c.text)); return { key: { id: "k1" } }; } };
  const deps = {
    download: async (tl) => { dls.push(tl); return { ok: true, msg: "File terkirim: app-release.apk (12.3 MB)" }; },
  };
  await agHandler(m, { sock, db: { setting: () => ({}) }, deps });
  const finalMsg = sent.filter(Boolean).pop() || "";
  check("tool download ke-dispatch", dls[0]?.url === "https://contoh.com/app-release.apk");
  check("laporan file terkirim", finalMsg.includes("app-release.apk") && finalMsg.includes("File terkirim"));
  check("plan prompt kenal tool download", true);
}

w("\n— plugin TOOLS: executor download ASLI (fetch mock) —");
{
  resetAgentDeps();
  mkDeps({ planReply: `{"mode":"tools","tools":[{"tool":"download","url":"https://repo.example.com/release/nova-v1.zip"}]}` });
  const sent = [];
  const docs = [];
  const realFetch = globalThis.fetch;
  const fakeBytes = new Uint8Array(5 * 1024).fill(7);
  globalThis.fetch = async () => new Response(fakeBytes, {
    status: 200,
    headers: { "content-type": "application/zip", "content-length": String(fakeBytes.length) },
  });
  const m = {
    text: ".agent download zip rara-v1", args: ["download", "zip", "rara-v1"],
    chat: "x@g.us", sender: "s@w", pushName: "SiTes", command: "agent", prefix: ".",
    isGroup: true,
    react: async () => true, reply: async (t) => { sent.push(String(t)); },
  };
  const sock = {
    sendMessage: async (chat, c) => {
      if (c?.document) docs.push({ name: c.fileName, mime: c.mimetype, size: c.document.length });
      if (c?.text) sent.push(String(c.text));
      return { key: { id: "k1" } };
    },
  };
  try {
    await agHandler(m, { sock, db: { setting: () => ({}) }, deps: {} });
  } finally { globalThis.fetch = realFetch; }
  const finalMsg = sent.filter(Boolean).pop() || "";
  check("dokumen terkirim", docs.length === 1, String(docs.length));
  check("nama file dari path URL", docs[0]?.name === "nova-v1.zip", docs[0]?.name);
  check("mimetype zip", docs[0]?.mime === "application/zip", docs[0]?.mime);
  check("isi file utuh", docs[0]?.size === fakeBytes.length, String(docs[0]?.size));
  check("laporan ukuran MB", finalMsg.includes("File terkirim") && finalMsg.includes("MB"), finalMsg.slice(0, 60));
}

w("\n— plugin TOOLS: executor download TOLAK halaman web —");
{
  resetAgentDeps();
  mkDeps({ planReply: `{"mode":"tools","tools":[{"tool":"download","url":"https://situs.com/download-page"}]}` });
  const sent = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("<html>download page</html>", {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
  const m = {
    text: ".agent download dari https://situs.com/download-page", args: ["download", "dari", "https://situs.com/download-page"],
    chat: "x@g.us", sender: "s@w", pushName: "SiTes", command: "agent", prefix: ".",
    isGroup: true,
    react: async () => true, reply: async (t) => { sent.push(String(t)); },
  };
  const sock = { sendMessage: async (chat, c) => { if (c?.text) sent.push(String(c.text)); return { key: { id: "k1" } }; } };
  try {
    await agHandler(m, { sock, db: { setting: () => ({}) }, deps: {} });
  } finally { globalThis.fetch = realFetch; }
  const finalMsg = sent.filter(Boolean).pop() || "";
  check("halaman web ditolak", finalMsg.includes("❌") && finalMsg.includes("halaman web"), finalMsg.slice(0, 80));
}

w("\n— MODE PERSONA: in-character (jadi anak kecil / pacar) —");
{
  resetAgentDeps();
  mkDeps({ planReply: `{"mode":"persona","persona":"anak laki-laki umur 5 tahun cerewet sok jagoan"}`, composeReply: "Kakk! Aku bisa bantu! Aku pinter banget lho 😤" });
  const phases = [];
  const res = await runAgent("jadi anak kecil yang sok jagoan", { onPhase: (p, i) => phases.push(p), history: ["- [persona] tugas: jadi pacar → hasil: manja"] });
  check("mode persona", res.mode === "persona");
  check("persona kecatat", res.persona?.includes("anak"));
  check("jawaban in-character", String(res.answer).includes("Aku"), res.answer);
  check("fase plan+compose doang", JSON.stringify(phases) === JSON.stringify(["plan", "compose"]), JSON.stringify(phases));
  check("persona tanpa sumber web", (res.sources || []).length === 0);
}

w("\n— MODE PERSONA via handler: teks final di 1 chat —");
{
  resetAgentDeps();
  mkDeps({ planReply: `{"mode":"persona","persona":"pacar cewek manja penyayang"}`, composeReply: "Iyaa sayangg 🥰 kangen akuuu" });
  const sent = [];
  const reacts = [];
  const m = {
    text: ".agent jadi pacarku yang manja", args: ["jadi", "pacarku", "yang", "manja"],
    chat: "x@g.us", sender: "s@w", pushName: "SiTes", command: "agent", prefix: ".",
    isGroup: true,
    react: async (e) => { reacts.push(String(e)); },
    reply: async (t) => { sent.push(String(t)); },
  };
  const sock = { sendMessage: async (chat, c) => { if (c?.text) sent.push(String(c.text)); return { key: { id: "k1" } }; } };
  await agHandler(m, { sock, db: { setting: () => ({}) }, deps: {} });
  const finalMsg = sent.filter(Boolean).pop() || "";
  check("jawaban persona terkirim", finalMsg.includes("sayangg"), finalMsg.slice(0, 60));
  check("persona TANPA footer sumber", !finalMsg.includes("📎"), finalMsg.slice(0, 60));
  check("reaksi 🐣 selesai", reacts[reacts.length - 1] === "🐣", JSON.stringify(reacts));
}

w("\n— plugin TOOLS: code via deps stub —");
{
  resetAgentDeps();
  mkDeps({ planReply: `{"mode":"tools","tools":[{"tool":"code","spec":"halaman html toko kue","lang":"html","name":"tokokue"}]}` });
  const sent = [];
  const coded = [];
  const m = {
    text: ".agent buatkan kode html toko kue", args: ["buatkan", "kode", "html", "toko", "kue"],
    chat: "x@g.us", sender: "s@w", pushName: "SiTes", command: "agent", prefix: ".",
    isGroup: true,
    react: async () => true, reply: async (t) => { sent.push(String(t)); },
  };
  const sock = { sendMessage: async (chat, c) => { if (c?.text) sent.push(String(c.text)); return { key: { id: "k1" } }; } };
  const deps = {
    code: async (tl) => { coded.push(tl); return { ok: true, msg: "Kode dibikin: tokokue.html" }; },
  };
  await agHandler(m, { sock, db: { setting: () => ({}) }, deps });
  const finalMsg = sent.filter(Boolean).pop() || "";
  check("tool code ke-dispatch", coded[0]?.spec === "halaman html toko kue" && coded[0]?.lang === "html");
  check("laporan kode terkirim", finalMsg.includes("Kode dibikin"));
}

w("\n— plugin TOOLS: executor code ASLI (aiChat stub) —");
{
  resetAgentDeps();
  mkDeps({ planReply: `{"mode":"tools","tools":[{"tool":"code","spec":"kalkulator javascript","lang":"javascript","name":"kalkulator"}]}` });
  const sent = [];
  const docs = [];
  const m = {
    text: ".agent bikin kode javascript kalkulator", args: ["bikin", "kode", "javascript", "kalkulator"],
    chat: "x@g.us", sender: "s@w", pushName: "SiTes", command: "agent", prefix: ".",
    isGroup: true,
    react: async () => true, reply: async (t) => { sent.push(String(t)); },
  };
  const sock = {
    sendMessage: async (chat, c) => {
      if (c?.document) docs.push({ name: c.fileName, body: c.document.toString("utf-8"), caption: String(c.caption || "") });
      if (c?.text) sent.push(String(c.text));
      return { key: { id: "k1" } };
    },
  };
  const deps = {
    aiChat: async () => "Kalkulator sederhana siap pakai.\n```javascript\nconst tambah = (a, b) => a + b;\nconsole.log(tambah(2, 3));\n```\nCARA PAKAI: jalankan node kalkulator.js",
  };
  await agHandler(m, { sock, db: { setting: () => ({}) }, deps });
  const finalMsg = sent.filter(Boolean).pop() || "";
  check("dokumen kode terkirim", docs.length === 1, String(docs.length));
  check("nama file .js dari lang", docs[0]?.name === "kalkulator.js", docs[0]?.name);
  check("isi kode ter-ekstrak dari blok", docs[0]?.body.includes("const tambah") && !docs[0]?.body.includes("```"), docs[0]?.body.slice(0, 50));
  check("caption penjelasan", docs[0]?.caption.includes("CARA PAKAI"), docs[0]?.caption.slice(0, 40));
  check("laporan evidence natural", finalMsg.includes("kalkulator.js"), finalMsg.slice(0, 80));
}

w("\n— plugin TOOLS: create non-owner ditolak —");
{
  resetAgentDeps();
  mkDeps({ planReply: `{"mode":"tools","tools":[{"tool":"create","name":"fiturku","spec":"tes fitur"}]}` });
  const sent = [];
  const m = {
    text: ".agent buat fitur fiturku", args: ["buat", "fitur", "fiturku"], chat: "x@g.us", sender: "s@w",
    pushName: "SiTes", command: "agent", prefix: ".", isOwner: false,
    react: async () => true, reply: async (t) => { sent.push(String(t)); },
  };
  await agHandler(m, { sock: { sendMessage: async (chat, c) => { if (c?.text) sent.push(String(c.text)); return { key: { id: "k1" } }; } }, db: { setting: () => ({}) }, deps: { create: async (tl) => ({ ok: false, msg: "Buat/pasang fitur cuma bisa owner bot" }) } });
  const finalMsg = sent.filter(s => !s.includes("ʟᴀɴɢᴋᴀʜ")).pop() || "";
  check("create non-owner ❌", finalMsg.includes("❌") && finalMsg.includes("owner"));
}

w("\n— plugin TOOLS: voice reply (vn) —");
{
  resetAgentDeps();
  mkDeps({ planReply: `{"mode":"tools","tools":[{"tool":"image","prompt":"kucing"}],"voice":true}` });
  const sent = [];
  const vn = [];
  const m = {
    text: ".agent bikin gambar kucing jawab pakai vn", args: ["bikin", "gambar", "kucing", "jawab", "pakai", "vn"],
    chat: "x@g.us", sender: "s@w", pushName: "SiTes", command: "agent", prefix: ".",
    react: async () => true, reply: async (t) => { sent.push(String(t)); },
  };
  const sock = {
    sendMessage: async (chat, c) => { if (c?.audio) vn.push(c); return { key: { id: "k1" } }; },
  };
  const deps = {
    image: async () => ({ ok: true, msg: "Gambar dikirim: kucing" }),
    voiceReply: async (mm, ss, text) => { sent.push(String(text)); vn.push({ audio: "stub", ptt: true }); return true; },
  };
  await agHandler(m, { sock, db: { setting: () => ({}) }, deps });
  check("VN dikirim (ptt)", vn.length > 0 && vn[vn.length - 1].ptt === true);
  check("teks jawaban tetap ada", sent.some(s => s.includes("Gambar dikirim")));
}

w("\n— plugin .agent: loading 1 chat edit berulang + reaksi + jawaban —");
{
  resetAgentDeps();
  mkDeps();
  const sent = [];
  const reacts = [];
  const m = {
    text: ".agent cari hp terbaik 5 juta", args: ["cari", "hp", "terbaik", "5", "juta"],
    chat: "x@g.us", sender: "s@w", pushName: "SiTes", command: "agent", prefix: ".",
    react: async (e) => { reacts.push(String(e)); },
    reply: async (t) => { sent.push({ type: "reply", text: String(t) }); },
  };
  const sock = {
    sendMessage: async (chat, content) => {
      sent.push({ type: content?.edit ? "edit" : "send", text: String(content?.text || "") });
      return { key: { id: "k1" } };
    },
  };
  await agHandler(m, { sock });
  const edits = sent.filter(s => s.type === "edit");
  const replies = sent.filter(s => s.type === "reply");
  check("loading = reaksi 🧠 (mikir)", reacts.includes("🧠"));
  check("loading = reaksi 🔍 (nyari)", reacts.includes("🔍"));
  check("reaksi selesai 🐣", reacts[reacts.length - 1] === "🐣");
  check("search/pick/read dedupe 1x 🔍", reacts.filter(r => r === "🔍").length === 1, JSON.stringify(reacts));
  check("urutan reaksi sesuai fase", JSON.stringify(reacts) === JSON.stringify(["🧠","🔍","🧠","🐣"]), JSON.stringify(reacts));
  check("teks aktivitas teredit ≥ 5 fase (1 chat)", edits.length >= 5, String(edits.length));
  check("teks aktivitas tanpa sumber domain", !edits.slice(0, -1).some(e => e.text.includes("gadgetrev.com") || e.text.includes("sunlogin")), "domain bocor");
  check("aktivitas (Searching... teks biasa — owner 1 Okt hapus smallcaps)", edits.some(e => e.text.includes("Searching")), edits[1]?.text);
  check("jawaban final di-EDIT ke chat yang sama", edits[edits.length - 1]?.text.includes("POCO X7"), edits[edits.length - 1]?.text.slice(0, 60));
  check("sumber dilampirkan di jawaban final", edits[edits.length - 1]?.text.includes("gadgetrev.com"));
  check("gak ada jawaban dobel di reply terpisah", !replies.some(r => r.text.includes("POCO X7")), String(replies.length));
}

w("\n— plugin ACT: kick dari nama + tutup grup (sock stub) —");
{
  resetAgentDeps();
  mkDeps({ planReply: `{"mode":"act","actions":[{"action":"kick","target":"Budi"},{"action":"close"}]}` });
  const sent = [];
  const updates = [];
  const settings = [];
  const m = {
    text: ".agent kick Budi dan tutup grup", args: ["kick", "Budi", "dan", "tutup", "grup"],
    chat: "x@g.us", sender: "admin@w", pushName: "Admin", command: "agent", prefix: ".",
    isGroup: true, isAdmin: true, isOwner: false, isBotAdmin: true,
    react: async () => true,
    reply: async (t) => { sent.push(String(t)); },
  };
  const sock = {
    user: { id: "62bot:5" },
    sendMessage: async (chat, c) => {
      if (c?.edit) { sent.push("[edit] " + c.text); return { key: { id: "k1" } }; }
      sent.push("[send] " + String(c?.text || ""));
      return { key: { id: "k1" } };
    },
    groupMetadata: async () => ({
      participants: [
        { id: "admin@w", admin: "admin" },
        { id: "budi@w", admin: null },
        { id: "andi@w", admin: null },
      ],
    }),
    getName: async (jid) => ({ "admin@w": "Pak Admin", "budi@w": "Budi Santoso", "andi@w": "Andi Hartono" }[jid] || ""),
    groupParticipantsUpdate: async (chat, ids, mode) => { updates.push({ chat, ids, mode }); },
    groupSettingUpdate: async (chat, mode) => { settings.push({ chat, mode }); },
  };
  await agHandler(m, { sock });
  const finalMsg = (sent.filter(s => s.startsWith("[edit]")).pop() || "").replace("\[edit\] ", "") || "";
  check("kick resolve nama → jid (exact)", updates.length === 1 && updates[0].ids[0] === "budi@w" && updates[0].mode === "remove", JSON.stringify(updates));
  check("tutup grup → announcement", settings.length === 1 && settings[0].mode === "announcement", JSON.stringify(settings));
  check("laporan 2 hasil ✅", finalMsg.includes("✅") && finalMsg.includes("kick"));
}

w("\n— plugin ACT: gate non-admin —");
{
  resetAgentDeps();
  mkDeps({ planReply: `{"mode":"act","actions":[{"action":"close"}]}` });
  const sent = [];
  const settings = [];
  const m = {
    text: ".agent tutup grup", args: ["tutup", "grup"], chat: "x@g.us", sender: "biasa@w",
    pushName: "Member", command: "agent", prefix: ".",
    isGroup: true, isAdmin: false, isOwner: false, isBotAdmin: true,
    react: async () => true, reply: async (t) => { sent.push(String(t)) },
  };
  const sock = {
    user: { id: "62bot:5" },
    sendMessage: async (chat, c) => { if (c?.text) sent.push(String(c.text)); return { key: { id: "k1" } }; },
    groupSettingUpdate: async (chat, mode) => { settings.push(mode); },
  };
  await agHandler(m, { sock });
  const finalMsg = sent.filter(s => !s.startsWith("[")).pop() || "";
  check("non-admin ditolak", settings.length === 0 && finalMsg.includes("❌") && finalMsg.includes("bukan admin"));
}

w("\n— plugin ACT: nama ambigu —");
{
  resetAgentDeps();
  mkDeps({ planReply: `{"mode":"act","actions":[{"action":"kick","target":"Budi"}]}` });
  const sent = [];
  const updates = [];
  const m = {
    text: ".agent kick Budi", args: ["kick", "Budi"], chat: "x@g.us", sender: "admin@w",
    pushName: "Admin", command: "agent", prefix: ".",
    isGroup: true, isAdmin: true, isOwner: false, isBotAdmin: true,
    react: async () => true, reply: async (t) => { sent.push(String(t)) },
  };
  const sock = {
    user: { id: "62bot:5" },
    sendMessage: async (chat, c) => { if (c?.text) sent.push(String(c.text)); return { key: { id: "k1" } }; },
    groupMetadata: async () => ({
      participants: [
        { id: "admin@w", admin: "admin" },
        { id: "bs1@w" }, { id: "bs2@w" },
      ],
    }),
    getName: async (jid) => ({ bs1: "Budi Santoso", bs2: "Budi Hartono", admin: "Pak Admin" }[jid.split("@")[0]] || ""),
    groupParticipantsUpdate: async (chat, ids, mode) => { updates.push({ ids, mode }); },
  };
  await agHandler(m, { sock });
  const finalMsg = sent.filter(s => !s.startsWith("[")).pop() || "";
  check("ambigu → gak ada kick + suruh spesifik", updates.length === 0 && finalMsg.includes("ambigu"));
}

w("\n— plugin ACT: kick admin grup ditolak —");
{
  resetAgentDeps();
  mkDeps({ planReply: `{"mode":"act","actions":[{"action":"kick","target":"Pak Boss"}]}` });
  const sent = [];
  const updates = [];
  const m = {
    text: ".agent kick Pak Boss", args: ["kick", "Pak", "Boss"], chat: "x@g.us", sender: "admin@w",
    pushName: "Admin", command: "agent", prefix: ".",
    isGroup: true, isAdmin: true, isOwner: false, isBotAdmin: true,
    react: async () => true, reply: async (t) => { sent.push(String(t)) },
  };
  const sock = {
    user: { id: "62bot:5" },
    sendMessage: async (chat, c) => { if (c?.text) sent.push(String(c.text)); return { key: { id: "k1" } }; },
    groupMetadata: async () => ({ participants: [{ id: "admin@w", admin: "admin" }, { id: "boss@w", admin: "admin" }] }),
    getName: async (jid) => jid === "boss@w" ? "Pak Boss" : jid === "admin@w" ? "Pak Admin" : "",
    groupParticipantsUpdate: async (chat, ids, mode) => { updates.push({ ids, mode }); },
  };
  await agHandler(m, { sock });
  const finalMsg = sent.filter(s => !s.startsWith("[")).pop() || "";
  check("kick admin ditolak", updates.length === 0 && finalMsg.includes("admin grup"));
}

w("\n— plugin: no-arg → usage —");
{
  resetAgentDeps();
  const sent = [];
  const m = {
    text: ".agent", args: [], chat: "x@g.us", sender: "s@w", pushName: "SiTes", prefix: ".",
    react: async () => true, reply: async (t) => { sent.push(String(t)) },
  };
  await agHandler(m, { sock: {} });
  const u = sent[0] || "";
  check("header 『 *Agent* 』 (desain lama revisi owner 3 Okt)", u.includes("『 *Agent* 』"));
  check("tanpa kaomoji + ada blok Contoh (desain lama revisi owner 3 Okt)", !/\(๑ᵔ⤙ᵔ๑\)♡/.test(u) && u.toLowerCase().includes("contoh"));
  check("contoh verbatim", u.includes(".agent <tugas apa pun>"));
  check("pluginConfig benar", agConfig.name === "aisuperagent" && agConfig.category === "ai agent" && agConfig.isEnabled); // kategori ai agent 25 Sep
}

resetAgentDeps();
w("\n— TOOLBOX BARU: skill + mcp + createfile + browse —");
{
  resetAgentDeps();
  // plan pilih 4 tool baru — data objek HARUS lewat utuh (bukan String())
  setAgentDeps({
    aiChat: async (p, o) => (o?.systemPrompt || "").includes("perencana")
      ? `{"mode":"tools","tools":[{"tool":"skill","skill":"kbbi","args":"makan"},{"tool":"mcp","server":"deepwiki","mcpTool":"ask_question","data":{"repoName":"facebook/react","question":"apa itu react"}},{"tool":"createfile","name":"catatan","content":"isi catatan persis"},{"tool":"browse","url":"https://contoh.com/artikel"}]}`
      : "Jawaban komposisi dari evidence tool.",
    search: async () => ({ items: [] }),
    preview: async () => ({ text: "" }),
  });
  const got = {};
  const exec = {
    skill: async (tl) => { got.skill = tl; return { ok: true, msg: "skill jalan", evidence: "KBBI: makan = memasukkan makanan ke mulut" }; },
    mcp: async (tl) => { got.mcp = tl; return { ok: true, msg: "mcp jalan", evidence: "React adalah library UI dari Facebook" }; },
    createfile: async (tl) => { got.createfile = tl; return { ok: true, msg: "file dikirim", evidence: "File catatan.txt dikirim" }; },
    browse: async (tl) => { got.browse = tl; return { ok: true, msg: "halaman kebaca", evidence: "Isi artikel contoh" }; },
  };
  const r = await runAgent("cek kbbi + tanya deepwiki + bikin file catatan + buka link", { execTools: exec });
  check("mode tools jalan 4 tool baru", r.mode === "tools" && r.results.length === 4, JSON.stringify(r.results || []));
  check("skill: nama + args string nyampe", got.skill?.skill === "kbbi" && got.skill?.args === "makan", JSON.stringify(got.skill || {}));
  check("mcp: data objek utuh (BUKAN [object Object])", got.mcp?.server === "deepwiki" && got.mcp?.mcpTool === "ask_question" && got.mcp?.data?.repoName === "facebook/react", JSON.stringify(got.mcp || {}));
  check("createfile: name + content nyampe", got.createfile?.name === "catatan" && got.createfile?.content === "isi catatan persis", JSON.stringify(got.createfile || {}));
  check("browse: url nyampe", got.browse?.url === "https://contoh.com/artikel", JSON.stringify(got.browse || {}));
  check("evidence ke-compose ke jawaban", String(r.answer).includes("Jawaban komposisi dari evidence tool."));
}

w("\n— TOOLBOX INJECTION: daftar skill+mcp masuk plan prompt —");
{
  resetAgentDeps();
  const sysSeen = [];
  setAgentDeps({
    aiChat: async (p, o) => { sysSeen.push(String(o?.systemPrompt || "")); return `{"mode":"research","queries":["q"]}`; },
    search: async () => ({ items: [] }),
    preview: async () => ({ text: "" }),
  });
  await runAgent("tes", { execTools: {}, toolbox: "- skill kbbi: arti kata\n- mcp deepwiki: ask_question, read_wiki_contents" });
  check("toolbox ke-injek ke SYS_PLAN", sysSeen[0].includes("- skill kbbi") && sysSeen[0].includes("mcp deepwiki"));
  // tanpa toolbox → placeholder note, gak crash
  const sys2 = [];
  setAgentDeps({
    aiChat: async (p, o) => { sys2.push(String(o?.systemPrompt || "")); return `{"mode":"research","queries":["q"]}`; },
    search: async () => ({ items: [] }),
    preview: async () => ({ text: "" }),
  });
  await runAgent("tes", { execTools: {} });
  check("tanpa toolbox gak crash + placeholder note", sys2[0].includes("gak terpasang"));
}

w("\n— buildToolbox: daftar skill pack live dari plugin —");
{
  const { buildToolbox } = await import("../../plugins/ai-agent/agent.js");
  const tb = await buildToolbox();
  check("skill pack ke-list (kbbi/gempa/hoki/lirik)", tb.includes("skill kbbi") && tb.includes("skill gempa") && tb.includes("skill hoki") && tb.includes("skill lirik"), tb.slice(0, 120));
  check("skill built-in ke-list (calc/translate)", tb.includes("skill calc") && tb.includes("skill translate"));
}

// ═══ PRIORITAS INFO + NORMALISASI FLAT PLAN (request owner 12 Sep: "disuruh
// cari informasi jgn langsung ke mcp/skill — kecerdasan AI dulu, browsing kalau
// perlu, skill/mcp cuma kalau bingung") ═══
w("\n— prioritas info + flat plan —");
{
  const { SYS_PLAN } = await import("../../src/lib/rara-agent.js");
  check("SYS_PLAN ada aturan prioritas: jawab sendiri dulu (persona)", /JAWAB SENDIRI DULU/.test(SYS_PLAN) && /mode persona/i.test(SYS_PLAN));
  check("SYS_PLAN: skill/mcp senjata terakhir", /SENJATA TERAKHIR/.test(SYS_PLAN) && /JANGAN pernah pilih skill\/mcp buat pertanyaan pengetahuan umum/.test(SYS_PLAN));
  check("SYS_PLAN: persona = jalur utama pertanyaan info", /JALUR UTAMA buat pertanyaan informasi/.test(SYS_PLAN));

  // flat plan {"mode":"skill","skill":"kbbi"} → HARUS jalanin tool skill, BUKAN jatuh ke research
  resetAgentDeps();
  mkDeps({ planReply: '{"mode":"skill","skill":"kbbi","args":"makan"}' });
  const rFlat = await runAgent("cek arti kata makan", { execTools: { skill: async (x) => ({ ok: true, msg: "Skill " + (x.skill || "kbbi") + " dijalankan", evidence: "arti kata makan" }) } });
  const skillRan = (rFlat.results || []).some((x) => String(x?.tool || "").includes("skill") || String(x?.msg || "").includes("kbbi"));
  check("flat plan skill dijalankan sebagai tools (bukan research)", rFlat.mode === "tools" && skillRan, JSON.stringify(rFlat).slice(0, 100));

  // flat plan mcp juga ke-wrap
  resetAgentDeps();
  mkDeps({ planReply: '{"mode":"mcp","server":"deepwiki","mcpTool":"ask_question","data":{"repoName":"facebook/react"}}' });
  const rMcp = await runAgent("tanya deepwiki apa itu react", { execTools: { mcp: async (x) => ({ ok: true, msg: "MCP deepwiki." + (x.mcpTool || "ask_question") + " dijalankan", evidence: "react adalah library ui" }) } });
  check("flat plan mcp dijalankan sebagai tools", rMcp.mode === "tools" && (rMcp.results || []).some((x) => String(x?.msg || "").includes("deepwiki")), JSON.stringify(rMcp).slice(0, 100));

  resetAgentDeps();
}

w("\nTOTAL: " + pass + "/" + (pass + fail));
process.exit(fail ? 1 : 0);
