# Translation agent assignment

Translate Conan Casebook completely into **Central Kurdish (Sorani, `ckb`)**, **Modern Standard Arabic (`ar`)**, and **Japanese (`ja`)**. Work in this repository. The English text and all episode/movie facts are already reviewed. Your task is translation and linguistic QA, not changing the selection, scores, or behavior.

## Inputs and required outputs

1. Read `source/messages.json`. It contains English text units with stable keys, source-file references, and expression context for dynamic placeholders.
2. Fill every corresponding null value in `locales/ckb.json`, `locales/ar.json`, and `locales/ja.json`. Keep keys unchanged. Existing navigation translations are draft suggestions and require review. Translate values as plain text, not HTML. Never add an em dash.
3. Audit `source/javascript-inventory.json`: this lossless inventory includes every string literal and template in the presentation and interaction code, including errors, tooltips, accessibility labels, exports, dynamic counts, plural variants, and code-only tokens. Do not translate element IDs, event names, storage keys, selectors, property names, paths, or class names. If a human-facing phrase is missing from `messages.json`, add it through the extraction workflow and supply its translations. Do not declare completion merely because the current catalog has no nulls.
4. Audit `source/content.json`: every string field from the episode and movie datasets. Translate displayed titles, arc names, categories, descriptions, mapping explanations, and source notes. Preserve original Japanese titles when supplied and use established Japanese names for Japanese output. Never invent an official Sorani/Arabic title. For an uncertain localized name, document the decision in `translations/REVIEW_NOTES.md` and use a consistent transliteration or faithful descriptive translation.
5. Read every document in `source/documents/`. They are complete Markdown snapshots of the episode guide, movie guide, analytics methodology, artwork credits, and README. Translate them into `translations/documents/{locale}/` with the same filenames. Preserve tables, links, code, factual numbers, and Markdown structure. For the three website reading pages, ensure all rendered text is covered in the locale catalog as well. The browser uses the catalog; translated Markdown documents are separately reviewable deliverables.
6. Run `python3 scripts/translations.py` after editing the locale files. It validates placeholders and generates `assets/locales.js`. Then run the checks below. Do not edit the generated JavaScript directly.

## Meaning and terminology

Use concise, natural fan-facing language. Preserve the distinction between a main-story episode, prerequisite/setup episode, arc, case, film, compilation, crossover, and 3D short. Do not turn a curated selection into a claim that these are every canon episode. There are 255 main-story episodes, nine arcs, and 35 film entries in this snapshot.

IMDb rating, vote count, release date, and duration are different measures. “Median” is the statistical median, not mean. Missing scores are unavailable, not zero. “Listed duration” means a source's listing; episode listings may include advertising. “Remaining time” uses unwatched entries within the active filters. Do not imply exact streaming runtimes. Preserve the explanation of title/year/part mapping and source-date disagreements.

Keep `IMDb`, `TVmaze`, `SawabS`, product names, copyright notices, URLs, IDs, episode/film numbers, ratings, vote counts, and stored dates unchanged. Translate surrounding prose. Use Arabic-script Sorani with Kurdish characters such as ک, ی, ە, ڕ, ڵ, ۆ and ێ correctly; do not substitute Arabic ك/ي indiscriminately. Arabic output should be idiomatic Modern Standard Arabic. Japanese should use established Detective Conan terminology and natural compact UI phrasing. Do not add spoilers or explanatory plot details.

## Runtime contract

Locale files contain `locale`, `name`, `direction`, `status`, and `messages`. Set `status` to `reviewed` only after every message is translated and linguistic/functional review passes. Until then, keep `draft`; the menu explicitly labels the experience as a preview and leaves missing text in English.

Placeholders such as `{0}`, `{1}`, and `{2}` stand for runtime values. Preserve each placeholder, including its occurrence count. Reorder them when grammar requires it, but do not rename or translate them. Consult each message's `variables` and source reference to determine what a placeholder means. Some placeholders hold words such as watched/unwatched; verify these words are themselves translated. If a conditional phrase cannot be translated safely as a pattern, split its branches into explicit translated messages at the source rather than guessing. Document necessary code changes.

The browser translates text nodes and accessibility attributes, including newly rendered rows, dialogs, graph cards, and analytics charts. It matches exact English text first, then reviewed placeholder patterns. It retains the English source for reversible switching. Never change `href`, `id`, `data-*`, numeric coordinates, storage contents, or exported progress IDs to translate the display. Charts keep their geometric coordinate system; do not mirror SVG coordinates. UI text translation does not automatically localize CSV or text assembled for downloads: audit export functions and pass human-facing labels through `window.ConanI18n.translate` where needed while retaining source/progress data unchanged.

`ckb` and `ar` use RTL and bundled IBM Plex Sans Arabic. `ja` uses LTR and IBM Plex Sans JP with Japanese system fallbacks. Avoid letter-spacing for Arabic-script text. Check mixed Latin titles, episode IDs, ratings, punctuation, navigation widths, and source URLs in RTL.

## Acceptance checks

- `python3 scripts/translations.py --check`
- `python3 scripts/build.py --check` (install `scripts/requirements-build.txt` first)
- `node --test tests/*.test.js`
- `python3 -m unittest discover -s tests -p 'test_*.py'`
- Test all four locales on the watchlist, story map, movies, analytics, episode/movie guides, and methodology.
- Exercise zero/one/many results, filters, search, watched/unwatched progress, dialogs, tooltips, charts, exports/import errors, keyboard access, and title hiding. Confirm no text leaks hidden titles.
- Switch languages repeatedly, including after dynamic content changes, then reload. Confirm progress is unchanged and language preference persists.
- Audit desktop and mobile in both themes; inspect RTL layout and Japanese wrapping. Verify no user-facing English remains except intentionally retained proper names or source identifiers.
- Return translated locale files, translated documents, and review notes listing terminology decisions and any unresolved items. Never mark unresolved output as reviewed.
