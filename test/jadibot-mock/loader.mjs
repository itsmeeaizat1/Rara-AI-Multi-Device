// Loader ESM: petakan "nova" → mock, "src/handler.js" → stub recorder.
import { pathToFileURL } from "node:url";
const MOCK_NOVA = new URL("./nova-mock.mjs", import.meta.url).href;
const HANDLER_STUB = new URL("./handler-stub.mjs", import.meta.url).href;
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "nova") return { url: MOCK_NOVA, shortCircuit: true };
  const r = await nextResolve(specifier, context);
  if (r.url.endsWith("/src/handler.js")) return { url: HANDLER_STUB, shortCircuit: true };
  return r;
}
export { pathToFileURL };
