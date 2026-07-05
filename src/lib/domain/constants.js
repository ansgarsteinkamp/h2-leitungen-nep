export const ALL_VALUE = "__all__";

export const NETWORK_VIEW_OPTIONS = [
   {
      value: "standard",
      label: "Startnetz und Netzausbauvorschlag"
   },
   {
      value: "scenario1",
      label: "Startnetz und Szenario 1 (2037)"
   },
   {
      value: "scenario2",
      label: "Startnetz und Szenario 2 (2037)"
   },
   {
      value: "scenario3",
      label: "Startnetz und Szenario 3 (2037)"
   },
   {
      value: "all",
      label: "Alle Maßnahmen im Datensatz"
   }
];

export const SCENARIO_OPTIONS = [
   { value: ALL_VALUE, label: "Alle" },
   { value: "szenario1", label: "Szenario 1" },
   { value: "szenario2", label: "Szenario 2" },
   { value: "szenario3", label: "Szenario 3" }
];

// Der Szenariofilter ist nur in breiten Netzansichten sichtbar; dedizierte Szenario-Netzansichten bilden bereits eine
// feste fachliche Menge.
export const SCENARIO_FILTER_NETWORK_VIEWS = ["standard", "all"];

export const MEASURE_TYPE_OPTIONS = [
   { value: ALL_VALUE, label: "Alle" },
   { value: "startnetz", label: "Startnetz" },
   { value: "netzausbauvorschlag", label: "Netzausbauvorschlag" },
   { value: "scenarioOnly", label: "Nur Modellierung 2037" }
];

// Werte entsprechen featureTyp aus v3; "verdichter" fasst Standorte und Aggregatmaßnahmen zusammen.
export const FEATURE_TYPE_FILTER_OPTIONS = [
   { value: ALL_VALUE, label: "Alle" },
   { value: "leitung", label: "Leitungen" },
   { value: "verdichter", label: "Verdichter" },
   { value: "gdrm_anlage", label: "GDRM" },
   { value: "sonstiges", label: "Sonstige" }
];

export const KERNNETZ_ID_OPTIONS = [
   { value: ALL_VALUE, label: "Alle" },
   { value: "withKernnetzId", label: "Mit Kernnetz-ID" },
   { value: "withoutKernnetzId", label: "Ohne Kernnetz-ID" }
];

export const INITIAL_BOUNDS = [
   [47.35, 5.85],
   [54.95, 14.35]
];
