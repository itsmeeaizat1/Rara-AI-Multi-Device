// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * Nama Plugin: Arisan Manager
 * Fitur: .arisan — manajer arisan grup khas Indonesia:
 *        mulai (set setoran), join peserta, undi giliran acak,
 *        info progres, riwayat pemenang. Persist di database.
 */
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaWrap, tipText } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "arisan",
  alias: ["arisan", "arisanmanager", "undi"],
  category: "group",
  description: "Manajer arisan grup — peserta, setoran, undian giliran acak",
  usage: ".arisan <mulai|join|info|undi|riwayat|keluar|stop>",
  example: ".arisan mulai 50000\n.arisan join\n.arisan undi",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

const rp = (n) => "Rp " + Math.round(n).toLocaleString("id-ID");

function getAll() {
  const db = getDatabase();
  return db.setting("arisan") || {};
}
function saveAll(all) {
  const db = getDatabase();
  db.setting("arisan", all);
  db.save();
}
export function _getArisanStoreForTest() { return getAll(); }

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig?.command?.prefix || m.prefix || ".";
  const sub = (m.args?.[0] || "").toLowerCase();
  const arg = (m.args?.[1] || "").trim();
  const gid = m.chat;

  // ── mulai ──
  if (sub === "mulai" || sub === "start") {
    const all = getAll();
    if (all[gid]?.active) {
      return m.reply(novaWrap("Arisan", `Arisan di grup ini lagi jalan! Ketik ${prefix}arisan info buat lihat progresnya.`));
    }
    const setoran = Number(String(arg).replace(/[^\d]/g, ""));
    if (!Number.isFinite(setoran) || setoran < 1000) {
      return m.reply(novaWrap("Arisan", [
        "🎯 *Mulai Arisan*",
        "",
        `Format: ${prefix}arisan mulai <setoran>`,
        `Contoh: ${prefix}arisan mulai 50000 (Rp 50.000/orang per giliran)`,
        "",
        "Minimal Rp 1.000. Setelah mulai, peserta ketik:",
        `${prefix}arisan join — daftar ikut arisan`,
        `${prefix}arisan undi — undi giliran (kalau semua udah join)`,
      ].join("\n")));
    }
    const all2 = getAll();
    all2[gid] = { active: true, setoran, peserta: [], riwayat: [], createdAt: Date.now() };
    saveAll(all2);
    await m.react("🐣");
    return m.reply(novaWrap("Arisan", [
      "🎉 *ARISAN DIMULAI!*",
      "",
      `💰 Setoran: ${rp(setoran)}/orang per giliran`,
      "",
      `Pengen ikut? Ketik ${prefix}arisan join`,
      `Undian giliran mulai kapan aja: ${prefix}arisan undi`,
      "",
      "_tiap giliran, 1 orang menang & dapat total setoran × jumlah peserta_",
    ].join("\n")));
  }

  const all = getAll();
  const arisan = all[gid];

  // ── join ──
  if (sub === "join" || sub === "ikut") {
    if (!arisan?.active) return m.reply(novaWrap("Arisan", `Belum ada arisan di grup ini. Ketik ${prefix}arisan mulai <setoran>`));
    if (arisan.peserta.some((p) => p.id === m.sender)) {
      return m.reply(novaWrap("Arisan", "Kamu udah terdaftar di arisan ini 😄"));
    }
    arisan.peserta.push({ id: m.sender, name: m.pushName || m.sender.split("@")[0], dapat: null });
    saveAll(all);
    await m.react("🐣");
    return m.reply(novaWrap("Arisan", [
      "✅ *Berhasil Gabung Arisan!*",
      "",
      `👤 ${m.pushName || m.sender.split("@")[0]} masuk daftar`,
      `👥 Peserta: ${arisan.peserta.length} orang`,
      `💰 Setoran per giliran: ${rp(arisan.setoran)}`,
      "",
      arisan.peserta.length >= 2 ? `Semua udah siap? Ketik ${prefix}arisan undi 🎲` : "_butuh minimal 2 peserta buat undi_",
    ].join("\n")));
  }

  // ── info ──
  if (!sub || sub === "info" || sub === "status") {
    if (!arisan?.active) {
      return m.reply(novaWrap("Arisan", [
        "🎯 *Arisan Manager*",
        "",
        `Belum ada arisan jalan di grup ini.`,
        "",
        `${prefix}arisan mulai 50000 — mulai arisan (setoran Rp 50rb/orang)`,
        `${prefix}arisan join — ikut arisan`,
        `${prefix}arisan undi — undi giliran`,
        `${prefix}arisan info — progres`,
        `${prefix}arisan riwayat — pemenang sebelumnya`,
        `${prefix}arisan keluar — keluar dari arisan`,
        `${prefix}arisan stop — stop arisan`,
      ].join("\n")));
    }
    const sudah = arisan.peserta.filter((p) => p.dapat);
    const belum = arisan.peserta.filter((p) => !p.dapat);
    const lines = [
      "🎯 *Info Arisan*",
      "",
      `💰 Setoran: ${rp(arisan.setoran)}/orang per giliran`,
      `👥 Peserta: ${arisan.peserta.length} orang`,
      `🏆 Sudah dapat: ${sudah.length} | 🕒 Belum: ${belum.length}`,
      `🎁 Total per giliran: ${rp(arisan.setoran * arisan.peserta.length)}`,
      "",
      "🕒 *Belum dapat giliran:*",
      ...(belum.length ? belum.map((p) => `• ${p.name}`) : ["— semua udah dapat! 🎉"]),
    ];
    if (sudah.length) {
      lines.push("", "🏆 *Sudah dapat:*");
      sudah.forEach((p) => lines.push(`• ${p.name}`));
    }
    return m.reply(novaWrap("Arisan", lines.join("\n")));
  }

  if (!arisan?.active) {
    return m.reply(novaWrap("Arisan", `Belum ada arisan di grup ini. Ketik ${prefix}arisan mulai <setoran>`));
  }

  // ── undi ──
  if (sub === "undi") {
    const belum = arisan.peserta.filter((p) => !p.dapat);
    if (arisan.peserta.length < 2) return m.reply(novaWrap("Arisan", `Butuh minimal 2 peserta buat undian. Ajak temenmu ketik ${prefix}arisan join`));
    if (!belum.length) return m.reply(novaWrap("Arisan", "🎉 Semua peserta udah dapat giliran! Arisan kelar — ketik .arisan stop buat nutup."));
    const win = belum[Math.floor(Math.random() * belum.length)];
    win.dapat = Date.now();
    arisan.riwayat.push({ id: win.id, name: win.name, ts: win.dapat, total: arisan.setoran * arisan.peserta.length });
    saveAll(all);
    await m.react("🎉");
    const sisa = belum.length - 1;
    return m.reply(novaWrap("Arisan", [
      "🎉🎉 *UNDIAN ARISAN* 🎉🎉",
      "",
      `🎊 *SELAMAT!* ${win.name} dapet giliran ini!`,
      `💰 Diterima: *${rp(arisan.setoran * arisan.peserta.length)}* (${arisan.peserta.length} peserta × ${rp(arisan.setoran)})`,
      "",
      sisa > 0
        ? `🕒 Sisa ${sisa} orang belum dapat — undian berikutnya: ${prefix}arisan undi`
        : "🏆 Semua peserta udah dapat — arisan kelar! 🎉",
    ].join("\n")));
  }

  // ── riwayat ──
  if (sub === "riwayat") {
    if (!arisan.riwayat.length) return m.reply(novaWrap("Arisan", "Belum ada yang dapat giliran — ketik .arisan undi"));
    const lines = ["📜 *Riwayat Pemenang Arisan*", ""];
    arisan.riwayat.forEach((r, i) => {
      const d = new Date(r.ts).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
      lines.push(`${i + 1}. ${r.name} — ${rp(r.total)} (${d})`);
    });
    return m.reply(novaWrap("Arisan", lines.join("\n")));
  }

  // ── keluar ──
  if (sub === "keluar") {
    const idx = arisan.peserta.findIndex((p) => p.id === m.sender);
    if (idx === -1) return m.reply(novaWrap("Arisan", "Kamu gak terdaftar di arisan ini."));
    if (arisan.peserta[idx].dapat) return m.reply(novaWrap("Arisan", "Kamu udah pernah dapat giliran — gak bisa keluar (biar adil 😄)."));
    arisan.peserta.splice(idx, 1);
    saveAll(all);
    return m.reply(novaWrap("Arisan", `👋 ${m.pushName || "Kamu"} keluar dari arisan. Sisa ${arisan.peserta.length} peserta.`));
  }

  // ── stop ──
  if (sub === "stop" || sub === "selesai") {
    delete all[gid];
    saveAll(all);
    await m.react("🐣");
    return m.reply(novaWrap("Arisan", "🛑 Arisan di grup ini udah ditutup. Makasih, sampai jumpa arisan berikutnya!"));
  }

  await m.react("❌");
  return m.reply(novaWrap("Arisan", `Subcommand gak dikenal: "${sub}". Ketik ${prefix}arisan buat lihat menu.`));
}

export { pluginConfig as config, handler };
