// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Plugin .iot — kontrol perangkat IoT via MQTT langsung dari WhatsApp. OWNER-ONLY.
import { raraGuide, raraError, raraWrap } from "../../src/lib/rara-menu-style.js";
import { iotConnect, iotPublish, iotSubscribe, iotUnsubscribe, iotStatus, iotDisconnect } from "../../src/lib/rara-mqtt.js";

const pluginConfig = {
  name: "iot",
  alias: ["mqtt", "smart_home"],
  category: "owner",
  description: "Kontrol perangkat IoT via MQTT — publish perintah & pantau sensor dari WhatsApp",
  usage: ".iot on <host[:port]> [user] [pass] | .iot pub <topik> <pesan> | .iot sub <topik> | .iot unsub <topik> | .iot status | .iot off",
  example: ".iot on broker.hivemq.com",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  limit: 0,
  isEnabled: true,
};

async function handler(m, params = {}) {
  const sock = params.sock;
  const rest = String(m.text || "").replace(/^\S+\s*/, "").trim();
  const first = rest.split(/\s+/)[0].toLowerCase();
  try {
    if (first === "on") {
      const parts = rest.replace(/^on\s*/i, "").split(/\s+/);
      if (!parts[0]) { await m.react("❌"); await m.reply(raraWrap("IoT", "Format: .iot on <host[:port]> [user] [pass]")); return { handled: true }; }
      await m.react("🧠");
      const r = await iotConnect(sock, parts[0], parts[1], parts[2]);
      await m.react(r.ok ? "⚡" : "❌");
      await m.reply(raraWrap("IoT", r.ok
        ? "✅ Terhubung ke broker " + (r.url || parts[0]) + (r.already ? " (udah konek dari tadi)" : "")
        : r.error));
    } else if (first === "pub") {
      const payload = rest.replace(/^pub\s*/i, "").trim();
      const sp = payload.indexOf(" ");
      if (sp < 1) { await m.react("❌"); await m.reply(raraWrap("IoT", "Format: .iot pub <topik> <pesan>")); return { handled: true }; }
      const topic = payload.slice(0, sp).trim();
      const msg = payload.slice(sp + 1).trim();
      const r = await iotPublish(topic, msg);
      await m.react(r.ok ? "⚡" : "❌");
      await m.reply(raraWrap("IoT", r.ok ? "✅ Terkirim ke " + topic + ": " + msg : r.error));
    } else if (first === "sub") {
      const topic = rest.replace(/^sub\s*/i, "").trim();
      if (!topic) { await m.react("❌"); await m.reply(raraWrap("IoT", "Format: .iot sub <topik> — contoh: rumah/suhu/#")); return { handled: true }; }
      const r = iotSubscribe(topic, m.sender);
      await m.react(r.ok ? "⚡" : "❌");
      await m.reply(raraWrap("IoT", r.ok ? "✅ Berlangganan " + topic + " — tiap pesan masuk bakal diteruskan ke chat ini" : r.error));
    } else if (first === "unsub") {
      const topic = rest.replace(/^unsub\s*/i, "").trim();
      const r = iotUnsubscribe(topic, m.sender);
      await m.react(r.ok ? "⚡" : "❌");
      await m.reply(raraWrap("IoT", "✅ Berhenti langganan " + topic));
    } else if (first === "status") {
      const s = iotStatus();
      await m.react("🔍");
      await m.reply(raraWrap("IoT", (s.connected ? "TERHUBUNG — " + s.broker : "BELUM KONEK (.iot on <host>)") +
        "\nLangganan: " + (s.subs.length ? s.subs.join(", ") : "belum ada")));
    } else if (first === "off") {
      iotDisconnect();
      await m.react("⚡");
      await m.reply(raraWrap("IoT", "Terputus dari broker, semua langganan dibersihin"));
    } else {
      await m.react("🐣");
      await m.reply(raraGuide(
        "iot",
        "Kontrol IoT via MQTT: konek ke broker (HiveMQ, Mosquitto, Home Assistant, dll), kirim perintah ke topik perangkat, dan pantau sensor — semuanya dari chat.",
        ".iot on broker.hivemq.com",
        "Nyalain lampu: .iot pub rumah/lampu/ruang-tamu on · Pantau sensor: .iot sub rumah/suhu/# (wildcard + dan # didukung). Owner-only."
      ));
    }
  } catch (error) {
    console.error("[iot]:", error.message);
    await m.react("❌");
    await m.reply(raraError("IoT", "Gagal: " + String(error.message).slice(0, 120)));
  }
  return { handled: true };
}

export { pluginConfig as config, handler };
