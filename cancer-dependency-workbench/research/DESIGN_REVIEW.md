# Fieldnotes design review — September 29

Reference direction: Jordan’s saved Juan Mora Romero, Hiroto Sato and Guillaume Colombel study. Translate clear hierarchy, restrained material and purposeful composition into a research tool; do not copy their portfolios or treat awards as usability evidence.

## Implemented corrections and evidence

1. **Phone framing.** At 390px, the introduction, separate export row and chart heading pushed the plot top to 597.97px. Tightened title tracking/line-height, reduced introductory spacing, put layer navigation and a clearly named export action on one row, and tightened chart metadata. Plot top is now 417.61px; plot height stays 323.28px. No text or evidence was removed. The export retains its full accessible name. At widths below 350px the toolbar wraps intentionally.
2. **Desktop inspection.** Supporting analyses pushed the empty observation inspector to 1128.39px. Moved it ahead of uncertainty and donor sensitivity: now 478.16px, alongside the chart. Selected-state tests still pass; phone inspection continues to use its focus-managed dialog.
3. **Scientific hierarchy.** Point estimate, observation, interval and related-model check now have a task-based order. Supporting assumptions remain expandable. No new decoration or motion was added to compete with the evidence.

Evidence: Site `artifacts/layout-before.json`, `layout-after.json` and corresponding 390/1440 screenshots. Both rendered after states inspected. Existing full browser suite passed, including exports, selection, separate layers, failure recovery and scoped axe. These geometry measurements are local screenshots/DOM checks, not user-study results.

## Remaining design work — do not declare finished

1. **Typography:** the system Arial/Georgia pair is readable but not a distinctive finished identity. Implemented Newsreader for the question and IBM Plex Sans for working text/data. Both are bundled WOFF2 with local OFL notices and recorded hashes; 320/390/1440px layouts and font-failure fallback checked. New full performance run is recorded in Site PERFORMANCE.md. Final visual acceptance remains open.
2. **Dense scatterplot:** many low-MSI observations overlap. Implemented a nearby-observation list in the inspector: all plotted observations within 18 rendered pixels of the selected point, with exact values and keyboard-selectable buttons. Changing selection recenters the neighborhood. The threshold is a visual affordance, never a biological cluster. Coordinates stay fixed. Desktop/phone actual-point clicks, keyboard selection, focus restoration, gene-state clearing and scoped axe checks pass. Physical-touch validation remains outstanding.
3. **Desktop lower composition:** a long supporting column can still leave unused space below the chart. Implemented a two-column supporting-analysis row below the chart on desktop, stacked on phones. Observation inspection remains beside the plot. Full before/after and supporting-row renders inspected; browser suite passed.
4. **Phone interaction:** real device and full screen-reader checks remain absent. Browser emulation and axe are useful but do not close these gates.
5. **Portfolio cover:** create a designed crop of actual data and selected details after the visual system is settled. No generic cover asset is needed.

The layout corrections close specific defects. They do not establish Jordan’s final design approval, exceptional visual quality, independent usefulness or portfolio readiness.
