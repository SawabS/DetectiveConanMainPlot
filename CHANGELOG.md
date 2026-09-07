# Changelog

## 2026-09-07: Local grid deformation and aligned controls

- Replaced whole-grid translation with a soft deformation confined to 140px around the pointer. The patch relaxes in place when the pointer leaves.
- Reduced the base grid opacity by roughly half and retained the small blue hover glow.
- Centered graph zoom icons and watched legend marks with SVG geometry. Replaced font-dependent checkbox ticks with a centered CSS shape.

## 2026-09-07: Clearer glass and interactive grid

- Removed the solid theme-button background, including on hover. Lowered navigation fill to 22% with a lighter blur.
- Replaced particles with a blue grid that gently follows the pointer and lights up nearby lines. Reduced the pointer glow from 600px to 160px.
- Added a smooth return to rest on pointer leave. Motion controls, reduced-motion preferences, and idle suspension remain supported.

## 2026-09-07: Blue themes and story map

- Removed the favicon's dot and changed interface accents from red to Conan blue.
- Added complete light/dark themes, a persisted sun/moon switch, system-theme fallback, translucent navigation, and a reduced-transparency fallback.
- Added a pointer-responsive background and subtle artwork parallax, with a motion toggle, reduced-motion support, and no continuous idle animation.
- Added the Story map: 255 episode nodes grouped into nine arcs, category colors, rating-based node sizes, watched markers, cards, pan/zoom, arc focus, episode search, and keyboard controls.
- Shared progress and title hiding between the watchlist and map. Added a GitHub credit for SawabS and a direct link to the live site.

## 2026-09-07

- Unified the guide into one chronological table with one episode per row and a table of contents.
- Preserved all **255** unique episodes in the original main table. The old headline said 259, while its compact ranges expanded to **262**. The compact list accidentally added 337, 505, 506, 669, 670, 757, and 758; those additions are not in the new dataset.
- Replaced two example ratings with **255** individually mapped IMDb scores, vote counts, title IDs, and dated provenance.
- Matched episode 733 to IMDb `tt3615564` (*The Banquet and the Two Gunshots*, 2014), excluding the similarly named 2025 rerun.
- Added original episode titles and per-case Detective Conan World links. Retained the original selection through episode 1212, with episode 1205 the final included entry.
- Added the responsive Conan Casebook interface, persistent checkoffs, arc/status/rating filters, title hiding, deep links, backup import/export, and source details.
- Added a single data source, deterministic guide generation, a rating refresh script, and integrity checks.
- Removed em dashes and repetitive guide sections.
