// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Auto-generated game plugin: zpresiden — tebak presiden live ZelAPI

import { games } from "../../src/lib/nova-game-factory.js";

const plugin = games.createPlugin("zpresiden");

export const config = plugin.config;
export const handler = plugin.handler;
export const answerHandler = plugin.answerHandler;
export default { pluginConfig: plugin.config, handler: plugin.handler, command: plugin.config.name };
