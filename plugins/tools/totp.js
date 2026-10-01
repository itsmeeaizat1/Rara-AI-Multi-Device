// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// totp.js — 2FA TOTP Authenticator: kode login 6-digit real-time
// Fitur baru 9 Sep 2026 (request owner "fitur yg blm prnh ada di bot")
// PRIVATE ONLY — kode 2FA gak boleh keliatan di grup.
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import {
  addAccount, listAccounts, findAccount, removeAccount, generateCode,
} from "../../src/lib/nova-totp.js";

const pluginConfig = {
  name: "totp",
  alias: ["totp", "otp", "2fa", "authenticator"],
  category: "tools",
  description: "2FA Authenticator — kode login 6-digit real-time (private only)",
  usage: ".totp <label>\n.totp add <label> <secret>\n.totp list\n.totp del <no|label>",
  example: ".totp gmail",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

function progressBar(remaining, period) {
  const total = period || 30;
  const filled = Math.round((1 - remaining / total) * 8);
  return "▰".repeat(filled) + "▱".repeat(8 - filled);
}

async function handler(m, { sock }) {
  try {
    // guard: kode 2FA sensitif — jangan tampil di grup
    if (m.isGroup) {
      await m.react("🔒");
      return m.reply(claraWrap("totp", "🔒 Kode 2FA sensitif — pakai di *private chat* saja.\n\nChat pribadi bot, ketik lagi command-nya di sana.", "error"));
    }

    const sub = (m.args[0] || "").toLowerCase();
    const uid = m.sender;

    // .totp add <label> <secret>
    if (["add", "tambah", "simpan"].includes(sub)) {
      const label = m.args[1];
      const secret = m.args.slice(2).join("").replace(/\s/g, "");
      if (!label || !secret) {
        await m.react("❌");
        return m.reply(claraWrap("totp", [
          "Cara simpen akun 2FA:",
          "",
          `${m.prefix}totp add <label> <secret>`,
          "",
          "*contoh:*",
          `${m.prefix}totp add gmail JBSWY3DPEHPK3PXP`,
          `${m.prefix}totp add facebook otpauth://totp/facebook:user?secret=...`,
          "",
          "Secret-nya dari app 2FA lu (Google Authenticator: 'Export' / QR).",
        ].join("\n"), "error"));
      }
      await m.react("🕒");
      const res = addAccount(uid, label, secret);
      if (!res.ok) {
        await m.react("❌");
        const msgs = {
          secret_invalid: "Secret-nya gak valid. Harus base32 (huruf A-Z & angka 2-7) atau link otpauth:// lengkap.",
          uri_invalid: "Link otpauth://-nya rusak / gak lengkap.",
          label_required: "Label-nya wajib ada (nama akun, misal: gmail).",
          label_invalid: "Label cuma boleh huruf/angka/spasi/titik/garis minus, 2-30 karakter.",
          limit: "Maksimal 10 akun per user. Hapus salah satu dulu.",
          duplicate: "Label itu udah ada — hapus dulu atau pakai label lain.",
        };
        return m.reply(claraWrap("totp", msgs[res.error] || "Gagal simpen akun 2FA.", "error"));
      }
      await m.react("🐣");
      return m.reply(claraWrap("totp", [
        "✅ *akun 2fa tersimpen!*",
        "",
        `🏷️ ${res.account.label}`,
        `🔢 Kode sekarang: *${res.code}*`,
        "",
        `▸ Lihat kode kapan aja: ${m.prefix}totp ${res.account.label}`,
      ].join("\n")));
    }

    // .totp list
    if (["list", "daftar"].includes(sub)) {
      const list = listAccounts(uid);
      if (!list.length) {
        return m.reply(claraWrap("totp", `Belum ada akun 2FA tersimpan.\n\nKetik ${m.prefix}totp add <label> <secret> buat mulai.`, "guide"));
      }
      const lines = ["🔐 *akun 2fa tersimpen*", ""];
      list.forEach((a, i) => {
        lines.push(`${i + 1}. 🏷️ *${a.label}*`);
        lines.push(`   🔢 ${a.digits} digit | ⏱️ ${a.period}s | 📅 ${new Date(a.createdDate).toLocaleDateString("id-ID")}`);
      });
      lines.push("");
      lines.push(`▸ Kode: ${m.prefix}totp <label> | Hapus: ${m.prefix}totp del <no>`);
      return m.reply(claraWrap("totp", lines.join("\n")));
    }

    // .totp del <no|label>
    if (["del", "hapus", "remove", "delete"].includes(sub)) {
      const key = m.args.slice(1).join(" ").trim();
      if (!key) {
        await m.react("❌");
        return m.reply(claraWrap("totp", `Mau hapus yang mana?\n\nKetik ${m.prefix}totp list buat lihat nomornya.`, "error"));
      }
      const res = removeAccount(uid, key);
      if (!res.ok) {
        await m.react("❌");
        return m.reply(claraWrap("totp", `Akun itu gak ketemu. Cek ${m.prefix}totp list.`, "error"));
      }
      await m.react("🐣");
      return m.reply(claraWrap("totp", `✅ Akun *${res.account.label}* dihapus dari bot.`));
    }

    // no-arg = help
    if (!m.args.length) {
      const list = listAccounts(uid);
      const help = [
        "🔐 *totp 2fa authenticator*",
        "",
        "kode login 6-digit real-time ala google authenticator",
        "",
        `▸ ${m.prefix}totp <label>`,
        "   lihat kode sekarang",
        `▸ ${m.prefix}totp add <label> <secret>`,
        "   simpen akun 2FA",
        `▸ ${m.prefix}totp list`,
        "   daftar akun tersimpan",
        `▸ ${m.prefix}totp del <no|label>`,
        "   hapus akun",
        "",
        "🔒 private only — kode 2fa sensitif",
      ];
      if (list.length) {
        help.push("", "*akun lu:*");
        list.slice(0, 5).forEach((a, i) => help.push(`${m.prefix}totp ${a.label}`));
      }
      return m.reply(claraWrap("totp", help.join("\n")));
    }

    // default: .totp <label> — generate kode
    await m.react("🕒");
    const label = m.args.join(" ").trim();
    const account = findAccount(uid, label);
    if (!account) {
      await m.react("❌");
      return m.reply(claraWrap("totp", `Akun *${label}* gak ada.\n\nCek ${m.prefix}totp list, atau simpen dulu pakai ${m.prefix}totp add.`, "error"));
    }
    const g = generateCode(account);
    if (!g.ok) {
      await m.react("❌");
      return m.reply(claraWrap("totp", "Secret-nya rusak — hapus & simpen ulang akun ini.", "error"));
    }
    await m.react("🐣");
    return m.reply(claraWrap("totp", [
      `🔐 *${account.label}*`,
      "",
      `nikmat kode yg aktif nya...`,
      "",
      `*${g.code}*`,
      "",
      `${progressBar(g.secondsRemaining, account.period)} ${g.secondsRemaining}dtk`,
      "",
      "⚠️ kode berganti tiap " + (account.period || 30) + " detik",
    ].join("\n")));
  } catch (e) {
    await m.react("❌");
    m.reply(claraWrap("totp", "Gagal: " + (e?.message || e), "error"));
  }
}

export { pluginConfig as config, handler };
