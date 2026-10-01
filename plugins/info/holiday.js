// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// holiday.js — daftar hari libur nasional mendatang.
// ROMBAK (owner 16 Sep 2026): GAK PAKAI API EKSTERNAL lagi — data dari
// PACKAGE date-holidays via lib nova-haribesar (satu sumber lokal, tahan lama).
// Fitur lama dipertahankan: header "hari ini libur" / libur terdekat +
// ticker live < 24 jam menuju libur.
import { novaWrap } from "../../src/lib/nova-menu-style.js";
import { runLiveTicker } from "../../src/lib/nova-countdown.js";
import { computeNextMidnightWib, buildLiburHeader, buildLiburCard } from "../../src/lib/nova-libur-card.js";
import { getHariBesar, getLiburOn, nextLibur, listLiburMendatang } from "../../src/lib/nova-haribesar.js";

const pluginConfig = {
  name: "harilibur",
  alias: ["harilibur"],
  category: "info",
  description: "Daftar hari libur nasional mendatang — data lokal date-holidays, tanpa API eksternal",
  usage: ".harilibur",
  example: ".harilibur",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const pad = (n) => String(n).padStart(2, "0");
function wibYmd() {
  const d = new Date(Date.now() + 7 * 3600 * 1000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
function toDdMmYyyy(ymd) {
  const [y, m, dd] = String(ymd || "").split("-");
  return `${dd}-${m}-${y}`;
}

async function handler(m, { sock }) {
  try {
    const hariIniYmd = wibYmd();
    const hariIni = getLiburOn(hariIniYmd) || getHariBesar(hariIniYmd);

    // libur terdekat (termasuk hari ini)
    const nxt = nextLibur(hariIniYmd, 365);
    const diff = nxt ? Math.round((Date.parse(nxt.ymd) - Date.parse(hariIniYmd)) / 86400000) : null;

    const header = buildLiburHeader(
      { events: hariIni ? [hariIni.nama] : [] },
      !hariIni && nxt ? { date: toDdMmYyyy(nxt.ymd), event: nxt.nama, daysUntil: diff } : null,
    );

    let caption = `📅 *HARI LIBUR NASIONAL MENDATANG* 📅\n\n`;
    if (header) caption += header + `\n\n`;

    const items = listLiburMendatang(hariIniYmd, 120); // 120 hari — jendela 90 bakal kosong pas Sep-Des (jarak libur terjauh 100 hari)
    if (items.length > 0) {
      caption += `*HARI LIBUR 120 HARI KE DEPAN*\n`;
      items.slice(0, 8).forEach((it, i) => {
        const label = it.h === 0 ? `⭐ HARI INI` : Number(it.h) <= 1 ? `🕒 BESOK` : `🕒 ${it.h} hari lagi`;
        caption += `${i + 1}. ${it.emoji} ${it.nama} (${toDdMmYyyy(it.ymd)}) _(${label})_\n`;
      });
      caption += `\n_Data lokal date-holidays — tanpa API eksternal ✅_`;
    } else {
      caption += `Tidak ada hari libur nasional dalam 120 hari ke depan.`;
    }

    const __navText = novaWrap(caption.trim().split("\n"));
    await m.reply(__navText);

    // libur besok (diff <= 1) → ticker live sampai tengah malam D-day
    if (!hariIni && nxt && diff !== null && diff <= 1) {
      const targetTs = computeNextMidnightWib();
      runLiveTicker({
        sock,
        chat: m.chat,
        m,
        initialCard: buildLiburCard(nxt.nama, targetTs - Date.now()),
        tickCard: (st) => buildLiburCard(nxt.nama, st.remainingMs),
        mode: "down",
        targetTs,
      }).catch(() => {});
    }
  } catch (error) {
    console.error("[HariLibur]", error.message);
    m.reply(novaWrap("HariLibur", `Ada error nih, coba lagi ya`));
  }
}

export { pluginConfig as config, handler };
export default { config: pluginConfig, handler };
