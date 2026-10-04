// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// chart.js — Render data jadi grafik bar bergambar (canvas lokal @napi-rs/canvas)
// Fitur baru 9 Sep 2026 (request owner: fitur baru biar nambah dependencies)
// Mode:
//   .chart rpg <tipe>              → top 10 leaderboard RPG jadi grafik
//   .chart <label..> | <nilai..>  → grafik custom (label & nilai dipisah koma)
//   .chart <nilai..>              → grafik nilai aja (label otomatis #1..#N)
import { createCanvas } from "@napi-rs/canvas";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { getLeaderboard, formatRp } from "../../src/lib/rara-rpg-service.js";
import te from "../../src/lib/rara-error.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

const pluginConfig = {
  name: "chart",
  alias: ["chart", "grafik", "graph", "barchart"],
  category: "tools",
  description: "Bikin grafik bar dari data bot / data sendiri (canvas lokal)",
  usage: ".chart rpg <gold|uang|level|pvp|kills|...>\n.chart <label>,<label> | <nilai>,<nilai>\n.chart <nilai>,<nilai>,...",
  example: ".chart rpg uang\n.chart pisang,jeruk,apel | 10,25,7\n.chart 5,10,15,20",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 8,
  energi: 1,
  isEnabled: true,
};

// ─────────────────────────────────────────────────────
// Renderer — grafik bar horizontal, tema WhatsApp dark
// ─────────────────────────────────────────────────────
const THEME = {
  bgTop: "#0B141A",
  bgBottom: "#101C24",
  text: "#E9EDEF",
  muted: "#8696A0",
  track: "rgba(233,237,239,0.06)",
  barTop: "#00D9A6",
  barBottom: "#008069",
  grid: "rgba(233,237,239,0.05)",
};

function truncate(str, max) {
  if (!str) return "-";
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

function drawRoundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

export async function renderChart({ title, subtitle, items, money = false }) {
  const n = items.length;
  const W = 1200;
  const PAD = 56;
  const LABEL_W = 300;
  const H = 150 + n * 62 + 64;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, THEME.bgTop);
  bg.addColorStop(1, THEME.bgBottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Grid halus horizontal
  ctx.strokeStyle = THEME.grid;
  ctx.lineWidth = 1;
  for (let y = 150; y < H - 40; y += 62) {
    ctx.beginPath();
    ctx.moveTo(PAD, y + 31);
    ctx.lineTo(W - PAD, y + 31);
    ctx.stroke();
  }

  // Judul & subjudul
  ctx.fillStyle = THEME.text;
  ctx.font = "bold 40px sans-serif";
  ctx.fillText(title, PAD, 74);
  if (subtitle) {
    ctx.fillStyle = THEME.muted;
    ctx.font = "24px sans-serif";
    ctx.fillText(subtitle, PAD, 112);
  }

  const barX = PAD + LABEL_W;
  const barMax = W - PAD - 210 - barX; // sisain ruang buat teks nilai
  const barH = 34;
  const rowGap = 62;
  let maxVal = Math.max(...items.map((i) => Math.abs(i.value)), 1);

  items.forEach((item, idx) => {
    const y = 150 + idx * rowGap;
    const cy = y + (rowGap - barH) / 2;

    // Rank number
    ctx.fillStyle = idx === 0 ? "#F0B232" : THEME.muted;
    ctx.font = "bold 26px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(String(idx + 1), PAD + 26, y + rowGap / 2 + 8);
    ctx.textAlign = "left";

    // Label nama
    ctx.fillStyle = THEME.text;
    ctx.font = "26px sans-serif";
    ctx.fillText(truncate(item.label, 17), PAD + 42, y + rowGap / 2 + 8);

    // Track bar
    ctx.fillStyle = THEME.track;
    drawRoundRect(ctx, barX, cy, barMax, barH, 17);
    ctx.fill();

    // Bar value
    const w = Math.max((Math.abs(item.value) / maxVal) * barMax, 12);
    const grad = ctx.createLinearGradient(barX, cy, barX + w, cy);
    grad.addColorStop(0, THEME.barTop);
    grad.addColorStop(1, THEME.barBottom);
    ctx.fillStyle = grad;
    drawRoundRect(ctx, barX, cy, w, barH, 17);
    ctx.fill();

    // Teks nilai
    const display = item.display || (money ? formatRp(item.value) : item.value.toLocaleString("id-ID"));
    ctx.fillStyle = THEME.text;
    ctx.font = "bold 24px sans-serif";
    ctx.fillText(display, barX + w + 12, y + rowGap / 2 + 8);
  });

  // Footer sumber
  ctx.fillStyle = THEME.muted;
  ctx.font = "20px sans-serif";
  ctx.fillText("Rara AI • chart engine lokal", PAD, H - 26);

  return await canvas.encode("png");
}

// ─────────────────────────────────────────────────────
// Parser & handler
// ─────────────────────────────────────────────────────
const RPG_TYPES = {
  gold: "gold", emas: "gold",
  uang: "cash", cash: "cash", rp: "cash",
  level: "level", lv: "level", lvl: "level",
  pvp: "pvp", kills: "kills", boss: "boss",
  achievement: "achievement", prestasi: "achievement",
  gems: "gems", tokens: "tokens", joblevel: "joblevel",
};

const RPG_LABELS = {
  gold: "Gold (batang emas)", cash: "Uang (Rp)", level: "Level",
  pvp: "PVP Rating", kills: "Total Kills", boss: "Boss Kills",
  achievement: "Achievement Points", gems: "Gems", tokens: "Tokens", joblevel: "Level Kerja",
};

function chartHelp(m) {
  return raraWrap("chart", [
    "📊 *mode grafik*",
    "",
    `▸ ${m.prefix}chart rpg <tipe>`,
    "   top 10 pemain rpg",
    `▸ ${m.prefix}chart <label>,<label> | <nilai>,<nilai>`,
    "   grafik custom lu sendiri",
    `▸ ${m.prefix}chart <nilai>,<nilai>,...`,
    "   nilai aja, label otomatis",
    "",
    "*tipe rpg:*",
    "gold | uang | level | pvp | kills | boss | achievement | gems | tokens | joblevel",
    "",
    "*contoh:*",
    `${m.prefix}chart rpg uang`,
    `${m.prefix}chart pisang,jeruk,apel | 10,25,7`,
    `${m.prefix}chart 5,10,15,20`,
    "",
    "maks 12 data per grafik",
  ]);
}

function parseNumbers(str) {
  return String(str || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const v = Number(s.replace(/[._\s]/g, "").replace(/rp/i, ""));
      return Number.isFinite(v) ? v : NaN;
    });
}

async function handler(m, { sock }) {
  try {
    const raw = m.args.join(" ").trim();

    // Mode 1: leaderboard RPG
    if (m.args[0]?.toLowerCase() === "rpg") {
      const key = (m.args[1] || "").toLowerCase();
      const type = RPG_TYPES[key];
      if (!type) {
        await m.react("❌");
        return m.reply(raraWrap("chart", [
          "❌ *tipe rpg nya tidak ketemu*",
          "",
          `▸ ${m.prefix}chart rpg gold`,
          `▸ ${m.prefix}chart rpg uang`,
          `▸ ${m.prefix}chart rpg level`,
          "",
          "selengkapnya: gold | uang | level | pvp | kills | boss | achievement | gems | tokens | joblevel",
        ], "error"));
      }
      const players = getLeaderboard(type, 10);
      if (!players.length) {
        await m.react("❌");
        return m.reply(raraWrap("chart", "Belum ada data pemain RPG buat dijadikan grafik.", "error"));
      }
      await m.react("🕒");
      const png = await renderChart({
        title: `📊 TOP 10 ${RPG_LABELS[type].toUpperCase()}`,
        subtitle: "Leaderboard RPG — Rara AI",
        items: players.map((p) => ({ label: p.name, value: p.value })),
        money: type === "cash",
      });
      let card = "";
      try {
        const info = await probeBuffer(png);
        card = mediaResultCard({
          header: "chart",
          type: "gambar",
          request: [["Kategori", RPG_LABELS[type] || String(type)]],
          size: info.size, mime: info.mime, width: info.width, height: info.height,
        });
      } catch { /* best-effort */ }
      await sock.sendMedia(m.chat, png, (card || null), m, { type: "image" });
      await m.react("🐣");
      return;
    }

    // Mode 2 & 3: custom
    if (!raw) {
      return m.reply(chartHelp(m));
    }

    let labels = [];
    let values = [];

    if (raw.includes("|")) {
      const [labelPart, valuePart] = raw.split("|");
      labels = labelPart.split(",").map((s) => s.trim()).filter(Boolean);
      values = parseNumbers(valuePart);
      if (values.some(Number.isNaN)) {
        await m.react("❌");
        return m.reply(raraWrap("chart", "❌ Nilainya harus angka semua, dipisah koma.\n\nContoh: .chart pisang,jeruk | 10,25", "error"));
      }
      if (labels.length !== values.length) {
        await m.react("❌");
        return m.reply(raraWrap("chart", "❌ Jumlah label & nilai harus sama.\n\nContoh: .chart pisang,jeruk,apel | 10,25,7", "error"));
      }
    } else {
      values = parseNumbers(raw);
      labels = values.map((_, i) => `#${i + 1}`);
      if (values.some(Number.isNaN)) {
        await m.react("❌");
        return m.reply(raraWrap("chart", "❌ Nilainya harus angka, dipisah koma.\n\nContoh: .chart 10,25,7 atau .chart pisang,jeruk | 10,25", "error"));
      }
    }

    if (values.length < 2) {
      await m.react("❌");
      return m.reply(raraWrap("chart", "❌ Minimal 2 data biar keliatan grafiknya 😄", "error"));
    }
    if (values.length > 12) {
      await m.react("❌");
      return m.reply(raraWrap("chart", "❌ Maksimal 12 data per grafik.", "error"));
    }

    await m.react("🕒");
    const png = await renderChart({
      title: "📊 GRAFIK DATA",
      subtitle: "Custom chart — Rara AI",
      items: values.map((v, i) => ({ label: labels[i] || `#${i + 1}`, value: v })),
    });
    let card = "";
    try {
      const info = await probeBuffer(png);
      card = mediaResultCard({
        header: "chart",
        type: "gambar",
        request: [["Data", `${labels.length} item`]],
        size: info.size, mime: info.mime, width: info.width, height: info.height,
      });
    } catch { /* best-effort */ }
    await sock.sendMedia(m.chat, png, (card || null), m, { type: "image" });
    await m.react("🐣");
  } catch (e) {
    await m.react("❌");
    m.reply(raraWrap("chart", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
