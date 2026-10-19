// All legal and statutory figures used by the calculator, in one place.
// Every value has a source. Checked 2026-10-19. Update once a year (and whenever a law changes).
// Amounts in EUR. Rates as decimals (0.146 = 14.6 %).

export const TAX_YEAR = 2026;
export const CHECKED = '2026-10-19';

// Links in the top strip. '' = same host (hosted on hmsk.life). Self-hosted copies point to hmsk.life.
export const LINK_BASE = 'https://hmsk.life';

export const SOURCES = {
  estg32a: 'https://www.gesetze-im-internet.de/estg/__32a.html',
  estg35: 'https://www.gesetze-im-internet.de/estg/__35.html',
  estg51a: 'https://www.gesetze-im-internet.de/estg/__51a.html',
  solzg3: 'https://www.gesetze-im-internet.de/solzg_1995/__3.html',
  solzg4: 'https://www.gesetze-im-internet.de/solzg_1995/__4.html',
  gewstg11: 'https://www.gesetze-im-internet.de/gewstg/__11.html',
  ustg19: 'https://www.gesetze-im-internet.de/ustg_1980/__19.html',
  sgb5_240: 'https://www.gesetze-im-internet.de/sgb_5/__240.html',
  sgb5_241: 'https://www.gesetze-im-internet.de/sgb_5/__241.html',
  sgb5_243: 'https://www.gesetze-im-internet.de/sgb_5/__243.html',
  sgb11_55: 'https://www.gesetze-im-internet.de/sgb_11/__55.html',
  ksvg3: 'https://www.gesetze-im-internet.de/ksvg/__3.html',
  bmas2026: 'https://www.bmas.de/DE/Service/Presse/Pressemitteilungen/2025/sozialversicherungsrechengroessen-2026.html',
  bmgZusatz: 'https://www.bundesanzeiger.de/pub/publication/oUJYVk8GYRXybnb9Y4h/content/oUJYVk8GYRXybnb9Y4h/BAnz%20AT%2010.11.2025%20B7.pdf',
  gkvPv: 'https://www.gkv-spitzenverband.de/pflegeversicherung/pv_grundprinzipien/pflege_beitragssatz/beitragssatz.jsp',
  drvSelbst: 'https://www.deutsche-rentenversicherung.de/DRV/DE/Rente/Arbeitnehmer-und-Selbststaendige/03_Selbststaendige/selbststaendige_node',
  drv2026: 'https://www.deutsche-rentenversicherung.de/DRV/DE/Ueber-uns-und-Presse/Presse/Pressemitteilungen/Pressemitteilungen-archiv/2025/2025-12-18-rv-aenderungen-2026.html',
  ksk: 'https://www.kuenstlersozialkasse.de/',
};

// § 32a Abs. 1 EStG, from Veranlagungszeitraum 2026 (Steuerfortentwicklungsgesetz). Source: SOURCES.estg32a
export const INCOME_TAX = {
  grundfreibetrag: 12348,       // zone 1: 0 up to 12,348
  zone2End: 17799,              // (914.51 * y + 1400) * y, y = (x - 12348) / 10000
  zone2: [914.51, 1400],
  zone3End: 69878,              // (173.10 * z + 2397) * z + 1034.87, z = (x - 17799) / 10000
  zone3: [173.10, 2397, 1034.87],
  zone4End: 277825,             // 0.42 * x - 11135.63
  zone4: [0.42, 11135.63],
  zone5: [0.45, 19470.38],      // from 277,826: 0.45 * x - 19470.38
  sonderausgabenPauschbetrag: 36, // § 10c EStG, doubled for joint assessment
};

// Solidaritätszuschlag: 5.5 %, Freigrenze 20,350 / 40,700 (joint), Milderungszone 11.9 % of the excess.
// Sources: SOURCES.solzg3 (§ 3 Abs. 3), SOURCES.solzg4 (§ 4)
export const SOLI = { rate: 0.055, freigrenze: 20350, freigrenzeJoint: 40700, milderung: 0.119 };

// Kirchensteuer: 8 % in Bayern and Baden-Württemberg, 9 % in all other Länder (state church tax laws).
// Base is the income tax without the § 35 EStG trade-tax credit (§ 51a Abs. 2 Satz 3 EStG).
export const CHURCH_TAX = { BW: 0.08, BY: 0.08, default: 0.09 };

// Gewerbesteuer: Freibetrag 24,500 for natural persons, Gewerbeertrag rounded down to 100,
// Steuermesszahl 3.5 % (§ 11 GewStG). Credit against income tax: 4.0 x Messbetrag, capped at the
// trade tax actually paid and at the income tax attributable to trade income (§ 35 EStG).
export const TRADE_TAX = { freibetrag: 24500, messzahl: 0.035, anrechnungFactor: 4.0, defaultHebesatz: 400, minHebesatz: 200 };

// Social insurance figures 2026 (Sozialversicherungsrechengrößen-Verordnung 2026). Source: SOURCES.bmas2026
export const SOCIAL = {
  bezugsgroesseMonth: 3955,          // monthly Bezugsgröße (uniform since 2025)
  bbgKvPvMonth: 5812.50,             // Beitragsbemessungsgrenze KV/PV: 69,750 / year
  bbgRvMonth: 8450,                  // Beitragsbemessungsgrenze RV: 101,400 / year
  // Freiwillig versicherte Selbstständige: minimum base = 1/90 of the monthly Bezugsgröße per calendar day,
  // i.e. 30/90 = one third per month: 1,318.33 (§ 240 Abs. 4 SGB V). Source: SOURCES.sgb5_240
  mindestbemessungMonth: Math.round(3955 / 3 * 100) / 100,
};

// Gesetzliche Krankenversicherung. Sources: SOURCES.sgb5_241, SOURCES.sgb5_243, SOURCES.bmgZusatz
export const HEALTH = {
  generalRate: 0.146,       // allgemeiner Beitragssatz, with Krankengeld (§ 241 SGB V)
  reducedRate: 0.140,       // ermäßigter Beitragssatz, no Krankengeld (§ 243 SGB V)
  avgZusatz: 0.029,         // durchschnittlicher Zusatzbeitragssatz 2026, BMG announcement 7 Nov 2025.
                            // Each Krankenkasse sets its own; actual rates range from about 2 % to over 4 %.
  krankengeldTaxCut: 0.04,  // contributions that include Krankengeld are deductible only after a 4 % cut
                            // (§ 10 Abs. 1 Nr. 3 Buchst. a Satz 4 EStG)
};

// Soziale Pflegeversicherung 2026: 3.6 %, +0.6 points for members aged 23+ without children,
// -0.25 points per child from the 2nd to the 5th child (children under 25).
// Sources: SOURCES.gkvPv, SOURCES.sgb11_55. A higher childless surcharge is under discussion (not law).
export const CARE = { rate: 0.036, childlessSurcharge: 0.006, perChildDiscount: 0.0025, maxDiscountChildren: 4 };

// Gesetzliche Rentenversicherung 2026. Sources: SOURCES.drv2026, SOURCES.drvSelbst
export const PENSION = {
  rate: 0.186,                 // Beitragssatz 18.6 %
  regelbeitragMonth: 735.63,   // Regelbeitrag for self-employed (18.6 % of the Bezugsgröße)
  minBaseMonth: 603,           // minimum base for compulsorily insured self-employed (Geringfügigkeitsgrenze 2026)
  // Höchstbetrag for deducting Altersvorsorge (§ 10 Abs. 3 EStG): maximum contribution to the knappschaftliche RV.
  // 124,800 x 24.7 % = 30,826 (derived, not an officially published figure).
  deductibleMax: 30826,
};

// Künstlersozialkasse: the KSK pays half of KV/PV/RV for artists and publicists (KSVG).
// Members pay half of KV (general rate + Zusatzbeitrag), half of the PV rate plus the full childless surcharge,
// and 9.3 % RV. Insurance needs income above 3,900 a year (§ 3 KSVG). Source: SOURCES.ksvg3, SOURCES.ksk
export const KSK = { minIncomeYear: 3900, memberShare: 0.5 };

// Kleinunternehmer (§ 19 UStG, since 2025): no VAT if turnover was at most 25,000 last year and stays at most
// 100,000 this year. Source: SOURCES.ustg19
export const SMALL_BUSINESS = { priorYear: 25000, currentYear: 100000 };
export const VAT_RATE = 0.19;

// Years the holiday calendar supports. Tax figures always come from TAX_YEAR.
export const YEARS = [2026, 2027];
