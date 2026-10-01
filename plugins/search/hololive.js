// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// hololive.js — Onepunya API: 7 endpoint HOLOLIVE (data HoloDex).
// .hololive [org] [limit]    — VTuber yang lagi LIVE sekarang (org: Hololive/Holostars/All)
// .holovideos [org] [limit]  — video/stream terbaru
// .holovid <video_id>        — detail video by id
// .holochannels [org] [limit]— daftar channel VTuber
// .holochid <channel_id>     — detail channel by id
// .holosearch <q> [target]   — cari VTuber/video (target: vtuber|video)
// Sumber: onepunya.qzz.io (key .setkey onepunya).
import { getApiKey } from "../../src/lib/nova-api-keys.js";
import { novaWrap } from "../../src/lib/nova-menu-style.js";
import { holoLive, holoVideos, holoVideoById, holoChannel, holoChannelById, holoSearch } from "../../src/lib/nova-onepunya.js";

const pluginConfig = {
  name: "hololive",
  alias: ["hololive", "holovideos", "holovid", "holochannels", "holochid", "holosearch"],
  category: "search",
  description: "Info Hololive/VTuber: live, video, channel, search (via Onepunya API)",
  usage: ".hololive [org] · .holovideos · .holovid <id> · .holochannels · .holochid <id> · .holosearch <q>",
  example: ".hololive",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 8,
  energi: 2,
  isEnabled: true,
};

// [org] [limit] dari args; org = argumen pertama non-angka
function parseOrgLimit(args) {
  let org = "", limit = 10;
  for (const a of args || []) {
    if (/^\d+$/.test(a)) limit = Math.min(parseInt(a, 10) || 10, 20);
    else if (!org) org = a;
  }
  return { org, limit };
}

function fmtVideos(list) {
  let text = "";
  (list || []).slice(0, 10).forEach((v, i) => {
    text += `${i + 1}. ${String(v.title || "").slice(0, 65)}\n   ${v.channel?.name || "-"}${v.channel?.org ? " (" + v.channel.org + ")" : ""}\n   ${v.status || "-"} · ID ${v.id}\n`;
  });
  return text;
}

function fmtChannels(list) {
  let text = "";
  (list || []).slice(0, 15).forEach((c, i) => {
    text += `${i + 1}. ${c.name || "-"}\n   ${c.english_name || ""}${c.org ? " · " + c.org : ""} · 👥 ${Number(c.subscriber_count || 0).toLocaleString("id-ID")}\n   ID ${c.id}\n`;
  });
  return text;
}

async function handler(m, { sock }) {
  const cmd = (m.command || "").toLowerCase();
  const args = m.args || [];
  const apiKey = getApiKey("onepunya");

  try {
    // ── LIVE sekarang ──
    if (cmd === "hololive") {
      const { org, limit } = parseOrgLimit(args);
      const live = await holoLive(apiKey, { org: org || "Hololive", limit });
      const list = Array.isArray(live) ? live : (live?.live || []);
      if (!list.length) return m.reply(novaWrap("Hololive", `Gak ada yang live sekarang${org ? " di " + org : ""}.`));
      let text = `🔴 LIVE SEKARANG (${list.length})\n\n`;
      list.slice(0, 10).forEach((v, i) => {
        text += `${i + 1}. ${String(v.title || "").slice(0, 65)}\n   ${v.channel?.name || "-"}${v.channel?.org ? " (" + v.channel.org + ")" : ""} · 👥 ${Number(v.viewers || 0).toLocaleString("id-ID")}\n   🆔 ${v.id}\n`;
      });
      return m.reply(novaWrap("Hololive", text));
    }

    // ── Video terbaru ──
    if (cmd === "holovideos") {
      const { org, limit } = parseOrgLimit(args);
      const vids = await holoVideos(apiKey, { org, limit });
      const list = Array.isArray(vids) ? vids : [];
      if (!list.length) return m.reply(novaWrap("Hololive", "Gak ada video ditemukan."));
      return m.reply(novaWrap("Hololive", `📺 Video VTuber terbaru\n${org ? "Org: " + org + "\n" : ""}\n` + fmtVideos(list)));
    }

    // ── Detail video by id ──
    if (cmd === "holovid") {
      const id = (args[0] || "").trim();
      if (!id) return m.reply(novaWrap("Hololive", "Masukkan video id.\n\nContoh: .holovid 1nifhc7ok1s"));
      const v = await holoVideoById(apiKey, id);
      if (!v) return m.reply(novaWrap("Hololive", "Video gak ketemu."));
      let text = `📺 ${v.title || "-"}\n`;
      if (v.channel?.name) text += `👤 ${v.channel.name}${v.channel.org ? " (" + v.channel.org + ")" : ""}\n`;
      text += `⏱ ${v.duration || 0} dtk · 📌 ${v.status || "-"} · ${v.topic_id || "-"}\n`;
      if (v.url || v.link) text += `🔗 ${v.url || v.link}\n`;
      return m.reply(novaWrap("Hololive", text));
    }

    // ── Daftar channel ──
    if (cmd === "holochannels") {
      const { org, limit } = parseOrgLimit(args);
      const chs = await holoChannel(apiKey, { org, limit });
      const list = Array.isArray(chs) ? chs : [];
      if (!list.length) return m.reply(novaWrap("Hololive", "Gak ada channel ditemukan."));
      return m.reply(novaWrap("Hololive", `👤 Channel VTuber${org ? " — " + org : ""}\n\n` + fmtChannels(list)));
    }

    // ── Detail channel by id ──
    if (cmd === "holochid") {
      const id = (args[0] || "").trim();
      if (!id) return m.reply(novaWrap("Hololive", "Masukkan channel id.\n\nContoh: .holochid UCMqGG8BRAiI1lJfKOpETM_w"));
      const c = await holoChannelById(apiKey, id);
      if (!c) return m.reply(novaWrap("Hololive", "Channel gak ketemu."));
      let text = `👤 ${c.name || "-"}\n${c.english_name || ""}\n`;
      if (c.org) text += `${c.org}${c.suborg ? " · " + c.suborg : ""}\n`;
      text += `👥 ${Number(c.subscriber_count || 0).toLocaleString("id-ID")} subscriber · 🎬 ${Number(c.video_count || 0).toLocaleString("id-ID")} video\n`;
      if (c.youtube_url || c.url) text += `🔗 ${c.youtube_url || c.url}\n`;
      return m.reply(novaWrap("Hololive", text));
    }

    // ── Search ──
    if (cmd === "holosearch") {
      const target = ["vtuber", "video"].includes((args[0] || "").toLowerCase()) ? args.shift().toLowerCase() : "vtuber";
      const q = (args || []).join(" ").trim();
      if (!q) return m.reply(novaWrap("Hololive", "Masukkan kata kunci.\n\nContoh: .holosearch pekora"));
      const res = await holoSearch(apiKey, { q, target, limit: 10 });
      const list = Array.isArray(res) ? res : [];
      if (!list.length) return m.reply(novaWrap("Hololive", `Gak ada hasil untuk: ${q}`));
      const text = target === "video" ? fmtVideos(list) : fmtChannels(list);
      return m.reply(novaWrap("Hololive", `🔍 "${q}" (${target})\n\n` + text));
    }
  } catch (e) {
    return m.reply(novaWrap("Hololive", `Gagal: ${String(e.message || e).slice(0, 200)}`));
  }
}

export { pluginConfig as config, handler };
