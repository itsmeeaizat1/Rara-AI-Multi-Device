// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-web-rich.js — AI RICH buat command .web (owner 10 Sep 2026:
// "fitur ai rich cm buat cmd .web — .web google yg kebuka ai rich google
// search, kyk buka google chrome gt"). Dipakai plugins/browser/web.js.
// Google SERP: tiap hasil = [judul bold] [domain] [snippet] — susunan
// persis halaman hasil pencarian Chrome. + knowledge panel (Wikipedia)
// + suggest chips. Fallback: flow webview card .web lama.
import { buildRichResponse } from "./nova-rich-response.js";
import { searchWeb } from "./nova-websearch.js";
import { getWikiSummary, getGoogleSuggest } from "./nova-rich-response.js";

function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return String(url).split("/")[2] || ""; }
}

/**
 * Rich SERP Google — tampilan seperti buka google.com di Chrome:
 * header query → [hasil 1..N: *judul* / domain / snippet] →
 * knowledge panel (gambar + ringkasan Wikipedia) → chips terkait.
 */
export function formatGoogleSerpRich(query, r, { wiki = null, suggests = [], prefix = "." } = {}) {
  const parts = [];
  parts.push({ type: "text", content: `🔍 ${query}${r?.source ? ` — ${r.source}` : ""}${r?.engineNote ? " (via Bing)" : ""}` });

  // ── hasil SERP: satu section per hasil, layout ala Chrome ──
  for (const it of (r?.items || []).slice(0, 6)) {
    const lines = [`*${(it.title || "").slice(0, 70)}*`, domainOf(it.url)];
    if (it.snippet) lines.push(String(it.snippet).slice(0, 110));
    lines.push(`🔗 ${it.url}`);
    parts.push({ type: "text", content: lines.join("\n") });
  }

  // ── knowledge panel (ala kartu info Google) ──
  if (wiki?.extract) {
    if (wiki.thumbnail) parts.push({ type: "image", url: wiki.thumbnail });
    let panel = `📖 ${wiki.title}\n\n${wiki.extract.slice(0, 300)}${wiki.extract.length > 300 ? "..." : ""}`;
    if (wiki.url) panel += `\n${wiki.url}`;
    parts.push({ type: "text", content: panel });
  }

  if (suggests.length) {
    parts.push({ type: "suggest", prompts: suggests.map((s) => `${prefix}web google ${s}`).slice(0, 4) });
  }
  return buildRichResponse(parts, `🔎 ${String(query).slice(0, 30)}`, "");
}

/** Ambil semua bahan SERP + kirim rich. Return true kalau kekirim. */
export async function sendGoogleSerpRich(sock, jid, query, { prefix = "." } = {}) {
  const [r, wiki] = await Promise.all([
    searchWeb(query, { engine: "bing" }),
    getWikiSummary(query).catch(() => null),
  ]);
  if (r?.error || !r?.items?.length) return false;
  const suggests = await getGoogleSuggest(query, 4).catch(() => []);
  const rich = formatGoogleSerpRich(query, r, { wiki, suggests, prefix });
  const { sendRichMessage } = await import("./nova-rich-response.js");
  return sendRichMessage(sock, jid, rich);
}
