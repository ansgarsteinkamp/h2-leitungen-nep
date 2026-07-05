import { describe, expect, it } from "vitest";

import { sumPipelineMetrics } from "./metrics";

function feature(properties = {}) {
   return {
      type: "Feature",
      properties
   };
}

describe("sumPipelineMetrics", () => {
   it("sums count, length and costs from the current collection", () => {
      const metrics = sumPipelineMetrics({
         type: "FeatureCollection",
         features: [
            feature({ laengeKm: 12.5, kostenMioEur: 100 }),
            feature({ laengeKm: 7.5, kostenMioEur: 50 }),
            feature({ laengeKm: null, kostenMioEur: undefined })
         ]
      });

      expect(metrics).toEqual({ count: 3, lengthKm: 20, costMioEur: 150 });
   });

   it("counts official measures and sums lengths only for pipelines", () => {
      const metrics = sumPipelineMetrics({
         type: "FeatureCollection",
         features: [
            feature({ id: "H2-001-01", featureTyp: "leitung", laengeKm: 10, kostenMioEur: 100 }),
            feature({ id: "H2-500-01", featureTyp: "gdrm_anlage", laengeKm: 0.1, kostenMioEur: 20 }),
            feature({
               id: "verdichterstandort:test",
               featureTyp: "verdichterstandort",
               officialIds: ["H2-2001-01", "H2-2002-01", "H2-2003-01"],
               kostenMioEur: 300
            })
         ]
      });

      expect(metrics).toEqual({ count: 5, lengthKm: 10, costMioEur: 420 });
   });

   it("sums compressor sites from their nested measures instead of the parent aggregates", () => {
      const metrics = sumPipelineMetrics({
         type: "FeatureCollection",
         features: [
            feature({
               id: "verdichterstandort:test",
               featureTyp: "verdichterstandort",
               officialIds: ["H2-2001-01", "H2-2002-01"],
               kostenMioEur: 300,
               laengeKm: 99,
               massnahmen: [
                  { id: "H2-2001-01", featureTyp: "verdichter_massnahme", kostenMioEur: 100 },
                  { id: "H2-2002-01", featureTyp: "verdichter_massnahme", kostenMioEur: 200 }
               ]
            })
         ]
      });

      expect(metrics).toEqual({ count: 2, lengthKm: 0, costMioEur: 300 });
   });

   it("only counts measure units that match the given predicate", () => {
      const metrics = sumPipelineMetrics(
         {
            type: "FeatureCollection",
            features: [
               feature({
                  id: "verdichterstandort:test",
                  featureTyp: "verdichterstandort",
                  kostenMioEur: 300,
                  massnahmen: [
                     { id: "H2-2001-01", featureTyp: "verdichter_massnahme", szenario1: true, kostenMioEur: 100 },
                     { id: "H2-2002-01", featureTyp: "verdichter_massnahme", szenario1: false, kostenMioEur: 200 }
                  ]
               }),
               feature({ id: "H2-001-01", featureTyp: "leitung", szenario1: true, laengeKm: 10, kostenMioEur: 50 })
            ]
         },
         unit => unit.szenario1 === true
      );

      expect(metrics).toEqual({ count: 2, lengthKm: 10, costMioEur: 150 });
   });
});
