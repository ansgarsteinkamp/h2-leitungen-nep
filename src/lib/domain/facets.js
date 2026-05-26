import { ALL_VALUE } from "@/lib/domain/constants";
import { getPipelineParticipants } from "@/lib/domain/pipeline";

const collator = new Intl.Collator("de", { numeric: true, sensitivity: "base" });

const nonEmpty = value => value !== null && value !== undefined && String(value).trim() !== "";

const sortedValues = values => [...values].filter(nonEmpty).sort(collator.compare);

export function getFeatureOperators(feature) {
   return getPipelineParticipants(feature);
}

const option = value => ({ value, label: value });

export function buildFilterOptions(collection) {
   const lineTypes = new Set();
   const operators = new Set();
   const years = new Set();

   collection.features.forEach(feature => {
      const props = feature.properties;
      if (nonEmpty(props.leitungstyp)) lineTypes.add(props.leitungstyp);
      if (nonEmpty(props.ibnJahr)) years.add(String(props.ibnJahr));
      getFeatureOperators(feature).forEach(value => operators.add(value));
   });

   return {
      lineTypes: [{ value: ALL_VALUE, label: "Alle" }, ...sortedValues(lineTypes).map(option)],
      operators: [{ value: ALL_VALUE, label: "Alle genannten Unternehmen" }, ...sortedValues(operators).map(option)],
      years: [{ value: ALL_VALUE, label: "Alle Jahre" }, ...sortedValues(years).map(option)]
   };
}
