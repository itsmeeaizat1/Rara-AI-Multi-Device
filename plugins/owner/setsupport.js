// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// setsupport.js — Owner: set link Join Grup Resmi & Saluran Resmi
import { raraWrap, tipText } from "../../src/lib/rara-menu-style.js";
import { getSupport, setSupport, resetSupport } from "../../src/lib/support/support.js";

const pluginConfig = {
  name: "setsupport",
  alias: ["setsupport"],
  category: "owner",
  description: "Owner: set link grup resmi & saluran resmi bot",
  usage: ".setsupport group|groupname|saluran|saluranname|id <nilai>",
  example: ".setsupport group https://chat.whatsapp.com/AbCdEf",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    const raw = m.text?.trim() || "";
    // buang prefix + command + alias
    let args = raw
      .replace(new RegExp(`^\\${prefix}setsupport\\s*`, "i"), "")
      .trim();

    const [key, ...rest] = args.split(/\s+/);
    const value = rest.join(" ").trim();

    // Tanpa argumen → tampil setelan sekarang + usage
    if (!key) {
      const s = getSupport();
      return m.reply(raraWrap("Set Support", [
        "Setelan grup & saluran resmi bot saat ini:",
        "",
        `• Group: ${s.group.name}`,
        `  Link: ${s.group.link || "(belum di-set)"}`,
        "",
        `• Saluran: ${s.saluran.name}`,
        `  Link: ${s.saluran.link || "(belum di-set)"}`,
        `  ID: ${s.saluran.id}`,
        "",
        "📌 *Cara Pakai:*",
        `${prefix}setsupport group <link grup>`,
        `${prefix}setsupport groupname <nama grup>`,
        `${prefix}setsupport saluran <link saluran>`,
        `${prefix}setsupport saluranname <nama saluran>`,
        `${prefix}setsupport id <id newsletter>`,
        `${prefix}setsupport reset`,
        "",
        "💡 *Contoh:*",
        `${prefix}setsupport group https://chat.whatsapp.com/AbCdEf`,
      ]));
    }

    const k = key.toLowerCase();

    if (k === "reset") {
      const s = resetSupport();
      return m.reply(raraWrap("Set Support", [
        "Status: *berhasil*",
        "Semua setelan support direset ke default config",
      ]));
    }

    if (!value) {
      return m.reply(raraWrap("Set Support", [
        `Nilai untuk *${key}* kosong`,
        "",
        `📌 Ketik: ${prefix}setsupport ${key} <nilai>`,
      ]));
    }

    // Validasi link
    if (k === "group" && !/^https:\/\/chat\.whatsapp\.com\/[\w.-]+$/i.test(value)) {
      return m.reply(raraWrap("Set Support", [
        "Status: *gagal*",
        "Link grup harus diawali https://chat.whatsapp.com/",
        "",
        `📌 Ketik: ${prefix}setsupport group https://chat.whatsapp.com/AbCdEf`,
      ]));
    }
    if (k === "saluran" && !/^https:\/\/whatsapp\.com\/channel\/[\w.-]+$/i.test(value)) {
      return m.reply(raraWrap("Set Support", [
        "Status: *gagal*",
        "Link saluran harus diawali https://whatsapp.com/channel/",
        "",
        `📌 Ketik: ${prefix}setsupport saluran https://whatsapp.com/channel/AbCdEf`,
      ]));
    }

    const map = {
      group: { field: "groupLink", label: "Link grup resmi" },
      groupname: { field: "groupName", label: "Nama grup resmi" },
      saluran: { field: "saluranLink", label: "Link saluran resmi" },
      saluranname: { field: "saluranName", label: "Nama saluran resmi" },
      id: { field: "saluranId", label: "ID newsletter saluran" },
    };

    const target = map[k];
    if (!target) {
      return m.reply(raraWrap("Set Support", [
        `Key *${key}* tidak dikenal`,
        "",
        "📌 *Key yang tersedia:* group, groupname, saluran, saluranname, id, reset",
      ]));
    }

    setSupport({ [target.field]: value });
    return m.reply(raraWrap("Set Support", [
      `Status: *berhasil*`,
      `${target.label}: *${value}*`,
    ]));
  } catch (error) {
    console.error("[setsupport] error:", error.message);
    return m.reply(raraWrap("Set Support", [
      "Status: *gagal*",
      "Alasan: *" + error.message + "*",
    ]));
  }
}

export { pluginConfig as config, handler };
