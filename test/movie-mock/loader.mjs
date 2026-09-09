// Loader ESM: petakan "axios" → mock (IMDbOT down → Cinemeta fixture).
import { pathToFileURL } from "node:url";
const MOCK_AXIOS = new URL("./axios-mock.mjs", import.meta.url).href;
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "axios") return { url: MOCK_AXIOS, shortCircuit: true };
  return nextResolve(specifier, context);
}
export { pathToFileURL };
