import { Firmenregel } from './types';

export const FIRMENREGELN: Firmenregel[] = [
  { id: 'fr-heiligabend', monat: 12, tag: 24, freierAnteil: 0.5, pflichturlaub: true,  bezeichnung: 'Heiligabend'  },
  { id: 'fr-silvester',   monat: 12, tag: 31, freierAnteil: 0.5, pflichturlaub: true,  bezeichnung: 'Silvester'    },
];

export const SEG_FARBEN = [
  '#3b82f6', '#f43f5e', '#10b981', '#f59e0b',
  '#8b5cf6', '#06b6d4', '#ec4899',
];

export const REGIONEN: { value: string; label: string }[] = [
  { value: 'DE-BB', label: 'Brandenburg'          },
  { value: 'DE-BE', label: 'Berlin'               },
  { value: 'DE-BW', label: 'Baden-Württemberg'    },
  { value: 'DE-BY', label: 'Bayern'               },
  { value: 'DE-HB', label: 'Bremen'               },
  { value: 'DE-HE', label: 'Hessen'               },
  { value: 'DE-HH', label: 'Hamburg'              },
  { value: 'DE-MV', label: 'Mecklenburg-Vorpommern'},
  { value: 'DE-NI', label: 'Niedersachsen'        },
  { value: 'DE-NW', label: 'NRW'                  },
  { value: 'DE-RP', label: 'Rheinland-Pfalz'      },
  { value: 'DE-SH', label: 'Schleswig-Holstein'   },
  { value: 'DE-SL', label: 'Saarland'             },
  { value: 'DE-SN', label: 'Sachsen'              },
  { value: 'DE-ST', label: 'Sachsen-Anhalt'       },
  { value: 'DE-TH', label: 'Thüringen'            },
];

export const LOCALE = 'de-DE';

const _wt = new Intl.DateTimeFormat(LOCALE, { weekday: 'short' });
// 2025-01-06 ist ein Montag
export const WOCHENTAG_LABELS = Array.from({ length: 7 }, (_, i) => {
  const d = new Temporal.PlainDate(2025, 1, 6).add({ days: i });
  return _wt.format(d).replace('.', '');
});

const _mo = new Intl.DateTimeFormat(LOCALE, { month: 'long' });
export const MONAT_LABELS = Array.from({ length: 12 }, (_, i) => {
  const d = new Temporal.PlainDate(2025, i + 1, 1);
  return _mo.format(d);
});
