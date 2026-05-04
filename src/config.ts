import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { ConfigInput, ResolvedConfig } from "./types.js";

const DEFAULT_SYSTEM_PROMPT =
  "You are a professional translator specializing in software localization. Pay careful attention to the provided examples to maintain consistency in style and terminology.";

const DEFAULTS = {
  localesDir: "src/locales",
  dryRun: false,
  workers: 4,
  model: "gpt-5.4",
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
} as const;

const AUTO_CONFIG_NAMES = [
  "lingui-translate.config.json",
  "lingui-translate.config.js",
  "lingui-translate.config.mjs",
  "lingui-translate.config.cjs",
] as const;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function normalizeConfigInput(value: unknown, source: string): ConfigInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${source} must export an object.`);
  }

  const input = value as Record<string, unknown>;
  const result: ConfigInput = {};

  if (input.localesDir !== undefined) {
    if (typeof input.localesDir !== "string") {
      throw new Error(`${source}.localesDir must be a string.`);
    }
    result.localesDir = input.localesDir;
  }

  if (input.languages !== undefined) {
    if (!isStringArray(input.languages)) {
      throw new Error(`${source}.languages must be an array of strings.`);
    }
    result.languages = input.languages;
  }

  if (input.dryRun !== undefined) {
    if (typeof input.dryRun !== "boolean") {
      throw new Error(`${source}.dryRun must be a boolean.`);
    }
    result.dryRun = input.dryRun;
  }

  if (input.workers !== undefined) {
    if (typeof input.workers !== "number" || !Number.isFinite(input.workers)) {
      throw new Error(`${source}.workers must be a number.`);
    }
    result.workers = input.workers;
  }

  if (input.model !== undefined) {
    if (typeof input.model !== "string") {
      throw new Error(`${source}.model must be a string.`);
    }
    result.model = input.model;
  }

  if (input.systemPrompt !== undefined) {
    if (typeof input.systemPrompt !== "string") {
      throw new Error(`${source}.systemPrompt must be a string.`);
    }
    result.systemPrompt = input.systemPrompt;
  }

  if (input.apiKey !== undefined) {
    if (typeof input.apiKey !== "string") {
      throw new Error(`${source}.apiKey must be a string.`);
    }
    result.apiKey = input.apiKey;
  }

  if (input.baseUrl !== undefined) {
    if (typeof input.baseUrl !== "string") {
      throw new Error(`${source}.baseUrl must be a string.`);
    }
    result.baseUrl = input.baseUrl;
  }

  return result;
}

async function loadConfigFile(configPath: string): Promise<ConfigInput> {
  const extension = path.extname(configPath);

  if (extension === ".json") {
    const raw = await fs.readFile(configPath, "utf8");
    return normalizeConfigInput(JSON.parse(raw), path.basename(configPath));
  }

  const imported = await import(pathToFileURL(configPath).href);
  const exported = imported.default ?? imported;
  return normalizeConfigInput(exported, path.basename(configPath));
}

async function findConfigPath(cwd: string, explicitPath?: string): Promise<string | undefined> {
  if (explicitPath) {
    return path.resolve(cwd, explicitPath);
  }

  for (const configName of AUTO_CONFIG_NAMES) {
    const candidate = path.join(cwd, configName);
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Ignore missing files while probing defaults.
    }
  }

  return undefined;
}

function trimMaybe(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parsePositiveInteger(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return undefined;
  }

  return parsed;
}

export interface ResolveConfigOptions {
  cwd?: string;
  configPath?: string;
  cliConfig?: ConfigInput;
}

export async function resolveConfig(options: ResolveConfigOptions = {}): Promise<ResolvedConfig> {
  const cwd = options.cwd ? path.resolve(options.cwd) : process.cwd();
  const configPath = await findConfigPath(cwd, options.configPath);
  const fileConfig = configPath ? await loadConfigFile(configPath) : {};
  const cliConfig = options.cliConfig ?? {};
  const envWorkers = parsePositiveInteger(trimMaybe(process.env.LINGUI_TRANSLATE_WORKERS));

  const envLanguages = trimMaybe(process.env.LINGUI_TRANSLATE_LANGUAGES)?.split(",").map((item) => item.trim()).filter(Boolean);
  const resolved: ResolvedConfig = {
    cwd,
    localesDir: path.resolve(
      cwd,
      cliConfig.localesDir ??
        fileConfig.localesDir ??
        trimMaybe(process.env.LINGUI_TRANSLATE_LOCALES_DIR) ??
        DEFAULTS.localesDir,
    ),
    languages:
      cliConfig.languages ??
      fileConfig.languages ??
      envLanguages,
    dryRun:
      cliConfig.dryRun ??
      fileConfig.dryRun ??
      (trimMaybe(process.env.LINGUI_TRANSLATE_DRY_RUN) === "true" ? true : DEFAULTS.dryRun),
    workers: Math.max(
      1,
      Math.floor(
        cliConfig.workers ??
          fileConfig.workers ??
          envWorkers ??
          DEFAULTS.workers,
      ),
    ),
    model:
      cliConfig.model ??
      fileConfig.model ??
      trimMaybe(process.env.LINGUI_TRANSLATE_MODEL) ??
      DEFAULTS.model,
    systemPrompt:
      cliConfig.systemPrompt ??
      fileConfig.systemPrompt ??
      trimMaybe(process.env.LINGUI_TRANSLATE_SYSTEM_PROMPT) ??
      DEFAULTS.systemPrompt,
    apiKey:
      cliConfig.apiKey ??
      fileConfig.apiKey ??
      trimMaybe(process.env.OPENAI_API_KEY) ??
      trimMaybe(process.env.LINGUI_TRANSLATE_API_KEY),
    baseUrl:
      cliConfig.baseUrl ??
      fileConfig.baseUrl ??
      trimMaybe(process.env.OPENAI_BASE_URL) ??
      trimMaybe(process.env.LINGUI_TRANSLATE_BASE_URL),
    configPath,
  };

  if (resolved.languages && resolved.languages.length === 0) {
    resolved.languages = undefined;
  }

  return resolved;
}

export function getDefaultSystemPrompt(): string {
  return DEFAULTS.systemPrompt;
}
