import { describe, expect, it } from "vitest";

import { nepCycleLabel, ogeExecutingPlanningScopeLabel } from "./formatters";

describe("NEP cycle formatters", () => {
   it("names NEP cycles with two digits", () => {
      expect(nepCycleLabel(2027)).toBe("NEP 27");
      expect(nepCycleLabel(2031)).toBe("NEP 31");
   });

   it("describes a gapless selection from the first cycle as a planning state", () => {
      const available = [2027, 2029, 2031];

      expect(ogeExecutingPlanningScopeLabel([2027], available)).toBe("bis NEP 27");
      expect(ogeExecutingPlanningScopeLabel([2027, 2029], available)).toBe("bis NEP 29");
      expect(ogeExecutingPlanningScopeLabel([2027, 2029, 2031], available)).toBe("bis NEP 31");
   });

   it("names selected and missing cycles for any other selection", () => {
      const available = [2027, 2029, 2031];

      expect(ogeExecutingPlanningScopeLabel([2031], available)).toBe("nur für NEP 31 (ohne NEP 27 und NEP 29)");
      expect(ogeExecutingPlanningScopeLabel([2027, 2031], available)).toBe("nur für NEP 27 und NEP 31 (ohne NEP 29)");
   });
});
