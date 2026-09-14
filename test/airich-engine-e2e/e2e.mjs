// E2E AI RICH ENGINE (src/lib/nova-airich.js) — infrastruktur bersama
// fitur airich/: certificate cache, polishPayload bottom sheet,
// buildRichResponse, sendRichResponse. Plugin baru dari nol tinggal
// nyuplain HTML → ini ngejamin struktur relay-nya bener.
import fs from "node:fs";
import { initDatabase } from "../../src/lib/nova-database.js";
import {
  fetchCertificate, polishPayload, buildRichResponse, sendRichResponse,
  _setAirichHttpForTest, _resetAirichHttpForTest,
} from "../../src/lib/nova-airich.js";

const DB = "/tmp/airich-engine-db.json";
fs.rmSync(DB, { recursive: true, force: true });
await initDatabase(DB);

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const t = (name, ok, extra) => {
  w((ok ? "✅ " : "❌ ") + name + (ok ? "" : extra ? " — " + extra : ""));
  ok ? pass++ : fail++;
};

const CERT = [{ kid: "a" }, { kid: "b" }];
const HTML = "<!DOCTYPE html><html><body><div class=\"card\"><canvas id=\"c\"></canvas>" + "<p>engine fixture </p>".repeat(40) + "</div></body></html>";

// ═══ 1. buildRichResponse ═══
w("\n— buildRichResponse —");
const r = buildRichResponse(HTML, CERT);
t("  struktur verbatim: proofs v1 + certificateChain + STANDARD + bot JID",
  (() => { const p = r.messageContextInfo.botMetadata.verificationMetadata.proofs[0];
    return p.version === 1 && p.useCase === "NOXZA_EXE" && p.certificateChain === CERT
      && r.botForwardedMessage.message.richResponseMessage.messageType === "AI_RICH_RESPONSE_TYPE_STANDARD"
      && r.botForwardedMessage.message.richResponseMessage.contextInfo.forwardedAiBotMessageInfo.botJid === "867051314767696@bot"; })());
t("  payload base64 ke-decode = HTML asli",
  JSON.parse(Buffer.from(r.botForwardedMessage.message.richResponseMessage.unifiedResponse.data, "base64").toString("utf-8")).sections[0].view_model.primitive.payload === HTML);
t("  opts: title + responseId + botResponseId custom",
  (() => { const r2 = buildRichResponse(HTML, CERT, { title: "T", responseId: "rid", botResponseId: "bid" });
    return r2.botForwardedMessage.message.richResponseMessage.submessages[0].messageText === "T"
      && JSON.parse(Buffer.from(r2.botForwardedMessage.message.richResponseMessage.unifiedResponse.data, "base64").toString("utf-8")).response_id === "rid"
      && r2.messageContextInfo.botMetadata.botResponseId === "bid"; })());

// ═══ 2. polishPayload ═══
w("\n— polishPayload —");
const p = polishPayload(HTML);
t("  bottom sheet + meta viewport + anti-geser ke-inject",
  p.includes("data-nova-bottomsheet") && p.includes("<meta name=\"viewport\"") && /overscroll-behavior: contain/.test(p));
t("  idempoten", polishPayload(p) === p);

// ═══ 3. fetchCertificate — cache 10 mnt + error kosong ═══
w("\n— fetchCertificate —");
_setAirichHttpForTest({ getJson: async () => CERT });
const c1 = await fetchCertificate(true);
t("  fetch ok + cache hit (call ke-2 gak nyentuh http)", c1 === CERT && (await fetchCertificate()) === CERT);
_setAirichHttpForTest({ getJson: async () => [] });
let certErr = "";
try { await fetchCertificate(true); } catch (e) { certErr = e.message; }
t("  certificate kosong → throw ramah", /certificate chain kosong/.test(certErr));
_resetAirichHttpForTest();

// ═══ 4. sendRichResponse — satu pintu ═══
w("\n— sendRichResponse —");
const relays = [];
const sock = { relayMessage: async (chat, msg, o) => { relays.push({ chat, msg }); return {}; } };
await sendRichResponse(sock, "g@test", HTML, { title: "Google 🔍" });
t("  polish→rakit→relay: 1x relay ke chat, payload ke-polish",
  relays.length === 1 && relays[0].chat === "g@test"
  && JSON.parse(Buffer.from(relays[0].msg.botForwardedMessage.message.richResponseMessage.unifiedResponse.data, "base64").toString("utf-8")).sections[0].view_model.primitive.payload.includes("data-nova-bottomsheet"));
t("  opts.title nyampe ke submessage", relays[0].msg.botForwardedMessage.message.richResponseMessage.submessages[0].messageText === "Google 🔍");

// ═══ 5. live certificate ═══
w("\n— live certificate (noxXza) —");
try {
  const live = await fetchCertificate(true);
  t("  live fetch: chain 2", Array.isArray(live) && live.length === 2, "chain=" + (live && live.length));
} catch (e) {
  t("  live fetch (skip kalau offline)", false, e.message);
}

w("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
