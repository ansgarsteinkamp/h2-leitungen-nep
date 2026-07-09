/**
 * @vitest-environment jsdom
 */
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ALL_VALUE } from "@/lib/domain/constants";
import {
   filterProjekte,
   initialMarktabfrageFilters,
   projektMatchesFilters,
   useMarktabfrageFilters
} from "./useMarktabfrageFilters";

afterEach(() => {
   cleanup();
});

const filters = { ...initialMarktabfrageFilters };

function projekt(id, properties = {}) {
   return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [7, 51] },
      properties: {
         id,
         name: `Projekt ${id}`,
         featureTyp: "marktabfrage_projekt",
         geometrieStatus: "vorhanden",
         projektTyp: "wasserstoff_projekt",
         kategorie: "Ausspeisung",
         haertegradStufe: 3,
         inbetriebnahmeJahr: 2032,
         betreiber: "Beispiel GmbH",
         projektnummer: `#${id}`,
         marktabfrage: { projektTyp: "wasserstoff_projekt", attribute: {}, zeitreihen: {} },
         ...properties
      }
   };
}

function ptg(id, properties = {}) {
   return projekt(id, {
      projektTyp: "ptg_anlage",
      kategorie: "Einspeisung",
      haertegradStufe: null,
      projektnummer: null,
      marktabfrage: { projektTyp: "ptg_anlage", attribute: {}, zeitreihen: {} },
      ...properties
   });
}

function collection(features) {
   return { type: "FeatureCollection", features, labels: {} };
}

describe("projektMatchesFilters", () => {
   it("filters by project type", () => {
      expect(projektMatchesFilters(projekt("A"), { ...filters, typ: "wasserstoff_projekt" })).toBe(true);
      expect(projektMatchesFilters(projekt("A"), { ...filters, typ: "ptg_anlage" })).toBe(false);
      expect(projektMatchesFilters(ptg("B"), { ...filters, typ: "ptg_anlage" })).toBe(true);
   });

   it("filters by category", () => {
      expect(projektMatchesFilters(projekt("A"), { ...filters, kategorie: "Ausspeisung" })).toBe(true);
      expect(projektMatchesFilters(projekt("A"), { ...filters, kategorie: "Speicher" })).toBe(false);
   });

   it("filters by year range", () => {
      expect(projektMatchesFilters(projekt("A"), { ...filters, jahrVon: 2030, jahrBis: 2032 })).toBe(true);
      expect(projektMatchesFilters(projekt("A"), { ...filters, jahrVon: 2033, jahrBis: 2040 })).toBe(false);
   });

   it("hides projects without a year when the range is restricted", () => {
      const ohneJahr = projekt("A", { inbetriebnahmeJahr: null });
      expect(projektMatchesFilters(ohneJahr, { ...filters, jahrVon: 2030, jahrBis: 2035 })).toBe(false);
      expect(projektMatchesFilters(ohneJahr, { ...filters, jahrVon: ALL_VALUE, jahrBis: ALL_VALUE })).toBe(true);
   });

   it("filters H₂ projects by Härtegrad range", () => {
      const hg1 = projekt("A", { haertegradStufe: 1 });
      expect(projektMatchesFilters(hg1, { ...filters, haertegradVon: 0, haertegradBis: 1 })).toBe(true);
      expect(projektMatchesFilters(hg1, { ...filters, haertegradVon: 2, haertegradBis: 3 })).toBe(false);
   });

   it("keeps PtG plants visible regardless of the Härtegrad range", () => {
      expect(projektMatchesFilters(ptg("B"), { ...filters, haertegradVon: 0, haertegradBis: 0 })).toBe(true);
   });

   it("hides H₂ projects without a Härtegrad when the range is restricted", () => {
      const ohneHaertegrad = projekt("A", { haertegradStufe: null });
      expect(projektMatchesFilters(ohneHaertegrad, { ...filters, haertegradVon: 0, haertegradBis: 2 })).toBe(false);
      expect(projektMatchesFilters(ohneHaertegrad, { ...filters, haertegradVon: 0, haertegradBis: 3 })).toBe(true);
   });

   it("filters H₂ projects by network and keeps PtG plants visible", () => {
      const fnb = projekt("A", { netz: "FNB-Netz" });
      expect(projektMatchesFilters(fnb, { ...filters, netz: "FNB-Netz" })).toBe(true);
      expect(projektMatchesFilters(fnb, { ...filters, netz: "VNB-Netz" })).toBe(false);
      expect(projektMatchesFilters(ptg("B"), { ...filters, netz: "FNB-Netz" })).toBe(true);
   });

   it("filters by minimum capacity via the maximum of the matching time series", () => {
      const klein = projekt("A", {
         marktabfrage: {
            projektTyp: "wasserstoff_projekt",
            attribute: {},
            zeitreihen: { ausspeiseleistungH2Mw: { 2030: 3, 2035: 8 } }
         }
      });
      expect(projektMatchesFilters(klein, { ...filters, minLeistungMw: "3" })).toBe(true);
      expect(projektMatchesFilters(klein, { ...filters, minLeistungMw: "10" })).toBe(false);
   });

   it("hides projects without a capacity time series when a minimum capacity is active", () => {
      expect(projektMatchesFilters(projekt("A"), { ...filters, minLeistungMw: "1" })).toBe(false);
      expect(projektMatchesFilters(projekt("A"), { ...filters, minLeistungMw: ALL_VALUE })).toBe(true);
   });
});

describe("filterProjekte", () => {
   it("combines filters and search", () => {
      const features = [
         projekt("A", { name: "Elektrolyse Nord" }),
         projekt("B", { name: "Stahlwerk Süd" }),
         ptg("C", { name: "Elektrolyse West" })
      ];

      const result = filterProjekte(features, { ...filters, typ: "wasserstoff_projekt", searchTerm: "Elektrolyse" });
      expect(result.map(feature => feature.properties.id)).toEqual(["A"]);
   });

   it("finds projects via operator, ID, and project number", () => {
      const features = [projekt("abc123", { betreiber: "Hüttenwerke Krupp", projektnummer: "#7" })];

      expect(filterProjekte(features, { ...filters, searchTerm: "krupp" })).toHaveLength(1);
      expect(filterProjekte(features, { ...filters, searchTerm: "abc123" })).toHaveLength(1);
      expect(filterProjekte(features, { ...filters, searchTerm: "#7" })).toHaveLength(1);
      expect(filterProjekte(features, { ...filters, searchTerm: "gibtsnicht" })).toHaveLength(0);
   });
});

describe("useMarktabfrageFilters", () => {
   const features = [
      projekt("A", { inbetriebnahmeJahr: 2028 }),
      projekt("B", { inbetriebnahmeJahr: 2035, kategorie: "Speicher", haertegradStufe: 1 }),
      projekt("C", { inbetriebnahmeJahr: 2045 }),
      ptg("D", { inbetriebnahmeJahr: 2030 })
   ];

   it("starts with a year range from the minimum to 2035", () => {
      const { result } = renderHook(() => useMarktabfrageFilters(collection(features)));

      expect(result.current.filters.jahrVon).toBe(2028);
      expect(result.current.filters.jahrBis).toBe(2035);
      expect(result.current.filteredCollection.features.map(feature => feature.properties.id)).toEqual(["A", "B", "D"]);
   });

   it("returns the year bounds of the dataset", () => {
      const { result } = renderHook(() => useMarktabfrageFilters(collection(features)));

      expect(result.current.jahrBounds).toEqual({ min: 2028, max: 2045 });
   });

   it("collapses the full year range to all projects", () => {
      const { result } = renderHook(() => useMarktabfrageFilters(collection(features)));

      act(() => result.current.setJahrRange([2028, 2045]));

      expect(result.current.filters.jahrVon).toBe(ALL_VALUE);
      expect(result.current.filters.jahrBis).toBe(ALL_VALUE);
      expect(result.current.filteredCollection.features).toHaveLength(4);
   });

   it("resets the category when PtG plants are selected", () => {
      const { result } = renderHook(() => useMarktabfrageFilters(collection(features)));

      act(() => result.current.setFilter("kategorie", "Speicher"));
      expect(result.current.filters.kategorie).toBe("Speicher");

      act(() => result.current.setFilter("typ", "ptg_anlage"));
      expect(result.current.filters.kategorie).toBe(ALL_VALUE);
   });

   it("switches the project type to H₂ projects when the Härtegrad is restricted", () => {
      const { result } = renderHook(() => useMarktabfrageFilters(collection(features)));

      act(() => result.current.setHaertegradRange([0, 2]));

      expect(result.current.filters.typ).toBe("wasserstoff_projekt");
      expect(
         result.current.filteredCollection.features.some(feature => feature.properties.projektTyp === "ptg_anlage")
      ).toBe(false);
   });

   it("does not switch back automatically when the Härtegrad restriction is lifted", () => {
      const { result } = renderHook(() => useMarktabfrageFilters(collection(features)));

      act(() => result.current.setHaertegradRange([0, 2]));
      act(() => result.current.setHaertegradRange([0, 3]));

      expect(result.current.filters.typ).toBe("wasserstoff_projekt");
   });

   it("reports the automatic project type switch and clears the message on manual selection", () => {
      const { result } = renderHook(() => useMarktabfrageFilters(collection(features)));
      expect(result.current.typAutoSwitchGrund).toBe(null);

      act(() => result.current.setHaertegradRange([0, 2]));
      expect(result.current.typAutoSwitchGrund).toBe("haertegrad");

      act(() => result.current.setFilter("typ", ALL_VALUE));
      expect(result.current.typAutoSwitchGrund).toBe(null);
   });

   it("switches the project type to H₂ projects when a network is selected", () => {
      const { result } = renderHook(() => useMarktabfrageFilters(collection(features)));

      act(() => result.current.setFilter("netz", "FNB-Netz"));

      expect(result.current.filters.typ).toBe("wasserstoff_projekt");
      expect(result.current.filters.netz).toBe("FNB-Netz");
      expect(result.current.typAutoSwitchGrund).toBe("netz");
   });

   it("resets the network filter when PtG plants are selected", () => {
      const { result } = renderHook(() => useMarktabfrageFilters(collection(features)));

      act(() => result.current.setFilter("netz", "VNB-Netz"));
      act(() => result.current.setFilter("typ", "ptg_anlage"));

      expect(result.current.filters.netz).toBe(ALL_VALUE);
      expect(result.current.typAutoSwitchGrund).toBe(null);
   });

   it("normalizes swapped Härtegrad bounds", () => {
      const { result } = renderHook(() => useMarktabfrageFilters(collection(features)));

      act(() => result.current.setHaertegradRange([2, 0]));

      expect(result.current.filters.haertegradVon).toBe(0);
      expect(result.current.filters.haertegradBis).toBe(2);
   });

   it("counts metrics over the filtered projects", () => {
      const zeitreihen = { ausspeiseleistungH2Mw: { 2035: 100 } };
      const mitLeistung = [
         projekt("A", { marktabfrage: { projektTyp: "wasserstoff_projekt", attribute: {}, zeitreihen } }),
         ptg("D", {
            marktabfrage: {
               projektTyp: "ptg_anlage",
               attribute: {},
               zeitreihen: { einspeiseleistungH2Mw: { 2035: 50 } }
            }
         })
      ];
      const { result } = renderHook(() => useMarktabfrageFilters(collection(mitLeistung)));

      expect(result.current.metrics).toEqual({ leistungMw: 150, ptgCount: 1, wasserstoffCount: 1 });
   });

   it("resets filters to the defaults", () => {
      const { result } = renderHook(() => useMarktabfrageFilters(collection(features)));

      // Getrennte act-Blöcke: In einem gemeinsamen Block würde setJahrRange über seine dann
      // veraltete filters-Closure die typ-Änderung wieder überschreiben. Die Zwischenprüfung
      // stellt sicher, dass der Reset tatsächlich veränderte Werte zurücksetzt.
      act(() => result.current.setFilter("typ", "ptg_anlage"));
      act(() => result.current.setJahrRange([2028, 2030]));
      expect(result.current.filters.typ).toBe("ptg_anlage");
      expect(result.current.filters.jahrBis).toBe(2030);

      act(() => result.current.resetFilters());

      expect(result.current.filters.typ).toBe(ALL_VALUE);
      expect(result.current.filters.jahrBis).toBe(2035);
   });

   it("reports whether H₂ projects are in the dataset", () => {
      const nurPtg = renderHook(() => useMarktabfrageFilters(collection([ptg("D")])));
      expect(nurPtg.result.current.hatWasserstoffProjekte).toBe(false);

      const gemischt = renderHook(() => useMarktabfrageFilters(collection(features)));
      expect(gemischt.result.current.hatWasserstoffProjekte).toBe(true);
   });

   it("returns search results sorted by rank", () => {
      const { result } = renderHook(() =>
         useMarktabfrageFilters(
            collection([
               projekt("A", { name: "Zeta", betreiber: "Elektrolyse AG", inbetriebnahmeJahr: 2030 }),
               projekt("B", { name: "Elektrolyse Beta", inbetriebnahmeJahr: 2030 })
            ])
         )
      );

      act(() => result.current.setFilter("searchTerm", "elektrolyse"));

      expect(result.current.results.items.map(item => item.item.properties.id)).toEqual(["B", "A"]);
      expect(result.current.hasActiveSearch).toBe(true);
      expect(result.current.searchBounds.length).toBeGreaterThan(0);
   });
});
