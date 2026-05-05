# lingui-translate

`lingui-translate` is a small CLI that fills missing Lingui `messages.po` translations with an LLM.

Missing translations are easy to leave behind, especially when strings change often or several locales need to stay in sync. This package scans your Lingui locale folders, finds untranslated entries, and writes translations back into the existing `messages.po` files. The result is a faster localization workflow with less repetitive copy/paste and more consistent wording across a locale.

## Quick start

Install it:

```bash
npm install --save-dev lingui-translate
```

Set an API key:

```bash
export OPENAI_API_KEY=your_api_key_here
```

Run it on your locales:

```bash
npx lingui-translate --locales-dir src/locales --languages de es
```

That is enough to get started. If your project uses the default `src/locales` layout, you can also keep the command very small by moving options into a config file.

## Usage

Translate specific languages:

```bash
lingui-translate --locales-dir src/locales --languages de es
```

Preview changes without writing files:

```bash
lingui-translate --locales-dir src/locales --languages de es --dry-run
```

Use a custom model and prompt:

```bash
lingui-translate \
  --locales-dir src/locales \
  --languages de es \
  --model gpt-5.4 \
  --system-prompt "You are a concise product localization translator."
```

Use a different provider:

```bash
lingui-translate \
  --provider anthropic \
  --model claude-3-5-sonnet-latest \
  --locales-dir src/locales \
  --languages de
```

## Config

The CLI can auto-load:

- `lingui-translate.config.json`
- `lingui-translate.config.js`
- `lingui-translate.config.mjs`
- `lingui-translate.config.cjs`

Example:

```js
export default {
  localesDir: "src/locales",
  languages: ["de", "es"],
  workers: 4,
  provider: "openai",
  model: "gpt-5.4",
  systemPrompt:
    "You are a professional translator specializing in software localization.",
};
```

Then you can run:

```bash
npx lingui-translate
```

CLI flags override config file values.

## Defaults

If you do not provide config, flags, or environment variables, `lingui-translate` uses:

- `localesDir`: `src/locales`
- `dryRun`: `false`
- `workers`: `4`
- `provider`: `openai`
- `model`: depends on `provider`
  - `openai`: `gpt-5.4`
  - `anthropic`: `claude-sonnet-4-6`
  - `google`: `gemini-2.5-flash`
- `systemPrompt`: `You are a professional translator specializing in software localization. Pay careful attention to the provided examples to maintain consistency in style and terminology.`

There is no default API key or base URL. The API key must be provided through a provider-specific env var, `LINGUI_TRANSLATE_API_KEY`, or `--api-key`.

## Environment

- `LINGUI_TRANSLATE_PROVIDER`
- `LINGUI_TRANSLATE_API_KEY`
- `LINGUI_TRANSLATE_BASE_URL`
- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_BASE_URL`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `GOOGLE_GENERATIVE_AI_BASE_URL`
- `LINGUI_TRANSLATE_LOCALES_DIR`
- `LINGUI_TRANSLATE_LANGUAGES` as a comma-separated list
- `LINGUI_TRANSLATE_WORKERS`
- `LINGUI_TRANSLATE_MODEL`
- `LINGUI_TRANSLATE_SYSTEM_PROMPT`

## Exit codes

- `0`: success, no files changed
- `1`: fatal CLI error
- `2`: translations were written to disk
