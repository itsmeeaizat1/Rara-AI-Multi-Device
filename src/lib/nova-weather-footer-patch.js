import { getWeatherFooter, clearWeatherCache } from "./nova-weather-footer.js";

const PATCH_KEY = "nova.weatherFooterPatched";
const ORIGINAL_SEND_MESSAGE = Symbol("nova.originalSendMessage");

function appendWeatherFooter(text) {
  if (typeof text !== "string") return text;
  const trimmed = text.trim();
  if (!trimmed) return text;

  const footer = getWeatherFooter();
  if (!footer) return text;

  const separator = "\n\n──────────\n";
  if (trimmed.includes("Cuaca Realtime")) return text;
  return `${trimmed}${separator}${footer}`;
}

function normalizeMessage(message) {
  if (!message || typeof message !== "object") return message;

  const clone = { ...message };

  if (typeof clone.text === "string") {
    clone.text = appendWeatherFooter(clone.text);
  }

  const caption = clone.caption;
  if (typeof caption === "string") {
    clone.caption = appendWeatherFooter(caption);
  }

  return clone;
}

export function patchSockSendMessage(sock) {
  if (!sock || sock[PATCH_KEY]) return;

  const original = sock.sendMessage.bind(sock);
  sock[ORIGINAL_SEND_MESSAGE] = original;

  sock.sendMessage = async function patchedSendMessage(jid, message, options) {
    const patchedMessage = normalizeMessage(message);
    const result = await original(jid, patchedMessage, options);
    return result;
  };

  sock[PATCH_KEY] = true;
}

export function unpatchSockSendMessage(sock) {
  if (!sock || !sock[PATCH_KEY]) return;

  const original = sock[ORIGINAL_SEND_MESSAGE];
  if (typeof original === "function") {
    sock.sendMessage = original;
  }

  delete sock[PATCH_KEY];
  delete sock[ORIGINAL_SEND_MESSAGE];
}

export function resetWeatherFooterCache() {
  clearWeatherCache();
}
