// NOVA AI WHATSAPP BOT — E2E: AGENT SKILLS LAYER (25 Sep 2026, owner
// "183 skill sekaligus" dari wshobson/agents, spec Anthropic Agent Skills).
// Dicover: index 183, tokenizer hyphen, progressive disclosure (skillsBlock
// kosong kalau gak ada match), cap isi, plugin .skill (list/detail/match).
import {
  matchSkills, getSkillBody, skillsBlock, findSkill, listSkills,
  skillCount, _setSkillsIndexForTest, _resetSkillsForTest,
} from "../../src/lib/nova-askills.js";
import { config as skillCfg, handler as skillH } from "../../plugins/ai-agent/skill.js";

let pass = 0, fail = 0;
// output menu/reply Nova = smallcaps — asersi wajib lewat fromSC
const SC_MAP = { 'ᴀ':'a','ʙ':'b','ᴄ':'c','ᴅ':'d','ᴇ':'e','ꜰ':'f','ɢ':'g','ʜ':'h','ɪ':'i','ᴊ':'j','ᴋ':'k','ʟ':'l','ᴍ':'m','ɴ':'n','ᴏ':'o','ᴘ':'p','ʀ':'r','ꜱ':'s','ᴛ':'t','ᴜ':'u','ᴠ':'v','ᴡ':'w','ʏ':'y','ᴢ':'z' };
const fromSC = (s) => String(s || "").split("").map((c) => SC_MAP[c] || c).join("");
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : extra ? ` — ${String(extra).slice(0, 160)}` : "")); ok ? pass++ : fail++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── 1. INDEX — 183 skill dimuat ───
w("\n— 1. index —");
_resetSkillsForTest();
check("1a. total skill 183", skillCount() === 183, skillCount());
check("1b. listSkills() 183 entri", listSkills().length === 183, listSkills().length);
check("1c. listSkills filter 'react' > 0", listSkills("react").length > 0);
check("1d. findSkill e2e-testing-patterns", findSkill("e2e-testing-patterns")?.n === "e2e-testing-patterns");
check("1e. findSkill parsial 'e2e-testing' tetep ketemu", findSkill("e2e-testing")?.n === "e2e-testing-patterns");
check("1f. findSkill gak ada → null", findSkill("skill-ngawur-xyz") === null);

// ─── 2. TOKENIZER — nama hyphen tetep match per kata ───
w("\n— 2. tokenizer —");
{
  const m1 = matchSkills("bikin e2e test buat checkout flow pakai playwright", 1);
  check("2a. 'e2e test playwright' → e2e-testing-patterns", m1[0]?.name === "e2e-testing-patterns", JSON.stringify(m1));
  const m2 = matchSkills("optimasi query database yang lambat", 1);
  check("2b. 'optimasi query database' → sql-optimization-patterns", m2[0]?.name === "sql-optimization-patterns", JSON.stringify(m2));
  const m3 = matchSkills("deploy kubernetes manifest buat service baru", 1);
  check("2c. 'kubernetes manifest' → k8s-manifest-generator", m3[0]?.name === "k8s-manifest-generator", JSON.stringify(m3));
}

// ─── 3. PROGRESSIVE DISCLOSURE ───
w("\n— 3. progressive disclosure —");
{
  const noMatch = skillsBlock("cari resep nasi goreng enak");
  check("3a. tugas gak nyambung → blok kosong", noMatch === "", JSON.stringify(noMatch).slice(0, 80));
  const yes = skillsBlock("bikin e2e test buat checkout flow pakai playwright");
  check("3b. tugas nyambung → blok berisi", yes.length > 100, yes.length);
  check("3c. blok ada header PANDUAN SPESIALIS", yes.includes("PANDUAN SPESIALIS"), "");
  check("3d. blok ada nama skill ── ⚙ e2e-testing-patterns ──", yes.includes("⚙ e2e-testing-patterns"), "");
  check("3e. blok gak ada frontmatter ---", !yes.includes("\n---\n"), "");
  const big = skillsBlock("migrate react class component ke hooks modernization");
  check("3f. multi-skill → blok tetap dibatasi max 3", (big.match(/── ⚙/g) || []).length <= 3, (big.match(/── ⚙/g) || []).length);
}

// ─── 4. GETSKILLBODY — cap + sanitasi ───
w("\n— 4. getSkillBody —");
{
  const body = getSkillBody("code-review-excellence");
  check("4a. body ada isi tanpa frontmatter", body.length > 200 && !body.startsWith("---"), body.slice(0, 60));
  const tiny = getSkillBody("code-review-excellence", 50);
  check("4b. cap kecil → dipotong + penanda", tiny.length <= 130 && tiny.includes("dipotong"), tiny.slice(-60));
  check("4c. nama injeksi path '../..' → kosong", getSkillBody("../../../etc/passwd") === "");
  check("4d. nama gak ada → kosong", getSkillBody("skill-tak-ada") === "");
}

// ─── 5. SEAM E2E — index palsu ───
w("\n— 5. seam —");
{
  _setSkillsIndexForTest([{ n: "fake-skill", d: "Testing testing patterns unit" }]);
  check("5a. index palsu terpakai", skillCount() === 1);
  const m = matchSkills("testing unit patterns cek", 1);
  check("5b. match dari index palsu", m[0]?.name === "fake-skill", JSON.stringify(m));
  _resetSkillsForTest();
  check("5c. reset → balik 183", skillCount() === 183);
}

// ─── 6. PLUGIN .skill — handler ───
w("\n— 6. plugin .skill —");
{
  const sent = [];
  const mkM = (text) => ({ text, chat: "x@s.whatsapp.net", sender: "o@s.whatsapp.net", reply: async (t) => { sent.push(String(t)); } });
  const clear = () => { sent.length = 0; };

  // usage
  await skillH(mkM(".skill"), {});
  check("6a. .skill kosong → kartu usage (smallcaps-aware)", /183 skill spesialis/.test(fromSC(sent[0] || "")), (sent[0] || "").slice(0, 80));

  // list
  await skillH(mkM(".skill list"), {});
  const listOut = sent.join("\n");
  check("6b. .skill list → header + total", listOut.includes("SKILL") && listOut.includes("183"), listOut.slice(0, 100));

  // list filter
  clear();
  await skillH(mkM(".skill list react"), {});
  check("6c. .skill list react → cuma yang cocok", (sent.join("\n").match(/SKILL/g) || []).length > 0 && !sent.join("\n").includes("e2e-testing-patterns"), "");

  // list filter kosong
  clear();
  await skillH(mkM(".skill list ngawurxyz"), {});
  check("6d. filter gak ketemu → pesan gak ada (smallcaps-aware)", /gak ada skill yang cocok/.test(fromSC(sent[0] || "")), (sent[0] || "").slice(0, 80));

  // detail
  clear();
  await skillH(mkM(".skill e2e-testing-patterns"), {});
  const det = sent.join("\n");
  check("6e. .skill <nama> → nama + deskripsi + isi", det.includes("E2E-TESTING-PATTERNS") && det.includes("Playwright"), det.slice(0, 100));

  // detail gak ada
  clear();
  await skillH(mkM(".skill ngawurxyz"), {});
  check("6f. nama salah → skill tidak ada", /gak ketemu/.test(sent[0] || ""), (sent[0] || "").slice(0, 80));

  // match
  clear();
  await skillH(mkM(".skill match bikin e2e test playwright"), {});
  const mt = sent[0] || "";
  check("6g. .skill match → skor + nama skill", mt.includes("SKILL MATCH") && mt.includes("e2e-testing-patterns"), mt.slice(0, 100));

  // match tanpa tugas
  clear();
  await skillH(mkM(".skill match"), {});
  check("6h. .skill match tanpa tugas → panduan (smallcaps-aware)", /skill apa aja yang bakal/.test(fromSC(sent[0] || "")), (sent[0] || "").slice(0, 80));

  // match gak nyambung
  clear();
  await skillH(mkM(".skill match masak rendang"), {});
  check("6i. match gak nyambung → jujur gak ada", /Gak ada skill yang nyambung/.test(sent[0] || ""), (sent[0] || "").slice(0, 80));

  // count
  clear();
  await skillH(mkM(".skill count"), {});
  check("6j. .skill count → 183", (sent[0] || "").includes("183"), (sent[0] || "").slice(0, 80));
}

// ─── 7. HOOK PINTU AI — import gak meledak + param nyambung ───
w("\n— 7. hook pintu AI —");
{
  const agentMod = await import("../../src/lib/nova-agent.js");
  check("7a. runAgent masih ekspor fungsi", typeof agentMod.runAgent === "function");
  const src = (await import("node:fs")).readFileSync(new URL("../../src/lib/nova-agent.js", import.meta.url), "utf-8");
  check("7b. runAgent nerima skillBlock", /skillBlock \} = \{\}\)/.test(src) || /skillBlock/.test(src), "");
  check("7c. skillBlock di-inject ke prompt (≥3 titik)", (src.match(/\$\{skl\}/g) || []).length >= 3, (src.match(/\$\{skl\}/g) || []).length);
  const loopSrc = (await import("node:fs")).readFileSync(new URL("../../plugins/ai-agent/agentloop.js", import.meta.url), "utf-8");
  check("7d. agentloop panggil skillsBlock(goal)", /skillsBlock\(run\.plan\.goal\)/.test(loopSrc), "");
  const taskSrc = (await import("node:fs")).readFileSync(new URL("../../plugins/ai-agent/autotask.js", import.meta.url), "utf-8");
  check("7e. autotask panggil skillsBlock(task)", /skillsBlock\(task\.task\)/.test(taskSrc), "");
  const aiSrc = (await import("node:fs")).readFileSync(new URL("../../plugins/ai-agent/agent.js", import.meta.url), "utf-8");
  check("7f. novaagent/aisuperagent pass skillBlock(task)", /skillBlock: skillsBlock\(task\)/.test(aiSrc), "");
}

setTimeout(() => { try { w(`\n===== ${pass} PASS, ${fail} FAIL =====`); process.exit(fail ? 1 : 0); } catch {} }, 300);
