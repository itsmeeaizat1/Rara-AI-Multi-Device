// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Plugin .addmsg/.getmsg/.delmsg/.listmsg — bank pesan tersimpan (port engine lama dbmsg.js)
// Simpan pesan (vn/video/sticker/img/teks) dengan nama, panggil kembali kapan pun.
import fs from "fs";
import path from "path";
import { proto } from "rara";
import { raraGuide, raraError, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "addmsg",
  alias: ["getmsg", "delmsg", "listmsg", "addvn", "getvn", "delvn", "listvn"],
  category: "tools",
  description: "Bank pesan: simpan pesan apapun dengan nama, panggil ulang kapan pun",
  usage: ".addmsg <nama> (reply pesan) | .getmsg <nama> | .delmsg <nama> | .listmsg",
  example: ".addmsg sapa (reply pesan audio)",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const FILE = path.join(process.cwd(), "data", "dbmsg.json");

function loadMsgs() {
  try { return JSON.parse(fs.readFileSync(FILE, "utf8") || "{}"); } catch { return {}; }
}
function saveMsgs(msgs) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(msgs, null, 2));
}

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🧠");
    const text = (m.text || "").replace(new RegExp("^" + prefix + "(add|get|del|list)(msg|vn|video|audio|img|sticker|gif)\\s*", "i"), "").trim();
    const cmd = ((m.text || "").match(new RegExp(prefix + "(add|get|del|list)(msg|vn|video|audio|img|sticker|gif)", "i")) || [])[1]?.toLowerCase() || "";
    const msgs = loadMsgs();

    if (cmd === "add") {
      if (!m.quoted) {
        await m.react("❌");
        await m.reply(raraError("Addmsg", "Reply pesan yang mau disimpen dulu"));
        return { handled: true };
      }
      if (!text) {
        await m.react("❌");
        await m.reply(raraError("Addmsg", "Kasih nama: " + prefix + "addmsg <nama>"));
        return { handled: true };
      }
      if (text in msgs) {
        await m.react("❌");
        await m.reply(raraError("Addmsg", "Nama '" + text + "' udah terdaftar — hapus dulu pakai " + prefix + "delmsg " + text));
        return { handled: true };
      }
      const obj = m.quoted.obj || m.quoted.raw || m.quoted;
      msgs[text] = proto.WebMessageInfo.fromObject(obj).toJSON();
      saveMsgs(msgs);
      await m.react("⚡");
      await m.reply(raraWrap("Addmsg", "Pesan '" + text + "' tersimpan. Panggil: " + prefix + "getmsg " + text));
      return { handled: true };
    }

    if (cmd === "del") {
      if (!(text in msgs)) {
        await m.react("❌");
        await m.reply(raraError("Delmsg", "Data '" + text + "' gak ada — lihat daftar: " + prefix + "listmsg"));
        return { handled: true };
      }
      delete msgs[text];
      saveMsgs(msgs);
      await m.react("⚡");
      await m.reply(raraWrap("Delmsg", "Pesan '" + text + "' dihapus"));
      return { handled: true };
    }

    if (cmd === "get") {
      if (!(text in msgs)) {
        await m.react("❌");
        await m.reply(raraError("Getmsg", "Pesan '" + text + "' gak ada di daftar"));
        return { handled: true };
      }
      const parsed = JSON.parse(JSON.stringify(msgs[text]), (_, v) => {
        if (v !== null && typeof v === "object" && v.type === "Buffer" && Array.isArray(v.data)) {
          return Buffer.from(v.data);
        }
        return v;
      });
      const _m = proto.WebMessageInfo.fromObject(parsed);
      await sock.relayMessage(m.chat, _m.message, { messageId: _m.key?.id || undefined });
      await m.react("⚡");
      return { handled: true };
    }

    // list
    const names = Object.keys(msgs);
    await m.react("⚡");
    await m.reply(raraWrap("Bank Pesan", names.length
      ? ["Total: *" + names.length + "*", "", ...names.slice(0, 50).map((n) => "- " + n), names.length > 50 ? "... dan " + (names.length - 50) + " lagi" : ""].filter(Boolean).join("\n")
      : "Masih kosong — simpen dengan " + prefix + "addmsg <nama> (reply pesan)"));
  } catch (error) {
    console.error("[dbmsg]:", error.message);
    await m.react("❌");
    await m.reply(raraError("DBmsg", "Gagal: " + String(error.message).slice(0, 120)));
  }
  return { handled: true };
}

export { pluginConfig as config, handler }
