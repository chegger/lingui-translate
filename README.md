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

## Environment

- `OPENAI_API_KEY` or `LINGUI_TRANSLATE_API_KEY`
- `OPENAI_BASE_URL` or `LINGUI_TRANSLATE_BASE_URL`
- `LINGUI_TRANSLATE_LOCALES_DIR`
- `LINGUI_TRANSLATE_LANGUAGES` as a comma-separated list
- `LINGUI_TRANSLATE_WORKERS`
- `LINGUI_TRANSLATE_MODEL`
- `LINGUI_TRANSLATE_SYSTEM_PROMPT`

## Exit codes

- `0`: success, no files changed
- `1`: fatal CLI error
- `2`: translations were written to disk
