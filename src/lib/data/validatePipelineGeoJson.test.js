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
      expect(props.ogeIstDurchfuehrenderNetzbetreiber).toBe(true);
      expect(props.szenario1).toBeNull();
      expect(props.ibnJahr).toBe(2032);
   });

   it("keeps OGE contact participation separate from OGE executing operator", () => {
      const parsed = parsePipelineGeoJson(
         collection([
            feature({
               properties: {
                  ...baseProperties,
                  durchfuehrendeNetzbetreiber: "Regional AG",
                  ansprechpartner: "Open Grid Europe GmbH"
               }
            })
         ])
      );
      const props = parsed.features[0].properties;

      expect(props.ogeBeteiligung).toBe(true);
      expect(props.ogeIstDurchfuehrenderNetzbetreiber).toBe(false);
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

   it("accepts v3 features with point geometry, null geometry and nested measures", () => {
      const parsed = parsePipelineGeoJson(
         collection([
            feature(),
            {
               type: "Feature",
               geometry: null,
               properties: {
                  id: "H2-500-01",
                  name: "GDRM-Anlage Test",
                  featureTyp: "gdrm_anlage",
                  startnetz: false,
                  netzausbauvorschlag: true,
                  ibnJahr: 2032,
                  anlagenleistungM3h: "500000"
               }
            },
            {
               type: "Feature",
               geometry: { type: "Point", coordinates: [9.05814, 53.02735] },
               properties: {
                  id: "verdichterstandort:test",
                  name: "Verdichterstation Test",
                  featureTyp: "verdichterstandort",
                  geometrieStatus: "vorhanden",
                  startnetz: false,
                  netzausbauvorschlag: true,
                  officialIds: ["H2-2003-01", "H2-2103-01"],
                  ids: ["H2-2003-01", "H2-2103-01"],
                  massnahmen: [
                     {
                        id: "H2-2003-01",
                        name: "Verdichterstation Test",
                        startnetz: false,
                        netzausbauvorschlag: true,
                        ibnJahr: 2032,
                        durchfuehrendeNetzbetreiber: ["Open Grid Europe GmbH"]
                     },
                     {
                        id: "H2-2103-01",
                        name: "Verdichterstation Test",
                        startnetz: false,
                        netzausbauvorschlag: false,
                        szenario1: true,
                        ibnJahr: 2034,
                        durchfuehrendeNetzbetreiber: ["Nowega GmbH"]
                     }
                  ]
               }
            }
         ])
      );

      const gdrm = parsed.features[1];
      expect(gdrm.geometry).toBeNull();
      expect(gdrm.properties.geometrieStatus).toBe("fehlt");
      expect(gdrm.properties.featureTyp).toBe("gdrm_anlage");
      expect(gdrm.properties.anlagenleistungM3h).toBe(500000);

      const site = parsed.features[2];
      expect(site.geometry.coordinates).toEqual([9.05814, 53.02735]);
      expect(site.properties.massnahmen).toHaveLength(2);
      expect(site.properties.massnahmen[0].featureTyp).toBe("verdichter_massnahme");
      expect(site.properties.massnahmen[0].ogeIstDurchfuehrenderNetzbetreiber).toBe(true);
      expect(site.properties.massnahmen[1].standardAnzeige).toBe(false);
      expect(site.properties.standardAnzeige).toBe(true);
   });

   it("rejects compressor sites without nested measures", () => {
      const site = massnahmen => ({
         type: "Feature",
         geometry: null,
         properties: {
            id: "verdichterstandort:leer",
            name: "Verdichterstation Leer",
            featureTyp: "verdichterstandort",
            startnetz: false,
            netzausbauvorschlag: true,
            ...(massnahmen === undefined ? {} : { massnahmen })
         }
      });

      // Ohne Einzelmaßnahmen würden Parent-Aggregate wie eine Maßnahme ausgewertet.
      expect(() => parsePipelineGeoJson(collection([site([])]))).toThrow(/mindestens eine Einzelmaßnahme/);
      expect(() => parsePipelineGeoJson(collection([site(undefined)]))).toThrow(/mindestens eine Einzelmaßnahme/);
   });

   it("normalizes nested measure list fields and rejects duplicate measure ids", () => {
      const site = measures => ({
         type: "Feature",
         geometry: null,
         properties: {
            id: "verdichterstandort:listen",
            name: "Verdichterstation Listen",
            featureTyp: "verdichterstandort",
            startnetz: false,
            netzausbauvorschlag: true,
            massnahmen: measures
         }
      });
      const measure = overrides => ({
         id: "H2-2003-01",
         name: "Verdichterstation Listen",
         startnetz: false,
         netzausbauvorschlag: true,
         ...overrides
      });

      const parsed = parsePipelineGeoJson(
         collection([site([measure({ officialIds: "H2-2003-01", kernnetzAntragsIds: "KLU001-01" })])])
      );
      expect(parsed.features[0].properties.massnahmen[0].officialIds).toEqual(["H2-2003-01"]);
      expect(parsed.features[0].properties.massnahmen[0].kernnetzAntragsIds).toEqual(["KLU001-01"]);

      // Einzelmaßnahmen teilen den ID-Namensraum: Duplikate zählen in Metriken doppelt.
      expect(() => parsePipelineGeoJson(collection([site([measure(), measure()])]))).toThrow(/doppelt vergeben/);
      expect(() =>
         parsePipelineGeoJson(
            collection([feature({ properties: { ...baseProperties, id: "H2-2003-01" } }), site([measure()])])
         )
      ).toThrow(/doppelt vergeben/);
   });

   it("defaults missing featureTyp to leitung and rejects unknown feature types", () => {
      const parsed = parsePipelineGeoJson(collection([feature()]));

      expect(parsed.features[0].properties.featureTyp).toBe("leitung");

      expect(() =>
         parsePipelineGeoJson(collection([feature({ properties: { ...baseProperties, featureTyp: "raffinerie" } })]))
      ).toThrow(/featureTyp/);
   });

   it("rejects point geometries on pipelines and line geometries on other feature types", () => {
      expect(() =>
         parsePipelineGeoJson(collection([feature({ geometry: { type: "Point", coordinates: [7.1, 51.2] } })]))
      ).toThrow(/Punktgeometrie/);

      expect(() =>
         parsePipelineGeoJson(collection([feature({ properties: { ...baseProperties, featureTyp: "gdrm_anlage" } })]))
      ).toThrow(/Liniengeometrie/);
   });

   it("rejects point geometries on feature types other than compressor sites", () => {
      expect(() =>
         parsePipelineGeoJson(
            collection([
               feature({
                  geometry: { type: "Point", coordinates: [7.1, 51.2] },
                  properties: { ...baseProperties, featureTyp: "gdrm_anlage", geometrieStatus: "vorhanden" }
               })
            ])
         )
      ).toThrow(/Nur Verdichterstandorte/);
   });

   it("rejects a geometrieStatus that contradicts the actual geometry", () => {
      expect(() =>
         parsePipelineGeoJson(collection([feature({ properties: { ...baseProperties, geometrieStatus: "fehlt" } })]))
      ).toThrow(/geometrieStatus/);

      expect(() =>
         parsePipelineGeoJson(
            collection([
               {
                  type: "Feature",
                  geometry: null,
                  properties: {
                     ...baseProperties,
                     featureTyp: "sonstiges",
                     geometrieStatus: "vorhanden"
                  }
               }
            ])
         )
      ).toThrow(/geometrieStatus/);
   });

   it("requires leitungstyp only for pipeline features", () => {
      const properties = { ...baseProperties };
      delete properties.leitungstyp;

      expect(() => parsePipelineGeoJson(collection([feature({ properties })]))).toThrow(/leitungstyp/);

      const parsed = parsePipelineGeoJson(
         collection([
            {
               type: "Feature",
               geometry: null,
               properties: { ...properties, featureTyp: "sonstiges" }
            }
         ])
      );

      expect(parsed.features[0].properties.featureTyp).toBe("sonstiges");
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
