// weather.js — Cek cuaca realtime + pilih provider (rename file owner 15 Sep 2026, wasal .cuaca)
// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { novaError, novaEmpty, novaGuide, novaNoInput, 
  bracketBox,
  novaHeader,
  separator,
  tipText,
  novaWrap,
  novaLine, novaCaption } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "weather",
  alias: ["weather"], // rename owner 15 Sep 2026: .weather → .weather, alias lama dihapus
  category: "tools",
  description: "Cek cuaca realtime dan pilih provider API cuaca",
  usage: ".weather <provider|set|lokasi|on|off|now|help>",
  example: ".weather provider open-meteo\n.weather lokasi Bandung",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const PROVIDERS = {
  "open-meteo": {
    label: "Open-Meteo",
    emoji: "🌤️",
    needsKey: false,
    note: "Gratis, tanpa API key",
  },
  accuweather: {
    label: "AccuWeather",
    emoji: "🌡️",
    needsKey: true,
    note: "Butuh API key + location key",
  },
};

function getWeatherDb(db) {
  return db?.setting?.("weatherFooter") || {};
}

function setWeatherDb(db, data = {}) {
  if (!db?.setting) return getWeatherDb(db);
  db.setting("weatherFooter", { ...getWeatherDb(db), ...data });
  return getWeatherDb(db);
}

async function handler(m, { sock, config: botConfig, db }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const raw = (m.text?.trim() ?? "").toLowerCase();
    const parts = raw.replace(/^\.weather\s+/i, "").trim().split(/\s+/);
    const sub = (parts[0] || "").toLowerCase();

    if (!raw || !sub || sub === "help" || sub === "menu") {
      const providerKeys = Object.keys(PROVIDERS);
      const current = getWeatherDb(db);
      const currentProvider = current.provider || "open-meteo";
      const currentLocation = current.location || {};
      const enabled = current.enabled ?? false;
      const providerList = providerKeys
        .map(
          (key) =>
            `${PROVIDERS[key].emoji} ${PROVIDERS[key].label}${key === currentProvider ? " (aktif)" : ""}`
        )
        .join("\n");

      const text =
        novaWrap("Cuaca Bot", [`Toggle: *${prefix}weather on|off*`,
          `Provider: *${prefix}weather provider <nama>*`,
          `Lokasi: *${prefix}weather lokasi <kota>*`,
          `Cek: *${prefix}weather now*`,
          `Bantuan: *${prefix}weather help*`].join("\n")) +
        "\n" +
        novaWrap("sTATUs", [`Footer otomatis: *${enabled ? "ON" : "OFF"}*`, `Provider: *${currentProvider}*`].join("\n")) +
        "\n\n" +
        
        novaWrap("PROVIDER", providerList) +
        "\n\n" +
        
        novaWrap("LOKAsI", [`Nama: *${currentLocation.name || "Jakarta"}*`, `Lat: *${currentLocation.latitude ?? -6.2088}*`, `Lon: *${currentLocation.longitude ?? 106.8456}*`].join("\n")) +
        "\n\n" +
        
        novaWrap("KONFIG", [`Provider aktif: *${currentProvider}*`, `API key: *${current.apiKey ? "terpasang" : "belum diatur"}*`, `Location key: *${current.locationKey || "belum diatur"}*`].join("\n")) +
        "\n\n" +
        
        tipText("Ganti provider lewat .weather provider <nama>") +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply( text, "weather");
      return { handled: true };
    }

    if (sub === "on" || sub === "off") {
      const enabled = sub === "on";
      setWeatherDb(db, { enabled });
      await m.reply(
        novaWrap("Cuaca Bot", "🌤️") +
          "\n\n" +
          novaWrap(enabled ? "DIAKTIFKAN" : "DINAsKAN", [
            `Footer cuaca: *${enabled ? "ON" : "OFF"}*`,
            enabled ? "Sekarang setiap pesan bot akan menambahkan footer cuaca" : "Footer cuaca tidak akan ditambahkan lagi",
          ]) +
          "\n\n" +
          
          tipText(`Ganti lagi kapan saja dengan ${prefix}weather on|off`) +
          "\n" +
          tipText(`Ketik ${prefix}weather help untuk melihat bantuan`)
      );
      return { handled: true };
    }

    if (sub === "provider") {
      const target = (parts[1] || "").toLowerCase();
      if (!target || !PROVIDERS[target]) {
        const available = Object.keys(PROVIDERS)
          .map((k) => `${PROVIDERS[k].emoji} ${k}`)
          .join(", ");
        await m.reply(
          novaWrap("Provider Cuaca", [`Provider *${target || "kosong"}* tidak dikenali`,
              `Pilihan: *${available}*`].join("\n")) +
            "\n" +
            tipText(`Contoh: ${prefix}weather provider open-meteo`) +
            "\n" +
            tipText(`Ketik ${prefix}weather help untuk melihat bantuan`)
        );
        return { handled: true };
      }

      const updated = setWeatherDb(db, { provider: target });
      const info = PROVIDERS[target];
      await m.reply(
        novaWrap("Provider Cuaca", [`Provider: *${info.label}*`,
            `Kebutuhan key: *${info.needsKey ? "perlu" : "tidak perlu"}*`,
            `Catatan: *${info.note}*`].join("\n")) +
          "\n" +
          tipText("Jika perlu API key, isi melalui .weather api atau edit config") +
          "\n" +
          tipText(`Ketik ${prefix}weather help untuk melihat bantuan`)
      );
      return { handled: true };
    }

    if (sub === "lokasi") {
      const lokasi = parts.slice(1).join(" ");
      if (!lokasi) {
        await m.reply(novaCaption({
  emoji: "🌤️",
  name: "weather",
  description: "Cek cuaca realtime dan pilih provider API cuaca",
  usage: `${prefix}weather <provider|set|lokasi|on|off|now|help>`,
  example: `${prefix}weather provider open-meteo\\n.weather lokasi Bandung`,
}));
        return { handled: true };
      }

      setWeatherDb(db, { location: { name: lokasi } });
      await m.reply(
        novaWrap("Lokasi Cuaca", [`Lokasi disetel ke: *${lokasi}*`].join("\n")) +
          "\n" +
          tipText(`Ketik ${prefix}weather now untuk cek cuaca sekarang`) +
          "\n" +
          tipText(`Ketik ${prefix}menu untuk kembali`)
      );
      return { handled: true };
    }

    if (sub === "now") {
      const { getWeatherFooter } = await import("../../src/lib/nova-weather-footer.js");
      const footer = await getWeatherFooter(true);
      if (!footer) {
        await m.reply(
          novaWrap("Cuaca", ["Gagal mengambil data cuaca",
              "Cek provider/lokasi/api key"].join("\n")) +
            "\n" +
            tipText(`Ketik ${prefix}weather help untuk konfigurasi`)
        );
        return { handled: true };
      }

      await m.reply(`${footer.trim()}\n\n${botConfig?.bot?.name || `Nova AI WhatsApp Bot`}`);
      return { handled: true };
    }

    await m.react("🐣");
    await m.reply(
      novaWrap("Cuaca Bot", [`Provider: *${prefix}weather provider <nama>*`,
          `Lokasi: *${prefix}weather lokasi <kota>*`,
          `Cek: *${prefix}weather now*`,
          `Bantuan: *${prefix}weather help*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`)
    );
  } catch (error) {
    await m.react("❌");
    await m.reply(
      novaError("Tools", "Gagal nih, coba lagi ya")
    );
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
