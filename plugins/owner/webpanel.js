// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Plugin .webpanel — start/stop WEB DASHBOARD (port HIROBOT lib/package/website utuh)
// Engine: src/lib/hiroweb/ — server HTTP standalone + halaman login + panel. OWNER-ONLY.
import { novaGuide, novaError, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "webpanel",
  alias: ["dashboard", "hiroweb"],
  category: "owner",
  description: "Panel web dashboard bot (port HIROBOT) — akses lewat browser",
  usage: ".webpanel on | .webpanel off | .webpanel status",
  example: ".webpanel on",
  isOwner: true,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const state = { server: null, starting: false };

function getPort() {
  const p = parseInt(process.env.NOVA_WEB_PORT || "3000", 10);
  return Number.isFinite(p) && p > 0 ? p : 3000;
}

async function start(m, sock) {
  if (state.server?.listening) {
    await m.reply(claraWrap("WebPanel", "Dashboard udah jalan di port " + getPort()));
    return;
  }
  if (state.starting) {
    await m.reply(claraWrap("WebPanel", "Lagi nyala... sabar ya"));
    return;
  }
  state.starting = true;
  try {
    const { default: startServer } = await import("../../src/lib/hiroweb/server.js");
    const srv = startServer(sock, getPort());
    if (srv?.on && !srv.listening) {
      await new Promise((resolve) => {
        srv.once("listening", resolve);
        srv.once("error", resolve);
      });
    }
    if (!srv?.listening) throw new Error("server gak mau listening — port kepake?");
    state.server = srv;
    await m.reply(claraWrap("WebPanel", [
      "Dashboard NYALA!",
      "",
      "Buka: http://<ip-vps>:" + getPort(),
      "(atau http://localhost:" + getPort() + " kalau nembak dari VPS)",
      "",
      "Login: pakai password dashboard — set ulang via halaman login.",
      "Matikan: .webpanel off",
    ].join("\n")));
  } catch (e) {
    console.error("[webpanel]:", e.message);
    await m.reply(novaError("WebPanel", "Gagal nyala: " + String(e.message).slice(0, 150)));
  } finally {
    state.starting = false;
  }
}

async function stop(m) {
  if (!state.server?.listening) {
    await m.reply(claraWrap("WebPanel", "Dashboard lagi mati"));
    return;
  }
  const srv = state.server;
  state.server = null;
  await new Promise((r) => srv.close(r));
  await m.reply(claraWrap("WebPanel", "Dashboard dimatiin"));
}

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🧠");
    const arg = (m.text || "").replace(new RegExp("^" + prefix + "webpanel\\s*", "i"), "").trim().toLowerCase();
    if (arg === "on") {
      await start(m, sock);
    } else if (arg === "off") {
      await stop(m);
    } else if (arg === "status") {
      await m.react("⚡");
      await m.reply(claraWrap("WebPanel", state.server?.listening
        ? "NYALA — port " + getPort()
        : "MATI"));
    } else {
      await m.react("🐣");
      await m.reply(novaGuide(
        "webpanel",
        "Panel web dashboard bot (port utuh dari HIROBOT): monitoring, kelola file & sesi — semua lewat browser.",
        prefix + "webpanel on",
        "Setelah nyala buka http://<ip-vps>:3000 (port bisa diubah via env NOVA_WEB_PORT). Matikan: " + prefix + "webpanel off. Owner-only."
      ));
    }
  } catch (error) {
    console.error("[webpanel]:", error.message);
    await m.react("❌");
    await m.reply(novaError("WebPanel", "Gagal: " + String(error.message).slice(0, 120)));
  }
  return { handled: true };
}

export { pluginConfig as config, handler }
