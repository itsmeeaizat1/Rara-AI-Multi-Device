// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Engine IoT/MQTT: konek broker, publish & subscribe perangkat IoT langsung dari WhatsApp. Lazy-load library mqtt.
import { getDatabase } from "./nova-database.js";

let client = null;
let notifyRoute = null;

function db() {
  const database = getDatabase();
  if (!database.data.iot) database.data.iot = { broker: "", port: 1883, user: "", pass: "", subs: [] };
  return database;
}

export function setIotNotifier(fn) { notifyRoute = fn; }

export function topicMatches(sub, topic) {
  const ps = String(sub || "").split("/");
  const ts = String(topic || "").split("/");
  for (let i = 0; i < ps.length; i++) {
    if (ps[i] === "#") return true;
    if (i >= ts.length) return false;
    if (ps[i] !== "+" && ps[i] !== ts[i]) return false;
  }
  return ps.length === ts.length;
}

function routeMessage(topic, payload) {
  const d = db().data.iot;
  const text = String(payload || "");
  for (const s of d.subs || []) {
    if (topicMatches(s.topic, topic) && notifyRoute) {
      notifyRoute(s.chatId, "📡 IoT: " + topic + "\n" + text.slice(0, 1000));
    }
  }
}

export async function iotConnect(sock, hostLine, user, pass) {
  if (client) return { ok: true, already: true };
  const [host, portStr] = String(hostLine || "").split(":");
  if (!host || !/^[a-z0-9._-]+$/i.test(host)) return { ok: false, error: "host broker gak valid. Contoh: broker.hivemq.com atau 192.168.1.10" };
  const port = parseInt(portStr || "1883", 10);
  const mqtt = await import("mqtt");
  const c = mqtt.default.connect("mqtt://" + host + ":" + port, {
    username: user || undefined,
    password: pass || undefined,
    reconnectPeriod: 5000,
    connectTimeout: 10000,
    clientId: "nova-iot-" + Math.random().toString(16).slice(2, 8),
  });
  if (sock) setIotNotifier(async (to, text) => { try { await sock.sendMessage(to, { text }); } catch {} });
  c.on("message", (t, p) => routeMessage(t, p.toString()));
  return await new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ ok: false, error: "timeout konek broker (10 dtk). Cek host/port/firewall, broker mungkin butuh TLS (port 8883 belum didukung)." }), 11000);
    c.once("connect", () => {
      clearTimeout(timer);
      const d = db().data.iot;
      d.broker = host; d.port = port; d.user = user || ""; d.pass = pass || "";
      for (const s of d.subs || []) c.subscribe(s.topic);
      resolve({ ok: true, url: host + ":" + port });
    });
    c.once("error", (e) => {
      clearTimeout(timer);
      resolve({ ok: false, error: "gagal konek: " + String(e.message).slice(0, 120) });
    });
  });
}

export function iotPublish(topic, msg) {
  return new Promise((resolve) => {
    if (!client) return resolve({ ok: false, error: "IoT belum konek: .iot on <host>" });
    if (!topic || !/^[\w#+/\-$ ]{1,100}$/.test(topic)) return resolve({ ok: false, error: "topik gak valid (contoh: rumah/lampu/on)" });
    client.publish(topic, String(msg || ""), { qos: 0 }, (e) => (e ? resolve({ ok: false, error: String(e.message).slice(0, 120) }) : resolve({ ok: true })));
  });
}

export function iotSubscribe(topic, chatId) {
  if (!client) return { ok: false, error: "IoT belum konek: .iot on <host>" };
  if (!topic || !/^[\w#+/\-$ ]{1,100}$/.test(topic)) return { ok: false, error: "topik gak valid (contoh: rumah/#)" };
  const d = db().data.iot;
  d.subs = (d.subs || []).filter((s) => !(s.topic === topic && s.chatId === chatId));
  d.subs.push({ topic, chatId: chatId || "" });
  client.subscribe(topic);
  return { ok: true };
}

export function iotUnsubscribe(topic, chatId) {
  const d = db().data.iot;
  d.subs = (d.subs || []).filter((s) => !(s.topic === topic && (chatId ? s.chatId === chatId : true)));
  if (client) client.unsubscribe(topic);
  return { ok: true };
}

export function iotStatus() {
  const d = db().data.iot;
  return {
    connected: !!(client && d.broker),
    broker: d.broker ? d.broker + ":" + d.port : "",
    subs: (d.subs || []).map((s) => s.topic),
  };
}

export function iotDisconnect() {
  if (client) { client.end(true); client = null; }
  const d = db().data.iot;
  d.broker = ""; d.port = 1883; d.user = ""; d.pass = ""; d.subs = [];
  return { ok: true };
}

// seam test: inject client palsu
export function _setIotClientForTest(c) { client = c; }
