import { describe, expect, it } from "vitest";

import { parseQuelldatenGeoJson } from "@/lib/data/quelldatenGeoJson";

const leitung = (id = "L1") => ({
   type: "Feature",
   geometry: {
      type: "LineString",
      coordinates: [
         [6.5, 51.2],
         [6.6, 51.3]
      ]
   },
   properties: {
      id,
      name: `Leitung ${id}`,
      featureTyp: "leitung",
      leitungstyp: "Neubau",
      startnetz: false,
      netzausbauvorschlag: true
   }
});

const wasserstoffProjekt = (id = "WP1", attribute = {}, overrides = {}) => ({
   type: "Feature",
   geometry: { type: "Point", coordinates: [6.73, 51.37] },
   properties: {
      id,
      name: `Projekt ${id}`,
      featureTyp: "marktabfrage_projekt",
      geometrieStatus: "vorhanden",
      marktabfrage: {
         projektTyp: "wasserstoff_projekt",
         attribute: {
            kategorie: "Ausspeisung",
            haertegrad: "HG 2",
            jahrDerInbetriebnahme: 2035,
            grosskundeNetzanschlussnehmer: "Beispiel GmbH",
            projektnummer: "#5",
            ...attribute
         },
         zeitreihen: {
            ausspeiseleistungH2Mw: { 2035: 100, 2040: 120 }
         }
      },
      ...overrides
   }
});

const ptgAnlage = (id = "PTG1", attribute = {}) => ({
   type: "Feature",
   geometry: { type: "Point", coordinates: [11.76, 48.78] },
   properties: {
      id,
      name: `PtG ${id}`,
      featureTyp: "marktabfrage_projekt",
      geometrieStatus: "vorhanden",
      marktabfrage: {
         projektTyp: "ptg_anlage",
         attribute: {
            anlagenbetreiber: "Betreiber AG",
            initialeInbetriebnahme: 2028,
            ...attribute
         },
         zeitreihen: {
            einspeiseleistungH2Mw: { 2028: 80 }
         }
      }
   }
});

const toText = features => JSON.stringify({ type: "FeatureCollection", features });

describe("parseQuelldatenGeoJson with Marktabfrage projects", () => {
   it("splits the file into NEP measures and Marktabfrage projects", () => {
      const { marktabfrageCollection, pipelineCollection } = parseQuelldatenGeoJson(
         toText([leitung(), wasserstoffProjekt(), ptgAnlage()])
      );

      expect(pipelineCollection.features.map(feature => feature.properties.id)).toEqual(["L1"]);
      expect(marktabfrageCollection.features.map(feature => feature.properties.id)).toEqual(["WP1", "PTG1"]);
   });

   it("takes the display labels from the metadata", () => {
      const text = JSON.stringify({
         type: "FeatureCollection",
         metadata: { marktabfrageLabels: { wasserstoff_projekt: { attribute: { plz: "PLZ" } } } },
         features: [wasserstoffProjekt()]
      });

      expect(parseQuelldatenGeoJson(text).marktabfrageCollection.labels.wasserstoff_projekt.attribute.plz).toBe("PLZ");
   });

   it("drops non-string label leaves and keeps nested string labels", () => {
      const text = JSON.stringify({
         type: "FeatureCollection",
         metadata: {
            marktabfrageLabels: {
               wasserstoff_projekt: { attribute: { plz: "PLZ", kaputt: 42, liste: ["a"] }, nummer: null },
               direkt: "Direkt"
            }
         },
         features: [wasserstoffProjekt()]
      });

      expect(parseQuelldatenGeoJson(text).marktabfrageCollection.labels).toEqual({
         wasserstoff_projekt: { attribute: { plz: "PLZ" } },
         direkt: "Direkt"
      });
   });

   it("returns empty labels when metadata is missing", () => {
      expect(parseQuelldatenGeoJson(toText([wasserstoffProjekt()])).marktabfrageCollection.labels).toEqual({});
   });

   it("derives category, Härtegrad level, year, operator, and project number", () => {
      const { marktabfrageCollection } = parseQuelldatenGeoJson(toText([wasserstoffProjekt()]));
      const props = marktabfrageCollection.features[0].properties;

      expect(props.kategorie).toBe("Ausspeisung");
      expect(props.haertegradStufe).toBe(2);
      expect(props.inbetriebnahmeJahr).toBe(2035);
      expect(props.betreiber).toBe("Beispiel GmbH");
      expect(props.projektnummer).toBe("#5");
      expect(props.projektTyp).toBe("wasserstoff_projekt");
   });

   it("normalizes betreiber and name to trimmed strings even for non-string source values", () => {
      const wp = wasserstoffProjekt("WP1", { grosskundeNetzanschlussnehmer: 4711 });
      wp.properties.name = 42;
      const ptg = ptgAnlage("PTG1", { anlagenbetreiber: { firma: "Betreiber AG" } });

      const { marktabfrageCollection } = parseQuelldatenGeoJson(toText([wp, ptg]));
      const [wpProps, ptgProps] = marktabfrageCollection.features.map(feature => feature.properties);

      expect(wpProps.betreiber).toBe("4711");
      expect(wpProps.name).toBe("42");
      expect(typeof ptgProps.betreiber).toBe("string");
   });

   it("derives the network assignment of H₂ projects (PtG plants: none)", () => {
      const { marktabfrageCollection } = parseQuelldatenGeoJson(
         toText([wasserstoffProjekt("WP1", { netz: "FNB-Netz" }), wasserstoffProjekt("WP2"), ptgAnlage()])
      );
      const [mitNetz, ohneNetz, ptg] = marktabfrageCollection.features.map(feature => feature.properties);

      expect(mitNetz.netz).toBe("FNB-Netz");
      expect(ohneNetz.netz).toBe(null);
      expect(ptg.netz).toBe(null);
   });

   it('treats "H2-Bedarf gesichert" as Härtegrad level 0', () => {
      const { marktabfrageCollection } = parseQuelldatenGeoJson(
         toText([wasserstoffProjekt("WP1", { haertegrad: "H2-Bedarf gesichert" })])
      );

      expect(marktabfrageCollection.features[0].properties.haertegradStufe).toBe(0);
   });

   it("treats PtG plants as Einspeisung without a Härtegrad and with initial commissioning", () => {
      const { marktabfrageCollection } = parseQuelldatenGeoJson(toText([ptgAnlage()]));
      const props = marktabfrageCollection.features[0].properties;

      expect(props.kategorie).toBe("Einspeisung");
      expect(props.haertegradStufe).toBeNull();
      expect(props.inbetriebnahmeJahr).toBe(2028);
      expect(props.betreiber).toBe("Betreiber AG");
   });

   it("rejects implausible commissioning years", () => {
      expect(() => parseQuelldatenGeoJson(toText([wasserstoffProjekt("WP1", { jahrDerInbetriebnahme: 0 })]))).toThrow(
         /vierstelliges Jahr/
      );
      expect(() =>
         parseQuelldatenGeoJson(toText([wasserstoffProjekt("WP1", { jahrDerInbetriebnahme: 20355 })]))
      ).toThrow(/vierstelliges Jahr/);
   });

   it("rejects unknown network values", () => {
      expect(() => parseQuelldatenGeoJson(toText([wasserstoffProjekt("WP1", { netz: "Inselnetz" })]))).toThrow(
         /Unbekanntes Netz/
      );
   });

   it("rejects unknown Härtegrad values", () => {
      expect(() => parseQuelldatenGeoJson(toText([wasserstoffProjekt("WP1", { haertegrad: "HG 7" })]))).toThrow(
         /Härtegrad/
      );
   });

   it("rejects hydrogen projects without a category", () => {
      expect(() => parseQuelldatenGeoJson(toText([wasserstoffProjekt("WP1", { kategorie: "" })]))).toThrow(/Kategorie/);
   });

   it("rejects unknown project types", () => {
      const feature = wasserstoffProjekt();
      feature.properties.marktabfrage.projektTyp = "windrad";

      expect(() => parseQuelldatenGeoJson(toText([feature]))).toThrow(/Projekttyp/);
   });

   it("rejects Marktabfrage projects with line geometry", () => {
      const feature = wasserstoffProjekt();
      feature.geometry = {
         type: "LineString",
         coordinates: [
            [6.5, 51.2],
            [6.6, 51.3]
         ]
      };

      expect(() => parseQuelldatenGeoJson(toText([feature]))).toThrow(/Punktgeometrie/);
   });

   it("rejects coordinates outside valid ranges", () => {
      const feature = wasserstoffProjekt();
      feature.geometry = { type: "Point", coordinates: [200, 51] };

      expect(() => parseQuelldatenGeoJson(toText([feature]))).toThrow(/Längen-\/Breitengrade/);
   });

   it.each([[[]], [[7.1]]])("rejects point geometry with too few coordinates (%j)", coordinates => {
      const feature = wasserstoffProjekt();
      feature.geometry = { type: "Point", coordinates };

      expect(() => parseQuelldatenGeoJson(toText([feature]))).toThrow(/Länge und Breite als Zahlen/);
   });

   it("allows geometry: null with geometrieStatus fehlt", () => {
      const feature = wasserstoffProjekt("WP1", {}, { geometrieStatus: "fehlt" });
      feature.geometry = null;

      const { marktabfrageCollection } = parseQuelldatenGeoJson(toText([feature]));
      expect(marktabfrageCollection.features[0].geometry).toBeNull();
      expect(marktabfrageCollection.features[0].properties.geometrieStatus).toBe("fehlt");
   });

   it("rejects geometrieStatus that contradicts the geometry", () => {
      const ohneGeometrie = wasserstoffProjekt("WP1", {}, { geometrieStatus: "vorhanden" });
      ohneGeometrie.geometry = null;
      expect(() => parseQuelldatenGeoJson(toText([ohneGeometrie]))).toThrow(/passt nicht zu geometry: null/);

      const mitGeometrie = wasserstoffProjekt("WP2", {}, { geometrieStatus: "fehlt" });
      expect(() => parseQuelldatenGeoJson(toText([mitGeometrie]))).toThrow(/passt nicht zu einer vorhandenen/);
   });

   it("defaults missing zeitreihen to an empty object", () => {
      const feature = wasserstoffProjekt();
      delete feature.properties.marktabfrage.zeitreihen;

      const { marktabfrageCollection } = parseQuelldatenGeoJson(toText([feature]));
      expect(marktabfrageCollection.features[0].properties.marktabfrage.zeitreihen).toEqual({});
   });

   it("rejects invalid time series values", () => {
      const feature = wasserstoffProjekt();
      feature.properties.marktabfrage.zeitreihen = { ausspeiseleistungH2Mw: { 2035: "viel" } };

      expect(() => parseQuelldatenGeoJson(toText([feature]))).toThrow(/Zeitreihe/);
   });

   it("detects duplicate IDs across both datasets", () => {
      expect(() => parseQuelldatenGeoJson(toText([leitung("X"), wasserstoffProjekt("X")]))).toThrow(/doppelt vergeben/);
   });

   it("returns an empty Marktabfrage collection for pure v3 files", () => {
      const { marktabfrageCollection } = parseQuelldatenGeoJson(toText([leitung()]));
      expect(marktabfrageCollection.features).toEqual([]);
   });
});
