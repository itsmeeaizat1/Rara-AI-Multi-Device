// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// 9router.js — 9ROUTER LOKAL NATIVE (rename owner 25 Sep: cmd .9router, bukan .ai9)
//
// Seakan-akan bot sudah menginstal & menjalankan 9router BENERAN di Node.js:
// engine src/lib/rara-9router-local.js spawn `9router` bareng bot
// (127.0.0.1:20128), gateway key di-auto-provision, key provider berbayar
// di-sync dari src/lib/apikey/apikeys.json (section "router"). Chat 100% lewat 9router
// lokal — TANPA fallback ke AI API lain (nexai/ikyy/zhipu/groq/dll).
//
// Command (semua berawalan titik):
//   .9router <pesan>                      → chat AI (default model per chat)
//   .9router gambar <prompt>              → generate gambar (imageOutput model)
//   .9router model [keyword]              → daftar model live (747 model)
//   .9router setmodel <id>                → ganti model default chat ini
//   .9router status                       → kondisi 9router lokal
//   .9router sync                         → (owner) sync key dari apikeys.json (section "router")
//   .9router start                        → (owner) paksa nyalain 9router
//
// + VISION NATIVE: kirim/reply foto + caption → model vision live (glm-4.6v
//   dsb) via multimodal chat 9router — bukan Gemini external.
// + Model yang dipakai nongol di footer tiap jawaban (transparansi routing).
import { raraBox, raraGuide } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
import { smallcapsText } from "../../src/lib/styler.js";
import {
  ensure9RouterRunning, ensureRouter9GatewayKey, syncRouter9ProviderKeys, killStalePort9Router,
  invalidateRouter9GatewayKey, router9ValidateGatewayKey, router9AuthDiag,
  router9Models, router9FindModel, router9Chat, router9ImageGen,
  router9ImageModels, router9VisionModels, router9Stats,
  getRouter9Base, getRouter9Port, ROUTER9_DEFAULT_MODEL,
} from "../../src/lib/rara-9router-local.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import { getBrainStatus, getBrainModel, setBrainModel, getBrainMode } from "../../src/lib/rara-agent-brain.js";
import { getSession, appendTurn, toMessages } from "../../src/lib/rara-ai-session.js";

const pluginConfig = {
  name: "9router",
  alias: ["ai9", "router9", "rararouter"], // nama lama tetap jalan
  category: "ai",
  description: "9Router Lokal — chat AI 747 model via 9router native yang jalan bareng bot (tanpa API luar)",
  usage: ".9router <pesan> | .9router gambar <prompt> | .9router model [keyword] | .9router setmodel <id> | .9router status | .9router otak | .9router sync (owner) | .9router restart (owner)",
  example: ".9router jelaskan siapa presiden indonesia\n.9router buatkan gambar kucing\n.9router model glm\n.9router setmodel glm/glm-4.7\n.9router status",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const SUBS = ["model", "setmodel", "modelset", "status", "sync", "start", "restart", "gambar", "image", "img", "buat", "ag", "agent"];
const IMG_WORDS = ["gambar", "image", "img", "buat", "buatkan"];

// ── helper pref model per chat ──
function getPrefs() {
  const db = getDatabase();
  if (!db.data.router9 || typeof db.data.router9 !== "object") db.data.router9 = { prefs: {} };
  if (!db.data.router9.prefs) db.data.router9.prefs = {};
  return db.data.router9.prefs;
}
function getModelPref(chatId) {
  return getPrefs()[chatId] || ROUTER9_DEFAULT_MODEL;
}

// ── kartu panduan (usage V2) ──
function guide(m) {
  return m.reply(raraGuide("9router", {
    kaomoji: "ヾ(≧▽≦*)o 🚀",
    sapaan: "9Router lokal udah jalan bareng bot — 747 model AI siap dipakai!",
    cara: "tiket pertanyaan buat chat AI, ag <tugas> buat suruh agent browsing/bikin kode/bikin file, gambar buat bikin gambar, model buat liat daftar model, setmodel buat ganti model default",
    contoh: ".9router jelaskan siapa presiden indonesia\n.9router ag browsing berita hari ini\n.9router ag buatkan kode fitur html\n.9router model glm\n.9router setmodel glm/glm-4.7",
    note: "kirim/reply foto + caption pertanyaan juga bisa — dibaca model vision native 9router\nsync & start hanya owner",
    modelAktif: getModelPref(m.chat),
    spec: ["⚡ layanan lokal 9router", "⏱ cooldown 5 dtk", "💸 gratis"],
  }));
}

async function handler(m, { sock, args, botConfig, db, deps } = {}) {
  const argList = (args || []).map(String);
  const sub = argList[0]?.toLowerCase() || "";

  // ── VISION NATIVE: foto di-attach (caption = pertanyaan) atau di-reply ──
  const hasImage = (m.quoted && m.quoted.isImage) || m.isImage;
  if (hasImage && !SUBS.includes(sub)) {
    try {
      await m.react("🕒");
      const buffer = m.quoted?.isImage ? await m.quoted.download() : await m.download();
      if (!buffer?.length) {
        await m.react("❌");
        return m.reply(raraBox("9Router", ["Gagal download gambar — coba kirim ulang."]));
      }
      const prompt =
        (m.isImage && m.message?.imageMessage?.caption?.trim()) ||
        m.text?.trim() ||
        "Analisis gambar ini dan jelaskan dengan detail dalam bahasa Indonesia.";
      if (!prompt || /^(gambar|image|img|buat)$/i.test(prompt)) {
        await m.react("❌");
        return m.reply(raraBox("9Router", [
          "Caption-nya kosong — tulis pertanyaannya di caption foto,",
          "atau reply foto pakai .9router <pertanyaan>",
        ]));
      }

      // pilih model vision: pref kalau vision-capable, kalau gak → model vision pertama
      let model = getModelPref(m.chat);
      let vis = null;
      try {
        const all = await router9Models();
        const cur = all.find((x) => x.id === model);
        if (!cur?.vision) {
          vis = await router9VisionModels();
          model = vis[0]?.id || model;
        }
      } catch { /* katalog gagal → pake pref, biar error asli yang muncul */ }

      const b64 = Buffer.from(buffer).toString("base64");
      const sKey = "satuan:" + m.sender;
      const history = toMessages(sKey);
      const r = await router9Chat({
        model,
        history,
        user: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${b64}` } },
        ],
      });
      appendTurn(sKey, prompt, r.text);
      await m.react("🐣");
      const body = r.text.length > 3500 ? r.text.slice(0, 3500) + "..." : r.text;
      return m.reply(`${body}\n\n— via 9Router Lokal • ${r.model} • ${r.latencyMs}ms`);
    } catch (e) {
      console.error("[9router-vision]:", e.message);
      await m.react("❌");
      return m.reply(raraBox("9Router", ["Gagal: " + String(e.message).slice(0, 200)]));
    }
  }

  // ── .9router status ──
  if (sub === "status") {
    const st = router9Stats();
    const up = await ensure9RouterRunning({ waitMs: 5000 }).catch(() => ({ up: false }));
    let modelCount = "-", gw = "-";
    if (up.up) {
      try { modelCount = (await router9Models()).length; } catch { modelCount = "gagal"; }
      try {
        gw = (await ensureRouter9GatewayKey({ create: false })) ? "ok" : "belum";
      } catch { gw = "belum"; }
    }
    const lines = [
      `9Router Lokal Native — ${up.up ? "✅ hidup" : "❌ mati"}`,
      `Endpoint     : ${getRouter9Base()}/v1`,
      `Dashboard    : ${getRouter9Base()}/dashboard`,
      `Model live   : ${modelCount}`,
      `Gateway key  : ${gw}`,
      `Spawn bareng : ${up.spawned ? "baru saja" : "sudah jalan"}`,
      "---",
      `Permintaan   : ${st.requests} (ok ${st.ok} • gagal ${st.fail})`,
      `Latensi akhir: ${st.lastLatencyMs != null ? st.lastLatencyMs + "ms" : "-"}`,
      `Model akhir  : ${st.lastModel || "-"}`,
      st.lastError ? `Error akhir : ${String(st.lastError).slice(0, 100)}` : null,
      "---",
      `Key provider : src/lib/apikey/apikeys.json (section "router")`,
      `Sync ulang   : .9router sync (owner)`,
      `Model aktif  : ${getModelPref(m.chat)}`,
    ].filter(Boolean);
    return m.reply(raraBox("9Router Lokal — Status", lines));
  }

  // ── .9router model [keyword] — daftar model LIVE ──
  if (sub === "model") {
    const kw = argList.slice(1).join(" ").toLowerCase().trim();
    try {
      await m.react("🕒");
      const all = await router9Models();
      const vis = all.filter((x) => x.vision).length;
      const img = all.filter((x) => x.imageOutput).length;
      let pool = all;
      if (kw) pool = all.filter((x) => x.id.toLowerCase().includes(kw) || x.owner.toLowerCase().includes(kw));
      if (!pool.length) {
        await m.react("❌");
        return m.reply(raraBox("9Router", [
          `Gak ada model yang cocok dengan "${kw}".`,
          `Total model live: ${all.length} — lihat semua: .9router model`,
        ]));
      }
      const cap = 40;
      const lines = [`Total ${all.length} model live • 👁 vision ${vis} • 🎨 image-gen ${img}${kw ? ` • filter "${kw}": ${pool.length}` : ""}`, "---"];
      for (const x of pool.slice(0, cap)) {
        const tags = [x.vision ? "👁" : null, x.imageOutput ? "🎨" : null, x.reasoning ? "🧠" : null].filter(Boolean).join("");
        lines.push(`• ${x.id}${tags ? " " + tags : ""}`);
      }
      if (pool.length > cap) lines.push(`… dan ${pool.length - cap} lagi — sempit pakai keyword: .9router model ${kw || "glm"}`);
      lines.push("---", `Pakai model ini: .9router setmodel <id>`, `Model aktif kamu: ${getModelPref(m.chat)}`);
      await m.react("🐣");
      return m.reply(raraBox("9Router — Daftar Model", lines));
    } catch (e) {
      await m.react("❌");
      return m.reply(raraBox("9Router", ["Gagal ambil daftar model: " + String(e.message).slice(0, 160)]));
    }
  }

  // ── .9router setmodel <id> — ganti model default chat ini ──
  if (sub === "setmodel" || sub === "modelset") {
    const id = argList[1];
    if (!id) {
      return m.reply(raraBox("9Router", [
        `Format: .9router setmodel <id-model>`,
        `Contoh : .9router setmodel ${ROUTER9_DEFAULT_MODEL}`,
        `Daftar  : .9router model [keyword]`,
        `Aktif   : ${getModelPref(m.chat)}`,
      ]));
    }
    try {
      await m.react("🕒");
      const found = await router9FindModel(id);
      if (!found) {
        await m.react("❌");
        return m.reply(raraBox("9Router", [
          `Model "${id}" gak ada di daftar live 9Router.`,
          `Cari yang mirip: .9router model ${id.split("/").pop()}`,
        ]));
      }
      getPrefs()[m.chat] = found.id;
      getDatabase().save?.();
      await m.react("🐣");
      const tags = [found.vision ? "👁 bisa baca gambar" : null, found.imageOutput ? "🎨 bisa bikin gambar" : null, found.reasoning ? "🧠 reasoning" : null].filter(Boolean);
      return m.reply(raraBox("9Router — Model Diganti", [
        `Model default chat ini: ${found.id}`,
        tags.length ? `Kemampuan: ${tags.join(" • ")}` : null,
        `Context: ${found.ctx ? found.ctx.toLocaleString("id-ID") + " token" : "-"} • Max out: ${found.maxOut || "-"}`,
        "---",
        `Langsung coba: .9router halo`,
        `Balikin awal: .9router setmodel ${ROUTER9_DEFAULT_MODEL}`,
      ].filter(Boolean)));
    } catch (e) {
      await m.react("❌");
      return m.reply(raraBox("9Router", ["Gagal: " + String(e.message).slice(0, 160)]));
    }
  }

  // ── .9router sync (owner) — kirim key provider dari apikeys.json (section "router") ──
  // ── .9router otak — OTAK AI AGENT (aisuperagent/anovaagent/raraagent) ──
  // 3 Okt 2026 (owner: "ganti dari qwen min1ai, migrasi ke 9router lokal"):
  // agent kini memakai 9router lokal dulu, rantai lama sebagai cadangan.
  //   .9router otak                      → status jujur (siapa yang menjawab)
  //   .9router otak model <id>           → (owner) ganti model otak agent
  //   .9router otak mode 9router|chain|9router-only → (owner) saklar runtime
  if (sub === "otak" || sub === "brain") {
    const act = (argList[1] || "").toLowerCase();
    if (act === "model" || act === "mode") {
      if (!m.isOwner) return m.reply(raraBox("9Router — Otak Agent", ["Khusus owner."]));
      const val = argList.slice(2).join(" ").trim();
      if (!val) {
        return m.reply(raraBox("9Router — Otak Agent", [
          act === "model" ? "Format: .9router otak model <id>" : "Format: .9router otak mode 9router|chain|9router-only",
          act === "model" ? "Lihat daftar: .9router model <kata>" : "9router = 9router dulu, cadangan rantai lama",
        ]));
      }
      if (act === "mode") {
        if (!["9router", "chain", "9router-only"].includes(val.toLowerCase())) {
          return m.reply(raraBox("9Router — Otak Agent", ["Mode harus: 9router, chain, atau 9router-only."]));
        }
        process.env.AGENT_BRAIN = val.toLowerCase();
        return m.reply(raraBox("9Router — Otak Agent", [
          `Mode otak agent → ${getBrainMode()}`,
          "Berlaku langsung (sampai bot restart; permanen: set env AGENT_BRAIN).",
        ]));
      }
      // act === "model": validasi ke daftar model LIVE, jangan simpan buta
      try {
        const found = await router9FindModel(val);
        if (!found) {
          return m.reply(raraBox("9Router — Otak Agent", [`Model "${val}" gak ditemukan di 9Router.`, "Cari: .9router model <kata>"]));
        }
        setBrainModel(found.id);
        const warn = found.tools === false ? "Catatan: model ini tidak menandai dukungan tools; agent tetap jalan lewat JSON." : null;
        return m.reply(raraBox("9Router — Otak Agent", [
          `Model otak agent → ${getBrainModel()}`,
          `Reasoning: ${found.reasoning ? "ya" : "tidak"} • Vision: ${found.vision ? "ya" : "tidak"} • Konteks: ${found.ctx || "-"}`,
          warn,
          "Berlaku langsung (sampai bot restart; permanen: env AGENT_BRAIN_MODEL).",
        ].filter(Boolean)));
      } catch (e) {
        return m.reply(raraBox("9Router — Otak Agent", ["Gagal validasi model: " + String(e.message).slice(0, 140), "Pastikan 9router hidup: .9router status"]));
      }
    }
    const b = getBrainStatus();
    const l = b.last || {};
    const lines = [
      `Mode         : ${b.mode}`,
      `Model otak   : ${b.model}`,
      `Otak terakhir: ${l.brain ? (l.brain === "9router" ? "9Router lokal" : "Rantai cadangan") : "belum ada panggilan"}`,
      l.model ? `Model akhir  : ${l.model}` : null,
      l.ms != null ? `Latensi akhir: ${l.ms}ms` : null,
      l.error ? `Alasan cadangan: ${String(l.error).slice(0, 90)}` : null,
      "---",
      `Dijawab 9Router: ${b.counts.router9} • cadangan: ${b.counts.chain} • dilewati: ${b.counts.skipped}`,
      b.breakerOpen ? `Breaker TERBUKA — 9router dilewati ${b.breakerRemainingSec} dtk lagi` : `Gagal beruntun: ${b.consecutiveFails}/3`,
      "---",
      "Ganti model : .9router otak model <id> (owner)",
      "Ganti mode  : .9router otak mode 9router|chain|9router-only (owner)",
    ].filter(Boolean);
    return m.reply(raraBox("9Router — Otak Agent", lines));
  }

  if (sub === "sync") {
    if (!m.isOwner) {
      return m.reply(raraBox("9Router", ["Khusus owner."]));
    }
    try {
      await m.react("🕒");
      const up = await ensure9RouterRunning({ waitMs: 20000 });
      if (!up.up) {
        await m.react("❌");
        return m.reply(raraBox("9Router", [`9Router belum jalan: ${up.error || "-"}`]));
      }
      await ensureRouter9GatewayKey().catch((e) => console.error("[9router-sync]:", e.message));
      const r = await syncRouter9ProviderKeys();
      await m.react("🐣");
      const lines = [
        `Key baru di-sync : ${r.synced}`,
        `Sudah ada (skip) : ${r.skipped}`,
      ];
      if (r.errors?.length) lines.push("---", "Gagal:", ...r.errors.map((x) => "• " + x));
      lines.push("---", `Sumber: src/lib/apikey/apikeys.json (section "router")`, `Status: .9router status`);
      return m.reply(raraBox("9Router — Sync Key Provider", lines));
    } catch (e) {
      await m.react("❌");
      return m.reply(raraBox("9Router", ["Gagal sync: " + String(e.message).slice(0, 160)]));
    }
  }

  // ── .9router start (owner) — paksa nyalain 9router ──
  if (sub === "start") {
    if (!m.isOwner) {
      return m.reply(raraBox("9Router", ["Khusus owner."]));
    }
    await m.react("🕒");
    const up = await ensure9RouterRunning({ waitMs: 30000 });
    if (!up.up) {
      await m.react("❌");
      return m.reply(raraBox("9Router", [`Gagal: ${up.error || "unknown"}`, "Cek logs/9router-local.log"]));
    }
    let count = "-";
    try { count = (await router9Models()).length; } catch { /* telat gak masalah */ }
    await m.react("🐣");
    return m.reply(raraBox("9Router — Hidup", [
      `9Router jalan di ${getRouter9Base()}`,
      `Model live: ${count}`,
      `Dashboard: ${getRouter9Base()}/dashboard`,
    ]));
  }

  // .9router restart — paksa BUNUH proses lama (termasuk yang "basi":
  // health check hijau tapi auth-nya gak sinkron sama ~/.9router terbaru,
  // GOTCHA: nama proses udah ganti "next-server" — pattern "9router" gak
  // nembak) lalu spawn ulang. Fix manual buat bug "gagal bikin gateway key
  // 9router (HTTP 401)" padahal status bilang sudah hidup (1 Okt 2026).
  if (sub === "restart") {
    if (!m.isOwner) {
      return m.reply(raraBox("9Router", ["Khusus owner."]));
    }
    await m.react("🕒");
    const killed = await killStalePort9Router();
    const up = await ensure9RouterRunning({ waitMs: 30000 });
    if (!up.up) {
      await m.react("❌");
      return m.reply(raraBox("9Router", [
        `Proses lama: ${killed.killed ? `dimatikan (PID ${killed.pid})` : killed.reason}`,
        `Gagal nyalain ulang: ${up.error || "unknown"}`,
        "Cek logs/9router-local.log",
      ]));
    }
    let gw = "belum";
    try {
      let g = await ensureRouter9GatewayKey({ create: true });
      // ── VALIDASI (fix 1 Okt 2026 malam, report owner ".9router restart ttep
      // g bsa gagal"): dulunya key lama di JSON dipercaya buta — kartu bilang
      // "ok" padahal server udah nolak key itu → chat tetap 401. Sekarang key
      // DICEK dulu ke /v1/models; ditolak → buang + provisi baru SEKARANG.
      const v = await router9ValidateGatewayKey();
      if (!v.ok) {
        await invalidateRouter9GatewayKey();
        g = await ensureRouter9GatewayKey({ create: true });
        gw = g ? "ok (key lama basi — baru diprovisi)" : "belum";
      } else {
        gw = g ? "ok (key valid)" : "belum";
      }
    } catch (e) { gw = `gagal (${e.message})`; }
    let count = "-";
    try { count = (await router9Models()).length; } catch { /* telat gak masalah */ }
    const authLines = [];
    if (gw.startsWith("gagal") || gw === "belum") {
      const diag = router9AuthDiag();
      authLines.push("", `Auth file   : machine-id ${diag.midExists ? "ada" : "HILANG"}, cli-secret ${diag.secretExists ? "ada" : "HILANG"} (${diag.dataDir})`);
    }
    await m.react("🐣");
    return m.reply(raraBox("9Router — Restart", [
      `Proses lama : ${killed.killed ? `dimatikan (PID ${killed.pid})` : killed.reason}`,
      `9Router     : jalan di ${getRouter9Base()}`,
      `Gateway key : ${gw}`,
      `Model live  : ${count}`,
      ...authLines,
    ]));
  }

  // ── .9router gambar <prompt> — generate gambar via 9router ──
  if (IMG_WORDS.includes(sub)) {
    // buang kata perintah di depan prompt: "buatkan gambar kucing" → "kucing"
    const rest = argList.slice(1);
    while (rest.length && IMG_WORDS.includes(rest[0]?.toLowerCase())) rest.shift();
    const prompt = rest.join(" ").trim();
    if (!prompt) {
      return m.reply(raraBox("9Router", [
        "Format: .9router gambar <yang mau digambar>",
        "Contoh : .9router buatkan gambar kucing astronot",
      ]));
    }
    try {
      await m.react("🕒");
      // model imageOutput: preferensi kalo cocok, kalau gak → pertama yang live
      let model = null;
      try {
        const imgs = await router9ImageModels();
        const cur = getModelPref(m.chat);
        model = imgs.find((x) => x.id === cur)?.id || imgs[0]?.id || null;
      } catch { /* katalog gagal → null = default server */ }
      const r = await router9ImageGen({ model, prompt, n: 1 });
      let buf = null;
      if (r.b64) buf = Buffer.from(r.b64, "base64");
      else if (r.url) {
        const dl = await fetch(r.url);
        if (!dl.ok) throw new Error(`gagal download hasil gambar (HTTP ${dl.status})`);
        buf = Buffer.from(await dl.arrayBuffer());
      }
      if (!buf?.length) throw new Error("9router gak balas gambar");
      await m.react("🐣");
      let rrCap = prompt + `\n\n— via 9Router Lokal • ${r.model}`;
      try {
        const info = await probeBuffer(buf);
        const card = mediaResultCard({
          header: "9router",
          request: [["Model", r.model], ["Prompt", String(prompt).slice(0, 80)]],
          size: info.size, mime: info.mime, width: info.width, height: info.height,
        });
        if (card) rrCap = card;
      } catch {}
      await sock.sendMessage(m.chat, { image: buf, caption: rrCap }, { quoted: m });
      return;
    } catch (e) {
      console.error("[9router-gambar]:", e.message);
      await m.react("❌");
      return m.reply(raraBox("9Router", ["Generate gambar gagal: " + String(e.message).slice(0, 200)]));
    }
  }

  // ── default: CHAT ──
  const text = argList.join(" ").trim();
  // ── .9router ag <tugas> — AGENT MODE (tangan buat 9Router): browsing, bikin kode/file, dll ──
  if (sub === "ag" || sub === "agent") {
    const task = argList.slice(1).join(" ").trim();
    if (!task) {
      return m.reply(raraBox("9Router", [
        "Kasih tugasnya setelah 'ag':",
        "",
        "• .9router ag browsing berita gempa hari ini",
        "• .9router ag buatkan kode login page html",
        "• .9router ag bikin file catatan.txt isinya rencama liburan",
      ]));
    }
    await m.react("🛠️");
    let statusKey = null;
    try {
      // pre-check: 9router harus hidup duluan — gak boleh nyaru jadi error riset
      const up = await ensure9RouterRunning();
      if (!up.up) {
        await m.react("❌");
        return m.reply(raraBox("9Router", [
          "9Router lokal belum jalan" + (up.error ? " — " + up.error : ""),
          "Coba lagi atau .9router start (owner)",
        ]));
      }
      const [{ runAgent }, { buildExecutors, buildToolbox }, { memoryBlock }, { skillsBlock }] = await Promise.all([
        import("../../src/lib/rara-agent.js"),
        import("../ai-agent/agent.js"),
        import("../../src/lib/rara-memory.js"),
        import("../../src/lib/rara-askills.js"),
      ]);
      const model = getModelPref(m.chat);
      // semua panggilan AI agent diarahkan ke model 9Router lokal (override per-call, gak ganti deps global)
      const router9Ai = async (prompt, opts = {}) => {
        const r = await router9Chat({ model, user: prompt, system: opts.systemPrompt, maxTokens: 4096 });
        return r.text;
      };
      const setStatus = async (text) => {
        try {
          if (!statusKey) {
            const sent = await sock.sendMessage(m.chat, { text: String(text) });
            statusKey = sent?.key || null;
          } else {
            await sock.sendMessage(m.chat, { text: String(text), edit: statusKey });
          }
        } catch {}
      };
      const executors = buildExecutors(m, sock, db, null, deps || {}, setStatus);
      const toolbox = await buildToolbox();
      await setStatus("🛠️ " + smallcapsText("Action — 9router task: " + task.slice(0, 120)));
      const res = await runAgent(task, {
        ai: router9Ai,
        execTools: executors,
        toolbox,
        memBlock: memoryBlock(db, m.sender, task),
        skillBlock: skillsBlock(task),
        context: {
          isGroup: m.isGroup !== false,
          isAdmin: !!m.isAdmin,
          isOwner: !!m.isOwner,
          isBotAdmin: !!m.isBotAdmin,
          chat: m.chat,
          sender: m.sender,
          mediaAttached: false,
        },
      });
      if (res?.error) {
        await m.react("❌");
        return m.reply(raraBox("9Router", [res.error]));
      }
      // tools/browse/riset udah kirim hasilnya sendiri via executor; jawaban akhir tetep dikirim
      const via = "— via 9Router Lokal • " + model + " • mode " + (res?.mode || "agent");
      const ans = String(res?.answer || "").trim();
      if (ans) {
        const body = ans.length > 6000 ? ans.slice(0, 6000) + "..." : ans;
        await m.reply(body + "\n\n" + via);
      }
      await m.react("🐣");
      if (statusKey) { try { await sock.sendMessage(m.chat, { text: "✅ selesai", edit: statusKey }); } catch {} }
    } catch (e) {
      console.error("[9router-ag]:", e.message);
      await m.react("❌");
      return m.reply(raraBox("9Router", ["Gagal: " + String(e.message).slice(0, 200)]));
    }
    return;
  }

  if (!text) return guide(m);

  try {
    await m.react("🕒");
    const quotedText = m.quoted?.text?.trim() || "";
    const userMsg = quotedText
      ? `${text}\n\n[User membalas pesan ini — jadikan konteks]: ${quotedText.slice(0, 500)}`
      : text;

    const sKey = "satuan:" + m.sender;
    const history = toMessages(sKey);
    const model = getModelPref(m.chat);
    const r = await router9Chat({ model, user: userMsg, history });
    appendTurn(sKey, userMsg, r.text);
    await m.react("🐣");
    const replyText = r.text.length > 3500 ? r.text.slice(0, 3500) + "..." : r.text;
    return m.reply(`${replyText}\n\n— via 9Router Lokal • ${r.model} • ${r.latencyMs}ms`);
  } catch (e) {
    console.error("[9router]:", e.message);
    await m.react("❌");
    return m.reply(raraBox("9Router", [
      "9Router lokal gagal 😔",
      `Info: ${String(e.message).slice(0, 220)}`,
      "---",
      "Cek kondisi: .9router status",
    ]));
  }
}

export { pluginConfig as config, handler };
