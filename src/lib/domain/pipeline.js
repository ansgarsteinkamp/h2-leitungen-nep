import { normalizeLookupText, normalizeOperatorName } from "@/lib/domain/operators";

export const SCENARIO_KEYS = ["szenario1", "szenario2", "szenario3"];

const PARTICIPANT_KEYS = ["durchfuehrendeNetzbetreiber", "ansprechpartner"];

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

export function getPipelineParticipants(input) {
   const props = input?.properties ?? input ?? {};
   const rawValues = PARTICIPANT_KEYS.flatMap(key => toValueArray(props[key])).filter(nonEmpty);
   return [...new Set(rawValues.flatMap(splitListValue).map(normalizeOperatorName).filter(nonEmpty))];
}

export function hasOgeParticipation(input) {
   return getPipelineParticipants(input).some(value => {
      const normalized = normalizeLookupText(value);
      return /\boge\b/.test(normalized) || normalized.includes("open grid europe");
   });
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
