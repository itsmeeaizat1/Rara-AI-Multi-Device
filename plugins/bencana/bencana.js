// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// bencana.js — Dashboard & cek bencana alam dunia + Indonesia
// Kategori baru: bencana. Sumber: GDACS (EU/UN), NASA EONET, USGS, BMKG.
// Semua endpoint resmi & verified hidup 2026-09-06.
//
// Standar tampilan bot: hasil data (list/dashboard) = plain text natural;
// usage/guide = box + smallcaps; react 🕒 → 🐣.

import {
  getGdacs, getEonet, getUsgs, getBmkgLatest,
  GDACS_TYPES, ALERT_STYLE, shortCountry,
} from "../../src/lib/nova-bencana.js";
import { novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";
// GUARD FORMAT: pesan berkotak wajib boxLeft() dari src/lib/styler.js
// (dilarang kotak manual / │ manual) — dikirim dalam code block.
import { boxMessage } from "../../src/lib/styler.js";

const novaGuide = (header, intro, example) =>
  boxMessage(`◆ ${String(header).split("—")[0].trim().toUpperCase()} ◆`, [
    ...(intro ? [String(intro)] : []),
    ...(example ? [`Contoh: ${example}`] : []),
  ].join("\n"));

const pluginConfig = {
  name: "bencana",
  alias: ["bencana"],
  category: "bencana",
  description: "Cek bencana alam aktif dunia (banjir, topan, gunung api, karhutla, gempa, tsunami, kekeringan)",
  usage: ".bencana [gempa/banjir/badai/gunungapi/kebakaran/kering/tsunami]",
  example: ".bencana\n.bencana banjir",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

function gdacsRow(i, e) {
  const t = GDACS_TYPES[e.type] ?? { label: e.type, icon: "⚠️" };
  const a = ALERT_STYLE[e.alertlevel] ?? ALERT_STYLE.Green;
  let row = `${i}. ${a.icon} ${a.label} — ${t.icon} ${t.label}${e.country ? ` di ${shortCountry(e.country)}` : ""}`;
  if (e.desc) row += `\n   ${e.desc}`;
  row += `\n   Lokasi: ${(+e.lat).toFixed(2)}, ${(+e.lon).toFixed(2)} → https://maps.google.com/?q=${e.lat},${e.lon}`;
  if (e.report) row += `\n   Laporan: ${e.report}`;
  return row;
}

function formatGdacsList(events, title, max = 10) {
  if (!events.length) return `${title}\nTidak ada peristiwa aktif pada kategori ini.`;
  let out = `${title}\n\n`;
  out += events.slice(0, max).map((e, i) => gdacsRow(i + 1, e)).join("\n\n");
  out += `\n\nSumber: GDACS (EU/UN) — gdacs.org`;
  return out;
}

function formatEonetList(events, title, max = 10) {
  if (!events.length) return `${title}\nTidak ada peristiwa aktif pada kategori ini.`;
  let out = `${title}\n\n`;
  out += events.slice(0, max).map((e, i) => {
    let row = `${i}. ${e.title}`;
    row += `\n   Sejak ${new Date(e.date + 7 * 3600e3).toISOString().slice(0, 16).replace("T", " ")} WIB`;
    if (e.mag) row += `\n   Skala: ${e.mag}`;
    row += `\n   Lokasi: ${(+e.lat).toFixed(2)}, ${(+e.lon).toFixed(2)} → https://maps.google.com/?q=${e.lat},${e.lon}`;
    if (e.link) row += `\n   Info: ${e.link}`;
    return row;
  }).join("\n\n");
  out += `\n\nSumber: NASA EONET — eonet.gsfc.nasa.gov`;
  return out;
}

async function handler(m, { sock }) {
  try {
    const args = (m.args || []).map((a) => String(a).toLowerCase());
    const jenis = args[0] || "";
    await m.react("🕒");

    // ─── Dashboard (default) ───
    if (!jenis) {
      const [gdacs, gempa] = await Promise.all([
        getGdacs(7).catch(() => []),
        getBmkgLatest().catch(() => null),
      ]);
      const red = gdacs.filter((e) => e.alertlevel === "Red");
      const orange = gdacs.filter((e) => e.alertlevel === "Orange");
      const green = gdacs.filter((e) => e.alertlevel === "Green");

      let out = `DASHBOARD BENCANA ALAM DUNIA\n\n`;
      out += `7 hari terakhir (GDACS): ${red.length} AWAS, ${orange.length} SIAGA, ${green.length} Waspada\n`;

      out += `\nLEVEL AWAS\n`;
      out += red.length
        ? red.slice(0, 5).map((e, i) => `${i + 1}. ${(GDACS_TYPES[e.type] ?? { icon: "⚠️", label: e.type }).icon} ${(GDACS_TYPES[e.type] ?? { label: e.type }).label}${e.country ? ` di ${shortCountry(e.country)}` : ""}${e.report ? `\n   ${e.report}` : ""}`).join("\n")
        : "Tidak ada";

      out += `\n\nLEVEL SIAGA\n`;
      out += orange.length
        ? orange.slice(0, 5).map((e, i) => `${i + 1}. ${(GDACS_TYPES[e.type] ?? { icon: "⚠️", label: e.type }).icon} ${(GDACS_TYPES[e.type] ?? { label: e.type }).label}${e.country ? ` di ${shortCountry(e.country)}` : ""}`).join("\n")
        : "Tidak ada";

      out += `\n\nGEMPA TERKINI INDONESIA (BMKG)\n`;
      out += gempa
        ? `${gempa.Magnitude} SR, ${gempa.Kedalaman} — ${gempa.Wilayah}\n${gempa.Tanggal} ${gempa.Jam}`
        : "Data tidak tersedia";

      out += `\n\nDetail per jenis: .bencana gempa / banjir / badai / gunungapi / kebakaran / kering / tsunami`;
      out += `\nLangganan alert otomatis: .bencanawatch on`;
      out += `\nSumber: GDACS (EU/UN) + BMKG + NASA EONET + USGS`;
      await m.reply(out);
      await m.react("🐣");
      return;
    }

    switch (jenis) {
      case "gempa": {
        const g = await getBmkgLatest().catch(() => null);
        if (!g) { await m.reply(novaGangguan("bencana gempa")); return; }
        const [lat, lon] = String(g.Coordinates).split(",").map((s) => s.trim());
        let out = `GEMPA TERKINI — BMKG\n\n`;
        out += `${g.Magnitude} SR, kedalaman ${g.Kedalaman}\n${g.Tanggal} ${g.Jam}\n${g.Wilayah}\n`;
        if (g.Potensi) out += `${g.Potensi}\n`;
        if (g.Dirasakan) out += `Dirasakan: ${g.Dirasakan}\n`;
        out += `Lokasi: ${g.Coordinates} → https://maps.google.com/?q=${lat},${lon}`;
        out += `\n\nDetail lengkap: .gempa`;
        await m.reply(out);
        if (g._shakemapUrl) {
          await sock.sendMessage(m.chat, { image: { url: g._shakemapUrl }, caption: `Shakemap ${g.Tanggal} ${g.Jam}` }, { quoted: m });
        }
        await m.react("🐣");
        return;
      }

      case "banjir":
      case "flood":
        await m.reply(formatGdacsList((await getGdacs(7)).filter((e) => e.type === "FL"), "BANJIR AKTIF DUNIA — GDACS"));
        await m.react("🐣");
        return;

      case "badai":
      case "topan":
      case "cyclone":
        await m.reply(formatGdacsList((await getGdacs(7)).filter((e) => e.type === "TC"), "TOPAN / BADAI TROPIS AKTIF — GDACS"));
        await m.react("🐣");
        return;

      case "gunungapi":
      case "gunung":
      case "volcano": {
        const [gd, eo] = await Promise.all([getGdacs(30).catch(() => []), getEonet(30).catch(() => [])]);
        let out = formatGdacsList(gd.filter((e) => e.type === "VO"), "GUNUNG API — GDACS", 5);
        out += "\n\n" + formatEonetList(eo.filter((e) => e.cat === "Volcanoes"), "GUNUNG API — NASA EONET", 8);
        await m.reply(out);
        await m.react("🐣");
        return;
      }

      case "kebakaran":
      case "karhutla":
      case "fire": {
        const [gd, eo] = await Promise.all([getGdacs(7).catch(() => []), getEonet(7).catch(() => [])]);
        let out = formatEonetList(eo.filter((e) => e.cat === "Wildfires"), "KEBAKARAN HUTAN/LAHAN — NASA EONET", 10);
        const gdwf = gd.filter((e) => e.type === "WF");
        if (gdwf.length) out += "\n\n" + formatGdacsList(gdwf, "KEBAKARAN LAHAN — GDACS", 5);
        await m.reply(out);
        await m.react("🐣");
        return;
      }

      case "kering":
      case "kekeringan":
      case "drought": {
        const [gd, eo] = await Promise.all([getGdacs(30).catch(() => []), getEonet(30).catch(() => [])]);
        let out = formatGdacsList(gd.filter((e) => e.type === "DR"), "KEKERINGAN — GDACS", 8);
        out += "\n\n" + formatEonetList(eo.filter((e) => e.cat === "Drought"), "KEKERINGAN — NASA EONET", 5);
        await m.reply(out);
        await m.react("🐣");
        return;
      }

      case "tsunami":
        await m.reply(formatGdacsList((await getGdacs(30)).filter((e) => e.type === "TS"), "PERISTIWA TSUNAMI — GDACS"));
        await m.react("🐣");
        return;

      case "global": {
        const quakes = await getUsgs(6.0, 10).catch(() => []);
        if (!quakes.length) { await m.reply("Tidak ada gempa global M 6.0+ dalam rentang data terkini."); return; }
        let out = `GEMPA GLOBAL M 6.0+ — USGS\n\n`;
        out += quakes.map((q, i) => {
          let row = `${i + 1}. M${q.mag?.toFixed(1)} — ${q.place}`;
          row += `\n   ${new Date(q.time + 7 * 3600e3).toISOString().slice(0, 16).replace("T", " ")} WIB`;
          row += `\n   https://maps.google.com/?q=${q.lat},${q.lon}`;
          if (q.tsunami) row += `\n   PERHATIAN: flag potensi tsunami`;
          return row;
        }).join("\n\n");
        out += `\n\nSumber: USGS — earthquake.usgs.gov`;
        await m.reply(out);
        await m.react("🐣");
        return;
      }

      default:
        await m.reply(novaGuide(
          "Bencana",
          "Jenis bencana tidak dikenal. Pilihan: gempa, banjir, badai, gunungapi, kebakaran, kering, tsunami, global",
          ".bencana banjir"
        ));
        await m.react("🐣");
        return;
    }
  } catch (err) {
    console.error("[bencana]", err);
    await m.react("❌");
    await m.reply(novaGagal("bencana"));
  }
}

export { pluginConfig as config, handler };
