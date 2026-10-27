# Template: us-plain

- **Type:** Cover letter
- **Source extension:** .tex
- **Engine/toolchain:** tectonic (XeTeX)
- **Page limit:** 1 page(s)
- **Fonts:** TeX Gyre Termes (shipped in tectonic's bundle - downloaded on first compile, no install needed)
- **Class/packages:** article; geometry, fontspec, xcolor, ulem, hyperref

## Compile command

    cd cover_letters && rm -f <file>.pdf && mkdir -p build && tectonic -X compile --outdir build <file>.tex && mv build/<file>.pdf ./

## Style rules

The candidate's own format (2026-10-26): a plain business letter, simple and straight to the point.

- **Blocks, in this order, left-aligned:** sender block (name, street, city/state/ZIP, email as a blue underlined link - no phone, no LinkedIn), the date on the line right after the email, a blank line, the recipient block, the salutation, the body paragraphs, then `Sincerely,` with the name on the next line.
- **Date:** always `\letterdate`, never typed by hand. It prints the compile date with an ordinal day ("October 26th, 2026"), so the letter carries the day it was written and recompiling refreshes it.
- **Recipient block:** `Hiring Manager` (or the named person if the posting gives one), the company's name as the posting writes it, then `City, ST` of the office the candidate would work from: the listed location nearest Santa Clara, or the only one listed. For a remote role use the city of the company's headquarters if the posting names it; otherwise leave the line out.
- **Salutation:** `Dear Hiring Manager,` unless the posting names a person (`Dear Jane Doe,`).
- **Body:** 4-5 paragraphs, 250-350 words, no bullet lists and no bold. Opening names the role and company, the degree, and the 2-3 strengths that fit. Middle paragraphs take one role or theme each, with a concrete result from `01-candidate-profile.md`. One paragraph says why this company, from a verified specific. The close says what the candidate wants to contribute and thanks the reader.
- **Closing:** `Sincerely,` (not "Best regards").
- Keep the `\hypersetup{pdftitle=..., pdfauthor=...}` line filled with the candidate's name.
- The file the user uploads is `cv/submit/<company>_<role>/Tei_Chang_Cover_Letter.pdf` (`/apply` Step 5f), never `cover_<company>_<role>.pdf`.

## Known pitfalls

- **Run the layout check as `python3 tools/verify_layout.py cover_letters/cover_<company>_<role>.pdf --no-footer`.** The letter has no page-number footer.
- A line that follows `\\` and starts with `[` is read as `\\`'s spacing argument and fails to compile. The skeleton braces its placeholders (`{[COMPANY]}`) for this reason; filled-in text never starts with `[`.
- `%`, `&`, `#`, `$`, `_` must be escaped (`25\%`, `AT\&T`) - an unescaped `%` silently comments out the rest of the line.
- First compile downloads the TeX bundle (needs network once); later compiles are offline-cached.
