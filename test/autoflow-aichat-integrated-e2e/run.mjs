// E2E autoflow-aichat-integrated-e2e — verifikasi FIX 29 Sep: rule aichat autoflow
// (.anovaagent free-chat) GANTI dari askAI() single-shot ke runAgent() ENGINE
// PENUH (browsing/skill/mcp/tools terintegrasi) + anti-sapaan-template.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const R = path.resolve(process.cwd());
let pass = 0, fail = 0, total = 0;
const ok = (name, cond, extra) => { total++; if (cond) { pass++; console.log("  ✓ " + name); } else { fail++; console.log("  ❌ " + name + (extra ? " → " + String(extra).slice(0, 200) : "")); } };

console.log("─── 1. source: autoflow.js case aichat pakai runAgent (bukan askAI mentah) ───");
const src = fs.readFileSync(path.join(R, "src/lib/autoflow.js"), "utf8");
ok("import askAI mentah SUDAH DIHAPUS (bukti gak dipakai lagi)", !/import \{ askAI \}/.test(src));
ok("case aichat pakai runAgent() (engine penuh sama .aisuperagent)", src.includes('const { runAgent } = await import("./rara-agent.js")'));
ok("case aichat wire buildToolbox (skill+mcp terpasang)", src.includes("buildToolbox"));
ok("case aichat wire buildExecutors+execAction (tools/aksi sungguhan)", src.includes("buildExecutors") && src.includes("execAction"));
ok("case aichat wire skillsBlock (183 skill progressive disclosure)", src.includes("skillsBlock(userText)"));
ok("memory jangka panjang tetap nyambung (memoryBlock + extractMemories)", src.includes("memoryBlock(getDatabase(), user") && src.includes("extractMemories(getDatabase(), user"));
ok("gaya custom owner (rule.value) tetap dihormati via styleNote, TIDAK maksa mode", src.includes("styleNote"));

console.log("─── 2. rara-agent.js: anti-sapaan-template (bug HAI!😊 berulang) ───");
const na = fs.readFileSync(path.join(R, "src/lib/rara-agent.js"), "utf8");
ok("personaPrompt: larangan sapaan template ada di SEMUA cabang (persona & default)", (na.match(/antiGreeting/g) || []).length >= 3);
ok("SYS_ANSWER research: larang mulai dgn sapaan template juga", na.includes('jangan mulai dengan sapaan template'));
ok("diktat gaya WAJIB lama SUDAH TETAP HILANG (regresi upgrade sebelumnya)", !na.includes("ATURAN PERSONA (WAJIB DIPATUHI)"));

console.log("─── 2b. REGRESI BUG (1 Okt 2026): .anovaagent balas 'hai' malah lanjut topik lama (API error) ───");
ok("antiGreeting kasih pengecualian sapaan singkat polos (hai/halo/p/test) — JANGAN paksa lanjut topik lama", /TAPI kalau pesan TERBARU dari user cuma sapaan singkat/.test(na));
ok("pengecualian itu nyebut contoh \"hai\"/\"halo\" eksplisit", na.includes('"hai", "halo"'));
{
  const { runAgent: runAgentForGreet, setAgentDeps: setDepsForGreet, resetAgentDeps } = await import(pathToFileURL(path.join(R, "src/lib/rara-agent.js")).href);
  let seenSystemPrompt = "";
  const mockAiGreet = async (prompt, opts) => {
    if (opts?.systemPrompt?.includes("perencana aksi")) return JSON.stringify({ mode: "persona", persona: null });
    seenSystemPrompt = opts?.systemPrompt || "";
    return "hai juga! santai aja, ada yang mau diobrolin?";
  };
  setDepsForGreet({ aiChat: mockAiGreet });
  const histBlock = "Riwayat obrolanmu dengan Aizat sebelumnya (terbaru di bawah — pakai sebagai konteks, jangan ulangi jawaban yang sama):\nAizat: kenapa error api groq?\nKamu: itu karena API key expired, perlu di-regenerate\n\nhai";
  const resGreet = await runAgentForGreet(histBlock);
  ok("mode persona kepilih buat sapaan singkat (bukan lanjut riset API)", resGreet?.mode === "persona", JSON.stringify(resGreet));
  ok("system prompt yang dikirim ke model BAWA pengecualian sapaan (akar fix)", seenSystemPrompt.includes("JANGAN langsung nyemplung jawab panjang soal topik lama"), seenSystemPrompt.slice(0, 120));
  resetAgentDeps();
}

console.log("─── 3. functional: runAgent nyambung ke mode research (browsing beneran) ───");
const { runAgent, setAgentDeps } = await import(pathToFileURL(path.join(R, "src/lib/rara-agent.js")).href);
{
  // mock plan → research + mock search/preview/ai supaya jalur browsing kepakai
  let planCalls = 0;
  const mockAi = async (prompt, opts) => {
    planCalls++;
    if (opts?.systemPrompt?.includes("perencana aksi")) {
      return JSON.stringify({ mode: "research", queries: ["berita kapal tenggelam indonesia"] });
    }
    if (opts?.systemPrompt?.includes("kurator riset")) return JSON.stringify({ picks: [1] });
    if (opts?.systemPrompt?.includes("analis riset")) return "KM Sejahtera tenggelam di perairan Selayar, 12 korban dievakuasi. [S1]";
    return "";
  };
  const mockSearch = async (q) => ({ items: [{ url: "https://detik.com/x", title: "Kapal tenggelam", domain: "detik.com", snippet: "info" }] });
  const mockPreview = async (u) => ({ text: "Detail kejadian kapal tenggelam di Selayar, evakuasi 12 orang." });
  setAgentDeps({ aiChat: mockAi, search: mockSearch, preview: mockPreview });
  const res = await runAgent("cari berita viral kapal tenggelam di indonesia");
  ok("mode research BENERAN kepilih (bukan diam/gak bisa jawab)", res?.mode === "research", JSON.stringify(res));
  ok("jawaban berbasis bukti browsing (bukan template kosong)", /kapal tenggelam|selayar/i.test(res?.answer || ""), res?.answer);
  ok("planner (SYS_PLAN) beneran dipanggil (bukti pipeline plan→search→pick→read→compose jalan)", planCalls >= 3);
}

console.log(`─── hasil: ${pass}/${total} ${pass === total ? "PASSED ✓" : "ADA YANG GAGAL ✗"} ───`);
process.exit(fail ? 1 : 0);
