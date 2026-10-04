// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// autojoin.js — owner: jadwalkan bot join/leave grup & channel otomatis
// (fitur "akses penuh di bot", 26 Sep 2026):
//   Aturan waktu: pakai ":" (12:00) = JAM PASTI · tanpa ":" (7d/2j/30m) = COUNTDOWN
//   .autojoin group|gc <link> <waktu>   → join grup di waktu ditentukan
//   .autojoin channel|ch <link> <waktu> → follow channel di waktu ditentukan
//   .autoout group <link> <waktu>    → keluar grup di waktu ditentukan
//   .autoout channel <link> <waktu>  → unfollow channel di waktu ditentukan
//   .autojoin list · .autojoin cancel <id>
// Waktu: 30m · 2j · 1d · 18:30 · besok 08:00 · 01-12 20:00

import {
  addAutojoinTask, cancelAutojoinTask, listAutojoinTasks,
  parseWaktuAutojoin, formatWaktuAutojoin, extractGroupCode, isChannelLink,
  _autojoinForTest,
} from "../../src/lib/rara-autojoin.js";
import { raraGuide, raraSalah, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "autojoin",
  alias: ["autojoin", "autojoingroup", "autojoinchannel", "autoout", "autooutgroup", "autooutchannel", "autoleavegroup", "autoleave"],
  category: "bot",
  description: "Jadwalkan bot join/leave grup & channel otomatis di waktu ditentukan",
  usage: ".autojoin group|channel <link> <waktu>",
  example: ".autojoin group https://chat.whatsapp.com/xxx 18:30",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const WAKTU_HINT = 'Aturan waktu: pakai ":" = jam pasti (12:00, besok 08:00) · tanpa ":" = countdown hitung mundur (7d, 2j, 30m) — WIB, maks 30 hari';

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const cmd = (m.command || "autojoin").toLowerCase();
  // .autoout* → aksi out; .autojoin* → aksi join
  const isOutCmd = cmd.startsWith("autoout") || cmd.startsWith("autoleave");
  const action = isOutCmd ? "out" : "join";
  const label = action === "out" ? "AUTOOUT" : "AUTOJOIN";

  try {
    await m.react("🕒");
    const sub = (m.args[0] || "").toLowerCase();
    const owner = m.sender;

    // ─── usage card ───
    if (!sub) {
      return m.reply(raraGuide("autojoin", {
        sapaan: "Jadwalkan bot join/leave grup & channel otomatis di waktu ditentukan",
        cara: [
          `${prefix}autojoin group|gc <link grup> <waktu> — join grup terjadwal`,
          `${prefix}autojoin channel|ch <link channel> <waktu> — follow channel terjadwal`,
          `${prefix}autoout group|gc <link grup> <waktu> — keluar grup terjadwal`,
          `${prefix}autoout channel|ch <link channel> <waktu> — unfollow channel terjadwal`,
          `${prefix}autojoin list — lihat tugas pending`,
          `${prefix}autojoin cancel <id> — batalkan tugas`,
        ].join("\n"),
        contoh: `${prefix}autojoin gc https://chat.whatsapp.com/xxx 7d · ${prefix}autojoin group https://chat.whatsapp.com/xxx 12:00 · ${prefix}autojoin channel https://whatsapp.com/channel/xxx besok 08:00`,
        note: WAKTU_HINT + " — hasil eksekusi dikirim DM ke owner",
      }), "autojoin");
    }

    // ─── list ───
    if (sub === "list") {
      const tasks = listAutojoinTasks(owner);
      if (tasks.length === 0) {
        return m.reply(raraWrap(label, "Belum ada tugas autojoin/autoout pending."), "autojoin");
      }
      const lines = [`🕒 ${tasks.length} tugas pending:`, ""];
      for (const t of tasks) {
        const sisa = t.at - Date.now();
        const sisaTxt = sisa > 60000 ? `${Math.floor(sisa / 60000)} mnt lagi` : `${Math.max(1, Math.floor(sisa / 1000))} dtk lagi`;
        lines.push(`${t.action === "join" ? "📥" : "📤"} ${t.id} — ${t.target === "group" ? "grup" : "channel"}`);
        lines.push(`   ⏰ ${formatWaktuAutojoin(t.at)} (${sisaTxt})`);
        lines.push(`   🔗 ${t.link}`);
        lines.push("");
      }
      return m.reply(raraWrap(label, lines.join("\n").trim()), "autojoin");
    }

    // ─── cancel ───
    if (sub === "cancel" || sub === "batal") {
      const id = m.args[1];
      if (!id) {
        return m.reply(raraSalah("autojoin", { pesan: "id tugas kosong — lihat id di " + prefix + "autojoin list", contoh: prefix + "autojoin cancel AJ-XXXX1" }), "autojoin");
      }
      const t = cancelAutojoinTask(String(id).toUpperCase(), owner);
      if (!t) {
        return m.reply(raraWrap(label, [
          "❌ Tugas gak ketemu / udah dieksekusi.",
          "",
          `Cek id di ${prefix}autojoin list.`,
        ]), "autojoin");
      }
      await m.react("🐣");
      return m.reply(raraWrap(label, [
        "✅ Tugas dibatalkan.",
        "",
        `${t.id} — ${t.action === "join" ? "join" : "out"} ${t.target}`,
        `Jadwal semula: ${formatWaktuAutojoin(t.at)}`,
      ]), "autojoin");
    }

    // ─── pasang tugas: group|channel <link> <waktu> ───
    if (!["group", "gc", "grup", "channel", "ch", "saluran"].includes(sub)) {
      return m.reply(raraSalah("autojoin", { pesan: "target gak dikenal — group/gc · channel/ch · list · cancel", contoh: prefix + "autojoin gc https://chat.whatsapp.com/xxx 7d" }), "autojoin");
    }
    const target = ["group", "gc", "grup"].includes(sub) ? "group" : "channel";
    const link = m.args[1] || "";
    const waktuStr = m.args.slice(2).join(" ");

    if (target === "group" && !extractGroupCode(link)) {
      await m.react("❌");
      return m.reply(raraWrap(label, [
        "❌ Link grup gak valid.",
        "",
        `Harus berformat chat.whatsapp.com/<kode> — contoh:`,
        `${prefix}${action === "join" ? "autojoin" : "autoout"} group https://chat.whatsapp.com/AbCdEf 18:30`,
      ]), "autojoin");
    }
    if (target === "channel" && !isChannelLink(link)) {
      await m.react("❌");
      return m.reply(raraWrap(label, [
        "❌ Link channel gak valid.",
        "",
        `Harus berformat whatsapp.com/channel/<kode> — contoh:`,
        `${prefix}${action === "join" ? "autojoin" : "autoout"} channel https://whatsapp.com/channel/AbCdEf besok 08:00`,
      ]), "autojoin");
    }
    if (!waktuStr) {
      await m.react("❌");
      return m.reply(raraWrap(label, [
        "❌ Waktu belum ditentukan.",
        "",
        WAKTU_HINT,
      ]), "autojoin");
    }
    const at = parseWaktuAutojoin(waktuStr);
    if (!at) {
      await m.react("❌");
      return m.reply(raraWrap(label, [
        "❌ Waktu gak valid / terlalu dekat / terlalu jauh.",
        "",
        WAKTU_HINT,
      ]), "autojoin");
    }

    const res = addAutojoinTask(sock, { action, target, link, at, owner });
    if (!res.ok) {
      await m.react("❌");
      return m.reply(raraWrap(label, [
        "❌ Tugas gagal dipasang.",
        "",
        res.reason || "",
      ]), "autojoin");
    }
    await m.react("🐣");
    return m.reply(raraWrap(label, [
      `🕒 Tugas terpasang — ${res.task.id}`,
      "",
      `Aksi: ${action === "join" ? "📥 join" : "📤 keluar"} ${target === "group" ? "grup" : "channel"}`,
      `Link: ${link}`,
      `Eksekusi: ${formatWaktuAutojoin(at)}`,
      "",
      `Bot jalan otomatis di waktu itu — hasil dikirim DM ke kamu.`,
      `Batal: ${prefix}autojoin cancel ${res.task.id}`,
    ]), "autojoin");
  } catch (e) {
    await m.react("❌");
    return m.reply(raraWrap("autojoin", `❌ Gagal: ${e?.message || e}`), "autojoin");
  }
}

export { pluginConfig as config, handler };
