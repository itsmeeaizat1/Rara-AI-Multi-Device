// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// e2e otak agent: 9router lokal dulu, rantai lama sebagai cadangan
import * as B from "../../src/lib/rara-agent-brain.js";

let pass = 0, fail = 0;
const ok = (c, n) => { if (c) { pass++; console.log("  ✓", n); } else { fail++; console.log("  ✗", n); } };
const rejects = async (p, re, n) => { try { await p; ok(false, n + " (harusnya reject)"); } catch (e) { ok(re.test(e.message), n + " → " + e.message.slice(0, 70)); } };

let clock = 1_000_000;
const calls = { router: [], chain: [] };
const setup = ({ routerImpl, up = true } = {}) => {
  B._resetBrainForTest();
  calls.router = []; calls.chain = [];
  clock = 1_000_000;
  B._setBrainDepsForTest({
    now: () => clock,
    isUp: async () => up,
    routerChat: routerImpl || (async (o) => { calls.router.push(o); return { text: "JAWAB-9ROUTER", model: o.model }; }),
    chainChat: async (p, o) => { calls.chain.push({ p, o }); return "JAWAB-CHAIN"; },
  });
};
delete process.env.AGENT_BRAIN; delete process.env.AGENT_BRAIN_MODEL;

console.log("[1] 9router jadi otak utama (bukan Min1AI/Qwen)");
{
  setup();
  const r = await B.brainChat("halo", { systemPrompt: "SYS" });
  ok(r === "JAWAB-9ROUTER", "jawaban dari 9router");
  ok(calls.chain.length === 0, "rantai lama (Min1AI dst.) TIDAK disentuh");
  ok(calls.router[0].system === "SYS" && calls.router[0].user === "halo", "system prompt & prompt diteruskan");
  ok(calls.router[0].temperature === 0.4 && calls.router[0].maxTokens === 4096, "temperature rendah & maxTokens besar untuk agent");
  ok(B.getBrainStatus().last.brain === "9router", "status jujur: otak = 9router");
  ok(B.getBrainStatus().counts.router9 === 1, "counter router9");
}

console.log("[2] pemilihan model");
{
  setup();
  await B.brainChat("x");
  ok(calls.router[0].model === "alicode-intl/glm-4.7", "default = ROUTER9_DEFAULT_MODEL");
  B.setBrainModel("openai/gpt-5");
  await B.brainChat("x");
  ok(calls.router[1].model === "openai/gpt-5", "setBrainModel runtime");
  await B.brainChat("x", { model9: "anthropic/claude" });
  ok(calls.router[2].model === "anthropic/claude", "opts.model9 per-panggilan menang");
  B.setBrainModel(null);
  process.env.AGENT_BRAIN_MODEL = "groq/llama";
  await B.brainChat("x");
  ok(calls.router[3].model === "groq/llama", "env AGENT_BRAIN_MODEL");
  delete process.env.AGENT_BRAIN_MODEL;
}

console.log("[3] 9router mati → cadangan, tanpa menunggu lama");
{
  setup({ up: false });
  const r = await B.brainChat("halo");
  ok(r === "JAWAB-CHAIN", "jatuh ke rantai lama saat 9router tak jalan");
  ok(calls.router.length === 0, "router TIDAK dipanggil saat health-check gagal (tak memicu spawn 30 dtk)");
  const st = B.getBrainStatus();
  ok(st.last.brain === "chain" && /9router lokal belum jalan/.test(st.last.error), "status jujur: alasan jatuh ke cadangan terlihat");
}

console.log("[4] circuit breaker");
{
  let n = 0;
  setup({ routerImpl: async () => { n++; throw new Error("HTTP 500"); } });
  await B.brainChat("1"); await B.brainChat("2");
  ok(!B.getBrainStatus().breakerOpen && n === 2, "2 gagal: breaker masih tertutup");
  await B.brainChat("3");
  ok(B.getBrainStatus().breakerOpen && n === 3, "gagal ke-3: breaker TERBUKA");
  const r = await B.brainChat("4");
  ok(r === "JAWAB-CHAIN" && n === 3, "breaker terbuka: 9router DILEWATI (tidak dipanggil lagi)");
  ok(B.getBrainStatus().counts.skipped === 1, "counter skipped");
  ok(B.getBrainStatus().breakerRemainingSec > 290, "sisa cooldown ~5 menit");
  clock += 5 * 60 * 1000 + 1;
  ok(!B.getBrainStatus().breakerOpen, "setelah 5 menit breaker menutup");
  B._setBrainDepsForTest({ routerChat: async (o) => { n++; return { text: "PULIH", model: o.model }; } });
  const r2 = await B.brainChat("5");
  ok(r2 === "PULIH" && n === 4, "dicoba lagi & pulih ke 9router");
  ok(B.getBrainStatus().consecutiveFails === 0 && !B.getBrainStatus().breakerOpen, "sukses mereset hitungan gagal");
}

console.log("[5] saklar AGENT_BRAIN");
{
  setup();
  process.env.AGENT_BRAIN = "chain";
  const r = await B.brainChat("x");
  ok(r === "JAWAB-CHAIN" && calls.router.length === 0, "AGENT_BRAIN=chain → perilaku lama persis");
  process.env.AGENT_BRAIN = "9router-only";
  setup({ up: false });
  await rejects(B.brainChat("x"), /9router gagal/, "9router-only: tanpa cadangan, error jujur");
  ok(calls.chain.length === 0, "9router-only: rantai lama tak disentuh");
  process.env.AGENT_BRAIN = "asal";
  setup();
  ok(B.getBrainMode() === "9router", "nilai asing → default 9router");
  delete process.env.AGENT_BRAIN;
}

console.log("[6] respons kosong = gagal, bukan sukses palsu");
{
  setup({ routerImpl: async () => ({ text: "   ", model: "m" }) });
  const r = await B.brainChat("x");
  ok(r === "JAWAB-CHAIN", "balasan kosong 9router → cadangan");
  ok(/kosong/.test(B.getBrainStatus().last.error || ""), "alasan 'kosong' tercatat");
}

console.log("[7] kedua sumber mati → error naik apa adanya");
{
  B._resetBrainForTest();
  B._setBrainDepsForTest({ isUp: async () => false, chainChat: async () => { throw new Error("Semua fallback AI gagal"); } });
  await rejects(B.brainChat("x"), /Semua fallback AI gagal/, "error cadangan tidak ditelan");
}

B._resetBrainForTest();
console.log(`\nTOTAL: ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
