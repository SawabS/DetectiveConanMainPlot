# Conan Casebook

A focused Detective Conan watchlist: **255 episodes, nine arcs, individually sourced IMDb ratings**. Created by [SawabS](https://github.com/SawabS).

[Open Conan Casebook](https://sawabs.github.io/DetectiveConanMainPlot/)

Open [index.html](index.html) in a browser, or read the [Markdown guide](detective_conan_main_story_watch_guide.md).

- Search by title or exact Japanese episode number.
- Filter by arc, watched status, or rating; sort by story order or score.
- Save progress on your device, continue with the next unwatched episode, and hide episode titles.
- Export/import JSON backups. Imports merge progress; reset requires confirmation.
- Inspect each episode's source, IMDb mapping, votes, and rating check date.
- Switch between blue light and dark themes with the sun/moon button. Your choice is saved; the first visit follows your system theme.
- Explore the **Story map**: select an arc or episode, drag with a mouse or pen, zoom with the buttons, or use Ctrl/Command + wheel. Touch users can select arcs, search for an episode, and use the zoom controls while retaining normal page scrolling.
- Navigate graph nodes with arrow keys, select with Enter/Space, zoom with +/−, and reset with Home. Colors identify arcs; check marks identify watched episodes. Node size reflects the episode's IMDb rating. Dashed links indicate arc watch order, not inferred plot relationships.
- Toggle the pointer-responsive background with the motion button. System reduced-motion settings take precedence; animation stops when idle or the page is hidden.

## Run

Download the repository and open `index.html`. No installation or server is required. The artwork and episode data are bundled; web fonts fall back to system fonts offline. Source links require internet access.

For a stable local origin, run `python3 -m http.server 8000` and open `http://localhost:8000`. Progress is browser-local; switching browsers, origins, or devices does not transfer it. Export a backup before moving or clearing browser data.

## Maintain

`data/episodes.json` is the source of truth. It contains the reviewed selections, Japanese titles, original dates, source URLs, IMDb IDs, translated titles, mapping notes, scores, votes, and check dates.

```sh
python3 scripts/build.py          # Generate Markdown and browser data
python3 scripts/build.py --check  # Detect stale generated files
node --test tests/core.test.js    # Check filtering, progress, and data integrity
node --test tests/graph.test.js   # Check graph coverage, camera bounds, and theme fallback
python3 scripts/refresh_ratings.py # Download updated scores for the same IDs
```

Review new episode mappings by title, broadcast year, and part. Never infer IMDb IDs from Japanese numbering or reuse a rating across a case. The refresh script changes scores only. See [CHANGELOG](CHANGELOG.md) for the initial corrections.

The UI uses native HTML, CSS, SVG, and Pointer Events without a front-end framework. The shared palette covers tables, controls, dialogs, navigation, and the graph in both themes. Implementation references: [MDN theme preferences](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-color-scheme), [backdrop filtering](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter), and [Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events). Visual direction was informed by the [Frontend Design skill](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md).

## Sources and credits

[Detective Conan World](https://www.detectiveconanworld.com/wiki/Anime) for episode metadata. [XerBlade](https://www.xerblade.com/p/detective-conan-important-episode-list.html) for the original guide's selection background. [IMDb non-commercial datasets](https://developer.imdb.com/non-commercial-datasets/) for episode metadata and ratings; their terms apply to IMDb data. Ratings are dated snapshots, not live scores.

The [Conan rooftop key visual](https://www.animeclick.it/news/101509-anime-preview-trailer-e-novita-per-detective-conan-remonster-e-altri-anime) promotes *Detective Conan vs. Kid the Phantom Thief* (2024). © 青山剛昌／小学館・読売テレビ・TMS 2024. No open license was identified for this image. See [asset credits](assets/CREDITS.md). This is an unofficial fan project, with no affiliation or endorsement.
