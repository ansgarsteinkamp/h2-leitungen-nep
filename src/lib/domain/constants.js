export const ALL_VALUE = "__all__";

export const NETWORK_VIEW_OPTIONS = [
   {
      value: "startnetz",
      label: "Startnetz"
   },
   {
      value: "standard",
      label: "Netzausbauvorschlag + Startnetz"
   },
   {
      value: "scenario1",
      label: "Szenario 1 (2037) + Startnetz"
   },
   {
      value: "scenario2",
      label: "Szenario 2 (2037) + Startnetz"
   },
   {
      value: "scenario3",
      label: "Szenario 3 (2037) + Startnetz"
   },
   {
      value: "all",
      label: "Alle Leitungsmaßnahmen"
   }
];

export const SCENARIO_OPTIONS = [
   { value: ALL_VALUE, label: "Alle" },
   { value: "szenario1", label: "Szenario 1" },
   { value: "szenario2", label: "Szenario 2" },
   { value: "szenario3", label: "Szenario 3" }
];

// Der Szenariofilter ist nur in breiten Netzansichten sichtbar; dedizierte Startnetz- und Szenario-Netzauswahlen
// bilden bereits eine feste fachliche Menge.
export const SCENARIO_FILTER_NETWORK_VIEWS = ["standard", "all"];

export const MEASURE_TYPE_OPTIONS = [
   { value: ALL_VALUE, label: "Alle" },
   { value: "startnetz", label: "Startnetz" },
   { value: "netzausbauvorschlag", label: "Netzausbauvorschlag" },
   { value: "scenarioOnly", label: "Nur Szenarioergebnis" }
];

export const INITIAL_BOUNDS = [
   [47.2, 5.5],
   [55.1, 14.6]
];
