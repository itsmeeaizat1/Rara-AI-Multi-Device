// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// cryptoalert.js — Crypto Price Alert: pasang target harga, bot notif pas kena
// Fitur baru 9 Sep 2026 (request owner "fitur yg blm prnh ada di bot")
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import {
  addAlert, removeAlert, listAlerts, getStatus, checkNow, setSock, formatRp,
} from "../../src/lib/nova-cryptoalert.js";

const pluginConfig = {
  name: "cryptoalert",
  alias: ["cryptoalert", "alarmcrypto", "alertcrypto", "pricealert", "hargacrypto"],
  category: "tools",
  description: "Alarm harga crypto — notif otomatis pas target kena (IDR)",
  usage: ".cryptoalert <coin> <diatas|dibawah> <harga>\n.cryptoalert list\n.cryptoalert stop <no>\n.cryptoalert now\n.cryptoalert info",
  example: ".cryptoalert btc diatas 150jt",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

function helpText(m) {
  return claraWrap("cryptoalert", [
    "🎯 *crypto alarm*",
    "",
    "pasang target harga crypto — notif otomatis pas kena",
    "",
    `▸ ${m.prefix}cryptoalert <coin> <diatas|dibawah> <harga>`,
    "   pasang alarm (harga rupiah)",
    `▸ ${m.prefix}cryptoalert list`,
    "   daftar alarm di chat ini",
    `▸ ${m.prefix}cryptoalert stop <no>`,
    "   hapus alarm",
    `▸ ${m.prefix}cryptoalert now`,
    "   cek semua sekarang",
    `▸ ${m.prefix}cryptoalert info`,
    "   status monitor",
    "",
    "*contoh:*",
    `${m.prefix}cryptoalert btc diatas 150jt`,
    `${m.prefix}cryptoalert eth dibawah 40.000.000`,
    "",
    "🪙 coin: btc eth sol bnb doge dst shib pepe dll",
    "✅ alarm satu kali pakai — otomatis terhapus pas kena",
    "maks 5 alarm per chat",
  ]);
}

async function handler(m, { sock }) {
  try {
    setSock(sock);
    const sub = (m.args[0] || "").toLowerCase();

    if (["list", "daftar"].includes(sub)) {
      const list = listAlerts(m.chat);
      if (!list.length) {
        return m.reply(claraWrap("cryptoalert", `Belum ada alarm harga di chat ini.\n\nKetik ${m.prefix}cryptoalert btc diatas 150jt buat mulai.`, "guide"));
      }
      const lines = ["🎯 *alarm harga di chat ini*", ""];
      list.forEach((a, i) => {
        lines.push(`${i + 1}. 🪙 *${a.coinName}* (${a.symbol})`);
        lines.push(`   🎯 ${a.direction === "above" ? "di atas" : "di bawah"} ${formatRp(a.target)}`);
        lines.push(`   💵 Terakhir: ${formatRp(a.lastPrice)}`);
        lines.push("");
      });
      lines.push(`▸ Hapus: ${m.prefix}cryptoalert stop <no>`);
      return m.reply(claraWrap("cryptoalert", lines.join("\n")));
    }

    if (["stop", "del", "hapus", "off"].includes(sub)) {
      const key = m.args.slice(1).join(" ").trim();
      if (!key) {
        await m.react("❌");
        return m.reply(claraWrap("cryptoalert", `Mau hapus alarm yang mana?\n\nKetik ${m.prefix}cryptoalert list buat lihat nomornya.`, "error"));
      }
      const res = removeAlert(m.chat, key);
      if (!res.ok) {
        await m.react("❌");
        return m.reply(claraWrap("cryptoalert", `Alarm itu gak ketemu di chat ini. Cek ${m.prefix}cryptoalert list.`, "error"));
      }
      await m.react("🐣");
      return m.reply(claraWrap("cryptoalert", `✅ Alarm *${res.alert.symbol}* dihapus.`));
    }

    if (["now", "cek"].includes(sub)) {
      const list = listAlerts(m.chat);
      if (!list.length) {
        await m.react("❌");
        return m.reply(claraWrap("cryptoalert", "Belum ada alarm di chat ini.", "error"));
      }
      await m.react("🕒");
      const res = await checkNow(m.chat);
      await m.react("🐣");
      if (res.fired === 0) {
        return m.reply(claraWrap("cryptoalert", `✅ ${res.checked} alarm dicek — belum ada yang kena. Harga terbaru udah keupdate.`));
      }
      return;
    }

    if (["info", "status"].includes(sub)) {
      const st = getStatus();
      const mine = listAlerts(m.chat);
      return m.reply(claraWrap("cryptoalert", [
        "🎯 *status crypto alarm*",
        "",
        `aktif: ${st.enabled ? "ya" : "tidak"} (switch auto)`,
        `monitor: ${st.running ? "🟢 berjalan" : "🔴 mati"}`,
        `total alarm semua chat: ${st.total}`,
        `alarm di chat ini: ${mine.length}`,
      ].join("\n")));
    }

    // default: pasang alarm <coin> <direction> <target>
    if (m.args.length < 3) return m.reply(helpText(m));

    await m.react("🕒");
    const res = await addAlert(m.chat, m.args[0], m.args[1], m.args[2]);
    if (!res.ok) {
      await m.react("❌");
      const msgs = {
        direction_invalid: `Direction-nya harus *diatas* atau *dibawah*.\n\nContoh: ${m.prefix}cryptoalert btc diatas 150jt`,
        target_invalid: "Harga targetnya gak valid. Contoh: 150jt / 150000000 / 40.500.000",
        limit: "Maksimal 5 alarm per chat. Hapus salah satu dulu.",
        coin_not_found: "Coin-nya gak ketemu. Coba tickernya (btc, eth, sol...)",
        // v24.2.4 — dibedakan dari coin_not_found biar pesannya gak menyesatkan
        api_error: "CoinGecko lagi gak bisa diakses (rate-limit / down). Coba lagi bentar ya 🙏",
      };
      return m.reply(claraWrap("cryptoalert", msgs[res.error] || "Gagal pasang alarm.", "error"));
    }
    const a = res.alert;
    await m.react("🐣");
    return m.reply(claraWrap("cryptoalert", [
      "✅ *alarm dipasang!*",
      "",
      `🪙 *${a.coinName}* (${a.symbol})`,
      `🎯 ${a.direction === "above" ? "di atas" : "di bawah"} ${formatRp(a.target)}`,
      `💵 Harga sekarang: ${formatRp(a.startPrice)}`,
      "",
      "🔔 notif otomatis masuk ke chat ini pas target kena",
    ].join("\n")));
  } catch (e) {
    await m.react("❌");
    m.reply(claraWrap("cryptoalert", "Gagal: " + (e?.message || e), "error"));
  }
}

export { pluginConfig as config, handler };
