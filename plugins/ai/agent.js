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
import { runAgent } from "../../src/lib/nova-agent.js";
import { smallcapsText } from "../../src/lib/styler.js";

const pluginConfig = {
  name: "agent",
  alias: ["agent", "aiagent", "agensi", "agentai", "agenta"],
  category: "ai",
  description: "AI Agent otonom — mikir sendiri: nyari web, baca halaman, susun jawaban + sumber",
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

const PHASE_LABEL = {
  plan: "🧠 " + smallcapsText("merencanakan langkah riset"),
  search: "🔍 " + smallcapsText("menyusuri web"),
  pick: "🎯 " + smallcapsText("memilih halaman terbaik"),
  read: "📖 " + smallcapsText("membaca halaman"),
  compose: "✍️ " + smallcapsText("menyusun jawaban"),
  act: "⚡ " + smallcapsText("mengeksekusi aksi"),
};

async function handler(m, { sock }) {
  const task = (m.args || []).join(" ").trim();
  if (!task) {
    return m.reply(novaGuide(
      "agent",
      "AI agent otonom — dia sendiri yang nyari ke web, baca halamannya, terus nyusun jawaban lengkap + sumber.",
      `${m.prefix}agent <tugas apa pun>\n${m.prefix}agent cari hp terbaik di bawah 5 juta, bandingkan dan kasih rekomendasi\n${m.prefix}agent kick orang yang bernama Budi\n${m.prefix}agent tutup grup dan ubah nama grup jadi Nova Squad`,
      [`${smallcapsText("2 mode otomatis")}: 🔍 ${smallcapsText("browsing riset web + sumber")} | ⚡ ${smallcapsText("otomasi grup — kick dari nama, tutup grup, promote, rename (wajib admin)")}`,
       `${smallcapsText("butuh 1-3 menit, sabar ya")}`],
    ));
  }

  let statusKey = null;
  const setStatus = async (text) => {
    try {
      if (!statusKey) {
        const sent = await sock.sendMessage(m.chat, { text });
        statusKey = sent?.key || null;
        return;
      }
      await sock.sendMessage(m.chat, { text, edit: statusKey });
    } catch {
      try { await m.reply(text); } catch {}
    }
  };

  try {
    await m.react("🕒");
    await setStatus("🧠 " + smallcapsText("agent berpikir..."));

    let step = 0;
    let TOTAL = 5; // research: plan, search, pick, read, compose — act: plan + N aksi
    const res = await runAgent(task, {
      act: (a, ctx) => execAction(a, ctx, m, sock),
      context: {
        isGroup: m.isGroup !== false,
        isAdmin: !!m.isAdmin,
        isOwner: !!m.isOwner,
        isBotAdmin: !!m.isBotAdmin,
        chat: m.chat,
        sender: m.sender,
      },
      onPhase: (phase, info) => {
        if (phase === "act") { TOTAL = 2; } // plan + total aksi
        else if (phase !== "plan" && TOTAL === 2) { TOTAL = 5; }
        step++;
        const label = PHASE_LABEL[phase] || phase;
        const extra = info ? `\n\n${smallcapsText("fokus")}: ${info}` : "";
        const bar = "🟩".repeat(Math.min(step - 1, TOTAL)) + "⬜".repeat(Math.max(TOTAL - step + 1, 0));
        setStatus(`${label}${extra}\n\n${bar} ${smallcapsText("langkah")} ${step}/${TOTAL}`);
      },
    });

    if (res?.error) {
      await m.react("❌");
      return m.reply(claraWrap("agent", res.error, "error"));
    }

    // status jadi penanda selesai, jawaban dikirim terpisah biar rapi
    if (res.mode === "act") {
      await setStatus("⚡ " + smallcapsText("aksi selesai — laporan di bawah"));
      await m.reply(res.answer);
      await m.react("🐣");
      return;
    }
    await setStatus("✅ " + smallcapsText("riset selesai — jawaban di bawah"));

    const src = (res.sources || []).map((s, i) => `${i + 1}. [${s.tag}] ${s.domain} — ${s.url}`).join("\n");
    const footer = src ? `\n\n📎 ${smallcapsText("sumber")}\n${src}` : "";
    const note = res.viaLocal ? `\n\n⚙️ ${smallcapsText("mode digest lokal")}` : "";
    await m.reply(res.answer + note + footer);
    await m.react("🐣");
  } catch (e) {
    console.error("agent error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("agent", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
