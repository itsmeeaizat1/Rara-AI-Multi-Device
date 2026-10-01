// ─── MOCK RARA (baileys fork) untuk e2e jadibot ───
// Semua named export dari rara asli (relative), default makeWASocket diganti MockSocket.
export * from "../../node_modules/rara/lib/index.js";
import { EventEmitter } from "node:events";

export const instances = [];

export class MockSocket extends EventEmitter {
  constructor(opts = {}) {
    super();
    this.opts = opts;
    this.ev = this;
    this.user = null;
    this.ws = { readyState: 1, close: () => { this.ws.readyState = 3; } };
    this.authState = { creds: { registered: false }, keys: {} };
    this.sent = [];
    this.sendMessage = async (jid, content, opts2) => {
      this.sent.push({ jid, content, opts: opts2 });
      return { key: { id: "mock-" + this.sent.length, remoteJid: jid } };
    };
    this.sendPresenceUpdate = async () => {};
    this.readMessages = async () => {};
    this.profilePictureUrl = async () => "https://example.com/pic.jpg";
    this.relayMessage = async (jid, content, opts) => { this.sent.push({ jid, content, opts }); return ({}); };
    this.onWhatsApp = async (jid) => [jid];
    this.getBusinessProfile = async () => undefined;
    this.parseMention = (t) => String(t || "").match(/@\d+/g) || [];
    this.requestPairingCode = async (num) => { this.pairingFor = num; return "12345678"; };
    this.end = async () => { this.ev.emit("connection.update", { connection: "close", lastDisconnect: { error: { output: { statusCode: 515 } } } }); };
    this.groupMetadata = async (jid) => ({ id: jid, participants: [] });
    this.newsletterMetadata = async () => { throw new Error("mock: no newsletter"); };
    instances.push(this);
  }
}

export default function makeWASocket(opts) {
  const s = new MockSocket(opts);
  // simulasikan baileys: creds.update ke-save ke folder auth
  setTimeout(() => { try { s.ev.emit("creds.update"); } catch {} }, 10);
  return s;
}
