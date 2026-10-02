# Fieldnotes — local release candidate

A combined review package of the current interface and the narrowly selected research pipeline. This is not a public repository or a new canonical editing location. Keep editing the original projects; regenerate this package afterward. Original interface history is preserved in its source repository; this snapshot records the exact commit and file hashes rather than inventing a merged history.

## Start the interface

Node 22+:

```sh
cd fieldnotes-site
npm ci
npx playwright install chromium
npm test
npm run preview
```

On Linux, Playwright may require `npx playwright install --with-deps chromium`.

## Verify/reproduce research

Python 3.12; from this package root:

```sh
python3.12 -m venv .venv
.venv/bin/python -m pip install -r cancer-dependency-workbench/requirements.txt
.venv/bin/python verify.py
.venv/bin/python cancer-dependency-workbench/scripts/fetch_sources.py
.venv/bin/python verify.py --reproduce
```

The optional source download is approximately 430 MB. Three outputs must match the interface byte-for-byte: model evidence, separate tumor evidence and the uncertainty dossier. Source manifests, pinned TCGA snapshots and license notices accompany the package. Direct Python dependencies are pinned; transitive dependencies are not fully locked. Research tests alone do not download or reproduce all source data.

`release-manifest.json` hashes the initial package and records the interface commit. It is a packaging integrity check, not a publisher signature. Generated build/test files are not initial manifest entries. Regenerate the package from canonical sources after intentional changes rather than editing the manifest to hide differences.

## Read the work

Start with `cancer-dependency-workbench/research/CASE_STUDY.md`, then `ARCHITECTURE.md`. Model and tumor layers have different measurements, independent cohorts and distinct terms; never merge their observations. The interface contains five descriptive genes; WRN alone receives the stated correlation analysis. No patient-level prediction, treatment claim or trained ML model.

No historical manuscript spreadsheet, raw DepMap bulk data, older interface prototype, Sites deployment identity, virtual environment or browser dependencies is packaged. Some historical project documentation refers to the original workspace/program notes; this root guide is the release setup authority. All hosted demo links currently require owner access.

Public release still needs the original-code license decision, final data/asset review, public-link authorization and Jordan's design/copy review. Automated checks do not substitute for independent researcher feedback, physical-device testing or full screen-reader review.
