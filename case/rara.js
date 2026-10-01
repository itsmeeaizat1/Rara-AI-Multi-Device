// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { performance } from "perf_hooks";
import { getDatabase } from "../src/lib/rara-database.js";
import {
  getAllPlugins,
  getCommandsByCategory,
  getCategories,
  pluginStore,
} from "../src/lib/rara-plugins.js";
import config from "../config.js";
import { getStaticThumbnail } from "../src/lib/rara-asset-manager.js";
import {
  buildBox,
  raraReply,
  raraWrap,
  toSC,
  tipText,
} from "../src/lib/rara-menu-style.js";

// Preview card (externalAdReply) standar bot — thumbnail dari asset manager,
// link dari config.saluran. Data chanel lama (id newsletter hardcoded) dihapus total,
// id chanel sekarang ngikut config.saluran.id (placeholder "@newsletter" — diganti
// owner sendiri di config, bukan nempel di code).
async function buildListAdReply(title) {
  const ctx = {
    externalAdReply: {
      title: String(title || config.bot?.name || "Rara AI").substring(0, 60),
      body: "Rara AI - Multi Device",
      mediaType: 1,
      sourceUrl: config.saluran?.link || config.info?.website || "",
      renderLargerThumbnail: false,
    },
  };
  try {
    const thumb = await getStaticThumbnail();
    if (thumb) ctx.externalAdReply.thumbnail = thumb;
  } catch {}
  return ctx;
}


function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const CATEGORY_EMOJIS = {
  ai: "🤖", sticker: "🖼️", download: "📥", fun: "🎮",
  canvas: "🎨", tools: "🛠️", rpg: "🎯", "rpg cinta": "❤️",
  media: "🎬", search: "🔍", group: "👥", main: "🏠",
  utility: "🔧", religi: "☪️", info: "ℹ️", cek: "🔎",
  economy: "💰", user: "👤", random: "🎲", premium: "💎",
  ephoto: "📸", jpm: "📦", pushkontak: "📲",
  panel: "🖥️", owner: "👑", store: "🏬",
  anime: "🎌", asupan: "😍", clan: "🛡️", convert: "🔄",
  downloader: "📥", education: "📚", food: "🍔",
  future: "🌌", islami: "☪️", islamic: "🕋", menu: "📋",
  maker: "🖌️", news: "📰", nsfw: "🔞", linode: "☁️",
  primbon: "🔮", cecan: "💃", stalker: "🕵️", tts: "🔊",
  vps: "🖧",
};

async function handleCommand(m, sock) {
  try {
    if (!m.isCommand) return { handled: false };

    const command = m.command?.toLowerCase();
    if (!command) return { handled: false };

    const db = getDatabase();

    switch (command) {
      // Category: info
      case "cping":
      case "cspeed":
      case "clatency": {
        try {
          if (config.features?.autoTyping) {
            await sock.sendPresenceUpdate("composing", m.chat);
          }

          const start = performance.now();
          await m.react("🕕");

          const msgTimestamp = m.messageTimestamp
            ? m.messageTimestamp * 1000
            : Date.now();
          const latency = Math.max(1, Date.now() - msgTimestamp);

          const processTime = (performance.now() - start).toFixed(2);

          let pingStatus = "🟢 Excellent";
          if (latency > 100 && latency <= 300) pingStatus = "🟡 Good";
          else if (latency > 300) pingStatus = "🔴 Poor";

          const text = raraReply({
            title: "Case Ping",
            info: [
              { label: toSC("Latency"), value: `${latency}ms` },
              { label: toSC("Process"), value: `${processTime}ms` },
              { label: toSC("Status"), value: pingStatus },
            ],
          });

          await m.reply(text);
          await m.react("✅");

          if (config.features?.autoTyping) {
            await sock.sendPresenceUpdate("paused", m.chat);
          }
        } catch (error) {
          console.error("[CPing] Error:", error);
          await m.react("❌");
          await m.reply(raraWrap("Gagal", error.message, "error"));
        }
        return { handled: true };
      }

      case "lcase":
      case "caselist":
      case "allcase":
      case "listallcase": {
        try {
          if (config.features?.autoTyping) {
            await sock.sendPresenceUpdate("composing", m.chat);
          }

          await m.react("🔍");

          const casesByCategory = {
            info: ["cping", "listallcase", "listallplugin"],
          };

          const caseAliases = {
            cping: ["cspeed", "clatency"],
            listallcase: ["lcase", "caselist", "allcase"],
            listallplugin: ["lplugin", "pluginlist", "allplugin"],
          };

          let totalCases = 0;
          for (const cat in casesByCategory) {
            totalCases += casesByCategory[cat].length;
          }

          const prefix = m.prefix || ".";
          const lines = [
            `${toSC("Total")} : ${totalCases} case`,
            `${toSC("Kategori")} : ${Object.keys(casesByCategory).length}`,
            "---",
          ];

          for (const category in casesByCategory) {
            const commands = casesByCategory[category];
            lines.push({ subHeader: toSC(category) });
            commands.forEach((cmd) => {
              const aliases = caseAliases[cmd]
                ? ` (${caseAliases[cmd].slice(0, 2).join(", ")})`
                : "";
              lines.push(`${prefix}${cmd}${aliases}`);
            });
          }

          lines.push("---");
          lines.push(tipText(`Gunakan ${prefix}listallplugin untuk melihat semua plugin`));
          const text = buildBox("Case List", lines);

          await sock.sendMessage(
            m.chat,
            { text, contextInfo: await buildListAdReply("List Semua Case") },
            { quoted: m },
          );

          await m.react("✅");

          if (config.features?.autoTyping) {
            await sock.sendPresenceUpdate("paused", m.chat);
          }
        } catch (error) {
          console.error("[ListAllCase] Error:", error);
          await m.react("❌");
          await m.reply(raraWrap("Gagal", error.message, "error"));
        }
        return { handled: true };
      }

      case "lplugin":
      case "pluginlist":
      case "allplugin":
      case "listallplugin": {
        try {
          if (config.features?.autoTyping) {
            await sock.sendPresenceUpdate("composing", m.chat);
          }

          await m.react("🔍");

          const categories = getCategories();
          const commandsByCategory = getCommandsByCategory();

          let totalPlugins = 0;
          for (const category of categories) {
            totalPlugins += (commandsByCategory[category] || []).length;
          }

          if (totalPlugins === 0) {
            await m.reply("╭─「 ✦ Menu ✦ 」\n│ Belum ada plugin yang dimuat\n│ Coba restart bot dulu ya\n╰────  •  ────");
            return { handled: true };
          }

          const prefix = m.prefix || ".";
          const lines = [
            `${toSC("Total")} : ${totalPlugins} plugin`,
            `${toSC("Kategori")} : ${categories.length}`,
            "---",
          ];

          for (const category of categories.sort()) {
            const commands = commandsByCategory[category] || [];
            if (commands.length === 0) continue;

            lines.push({ subHeader: toSC(category) });

            commands.sort().forEach((cmd) => {
              const plugin = pluginStore.commands.get(cmd);
              if (plugin && plugin.config) {
                const aliases = plugin.config.alias
                  ? ` (${plugin.config.alias.slice(0, 2).join(", ")})`
                  : "";
                lines.push(`${prefix}${cmd}${aliases}`);
              }
            });
          }

          lines.push("---");
          lines.push(tipText(`Gunakan ${prefix}carifitur <nama fitur> untuk mencari fitur`));
          const text = buildBox("Plugin List", lines);

          await sock.sendMessage(
            m.chat,
            { text, contextInfo: await buildListAdReply("List Semua Plugin") },
            { quoted: m },
          );

          await m.react("✅");

          if (config.features?.autoTyping) {
            await sock.sendPresenceUpdate("paused", m.chat);
          }
        } catch (error) {
          console.error("[ListAllPlugin] Error:", error);
          await m.react("❌");
          await m.reply(raraWrap("Gagal", error.message, "error"));
        }
        return { handled: true };
      }
      // End Category: info

      default:
        return { handled: false };
    }
  } catch (error) {
    console.error("[CaseHandler] Error:", error);
    try {
      await m.reply(raraWrap("Error", error.message, "error"));
    } catch {}
    return { handled: true, error: error.message };
  }
}

function getCaseCommands() {
  return {
    info: ["cping", "listallcase", "listallplugin"],
  };
}

function getCaseCount() {
  const cases = getCaseCommands();
  let total = 0;
  for (const category in cases) {
    total += cases[category].length;
  }
  return total;
}

function getCaseCategories() {
  return Object.keys(getCaseCommands());
}

function getCasesByCategory() {
  return getCaseCommands();
}

export {
  handleCommand,
  getCaseCommands,
  getCaseCount,
  getCaseCategories,
  getCasesByCategory,
};
