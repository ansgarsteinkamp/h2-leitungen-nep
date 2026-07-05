import { getFeatureOperators } from "@/lib/domain/facets";
import { getOperatorSearchTerms } from "@/lib/domain/operators";
import {
   getActiveScenarioLabels,
   getMeasureUnits,
   getOfficialIds,
   getPipelineParticipants,
   getUmstellungOderNeubau,
   hasOgeParticipation,
   isStandardFeature,
   toValueArray
} from "@/lib/domain/pipeline";

const idCollator = new Intl.Collator("de-DE", { numeric: true, sensitivity: "base" });

const normalize = value =>
   String(value ?? "")
      .toLocaleLowerCase("de-DE")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/ß/g, "ss")
      .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
      .replace(/\s+/g, " ");

export const getSearchQuery = value => normalize(value).trim();

export const isSearchActive = query => query.length >= 2;

const normalizedIncludes = (value, query) => normalize(value).includes(query);
const normalizedStartsWith = (value, query) => normalize(value).startsWith(query);

const getFeatureOperatorSearchTerms = feature => getFeatureOperators(feature).flatMap(getOperatorSearchTerms);

// Offizielle Maßnahmen-IDs stehen nicht immer in `id`: bei Verdichterstandorten liegen sie in
// officialIds, ids und massnahmen[].id, Kernnetz-IDs zusätzlich in kernnetzAntragsIds.
function getFeatureIdentifierValues(feature) {
   const props = feature.properties;
   return [
      props.id,
      props.kurzel,
      props.version,
      props.kernnetzAntragsId,
      props.entsogTyndpProjektNr,
      ...getOfficialIds(feature),
      ...(props.kernnetzAntragsIds ?? []),
      ...getMeasureUnits(feature).flatMap(unit => [unit.id, unit.kurzel, unit.kernnetzAntragsId])
   ];
}

function getUnitTypeLabels(unit) {
   return [
      unit.startnetz === true ? "Startnetz" : null,
      unit.netzausbauvorschlag === true ? "Netzausbauvorschlag" : null,
      isStandardFeature(unit) ? "Standard" : null,
      hasOgeParticipation(unit) ? "OGE Open Grid Europe" : null
   ].filter(Boolean);
}

// Standortweite Felder eines Features gelten für jede seiner Einzelmaßnahmen. Aggregatfelder von
// Verdichterstandort-Parents (officialIds, ids, Betreiberlisten, Booleans, Jahres- und
// Szenariomengen) bleiben bewusst außen vor: Sie spiegeln Child-Werte und würden sonst eine
// ausgeblendete Maßnahme über eine andere in die Ansicht heben.
function getSharedSearchValues(feature) {
   const props = feature.properties;
   return [
      props.id,
      props.name,
      props.standortName,
      props.massnahmenart,
      props.entsogTyndpProjektNr,
      props.beschreibung,
      props.projektstatus,
      props.erdgasverstaerkendeMassnahmen,
      ...(props.bundeslaender ?? [])
   ];
}

function getUnitSearchValues(unit) {
   return [
      unit.id,
      unit.kurzel,
      unit.version,
      unit.kernnetzAntragsId,
      unit.entsogTyndpProjektNr,
      ...getOfficialIds(unit),
      ...toValueArray(unit.kernnetzAntragsIds),
      unit.name,
      unit.standortName,
      unit.massnahmenart,
      unit.beschreibung,
      unit.projektstatus,
      unit.erdgasverstaerkendeMassnahmen,
      unit.ibnJahr,
      getUmstellungOderNeubau(unit),
      ...(unit.bundeslaender ?? []),
      ...getActiveScenarioLabels(unit),
      ...getUnitTypeLabels(unit),
      ...getPipelineParticipants(unit).flatMap(getOperatorSearchTerms)
   ];
}

function compareByH2Number(left, right) {
   const leftProps = left.properties;
   const rightProps = right.properties;
   const byId = idCollator.compare(leftProps.id ?? "", rightProps.id ?? "");
   if (byId !== 0) return byId;

   return idCollator.compare(leftProps.name ?? "", rightProps.name ?? "");
}

function getSearchRank(feature, query, active) {
   if (!active) return 0;

   const props = feature.properties;
   const identifierFields = getFeatureIdentifierValues(feature);
   if (identifierFields.some(value => normalize(value) === query)) return 0;
   if (identifierFields.some(value => normalizedStartsWith(value, query))) return 1;
   if (identifierFields.some(value => normalizedIncludes(value, query))) return 2;
   if (normalizedStartsWith(props.name, query)) return 3;
   if (normalizedIncludes(props.name, query)) return 4;
   if (getFeatureOperatorSearchTerms(feature).some(value => normalizedIncludes(value, query))) return 5;

   return 6;
}

// Suche auf Maßnahmen-Ebene: Eine Einzelmaßnahme matcht über ihre eigenen Felder oder über die
// standortweiten Felder ihres Features. So gelten Suche und Filter für dieselbe Einzelmaßnahme
// (strikte Maßnahmen-Semantik, Entscheidung 2026-07-05).
export function unitMatchesSearch(feature, unit, query, active = isSearchActive(query)) {
   if (!active) return true;

   const haystack = [...getSharedSearchValues(feature), ...getUnitSearchValues(unit)].map(normalize).join(" ");

   return haystack.includes(query);
}

export function featureMatchesSearch(feature, query, active = isSearchActive(query)) {
   if (!active) return true;

   return getMeasureUnits(feature).some(unit => unitMatchesSearch(feature, unit, query, active));
}

export function toResultItems(collection, active, query = "") {
   return collection.features
      .map(feature => ({ feature, rank: getSearchRank(feature, query, active) }))
      .sort((left, right) => {
         const byRank = left.rank - right.rank;
         if (byRank !== 0) return byRank;

         return compareByH2Number(left.feature, right.feature);
      })
      .map(({ feature }) => ({
         kind: "pipeline",
         item: feature,
         title: feature.properties.name || feature.properties.id,
         source: active ? "search" : "filtered"
      }));
}
