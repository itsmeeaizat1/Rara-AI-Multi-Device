// Loader ESM: petakan "rara" → mock. src/handler.js → stub HANYA untuk e2e.mjs
// (E2E_REAL_HANDLER=1 → handler ASLI dipakai, untuk test ctx jadibot di dispatcher).
import { pathToFileURL } from "node:url";
const MOCK_NOVA = new URL("./rara-mock.mjs", import.meta.url).href;
const HANDLER_STUB = new URL("./handler-stub.mjs", import.meta.url).href;
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "rara") return { url: MOCK_NOVA, shortCircuit: true };
  const r = await nextResolve(specifier, context);
  if (process.env.E2E_REAL_HANDLER !== "1" && r.url.endsWith("/src/handler.js")) {
    return { url: HANDLER_STUB, shortCircuit: true };
  }
  return r;
}
export { pathToFileURL };
