# Rate Calculator

Freelancers in Germany guess their hourly rate and then lose a third of it to tax, health insurance and the hours nobody pays for; this calculator works out the minimum rate from the net income you actually want to live on.

**Use it online:** [hmsk.life/tools/rate-calculator](https://hmsk.life/tools/rate-calculator/) (runs in your browser, nothing is sent anywhere).

## What it does

- Working days per Bundesland for 2026 and 2027: weekdays minus statewide public holidays (Easter-based ones computed), minus vacation, sick and training days, then a non-billable share for admin and acquisition.
- Income tax with the 2026 tariff of § 32a EStG (Grundfreibetrag 12,348), Splitting for married couples, Solidaritätszuschlag with Freigrenze and Milderungszone, optional church tax (8 % / 9 %).
- Gewerbesteuer for Gewerbetreibende (Hebesatz, Freibetrag 24,500, credit under § 35 EStG), none for Freiberufler.
- Statutory health and care insurance for voluntary members (14.6 % or 14.0 %, Zusatzbeitrag, Pflegeversicherung by number of children, minimum base and ceiling 2026), private insurance as a monthly amount, Künstlersozialkasse.
- Pension: Deutsche Rentenversicherung (18.6 % of profit or Regelbeitrag) or your own monthly provision.
- A solver finds the revenue at which net income equals your target, because tax and contributions depend on profit.
- Output: hourly and day rate (net and with 19 % VAT), billable hours, where every euro of the rate goes, a "what if" slider, the Kleinunternehmer limits (§ 19 UStG).
- English and German, inputs saved in your browser and in the URL (share link), print view.

All statutory numbers live in [`public/config.js`](public/config.js), each with its source. The app lists them under "Sources and assumptions". Not tax advice.

## Quick start

No build step, no dependencies. Serve `public/` with any static web server:

```sh
python3 -m http.server 8080 --directory public
# open http://localhost:8080/
```

(ES modules do not load from `file://`, so a server is needed.)

Run the tests (Node.js 20+):

```sh
node --test tests/
```

Tests cover the 2026 income tax tariff against values computed by hand from § 32a EStG, the Soli, trade tax, care insurance rates, public holidays per Bundesland for 2026 and 2027, a full end-to-end case and the solver.

## Files

| File | What |
|---|---|
| `public/config.js` | every statutory figure with source URL |
| `public/calc.js` | pure calculation (tax, contributions, solver), no DOM |
| `public/holidays.js` | Easter and public holidays per Bundesland |
| `public/i18n.js` | English and German texts |
| `public/app.js`, `index.html`, `app.css` | the UI |

To self-host, set `LINK_BASE` in `public/config.js` if the top-strip links should point somewhere other than hmsk.life. Fonts (Newsreader, Public Sans; SIL Open Font License) are in `public/fonts/`; the shared hmsk.life look is in `public/letterpress.css`.

## Updating for a new year

Change the numbers in `public/config.js` (tax tariff, Soli Freigrenze, social insurance figures, Zusatzbeitrag), add the year to `YEARS`, update the hand-checked values in `tests/tax.test.js`, run the tests.

## License

MIT, see [LICENSE](LICENSE).
