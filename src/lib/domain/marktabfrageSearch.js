import { getMarktabfrageAttribute } from "@/lib/domain/marktabfrage";
import { projektTitle } from "@/lib/domain/marktabfrageFormatters";
import { getSearchQuery, isSearchActive as isTextSearchActive, normalizeSearchText } from "@/lib/domain/search";

const idCollator = new Intl.Collator("de-DE", { numeric: true, sensitivity: "base" });

// Getrimmt, damit führende Trennzeichen (z. B. das "#" der Projektnummer) den Vergleich mit der
// ebenfalls getrimmten Suchanfrage nicht verfälschen.
const normalize = value => normalizeSearchText(value).trim();

const normalizedIncludes = (value, query) => normalize(value).includes(query);
const normalizedStartsWith = (value, query) => normalize(value).startsWith(query);

// Reine Ziffern-Anfragen sind Projektnummern- oder PLZ-Suchen ("#123" normalisiert zu "123"):
// Die Identifikatoren matchen dann nur exakt — per Teilstring fände "123" sonst auch die
// Projektnummer 2123 und jede Datenbank-ID, die zufällig "123" enthält. Namen, Betreiber und
// Orte bleiben Teilstring-Suche.
const isNumericQuery = query => /^\d+$/.test(query);

// Ziffern-Anfragen sind schon ab einem Zeichen aktiv: Sie matchen Identifikatoren nur exakt,
// eine einstellige Projektnummer ("#5") bliebe mit der 2-Zeichen-Schwelle sonst unauffindbar.
export const isSearchActive = query => isNumericQuery(query) || isTextSearchActive(query);

const identifierMatches = (value, query) =>
   isNumericQuery(query) ? normalize(value) === query : normalizedIncludes(value, query);

// Suchfelder laut Abfrage-Design: Projektname, Betreiber (Großkunde bzw. Anlagenbetreiber),
// Ort und PLZ des Projektstandorts, Datenbank-ID und Projektnummer (#…). Kategoriale Facetten
// (Status, Härtegrad, Netz, Bundesland) bleiben bewusst außen vor — sie erzeugten als
// Suchfelder nur unbrauchbar große Treffermengen.
function getIdentifierValues(feature) {
   const props = feature.properties;
   const attribute = getMarktabfrageAttribute(props);
   return [props.id, attribute.datenbankId, props.projektnummer, attribute.plz];
}

function getNameSearchValues(feature) {
   const props = feature.properties;
   // Ort matcht per Teilstring wie Name und Betreiber; PtG-Anlagen haben keinen Ort in den
   // Quelldaten, aber meist eine PLZ (Identifikator, exakt).
   return [props.name, props.betreiber, getMarktabfrageAttribute(props).ort];
}

export function projektMatchesSearch(feature, query, active = isSearchActive(query)) {
   if (!active) return true;

   return (
      getIdentifierValues(feature).some(value => identifierMatches(value, query)) ||
      getNameSearchValues(feature).some(value => normalizedIncludes(value, query))
   );
}

function getSearchRank(feature, query, active) {
   if (!active) return 0;

   const identifiers = getIdentifierValues(feature);
   if (identifiers.some(value => normalize(value) === query)) return 0;
   if (!isNumericQuery(query)) {
      if (identifiers.some(value => normalizedStartsWith(value, query))) return 1;
      if (identifiers.some(value => normalizedIncludes(value, query))) return 2;
   }
   if (normalizedStartsWith(feature.properties.name, query)) return 3;
   if (normalizedIncludes(feature.properties.name, query)) return 4;
   if (normalizedIncludes(feature.properties.betreiber, query)) return 5;

   // Rang 6: Treffer nur über den Ort — die Ergebnisliste enthält ausschließlich gefilterte
   // Treffer, daher braucht der Ort keinen eigenen Prüfschritt und sortiert als letzte Stufe.
   return 6;
}

// Namen, die nicht mit einem Buchstaben beginnen (etwa mit #, Ziffern oder anderen
// Sonderzeichen), sortieren hinter die alphabetischen Einträge, damit die Liste mit "A"
// statt mit Sonderzeichen und Ziffern beginnt.
const nameSortGroup = name => (/^\p{L}/u.test(String(name ?? "").trim()) ? 0 : 1);

function compareByName(left, right) {
   const byGroup = nameSortGroup(left.properties.name) - nameSortGroup(right.properties.name);
   if (byGroup !== 0) return byGroup;

   const byName = idCollator.compare(left.properties.name ?? "", right.properties.name ?? "");
   if (byName !== 0) return byName;

   return idCollator.compare(left.properties.id ?? "", right.properties.id ?? "");
}

export function toProjektResultItems(collection, active, query = "") {
   return collection.features
      .map(feature => ({ feature, rank: getSearchRank(feature, query, active) }))
      .sort((left, right) => {
         const byRank = left.rank - right.rank;
         if (byRank !== 0) return byRank;

         return compareByName(left.feature, right.feature);
      })
      .map(({ feature }) => ({
         kind: "marktabfrage",
         item: feature,
         title: projektTitle(feature),
         source: active ? "search" : "filtered"
      }));
}

export { getSearchQuery };
