import { pathToFileURL } from "node:url";
const NOVA_STUB = new URL("./nova-stub.mjs", import.meta.url).href;
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "nova") return { url: NOVA_STUB, shortCircuit: true };
  return nextResolve(specifier, context);
}
export { pathToFileURL };
