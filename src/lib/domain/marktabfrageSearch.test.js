import { describe, expect, it } from "vitest";

import { getSearchQuery, isSearchActive, projektMatchesSearch, toProjektResultItems } from "./marktabfrageSearch";

// Synthetische Marktabfrage-Features; bewusst keine echten Meldedaten.
function makeProjekt({ id, name = "", betreiber = "", projektnummer = "", datenbankId = "", ort, plz } = {}) {
   return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [7, 51] },
      properties: {
         id,
         name,
         betreiber,
         projektnummer,
         featureTyp: "marktabfrage_projekt",
         projektTyp: "wasserstoff_projekt",
         marktabfrage: { projektTyp: "wasserstoff_projekt", attribute: { datenbankId, ort, plz }, zeitreihen: {} }
      }
   };
}

function collectionOf(features) {
   return { type: "FeatureCollection", features };
}

describe("projektMatchesSearch", () => {
   it("matches via project name, operator, ID, database ID, and project number", () => {
      const projekt = makeProjekt({
         id: "H2-42",
         name: "Wasserstoffpark Nord",
         betreiber: "Muster Energie AG",
         projektnummer: "#1001",
         datenbankId: "DB-7788"
      });

      expect(projektMatchesSearch(projekt, getSearchQuery("Wasserstoffpark"))).toBe(true);
      expect(projektMatchesSearch(projekt, getSearchQuery("Muster Energie"))).toBe(true);
      expect(projektMatchesSearch(projekt, getSearchQuery("H2-42"))).toBe(true);
      expect(projektMatchesSearch(projekt, getSearchQuery("DB-7788"))).toBe(true);
      expect(projektMatchesSearch(projekt, getSearchQuery("#1001"))).toBe(true);
      expect(projektMatchesSearch(projekt, getSearchQuery("völlig anderes"))).toBe(false);
   });

   it("normalizes umlauts and ß in search term and field value", () => {
      const projekt = makeProjekt({ id: "H2-1", name: "Weißenfels Süd", betreiber: "Müller & Bär GmbH" });

      expect(projektMatchesSearch(projekt, getSearchQuery("weissenfels sud"))).toBe(true);
      expect(projektMatchesSearch(projekt, getSearchQuery("MÜLLER & BÄR"))).toBe(true);
   });

   it("keeps all other characters literal instead of stripping them", () => {
      const projekt = makeProjekt({ id: "H2-1", name: "Gaskraftwerk Bexbach #766" });

      expect(projektMatchesSearch(projekt, getSearchQuery("#766"))).toBe(true);
      expect(projektMatchesSearch(projekt, getSearchQuery("#76"))).toBe(true);
      expect(projektMatchesSearch(projekt, getSearchQuery("#6"))).toBe(false);
   });

   it("matches number queries only exactly against the project number", () => {
      const treffer = makeProjekt({ id: "a1b2c3d4-guid", name: "Alpha", projektnummer: "#123" });
      const nummerObermenge = makeProjekt({ id: "e5f6-guid", name: "Beta", projektnummer: "#2123" });

      expect(projektMatchesSearch(treffer, getSearchQuery("#123"))).toBe(true);
      expect(projektMatchesSearch(treffer, getSearchQuery("123"))).toBe(true);
      expect(projektMatchesSearch(treffer, getSearchQuery(" # 123 "))).toBe(true);
      expect(projektMatchesSearch(treffer, getSearchQuery("#0123"))).toBe(true);
      expect(projektMatchesSearch(nummerObermenge, getSearchQuery("#123"))).toBe(false);
      expect(projektMatchesSearch(nummerObermenge, getSearchQuery("123"))).toBe(false);
   });

   it("keeps substring matching on names and IDs for digit-only queries", () => {
      const nameMitZiffern = makeProjekt({ id: "H2-1", name: "Anlage 123 Nord" });
      const idMitZiffern = makeProjekt({ id: "12340c45-guid", name: "Gamma", datenbankId: "9912399" });

      expect(projektMatchesSearch(nameMitZiffern, getSearchQuery("123"))).toBe(true);
      expect(projektMatchesSearch(idMitZiffern, getSearchQuery("123"))).toBe(true);
      expect(projektMatchesSearch(idMitZiffern, getSearchQuery("#123"))).toBe(false);
   });

   it("matches every project when the search is inactive", () => {
      const projekt = makeProjekt({ id: "H2-1", name: "Alpha" });

      expect(isSearchActive(getSearchQuery("a"))).toBe(false);
      expect(projektMatchesSearch(projekt, getSearchQuery("a"))).toBe(true);
   });

   it("matches the location as substring like name and operator", () => {
      const projekt = makeProjekt({ id: "H2-1", name: "Alpha", ort: "Duisburg" });

      expect(projektMatchesSearch(projekt, getSearchQuery("Duisburg"))).toBe(true);
      expect(projektMatchesSearch(projekt, getSearchQuery("duis"))).toBe(true);
      expect(projektMatchesSearch(projekt, getSearchQuery("Essen"))).toBe(false);
   });

   it("matches the postal code only exactly", () => {
      const projekt = makeProjekt({ id: "H2-1", name: "Alpha", plz: "47259" });

      expect(projektMatchesSearch(projekt, getSearchQuery("47259"))).toBe(true);
      expect(projektMatchesSearch(projekt, getSearchQuery("4725"))).toBe(false);
      expect(projektMatchesSearch(projekt, getSearchQuery("4725a"))).toBe(false);
   });

   it("trims field values so untrimmed source data stays findable", () => {
      const projekt = makeProjekt({ id: "H2-1", name: "Alpha", plz: " 47259 ", ort: " Duisburg " });

      expect(projektMatchesSearch(projekt, getSearchQuery("47259"))).toBe(true);
      expect(projektMatchesSearch(projekt, getSearchQuery("Duisburg"))).toBe(true);
   });

   it("keeps one-digit project numbers findable via the # form", () => {
      const projekt = makeProjekt({ id: "H2-1", name: "Alpha", projektnummer: "#5" });
      const anderes = makeProjekt({ id: "H2-2", name: "Beta", projektnummer: "#55" });

      expect(isSearchActive(getSearchQuery("#5"))).toBe(true);
      expect(isSearchActive(getSearchQuery("5"))).toBe(false);
      expect(projektMatchesSearch(projekt, getSearchQuery("#5"))).toBe(true);
      expect(projektMatchesSearch(anderes, getSearchQuery("#5"))).toBe(false);
   });
});

describe("toProjektResultItems", () => {
   it("ranks exact ID before ID prefix, ID substring, name prefix, name substring, and operator", () => {
      const exactId = makeProjekt({ id: "berlin", name: "Zeta" });
      const idPrefix = makeProjekt({ id: "berlin-nord", name: "Yankee" });
      const idPart = makeProjekt({ id: "h2-berlin", name: "Xylo" });
      const namePrefix = makeProjekt({ id: "X3", name: "Berlin Süd" });
      const namePart = makeProjekt({ id: "X4", name: "Neubau Berlin" });
      const operatorMatch = makeProjekt({ id: "X5", name: "Omega", betreiber: "Berlin Gas AG" });
      const noMatch = makeProjekt({ id: "X6", name: "Hamburg" });

      const query = getSearchQuery("Berlin");
      const items = toProjektResultItems(
         collectionOf([noMatch, operatorMatch, namePart, namePrefix, idPart, idPrefix, exactId]),
         true,
         query
      );

      expect(items.map(entry => entry.item.properties.id)).toEqual([
         "berlin",
         "berlin-nord",
         "h2-berlin",
         "X3",
         "X4",
         "X5",
         "X6"
      ]);
   });

   it("ranks matches found only via the location after name and operator matches", () => {
      const nameMatch = makeProjekt({ id: "X1", name: "Berlin Süd" });
      const operatorMatch = makeProjekt({ id: "X2", name: "Omega", betreiber: "Berlin Gas AG" });
      const ortMatch = makeProjekt({ id: "X3", name: "Alpha", ort: "Berlin" });

      const items = toProjektResultItems(
         collectionOf([ortMatch, operatorMatch, nameMatch]),
         true,
         getSearchQuery("Berlin")
      );

      expect(items.map(entry => entry.item.properties.id)).toEqual(["X1", "X2", "X3"]);
   });

   it("ranks the exact project number before name matches for digit-only queries", () => {
      const exakteNummer = makeProjekt({ id: "Z9", name: "Zeta", projektnummer: "#123" });
      const nameMitZiffern = makeProjekt({ id: "A1", name: "123 Anlage" });
      const nameEnthaeltZiffern = makeProjekt({ id: "B2", name: "Beta 123" });

      const query = getSearchQuery("123");
      const items = toProjektResultItems(
         collectionOf([nameEnthaeltZiffern, nameMitZiffern, exakteNummer]),
         true,
         query
      );

      expect(items.map(entry => entry.item.properties.id)).toEqual(["Z9", "A1", "B2"]);
   });

   it("does not boost the rank via postal code substrings that are no match reason", () => {
      const nameEnthaeltZiffern = makeProjekt({ id: "A1", name: "Anlage 4725 Nord", plz: "47259" });
      const nameBeginntMitZiffern = makeProjekt({ id: "B2", name: "4725 Süd" });

      const items = toProjektResultItems(
         collectionOf([nameEnthaeltZiffern, nameBeginntMitZiffern]),
         true,
         getSearchQuery("4725")
      );

      expect(items.map(entry => entry.item.properties.id)).toEqual(["B2", "A1"]);
   });

   it("marks matches as search and sets title and kind", () => {
      const projekt = makeProjekt({ id: "H2-9", name: "Gamma" });
      const query = getSearchQuery("Gamma");

      const [item] = toProjektResultItems(collectionOf([projekt]), true, query);

      expect(item).toMatchObject({ kind: "marktabfrage", source: "search", title: "Gamma" });
      expect(item.item).toBe(projekt);
   });

   it("sorts alphabetically by name without an active search and marks as filtered", () => {
      const items = toProjektResultItems(
         collectionOf([
            makeProjekt({ id: "H2-3", name: "Zulu" }),
            makeProjekt({ id: "H2-1", name: "Alpha" }),
            makeProjekt({ id: "H2-2", name: "Mike" })
         ]),
         false
      );

      expect(items.map(entry => entry.title)).toEqual(["Alpha", "Mike", "Zulu"]);
      expect(items.every(entry => entry.source === "filtered")).toBe(true);
   });

   it("sorts names starting with special characters or digits after the alphabetical ones", () => {
      const items = toProjektResultItems(
         collectionOf([
            makeProjekt({ id: "H2-1", name: "#123" }),
            makeProjekt({ id: "H2-2", name: "Zulu" }),
            makeProjekt({ id: "H2-3", name: "42 Beispielprojekt" }),
            makeProjekt({ id: "H2-4", name: "---" }),
            makeProjekt({ id: "H2-5", name: "Ärztehaus" })
         ]),
         false
      );

      expect(items.map(entry => entry.title)).toEqual(["Ärztehaus", "Zulu", "---", "#123", "42 Beispielprojekt"]);
   });

   it("falls back to the ID as tie-breaker for equal names", () => {
      const items = toProjektResultItems(
         collectionOf([makeProjekt({ id: "H2-20", name: "Delta" }), makeProjekt({ id: "H2-3", name: "Delta" })]),
         false
      );

      expect(items.map(entry => entry.item.properties.id)).toEqual(["H2-3", "H2-20"]);
   });

   it("uses the ID as title when no name is present", () => {
      const [item] = toProjektResultItems(collectionOf([makeProjekt({ id: "H2-77", name: "" })]), false);

      expect(item.title).toBe("H2-77");
   });
});
