# Translation handoff

Start with [AGENT_PROMPT.md](AGENT_PROMPT.md). Target languages: Central Kurdish/Sorani (`ckb`), Arabic (`ar`), and Japanese (`ja`).

| File | Purpose |
|---|---|
| `source/messages.json` | Deduplicated text units, stable keys, references, placeholder context |
| `source/javascript-inventory.json` | Complete JavaScript string/template inventory, including technical tokens for audit |
| `source/content.json` | Every episode/movie string field with its data path |
| `source/documents/` | Complete Markdown source snapshots |
| `locales/{ckb,ar,ja}.json` | Editable translation values; null means pending |
| `AGENT_PROMPT.md` | Translation instructions, terminology, runtime contract, acceptance checks |

The live menu currently offers **draft previews**, with translated navigation labels and English fallback. Complete translations have not been claimed or supplied. Reviewed values compile into the offline runtime; progress data and source metadata stay unchanged.

After translations, run `python3 scripts/translations.py`. The compiler checks keys, placeholders, and review completeness. To update English text after source edits:

```sh
npm install --prefix /tmp/conan-i18n acorn@8 acorn-walk@8
NODE_PATH=/tmp/conan-i18n/node_modules node scripts/extract_js_text.cjs > translations/source/javascript-inventory.json
python3 scripts/build.py
python3 scripts/translations.py --extract
```

Extraction preserves translations for unchanged text keys. Review removed/changed keys in Git before accepting a refresh. The JSX-free static website does not need these development packages at runtime.
