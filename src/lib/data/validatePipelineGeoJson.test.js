import { describe, expect, it } from "vitest";

import { parsePipelineGeoJson } from "./validatePipelineGeoJson";

const baseProperties = {
   id: "H2-001-01",
   name: "Leitung A",
   leitungstyp: "Neubau",
   startnetz: "ja",
   netzausbauvorschlag: "nein",
   standardAnzeige: "nein",
   szenario1: "womöglich",
   ibnJahr: "2032",
   bundeslaender: "Nordrhein-Westfalen",
   durchfuehrendeNetzbetreiber: "Open Grid Europe GmbH",
   ansprechpartner: ""
};

function feature(overrides = {}) {
   return {
      type: "Feature",
      geometry: {
         type: "LineString",
         coordinates: [
            [7.1, 51.2],
            [7.2, 51.3]
         ]
      },
      properties: { ...baseProperties },
      ...overrides
   };
}

function collection(features) {
   return JSON.stringify({ type: "FeatureCollection", features });
}

describe("parsePipelineGeoJson", () => {
   it("normalizes properties and derives standard and OGE flags", () => {
      const parsed = parsePipelineGeoJson(collection([feature()]));
      const props = parsed.features[0].properties;

      expect(props.startnetz).toBe(true);
      expect(props.netzausbauvorschlag).toBe(false);
      expect(props.standardAnzeige).toBe(true);
      expect(props.ogeBeteiligung).toBe(true);
      expect(props.szenario1).toBeNull();
      expect(props.ibnJahr).toBe(2032);
   });

   it("parses German-formatted numbers with thousands separators and decimal commas", () => {
      const parsed = parsePipelineGeoJson(
         collection([
            feature({
               properties: {
                  ...baseProperties,
                  laengeKm: "1.234,5",
                  kostenMioEur: "12.345.678,9"
               }
            })
         ])
      );
      const props = parsed.features[0].properties;

      expect(props.laengeKm).toBe(1234.5);
      expect(props.kostenMioEur).toBe(12345678.9);
   });

   it("keeps dot decimals as decimal numbers", () => {
      const parsed = parsePipelineGeoJson(
         collection([
            feature({
               properties: {
                  ...baseProperties,
                  laengeKm: "1.234",
                  kostenMioEur: "1234.5"
               }
            })
         ])
      );
      const props = parsed.features[0].properties;

      expect(props.laengeKm).toBe(1.234);
      expect(props.kostenMioEur).toBe(1234.5);
   });

   it("ignores malformed German-formatted numbers instead of guessing", () => {
      const parsed = parsePipelineGeoJson(
         collection([
            feature({
               properties: {
                  ...baseProperties,
                  laengeKm: "1.2.3,4"
               }
            })
         ])
      );

      expect(parsed.features[0].properties.laengeKm).toBeNull();
   });

   it("splits and cleans array-valued list properties consistently", () => {
      const parsed = parsePipelineGeoJson(
         collection([
            feature({
               properties: {
                  ...baseProperties,
                  bundeslaender: ["Nordrhein-Westfalen / Niedersachsen", null, ""],
                  durchfuehrendeNetzbetreiber: ["Open Grid Europe GmbH / Thyssengas GmbH", null]
               }
            })
         ])
      );
      const props = parsed.features[0].properties;

      expect(props.bundeslaender).toEqual(["Nordrhein-Westfalen", "Niedersachsen"]);
      expect(props.durchfuehrendeNetzbetreiber).toEqual(["Open Grid Europe GmbH", "Thyssengas GmbH"]);
   });

   it("rejects invalid required boolean fields", () => {
      expect(() =>
         parsePipelineGeoJson(
            collection([
               feature({
                  properties: {
                     ...baseProperties,
                     startnetz: "womöglich"
                  }
               })
            ])
         )
      ).toThrow(/startnetz/);
   });

   it("treats blank required booleans as false", () => {
      const parsed = parsePipelineGeoJson(
         collection([
            feature({
               properties: {
                  ...baseProperties,
                  netzausbauvorschlag: "",
                  startnetz: ""
               }
            })
         ])
      );

      expect(parsed.features[0].properties.netzausbauvorschlag).toBe(false);
      expect(parsed.features[0].properties.startnetz).toBe(false);
   });

   it("keeps optional invalid boolean fields as null", () => {
      const parsed = parsePipelineGeoJson(
         collection([
            feature({
               properties: {
                  ...baseProperties,
                  szenario1: "womöglich",
                  szenario2: ""
               }
            })
         ])
      );
      const props = parsed.features[0].properties;

      expect(props.szenario1).toBeNull();
      expect(props.szenario2).toBeNull();
   });

   it("accepts x and dash markers only for scenario-style boolean fields", () => {
      const parsed = parsePipelineGeoJson(
         collection([
            feature({
               properties: {
                  ...baseProperties,
                  szenario1: "x",
                  szenario2: "–",
                  szenario3: "-",
                  finalInvestmentDecision: "-"
               }
            })
         ])
      );
      const props = parsed.features[0].properties;

      expect(props.szenario1).toBe(true);
      expect(props.szenario2).toBe(false);
      expect(props.szenario3).toBe(false);
      expect(props.finalInvestmentDecision).toBeNull();
   });

   it("keeps source-provided commissioning year even when it differs from the commissioning date", () => {
      const parsed = parsePipelineGeoJson(
         collection([
            feature({
               properties: {
                  ...baseProperties,
                  ibnJahr: "2028",
                  inbetriebnahmeBis: "2029-12-31"
               }
            })
         ])
      );

      expect(parsed.features[0].properties.ibnJahr).toBe(2028);
      expect(parsed.features[0].properties.inbetriebnahmeBis).toBe("2029-12-31");
   });

   it("rejects invalid commissioning years and dates", () => {
      expect(() =>
         parsePipelineGeoJson(
            collection([
               feature({
                  properties: {
                     ...baseProperties,
                     ibnJahr: "unbekannt"
                  }
               })
            ])
         )
      ).toThrow(/ibnJahr/);

      expect(() =>
         parsePipelineGeoJson(
            collection([
               feature({
                  properties: {
                     ...baseProperties,
                     inbetriebnahmeBis: "2029-99-99"
                  }
               })
            ])
         )
      ).toThrow(/inbetriebnahmeBis/);
   });

   it("requires every entry to be a GeoJSON Feature", () => {
      expect(() => parsePipelineGeoJson(collection([{ type: "LineString", properties: baseProperties }]))).toThrow(
         /GeoJSON Feature/
      );
   });

   it("rejects duplicate feature IDs", () => {
      expect(() => parsePipelineGeoJson(collection([feature(), feature()]))).toThrow(/doppelt vergeben/);
   });

   it("allows missing optional list fields", () => {
      const properties = { ...baseProperties };
      delete properties.bundeslaender;
      delete properties.durchfuehrendeNetzbetreiber;
      delete properties.ansprechpartner;
      const parsed = parsePipelineGeoJson(collection([feature({ properties })]));

      expect(parsed.features[0].properties.bundeslaender).toEqual([]);
      expect(parsed.features[0].properties.durchfuehrendeNetzbetreiber).toEqual([]);
      expect(parsed.features[0].properties.ansprechpartner).toEqual([]);
   });

   it("rejects coordinates outside valid longitude and latitude ranges", () => {
      expect(() =>
         parsePipelineGeoJson(
            collection([
               feature({
                  geometry: {
                     type: "LineString",
                     coordinates: [
                        [181, 51.2],
                        [7.2, 51.3]
                     ]
                  }
               })
            ])
         )
      ).toThrow(/außerhalb/);
   });

   it("rejects blank or boolean coordinates instead of coercing them to numbers", () => {
      expect(() =>
         parsePipelineGeoJson(
            collection([
               feature({
                  geometry: {
                     type: "LineString",
                     coordinates: [
                        [null, null],
                        [7.2, 51.3]
                     ]
                  }
               })
            ])
         )
      ).toThrow(/Koordinate/);

      expect(() =>
         parsePipelineGeoJson(
            collection([
               feature({
                  geometry: {
                     type: "LineString",
                     coordinates: [
                        [false, true],
                        [7.2, 51.3]
                     ]
                  }
               })
            ])
         )
      ).toThrow(/Koordinate/);
   });

   it("rejects line strings with fewer than two coordinates", () => {
      expect(() =>
         parsePipelineGeoJson(
            collection([
               feature({
                  geometry: {
                     type: "LineString",
                     coordinates: [[7.1, 51.2]]
                  }
               })
            ])
         )
      ).toThrow(/mindestens zwei/);
   });

   it("rejects blank names and non-integer commissioning years", () => {
      expect(() =>
         parsePipelineGeoJson(
            collection([
               feature({
                  properties: {
                     ...baseProperties,
                     name: ""
                  }
               })
            ])
         )
      ).toThrow(/Name/);

      expect(() =>
         parsePipelineGeoJson(
            collection([
               feature({
                  properties: {
                     ...baseProperties,
                     ibnJahr: "2032.5"
                  }
               })
            ])
         )
      ).toThrow(/ibnJahr/);
   });
});
