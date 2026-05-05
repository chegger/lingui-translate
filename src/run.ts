import fs from "node:fs/promises";
import path from "node:path";

import pLimit from "p-limit";

import { findMissingTranslations, findLanguageDirectories, getCommentText, getLanguageCode, loadPoFile, savePoFile, setItemTranslation } from "./po.js";
import { getRelevantSampleTranslations } from "./relevance.js";
import { translateText } from "./translate.js";
import type { POItem } from "./po.js";
import type { AiProvider, LocaleStats, ResolvedConfig, RunStats, TranslationSample } from "./types.js";

interface WorkItem {
  index: number;
  item: POItem;
  context: string;
  sampleTranslations: TranslationSample[];
}

function getApiKeyHint(provider: AiProvider): string {
  switch (provider) {
    case "openai":
      return "OPENAI_API_KEY";
    case "anthropic":
      return "ANTHROPIC_API_KEY";
    case "google":
      return "GOOGLE_GENERATIVE_AI_API_KEY";
  }
}

async function ensureLocalesDirExists(localesDir: string): Promise<void> {
  const stat = await fs.stat(localesDir).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    throw new Error(`Locales directory not found: ${localesDir}`);
  }
}

function buildEmptyStats(): RunStats {
  return {
    totalEntries: 0,
    missingEntries: 0,
    translatedEntries: 0,
  };
}

function printSummary(stats: RunStats, dryRun: boolean): void {
  console.log("\n============================================================");
  console.log("TRANSLATION SUMMARY");
  console.log("============================================================");
  console.log(`Total entries processed: ${stats.totalEntries}`);
  console.log(`Missing translations found: ${stats.missingEntries}`);
  console.log(`Translations added: ${stats.translatedEntries}`);
  console.log(dryRun ? "\nThis was a dry run. No files were modified." : "\nTranslation complete.");
}

async function translateMissingEntries(
  workItems: WorkItem[],
  languageCode: string,
  config: ResolvedConfig,
): Promise<number> {
  if (workItems.length === 0) {
    return 0;
  }

  if (!config.apiKey) {
    throw new Error(
      `${config.provider} API key not provided. Set ${getApiKeyHint(config.provider)}, LINGUI_TRANSLATE_API_KEY, or pass --api-key.`,
    );
  }

  const limit = pLimit(Math.max(1, Math.min(config.workers, workItems.length)));
  let translatedCount = 0;
  let completedCount = 0;

  console.log(`Translating ${workItems.length} missing entries for language: ${languageCode}`);
  console.log(`  Running translations in parallel with ${Math.max(1, Math.min(config.workers, workItems.length))} workers...`);

  const results = await Promise.all(
    workItems.map((workItem) =>
      limit(async () => {
        console.log(`  [${workItem.index}/${workItems.length}] Translating: ${workItem.item.msgid.slice(0, 50)}...`);
        if (workItem.sampleTranslations.length > 0) {
          console.log(`    Found ${workItem.sampleTranslations.length} relevant examples for context`);
        }

        try {
          const translation = await translateText(config, {
            text: workItem.item.msgid,
            targetLanguage: languageCode,
            context: workItem.context,
            sampleTranslations: workItem.sampleTranslations,
          });

          completedCount += 1;
          console.log(`    -> ${translation.slice(0, 50)}...`);
          console.log(`    Completed ${completedCount}/${workItems.length}`);
          return {
            ...workItem,
            translation,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`    Error translating entry: ${message}`);
          completedCount += 1;
          console.log(`    Completed ${completedCount}/${workItems.length}`);
          return {
            ...workItem,
            translation: workItem.item.msgid,
          };
        }
      }),
    ),
  );

  for (const result of results.sort((left, right) => left.index - right.index)) {
    setItemTranslation(result.item, result.translation);
    translatedCount += 1;
  }

  return translatedCount;
}

async function processLanguageDirectory(
  languageDir: string,
  config: ResolvedConfig,
): Promise<LocaleStats> {
  const languageCode = getLanguageCode(languageDir);
  const poFilePath = path.join(languageDir, "messages.po");
  const po = await loadPoFile(poFilePath);
  const missingItems = findMissingTranslations(po);

  const result: LocaleStats = {
    totalEntries: po.items.length,
    missingEntries: missingItems.length,
    translatedEntries: 0,
  };

  console.log(`\n============================================================`);
  console.log(`Processing language: ${languageCode}`);
  console.log(`File: ${poFilePath}`);
  console.log("============================================================");
  console.log(`Total entries: ${result.totalEntries}`);
  console.log(`Missing translations: ${result.missingEntries}`);

  if (result.missingEntries === 0) {
    console.log("No missing translations found.");
    return result;
  }

  if (config.dryRun) {
    console.log("DRY RUN MODE - Would translate these entries:");
    for (const item of missingItems.slice(0, 5)) {
      console.log(`  - ${item.msgid.slice(0, 80)}...`);
    }
    if (missingItems.length > 5) {
      console.log(`  ... and ${missingItems.length - 5} more entries`);
    }
    return result;
  }

  console.log("  Analyzing existing translations to find relevant examples...");
  const workItems: WorkItem[] = missingItems.map((item, index) => ({
    index: index + 1,
    item,
    context: getCommentText(item),
    sampleTranslations: getRelevantSampleTranslations(po, item, 10),
  }));

  result.translatedEntries = await translateMissingEntries(workItems, languageCode, config);

  if (result.translatedEntries > 0) {
    await savePoFile(po, poFilePath);
    console.log(`Saved updated file: ${poFilePath}`);
    console.log(`Successfully translated ${result.translatedEntries} entries.`);
  }

  return result;
}

export async function runTranslation(config: ResolvedConfig): Promise<RunStats> {
  await ensureLocalesDirExists(config.localesDir);

  console.log("Starting Lingui Translate...");
  console.log(`Locales directory: ${config.localesDir}`);
  console.log(`Provider: ${config.provider}`);
  console.log(`Model: ${config.model}`);
  if (config.configPath) {
    console.log(`Config file: ${config.configPath}`);
  }

  let languageDirs = await findLanguageDirectories(config.localesDir);
  if (config.languages && config.languages.length > 0) {
    const allowedLanguages = new Set(config.languages);
    languageDirs = languageDirs.filter((languageDir) => allowedLanguages.has(getLanguageCode(languageDir)));
    console.log(`Processing only specified languages: ${config.languages.join(", ")}`);
  }

  if (languageDirs.length === 0) {
    console.log("No language directories with messages.po files found.");
    return buildEmptyStats();
  }

  console.log(`Found ${languageDirs.length} language directories: ${languageDirs.map(getLanguageCode).join(", ")}`);

  const totalStats = buildEmptyStats();

  for (const languageDir of languageDirs) {
    try {
      const result = await processLanguageDirectory(languageDir, config);
      totalStats.totalEntries += result.totalEntries;
      totalStats.missingEntries += result.missingEntries;
      totalStats.translatedEntries += result.translatedEntries;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error processing ${languageDir}: ${message}`);
    }
  }

  printSummary(totalStats, config.dryRun);
  return totalStats;
}
