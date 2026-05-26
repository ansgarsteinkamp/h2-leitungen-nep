import { describe, expect, it } from "vitest";

import { featureMatchesSearch, getSearchQuery, toResultItems } from "./search";

function pipeline(id, properties = {}) {
   return {
      type: "Feature",
      geometry: { type: "LineString", coordinates: [] },
      properties: {
         id,
         name: `Leitung ${id}`,
         durchfuehrendeNetzbetreiber: [],
         ansprechpartner: [],
         ...properties
      }
   };
}

function resultIds(features, active = false, query = "") {
   return toResultItems({ type: "FeatureCollection", features }, active, query).map(
      result => result.item.properties.id
   );
}

describe("toResultItems", () => {
   it("sorts the default result list by H2 number", () => {
      expect(
         resultIds([pipeline("H2-100-01"), pipeline("H2-024-01"), pipeline("H2-024-01a"), pipeline("H2-003-01")])
      ).toEqual(["H2-003-01", "H2-024-01", "H2-024-01a", "H2-100-01"]);
   });

   it("keeps direct search matches before broader matches and then sorts by H2 number", () => {
      expect(
         resultIds(
            [
               pipeline("H2-200-01", { name: "Leitung OGE Mitte" }),
               pipeline("H2-100-01", { durchfuehrendeNetzbetreiber: ["Open Grid Europe GmbH"] }),
               pipeline("H2-010-01", { name: "OGE-Anbindung" }),
               pipeline("H2-001-01", { kurzel: "OGE" })
            ],
            true,
            "oge"
         )
      ).toEqual(["H2-001-01", "H2-010-01", "H2-200-01", "H2-100-01"]);
   });

   it("matches H2 identifiers regardless of punctuation differences", () => {
      const feature = pipeline("H2-024-01");
      const query = getSearchQuery("H2 024");

      expect(featureMatchesSearch(feature, query, true)).toBe(true);
      expect(resultIds([pipeline("H2-100-01"), feature], true, query)).toEqual(["H2-024-01", "H2-100-01"]);
   });

   it("returns every result without truncating the list", () => {
      const features = Array.from({ length: 120 }, (_, index) => pipeline(`H2-${String(index + 1).padStart(3, "0")}`));

      expect(resultIds(features)).toHaveLength(120);
   });

   it("matches known operator abbreviations after canonicalization", () => {
      const feature = pipeline("H2-050-01", { durchfuehrendeNetzbetreiber: ["Gastransport Nord GmbH"] });
      const query = getSearchQuery("GTG");

      expect(featureMatchesSearch(feature, query, true)).toBe(true);
      expect(resultIds([pipeline("H2-100-01"), feature], true, query)).toEqual(["H2-050-01", "H2-100-01"]);
   });

   it("matches ß and ss spellings equivalently", () => {
      const feature = pipeline("H2-060-01", { beschreibung: "Maßnahme zur Netzverstärkung" });

      expect(featureMatchesSearch(feature, getSearchQuery("Massnahme"), true)).toBe(true);
      expect(featureMatchesSearch(feature, getSearchQuery("Netzverstarkung"), true)).toBe(true);
   });
});
