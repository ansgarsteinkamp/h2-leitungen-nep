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
import { buildFilterOptions, getFeatureOperators } from "@/lib/domain/facets";
import { sumPipelineMetrics } from "@/lib/domain/metrics";
import { SCENARIO_KEYS, isScenarioFeature, isStandardFeature } from "@/lib/domain/pipeline";
import { featureMatchesSearch, getSearchQuery, isSearchActive, toResultItems } from "@/lib/domain/search";

export const initialPipelineFilters = {
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

function getCommissioningYear(feature) {
   return getCommissioningYearValue(feature.properties.ibnJahr);
}

function getCommissioningYearBounds(features) {
   const years = features.map(getCommissioningYear).filter(year => year !== null);
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

function matchesOperators(feature, selected) {
   return selected === ALL_VALUE || getFeatureOperators(feature).includes(selected);
}

function matchesScenario(props, selected) {
   return selected === ALL_VALUE || props[selected] === true;
}

function canUseScenarioFilter(networkView) {
   return NETWORK_VIEWS_WITH_SCENARIO_FILTER.has(networkView);
}

function shouldApplyScenarioFilter(filters) {
   return canUseScenarioFilter(filters.networkView);
}

function hasMarker(feature, marker) {
   return feature.properties[marker] === true;
}

function isStartnetzFeature(feature) {
   return hasMarker(feature, "startnetz");
}

function isScenarioOnlyFeature(feature) {
   return !isStandardFeature(feature) && SCENARIO_KEYS.some(key => isScenarioFeature(feature, key));
}

function matchesMeasureType(feature, selected) {
   if (selected === ALL_VALUE) return true;
   if (selected === "scenarioOnly") return isScenarioOnlyFeature(feature);
   return hasMarker(feature, selected);
}

function hasKernnetzId(feature) {
   return String(feature.properties.kernnetzAntragsId ?? "").trim() !== "";
}

function matchesKernnetzIdStatus(feature, selected) {
   if (selected === ALL_VALUE) return true;
   if (selected === "withKernnetzId") return hasKernnetzId(feature);
   if (selected === "withoutKernnetzId") return !hasKernnetzId(feature);
   return true;
}

function matchesOgeParticipation(props, ogeParticipationOnly) {
   return !ogeParticipationOnly || props.ogeBeteiligung === true;
}

function matchesScenarioNetworkView(feature, networkView) {
   const scenarioKey = SCENARIO_NETWORK_VIEW_TO_KEY[networkView];
   return isStartnetzFeature(feature) || isScenarioFeature(feature, scenarioKey);
}

function matchesNetworkView(feature, selected) {
   if (selected === "all") return true;
   if (selected === "standard") return isStandardFeature(feature);
   if (SCENARIO_NETWORK_VIEW_TO_KEY[selected]) return matchesScenarioNetworkView(feature, selected);

   return isStandardFeature(feature);
}

function matchesNetworkContext(feature, filters) {
   return (
      matchesNetworkView(feature, filters.networkView) &&
      (!shouldApplyScenarioFilter(filters) || matchesScenario(feature.properties, filters.scenario))
   );
}

export function getMeasureTypeOptionsForFilters(features, filters) {
   return MEASURE_TYPE_OPTIONS.filter(
      option =>
         option.value === ALL_VALUE ||
         features.some(feature => matchesNetworkContext(feature, filters) && matchesMeasureType(feature, option.value))
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

export function filterPipelines(features, filters, query = getSearchQuery(filters.searchTerm)) {
   const hasActiveSearch = isSearchActive(query);

   return features.filter(feature => {
      const props = feature.properties;

      return (
         matchesNetworkContext(feature, filters) &&
         matchesOption(props.leitungstyp, filters.lineType) &&
         matchesCommissioningYearRange(props, filters) &&
         matchesMeasureType(feature, filters.measureType) &&
         matchesKernnetzIdStatus(feature, filters.kernnetzIdStatus) &&
         matchesOperators(feature, filters.operator) &&
         matchesOgeParticipation(props, filters.ogeParticipationOnly) &&
         featureMatchesSearch(feature, query, hasActiveSearch)
      );
   });
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

   const metrics = useMemo(() => sumPipelineMetrics(filteredCollection), [filteredCollection]);

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

   return {
      filteredCollection,
      filters,
      hasActiveSearch,
      metrics,
      options,
      resetFilters,
      results,
      kernnetzIdOptions: KERNNETZ_ID_OPTIONS,
      measureTypeOptions,
      networkViewOptions: NETWORK_VIEW_OPTIONS,
      scenarioOptions: SCENARIO_OPTIONS,
      searchBounds,
      setFilter,
      setYearRange
   };
}
