import { ALL_VALUE, FEATURE_TYPE_FILTER_OPTIONS } from "@/lib/domain/constants";
import {
   FEATURE_TYPE_VERDICHTERSTANDORT,
   FEATURE_TYPE_VERDICHTER_AGGREGAT,
   getFeatureTyp,
   getMeasureUnits,
   getPipelineParticipants,
   getUmstellungOderNeubau
} from "@/lib/domain/pipeline";

const collator = new Intl.Collator("de", { numeric: true, sensitivity: "base" });

const nonEmpty = value => value !== null && value !== undefined && String(value).trim() !== "";

const sortedValues = values => [...values].filter(nonEmpty).sort(collator.compare);
const sortedYears = values =>
   [...values]
      .filter(nonEmpty)
      .map(Number)
      .filter(Number.isFinite)
      .sort((a, b) => a - b);

export function getFeatureOperators(feature) {
   return getPipelineParticipants(feature);
}

// Filterwert des Maßnahmenart-Filters: Standorte und Aggregatmaßnahmen teilen sich den Wert "verdichter".
export function getFeatureTypeFilterValue(input) {
   const featureTyp = getFeatureTyp(input);
   if (featureTyp === FEATURE_TYPE_VERDICHTERSTANDORT || featureTyp === FEATURE_TYPE_VERDICHTER_AGGREGAT) {
      return "verdichter";
   }

   return featureTyp;
}

export function matchesFeatureType(feature, selected) {
   return selected === ALL_VALUE || getFeatureTypeFilterValue(feature) === selected;
}

const option = value => ({ value, label: value });

export function buildFilterOptions(collection) {
   const lineTypes = new Set();
   const operators = new Set();
   const years = new Set();
   const featureTypeValues = new Set();

   collection.features.forEach(feature => {
      featureTypeValues.add(getFeatureTypeFilterValue(feature));
      getMeasureUnits(feature).forEach(unit => {
         const lineType = getUmstellungOderNeubau(unit);
         if (nonEmpty(lineType)) lineTypes.add(lineType);
         if (nonEmpty(unit.ibnJahr)) years.add(String(unit.ibnJahr));
         getPipelineParticipants(unit).forEach(value => operators.add(value));
      });
   });

   const featureTypes = FEATURE_TYPE_FILTER_OPTIONS.filter(
      item => item.value === ALL_VALUE || featureTypeValues.has(item.value)
   );

   return {
      featureTypes: featureTypes.length > 2 ? featureTypes : [],
      lineTypes: [{ value: ALL_VALUE, label: "Alle" }, ...sortedValues(lineTypes).map(option)],
      operators: [{ value: ALL_VALUE, label: "Alle genannten Unternehmen" }, ...sortedValues(operators).map(option)],
      years: sortedYears(years)
   };
}
