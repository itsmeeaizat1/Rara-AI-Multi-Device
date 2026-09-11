// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 GUARDIAN — Group Guardian AI (request owner 12 Sep 2026)
// 🔹 Moderator grup berbasis AI — nilai konteks pesan:
//   promo/jualan, scam/judi, toxic, nsfw, junk → warning → kick
// 🔹 Beda dari anti-X (regex): ini ngerti konteks, gak asal blokir
// ============================================================
import { claraWrap, novaError } from "../../src/lib/nova-menu-style.js";
import {
  isGuardianOn, setGuardianOn, setGuardianMode, getGuardianStatus,
  resetStrikes, guardianTest,
} from "../../src/lib/nova-guardian.js";

const pluginConfig = {
  name: "guardian",
  alias: ["guardian"],
  category: "group",
  description: "Group Guardian AI — moderator grup otomatis berbasis AI",
  usage: ".guardian on/off\n.guardian mode <santai/normal/strict>\n.guardian test <teks>\n.guardian log\n.guardian reset <reply/@user>",
  example: ".guardian on\n.guardian test mau jual chip domino murah dm admin",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock, db } = {}) {
  if (!m.isGroup) return m.reply(claraWrap("Guardian", `Fitur ini cuma jalan di dalam grup.`));
  if (!m.isAdmin && !m.isOwner) return m.reply(claraWrap("Guardian", `Cuma admin grup/owner yang bisa ngatur guardian.`));

  const args = (m.args || []).map(String);
  const sub = (args[0] || "").toLowerCase();
  const st = getGuardianStatus(db, m.chat);

  // ── on / off ──
  if (sub === "on" || sub === "off") {
    setGuardianOn(db, m.chat, sub === "on");
    await m.react("🐣");
    if (sub === "on") {
      return m.reply(claraWrap("Guardian", [
        `🛡️ Group Guardian AI AKTIF!`,
        ``,
        `Aku jaga grup ini 24/7 — pesan yang nilainya pelanggaran bakal kena:`,
        `• Level ringan → dicatat diam-diam`,
        `• Level sedang → ⚠️ warning ke user`,
        `• Level berat → 🗑️ pesan dihapus + warning`,
        `• 3 warning dalam 24 jam → kick otomatis${m.isBotAdmin ? "" : " (jadiin aku admin biar bisa hapus/kick!)"}`,
        ``,
        `Mode: ${st.mode || "normal"} — ganti: .guardian mode <santai/normal/strict>`,
      ]));
    }
    return m.reply(claraWrap("Guardian", [`📴 Guardian mati di grup ini.`]));
  }

  // ── mode ──
  if (sub === "mode" || sub === "sensitivity") {
    const mode = (args[1] || "").toLowerCase();
    if (!["santai", "normal", "strict"].includes(mode)) {
      return m.reply(claraWrap("Guardian", [
        `⚙️ Mode guardian sekarang: ${st.mode || "normal"}`,
        ``,
        `• santai — cuma kasus jelas (link scam/judi) yang dicek AI`,
        `• normal — heuristik lokal nge-filter, yang mencurigakan masuk ke AI`,
        `• strict — SEMUA pesan teks dinilai AI (paling teliti, makan AI paling banyak)`,
      ]));
    }
    setGuardianMode(db, m.chat, mode);
    await m.react("🐣");
    return m.reply(claraWrap("Guardian", [`✅ Mode diganti jadi ${mode}.`]));
  }

  // ── reset strike ──
  if (sub === "reset") {
    let target = m.mentionedJid?.[0] || m.quoted?.sender;
    if (!target) return m.reply(novaError("Guardian", `Reset strike siapa? Reply pesannya atau @mention user.`));
    const before = resetStrikes(db, m.chat, target);
    await m.react("🐣");
    return sock.sendMessage(m.chat, {
      text: claraWrap("Guardian", [`✅ Strike ${before} buat @${target.split("@")[0]} dihapus — mulai dari nol lagi.`]),
      mentions: [target],
    }, { quoted: m });
  }

  // ── log ──
  if (sub === "log" || sub === "riwayat") {
    if (!st.log.length) return m.reply(claraWrap("Guardian", [`📭 Belum ada kejadian tercatat di grup ini.`]));
    const lines = st.log.slice(0, 10).map((e, i) => {
      const t = new Date(e.ts).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
      return `${i + 1}. [${t}] ${e.name} — ${e.type} (${e.act})`;
    });
    return m.reply(claraWrap("Guardian", [
      `📜 10 kejadian terakhir:`,
      ``,
      ...lines,
    ]));
  }

  // ── test (dry-run — tanpa aksi apa pun) ──
  if (sub === "test" || sub === "cek") {
    const text = args.slice(1).join(" ").trim();
    if (!text) return m.reply(novaError("Guardian", `Tes pakai teks apa? Contoh: .guardian test bang mau jual akun murah dm 0812`));
    await m.react("🕒");
    const { suspect, verdict } = await guardianTest(text);
    const v = verdict;
    return m.reply(claraWrap("Guardian", [
      `🧪 Hasil tes (dry-run — gak ada aksi):`,
      ``,
      `Deteksi lokal: ${suspect || "gak mencurigakan (AI tetap menilai)"}`,
      `AI nilai: ${v.violation ? `❌ PELANGGARAN — ${v.type}, level ${v.severity}` : "✅ aman"}`,
      `Alasan AI: ${v.reason}`,
      ``,
      v.violation ? (v.severity === 1 ? `Kalau beneran: dicatat senyap.` : v.severity === 2 ? `Kalau beneran: warning + strike.` : `Kalau beneran: hapus pesan + warning + strike.`) : `Kalau beneran: diabaikan.`,
    ]));
  }

  // ── default: status ──
  const totalStrikes = Object.values(st.strikes || {}).reduce((a, s) => a + (s.count || 0), 0);
  return m.reply(claraWrap("Guardian", [
    `🛡️ GROUP GUARDIAN AI`,
    ``,
    `Status: ${st.on ? "🟢 AKTIF" : "🔴 mati"} — ${st.on ? ".guardian off" : ".guardian on"}`,
    `Mode: ${st.mode || "normal"}`,
    `Total strike aktif: ${totalStrikes}`,
    `Kejadian tercatat: ${st.log.length}`,
    ``,
    `• .guardian mode <santai/normal/strict> — tingkat kecurigaan`,
    `• .guardian test <teks> — coba tanpa aksi`,
    `• .guardian log — riwayat moderasi`,
    `• .guardian reset (@user) — hapus strike user`,
  ]));
}

export { pluginConfig as config, handler };
