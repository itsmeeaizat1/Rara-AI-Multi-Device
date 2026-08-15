#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const CONFIG_PATH = path.join(process.env.HOME || '/root', '.openclaw', 'openclaw.json');

function readConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error('Config file not found: ' + CONFIG_PATH);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function writeConfig(config) {
  const dir = path.dirname(CONFIG_PATH);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
}

function maskKey(key) {
  if (!key || key.length <= 8) return '...XXXX';
  return key.slice(0, 4) + '...' + key.slice(-4);
}

function getProviders(config) {
  return config?.models?.providers || {};
}

function getCurrentProvider(config) {
  return config?.agents?.defaults?.model?.primary || null;
}

function listProviders() {
  const config = readConfig();
  const providers = getProviders(config);
  const current = getCurrentProvider(config);
  const entries = Object.entries(providers);

  if (entries.length === 0) {
    return {
      ok: true,
      current,
      providers: [],
      message: 'No providers configured'
    };
  }

  const list = entries.map(([name, p]) => {
    const models = Array.isArray(p.models) ? p.models.map(m => typeof m === 'string' ? m : m.id || m.name) : [];
    return {
      name,
      baseUrl: p.baseUrl || null,
      api: p.api || 'openai-completions',
      apiKey: maskKey(p.apiKey),
      models,
      isCurrent: current === name || (current && current.startsWith(name + ':'))
    };
  });

  return { ok: true, current, providers: list };
}

function addProvider(name, opts) {
  if (!name || typeof name !== 'string') {
    return { ok: false, error: 'Provider name is required' };
  }

  const config = readConfig();
  if (!config.models) config.models = {};
  if (!config.models.providers) config.models.providers = {};

  const baseUrl = (opts && opts.baseUrl) || '';
  const apiKey = (opts && opts.apiKey) || '';
  const api = (opts && opts.api) || 'openai-completions';
  const models = Array.isArray(opts && opts.models) ? opts.models : [];

  if (!baseUrl) {
    return { ok: false, error: 'baseUrl is required' };
  }

  config.models.providers[name] = {
    baseUrl,
    ...(apiKey ? { apiKey } : {}),
    api,
    models: models.map(id => (typeof id === 'string' ? { id } : id))
  };

  writeConfig(config);
  return { ok: true, provider: name, message: `Provider "${name}" added` };
}

function removeProvider(name) {
  if (!name) return { ok: false, error: 'Provider name is required' };

  const config = readConfig();
  const providers = config?.models?.providers || {};

  if (!providers[name]) {
    return { ok: false, error: `Provider "${name}" not found` };
  }

  const current = getCurrentProvider(config);
  if (current === name || (current && current.startsWith(name + ':'))) {
    return {
      ok: false,
      error: `Cannot remove default provider "${name}". Switch default first with /ai use <other>`
    };
  }

  delete providers[name];
  writeConfig(config);
  return { ok: true, message: `Provider "${name}" removed` };
}

function useProvider(name, modelId) {
  if (!name) return { ok: false, error: 'Provider name is required' };

  const config = readConfig();
  const providers = config?.models?.providers || {};

  if (!providers[name]) {
    return { ok: false, error: `Provider "${name}" not found` };
  }

  const provider = providers[name];
  const models = Array.isArray(provider.models) ? provider.models : [];
  const firstModel = models[0];
  const chosenModel = modelId || (firstModel && (firstModel.id || firstModel)) || 'default';

  const primary = name + ':' + chosenModel;
  config.agents.defaults.model.primary = primary;
  writeConfig(config);
  return { ok: true, primary, message: `Default switched to ${primary}` };
}

function infoProvider(name) {
  if (!name) return { ok: false, error: 'Provider name is required' };

  const config = readConfig();
  const providers = config?.models?.providers || {};
  const provider = providers[name];

  if (!provider) {
    return { ok: false, error: `Provider "${name}" not found` };
  }

  const models = Array.isArray(provider.models)
    ? provider.models.map(m => (typeof m === 'string' ? m : m.id || m.name))
    : [];

  return {
    ok: true,
    name,
    baseUrl: provider.baseUrl,
    api: provider.api || 'openai-completions',
    apiKey: maskKey(provider.apiKey),
    models
  };
}

function checkHealth(baseUrl, apiKey) {
  return new Promise((resolve) => {
    const url = new URL(baseUrl + '/v1/chat/completions');
    const body = JSON.stringify({
      model: 'health-check',
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 1
    });

    const request = (url.protocol === 'https:' ? https : http).request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          ...(apiKey ? { Authorization: 'Bearer ***' } : {})
        },
        timeout: 10000
      },
      (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          const ok = res.statusCode >= 200 && res.statusCode < 300;
          resolve({ ok, status: res.statusCode, body: data.slice(0, 200) });
        });
      }
    );

    request.on('error', (err) => resolve({ ok: false, error: err.message }));
    request.on('timeout', () => {
      request.destroy();
      resolve({ ok: false, error: 'timeout' });
    });

    request.write(body);
    request.end();
  });
}

async function testProvider(name) {
  if (!name) return { ok: false, error: 'Provider name is required' };

  const config = readConfig();
  const provider = config?.models?.providers?.[name];

  if (!provider) {
    return { ok: false, error: `Provider "${name}" not found` };
  }

  const result = await checkHealth(provider.baseUrl, provider.apiKey);
  return { ok: result.ok, name, ...result };
}

const presets = {
  kilocode: {
    baseUrl: 'https://api.kilo.ai/api/gateway/',
    api: 'openai-completions',
    apiKey: '',
    models: []
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    api: 'openai-completions',
    apiKey: '',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' }
    ]
  },
  google: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    api: 'openai-completions',
    apiKey: '',
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' }
    ]
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    api: 'openai-completions',
    apiKey: '',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' }
    ]
  },
  github: {
    baseUrl: 'https://api.githubcopilot.com',
    api: 'openai-completions',
    apiKey: '',
    models: [
      { id: 'gpt-4o', name: 'GitHub Copilot GPT-4o' }
    ]
  },
  blackbox: {
    baseUrl: 'https://api.blackbox.ai/api/chat',
    api: 'openai-completions',
    apiKey: '',
    models: [
      { id: 'blackbox-default', name: 'Blackbox AI' }
    ]
  },
  aisaa: {
    baseUrl: 'https://api.aisa.ai/v1',
    api: 'openai-completions',
    apiKey: '',
    models: [
      { id: 'qwen2.5-72b-instruct', name: 'Qwen 2.5 72B' },
      { id: 'deepseek-v3', name: 'DeepSeek V3' },
      { id: 'kimi-k2.5', name: 'Kimi K2.5' },
      { id: 'doubao-pro', name: 'Doubao Pro' }
    ]
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    api: 'openai-completions',
    apiKey: '',
    models: [
      { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B' }
    ]
  },
  together: {
    baseUrl: 'https://api.together.xyz/v1',
    api: 'openai-completions',
    apiKey: '',
    models: [
      { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', name: 'Llama 3.1 70B Turbo' }
    ]
  }
};

function addPreset(name) {
  const preset = presets[name];
  if (!preset) {
    return { ok: false, error: `Unknown preset "${name}"` };
  }
  return addProvider(name, preset);
}

const command = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv[4];
const arg3 = process.argv[5];

(async () => {
  try {
    let result;
    if (command === 'list') result = listProviders();
    else if (command === 'add') {
      const opts = {
        baseUrl: arg2,
        apiKey: arg3,
        api: process.argv[6],
        models: (process.argv[7] || '').split(',').filter(Boolean)
      };
      result = addProvider(arg1, opts);
    } else if (command === 'preset') result = addPreset(arg1);
    else if (command === 'remove') result = removeProvider(arg1);
    else if (command === 'use') result = useProvider(arg1, arg2);
    else if (command === 'info') result = infoProvider(arg1);
    else if (command === 'test') result = await testProvider(arg1);
    else {
      console.error('Unknown command:', command);
      process.exit(1);
    }
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 2);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, error: err.message }));
    process.exit(1);
  }
})();
