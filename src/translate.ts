import OpenAI from "openai";

import type { ResolvedConfig, TranslationSample } from "./types.js";

function quoteMaybe(value: string): string {
  return JSON.stringify(value);
}

export function buildTranslationPrompt(params: {
  text: string;
  targetLanguage: string;
  context?: string;
  sampleTranslations?: TranslationSample[];
}): string {
  const { text, targetLanguage, context, sampleTranslations = [] } = params;

  const sampleSection =
    sampleTranslations.length === 0
      ? ""
      : [
          "",
          "Here are some example translations from the same application to help you understand the language style and terminology:",
          "",
          ...sampleTranslations.flatMap((sample, index) => [
            `${index + 1}. English: ${quoteMaybe(sample.original)}`,
            `   ${targetLanguage}: ${quoteMaybe(sample.translation)}`,
            "",
          ]),
          "Please use similar style, tone, and terminology in your translation.",
        ].join("\n");

  return [
    "You are a translator for a digital fundraising AI agent product for nonprofit organizations.",
    `Translate the following text to ${targetLanguage}.`,
    "",
    `Text to translate: ${quoteMaybe(text)}`,
    "",
    `Context: This is from a web application interface. ${context?.trim() ?? ""}`.trimEnd(),
    sampleSection,
    "",
    "Important guidelines:",
    "- Preserve any placeholder variables like {0}, {1}, etc.",
    "- Keep HTML tags if present.",
    "- Maintain the same formatting and punctuation style.",
    "- ALWAYS use the informal tone for the target language.",
    "- For UI elements, use standard terminology for the target language.",
    "- If the text is already in the target language, return it as-is.",
    "- Follow the style and terminology patterns shown in the example translations above.",
    "",
    "Return only the translated text, nothing else.",
  ]
    .filter((part) => part !== "")
    .join("\n");
}

function stripWrappingQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

export function createOpenAIClient(config: ResolvedConfig): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
  });
}

export async function translateText(
  client: OpenAI,
  config: ResolvedConfig,
  params: {
    text: string;
    targetLanguage: string;
    context?: string;
    sampleTranslations?: TranslationSample[];
  },
): Promise<string> {
  const prompt = buildTranslationPrompt(params);
  const response = await client.responses.create({
    model: config.model,
    instructions: config.systemPrompt,
    input: prompt,
    max_output_tokens: 1000,
    temperature: 0.3,
  });

  return stripWrappingQuotes(response.output_text.trim());
}
