// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * Nama Plugin: Info Gempa BMKG
 * Fitur: .gempa — gempa terkini (animasi gelombang seismik + shakemap),
 *        .gempa dirasakan, .gempa list. Data resmi BMKG.
 *        FIX: branch dirasakan/terkini yang dulu crash (gempaList undefined).
 */
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "gempa",
  alias: ["gempa", "infogempa", "gempaterkini"],
  category: "info",
  description: "Info gempa terkini dari BMKG (gempa terbaru, dirasakan, list)",
  usage: ".gempa [terkini/dirasakan/list]",
  example: ".gempa",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const API_BASE = "https://data.bmkg.go.id/DataMKG/TEWS";

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error("BMKG API error: " + res.status);
  return res.json();
}

/** animasi gelombang seismik morphing 1 pesan (ala EWS) → settle kartu final */
async function playSeismicWave(m, sock, waveLines) {
  if (!sock?.sendMessage) return null;
  let key = null;
  try {
    const sent = await sock.sendMessage(m.chat, { text: waveLines[0] });
    key = sent?.key || null;
    for (let i = 1; i < waveLines.length; i++) {
      await new Promise((r) => setTimeout(r, 1100));
      try {
        await sock.sendMessage(m.chat, { text: waveLines[i], edit: key });
      } catch { break; }
    }
  } catch {}
  return key; // key buat settle kartu final di pesan yang sama
}

function buildGempaCard(g) {
  const lines = [
    "🌍 *GEMPA TERKINI BMKG*",
    "",
    ` magnitude: *M ${g.Magnitude}*`,
    `📍 Lokasi: ${g.Wilayah}`,
    `🧭 Posisi: ${g.Lintang} | ${g.Bujur}`,
    `🌡 Kedalaman: ${g.Kedalaman}`,
    `⏰ Waktu: ${g.Tanggal}, ${g.Jam} WIB`,
  ];
  if (g.Potensi) lines.push(`⚡ Potensi: ${g.Potensi}`);
  if (g.Dirasakan) lines.push(`🏠 Dirasakan: ${g.Dirasakan}`);
  return claraWrap("Gempa", lines.join("\n"));
}

async function handler(m, { sock }) {
  try {
    const args = (m.args || []).map((a) => a.toLowerCase());
    const subCmd = args[0] || "";
    const sub = subCmd === "latest" ? "terkini" : subCmd === "terbaru" ? "list" : subCmd;

    // ── GEMPA TERKINI (animasi wave + shakemap) ──
    if (!sub || sub === "terkini") {
      await m.react("🧠");
      const data = await fetchJson(API_BASE + "/autogempa.json");
      const g = data.Infogempa.gempa;
      const shakemapUrl = g.Shakemap ? `${API_BASE}/${g.Shakemap}` : null;

      await m.react("🛠️");
      const wave = [
        "📡 MEMINDAI JARINGAN SEISMIK...",
        "📡 menandai episenter " + (g.Lintang || "?") + " ...",
        "🌊 ○ gelombang P meluncur dari pusat gempa...",
        "🌊 ○◎ gelombang S menyebar ke permukaan...",
        "🌊 ◎◎◉ area guncangan meluas di " + (g.Wilayah || "wilayah") + "...",
        "⚡ finalisasi data BMKG...",
      ];
      const key = await playSeismicWave(m, sock, wave);
      const card = buildGempaCard(g);

      // settle kartu final ke pesan animasi yang sama
      let settled = false;
      if (key) {
        try { await sock.sendMessage(m.chat, { text: card, edit: key }); settled = true; } catch {}
      }
      if (!settled) await m.reply(card);

      if (shakemapUrl) {
        try { await sock.sendMedia(m.chat, { url: shakemapUrl }, claraWrap("Gempa", "🗺 Shakemap — area guncangan gempa"), m, { type: "image" }); } catch {}
      }
      await m.react("🐣");
      return;
    }

    // ── GEMPA DIRASAKAN ──
    if (sub === "dirasakan") {
      await m.react("🧠");
      const data = await fetchJson(API_BASE + "/gempadirasakan.json");
      const gempaList = (data.Infogempa || {}).gempa || [];
      if (!gempaList.length) return m.reply(claraWrap("Gempa", "Gak ada data gempa dirasakan saat ini."));
      const limit = Math.min(10, gempaList.length);
      const lines = [`🌍 *${limit} GEMPA DIRASAKAN TERBARU*`, ""];
      for (let i = 0; i < limit; i++) {
        const g = gempaList[i];
        lines.push(`${i + 1}. M${g.Magnitude} — ${g.Wilayah}`);
        lines.push(`   ${g.Tanggal} ${g.Jam} | Kedalaman ${g.Kedalaman}`);
        lines.push(`   Dirasakan: ${g.Dirasakan}`);
        lines.push("");
      }
      lines.push("Sumber: BMKG (data.bmkg.go.id)");
      await m.reply(claraWrap("Gempa", lines.join("\n")));
      await m.react("🐣");
      return;
    }

    // ── GEMPA LIST (M 5.0+ terbaru) ──
    if (sub === "list") {
      await m.react("🧠");
      const data = await fetchJson(API_BASE + "/gempaterkini.json");
      const gempaList = (data.Infogempa || {}).gempa || [];
      if (!gempaList.length) return m.reply(claraWrap("Gempa", "Gak ada data gempa terkini saat ini."));
      const limit = Math.min(15, gempaList.length);
      const lines = [`🌍 *${limit} GEMPA M 5.0+ TERBARU*`, ""];
      for (let i = 0; i < limit; i++) {
        const g = gempaList[i];
        lines.push(`${i + 1}. M${g.Magnitude} — ${g.Wilayah}`);
        lines.push(`   ${g.Tanggal} ${g.Jam} | Kedalaman ${g.Kedalaman}`);
        if (g.Potensi) lines.push(`   Potensi: ${g.Potensi}`);
        lines.push("");
      }
      lines.push("Sumber: BMKG (data.bmkg.go.id)");
      await m.reply(claraWrap("Gempa", lines.join("\n")));
      await m.react("🐣");
      return;
    }

    // ── HELP ──
    return m.reply(claraWrap("Gempa", [
      "🌍 Data gempa langsung dari BMKG Indonesia.",
      "",
      "Perintah:",
      `1. ${m.prefix || "."}gempa — Gempa terkini (animasi + shakemap)`,
      `2. ${m.prefix || "."}gempa dirasakan — 10 gempa dirasakan terbaru`,
      `3. ${m.prefix || "."}gempa list — 15 gempa M 5.0+ terbaru`,
      "",
      "Sumber: data.bmkg.go.id (API resmi BMKG)",
    ].join("\n")));
  } catch (error) {
    console.error("[gempa]", error.message || error);
    await m.react("❌");
    return m.reply(claraWrap("Gempa", "Ada error nih, coba lagi ya — BMKG lagi sibuk atau koneksinya gangguan."));
  }
}

export { pluginConfig as config, handler };
