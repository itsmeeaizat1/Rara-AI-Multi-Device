// E2E AI AGENT (11 Sep 2026) — stub aiChat/search/preview via setAgentDeps.
// Deterministik tanpa network. Jalankan dari cwd DIR KOSONG:
//   mkdir -p /tmp/agent-e2e && cd /tmp/agent-e2e && node <repo>/test/agent-e2e/e2e.mjs
import { setAgentDeps, resetAgentDeps, runAgent } from "../../src/lib/nova-agent.js";
import { config as agConfig, handler as agHandler } from "../../plugins/ai/agent.js";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : extra ? ` — ${extra}` : "")); ok ? pass++ : fail++; };
const SC_MAP = { a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',y:'ʏ',z:'ᴢ' };
const toSC = (s) => String(s || "").replace(/[a-zA-Z]/g, c => SC_MAP[c.toLowerCase()] || c);

const ITEMS = [
  { title: "5 HP Terbaik 2026", url: "https://gadgetrev.com/hp-terbaik", snippet: "daftar hp terbaik dengan harga" },
  { title: "Review POCO X7", url: "https://revu.xyz/poco-x7", snippet: "review lengkap poco x7 gaming" },
  { title: "HP Gaming Murah", url: "https://tekno.id/hp-gaming", snippet: "hp gaming di bawah 5 juta" },
];

function mkDeps({ planReply, pickReply, composeReply, searchOk = true, previewOk = true } = {}) {
  const calls = { ai: [], search: [], preview: [] };
  setAgentDeps({
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

w("\n— search gagal total → error —");
{
  resetAgentDeps();
  mkDeps({ searchOk: false });
  const r = await runAgent("tes", {});
  check("error hasil kosong", !!r.error && r.error.includes("pencarian"));
}

w("\n— plugin .agent: progress + jawaban —");
{
  resetAgentDeps();
  mkDeps();
  const sent = [];
  const m = {
    text: ".agent cari hp terbaik 5 juta", args: ["cari", "hp", "terbaik", "5", "juta"],
    chat: "x@g.us", sender: "s@w", pushName: "SiTes", command: "agent", prefix: ".",
    react: async () => true,
    reply: async (t) => { sent.push({ type: "reply", text: String(t) }); },
  };
  const sock = {
    sendMessage: async (chat, content) => {
      if (content?.edit) { sent.push({ type: "edit", text: String(content.text) }); return { key: { id: "k1" } }; }
      sent.push({ type: "send", text: String(content?.text || "") });
      return { key: { id: "k1" } };
    },
  };
  await agHandler(m, { sock });
  const edits = sent.filter(s => s.type === "edit");
  const replies = sent.filter(s => s.type === "reply");
  check("status progress teredit ≥ 5 fase", edits.length >= 5, String(edits.length));
  check("progress bar langkah", edits.some(e => e.text.includes("ʟᴀɴɢᴋᴀʜ")));
  check("jawaban final dikirim", replies.some(r => r.text.includes("POCO X7")));
  check("sumber dilampirkan", replies.some(r => r.text.includes("gadgetrev.com")));
  check("status akhir selesai", edits[edits.length - 1]?.text.includes("ʀɪꜱᴇᴛ ꜱᴇʟᴇꜱᴀɪ"));
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
  check("header ✦ agent ✦", u.includes(`「 ✦ ${toSC("AGENT")} ✦ 」`));
  check("cara pakai smallcaps", u.includes(toSC("Cara Pakai")));
  check("contoh verbatim", u.includes(".agent <tugas apa pun>"));
  check("pluginConfig benar", agConfig.name === "agent" && agConfig.category === "ai" && agConfig.isEnabled);
}

resetAgentDeps();
w("\nTOTAL: " + pass + "/" + (pass + fail));
process.exit(fail ? 1 : 0);
