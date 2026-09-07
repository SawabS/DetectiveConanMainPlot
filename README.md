# Conan Casebook

A focused Detective Conan watchlist: **255 episodes, nine arcs, individually sourced IMDb ratings**.

Open [index.html](index.html) in a browser, or read the [Markdown guide](detective_conan_main_story_watch_guide.md).

- Search by title or exact Japanese episode number.
- Filter by arc, watched status, or rating; sort by story order or score.
- Save progress on your device, continue with the next unwatched episode, and hide episode titles.
- Export/import JSON backups. Imports merge progress; reset requires confirmation.
- Inspect each episode's source, IMDb mapping, votes, and rating check date.

## Run

Download the repository and open `index.html`. No installation or server is required. The artwork and episode data are bundled; web fonts fall back to system fonts offline. Source links require internet access.

For a stable local origin, run `python3 -m http.server 8000` and open `http://localhost:8000`. Progress is browser-local; switching browsers, origins, or devices does not transfer it. Export a backup before moving or clearing browser data.

To host on GitHub Pages, choose **Settings → Pages → Deploy from a branch → main → / (root)** after merging. The site uses relative paths and supports a repository subpath.

## Maintain

`data/episodes.json` is the source of truth. It contains the reviewed selections, Japanese titles, original dates, source URLs, IMDb IDs, translated titles, mapping notes, scores, votes, and check dates.

```sh
python3 scripts/build.py          # Generate Markdown and browser data
python3 scripts/build.py --check  # Detect stale generated files
node --test tests/core.test.js    # Check filtering, progress, and data integrity
python3 scripts/refresh_ratings.py # Download updated scores for the same IDs
```

Review new episode mappings by title, broadcast year, and part. Never infer IMDb IDs from Japanese numbering or reuse a rating across a case. The refresh script changes scores only. See [CHANGELOG](CHANGELOG.md) for the initial corrections.

## Sources and credits

[Detective Conan World](https://www.detectiveconanworld.com/wiki/Anime) for episode metadata. [XerBlade](https://www.xerblade.com/p/detective-conan-important-episode-list.html) for the original guide's selection background. [IMDb non-commercial datasets](https://developer.imdb.com/non-commercial-datasets/) for episode metadata and ratings; their terms apply to IMDb data. Ratings are dated snapshots, not live scores.

The [Conan rooftop key visual](https://www.animeclick.it/news/101509-anime-preview-trailer-e-novita-per-detective-conan-remonster-e-altri-anime) promotes *Detective Conan vs. Kid the Phantom Thief* (2024). © 青山剛昌／小学館・読売テレビ・TMS 2024. No open license was identified for this image. See [asset credits](assets/CREDITS.md). This is an unofficial fan project, with no affiliation or endorsement.
