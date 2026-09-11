// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// agent — AI AGENT OTONOM MULTI-LANGKAH (request owner 11 Sep 2026 "buatkan no 1"
// + revisi "biar ai agentnya bisa browsing dan automation kayak kick org cm dari
// nama, tutup grup dll"):
// DUA MODE — dipilih AI saat plan:
//  • research — plan (AI pecah tugas jadi query) → search (web multi-engine) →
//    pick (AI milih halaman) → read (ekstrak isi) → compose (jawaban + sumber)
//  • act — otomasi WhatsApp grup: kick CUMA DARI NAMA (resolve via sock.getName
//    + participants), tutup/buka grup, promote/demote, rename/desc, tagall,
//    link, lockedit. Gate: user wajib admin/owner + bot wajib admin (pola
//    nova-auto-ai executeAction). Progress live edit-in-place per fase.
import { claraWrap, novaGuide } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import { runAgent, generatePlugin } from "../../src/lib/nova-agent.js";
import { smallcapsText } from "../../src/lib/styler.js";
import { callImageGenChain } from "../../src/lib/nova-ai-service.js";
import { visionScan } from "../../src/lib/nova-vision-chain.js";
import { getLeaderboard } from "../../src/lib/nova-activity-tracker.js";

const pluginConfig = {
  name: "agent",
  alias: ["agent", "aiagent", "agensi", "agentai", "agenta"],
  category: "ai",
  description: "AI Agent serba bisa — browsing web, otomasi grup, scan/generate gambar, jalanin fitur, buat fitur baru, inget percakapan, ngobrol pakai vn",
  usage: ".agent <tugas>",
  example: ".agent cari hp terbaik di bawah 5 juta, bandingkan dan kasih rekomendasi",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 20, energi: 3, isEnabled: true,
};

// ═══════════════════════════════════════════════════════════════
// ACT MODE — executor otomasi grup (gate + resolve nama → jid)
// ═══════════════════════════════════════════════════════════════

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

// resolve nama → jid: scan participants, cocokin nama via sock.getName
async function resolveByName(name, m, sock) {
  let meta = m.groupMetadata;
  try { if (!meta?.participants) meta = await sock.groupMetadata(m.chat); } catch {}
  const parts = meta?.participants || [];
  const n = norm(name);
  if (!n) return null;
  // pass 1: exact
  for (const p of parts) {
    const jid = p.jid || p.id;
    let pn = "";
    try { pn = norm(await sock.getName(jid, m.chat)); } catch {}
    if (pn && pn === n) return { jid, name: pn, admin: !!p.admin };
  }
  // pass 2: contains (nama user ditulis sebagian)
  const scored = [];
  for (const p of parts) {
    const jid = p.jid || p.id;
    let pn = "";
    try { pn = norm(await sock.getName(jid, m.chat)); } catch {}
    if (!pn) continue;
    if (pn.includes(n) || n.includes(pn)) scored.push({ jid, name: pn, admin: !!p.admin });
  }
  if (scored.length === 1) return scored[0];
  if (scored.length > 1) return { ambiguous: scored.map(s => s.name) };
  return null;
}

async function execAction(a, ctx, m, sock) {
  const gate = (needBotAdmin = true) => {
    if (!m.isGroup) return "Perintah cuma jalan di grup";
    if (!m.isAdmin && !m.isOwner) return "Kamu bukan admin grup — gak bisa nyuruh aksi ini";
    if (needBotAdmin && !m.isBotAdmin) return "Bot bukan admin grup — minta admin buat jadiin bot admin dulu";
    return null;
  };

  // aksi butuh target orang (kick/add/promote/demote)
  if (["kick", "add", "promote", "demote"].includes(a.action)) {
    const g = gate();
    if (g) return { ok: false, msg: g };
    let target = null;
    if (m.mentionedJid?.length) target = m.mentionedJid.find(j => j !== sock.user?.id?.split(":")[0] + "@s.whatsapp.net");
    if (!target && m.quoted?.sender) target = m.quoted.sender;
    if (!target && a.target && /^\+?\d{8,15}$/.test(a.target.replace(/@.*$/, ""))) {
      target = a.target.replace(/@.*$/, "").replace(/^\+/, "") + "@s.whatsapp.net";
    }
    if (!target && a.target) {
      const r = await resolveByName(a.target, m, sock);
      if (!r) return { ok: false, msg: `Nama "${a.target}" gak ketemu di grup — tulis nama lengkapnya atau tag orangnya` };
      if (r.ambiguous) return { ok: false, msg: `Nama "${a.target}" ambigu (${r.ambiguous.join(", ")}) — tulis lebih spesifik atau tag orangnya` };
      target = r.jid;
    }
    if (!target) return { ok: false, msg: "Sebutin nama orangnya atau tag/reply pesannya" };

    const botJid = sock.user?.id?.split(":")[0] + "@s.whatsapp.net";
    if (target === botJid) return { ok: false, msg: "Gak bisa ngerjak diri sendiri (targetnya bot)" };
    if (target === m.sender) return { ok: false, msg: "Gak bisa ngerjak diri sendiri" };

    // cek target ada di grup + adminnya
    let meta = m.groupMetadata;
    try { if (!meta?.participants) meta = await sock.groupMetadata(m.chat); } catch {}
    const p = (meta?.participants || []).find(pp => (pp.jid || pp.id) === target);
    if (!p) return { ok: false, msg: "Orangnya gak ada di grup ini" };
    if (a.action === "kick" && p.admin) return { ok: false, msg: "Gak bisa kick admin grup" };
    if (a.action === "demote" && !p.admin) return { ok: false, msg: "Dia emang bukan admin" };

    try {
      const mode = { kick: "remove", add: "add", promote: "promote", demote: "demote" }[a.action];
      await sock.groupParticipantsUpdate(m.chat, [target], mode);
      const label = { kick: "kick/keluarkan", add: "tambahin", promote: "promote jadi admin", demote: "demote dari admin" }[a.action];
      return { ok: true, msg: `Berhasil ${label} @${target.split("@")[0]}` };
    } catch (e) {
      return { ok: false, msg: `Gagal ${a.action}: ${e?.message || "WhatsApp nolak — mungkin nomornya gak bisa dijangkau"}` };
    }
  }

  switch (a.action) {
    case "open": {
      const g = gate(); if (g) return { ok: false, msg: g };
      await sock.groupSettingUpdate(m.chat, "not_announcement");
      return { ok: true, msg: "Grup DIBUKA — semua member bisa kirim pesan" };
    }
    case "close": {
      const g = gate(); if (g) return { ok: false, msg: g };
      await sock.groupSettingUpdate(m.chat, "announcement");
      return { ok: true, msg: "Grup DITUTUP — cuma admin yang bisa kirim pesan" };
    }
    case "lockedit": {
      const g = gate(); if (g) return { ok: false, msg: g };
      await sock.groupSettingUpdate(m.chat, "locked");
      return { ok: true, msg: "Edit info grup DIKUNCI — cuma admin yang bisa ubah" };
    }
    case "unlockedit": {
      const g = gate(); if (g) return { ok: false, msg: g };
      await sock.groupSettingUpdate(m.chat, "unlocked");
      return { ok: true, msg: "Edit info grup DIBUKA — semua member bisa ubah" };
    }
    case "rename": {
      const g = gate(); if (g) return { ok: false, msg: g };
      if (!a.value) return { ok: false, msg: "Sebutin nama grup barunya (contoh: ubah nama grup jadi Nova Squad)" };
      await sock.groupUpdateSubject(m.chat, a.value.slice(0, 100));
      return { ok: true, msg: `Nama grup diubah jadi: ${a.value.slice(0, 100)}` };
    }
    case "desc": {
      const g = gate(); if (g) return { ok: false, msg: g };
      if (!a.value) return { ok: false, msg: "Sebutin deskripsi grup barunya" };
      await sock.groupUpdateDesc(m.chat, a.value.slice(0, 500));
      return { ok: true, msg: "Deskripsi grup diperbarui" };
    }
    case "tagall": {
      const g = gate(false); if (g) return { ok: false, msg: g };
      let meta = m.groupMetadata;
      try { if (!meta?.participants) meta = await sock.groupMetadata(m.chat); } catch {}
      const members = (meta?.participants || []).map(p => p.jid || p.id);
      if (!members.length) return { ok: false, msg: "Gak bisa baca daftar member" };
      await sock.sendMessage(m.chat, {
        text: "📢 *ᴛᴀɢ ᴀʟʟ*\n\n" + members.map(id => `@${id.split("@")[0]}`).join(" "),
        mentions: members,
      });
      return { ok: true, msg: `Semua ${members.length} member di-tag` };
    }
    case "link": {
      const g = gate(false); if (g) return { ok: false, msg: g };
      const code = await sock.groupInviteCode(m.chat);
      return { ok: true, msg: `🔗 Link invite grup: https://chat.whatsapp.com/${code}` };
    }
    default:
      return { ok: false, msg: `Aksi "${a.action}" gak dikenal` };
  }
}

// ═══════════════════════════════════════════════════════════════
// TOOLS MODE — executor serba bisa (injectable via deps buat e2e)
// ═══════════════════════════════════════════════════════════════

function buildExecutors(m, sock, db, mediaBuffer, deps = {}) {
  // ⚡ command — jalanin command bot lain lewat messageHandler penuh
  //    (gates/cooldown/energi middleware tetap jalan — konsisten)
  const command = deps.command || (async (t) => {
    const cmd = String(t.cmd || "").toLowerCase().trim();
    if (!cmd || cmd === "agent") return { ok: false, msg: "Command gak valid / gak boleh manggil .agent dari dalam agent (loop)" };
    const text = "." + cmd + (t.args ? " " + t.args : "");
    try {
      const { messageHandler } = await import("../../src/handler.js");
      const raw = {
        key: { remoteJid: m.chat, fromMe: false, id: "AGENTCMD" + Date.now(), participant: m.sender },
        message: { conversation: text },
        messageTimestamp: Math.floor(Date.now() / 1000),
      };
      await Promise.race([
        messageHandler(raw, sock),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout 90 detik")), 90_000)),
      ]);
      return { ok: true, msg: `Perintah ${text} dijalankan` };
    } catch (e) {
      return { ok: false, msg: `Gagal jalanin ${text}: ${e?.message || "error"}` };
    }
  });

  // 🎨 image — generate gambar RANTAI PROVIDER (request owner: "gmna supaya
  // g ngandelin pollinations ai agennya kan ada grok atau gemini"):
  // gemini → grok/xai → openai → qwen (yang punya key hidup), pollinations
  // (free) CUMA juru penyelamat terakhir — bukan jalur utama.
  const image = deps.image || (async (t) => {
    const prompt = String(t.prompt || t.args || "").trim();
    if (!prompt) return { ok: false, msg: "Sebutin gambar apa yang mau dibuat" };
    try {
      const img = await callImageGenChain(prompt, {});
      await sock.sendMessage(m.chat, {
        image: Buffer.from(img.base64, "base64"),
        caption: "🎨 " + prompt.slice(0, 150) + (img.via ? "\n_(engine: " + img.via + ")_" : ""),
      }, { quoted: m });
      return { ok: true, msg: "Gambar dikirim (engine: " + (img.via || "-") + "): " + prompt.slice(0, 80) };
    } catch (e) {
      return { ok: false, msg: "Gagal generate gambar: " + (e?.message || "error") };
    }
  });

  // 👁️ vision — scan gambar yang di-reply/attach
  const vision = deps.vision || (async (t) => {
    if (!mediaBuffer) return { ok: false, msg: "Reply/attach gambarnya dulu, baru suruh .agent scan" };
    try {
      const q = String(t.question || t.prompt || t.query || "Deskripsikan gambar ini secara detail dalam bahasa Indonesia.");
      const v = await visionScan({ imageBuffer: mediaBuffer, question: q });
      if (v?.status && v?.text) return { ok: true, msg: "Gambar dianalisis", evidence: "Hasil scan gambar (vision AI):\n" + v.text };
      return { ok: false, msg: "Gagal scan gambar — coba lagi" };
    } catch (e) {
      return { ok: false, msg: "Gagal scan gambar: " + (e?.message || "error") };
    }
  });

  // 📊 activity — jejak histori aktivitas grup (activity tracker)
  const activity = deps.activity || (async () => {
    if (!m.isGroup) return { ok: false, msg: "Statistik aktivitas cuma buat grup" };
    try {
      const lb = getLeaderboard(m.chat, 5);
      if (!lb.length) return { ok: false, msg: "Belum ada jejak aktivitas tercatat di grup ini" };
      const lines = lb.map(x =>
        `${x.rank}. ${x.name} — ${x.points} poin | ${x.messageCount} pesan | ${x.commandCount} command | ${x.mediaCount} media | terakhir aktif ${x.lastActive ? new Date(x.lastActive).toLocaleString("id-ID") : "-"}`);
      return { ok: true, msg: "Jejak aktivitas diambil", evidence: "Statistik aktivitas grup (teratas):\n" + lines.join("\n") };
    } catch (e) {
      return { ok: false, msg: "Gagal ambil aktivitas: " + (e?.message || "error") };
    }
  });

  // 🧠 memory — ingat percakapan agent sebelumnya di chat ini
  const memory = deps.memory || (async () => {
    try {
      const cur = db?.setting?.("agentMemory") || {};
      const list = cur[m.chat] || [];
      if (!list.length) return { ok: false, msg: "Belum ada percakapan agent yang gue inget di chat ini" };
      const lines = list.slice(-5).reverse().map(e => `- [${e.mode || "?"}] tugas: ${e.task} → hasil: ${e.summary}`);
      return { ok: true, msg: "Riwayat diingat", evidence: "Riwayat percakapan agent di chat ini (terbaru di atas):\n" + lines.join("\n") };
    } catch (e) {
      return { ok: false, msg: "Gagal baca memori: " + (e?.message || "error") };
    }
  });

  // 🔧 create — BUAT FITUR BARU + pasang (owner only, codegen + hot-load)
  const create = deps.create || (async (t) => {
    if (!m.isOwner) return { ok: false, msg: "Buat/pasang fitur cuma bisa owner bot" };
    const nm = String(t.name || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
    const sp = String(t.spec || t.prompt || t.query || "").trim();
    try {
      const gen = await generatePlugin({ name: nm, spec: sp, ...(deps.pluginDir ? { targetDir: deps.pluginDir } : {}) });
      // pasang: register ke plugin store — command langsung nyala tanpa restart
      const { loadPlugin, registerPlugin } = await import("../../src/lib/nova-plugins.js");
      const plugin = await loadPlugin(gen.path, true);
      if (!plugin || !registerPlugin(plugin)) throw new Error("plugin ke-tulis tapi gak ke-register");
      return { ok: true, msg: `Fitur BARU .${nm} berhasil DIBUAT + TERPASANG! Ketik .${nm} buat nyoba` };
    } catch (e) {
      return { ok: false, msg: "Gagal bikin fitur: " + (e?.message || "error") };
    }
  });

  return { command, image, vision, activity, memory, create };
}

// simpan jejak percakapan agent per chat (db.setting agentMemory) — biar inget
function saveAgentMemory(db, chat, task, mode, answer) {
  try {
    if (!db?.setting) return;
    const cur = db.setting("agentMemory") || {};
    const list = cur[chat] || [];
    list.push({
      t: Date.now(),
      task: String(task || "").slice(0, 200),
      mode: mode || "-",
      summary: String(answer || "").replace(/\s+/g, " ").slice(0, 200),
    });
    cur[chat] = list.slice(-20); // 20 tugas terakhir per chat
    db.setting("agentMemory", cur);
  } catch {}
}

function getAgentHistory(db, chat) {
  try {
    const cur = db?.setting?.("agentMemory") || {};
    return (cur[chat] || []).slice(-5).map(e => `- [${e.mode || "?"}] tugas: ${e.task} → hasil: ${e.summary}`);
  } catch { return []; }
}

// kirim jawaban sebagai voice note (haidarTTS) + teks — request "nggobrol pakai vn"
async function sendVoiceReply(m, sock, text) {
  try {
    const { haidarTTS, HAIDAR_VOICES } = await import("../../src/scraper/haidar-ai.js");
    const spoken = String(text).replace(/[*_`~]/g, "").slice(0, 500);
    const voice = HAIDAR_VOICES?.includes("siti") ? "siti" : (HAIDAR_VOICES?.[0] || "siti");
    const audioUrl = await haidarTTS(spoken, voice);
    const axios = (await import("axios")).default;
    const res = await axios.get(audioUrl, { responseType: "arraybuffer", timeout: 60000 });
    const buf = Buffer.from(res.data);
    if (!buf || buf.length < 3000) throw new Error("audio kosong");
    await m.reply(text); // teks tetap dikirim biar link/sumber kebaca
    await sock.sendMessage(m.chat, { audio: buf, mimetype: "audio/mpeg", ptt: true }, { quoted: m });
    return true;
  } catch {
    return false;
  }
}

async function handler(m, { sock, db, deps } = {}) {
  const task = (m.args || []).join(" ").trim();
  if (!task) {
    return m.reply(novaGuide(
      "agent",
      "AI agent otonom — dia sendiri yang nyari ke web, baca halamannya, terus nyusun jawaban lengkap + sumber.",
      `${m.prefix}agent <tugas apa pun>\n${m.prefix}agent cari hp terbaik di bawah 5 juta, bandingkan dan kasih rekomendasi\n${m.prefix}agent kick orang yang bernama Budi\n${m.prefix}agent tutup grup dan ubah nama grup jadi Nova Squad`,
      [`${smallcapsText("4 kemampuan serba bisa")}: 🔍 ${smallcapsText("browsing riset web + sumber")} | ⚡ ${smallcapsText("otomasi grup — kick dari nama, tutup grup (wajib admin)")} | 🛠️ ${smallcapsText("tools — scan gambar (reply foto), generate gambar, jalanin fitur bot, cek aktivitas")} | 🧠 ${smallcapsText("inget percakapan + jawab pakai vn")}`,
       `${smallcapsText("buat fitur baru")}: ${m.prefix}agent buat fitur namanya kalkulator yang bisa tambah/kali (khusus owner)`,
       `${smallcapsText("butuh 1-3 menit, sabar ya")}`],
    ));
  }

  // LOADING = 1 PESAN EDIT BERULANG (revisi owner 11 Sep: "aku mau dia ada teks
  // lg melakukan sesuatu kyk di edit berulang cukup 1 chat") — status aktivitas
  // simple di-EDIT di 1 pesan doang per fase: 🧠 mikir, 🔍 nyari, ✍️ susun jawaban,
  // 🛠️ tools, ⚡ aksi. Tanpa bar/langkah/daftar sumber — sumber cuma di 📎 footer.
  // PLUS reaksi di pesan user: 🧠/🔍/🛠️/⚡ sesuai fase (dedupe berurutan).
  const PHASE_LABEL = {
    plan: "🧠 " + smallcapsText("agent merencanakan..."),
    search: "🔍 " + smallcapsText("agent mencari informasi..."),
    pick: "🎯 " + smallcapsText("agent memilih sumber terbaik..."),
    read: "📖 " + smallcapsText("agent membaca halaman..."),
    compose: "✍️ " + smallcapsText("agent menyusun jawaban..."),
    act: "⚡ " + smallcapsText("agent mengeksekusi aksi..."),
    tool: "🛠️ " + smallcapsText("agent pakai tools..."),
  };
  const PHASE_REACT = { plan: "🧠", search: "🔍", pick: "🔍", read: "🔍", compose: "🧠", tool: "🛠️", act: "⚡" };
  let lastReact = "";
  const reactPhase = async (emoji) => {
    if (!emoji || emoji === lastReact) return; // fase berikutnya emoji sama → gak spam react
    lastReact = emoji;
    try { await m.react(emoji); } catch {}
  };
  let statusKey = null;
  const setStatus = async (text) => {
    try {
      if (!statusKey) {
        const sent = await sock.sendMessage(m.chat, { text });
        statusKey = sent?.key || null;
        return;
      }
      await sock.sendMessage(m.chat, { text, edit: statusKey });
    } catch {}
  };

  try {
    await reactPhase("🧠");
    await setStatus(PHASE_LABEL.plan);

    // reply/attach gambar → buffer buat tool vision (scan gambar)
    let mediaBuffer = null;
    try {
      const mediaMsg = m.isImage ? m : m.quoted?.isImage ? m.quoted : null;
      if (mediaMsg && typeof mediaMsg.download === "function") mediaBuffer = await mediaMsg.download();
    } catch {}

    const executors = buildExecutors(m, sock, db, mediaBuffer, deps || {});

    const res = await runAgent(task, {
      act: (a, ctx) => execAction(a, ctx, m, sock),
      execTools: executors,
      history: getAgentHistory(db, m.chat),
      context: {
        isGroup: m.isGroup !== false,
        isAdmin: !!m.isAdmin,
        isOwner: !!m.isOwner,
        isBotAdmin: !!m.isBotAdmin,
        chat: m.chat,
        sender: m.sender,
        mediaAttached: !!mediaBuffer,
      },
      onPhase: (phase, info) => {
        reactPhase(PHASE_REACT[phase] || "🧠");
        let label = PHASE_LABEL[phase] || PHASE_LABEL.plan;
        // fase tools/act kasih detail singkat (lagi ngejalanin apa)
        if ((phase === "tool" || phase === "act") && info) {
          label = (phase === "tool" ? "🛠️ " : "⚡ ") + smallcapsText("agent menjalankan: " + info.slice(0, 60));
        }
        setStatus(label);
      },
    });

    if (res?.error) {
      await m.react("❌");
      const errMsg = claraWrap("agent", res.error, "error");
      if (statusKey) { try { await sock.sendMessage(m.chat, { text: errMsg, edit: statusKey }); return; } catch {} }
      return m.reply(errMsg);
    }

    // inget jejak percakapan (biar .agent ingat percakapan sebelumnya)
    saveAgentMemory(db, m.chat, task, res.mode, res.answer);

    // jawaban final di-EDIT ke pesan status (revisi owner: cukup 1 chat);
    // VN tetap dikirim pesan baru (audio gak bisa di-edit dari teks)
    if (res.mode === "act" || res.mode === "tools") {
      // nggobrol pakai vn (request owner): jawaban di-voice-note-in
      const wantVoice = res.voice === true || /\b(vn|voice\s?note|pakai suara|pake suara|dengan suara)\b/i.test(task);
      const doVoice = deps?.voiceReply || sendVoiceReply;
      if (wantVoice && await doVoice(m, sock, res.answer)) {
        await setStatus("✅ " + smallcapsText("jawaban dikirim via voice note"));
        await m.react("🐣");
        return;
      }
      let ok = false;
      if (statusKey) { try { await sock.sendMessage(m.chat, { text: res.answer, edit: statusKey }); ok = true; } catch {} }
      if (!ok) await m.reply(res.answer);
      await m.react("🐣");
      return;
    }
    const src = (res.sources || []).map((s, i) => `${i + 1}. [${s.tag}] ${s.domain} — ${s.url}`).join("\n");
    const footer = src ? `\n\n📎 ${smallcapsText("sumber")}\n${src}` : "";
    const note = res.viaLocal ? `\n\n⚙️ ${smallcapsText("mode digest lokal")}` : "";
    const fullAnswer = res.answer + note + footer;
    // riset pun bisa dijawab pakai vn kalau user minta
    const wantVoice = res.voice === true || /\b(vn|voice\s?note|pakai suara|pake suara|dengan suara)\b/i.test(task);
    const doVoice2 = deps?.voiceReply || sendVoiceReply;
    if (wantVoice && await doVoice2(m, sock, fullAnswer)) {
      await setStatus("✅ " + smallcapsText("jawaban dikirim via voice note"));
      await m.react("🐣");
      return;
    }
    let ok = false;
    if (statusKey) { try { await sock.sendMessage(m.chat, { text: fullAnswer, edit: statusKey }); ok = true; } catch {} }
    if (!ok) await m.reply(fullAnswer);
    await m.react("🐣");
  } catch (e) {
    console.error("agent error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("agent", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
