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
import { memoryBlock, extractMemories } from "../../src/lib/nova-memory.js";
import { skillsBlock } from "../../src/lib/nova-askills.js";
import { smallcapsText } from "../../src/lib/styler.js";
import { callImageGenChain } from "../../src/lib/nova-ai-service.js";
import { aiChainChat } from "../../src/lib/nova-ai-fallback.js";
import { visionScan } from "../../src/lib/nova-vision-chain.js";
import { getLeaderboard } from "../../src/lib/nova-activity-tracker.js";
import { getAllSkills, awaitSkillPacks } from "../../src/lib/nova-skills.js";
import { getMcpTools } from "../../src/lib/nova-mcp.js";
import { searchYoutubeAndSend, detectYtSearchIntent } from "../../src/lib/nova-yt-search.js";
import { splitChatChunks } from "../../src/lib/aiagent.js";
import { searchSiteAndSend, detectSiteSearchIntent } from "../../src/lib/nova-site-search.js";

// 💻 system prompt coder — request owner 11 Sep: "klo suruh buatkan kode html,
// javascript dll pintar coding agent membuatkan dgn kepintarannya"
const SYS_CODER = `Kamu programmer ELITE serba bisa. User minta kode program — balas dengan:
1. SATU kalimat singkat menjelaskan apa yang kamu bikin.
2. SATU blok kode lengkap siap jalan (di antara penanda triple backtick) — self-contained SATU FILE, lengkap dari baris pertama sampai akhir, berkomentar bahasa Indonesia, rapi, ikuti best practice.
3. Setelah blok kode: "CARA PAKAI:" penjelasan 2-4 kalimat cara menjalankannya.
JANGAN pernah memotong kode / placeholder TODO / kode segitiga-python. Kode HARUS beneran jalan.`;

const pluginConfig = {
  name: "aisuperagent",
  alias: ["aisuperagent"], // request owner: cmd utama aja, tanpa alias lain
  category: "ai",
  description: "AI Agent serba bisa — browsing web, otomasi grup, scan/generate gambar, jalanin fitur, buat fitur baru, bikin kode, unduh file, bikin file, baca halaman, skill (kbbi/gempa/hoki/lirik/dll), tool MCP, persona, inget percakapan, ngobrol pakai vn",
  usage: ".aisuperagent <tugas>",
  example: ".aisuperagent cek arti kata makan pakai skill kbbi, terus tanya deepwiki apa itu react",
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

  // ubah nama/deskripsi grup — Baileys versi bot ini methodnya
  // groupMetadataUpdate(jid, {subject/description}) (pola setgroupdesc/setgroupname);
  // FIX BUG owner 11 Sep: "ganti deskripsi grup malah eror katanya no function"
  // — executor lama manggil sock.groupUpdateDesc yang GAK ADA di Baileys ini.
  // Fallback legacy groupUpdateSubject/groupUpdateDesc buat versi Baileys lain.
  const setGroupMeta = async (fields) => {
    if (typeof sock.groupMetadataUpdate === "function") return sock.groupMetadataUpdate(m.chat, fields);
    if (fields.subject != null && typeof sock.groupUpdateSubject === "function") return sock.groupUpdateSubject(m.chat, fields.subject);
    if (fields.description != null && typeof sock.groupUpdateDesc === "function") return sock.groupUpdateDesc(m.chat, fields.description);
    throw new Error("bot gak punya akses ubah info grup");
  };

  // ── LEAVE GROUP (owner only) — target NAMA GRUP, jalan dari DM owner
  // (request 21 Sep 2026: "keluar dari grup cari teman sejati" dari DM).
  // GAK pakai gate() — perintah memang dateng dari luar grup.
  if (a.action === "leave") {
    if (!m.isOwner) return { ok: false, msg: "Cuma owner yang bisa nyuruh bot keluar dari grup" };
    let jid = null;
    let gname = "";
    if (a.target) {
      const { resolveGroupByName } = await import("../../src/lib/nova-group-registry.js");
      const r = await resolveGroupByName(sock, a.target);
      if (!r) return { ok: false, msg: `Grup "${a.target}" gak ketemu — tulis nama grupnya persis kayak yang tertera di info grup` };
      if (r.ambiguous) return { ok: false, msg: `Nama "${a.target}" ambigu (${r.ambiguous.join(", ")}) — tulis lebih spesifik` };
      jid = r.jid;
      gname = r.subject;
    } else {
      if (!m.isGroup) return { ok: false, msg: "Sebutin nama grupnya (kamu lagi di DM) — contoh: keluar dari grup cari teman sejati" };
      jid = m.chat;
      gname = m.groupMetadata?.subject || m.subject || "grup ini";
    }
    if (jid === m.chat && m.isGroup && !m.isOwner) return { ok: false, msg: "Cuma owner yang bisa nyuruh bot keluar" };
    try {
      await sock.groupLeave(jid);
      return { ok: true, msg: `✅ Bot keluar dari grup: ${gname}` };
    } catch (e) {
      return { ok: false, msg: `Gagal keluar grup: ${e?.message || "WhatsApp nolak"}` };
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
      await setGroupMeta({ subject: a.value.slice(0, 100) });
      return { ok: true, msg: `Nama grup diubah jadi: ${a.value.slice(0, 100)}` };
    }
    case "desc": {
      const g = gate(); if (g) return { ok: false, msg: g };
      if (!a.value) return { ok: false, msg: "Sebutin deskripsi grup barunya (contoh: ganti deskripsi grup jadi grup resmi Nova Squad)" };
      await setGroupMeta({ description: a.value.slice(0, 500) });
      return { ok: true, msg: "Deskripsi grup diperbarui: " + a.value.slice(0, 80) };
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
    // toggle fitur automod grup (antilink/antibadword/antisticker/antivoice/
    // antispam) — request owner 12 Sep 2026: "novaagent klo disuruh aktifkan
    // fitur ada yg gak tau" (sebelumnya "aktifkan antilink" malah kesasar ke
    // action "link"/ambil link grup — sudah dibenerin di nova-agent.js plan
    // + filter, sekarang action ini beneran ada eksekutornya).
    case "antilink": case "antibadword": case "antisticker": case "antivoice": case "antispam": {
      const g = gate(false); if (g) return { ok: false, msg: g }; // bot gak perlu admin, ini cuma setting internal bot
      const on = String(a.value || "on").toLowerCase() !== "off";
      const { setAutomodRule } = await import("../../src/lib/nova-automation-hub.js");
      const label = { antilink: "Anti-Link", antibadword: "Anti-Badword", antisticker: "Anti-Sticker", antivoice: "Anti-Voice Note", antispam: "Anti-Spam" }[a.action];
      try {
        setAutomodRule(m.chat, a.action, on);
        return { ok: true, msg: `🛡️ ${label} di grup ini: ${on ? "AKTIF ✅" : "MATI ❌"}` };
      } catch (e) {
        return { ok: false, msg: `Gagal atur ${label}: ${e.message}` };
      }
    }
    default:
      return { ok: false, msg: `Aksi "${a.action}" gak dikenal` };
  }
}

// ═══════════════════════════════════════════════════════════════
// TOOLS MODE — executor serba bisa (injectable via deps buat e2e)
// ═══════════════════════════════════════════════════════════════

/**
 * 🔒 GATE AKSES COMMAND (owner 25 Sep 2026): agent jalan ATAS NAMA user yang
 * manggil — command yang user-nya gak berhak pakai DITOLAK DI SINI (sebelum
 * eksekusi), biar agent jawab jujur "fitur ini owner-only" ke user.
 * Dulu: middleware sebenernya nolak senyap, tapi executor tetap balikin
 * "Perintah dijalankan" → agent bohong sukses ke user.
 * REVISI OWNER 25 Sep (kedua): admin grup di grup orang BOLEH suruh agent
 * kick/task admin (fitur non-owner), asal cuma fitur admin grup — jadi gate
 * isAdmin/isBotAdmin ditambahin ngikutin logika middleware.
 * @returns {Promise<{ok:false,msg:string}|null>} null = boleh jalan
 */
export async function gateCommandAccess(cmd, m) {
  const c = String(cmd || "").toLowerCase().trim();
  if (!c) return null;
  let pc = null;
  try {
    const { getPlugin } = await import("../../src/lib/nova-plugins.js");
    pc = getPlugin(c)?.config || null;
  } catch { pc = null; }
  if (!pc) return null; // gak ada di registry → biarkan messageHandler jawab
  if (pc.isOwner && !m?.isOwner) {
    return { ok: false, msg: `.${c} itu fitur OWNER-ONLY — kamu bukan owner bot, jadi aku gak bisa jalanin buat kamu. Minta langsung ke owner ya.` };
  }
  if (pc.isPremium && !m?.isPremium && !m?.isOwner) {
    return { ok: false, msg: `.${c} itu fitur PREMIUM-ONLY — jadi user premium dulu biar aku bisa jalanin.` };
  }
  if (pc.isPartner && !m?.isPartner && !m?.isOwner) {
    return { ok: false, msg: `.${c} itu fitur PARTNER-ONLY — khusus partner bot.` };
  }
  // admin grup: mirror middleware — cuma nolak kalau di grup dan caller bukan
  // admin/owner (di DM biarin lewat, plugin isGroup yang jawab "khusus grup")
  if (pc.isAdmin && m?.isGroup && !m?.isAdmin && !m?.isOwner) {
    return { ok: false, msg: `.${c} itu fitur ADMIN GRUP — kamu bukan admin di grup ini, jadi aku gak bisa jalanin. Minta admin grup yang nyuruh.` };
  }
  if (pc.isBotAdmin && m?.isGroup && !m?.isBotAdmin) {
    return { ok: false, msg: `.${c} butuh aku jadi ADMIN grup — aku belum jadi admin di sini.` };
  }
  return null;
}

function buildExecutors(m, sock, db, mediaBuffer, deps = {}, onStatus = null) {
  // ⚡ command — jalanin command bot lain lewat messageHandler penuh
  //    (gates/cooldown/energi middleware tetap jalan — konsisten)
  const command = deps.command || (async (t) => {
    const cmd = String(t.cmd || "").toLowerCase().trim();
    if (!cmd || cmd === "agent" || cmd === "aisuperagent" || cmd === "novaagent") return { ok: false, msg: "Command gak valid / gak boleh manggil agent dari dalam agent (loop)" };
    // 🔒 gate akses (owner 25 Sep): non-owner gak boleh nyuruh agent
    // jalanin fitur owner/premium/partner-only — agent jawab jujur
    const denied = await gateCommandAccess(cmd, m);
    if (denied) return denied;
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
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout 35 detik")), 35_000)),
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
        caption: "🎨 " + prompt.slice(0, 150) + (img.via ? "\n_(engine: " + img.via + ")_" : "") + (img.ratio && img.ratio !== "1:1" ? " _(rasio: " + img.ratio + ")_" : ""),
      }, { quoted: m });
      return { ok: true, msg: "Gambar dikirim (engine: " + (img.via || "-") + "): " + prompt.slice(0, 80) };
    } catch (e) {
      return { ok: false, msg: "Gagal generate gambar: " + (e?.message || "error") };
    }
  });

  // ⬇️ download — unduh file dari URL langsung (apk/zip/mp3/pdf/dll) + kirim
  // dokumen (request owner 11 Sep: "bsa ga agentnya klo aku minta download
  // apk dichrome atau kyk download file zip direpo serba bisa gtu").
  // Link wajib LANGSUNG ke file — halaman web (text/html tanpa ekstensi) ditolak.
  const download = deps.download || (async (t) => {
    const raw = String(t.url || t.link || t.args || t.prompt || "").trim();
    if (!/^https?:\/\//i.test(raw)) return { ok: false, msg: "Kasih link langsung ke file-nya (http/https) — contoh: " + m.prefix + "agent download apk dari https://situs.com/app.apk" };
    const MAX_MB = parseInt(process.env.AGENT_DL_MAX_MB || "100", 10) || 100;
    let res = null;
    try {
      res = await fetch(raw, {
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36", "Accept": "*/*" },
      });
    } catch (e) { return { ok: false, msg: "Gak bisa nyampe link: " + (e?.message || "error") }; }
    if (!res.ok) return { ok: false, msg: "Server jawab HTTP " + res.status };
    const len = parseInt(res.headers.get("content-length") || "0", 10);
    if (len && len > MAX_MB * 1024 * 1024) return { ok: false, msg: "File " + (len / 1048576).toFixed(1) + " MB kegedean (max " + MAX_MB + " MB)" };
    // nama file: Content-Disposition → path URL → fallback
    const cd = res.headers.get("content-disposition") || "";
    const cdM = cd.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
    let name = cdM ? decodeURIComponent(cdM[1]).trim() : "";
    if (!name) { try { name = decodeURIComponent(new URL(raw).pathname.split("/").pop() || "").trim(); } catch {} }
    name = (name || "file").replace(/[\u0000-\u001f\\/:*?"<>|]/g, "").slice(0, 80).trim() || "file";
    const ct = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const ext = (name.match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase();
    // halaman web nyamar file → tolak biar gak ngirim sampah html
    if (ct.includes("text/html") && !ext) return { ok: false, msg: "Link itu halaman web, bukan file langsung — kasih link yang ujungnya nama file (contoh release GitHub: .../releases/download/v1.0/app.zip)" };
    const mime = ext === "apk" ? "application/vnd.android.package-archive"
      : ext === "zip" ? "application/zip"
      : ct && !ct.includes("text/html") ? ct : "application/octet-stream";
    try {
      const chunks = [];
      let got = 0;
      let lastTick = 0;
      const reader = res.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        got += value.length;
        if (got > MAX_MB * 1024 * 1024) { try { await reader.cancel(); } catch {} return { ok: false, msg: "File kegedean (lebih dari " + MAX_MB + " MB)" }; }
        const now = Date.now();
        if (len && now - lastTick > 1200) { lastTick = now; try { await onStatus?.("📥 " + smallcapsText("mengunduh " + name) + " — " + Math.round(got / len * 100) + "%"); } catch {} }
      }
      const buf = Buffer.concat(chunks);
      if (!buf.length) return { ok: false, msg: "File kosong / gak bisa diunduh" };
      await sock.sendMessage(m.chat, { document: buf, fileName: name, mimetype: mime }, { quoted: m });
      return { ok: true, msg: "File terkirim: " + name + " (" + (buf.length / 1048576).toFixed(1) + " MB)" };
    } catch (e) { return { ok: false, msg: "Gagal unduh/kirim: " + (e?.message || "error") }; }
  });

  // 💻 code — bikin kode program (html/js/python/php/dll) + kirim FILE siap
  // pakai (request owner 11 Sep: "klo suruh buatkan kode html, javascript dll
  // pintar coding agent membuatkan dgn kepintarannya, klo bantu tugas
  // dikerjakan dgn kepintaran agent, serba bisa").
  const code = deps.code || (async (t) => {
    const spec = String(t.spec || t.prompt || t.args || "").trim();
    if (!spec) return { ok: false, msg: "Jelasin mau dibikin kode apa (contoh: halaman html toko kue dengan kartu produk)" };
    const EXT = { html: "html", htm: "html", css: "css", javascript: "js", js: "js", typescript: "ts", ts: "ts", node: "js", nodejs: "js", python: "py", py: "py", php: "php", java: "java", kotlin: "kt", c: "c", cpp: "cpp", cplusplus: "cpp", csharp: "cs", go: "go", golang: "go", rust: "rs", sql: "sql", bash: "sh", shell: "sh", dart: "dart", swift: "swift", lua: "lua", r: "r" };
    const langKey = String(t.lang || "").toLowerCase().trim();
    const ext = EXT[langKey] || "txt";
    // FIX OWNER 12 Sep 2026 ("knp agent suruh buat kode login web topup
    // isi kodenya gak lengkap cm singkat"): dulu satu-shot tanpa cek — sekarang
    // generator khusus nova-codegen: prompt quality bar + LOOP AUTO-LANJUT
    // sampai kode komplet (placeholder/tag gak ketutup/bracket gak balance
    // dideteksi, lalu AI disuruh lanjutin PERSIS dari baris terakhir).
    let codeBody = "", explain = "", rounds = 0, complete = true;
    try {
      const chat = deps.aiChat || aiChainChat; // seam deps.aiChat buat e2e
      const { generateCompleteCode } = await import("../../src/lib/nova-codegen.js");
      const gen = await generateCompleteCode({
        spec, ext, lang: langKey,
        aiChat: (p, o) => chat(p, { ...o, timeoutMs: 60000 }),
        onStatus: onStatus || null,
        maxRounds: 3,
      });
      codeBody = gen.code; explain = gen.explain; rounds = gen.rounds; complete = gen.complete;
    } catch (e) { return { ok: false, msg: "Gagal susun kode: " + (e?.message || "AI-nya sibuk") }; }
    if (!codeBody || !String(codeBody).trim()) return { ok: false, msg: "Kode hasil kosong, coba lagi" };
    const base = (String(t.name || "kode").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24)) || "kode";
    const fileName = base + "." + ext;
    try {
      await sock.sendMessage(m.chat, {
        document: Buffer.from(codeBody, "utf-8"),
        fileName,
        mimetype: "text/plain",
        caption: "💻 " + fileName + (rounds > 0 ? `\n✅ kode dilengkapi otomatis (${rounds} ronde)` : "") + "\n\n" + explain,
      }, { quoted: m });
      return { ok: true, msg: "Kode dibikin: " + fileName + (rounds > 0 ? ` (dilengkapi ${rounds}x)` : ""), evidence: `Kode ${fileName} (.${ext}) udah dikirim sebagai file — siap dipakai. Penjelasan: ${explain.slice(0, 300)}` };
    } catch (e) { return { ok: false, msg: "Gagal kirim file kode: " + (e?.message || "error") }; }
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

  // 🔎 ytsearch — CARI VIDEO YOUTUBE (request owner 14 Sep: ".aisuperagent
  // juga di-upgrade — dua agent bermasalah ngbug"): browser beneran
  // (chromium) + thumbnail preview + deskripsi plain text; video cuma
  // diunduh kalau eksplisit (download:true dari planner).
  const ytsearch = deps.ytsearch || (async (t) => {
    const query = String(t.query || t.q || t.prompt || t.args || "").trim();
    if (!query) return { ok: false, msg: "Sebutin judul/topik video yang mau dicari" };
    const wantDownload = !!(t.download || t.dl);
    try {
      const r = await searchYoutubeAndSend(sock, m, { query, wantDownload });
      return {
        ok: true,
        msg: "Video YouTube ditemukan & dikirim (" + (wantDownload ? "diunduh" : "thumbnail preview + deskripsi") + ", via: " + (r?.via || "-") + "): " + query,
        evidence: "Hasil pencarian YouTube untuk \"" + query + "\" udah dikirim langsung ke chat (thumbnail preview + judul/channel/durasi/views/deskripsi/link + video lain yang mirip).",
      };
    } catch (e) {
      return { ok: false, msg: "Gagal cari video YouTube: " + (e?.message || "error") };
    }
  });

  // 🎯 skill — pakai skill built-in + skill pack (kbbi/gempa/hoki/lirik/
  // calc/translate/kurs/qr/wiki/cuaca/dll) — request owner 12 Sep: ".aisuperagent
  // upgrade ... dilengkapi mcp, skills dan tool tambahan kyk novaagent"
  const skill = deps.skill || (async (t) => {
    const name = String(t.skill || t.name || "").toLowerCase().trim();
    if (!name) return { ok: false, msg: "Sebutin skill-nya yang mau dipakai (lihat daftar: " + m.prefix + "novaagent)" };
    try {
      const { getAllSkills, awaitSkillPacks } = await import("../../src/lib/nova-skills.js");
      await awaitSkillPacks(); // skill pack siap (kbbi/gempa/hoki/lirik)
      const reg = getAllSkills();
      const s = reg[name] || Object.values(reg).find((x) => x && x.name === name);
      if (!s || typeof s.run !== "function") return { ok: false, msg: "Skill \"" + name + "\" gak ada di daftar" };
      // capturing conn — output skill ditangkap jadi evidence buat compose
      const out = [];
      const capConn = { sendMessage: async (chat, msg) => { if (msg?.text) out.push(String(msg.text)); return { key: {} }; } };
      await s.run(capConn, m, t.data !== undefined && t.data !== null ? t.data : (t.args != null ? t.args : {}));
      if (!out.length) return { ok: true, msg: "Skill " + name + " dijalankan" };
      return { ok: true, msg: "Skill " + name + " dijalankan", evidence: "Hasil skill " + name + ":\n" + out.join("\n\n").slice(0, 4000) };
    } catch (e) {
      return { ok: false, msg: "Gagal jalanin skill " + name + ": " + (e?.message || "error") };
    }
  });

  // 🔌 mcp — panggil tool server MCP terpasang (context7/deepwiki/mslearn/gitmcp/dll)
  const mcp = deps.mcp || (async (t) => {
    const server = String(t.server || "").toLowerCase().trim();
    const tool = String(t.mcpTool || "").trim();
    if (!server || !tool) return { ok: false, msg: "Sebutin server + tool MCP-nya (contoh: server deepwiki, mcpTool ask_question)" };
    try {
      const { mcpCallTool } = await import("../../src/lib/nova-mcp.js");
      const args = (t.data && typeof t.data === "object" && !Array.isArray(t.data)) ? t.data : {};
      const text = await mcpCallTool(server, tool, args);
      return { ok: true, msg: "MCP " + server + "." + tool + " dijalankan", evidence: "Hasil MCP " + server + "." + tool + ":\n" + String(text).slice(0, 6000) };
    } catch (e) {
      return { ok: false, msg: "Gagal manggil MCP " + server + "." + tool + ": " + (e?.message || "error") };
    }
  });

  // 📄 createfile — bikin file teks dari konten yang diminta + kirim dokumen
  const createfile = deps.createfile || (async (t) => {
    let content = String(t.content || t.text || t.spec || "").trim();
    if (!content) return { ok: false, msg: "Jelasin isi file yang mau dibikin (konten lengkap)" };
    const base = (String(t.name || "file").trim() || "file").replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 40) || "file";
    const fileName = /\.[a-z0-9]{1,6}$/i.test(base) ? base : base + ".txt";
    // FIX OWNER 12 Sep: createfile kode (html/js/dll) yang kepotong →
    // dilengkapi otomatis via nova-codegen loop biar file-nya beneran jadi
    try {
      const extGuess = (fileName.match(/\.([a-z0-9]{1,6})$/i) || [])[1]?.toLowerCase() || "";
      const { CODE_EXTS, looksIncomplete, generateCompleteCode } = await import("../../src/lib/nova-codegen.js");
      if (CODE_EXTS.has(extGuess) && looksIncomplete(content, extGuess)) {
        onStatus?.("melengkapi kode yang kepotong");
        const chat = deps.aiChat || aiChainChat;
        const gen = await generateCompleteCode({
          spec: "Lengkapi file " + fileName + " sesuai draft berikut jadi versi final lengkap siap jalan:\n\n" + content,
          ext: extGuess, lang: extGuess,
          aiChat: (p, o) => chat(p, { ...o, timeoutMs: 60000 }),
          maxRounds: 3,
        });
        if (gen.code && gen.code.length > content.length) content = gen.code;
      }
    } catch { /* gagal melengkapi → kirim apa adanya, gak boleh mati */ }
    try {
      await sock.sendMessage(m.chat, {
        document: Buffer.from(content, "utf-8"),
        fileName,
        mimetype: "text/plain",
        caption: "📄 " + fileName + "\n_(dibikin aisuperagent)_",
      }, { quoted: m });
      return { ok: true, msg: "File dibikin: " + fileName, evidence: "File " + fileName + " udah dikirim sebagai dokumen berisi: " + content.slice(0, 300) };
    } catch (e) {
      return { ok: false, msg: "Gagal kirim file: " + (e?.message || "error") };
    }
  });

  // 🌐 browse — buka link & baca isi halaman (quick read tanpa fase riset)
  const browse = deps.browse || (async (t) => {
    const url = String(t.url || t.link || t.args || "").trim();
    if (!/^https?:\/\//i.test(url)) return { ok: false, msg: "Kasih link URL-nya (http/https)" };
    try {
      const { fetchPagePreview } = await import("../../src/lib/nova-websearch.js");
      const page = await fetchPagePreview(url);
      const body = String(page?.text || "").trim();
      if (!body) return { ok: false, msg: "Halaman gak kebaca: " + (page?.error || "kosong / butuh javascript") };
      const head = page?.title ? "Judul: " + page.title + (page.description ? "\n" + page.description : "") + "\n\n" : "";
      return { ok: true, msg: "Halaman " + url + " kebaca", evidence: "Isi halaman " + url + ":\n" + (head + body).slice(0, 5000) };
    } catch (e) {
      return { ok: false, msg: "Gagal buka " + url + ": " + (e?.message || "error") };
    }
  });

  return { command, image, download, code, vision, activity, memory, create, skill, mcp, createfile, browse, ytsearch };
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

// 🔹 UPGRADE 18 Sep 2026 (request owner: "fitur suaraa ini jg bsa di
// aisuperagent dan autonovaagent"): kirim jawaban sebagai VOICE NOTE NEURAL
// (msedge-tts — rantai TTS baru yang beneran nyambung, bukan haidarTTS
// yang lama). Teks jawaban TETAP dikirim pemanggil (superagent sering bawa
// sumber/link yang gak bisa diucap) — fungsi ini cuma ngirim VN-nya.
async function sendVoiceReply(m, sock, text, voiceId) {
  try {
    const { speakVoiceNote } = await import("../../src/lib/nova-voice-reply.js");
    return await speakVoiceNote(sock, m.chat, text, voiceId, { quoted: m });
  } catch {
    return false;
  }
}

// 🧰 TOOLBOX BUILDER — daftar skill + tool MCP terpasang buat planner
// (request owner 12 Sep: aisuperagent "dilengkapi mcp, skills dan tool
// tambahan kyk novaagent") — planner cuma boleh milih yang ke-list di sini.
export async function buildToolbox() {
  try { await awaitSkillPacks(); } catch {}
  let skillLines = [];
  try {
    const reg = getAllSkills();
    skillLines = Object.values(reg)
      .filter((s) => s && s.name)
      .map((s) => "- skill " + s.name + ": " + String(s.desc || "").slice(0, 90));
  } catch {}
  let mcpLines = [];
  try {
    const flat = await getMcpTools();
    const bySrv = {};
    for (const x of flat) {
      if (!x?.server || !x?.tool) continue;
      (bySrv[x.server] = bySrv[x.server] || []).push(x.tool);
    }
    mcpLines = Object.entries(bySrv).map(([srv, tools]) => "- mcp " + srv + ": " + tools.slice(0, 5).join(", "));
  } catch {}
  if (!skillLines.length && !mcpLines.length) return "";
  return [...skillLines, ...mcpLines].join("\n").slice(0, 2500);
}

async function handler(m, { sock, db, deps } = {}) {
  const task = (m.args || []).join(" ").trim();

  // 🔹 MODE SUARA (upgrade owner 18 Sep: ".aisuperagent pakai suara") —
  // subcommand exact-match, pertanyaan biasa yang mengandung kata "suara"
  // TIDAK ditelan (lanjut ke agent flow).
  try {
    const { voiceSubReply, VOICE_KEYS } = await import("../../src/lib/nova-voice-reply.js");
    const subReply = voiceSubReply(db, m.chat, task.toLowerCase(), VOICE_KEYS.aisuperagent);
    if (subReply) return m.reply(claraWrap("superagent", subReply));
  } catch {}

  if (!task) {
    return m.reply(novaGuide(
      "agent",
      "AI agent otonom — dia sendiri yang nyari ke web, baca halamannya, terus nyusun jawaban lengkap + sumber.",
      `${m.prefix}agent <tugas apa pun>\n${m.prefix}agent cari hp terbaik di bawah 5 juta, bandingkan dan kasih rekomendasi\n${m.prefix}agent kick orang yang bernama Budi\n${m.prefix}agent tutup grup dan ubah nama grup jadi Nova Squad`,
      [`${smallcapsText("mode suara")}: ${m.prefix}aisuperagent pakai suara → jawabanku dibacakan jadi voice note • ${m.prefix}aisuperagent suara ardi → ganti suara • ${m.prefix}aisuperagent suara off`,
       `${smallcapsText("8 kemampuan serba bisa")}: 🔍 ${smallcapsText("browsing riset web + sumber")} | 🔎 ${smallcapsText("cari video youtube — thumbnail preview + deskripsi")} | ⚡ ${smallcapsText("otomasi grup — kick dari nama, tutup grup (wajib admin)")} | 🛠️ ${smallcapsText("tools — scan gambar, generate gambar, jalanin fitur, cek aktivitas")} | ⬇️ ${smallcapsText("unduh file — apk/zip dari link")} | 💻 ${smallcapsText("coding — bikin kode html/js/python dikirim jadi file")} | 🎭 ${smallcapsText("persona — jadi anak kecil, pacar, siapa pun")} | 🧠 ${smallcapsText("inget percakapan + jawab pakai vn")}`,
       `${smallcapsText("bermain peran/persona")}: ${m.prefix}agent jadi anak kecil umur 5 tahun yang sok jagoan | ${m.prefix}agent jadi pacarku yang manja`,
       `${smallcapsText("bikin kode program")}: ${m.prefix}agent buatkan kode html halaman toko kue yang keren`,
       `${smallcapsText("bantuin tugas")}: ${m.prefix}agent bantuin tugas matematika ini — ...`,
       `${smallcapsText("unduh file/apk/zip")}: ${m.prefix}agent download file ini https://situs.com/app.apk`,
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
    plan: "🧠 " + smallcapsText("superagent merencanakan..."),
    search: "🔍 " + smallcapsText("superagent mencari informasi..."),
    pick: "🎯 " + smallcapsText("superagent memilih sumber terbaik..."),
    read: "📖 " + smallcapsText("superagent membaca halaman..."),
    compose: "✍️ " + smallcapsText("superagent menyusun jawaban..."),
    act: "⚡ " + smallcapsText("superagent mengeksekusi aksi..."),
    tool: "🛠️ " + smallcapsText("superagent pakai tools..."),
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

    // ── DETEKSI LOKAL: cari video YouTube → INSTAN (request owner 14 Sep:
    // ".aisuperagent juga di-upgrade — dua agent bermasalah ngbug" — akar
    // yang sama kaya .novaagent: request 'cairkan/carikan X di youtube' gak
    // pernah ke-detect, planner AI milih tool salah / jawab halusinasi.
    // Sekarang dideteksi lokal via LIB BERSAMA nova-yt-search.js → langsung
    // browser beneran + thumbnail preview, TANPA lewat planner AI).
    const ytIntent = detectYtSearchIntent(norm(task), task);
    if (ytIntent) {
      await reactPhase("🔍");
      await setStatus("🔍 " + smallcapsText("superagent cari video di youtube..."));
      const ytSend = deps.ytsearchSend || searchYoutubeAndSend;
      try {
        await ytSend(sock, m, { query: ytIntent.query, wantDownload: ytIntent.download });
        if (statusKey) { try { await sock.sendMessage(m.chat, { text: "✅ " + smallcapsText(ytIntent.download ? "videonya udah aku unduh & kirim di atas ya" : "thumbnail preview + info videonya udah aku kirim di atas ya"), edit: statusKey }); } catch {} }
        await m.react("🐣");
      } catch (e) {
        await m.react("❌");
        const em = claraWrap("superagent", "gagal cari video youtube: " + (e?.message || "error"), "error");
        if (statusKey) { try { await sock.sendMessage(m.chat, { text: em, edit: statusKey }); return; } catch {} }
        await m.reply(em);
      }
      return;
    }

    // ── DETEKSI LOKAL: cari di SITUS SEMBARANG (apkmirror/apkpure/dll)
    // — INSTAN (request owner 14 Sep: "cba tes klo disuruh cari kayak
    // carikan aplikasi whatsapp di apkmiror" — tes live planner milih
    // tool download → 403, salah total). Chromium beneran buka web-nya
    // via LIB BERSAMA nova-site-search.js, TANPA lewat planner AI).
    const siteIntent = detectSiteSearchIntent(norm(task), task);
    if (siteIntent) {
      await reactPhase("🔍");
      await setStatus("🔍 " + smallcapsText("superagent nyari di " + siteIntent.site + "..."));
      const siteSend = deps.sitesearchSend || searchSiteAndSend;
      try {
        await siteSend(sock, m, { site: siteIntent.site, query: siteIntent.query });
        if (statusKey) { try { await sock.sendMessage(m.chat, { text: "✅ " + smallcapsText("hasil cari di " + siteIntent.site + " udah aku kirim di atas ya"), edit: statusKey }); } catch {} }
        await m.react("🐣");
      } catch (e) {
        await m.react("❌");
        const em = claraWrap("superagent", "gagal cari di " + siteIntent.site + ": " + (e?.message || "error"), "error");
        if (statusKey) { try { await sock.sendMessage(m.chat, { text: em, edit: statusKey }); return; } catch {} }
        await m.reply(em);
      }
      return;
    }

    // reply/attach gambar → buffer buat tool vision (scan gambar)
    let mediaBuffer = null;
    try {
      const mediaMsg = m.isImage ? m : m.quoted?.isImage ? m.quoted : null;
      if (mediaMsg && typeof mediaMsg.download === "function") mediaBuffer = await mediaMsg.download();
    } catch {}

    const executors = buildExecutors(m, sock, db, mediaBuffer, deps || {}, setStatus);

    const toolbox = await buildToolbox();
    const res = await runAgent(task, {
      act: (a, ctx) => execAction(a, ctx, m, sock),
      execTools: executors,
      toolbox,
      history: getAgentHistory(db, m.chat),
      // 🔹 MEMORY LAYER: fakta durabel tentang user (store sama dengan .novaai/
      // .novaagent) — biar superagent juga inget user antar sesi (owner 25 Sep:
      // "harusnya nyambung ke dua ai agent novaagent dan aisuperagent")
      memBlock: memoryBlock(db, m.sender, task),
      skillBlock: skillsBlock(task),
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
          label = (phase === "tool" ? "🛠️ " : "⚡ ") + smallcapsText("superagent menjalankan: " + info.slice(0, 60));
        }
        setStatus(label);
      },
    });

    if (res?.error) {
      await m.react("❌");
      const errMsg = claraWrap("superagent", res.error, "error");
      if (statusKey) { try { await sock.sendMessage(m.chat, { text: errMsg, edit: statusKey }); return; } catch {} }
      return m.reply(errMsg);
    }

    // inget jejak percakapan (biar .agent ingat percakapan sebelumnya)
    saveAgentMemory(db, m.chat, task, res.mode, res.answer);
    // 🔹 auto-ekstrak fakta durabel baru dari tugas+jawaban ini (fire-and-forget,
    // gak nge-block pengiriman; hormatin toggle .memory on/off per user)
    try { extractMemories(db, m.sender, task, res.answer).catch(() => {}); } catch {}

    // jawaban final di-EDIT ke pesan status (revisi owner: cukup 1 chat);
    // VN tetap dikirim pesan baru (audio gak bisa di-edit dari teks)
    if (res.mode === "act" || res.mode === "tools") {
      // 🔹 FIX OWNER 17 Sep: jawaban panjang → CHAT TERUSAN (gak dipotong).
      // Teks TETAP dikirim dulu (superagent sering bawa sumber/link),
      // terus kalau mode suara aktif → VN neural nambah dibacakan.
      let ok = false;
      const partsA = splitChatChunks(res.answer);
      if (partsA.length) {
        if (statusKey) { try { await sock.sendMessage(m.chat, { text: partsA[0], edit: statusKey }); ok = true; } catch {} }
        if (!ok) { try { await m.reply(partsA[0]); ok = true; } catch {} }
        for (let i = 1; ok && i < partsA.length; i++) {
          try { await sock.sendMessage(m.chat, { text: partsA[i] }, { quoted: m }); } catch { break; }
        }
      }
      // VN: keyword request, flag planner AI, ATAU mode suara per chat
      try {
        const { wantsVoice, getVoiceCfg, VOICE_KEYS } = await import("../../src/lib/nova-voice-reply.js");
        const wantVoice = res.voice === true || /\b(vn|voice\s?note|pakai suara|pake suara|dengan suara)\b/i.test(task)
          || wantsVoice(db, m.chat, task, VOICE_KEYS.aisuperagent);
        if (wantVoice) {
          const cfg = getVoiceCfg(db, m.chat, VOICE_KEYS.aisuperagent);
          const doVoice = deps?.voiceReply || sendVoiceReply;
          if (await doVoice(m, sock, res.answer, cfg.voice)) {
            await setStatus("🎙️ " + smallcapsText("jawabannya juga kuputarakan di voice note ya"));
          }
        }
      } catch {}
      await m.react("🐣");
      return;
    }
    const src = (res.sources || []).map((s, i) => `${i + 1}. [${s.tag}] ${s.domain} — ${s.url}`).join("\n");
    const footer = src ? `\n\n📎 ${smallcapsText("sumber")}\n${src}` : "";
    const note = res.viaLocal ? `\n\n⚙️ ${smallcapsText("mode digest lokal")}` : "";
    const fullAnswer = res.answer + note + footer;
    // 🔹 FIX OWNER 17 Sep: jawaban riset panjang → CHAT TERUSAN (gak dipotong).
    // Sumber penting → teks TETAP dikirim; kalau mode suara aktif → VN nambah.
    let ok = false;
    const partsR = splitChatChunks(fullAnswer);
    if (partsR.length) {
      if (statusKey) { try { await sock.sendMessage(m.chat, { text: partsR[0], edit: statusKey }); ok = true; } catch {} }
      if (!ok) { try { await m.reply(partsR[0]); ok = true; } catch {} }
      for (let i = 1; ok && i < partsR.length; i++) {
        try { await sock.sendMessage(m.chat, { text: partsR[i] }, { quoted: m }); } catch { break; }
      }
    }
    // VN: keyword request, flag planner AI, ATAU mode suara per chat
    try {
      const { wantsVoice, getVoiceCfg, VOICE_KEYS } = await import("../../src/lib/nova-voice-reply.js");
      const wantVoice = res.voice === true || /\b(vn|voice\s?note|pakai suara|pake suara|dengan suara)\b/i.test(task)
        || wantsVoice(db, m.chat, task, VOICE_KEYS.aisuperagent);
      if (wantVoice) {
        const cfg = getVoiceCfg(db, m.chat, VOICE_KEYS.aisuperagent);
        const doVoice2 = deps?.voiceReply || sendVoiceReply;
        if (await doVoice2(m, sock, res.answer, cfg.voice)) {
          await setStatus("🎙️ " + smallcapsText("jawabannya juga kuputarakan di voice note ya"));
        }
      }
    } catch {}
    await m.react("🐣");
  } catch (e) {
    console.error("agent error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("superagent", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler, execAction };
