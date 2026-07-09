import { getMarktabfrageAttribute } from "@/lib/domain/marktabfrage";
import { projektTitle } from "@/lib/domain/marktabfrageFormatters";

const idCollator = new Intl.Collator("de-DE", { numeric: true, sensitivity: "base" });

// Nur Großschreibung, Akzente, ß und umgebender Whitespace sind für die Suche unerheblich.
// Alle anderen Zeichen (#, Bindestriche …) zählen wörtlich — das hält die Suche vorhersehbar.
// Getrimmt werden Suchanfrage UND Feldwerte: Die Attribute der Quelldaten (PLZ, Ort,
// Datenbank-ID) laufen ungetrimmt durch den Import, und die PLZ vergleicht exakt.
const normalize = value =>
   String(value ?? "")
      .toLocaleLowerCase("de-DE")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/ß/g, "ss")
      .replace(/\s+/g, " ")
      .trim();

export const getSearchQuery = normalize;

export const isSearchActive = query => query.length >= 2;

// Suchbegriff gegen die Projektnummer prüfen (exakter Treffer, keine Teilstring-Suche)
//
// "#1", "1"     => findet genau Projektnummer #1 (nicht #10, #11, ...)
// "# 1", " #1 " => Leerzeichen unschädlich
// "#01"         => findet Projektnummer #1
// "#1a", "a1"   => kein Treffer
//
const NUMMERN_ANFRAGE = /^#?\s*(\d+)$/;

const matchesProjektnummer = (query, projektnummer) => {
   const anfrage = query.match(NUMMERN_ANFRAGE);
   if (anfrage === null) return false;

   const nummer = String(projektnummer ?? "").match(NUMMERN_ANFRAGE);
   return nummer !== null && Number(anfrage[1]) === Number(nummer[1]);
};

const includesQuery = (value, query) => normalize(value).includes(query);

// Suchfelder laut Abfrage-Design: Projektname, Betreiber (Großkunde bzw. Anlagenbetreiber),
// Ort, Datenbank-ID — alle per Teilstring. Projektnummer ("#…") und PLZ treffen nur exakt:
// per Teilstring fände "#123" sonst auch "#2123", und kurze Ziffernfolgen stecken in fast
// jeder PLZ. Kategoriale Facetten (Status, Härtegrad, Netz, Bundesland) bleiben bewusst
// außen vor — sie erzeugten als Suchfelder nur unbrauchbar große Treffermengen.
export function projektMatchesSearch(feature, query, active = isSearchActive(query)) {
   if (!active) return true;

   const props = feature.properties;
   const attribute = getMarktabfrageAttribute(props);

   if (matchesProjektnummer(query, props.projektnummer)) return true;
   if (normalize(attribute.plz) === query) return true;

   return [props.id, attribute.datenbankId, props.name, props.betreiber, attribute.ort].some(value =>
      includesQuery(value, query)
   );
}

function getSearchRank(feature, query, active) {
   if (!active) return 0;

   const props = feature.properties;
   const attribute = getMarktabfrageAttribute(props);
   // PLZ nur im Exakt-Rang: In den Teilstring-Rängen zählte eine PLZ als Treffergrund,
   // den projektMatchesSearch gar nicht kennt — das verzerrte die Sortierung.
   const identifiers = [props.id, attribute.datenbankId];

   if (matchesProjektnummer(query, props.projektnummer)) return 0;
   if (normalize(attribute.plz) === query) return 0;
   if (identifiers.some(value => normalize(value) === query)) return 0;
   if (identifiers.some(value => normalize(value).startsWith(query))) return 1;
   if (identifiers.some(value => includesQuery(value, query))) return 2;
   if (normalize(props.name).startsWith(query)) return 3;
   if (includesQuery(props.name, query)) return 4;
   if (includesQuery(props.betreiber, query)) return 5;

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
