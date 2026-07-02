import { afterEach, describe, expect, it, vi } from "vitest";

import { loadPlaces, validatePlacesData } from "./loadPlaces";

const place = (overrides = {}) => ({
   name: "Achim",
   typ: "Ort",
   koordinaten: {
      lat: 52.9908,
      lon: 9.04
   },
   ...overrides
});

describe("validatePlacesData", () => {
   it("normalizes valid place data", () => {
      expect(validatePlacesData([place()])).toEqual([
         {
            id: "Ort:Achim:0",
            latitude: 52.9908,
            longitude: 9.04,
            name: "Achim",
            type: "Ort"
         }
      ]);
   });

   it("rejects malformed place data", () => {
      expect(() => validatePlacesData({})).toThrow(/JSON-Liste/);
      expect(() => validatePlacesData([])).toThrow(/keine Orte/);
      expect(() => validatePlacesData([place({ name: "" })])).toThrow(/Ortsname/);
      expect(() => validatePlacesData([place({ typ: "" })])).toThrow(/Ortstyp/);
      expect(() => validatePlacesData([place({ koordinaten: null })])).toThrow(/Koordinaten/);
      expect(() => validatePlacesData([place({ koordinaten: { lat: 95, lon: 9 } })])).toThrow(/Breiten/);
   });
});

describe("loadPlaces", () => {
   afterEach(() => {
      vi.unstubAllGlobals();
   });

   it("fetches, parses, and validates the static place list", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
         ok: true,
         text: () => Promise.resolve(JSON.stringify([place()]))
      });
      vi.stubGlobal("fetch", fetchMock);

      await expect(loadPlaces("/base/")).resolves.toEqual(validatePlacesData([place()]));
      expect(fetchMock).toHaveBeenCalledWith("/base/data/orte.json");

      await expect(loadPlaces("/base")).resolves.toEqual(validatePlacesData([place()]));
      expect(fetchMock).toHaveBeenLastCalledWith("/base/data/orte.json");
   });

   it("uses a clear error when the place file cannot be fetched", async () => {
      vi.stubGlobal(
         "fetch",
         vi.fn().mockResolvedValue({
            ok: false,
            text: () => Promise.resolve("")
         })
      );

      await expect(loadPlaces("/")).rejects.toThrow(/konnten nicht geladen/);
   });

   it("uses a clear error when the place file is not valid JSON", async () => {
      vi.stubGlobal(
         "fetch",
         vi.fn().mockResolvedValue({
            ok: true,
            text: () => Promise.resolve("{")
         })
      );

      await expect(loadPlaces("/")).rejects.toThrow(/kein gültiges JSON/);
   });
});
