import { describe, expect, it } from "vitest";

import { nepCycleLabel } from "./formatters";

describe("nepCycleLabel", () => {
   it("names NEP cycles with two digits", () => {
      expect(nepCycleLabel(2027)).toBe("NEP 27");
      expect(nepCycleLabel(2031)).toBe("NEP 31");
   });
});
