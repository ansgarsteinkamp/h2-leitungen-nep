import { describe, expect, it } from "vitest";

import {
   getHaertegradStufe,
   getLeistungMw,
   getLeistungszeitreiheMw,
   haertegradStufeLabel,
   isMarktabfrageProjektFeature,
   isPtgAnlage
} from "@/lib/domain/marktabfrage";
import { projektMeta, projektTitle, projektTypLabel } from "@/lib/domain/marktabfrageFormatters";
import { sumMarktabfrageMetrics } from "@/lib/domain/marktabfrageMetrics";

const wasserstoffProjekt = (kategorie, zeitreihen, properties = {}) => ({
   properties: {
      id: "WP1",
      name: "Projekt Alpha",
      featureTyp: "marktabfrage_projekt",
      projektTyp: "wasserstoff_projekt",
      kategorie,
      haertegradStufe: 2,
      inbetriebnahmeJahr: 2035,
      marktabfrage: { projektTyp: "wasserstoff_projekt", attribute: {}, zeitreihen },
      ...properties
   }
});

const ptgAnlage = zeitreihen => ({
   properties: {
      id: "PTG1",
      name: "PtG Beta",
      featureTyp: "marktabfrage_projekt",
      projektTyp: "ptg_anlage",
      kategorie: "Einspeisung",
      haertegradStufe: null,
      inbetriebnahmeJahr: 2028,
      marktabfrage: { projektTyp: "ptg_anlage", attribute: {}, zeitreihen }
   }
});

describe("Härtegrad", () => {
   it("maps the source values to levels 0 to 3", () => {
      expect(getHaertegradStufe("H2-Bedarf gesichert")).toBe(0);
      expect(getHaertegradStufe("HG 1")).toBe(1);
      expect(getHaertegradStufe("HG 2")).toBe(2);
      expect(getHaertegradStufe("HG 3")).toBe(3);
      expect(getHaertegradStufe("unbekannt")).toBeNull();
      expect(getHaertegradStufe(null)).toBeNull();
   });

   it("ignores inherited object keys instead of returning prototype members", () => {
      expect(getHaertegradStufe("toString")).toBeNull();
      expect(getHaertegradStufe("constructor")).toBeNull();
   });

   it("formats levels as HG labels", () => {
      expect(haertegradStufeLabel(0)).toBe("HG 0");
   });
});

describe("feature detection", () => {
   it("detects Marktabfrage projects and PtG plants", () => {
      expect(isMarktabfrageProjektFeature(wasserstoffProjekt("Ausspeisung", {}))).toBe(true);
      expect(isMarktabfrageProjektFeature({ properties: { featureTyp: "leitung" } })).toBe(false);
      expect(isPtgAnlage(ptgAnlage({}))).toBe(true);
      expect(isPtgAnlage(wasserstoffProjekt("Ausspeisung", {}))).toBe(false);
   });
});

describe("capacity time series", () => {
   it("uses the offtake capacity for Ausspeisung and Speicher", () => {
      const zeitreihen = { ausspeiseleistungH2Mw: { 2035: 80 }, einspeiseleistungH2Mw: { 2035: 30 } };
      expect(getLeistungszeitreiheMw(wasserstoffProjekt("Ausspeisung", zeitreihen))).toEqual({ 2035: 80 });
      expect(getLeistungszeitreiheMw(wasserstoffProjekt("Speicher", zeitreihen))).toEqual({ 2035: 80 });
   });

   it("uses the injection capacity for Einspeisung and PtG plants", () => {
      const zeitreihen = { einspeiseleistungH2Mw: { 2035: 30 } };
      expect(getLeistungszeitreiheMw(wasserstoffProjekt("Einspeisung", zeitreihen))).toEqual({ 2035: 30 });
      expect(getLeistungszeitreiheMw(ptgAnlage(zeitreihen))).toEqual({ 2035: 30 });
   });

   it("returns null for missing years or series", () => {
      expect(
         getLeistungMw(wasserstoffProjekt("Ausspeisung", { ausspeiseleistungH2Mw: { 2040: 80 } }), 2035)
      ).toBeNull();
      expect(getLeistungMw(wasserstoffProjekt("Ausspeisung", {}), 2035)).toBeNull();
      expect(getLeistungMw(wasserstoffProjekt("Ausspeisung", { ausspeiseleistungH2Mw: { 2035: 80 } }), 2035)).toBe(80);
   });
});

describe("sumMarktabfrageMetrics", () => {
   it("sums counts and capacity in the reference year", () => {
      const collection = {
         features: [
            wasserstoffProjekt("Ausspeisung", { ausspeiseleistungH2Mw: { 2035: 100 } }),
            wasserstoffProjekt("Einspeisung", { einspeiseleistungH2Mw: { 2035: 25 } }, { id: "WP2" }),
            ptgAnlage({ einspeiseleistungH2Mw: { 2035: 50 } }),
            ptgAnlage({ einspeiseleistungH2Mw: { 2040: 999 } })
         ]
      };

      expect(sumMarktabfrageMetrics(collection)).toEqual({ leistungMw: 175, ptgCount: 2, wasserstoffCount: 2 });
   });
});

describe("Formatter", () => {
   it("builds type label, title, and meta line", () => {
      const wp = wasserstoffProjekt("Ausspeisung", {});
      expect(projektTypLabel(wp)).toBe("H₂-Projekt");
      expect(projektTitle(wp)).toBe("Projekt Alpha");
      expect(projektMeta(wp)).toBe("H₂-Projekt · Ausspeisung · HG 2 · IBN 2035");

      const anlage = ptgAnlage({});
      expect(projektTypLabel(anlage)).toBe("PtG-Anlage");
      expect(projektMeta(anlage)).toBe("PtG-Anlage · Einspeisung · IBN 2028");
   });
});
