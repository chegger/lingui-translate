# lingui-translate

CLI for translating missing Lingui `messages.po` entries with an LLM.

## Install

```bash
npm install --save-dev lingui-translate
```

## Usage

```bash
lingui-translate --locales-dir src/locales --languages de es
```

With `npx`:

```bash
npx lingui-translate --locales-dir src/locales --languages de es
```

Dry run:

```bash
lingui-translate --locales-dir src/locales --languages de es --dry-run
```

With custom model and system prompt:

```bash
lingui-translate \
  --locales-dir src/locales \
  --languages de es \
  --model gpt-5.4 \
  --system-prompt "You are a concise product localization translator."
```

## Config

The CLI will auto-load one of:

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

CLI flags override config-file values.

## Lingui pipeline example

Replace the old Python step:

```bash
python3 scripts/translate/translate_missing.py --locales-dir src/locales --languages de es
```

with:

```bash
npx lingui-translate --locales-dir src/locales --languages de es
```

The CLI exits with `2` when translations were written, so an existing extract/translate/compile pipeline can preserve the same "translations changed, commit them first" behavior.

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
