import { getFeatureOperators } from "@/lib/domain/facets";
import { getOperatorSearchTerms } from "@/lib/domain/operators";
import { getActiveScenarioLabels, hasOgeParticipation, isStandardFeature } from "@/lib/domain/pipeline";

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
   const identifierFields = [
      props.id,
      props.kurzel,
      props.version,
      props.kernnetzAntragsId,
      props.entsogTyndpProjektNr
   ];
   if (identifierFields.some(value => normalize(value) === query)) return 0;
   if (identifierFields.some(value => normalizedStartsWith(value, query))) return 1;
   if (identifierFields.some(value => normalizedIncludes(value, query))) return 2;
   if (normalizedStartsWith(props.name, query)) return 3;
   if (normalizedIncludes(props.name, query)) return 4;
   if (getFeatureOperatorSearchTerms(feature).some(value => normalizedIncludes(value, query))) return 5;

   return 6;
}

export function featureMatchesSearch(feature, query, active) {
   if (!active) return true;

   const props = feature.properties;
   const typeLabels = [
      props.startnetz === true ? "Startnetz" : null,
      props.netzausbauvorschlag === true ? "Netzausbauvorschlag" : null,
      isStandardFeature(feature) ? "Standard" : null,
      hasOgeParticipation(feature) ? "OGE Open Grid Europe" : null
   ].filter(Boolean);

   const haystack = [
      props.id,
      props.kurzel,
      props.version,
      props.name,
      props.leitungstyp,
      props.beschreibung,
      props.projektstatus,
      props.ibnJahr,
      props.kernnetzAntragsId,
      props.entsogTyndpProjektNr,
      props.erdgasverstaerkendeMassnahmen,
      ...getActiveScenarioLabels(feature),
      ...typeLabels,
      ...(props.bundeslaender ?? []),
      ...getFeatureOperatorSearchTerms(feature)
   ]
      .map(normalize)
      .join(" ");

   return haystack.includes(query);
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
