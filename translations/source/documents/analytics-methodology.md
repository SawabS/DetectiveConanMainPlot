# Analytics: how we count

[Open Analytics](https://sawabs.github.io/DetectiveConanMainPlot/#analytics) · [Episode data](episodes.json) · [Movie data](movies.json)

## Coverage

Snapshot checked **8 September 2026**. One row represents one Japanese-numbered episode or one film entry.

| Dataset | Distinct entries | IMDb scores | Listed durations |
|---|---:|---:|---:|
| Main-story episodes, nine arcs | 255 | 255 | 255 |
| Films, including extras | 35 | 33 | 35 |

Films comprise 29 numbered releases, one crossover, three compilations, and two 3D shorts. The two shorts have no verified IMDb match. The episode selection is a curated central-story route, not the complete series. Compilations repeat existing material; totals count each catalog entry independently.

## Reading the charts

- **Ratings across the story:** one dot per entry, in story order for episodes and release order for films, with the IMDb score on the vertical axis. The axis starts at the whole number just below the lowest score rather than zero; dots mark position, not length, so the shorter axis does not exaggerate differences. Shaded bands mark the arcs. The line is a centered rolling median of 9 episodes or 5 films, which follows the trend without being pulled by single outliers. Hollow dots are watched entries. Entries without a score are not plotted; the legend counts them.
- **Arc comparison:** for each arc or film category, the dot is the median score, the bar spans the middle half of scores (25th to 75th percentile, linear interpolation), and the thin line runs from the lowest to the highest score. The vertical rule marks the median of every plotted entry. Each rated entry has equal weight; this is not a vote-weighted aggregate. The chart headline names the highest median among groups with at least three ratings.
- **Top rated:** entries ranked by IMDb score among those with at least the median vote count for their dataset (78 votes for episodes and about 2,500 for films in this snapshot). Ties go to the higher vote count. The floor keeps a handful of voters from topping the list; it does not mean lower-vote entries are worse.
- **Entry card:** the share of the other rated entries in the dataset that score strictly lower.
- **Finish estimate:** the sum of listed minutes for unwatched entries in the view, divided by the daily budget and rounded up to whole days, counted from today. It assumes the budget can be split across entries. Unknown durations are omitted and flagged. Film and episode progress are separate and saved on your device.

Focusing an arc highlights it on the rating chart and narrows the totals, top list, finish estimate, data table, and CSV export to that arc. **Unwatched only** removes watched entries from every view, which changes the population being described. Higher vote counts indicate more submissions, not guaranteed quality.

## Ratings and releases

[IMDb non-commercial datasets](https://developer.imdb.com/non-commercial-datasets/) supply [ratings and votes](https://datasets.imdbws.com/title.ratings.tsv.gz), [title metadata](https://datasets.imdbws.com/title.basics.tsv.gz), and [episode mappings](https://datasets.imdbws.com/title.episode.tsv.gz). Scores are IMDb's weighted user ratings, shown as a dated snapshot. IMDb terms apply to that data.

Episode matches use title, year, and multipart order rather than IMDb season numbering. Movie matches use reviewed titles and release years, including documented translated-title variants. Every mapped entry stores its IMDb ID and mapping note. Missing matches or scores remain null, never a zero rating. A future refresh may change coverage.

[Detective Conan World](https://www.detectiveconanworld.com/wiki/Anime) supplies episode titles and original broadcast dates. Its [movie catalog](https://www.detectiveconanworld.com/wiki/Movies) supplies film categories and Japanese release dates. Individual source links are retained on every record. Release dates are treated as calendar dates, without timezone conversion.

## Durations and provenance

**Episode time is a broadcast-duration listing, not exact streaming playback.** [TVmaze's episode listings](https://api.tvmaze.com/shows/5429/episodes) supply the displayed durations. They may include advertising, and streaming versions may split specials or skip opening/ending material. Standard entries are listed as 30 minutes; long specials retain their individual listings.

The initial mapping used Japanese episode order and matching broadcast dates for 254 entries. Episode 13 was matched by order and exact title: TVmaze lists 1 April 1996, while the episode source lists 22 April 1996. The guide retains the episode source's release date. Each record stores `tvmazeId`, `runtimeSource`, `runtimeMapping`, `runtimeBasis`, and `runtimeChecked`, making that exception inspectable.

IMDb supplies raw runtimes for only 12 of the 255 selected episodes in this snapshot. Those values remain separately available in `imdb.runtimeMinutes`; charts consistently use the TVmaze broadcast listing. Missing IMDb runtimes were not filled with an assumed playback duration.

Movie duration links point to individual Detective Conan World film pages, except film 29, whose 109-minute value comes from its IMDb title metadata. Editions may differ. Episode and movie totals are shown separately because their listing conventions differ.

TVmaze-derived duration fields, their mapping adaptations, and derived duration summaries are attributed to [TVmaze](https://www.tvmaze.com/) and shared under [Creative Commons Attribution-ShareAlike 4.0](https://creativecommons.org/licenses/by-sa/4.0/), consistent with its [API license](https://www.tvmaze.com/api#licensing). Adaptations by [SawabS](https://github.com/SawabS): selecting 255 entries, linking Japanese numbering, retaining a date-conflict note, and calculating duration summaries. This license statement applies to the TVmaze-derived material, not third-party artwork or IMDb data.

## Refresh and audit

Run `python3 scripts/refresh_ratings.py` to refresh scores and votes for reviewed episode and movie IDs. It does not guess new matches. Review duration changes against the stored TVmaze IDs and individual film sources; update the runtime check date when verified. Run `python3 scripts/build.py` after data edits and `node --test tests/*.test.js` to check coverage and calculations.

CSV exports contain the filtered values, duration basis, rating check date, watched status, and source URLs. Hidden titles stay hidden in exports. Historical selection corrections remain in [CHANGELOG](../CHANGELOG.md).
