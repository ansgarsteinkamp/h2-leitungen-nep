import { useEffect, useMemo, useState } from "react";

import {
   ALL_VALUE,
   KERNNETZ_ID_OPTIONS,
   MEASURE_TYPE_OPTIONS,
   NETWORK_VIEW_OPTIONS,
   SCENARIO_FILTER_NETWORK_VIEWS,
   SCENARIO_OPTIONS
} from "@/lib/domain/constants";
import { featureCollectionToLatLngs } from "@/lib/domain/coordinates";
import { buildFilterOptions, getFeatureTypeFilterValue, matchesFeatureType } from "@/lib/domain/facets";
import { sumPipelineMetrics } from "@/lib/domain/metrics";
import {
   SCENARIO_KEYS,
   getMeasureUnits,
   getPipelineParticipants,
   getUmstellungOderNeubau,
   isScenarioFeature,
   isStandardFeature
} from "@/lib/domain/pipeline";
import { getSearchQuery, isSearchActive, toResultItems, unitMatchesSearch } from "@/lib/domain/search";

export const initialPipelineFilters = {
   featureType: ALL_VALUE,
   kernnetzIdStatus: ALL_VALUE,
   lineType: ALL_VALUE,
   measureType: ALL_VALUE,
   networkView: "standard",
   ogeParticipationOnly: false,
   operator: ALL_VALUE,
   scenario: ALL_VALUE,
   searchTerm: "",
   yearFrom: ALL_VALUE,
   yearTo: ALL_VALUE
};

const MAX_AUTO_FIT_SEARCH_RESULTS = 30;
const KERNNETZ_ID_VALUES = new Set(KERNNETZ_ID_OPTIONS.map(option => option.value));
const NETWORK_VIEW_VALUES = new Set(NETWORK_VIEW_OPTIONS.map(option => option.value));
const NETWORK_VIEWS_WITH_SCENARIO_FILTER = new Set(SCENARIO_FILTER_NETWORK_VIEWS);
const SCENARIO_NETWORK_VIEW_TO_KEY = {
   scenario1: "szenario1",
   scenario2: "szenario2",
   scenario3: "szenario3"
};

function matchesOption(value, selected) {
   return selected === ALL_VALUE || value === selected;
}

function getCommissioningYearValue(value) {
   if (value === null || value === undefined || String(value).trim() === "") return null;

   const year = Number(value);
   return Number.isFinite(year) ? year : null;
}

function getCommissioningYearBounds(features) {
   const years = features
      .flatMap(getMeasureUnits)
      .map(unit => getCommissioningYearValue(unit.ibnJahr))
      .filter(year => year !== null);
   if (years.length === 0) return null;

   return {
      max: Math.max(...years),
      min: Math.min(...years)
   };
}

function clampYear(value, fallback, bounds) {
   const year = Number(value);
   if (!Number.isFinite(year)) return fallback;
   return Math.min(bounds.max, Math.max(bounds.min, Math.round(year)));
}

function isAllYearRange(filters) {
   return filters.yearFrom === ALL_VALUE && filters.yearTo === ALL_VALUE;
}

function matchesCommissioningYearRange(props, filters) {
   if (isAllYearRange(filters)) return true;

   const year = getCommissioningYearValue(props.ibnJahr);
   if (year === null) return false;
   if (filters.yearFrom !== ALL_VALUE && year < filters.yearFrom) return false;
   if (filters.yearTo !== ALL_VALUE && year > filters.yearTo) return false;
   return true;
}

// Alle folgenden Prädikate arbeiten auf Maßnahmen-Ebene: `unit` ist ein Properties-Objekt einer
// Einzelmaßnahme (bei Verdichterstandorten ein Eintrag aus massnahmen[], sonst die Feature-Properties).
function matchesOperators(unit, selected) {
   return selected === ALL_VALUE || getPipelineParticipants(unit).includes(selected);
}

function matchesScenario(unit, selected) {
   return selected === ALL_VALUE || unit[selected] === true;
}

function canUseScenarioFilter(networkView) {
   return NETWORK_VIEWS_WITH_SCENARIO_FILTER.has(networkView);
}

function shouldApplyScenarioFilter(filters) {
   return canUseScenarioFilter(filters.networkView);
}

function isStartnetzUnit(unit) {
   return unit.startnetz === true;
}

function isScenarioOnlyUnit(unit) {
   return !isStandardFeature(unit) && SCENARIO_KEYS.some(key => isScenarioFeature(unit, key));
}

function matchesMeasureType(unit, selected) {
   if (selected === ALL_VALUE) return true;
   if (selected === "scenarioOnly") return isScenarioOnlyUnit(unit);
   return unit[selected] === true;
}

function hasKernnetzId(unit) {
   return String(unit.kernnetzAntragsId ?? "").trim() !== "";
}

function matchesKernnetzIdStatus(unit, selected) {
   if (selected === ALL_VALUE) return true;
   if (selected === "withKernnetzId") return hasKernnetzId(unit);
   if (selected === "withoutKernnetzId") return !hasKernnetzId(unit);
   return true;
}

function matchesOgeParticipation(unit, ogeParticipationOnly) {
   return !ogeParticipationOnly || unit.ogeBeteiligung === true;
}

function matchesScenarioNetworkView(unit, networkView) {
   const scenarioKey = SCENARIO_NETWORK_VIEW_TO_KEY[networkView];
   return isStartnetzUnit(unit) || isScenarioFeature(unit, scenarioKey);
}

function matchesNetworkView(unit, selected) {
   if (selected === "all") return true;
   if (selected === "standard") return isStandardFeature(unit);
   if (SCENARIO_NETWORK_VIEW_TO_KEY[selected]) return matchesScenarioNetworkView(unit, selected);

   return isStandardFeature(unit);
}

function matchesNetworkContext(unit, filters) {
   return (
      matchesNetworkView(unit, filters.networkView) &&
      (!shouldApplyScenarioFilter(filters) || matchesScenario(unit, filters.scenario))
   );
}

export function getMeasureTypeOptionsForFilters(features, filters) {
   const units = features.flatMap(getMeasureUnits);
   return MEASURE_TYPE_OPTIONS.filter(
      option =>
         option.value === ALL_VALUE ||
         units.some(unit => matchesNetworkContext(unit, filters) && matchesMeasureType(unit, option.value))
   );
}

function hasMeasureTypeOption(features, filters, measureType) {
   return getMeasureTypeOptionsForFilters(features, filters).some(option => option.value === measureType);
}

function normalizeFilterCombination(filters, features) {
   let next = filters;
   const yearBounds = getCommissioningYearBounds(features);

   const updateFilter = (key, value) => {
      if (next[key] === value) return;
      next = { ...next, [key]: value };
   };

   if (!NETWORK_VIEW_VALUES.has(next.networkView)) {
      updateFilter("networkView", "standard");
   }

   if (
      next.featureType !== ALL_VALUE &&
      !features.some(feature => getFeatureTypeFilterValue(feature) === next.featureType)
   ) {
      updateFilter("featureType", ALL_VALUE);
   }

   if (!KERNNETZ_ID_VALUES.has(next.kernnetzIdStatus)) {
      updateFilter("kernnetzIdStatus", ALL_VALUE);
   }

   if (!shouldApplyScenarioFilter(next)) {
      updateFilter("scenario", ALL_VALUE);
   }

   if (!hasMeasureTypeOption(features, next, next.measureType)) {
      updateFilter("measureType", ALL_VALUE);
   }

   if (!yearBounds || isAllYearRange(next)) {
      updateFilter("yearFrom", ALL_VALUE);
      updateFilter("yearTo", ALL_VALUE);
   } else {
      const normalizedYearFrom = clampYear(next.yearFrom, yearBounds.min, yearBounds);
      const normalizedYearTo = clampYear(next.yearTo, yearBounds.max, yearBounds);
      const yearFrom = Math.min(normalizedYearFrom, normalizedYearTo);
      const yearTo = Math.max(normalizedYearFrom, normalizedYearTo);

      if (yearFrom === yearBounds.min && yearTo === yearBounds.max) {
         updateFilter("yearFrom", ALL_VALUE);
         updateFilter("yearTo", ALL_VALUE);
      } else {
         updateFilter("yearFrom", yearFrom);
         updateFilter("yearTo", yearTo);
      }
   }

   return next;
}

// Strikte Filtersemantik: Ein Feature matcht, wenn mindestens eine seiner Einzelmaßnahmen alle
// aktiven Kriterien gleichzeitig erfüllt. Parent-Aggregate von Verdichterstandorten werden bewusst
// nicht ausgewertet, damit kombinierte Filter keine falsch-positiven Standorte liefern.
export function unitMatchesFilters(unit, filters) {
   return (
      matchesNetworkContext(unit, filters) &&
      matchesOption(getUmstellungOderNeubau(unit), filters.lineType) &&
      matchesCommissioningYearRange(unit, filters) &&
      matchesMeasureType(unit, filters.measureType) &&
      matchesKernnetzIdStatus(unit, filters.kernnetzIdStatus) &&
      matchesOperators(unit, filters.operator) &&
      matchesOgeParticipation(unit, filters.ogeParticipationOnly)
   );
}

// Suche und Filter müssen von derselben Einzelmaßnahme erfüllt werden: Ein Verdichterstandort
// erscheint nicht, wenn nur eine ausgeblendete Maßnahme den Suchbegriff matcht (Entscheidung
// 2026-07-05).
export function filterPipelines(features, filters, query = getSearchQuery(filters.searchTerm)) {
   const hasActiveSearch = isSearchActive(query);

   return features.filter(
      feature =>
         matchesFeatureType(feature, filters.featureType) &&
         getMeasureUnits(feature).some(
            unit => unitMatchesFilters(unit, filters) && unitMatchesSearch(feature, unit, query, hasActiveSearch)
         )
   );
}

export function filterPipelineCollection(collection, filters, query = getSearchQuery(filters.searchTerm)) {
   return { ...collection, features: filterPipelines(collection.features, filters, query) };
}

export function usePipelineFilters(collection) {
   const [filterState, setFilterState] = useState(initialPipelineFilters);
   const filters = useMemo(
      () => normalizeFilterCombination(filterState, collection.features),
      [collection.features, filterState]
   );

   const options = useMemo(() => buildFilterOptions(collection), [collection]);
   const measureTypeOptions = useMemo(
      () => getMeasureTypeOptionsForFilters(collection.features, filters),
      [collection.features, filters]
   );
   const query = getSearchQuery(filters.searchTerm);
   const hasActiveSearch = isSearchActive(query);

   const filteredCollection = useMemo(() => {
      return filterPipelineCollection(collection, filters, query);
   }, [collection, filters, query]);

   const searchBounds = useMemo(() => {
      if (!hasActiveSearch) return [];
      if (filteredCollection.features.length > MAX_AUTO_FIT_SEARCH_RESULTS) return [];
      return featureCollectionToLatLngs(filteredCollection);
   }, [filteredCollection, hasActiveSearch]);

   const results = useMemo(() => {
      return { items: toResultItems(filteredCollection, hasActiveSearch, query) };
   }, [filteredCollection, hasActiveSearch, query]);

   const metrics = useMemo(
      () =>
         sumPipelineMetrics(
            filteredCollection,
            (unit, feature) =>
               unitMatchesFilters(unit, filters) && unitMatchesSearch(feature, unit, query, hasActiveSearch)
         ),
      [filteredCollection, filters, hasActiveSearch, query]
   );

   // Für den Hinweis im leeren Suchergebnis: Gäbe es in der Netzansicht "Alle Maßnahmen im
   // Datensatz" (ohne Szenariofilter) Treffer für denselben Suchbegriff?
   const searchFallbackCount = useMemo(() => {
      if (!hasActiveSearch || filteredCollection.features.length > 0) return 0;
      if (filters.networkView === "all") return 0;

      return filterPipelines(collection.features, { ...filters, networkView: "all", scenario: ALL_VALUE }, query)
         .length;
   }, [collection.features, filteredCollection, filters, hasActiveSearch, query]);

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

   const commitFilters = nextFilters => {
      setFilterState(normalizeFilterCombination(nextFilters, collection.features));
   };
   const setFilter = (key, value) => commitFilters({ ...filters, [key]: value });
   const setYearRange = ([yearFrom, yearTo]) => {
      const yearBounds = getCommissioningYearBounds(collection.features);
      const nextYearFrom = Math.min(yearFrom, yearTo);
      const nextYearTo = Math.max(yearFrom, yearTo);

      if (yearBounds && nextYearFrom === yearBounds.min && nextYearTo === yearBounds.max) {
         commitFilters({ ...filters, yearFrom: ALL_VALUE, yearTo: ALL_VALUE });
         return;
      }

      commitFilters({ ...filters, yearFrom: nextYearFrom, yearTo: nextYearTo });
   };
   const resetFilters = () => commitFilters(initialPipelineFilters);
   // Aktion zum Fallback-Hinweis im leeren Suchergebnis: wechselt in die Netzansicht "Alle
   // Maßnahmen im Datensatz" (ohne Szenariofilter), Suchbegriff und übrige Filter bleiben erhalten.
   const showSearchFallback = () => commitFilters({ ...filters, networkView: "all", scenario: ALL_VALUE });

   return {
      filteredCollection,
      filters,
      hasActiveSearch,
      metrics,
      options,
      resetFilters,
      results,
      searchFallbackCount,
      kernnetzIdOptions: KERNNETZ_ID_OPTIONS,
      measureTypeOptions,
      networkViewOptions: NETWORK_VIEW_OPTIONS,
      scenarioOptions: SCENARIO_OPTIONS,
      searchBounds,
      setFilter,
      setYearRange,
      showSearchFallback
   };
}
