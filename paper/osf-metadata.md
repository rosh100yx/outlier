# OSF Preprints / Zenodo — Submission Metadata

## Title
Measuring AI Use: A Governance Framework for Carbon, Authorship Erosion, and AI Adoption

## Author
Roshan Abraham

## Affiliation
Independent Researcher and UX Design Engineer, Ho Chi Minh City, Vietnam

## ORCID
Register at orcid.org before first upload. Insert here after registration.

## Preferred Citation (APA-ish)
Abraham, R. (2026). Measuring AI Use: A Governance Framework for Carbon, Authorship Erosion, and AI Adoption. Outlier Project. https://doi.org/<INSERT-DOI>

## Abstract (copy-paste)
AI adoption happens one person at a time: a developer at a computer asks an AI agent to write code, and in that moment two hidden costs appear. First, running the AI uses electricity and creates carbon emissions. Second, the developer gives up some of their own understanding and skill. Existing tools count the tokens and the cloud bill. They do not count the carbon footprint, and they do not count what the developer loses.

We built a simple monitoring approach that tracks both. It reads the logs already sitting on the developer's machine. No new infrastructure. No data leaves the country.

Why measure at the developer's computer instead of the datacenter? Because local measurement reveals a hidden geographic tax. Developers in regions with coal-heavy grids, like Vietnam, generate up to 31 times more carbon per prompt than their European counterparts. They inadvertently bear a massive, disproportionate environmental cost just to access the same global AI tools.

To prove this works, we built and deployed a live, open-source CLI instrument. We demonstrate its viability on a live repository, corroborating the high rates of AI authorship observed in public enterprise frameworks. This instrument makes both the carbon and skill costs visible at the exact moment of delegation.

Why should governments care? Because AI adoption and usage monitoring gives regulators a simple, auditable signal of foreign AI dependency at three levels they already regulate: the worker (premature deprofessionalization), the firm (human oversight of high-risk AI), and the nation (trade-off between foreign cloud spending and local carbon cost), all without exporting citizen data to foreign servers.

## Keywords
AI Safety; Carbon Footprint; Software Engineering; Global South; Deskilling; Authorship Verification; Data Sovereignty; AI Governance

## Subjects
Social and Behavioral Sciences > Computer Science
Social and Behavioral Sciences > Environmental Sciences

## License
CC BY 4.0

## Recommended servers (in order)
1. OSF Preprints — instant DOI, open to all, no endorsement
2. SSRN — socio-economic / policy angle, no endorsement
3. TechRxiv — IEEE-backed CS alternative
4. Zenodo — long-term archive, GitHub release auto-harvest
5. arXiv — highest visibility, needs endorsement (cs.CY or cs.SE)

## Files to upload
- paper/measuring-ai-use.pdf (OSF, SSRN, TechRxiv, Zenodo)
- paper/measuring-ai-use.tex + figures/ (arXiv)

## GitHub repo link
https://github.com/rosh100yx/outlier

## Code and data availability statement
All quantitative claims are independently reproducible from the cited sources and the POSIX commands in Appendix A of the paper. The instrument source code is open-source at the linked repository.

## Submission log
| Date | Server | Status | DOI / Link |
|------|--------|--------|------------|
| YYYY-MM-DD | OSF | pending |  |

## TeX build notes
- Build: `pdflatex measuring-ai-use.tex && bibtex measuring-ai-use && pdflatex measuring-ai-use.tex && pdflatex measuring-ai-use.tex`
- Required packages: authblk, hyperref, geometry, booktabs, float, enumitem, amsmath, epstopdf
