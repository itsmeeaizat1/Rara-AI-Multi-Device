// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// webwatch.js — Web Watcher: pantau URL, notif otomatis pas isinya berubah
// Fitur baru 9 Sep 2026 (request owner "fitur yg blm prnh ada di bot")
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import {
  addWatch, removeWatch, listWatches, getStatus, checkNow, setSock,
  MIN_INTERVAL, MAX_INTERVAL,
} from "../../src/lib/nova-webwatch.js";

const pluginConfig = {
  name: "webwatch",
  alias: ["webwatch", "webmonitor", "sitewatch", "urlwatch", "watchurl"],
  category: "tools",
  description: "Pantau URL 24 jam — bot notif otomatis pas isinya berubah",
  usage: ".webwatch <url> [interval menit]\n.webwatch list\n.webwatch stop <no|url>\n.webwatch now\n.webwatch info",
  example: ".webwatch https://example.com 30",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

function helpText(m) {
  return claraWrap("webwatch", [
    "🌐 *ᴡᴇʙ ᴡᴀᴛᴄʜᴇʀ*",
    "",
    "ᴘᴀɴᴛᴀᴜ ᴜʀʟ 24 ᴊᴀᴍ — ɴᴏᴛɪꜰ ᴏᴛᴏᴍᴀᴛɪꜱ ᴘᴀꜱ ɪꜱɪɴʏᴀ ʙᴇʀᴜʙᴀʜ",
    "",
    `▸ ${m.prefix}webwatch <url> [menit]`,
    "   mulai pantau (default 15 menit)",
    `▸ ${m.prefix}webwatch list`,
    "   daftar url yang dipantau di chat ini",
    `▸ ${m.prefix}webwatch stop <no|url>`,
    "   berhenti pantau",
    `▸ ${m.prefix}webwatch now`,
    "   cek semua sekarang",
    `▸ ${m.prefix}webwatch info`,
    "   status monitor",
    "",
    `⏱️ ᴍɪɴɪᴍᴀʟ ${MIN_INTERVAL} ᴍᴇɴɪᴛ, ᴍᴀᴋꜱ ${MAX_INTERVAL} ᴍᴇɴɪᴛ`,
    "ᴍᴀᴋꜱ 5 ᴜʀʟ ᴘᴇʀ ᴄʜᴀᴛ",
    "",
    "*ᴄᴏɴᴛᴏʜ:*",
    `${m.prefix}webwatch https://example.com 30`,
  ]);
}

async function handler(m, { sock }) {
  try {
    setSock(sock);
    const sub = (m.args[0] || "").toLowerCase();

    if (["list", "daftar"].includes(sub)) {
      const list = listWatches(m.chat);
      if (!list.length) {
        return m.reply(claraWrap("webwatch", "Belum ada URL yang dipantau di chat ini.\n\n" + `Ketik ${m.prefix}webwatch <url> buat mulai.`, "guide"));
      }
      const lines = ["🌐 *ᴜʀʟ ᴅɪᴘᴀɴᴛᴀᴜ ᴅɪ ᴄʜᴀᴛ ɪɴɪ*", ""];
      list.forEach((w, i) => {
        const last = w.lastChanged
          ? "berubah " + new Date(w.lastChanged).toLocaleString("id-ID")
          : "belum pernah berubah";
        lines.push(`${i + 1}. *${w.title}*`);
        lines.push(`   🔗 ${w.url}`);
        lines.push(`   ⏱️ ${w.intervalMenit} mnt | ${last}`);
        lines.push("");
      });
      lines.push(`▸ Stop: ${m.prefix}webwatch stop <no>`);
      return m.reply(claraWrap("webwatch", lines.join("\n")));
    }

    if (["stop", "del", "hapus", "off"].includes(sub)) {
      const key = m.args.slice(1).join(" ").trim();
      if (!key) {
        await m.react("❌");
        return m.reply(claraWrap("webwatch", `Mau stop yang mana?\n\nKetik ${m.prefix}webwatch list buat lihat nomornya.`, "error"));
      }
      const res = removeWatch(m.chat, key);
      if (!res.ok) {
        await m.react("❌");
        return m.reply(claraWrap("webwatch", `URL/nomor itu gak ketemu di daftar pantau chat ini. Cek ${m.prefix}webwatch list.`, "error"));
      }
      await m.react("🐣");
      return m.reply(claraWrap("webwatch", `✅ Stop pantau:\n${res.watch.url}`));
    }

    if (["now", "cek"].includes(sub)) {
      const list = listWatches(m.chat);
      if (!list.length) {
        await m.react("❌");
        return m.reply(claraWrap("webwatch", "Belum ada URL yang dipantau di chat ini.", "error"));
      }
      await m.react("🕒");
      const res = await checkNow(m.chat);
      await m.react("🐣");
      if (res.changed === 0) {
        return m.reply(claraWrap("webwatch", `✅ ${res.checked} URL dicek — semuanya masih sama, belum ada perubahan.`));
      }
      return;
    }

    if (["info", "status"].includes(sub)) {
      const st = getStatus();
      const mine = listWatches(m.chat);
      return m.reply(claraWrap("webwatch", [
        "🌐 *ꜱᴛᴀᴛᴜꜱ ᴡᴇʙ ᴡᴀᴛᴄʜᴇʀ*",
        "",
        `ᴀᴋᴛɪꜰ: ${st.enabled ? "ʏᴀ" : "ᴛɪᴅᴀᴋ"} (ꜱᴡɪᴛᴄʜ ᴀᴜᴛᴏ)`,
        `ᴍᴏɴɪᴛᴏʀ: ${st.running ? "🟢 ʙᴇʀᴊᴀʟᴀɴ" : "🔴 ᴍᴀᴛɪ"}`,
        `ᴛᴏᴛᴀʟ ᴜʀʟ ꜱᴇᴍᴜᴀ ᴄʜᴀᴛ: ${st.total}`,
        `ᴜʀʟ ᴅɪ ᴄʜᴀᴛ ɪɴɪ: ${mine.length}`,
      ].join("\n")));
    }

    // default: mulai pantau URL
    if (!m.args.length) return m.reply(helpText(m));

    const url = m.args[0];
    const interval = m.args[1] ? Number(m.args[1]) : undefined;
    if (m.args[1] && (!Number.isFinite(interval) || interval < MIN_INTERVAL || interval > MAX_INTERVAL)) {
      await m.react("❌");
      return m.reply(claraWrap("webwatch", `❌ Interval harus angka ${MIN_INTERVAL}-${MAX_INTERVAL} menit.\n\nContoh: ${m.prefix}webwatch https://example.com 30`, "error"));
    }

    await m.react("🕒");
    const res = await addWatch(m.chat, url, interval);
    if (!res.ok) {
      await m.react("❌");
      const msgs = {
        url_invalid: "URL-nya gak valid. Harus mulai http:// atau https://",
        limit: "Maksimal 5 URL per chat. Stop salah satu dulu.",
        duplicate: `URL itu udah dipantau di chat ini:\n${res.watch?.url}\n\nCek ${m.prefix}webwatch list`,
        unreachable: "Situsnya gak bisa dijangkau sekarang. Coba lagi nanti.",
      };
      return m.reply(claraWrap("webwatch", msgs[res.error] || "Gagal nambah pantauan.", "error"));
    }
    await m.react("🐣");
    return m.reply(claraWrap("webwatch", [
      "✅ *ᴍᴜʟᴀɪ ᴅɪᴘᴀɴᴛᴀᴜ!*",
      "",
      `📰 *${res.watch.title}*`,
      `🔗 ${res.watch.url}`,
      "",
      `⏱️ ᴅɪᴄᴇᴋ ᴛɪᴀᴘ ${res.watch.intervalMenit} ᴍᴇɴɪᴛ`,
      `📊 ꜱɴᴀᴘꜱʜᴏᴛ ᴀᴡᴀʟ: ${res.watch.lastSize.toLocaleString("id-ID")} ᴄʜᴀʀ`,
      "",
      "ɴᴏᴛɪꜰ ᴏᴛᴏᴍᴀᴛɪꜱ ᴍᴀꜱᴜᴋ ᴋᴇ ᴄʜᴀᴛ ɪɴɪ ᴘᴀꜱ ɪꜱɪɴʏᴀ ʙᴇʀᴜʙᴀʜ 🔔",
    ].join("\n")));
  } catch (e) {
    await m.react("❌");
    m.reply(claraWrap("webwatch", "Gagal: " + (e?.message || e), "error"));
  }
}

export { pluginConfig as config, handler };
