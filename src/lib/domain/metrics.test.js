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
});
