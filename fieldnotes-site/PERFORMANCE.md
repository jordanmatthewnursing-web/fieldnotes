# Performance evidence

Historical baseline measured September 29, 2026, before the uncertainty download and later layout changes. These timings do not describe the current release. Run `npm run measure` to rebuild and repeat.

## Conditions

Five fresh Chromium contexts per profile, disabled cache, local loopback server serving
uncompressed assets. Desktop: 1440 × 1000, no throttling. Phone simulation: 390 × 844,
4× CPU slowdown, 150 ms network latency, 1.6 Mbit/s down and 0.75 Mbit/s up. This is
macOS ARM64 desktop hardware, not a physical phone. The hosted CDN and sign-in path
were not measured.

Model-ready time starts at navigation and ends when validated data and controls are in
the DOM. Interaction time measures a programmatic change through two animation frames.
It is not field INP. Five runs support medians/maxima, not population percentiles.
Targets were set before the first run: model ready 3,000 ms, local state changes 200 ms,
first tumor load 2,000 ms. These are project lab budgets, not clinical or industry certification.

## Results

| Profile | Action | Median ms | Max ms | Budget ms |
| --- | --- | ---: | ---: | ---: |
| desktop-local | Model view ready | 21.0 | 22.5 | 3000 |
| desktop-local | Switch to donor medians | 14.5 | 19.8 | 200 |
| desktop-local | Change comparator gene | 31.8 | 33.2 | 200 |
| desktop-local | First tumor view | 34.1 | 35.2 | 2000 |
| desktop-local | Return to models | 31.3 | 32.3 | 200 |
| phone-throttled | Model view ready | 1258.6 | 1260.1 | 3000 |
| phone-throttled | Switch to donor medians | 14.9 | 16.1 | 200 |
| phone-throttled | Change comparator gene | 21.0 | 30.0 | 200 |
| phone-throttled | First tumor view | 933.4 | 948.8 | 2000 |
| phone-throttled | Return to models | 32.5 | 34.1 | 200 |

All measured runs met these timing budgets. Raw observations, browser resource timings,
environment and asset hashes are in `artifacts/performance.json` (generated, ignored by Git).
A retained copy is in the research project's artifacts directory.

## A measured design correction

The first run exposed a loading shift: lower sections moved when the work area expanded.
Reserving one small viewport height while `aria-busy` is true reduced the pre-interaction
layout-shift sum from 0.454 to 0.007 on desktop and 0.473 to 0.009 in the phone simulation.
This sum is not session-window CLS. The layout returns to content height when ready or
on error. Typography, colors, chart scales and loaded composition are preserved.

## Payload and architecture decision

The measured eight-asset bundle totals 294,106 bytes before compression, excluding the
small build manifest. Model data loads initially; the independent tumor snapshot loads
on first use. Compressed sizes in the report are local gzip calculations, not observed
CDN transfer sizes. Small pinned snapshots and sub-budget interactions support static
hosting and local calculations at this workload. No database or query server is required
for this prototype's current task. Reassess if data volume or user requirements change.

## Limits

No real-user performance, physical-device results, hosted authentication timing or
cross-browser claims. Repeat measurements after material source/data changes; preserve
conditions when comparing. Do not present a local 21 ms startup as an internet load time.

## Current typography release — September 29

Repeated the same five-run desktop and throttled-phone protocol after uncertainty, nearby selection, bundled fonts and supporting-row composition. Phone model-ready median 2029.6 ms (max 2033.6), first tumor 1015.4 ms (max 1017.2), donor change 16.8 ms, gene change 23.5 ms, return 32.2 ms. All configured timing budgets passed. Desktop model-ready median 23.3 ms. The 13-asset bundle totals 561,265 bytes before compression. Two bundled fonts account for 172,088 bytes; their licenses are included.

Tradeoff: phone model-ready increased from the earlier 1258.6 ms baseline; pre-interaction layout-shift sum increased from about .009 to .092. The latter is not session-window CLS. This measurement covers all changes since that baseline, not an isolated causal estimate for fonts. The current design stays within the predeclared timing budgets; no field-performance claim follows. Current raw evidence is artifacts/performance.json, retained as cancer-dependency-workbench/artifacts/performance-typography.json.
