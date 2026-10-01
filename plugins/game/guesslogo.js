// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Auto-generated game plugin: tebaklogo

import { games } from "../../src/lib/rara-game-factory.js";

const plugin = games.createPlugin("tebaklogo", { name: "guesslogo", usage: ".guesslogo", example: ".guesslogo" });

export const config = plugin.config;
export const handler = plugin.handler;
export const answerHandler = plugin.answerHandler;
