import { useEffect, useMemo, useState } from "react";

import { ALL_VALUE } from "@/lib/domain/constants";
import { featureCollectionToLatLngs } from "@/lib/domain/coordinates";
import {
   HAERTEGRAD_MAX_STUFE,
   HAERTEGRAD_MIN_STUFE,
   KATEGORIEN,
   NETZE,
   PROJEKT_TYP_PTG,
   PROJEKT_TYP_WASSERSTOFF,
   getMaxLeistungMw,
   isPtgAnlage,
   kategorieKurzlabel
} from "@/lib/domain/marktabfrage";
import { sumMarktabfrageMetrics } from "@/lib/domain/marktabfrageMetrics";
import {
   getSearchQuery,
   isSearchActive,
   projektMatchesSearch,
   toProjektResultItems
} from "@/lib/domain/marktabfrageSearch";

export const PROJEKT_TYP_OPTIONS = [
   { value: ALL_VALUE, label: "Alle" },
   { value: PROJEKT_TYP_WASSERSTOFF, label: "H₂-Projekte" },
   { value: PROJEKT_TYP_PTG, label: "PtG-Anlagen" }
];

export const KATEGORIE_OPTIONS = [
   { value: ALL_VALUE, label: "Alle" },
   ...KATEGORIEN.map(kategorie => ({ value: kategorie, label: kategorieKurzlabel(kategorie) }))
];

export const NETZ_OPTIONS = [{ value: ALL_VALUE, label: "Alle" }, ...NETZE.map(netz => ({ value: netz, label: netz }))];

// Schwellwerte des Mindestleistungs-Filters (MW): logarithmisch gleichmäßig gestufte
// 1-3-10-Schritte decken die vorkommende Spannweite der gemeldeten Leistungen ab, sodass jede
// Stufe die Auswahl spürbar weiter eingrenzt.
export const MIN_LEISTUNG_OPTIONS = [
   { value: ALL_VALUE, label: "Alle" },
   ...[1, 3, 10, 30, 100, 300, 1000].map(mw => ({
      value: String(mw),
      label: mw >= 1000 ? `mind. ${mw / 1000} GW` : `mind. ${mw} MW`
   }))
];

// Voreinstellung des Inbetriebnahme-Sliders: vom kleinsten Jahr im Datensatz bis 2035.
export const DEFAULT_INBETRIEBNAHME_BIS = 2035;

export const initialMarktabfrageFilters = {
   haertegradBis: HAERTEGRAD_MAX_STUFE,
   haertegradVon: HAERTEGRAD_MIN_STUFE,
   jahrBis: DEFAULT_INBETRIEBNAHME_BIS,
   jahrVon: ALL_VALUE,
   kategorie: ALL_VALUE,
   minLeistungMw: ALL_VALUE,
   netz: ALL_VALUE,
   searchTerm: "",
   typ: ALL_VALUE
};

const MAX_AUTO_FIT_SEARCH_RESULTS = 30;
const PROJEKT_TYP_VALUES = new Set(PROJEKT_TYP_OPTIONS.map(option => option.value));
const KATEGORIE_VALUES = new Set(KATEGORIE_OPTIONS.map(option => option.value));
const NETZ_VALUES = new Set(NETZ_OPTIONS.map(option => option.value));
const MIN_LEISTUNG_VALUES = new Set(MIN_LEISTUNG_OPTIONS.map(option => option.value));

function getJahrBounds(features) {
   const jahre = features.map(feature => feature.properties.inbetriebnahmeJahr).filter(jahr => jahr !== null);
   if (jahre.length === 0) return null;

   return {
      max: Math.max(...jahre),
      min: Math.min(...jahre)
   };
}

function clampJahr(value, fallback, bounds) {
   const jahr = Number(value);
   if (!Number.isFinite(jahr)) return fallback;
   return Math.min(bounds.max, Math.max(bounds.min, Math.round(jahr)));
}

function clampHaertegrad(value, fallback) {
   const stufe = Number(value);
   if (!Number.isInteger(stufe)) return fallback;
   return Math.min(HAERTEGRAD_MAX_STUFE, Math.max(HAERTEGRAD_MIN_STUFE, stufe));
}

function isAllJahrRange(filters) {
   return filters.jahrVon === ALL_VALUE && filters.jahrBis === ALL_VALUE;
}

function matchesJahrRange(props, filters) {
   if (isAllJahrRange(filters)) return true;

   const jahr = props.inbetriebnahmeJahr;
   if (jahr === null || jahr === undefined) return false;
   if (filters.jahrVon !== ALL_VALUE && jahr < filters.jahrVon) return false;
   if (filters.jahrBis !== ALL_VALUE && jahr > filters.jahrBis) return false;
   return true;
}

// Der Härtegrad-Filter greift nur bei H₂-Projekten: PtG-Anlagen haben keinen Härtegrad und
// bleiben unabhängig vom gewählten Bereich sichtbar. H₂-Projekte ohne Härtegrad fallen dagegen
// bei eingeschränktem Bereich heraus (analog zu Projekten ohne Jahr beim Jahresfilter).
function matchesHaertegradRange(feature, filters) {
   if (isPtgAnlage(feature)) return true;

   const isFullRange = filters.haertegradVon <= HAERTEGRAD_MIN_STUFE && filters.haertegradBis >= HAERTEGRAD_MAX_STUFE;
   if (isFullRange) return true;

   const stufe = feature.properties.haertegradStufe;
   if (stufe === null || stufe === undefined) return false;
   return stufe >= filters.haertegradVon && stufe <= filters.haertegradBis;
}

function matchesOption(value, selected) {
   return selected === ALL_VALUE || value === selected;
}

// Der Netz-Filter greift nur bei H₂-Projekten: PtG-Anlagen tragen keine Netzzuordnung und
// bleiben sichtbar (analog zum Härtegrad); praktisch springt der Projekttyp beim Einschränken
// ohnehin auf H₂-Projekte um.
function matchesNetz(feature, filters) {
   if (isPtgAnlage(feature)) return true;
   return matchesOption(feature.properties.netz, filters.netz);
}

// Mindestleistung: Das Projekt bleibt sichtbar, wenn seine kategorie-passende Leistungszeitreihe
// in mindestens einem Stützjahr den Schwellwert erreicht; ohne Zeitreihe fällt es heraus.
function matchesMinLeistung(feature, filters) {
   if (filters.minLeistungMw === ALL_VALUE) return true;

   const maxLeistung = getMaxLeistungMw(feature);
   return maxLeistung !== null && maxLeistung >= Number(filters.minLeistungMw);
}

function normalizeFilterCombination(filters, features) {
   let next = filters;
   const jahrBounds = getJahrBounds(features);

   const updateFilter = (key, value) => {
      if (next[key] === value) return;
      next = { ...next, [key]: value };
   };

   if (!PROJEKT_TYP_VALUES.has(next.typ)) {
      updateFilter("typ", ALL_VALUE);
   }
   if (!KATEGORIE_VALUES.has(next.kategorie)) {
      updateFilter("kategorie", ALL_VALUE);
   }
   if (!NETZ_VALUES.has(next.netz)) {
      updateFilter("netz", ALL_VALUE);
   }
   if (!MIN_LEISTUNG_VALUES.has(next.minLeistungMw)) {
      updateFilter("minLeistungMw", ALL_VALUE);
   }
   // Bei PtG-Anlagen sind Kategorie (implizit Einspeisung) und Netz (keine Angabe) ausgeblendet;
   // die Filter dürfen keine versteckte Einschränkung zurücklassen.
   if (next.typ === PROJEKT_TYP_PTG) {
      updateFilter("kategorie", ALL_VALUE);
      updateFilter("netz", ALL_VALUE);
   }

   const haertegradVon = clampHaertegrad(next.haertegradVon, HAERTEGRAD_MIN_STUFE);
   const haertegradBis = clampHaertegrad(next.haertegradBis, HAERTEGRAD_MAX_STUFE);
   updateFilter("haertegradVon", Math.min(haertegradVon, haertegradBis));
   updateFilter("haertegradBis", Math.max(haertegradVon, haertegradBis));

   if (!jahrBounds || isAllJahrRange(next)) {
      updateFilter("jahrVon", ALL_VALUE);
      updateFilter("jahrBis", ALL_VALUE);
   } else {
      const normalizedJahrVon = clampJahr(next.jahrVon, jahrBounds.min, jahrBounds);
      const normalizedJahrBis = clampJahr(next.jahrBis, jahrBounds.max, jahrBounds);
      const jahrVon = Math.min(normalizedJahrVon, normalizedJahrBis);
      const jahrBis = Math.max(normalizedJahrVon, normalizedJahrBis);

      if (jahrVon === jahrBounds.min && jahrBis === jahrBounds.max) {
         updateFilter("jahrVon", ALL_VALUE);
         updateFilter("jahrBis", ALL_VALUE);
      } else {
         updateFilter("jahrVon", jahrVon);
         updateFilter("jahrBis", jahrBis);
      }
   }

   return next;
}

export function projektMatchesFilters(feature, filters) {
   const props = feature.properties;
   return (
      matchesOption(props.projektTyp, filters.typ) &&
      matchesOption(props.kategorie, filters.kategorie) &&
      matchesNetz(feature, filters) &&
      matchesJahrRange(props, filters) &&
      matchesHaertegradRange(feature, filters) &&
      matchesMinLeistung(feature, filters)
   );
}

export function filterProjekte(features, filters, query = getSearchQuery(filters.searchTerm)) {
   const hasActiveSearch = isSearchActive(query);

   return features.filter(
      feature => projektMatchesFilters(feature, filters) && projektMatchesSearch(feature, query, hasActiveSearch)
   );
}

export function filterProjektCollection(collection, filters, query = getSearchQuery(filters.searchTerm)) {
   return { ...collection, features: filterProjekte(collection.features, filters, query) };
}

export function useMarktabfrageFilters(collection) {
   const [filterState, setFilterState] = useState(initialMarktabfrageFilters);
   // Merkt sich, ob (und wodurch) der Projekttyp zuletzt automatisch auf H₂-Projekte umgestellt
   // wurde — durch den Härtegrad-Slider oder den Netz-Filter; das Filterpanel kündigt das für
   // Screenreader über eine Statusmeldung an.
   const [typAutoSwitchGrund, setTypAutoSwitchGrund] = useState(null);
   const filters = useMemo(
      () => normalizeFilterCombination(filterState, collection.features),
      [collection.features, filterState]
   );

   const jahrBounds = useMemo(() => getJahrBounds(collection.features), [collection.features]);
   const hatWasserstoffProjekte = useMemo(
      () => collection.features.some(feature => !isPtgAnlage(feature)),
      [collection.features]
   );

   const query = getSearchQuery(filters.searchTerm);
   const hasActiveSearch = isSearchActive(query);

   const filteredCollection = useMemo(() => {
      return filterProjektCollection(collection, filters, query);
   }, [collection, filters, query]);

   const searchBounds = useMemo(() => {
      if (!hasActiveSearch) return [];
      if (filteredCollection.features.length > MAX_AUTO_FIT_SEARCH_RESULTS) return [];
      return featureCollectionToLatLngs(filteredCollection);
   }, [filteredCollection, hasActiveSearch]);

   const results = useMemo(() => {
      return { items: toProjektResultItems(filteredCollection, hasActiveSearch, query) };
   }, [filteredCollection, hasActiveSearch, query]);

   const metrics = useMemo(() => sumMarktabfrageMetrics(filteredCollection), [filteredCollection]);

   useEffect(() => {
      let ignore = false;

      queueMicrotask(() => {
         if (ignore) return;

         setFilterState(current => normalizeFilterCombination(current, collection.features));
      });

      return () => {
         ignore = true;
      };
   }, [collection.features]);

   // Die Setter lesen `filters` aus der Render-Closure: Zwei Setter-Aufrufe im selben Batch
   // würden einander überschreiben. Mehr-Key-Änderungen daher als ein commitFilters-Aufruf
   // ausdrücken (siehe setFilter/setHaertegradRange).
   const commitFilters = nextFilters => {
      setFilterState(normalizeFilterCombination(nextFilters, collection.features));
   };
   const setFilter = (key, value) => {
      if (key === "typ") setTypAutoSwitchGrund(null);
      // Der Netz-Filter beschreibt nur H₂-Projekte. Damit weiterhin sichtbare PtG-Anlagen (ohne
      // Netzzuordnung) nicht als Treffer missverstanden werden, springt der Projekttyp von
      // "Alle" auf H₂-Projekte um — analog zum Härtegrad-Slider.
      if (key === "netz" && value !== ALL_VALUE && filters.typ === ALL_VALUE) {
         setTypAutoSwitchGrund("netz");
         commitFilters({ ...filters, netz: value, typ: PROJEKT_TYP_WASSERSTOFF });
         return;
      }
      commitFilters({ ...filters, [key]: value });
   };
   const setJahrRange = ([jahrVon, jahrBis]) => {
      commitFilters({ ...filters, jahrVon: Math.min(jahrVon, jahrBis), jahrBis: Math.max(jahrVon, jahrBis) });
   };
   const setHaertegradRange = ([von, bis]) => {
      const haertegradVon = Math.min(von, bis);
      const haertegradBis = Math.max(von, bis);
      // Ein eingeschränkter Härtegrad-Bereich wirkt nur auf H₂-Projekte. Damit die weiterhin
      // sichtbaren PtG-Anlagen (ohne Härtegrad) nicht als Treffer des Bereichs missverstanden
      // werden, springt der Projekttyp von "Alle" auf H₂-Projekte um.
      const schraenktEin = haertegradVon > HAERTEGRAD_MIN_STUFE || haertegradBis < HAERTEGRAD_MAX_STUFE;
      const springtUm = schraenktEin && filters.typ === ALL_VALUE;
      const typ = springtUm ? PROJEKT_TYP_WASSERSTOFF : filters.typ;

      if (springtUm) setTypAutoSwitchGrund("haertegrad");
      commitFilters({ ...filters, haertegradBis, haertegradVon, typ });
   };
   const resetFilters = () => {
      setTypAutoSwitchGrund(null);
      commitFilters(initialMarktabfrageFilters);
   };

   return {
      filteredCollection,
      filters,
      hasActiveSearch,
      hatWasserstoffProjekte,
      jahrBounds,
      kategorieOptions: KATEGORIE_OPTIONS,
      metrics,
      minLeistungOptions: MIN_LEISTUNG_OPTIONS,
      netzOptions: NETZ_OPTIONS,
      projektTypOptions: PROJEKT_TYP_OPTIONS,
      resetFilters,
      results,
      searchBounds,
      setFilter,
      setHaertegradRange,
      setJahrRange,
      typAutoSwitchGrund
   };
}
