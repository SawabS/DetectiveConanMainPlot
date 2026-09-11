# Conan Casebook

A focused Detective Conan watchlist: **255 episodes, nine arcs, individually sourced IMDb ratings**. Created by [SawabS](https://github.com/SawabS).

[Open Conan Casebook](https://sawabs.github.io/DetectiveConanMainPlot/)

Open [index.html](index.html) in a browser, or read the [formatted guide](https://sawabs.github.io/DetectiveConanMainPlot/guide.html). Markdown downloads remain available.

- Search by title or exact Japanese episode number.
- Filter by arc, watched status, or rating; sort by story order or score.
- Save progress on your device, continue with the next unwatched episode, and hide episode titles.
- Export/import JSON backups. Imports merge progress; reset requires confirmation.
- Inspect each episode's source, IMDb mapping, votes, and rating check date.
- Switch between blue light and dark themes with the sun/moon button. Your choice is saved; the first visit follows your system theme.
- Explore the **Story map**: select an arc or episode, drag with a mouse or pen, zoom with the buttons, or use Ctrl/Command + wheel. Touch users can select arcs, search for an episode, and use the zoom controls while retaining normal page scrolling.
- Navigate graph nodes with arrow keys, select with Enter/Space, zoom with +/−, and reset with Home. Colors identify arcs; check marks identify watched episodes. Node size reflects the episode's IMDb rating. Dashed links indicate arc watch order, not inferred plot relationships.
- The faint blue grid bends locally around the pointer with a soft, delayed response. The effect activates automatically for precise pointers, respects reduced-motion settings, and stops when idle or the page is hidden.

## Movies

Open **Movies** in the navbar or visit the [movie library](https://sawabs.github.io/DetectiveConanMainPlot/#movies). It covers 29 released main films, one theatrical crossover, three compilations, and two 3D shorts, checked 7 September 2026. Search by title, film number, or year; filter by category and watch status; sort by release date. Movie progress has its own local storage and import/export controls.

The [movie checklist](detective_conan_movies.md) and browser catalog are generated from [data/movies.json](data/movies.json), with individual sources and artwork credits. External covers load on demand and retain a readable fallback if unavailable.

## Analytics

Open [Analytics](https://sawabs.github.io/DetectiveConanMainPlot/#analytics) to explore all **255 distinct main-story episodes** and **35 films**:

- Select an individual rating or duration bar to inspect its sources and vote count.
- Compare arc medians, rating distributions, and Japanese releases by year.
- Filter by arc/category, release year, progress, rating band, and minimum votes.
- Plan remaining viewing time with your saved progress and a daily time budget.
- Hide titles, navigate charts with the keyboard, or export filtered rows as CSV.

All 255 episodes and 33 films have IMDb scores. Two shorts have no verified IMDb match. Episode durations are **TVmaze broadcast listings**, which may include advertising. They support planning, not exact streaming-time claims. See [methodology and data coverage](data/analytics-methodology.md).

## Run

Download the repository and open `index.html`. No installation or server is required. The artwork and episode data are bundled; web fonts fall back to system fonts offline. Source links require internet access.

For a stable local origin, run `python3 -m http.server 8000` and open `http://localhost:8000`. Progress is browser-local; switching browsers, origins, or devices does not transfer it. Export a backup before moving or clearing browser data.

## Maintain

`data/episodes.json` is the source of truth. It contains the reviewed selections, Japanese titles, original dates, source URLs, IMDb IDs, translated titles, mapping notes, scores, votes, and check dates.

```sh
python3 -m pip install -r scripts/requirements-build.txt # Build-time Markdown renderer
python3 scripts/build.py          # Generate Markdown and browser data
python3 scripts/build.py --check  # Detect stale generated files
python3 -m unittest discover -s tests -p 'test_*.py' # Check rendered guides and links
node --test tests/analytics.test.js # Check analytics calculations and source coverage
node --test tests/core.test.js    # Check filtering, progress, and data integrity
node --test tests/graph.test.js   # Check graph coverage, camera bounds, and theme fallback
node --test tests/grid.test.js    # Check local deformation bounds and return to rest
node --test tests/movies.test.js  # Check film coverage, filtering, and movie backups
python3 scripts/refresh_ratings.py # Download updated scores for the same IDs
```

Review new episode mappings by title, broadcast year, and part. Never infer IMDb IDs from Japanese numbering or reuse a rating across a case. The refresh script updates episode and movie scores, votes, and check dates without changing reviewed IDs. See [CHANGELOG](CHANGELOG.md) for the initial corrections.

The UI uses native HTML, CSS, SVG, and Pointer Events without a front-end framework. The shared palette covers tables, controls, dialogs, navigation, and the graph in both themes. Implementation references: [MDN theme preferences](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-color-scheme), [backdrop filtering](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter), and [Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events). Visual direction was informed by the [Frontend Design skill](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md).

## Sources and credits

[Detective Conan World](https://www.detectiveconanworld.com/wiki/Anime) for episode metadata. [XerBlade](https://www.xerblade.com/p/detective-conan-important-episode-list.html) for central-story cases and prerequisites. [IMDb non-commercial datasets](https://developer.imdb.com/non-commercial-datasets/) for episode metadata and ratings; their terms apply to IMDb data. Ratings are dated snapshots, not live scores. [TVmaze](https://www.tvmaze.com/) supplies broadcast-duration listings under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); the adapted TVmaze duration fields retain that license.

The [Conan rooftop key visual](https://www.animeclick.it/news/101509-anime-preview-trailer-e-novita-per-detective-conan-remonster-e-altri-anime) promotes *Detective Conan vs. Kid the Phantom Thief* (2024). © 青山剛昌／小学館・読売テレビ・TMS 2024. No open license was identified for this image. See [asset credits](assets/CREDITS.md). This is an unofficial fan project, with no affiliation or endorsement.

## Languages

The globe beside the theme control opens English, Sorani, Arabic, and Japanese choices. The three new locales are **translation previews**, with navigation labels and English fallback until the agent completes review. Sorani and Arabic use RTL and bundled IBM Plex Sans Arabic; Japanese uses IBM Plex Sans JP with system fallbacks. Language preferences are saved separately from watch progress.

Give your translation agent [translations/AGENT_PROMPT.md](translations/AGENT_PROMPT.md). The [translation directory](translations/README.md) contains editable catalogs and full inventories of interface text, dynamic JavaScript strings, episode/movie content, and source documents. Compile completed translations with `python3 scripts/translations.py`.
