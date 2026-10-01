// E2E fitur masa depan: hotreload, rag, email, iot
import { initDatabase } from "../../src/lib/rara-database.js";
import * as hr from "../../src/lib/rara-hotreload.js";
import * as rag from "../../src/lib/rara-rag.js";
import * as mail from "../../src/lib/rara-emailbot.js";
import * as iot from "../../src/lib/rara-mqtt.js";

let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (detail ? " — " + detail : "")); }
};

console.log("─── Future Features e2e ───");
await initDatabase();

// ═══ 1. Registry: 4 plugin ke-load dengan config bener
{
  const mods = await Promise.all([
    import("../../plugins/owner/hotreload.js"),
    import("../../plugins/ai/rag.js"),
    import("../../plugins/owner/email.js"),
    import("../../plugins/owner/iot.js"),
  ]);
  const [hot, ragP, mailP, iotP] = mods.map((x) => x.config);
  ok("plugin hotreload: name + owner-only", hot.name === "hotreload" && hot.isOwner === true);
  ok("plugin rag: name + kategori ai + bukan owner", ragP.name === "rag" && ragP.category === "ai" && ragP.isOwner === false);
  ok("plugin email: name + owner-only", mailP.name === "email" && mailP.isOwner === true);
  ok("plugin iot: name + owner-only", iotP.name === "iot" && iotP.isOwner === true);
  ok("semua handler ter-export", mods.every((x) => typeof x.handler === "function"));
}

// ═══ 2. Hot reload
{
  const r = hr.enableHotreload("owner@s.whatsapp.net");
  ok("enable: watcher nyala", r.ok === true && hr.isHotreloadActive() === true);
  const s = hr.hotreloadStatus();
  ok("status: flag on + notifyTo kesimpen", s.on === true && s.notifyTo === "owner@s.whatsapp.net");
  const rl = await hr.manualReload("plugins/owner/webpanel.js");
  ok("manual reload file nyata sukses", rl.ok === true, JSON.stringify(rl));
  const bad = await hr.manualReload("src/lib/rara-rag.js");
  ok("manual reload nolak path luar plugins/", bad.ok === false);
  hr.disableHotreload();
  ok("disable: watcher mati + flag off", hr.isHotreloadActive() === false && hr.hotreloadStatus().on === false);
}

// ═══ 3. RAG
{
  ok("tokenize: buang stopwords & tanda baca", JSON.stringify(rag.tokenize("Yang, dan di ke Untuk! rara")) === JSON.stringify(["rara"]));
  const chunks = rag.chunkText("a".repeat(3000), 1200, 150);
  ok("chunkText: kepotong dengan overlap", chunks.length >= 3 && chunks[0].length <= 1200);
  const ex = await rag.extractDocText("catatan.txt", Buffer.from("isi dokumen teks"));
  ok("extractDocText txt ok", ex.ok === true && ex.text.includes("isi dokumen"));
  const exBad = await rag.extractDocText("virus.exe", Buffer.from("x"));
  ok("extractDocText nolak format asing", exBad.ok === false);

  const save = rag.saveDoc({ name: "modul fisika", from: "u1@s", text: "Hukum Newton pertama menyatakan benda tetap diam kecuali ada gaya. Hukum kedua: F sama m kali a. Momentum adalah massa kali kecepatan." });
  ok("saveDoc sukses + id format", save.ok === true && /^doc-[a-f0-9]+$/.test(save.id), JSON.stringify(save));
  ok("listDocs kefilter per user", rag.listDocs("u1@s").length === 1 && rag.listDocs("u2@s").length === 0);
  const search = rag.searchDocs("hukum newton gaya", "u1@s");
  ok("searchDocs nemu konteks relevan", search.ok === true && search.results.length > 0 && search.results[0].doc === "modul fisika");
  const searchNone = rag.searchDocs("resep rendang", "u1@s");
  ok("searchDocs jujur gak nemu", searchNone.ok === false);
  const info = rag.getDoc(save.id, "u2@s");
  ok("getDoc isolasi user lain", info === null);
  ok("bm25: dokumen relevan menang", rag.bm25Rank(["newton"], [
    { tokens: ["newton", "gaya", "benda"] },
    { tokens: ["masak", "rendang", "santan"] },
  ])[0].ref.tokens.includes("newton"));
  ok("deleteDoc sukses", rag.deleteDoc(save.id, "u1@s").ok === true && rag.listDocs("u1@s").length === 0);
}

// ═══ 4. Email
{
  ok("validateEmailAddr valid/tolak", mail.validateEmailAddr("aku@gmail.com") === true && mail.validateEmailAddr("bukan-email") === false);
  const set = mail.setEmailConfig("aku@gmail.com", "app-pass-123");
  ok("setEmailConfig auto-host gmail", set.ok === true && set.config.smtpHost === "smtp.gmail.com" && set.config.imapHost === "imap.gmail.com");
  const setBad = mail.setEmailConfig("jelek", "x");
  ok("setEmailConfig nolak alamat salah", setBad.ok === false);
  mail._setTransportForTest({ sendMail: async () => ({ messageId: "<test123@mail>" }) });
  const send = await mail.sendEmail("teman@yahoo.com", "Tes", "Halo dari Rara");
  ok("sendEmail via seam sukses", send.ok === true && send.id === "<test123@mail>", JSON.stringify(send));
  const sendBad = await mail.sendEmail("bukan-addr", "Tes", "x");
  ok("sendEmail nolak tujuan salah", sendBad.ok === false);
  mail._setTransportForTest(null);
  mail.clearEmailConfig();
  ok("clearEmailConfig bersih", mail.getEmailConfig() === null);
}

// ═══ 5. IoT/MQTT
{
  ok("topicMatches wildcard #", iot.topicMatches("rumah/#", "rumah/lampu/ruang/on") === true);
  ok("topicMatches wildcard +", iot.topicMatches("rumah/+/suhu", "rumah/dapur/suhu") === true);
  ok("topicMatches nolak beda topik", iot.topicMatches("rumah/#", "kantor/ac/on") === false && iot.topicMatches("rumah/lampu", "rumah/lampu2") === false);
  iot._setIotClientForTest({
    publish: (t, m, o, cb) => cb && cb(null),
    subscribe: () => {},
    unsubscribe: () => {},
    end: () => {},
  });
  ok("iotSubscribe nyatet langganan", iot.iotSubscribe("rumah/suhu/#", "owner@s").ok === true && iot.iotStatus().subs.includes("rumah/suhu/#"));
  const pub = await iot.iotPublish("rumah/lampu/on", "1");
  ok("iotPublish via seam sukses", pub.ok === true);
  iot.iotUnsubscribe("rumah/suhu/#", "owner@s");
  ok("iotUnsubscribe bersihin", !iot.iotStatus().subs.includes("rumah/suhu/#"));
  iot.iotDisconnect();
  ok("iotDisconnect reset status", iot.iotStatus().connected === false && iot.iotStatus().subs.length === 0);
}

console.log("─── hasil: " + pass + "/" + (pass + fail) + (fail ? " FAILED" : " PASSED ✓") + " ───");
process.exit(fail ? 1 : 0);
