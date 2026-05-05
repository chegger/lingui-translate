#!/usr/bin/env node

import { Command } from "commander";

import { resolveConfig } from "./config.js";
import { runTranslation } from "./run.js";
import type { AiProvider, ConfigInput } from "./types.js";

async function main(): Promise<void> {
  const program = new Command();

  program
    .name("lingui-translate")
    .description("Translate missing Lingui PO entries with an LLM.")
    .option("--config <path>", "Path to a lingui-translate config file")
    .option("--locales-dir <path>", "Path to the locales directory")
    .option("--dry-run", "Show what would be translated without modifying files")
    .option("--languages <codes...>", "Specific language codes to process")
    .option("--provider <name>", "AI provider to use: openai, anthropic, google")
    .option("--api-key <key>", "Provider API key")
    .option("--base-url <url>", "Override the provider base URL")
    .option("--workers <count>", "Number of parallel translation workers", parseInteger)
    .option("--model <name>", "LLM model to use")
    .option("--system-prompt <text>", "System prompt passed to the model");

  program.parse(process.argv);
  const options = program.opts<{
    config?: string;
    localesDir?: string;
    dryRun?: boolean;
    languages?: string[];
    provider?: AiProvider;
    apiKey?: string;
    baseUrl?: string;
    workers?: number;
    model?: string;
    systemPrompt?: string;
  }>();

  const cliConfig: ConfigInput = {
    localesDir: options.localesDir,
    dryRun: options.dryRun,
    languages: options.languages,
    provider: options.provider,
    apiKey: options.apiKey,
    baseUrl: options.baseUrl,
    workers: options.workers,
    model: options.model,
    systemPrompt: options.systemPrompt,
  };

  const config = await resolveConfig({
    configPath: options.config,
    cliConfig,
  });

  const stats = await runTranslation(config);
  if (!config.dryRun && stats.translatedEntries > 0) {
    process.exitCode = 2;
  }
}

function parseInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`Invalid integer: ${value}`);
  }
  return parsed;
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
});
