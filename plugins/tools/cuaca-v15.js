import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import {
  claraHeader,
    separator,
  tipText,
  claraWrap,
  claraLine,
} from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "cuaca",
  alias: ["cuaca", "cuacav15", "weather15"],
  category: "tools",
  description: "Cek cuaca realtime dan pilih provider API cuaca",
  usage: ".cuaca <provider|set|lokasi|on|off|now|help>",
  example: ".cuaca provider open-meteo\n.cuaca lokasi Bandung",
  isOwner: true,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
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
  try {
    const prefix = botConfig.command?.prefix || ".";
    const raw = (m.text?.trim() ?? "").toLowerCase();
    const parts = raw.replace(/^\.cuaca\s+/i, "").trim().split(/\s+/);
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
        claraWrap("Cuaca Bot", [`◦ Toggle: *${prefix}cuaca on|off*`,
          `◦ Provider: *${prefix}cuaca provider <nama>*`,
          `◦ Lokasi: *${prefix}cuaca lokasi <kota>*`,
          `◦ Cek: *${prefix}cuaca now*`,
          `◦ Bantuan: *${prefix}cuaca help*`].join("\n")) +
        "\n" +
        claraWrap("sTATUs", [`◦ Footer otomatis: *${enabled ? "ON" : "OFF"}*`, `◦ Provider: *${currentProvider}*`].join("\n")) +
        "\n\n" +
        separator("━", 22) +
        "\n" +
        claraWrap("PROVIDER", providerList) +
        "\n\n" +
        separator("━", 22) +
        "\n" +
        claraWrap("LOKAsI", [`◦ Nama: *${currentLocation.name || "Jakarta"}*`, `◦ Lat: *${currentLocation.latitude ?? -6.2088}*`, `◦ Lon: *${currentLocation.longitude ?? 106.8456}*`].join("\n")) +
        "\n\n" +
        separator("━", 22) +
        "\n" +
        claraWrap("KONFIG", [`◦ Provider aktif: *${currentProvider}*`, `◦ API key: *${current.apiKey ? "terpasang" : "belum diatur"}*`, `◦ Location key: *${current.locationKey || "belum diatur"}*`].join("\n")) +
        "\n\n" +
        separator("━", 22) +
        "\n" +
        tipText("Ganti provider lewat .cuaca provider <nama>") +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "cuaca");
      return { handled: true };
    }

    if (sub === "on" || sub === "off") {
      const enabled = sub === "on";
      setWeatherDb(db, { enabled });
      await m.reply(
        claraWrap("Cuaca Bot", "🌤️") +
          "\n\n" +
          claraWrap(enabled ? "DIAKTIFKAN" : "DINAsKAN", [
            `◦ Footer cuaca: *${enabled ? "ON" : "OFF"}*`,
            enabled ? "◦ Sekarang setiap pesan bot akan menambahkan footer cuaca" : "◦ Footer cuaca tidak akan ditambahkan lagi",
          ]) +
          "\n\n" +
          separator("━", 22) +
          "\n" +
          tipText(`Ganti lagi kapan saja dengan ${prefix}cuaca on|off`) +
          "\n" +
          tipText(`Ketik ${prefix}cuaca help untuk melihat bantuan`)
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
          claraWrap("Provider Cuaca", [`◦ Provider *${target || "kosong"}* tidak dikenali`,
              `◦ Pilihan: *${available}*`].join("\n")) +
            "\n" +
            tipText(`Contoh: ${prefix}cuaca provider open-meteo`) +
            "\n" +
            tipText(`Ketik ${prefix}cuaca help untuk melihat bantuan`)
        );
        return { handled: true };
      }

      const updated = setWeatherDb(db, { provider: target });
      const info = PROVIDERS[target];
      await m.reply(
        claraWrap("Provider Cuaca", [`◦ Provider: *${info.label}*`,
            `◦ Kebutuhan key: *${info.needsKey ? "perlu" : "tidak perlu"}*`,
            `◦ Catatan: *${info.note}*`].join("\n")) +
          "\n" +
          tipText("Jika perlu API key, isi melalui .cuaca api atau edit config") +
          "\n" +
          tipText(`Ketik ${prefix}cuaca help untuk melihat bantuan`)
      );
      return { handled: true };
    }

    if (sub === "lokasi") {
      const lokasi = parts.slice(1).join(" ");
      if (!lokasi) {
        await m.reply(
          claraWrap("Lokasi Cuaca", [`◦ Penggunaan: *${prefix}cuaca lokasi <kota>*`,
              `◦ Contoh: *${prefix}cuaca lokasi Bandung*`].join("\n")) +
            "\n" +
            tipText(`Ketik ${prefix}cuaca help untuk melihat bantuan`)
        );
        return { handled: true };
      }

      setWeatherDb(db, { location: { name: lokasi } });
      await m.reply(
        claraWrap("Lokasi Cuaca", [`◦ Lokasi disetel ke: *${lokasi}*`].join("\n")) +
          "\n" +
          tipText(`Ketik ${prefix}cuaca now untuk cek cuaca sekarang`) +
          "\n" +
          tipText(`Ketik ${prefix}menu untuk kembali`)
      );
      return { handled: true };
    }

    if (sub === "now") {
      await m.reply(claraWrap("Cuaca", "⏳ *Mengambil cuaca realtime...*"));
      const { getWeatherFooter } = await import("../../src/lib/nova-weather-footer.js");
      const footer = await getWeatherFooter(true);
      if (!footer) {
        await m.reply(
          claraWrap("Cuaca", ["◦ Gagal mengambil data cuaca",
              "◦ Cek provider/lokasi/api key"].join("\n")) +
            "\n" +
            tipText(`Ketik ${prefix}cuaca help untuk konfigurasi`)
        );
        return { handled: true };
      }

      await m.reply(footer.trim());
      return { handled: true };
    }

    await m.reply(
      claraWrap("Cuaca Bot", [`◦ Provider: *${prefix}cuaca provider <nama>*`,
          `◦ Lokasi: *${prefix}cuaca lokasi <kota>*`,
          `◦ Cek: *${prefix}cuaca now*`,
          `◦ Bantuan: *${prefix}cuaca help*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`)
    );
  } catch (error) {
    await m.reply(
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
          `◦ Alasan: *${error.message}*`].join("\n")) +
        "\n" +
        tipText(`Coba lagi nanti atau hubungi owner`)
    );
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
