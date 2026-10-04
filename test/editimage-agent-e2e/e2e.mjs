// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// e2e: tool editimage di semua agent (novaagent TOOLS, aisuperagent/anovaagent buildExecutors)
import { _setClothesDepsForTest } from "../../plugins/ai-image/clotheschanger.js";
import { buildExecutors } from "../../plugins/ai-agent/agent.js";
import { TOOLS, TOOL_TOPIC, TOOL_NATURAL_DOING } from "../../src/lib/aiagent.js";
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (c, n) => { if (c) { pass++; console.log("  ✓", n); } else { fail++; console.log("  ✗", n); } };

const IMG = Buffer.alloc(2000, 7);
const OUT = Buffer.alloc(6000, 9);
const prompts = [];
_setClothesDepsForTest({
  live3d: async (_b, p) => { prompts.push(p); return { image: OUT }; },
  polish: async (b) => Buffer.concat([b, Buffer.from("P")]),
  upscale: async (b) => Buffer.concat([b, Buffer.from("U")]),
});

function mkM({ withImg = true } = {}) {
  const sent = [];
  const m = {
    chat: "123@g.us", sender: "62811@s.whatsapp.net", prefix: ".", isImage: withImg,
    download: async () => IMG, quoted: null,
  };
  const sock = { sendMessage: async (jid, c) => { sent.push(c); } };
  return { m, sock, sent };
}

console.log("[1] aisuperagent/anovaagent — buildExecutors.editimage");
{
  const { m, sock, sent } = mkM();
  const ex = buildExecutors(m, sock, {}, IMG, {}, null);
  ok(typeof ex.editimage === "function", "executor editimage terdaftar");
  const r = await ex.editimage({ prompt: "formal", mode: "clothes" });
  ok(r.ok === true, "edit clothes sukses");
  ok(sent.length === 1 && Buffer.isBuffer(sent[0].image), "gambar terkirim sebagai Buffer");
  ok(/outfit/i.test(prompts.at(-1)), "prompt mode clothes dipakai");
  const r2 = await ex.editimage({ prompt: "pantai bali", mode: "bg" });
  ok(r2.ok && /background/i.test(prompts.at(-1)), "mode bg");
  const r3 = await ex.editimage({ prompt: "kursi", mode: "remove" });
  ok(r3.ok && /Remove kursi/i.test(prompts.at(-1)), "mode remove");
  const r4 = await ex.editimage({ prompt: "formal hd", mode: "clothes" });
  ok(r4.ok && sent.at(-1).image.length === OUT.length + 1, "flag hd -> polish");
  const r5 = await ex.editimage({ prompt: "formal hd2", mode: "clothes" });
  ok(r5.ok && sent.at(-1).image.length === OUT.length + 1, "flag hd2 -> upscale");
  const ex2 = buildExecutors(m, sock, {}, null, {}, null);
  const r6 = await ex2.editimage({ prompt: "formal" });
  ok(r6.ok === false && /gambar/i.test(r6.msg), "tanpa gambar -> gagal jujur");
  const r7 = await ex.editimage({ prompt: "" });
  ok(r7.ok === false, "prompt kosong -> gagal jujur");
}

console.log("[2] novaagent — TOOLS.editimage");
{
  ok(!!TOOLS.editimage && typeof TOOLS.editimage.run === "function", "TOOLS.editimage ada");
  ok(TOOLS.editimage.perm === "user" && TOOLS.editimage.danger === false, "perm user, non-danger");
  ok(TOOL_TOPIC.editimage && TOOL_NATURAL_DOING.editimage, "topic + natural doing");
  const { m, sock, sent } = mkM();
  await TOOLS.editimage.run(sock, m, { prompt: "pantai", mode: "bg" });
  ok(sent.length === 1 && Buffer.isBuffer(sent[0].image), "novaagent kirim gambar edit");
  const mNo = mkM({ withImg: false });
  let threw = false;
  try { await TOOLS.editimage.run(mNo.sock, mNo.m, { prompt: "x" }); } catch { threw = true; }
  ok(threw, "tanpa gambar -> throw");
}

console.log("[3] prompt planner");
{
  const ra = readFileSync(new URL("../../src/lib/rara-agent.js", import.meta.url), "utf8");
  const ai = readFileSync(new URL("../../src/lib/aiagent.js", import.meta.url), "utf8");
  ok(ra.includes("getToolList"), "rara-agent pakai registry tool");
  const { hasTool, describeTools } = await import("../../src/lib/rara-agent-registry.js");
  ok(hasTool("editimage"), "registry punya editimage");
  ok(/editimage/i.test(describeTools()) && /EDIT gambar/i.test(describeTools()), "SYS_PLAN jelasin editimage");
  ok(/"tool":"editimage"/.test(ai), "think() few-shot editimage");
}

console.log(`\nTOTAL: ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
