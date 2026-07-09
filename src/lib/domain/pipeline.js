import { normalizeLookupText, normalizeOperatorName } from "@/lib/domain/operators";

export const SCENARIO_KEYS = ["szenario1", "szenario2", "szenario3"];

export const FEATURE_TYPE_LEITUNG = "leitung";
export const FEATURE_TYPE_GDRM_ANLAGE = "gdrm_anlage";
export const FEATURE_TYPE_VERDICHTERSTANDORT = "verdichterstandort";
export const FEATURE_TYPE_VERDICHTER_AGGREGAT = "verdichter_aggregat";
export const FEATURE_TYPE_SONSTIGES = "sonstiges";
export const FEATURE_TYPE_VERDICHTER_MASSNAHME = "verdichter_massnahme";

export const FEATURE_TYPES = [
   FEATURE_TYPE_LEITUNG,
   FEATURE_TYPE_GDRM_ANLAGE,
   FEATURE_TYPE_VERDICHTERSTANDORT,
   FEATURE_TYPE_VERDICHTER_AGGREGAT,
   FEATURE_TYPE_SONSTIGES
];

const PARTICIPANT_KEYS = ["durchfuehrendeNetzbetreiber", "ansprechpartner"];
const EXECUTING_OPERATOR_KEY = "durchfuehrendeNetzbetreiber";

const nonEmpty = value => value !== null && value !== undefined && String(value).trim() !== "";

export const toValueArray = value => {
   if (Array.isArray(value)) return value;
   if (!nonEmpty(value)) return [];
   return [value];
};

export const splitListValue = value =>
   String(value)
      .split(/[,/]/)
      .map(item => item.trim())
      .filter(nonEmpty);

export function getFeatureTyp(input) {
   const props = input?.properties ?? input ?? {};
   const value = String(props.featureTyp ?? "").trim();
   // v2-Dateien kennen kein featureTyp; dort ist jedes Feature eine Leitung.
   return value || FEATURE_TYPE_LEITUNG;
}

export function isLeitungFeature(input) {
   return getFeatureTyp(input) === FEATURE_TYPE_LEITUNG;
}

export function hasLineGeometry(feature) {
   const type = feature?.geometry?.type;
   return type === "LineString" || type === "MultiLineString";
}

export function isVerdichterstandortFeature(input) {
   return getFeatureTyp(input) === FEATURE_TYPE_VERDICHTERSTANDORT;
}

// Filtereinheit ist die Einzelmaßnahme: Verdichterstandort-Parents tragen nur Aggregatwerte,
// gefiltert wird über die verschachtelten massnahmen[].
export function getMeasureUnits(input) {
   const props = input?.properties ?? input ?? {};
   if (isVerdichterstandortFeature(props) && Array.isArray(props.massnahmen) && props.massnahmen.length > 0) {
      return props.massnahmen;
   }

   return [props];
}

export function getOfficialIds(input) {
   const props = input?.properties ?? input ?? {};
   const ids = toValueArray(props.officialIds)
      .map(value => String(value ?? "").trim())
      .filter(nonEmpty);
   if (ids.length > 0) return ids;

   const id = String(props.id ?? "").trim();
   return id ? [id] : [];
}

export function getUmstellungOderNeubau(input) {
   const props = input?.properties ?? input ?? {};
   const value = String(props.umstellungOderNeubau ?? "").trim();
   if (value) return value;

   const lineType = String(props.leitungstyp ?? "").trim();
   return lineType || null;
}

export function getPipelineParticipants(input) {
   const props = input?.properties ?? input ?? {};
   const rawValues = PARTICIPANT_KEYS.flatMap(key => toValueArray(props[key])).filter(nonEmpty);
   return [...new Set(rawValues.flatMap(splitListValue).map(normalizeOperatorName).filter(nonEmpty))];
}

export function isOgeOperatorName(value) {
   const normalized = normalizeLookupText(value);
   return /\boge\b/.test(normalized) || normalized.includes("open grid europe");
}

export function hasOgeParticipation(input) {
   return getPipelineParticipants(input).some(isOgeOperatorName);
}

export function hasOgeExecutingOperator(input) {
   const props = input?.properties ?? input ?? {};
   return toValueArray(props[EXECUTING_OPERATOR_KEY])
      .filter(nonEmpty)
      .flatMap(splitListValue)
      .map(normalizeOperatorName)
      .some(isOgeOperatorName);
}

export function isStandardFeature(input) {
   const props = input?.properties ?? input ?? {};
   return props.startnetz === true || props.netzausbauvorschlag === true;
}

export function isScenarioFeature(input, scenarioKey) {
   const props = input?.properties ?? input ?? {};
   return SCENARIO_KEYS.includes(scenarioKey) && props[scenarioKey] === true;
}

export function getActiveScenarioLabels(input) {
   return SCENARIO_KEYS.filter(key => isScenarioFeature(input, key)).map(key => key.replace("szenario", "Szenario "));
}
