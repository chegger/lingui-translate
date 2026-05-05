export type AiProvider = "openai" | "anthropic" | "google";

export interface ConfigInput {
  localesDir?: string;
  languages?: string[];
  dryRun?: boolean;
  workers?: number;
  provider?: AiProvider;
  model?: string;
  systemPrompt?: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface ResolvedConfig {
  cwd: string;
  localesDir: string;
  languages?: string[];
  dryRun: boolean;
  workers: number;
  provider: AiProvider;
  model: string;
  systemPrompt: string;
  apiKey?: string;
  baseUrl?: string;
  configPath?: string;
}

export interface TranslationSample {
  original: string;
  translation: string;
}

export interface ContextInfo {
  occurrences: string[];
  comments: string;
  pages: Set<string>;
  components: Set<string>;
}

export interface LocaleStats {
  totalEntries: number;
  missingEntries: number;
  translatedEntries: number;
}

export interface RunStats extends LocaleStats {}
