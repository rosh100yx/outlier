# OSF Preprints Submission

## Prereqs
1. Build paper PDF: `pdflatex paper/measuring-ai-use.tex && bibtex paper/measuring-ai-use && pdflatex paper/measuring-ai-use.tex && pdflatex paper/measuring-ai-use.tex`
2. Register ORCID: https://orcid.org/register
3. Add ORCID to `paper/osf-metadata.md`

## Steps
1. Go to https://osf.io/preprints/ and sign in.
2. Click **Upload new preprint**.
3. Upload:
   - `paper/measuring-ai-use.pdf`
   - `paper/measuring-ai-use.tex` (optional source)
   - `paper/osf-metadata.md` (optional notes)
4. Fill form using `paper/osf-metadata.md`:
   - Title, abstract, subjects, keywords
   - License: CC BY 4.0
   - Creative Commons license: Attribution 4.0 International
5. Contributors: add yourself with ORCID.
6. Tags: `ai-safety`, `carbon-footprint`, `software-engineering`, `data-sovereignty`, `authorship`
7. Review and publish.

## After upload
1. Copy the DOI (e.g. `10.17605/OSF.IO/XXXXX`).
2. Update:
   - `README.md` — replace `10.0000/outlier.2026.001` with real DOI
   - `paper/osf-metadata.md` — update DOI field and log
   - `paper/measuring-ai-use.tex` — `\hypersetup{doi=...}` and citation line
3. Commit + push.
