import { describe, expect, it } from "vitest";

import {
   getOgeExecutingFromNep,
   getPipelineParticipants,
   hasOgeExecutingOperator,
   hasOgeParticipation,
   isOgeExecutingOperatorHighlighted,
   isStandardFeature
} from "./pipeline";

describe("pipeline domain helpers", () => {
   it("treats startnetz and netzausbauvorschlag as standard features", () => {
      expect(isStandardFeature({ properties: { startnetz: true, netzausbauvorschlag: false } })).toBe(true);
      expect(isStandardFeature({ properties: { startnetz: false, netzausbauvorschlag: true } })).toBe(true);
      expect(
         isStandardFeature({ properties: { startnetz: false, netzausbauvorschlag: false, standardAnzeige: true } })
      ).toBe(false);
   });

   it("derives OGE participation from operators and contacts", () => {
      expect(
         hasOgeParticipation({
            properties: {
               durchfuehrendeNetzbetreiber: ["Partner Netz, Open Grid Europe GmbH"],
               ansprechpartner: []
            }
         })
      ).toBe(true);

      expect(
         hasOgeParticipation({
            properties: {
               durchfuehrendeNetzbetreiber: [],
               ansprechpartner: ["Regional AG"],
               ogeBeteiligung: true
            }
         })
      ).toBe(false);
   });

   it("derives OGE executing operator only from executing operators", () => {
      expect(
         hasOgeExecutingOperator({
            properties: {
               durchfuehrendeNetzbetreiber: ["Partner Netz, OGE"],
               ansprechpartner: []
            }
         })
      ).toBe(true);

      expect(
         hasOgeExecutingOperator({
            properties: {
               durchfuehrendeNetzbetreiber: ["Regional AG"],
               ansprechpartner: ["Open Grid Europe GmbH"]
            }
         })
      ).toBe(false);

      expect(
         hasOgeExecutingOperator({
            properties: {
               durchfuehrendeNetzbetreiber: ["Regional AG"],
               ansprechpartner: []
            }
         })
      ).toBe(false);
   });

   it("splits participants from comma and slash separated values", () => {
      expect(
         getPipelineParticipants({
            durchfuehrendeNetzbetreiber: "A Netz / B Netz",
            ansprechpartner: "C Netz, D Netz"
         })
      ).toEqual(["A Netz", "B Netz", "C Netz", "D Netz"]);
   });

   it("maps known FNB abbreviations and aliases to canonical names", () => {
      expect(
         getPipelineParticipants({
            durchfuehrendeNetzbetreiber: "bayernets, OGE / NaTran_D",
            ansprechpartner: "GTG Nord"
         })
      ).toEqual(["bayernets GmbH", "Open Grid Europe GmbH", "NaTran Deutschland GmbH", "Gastransport Nord GmbH"]);
   });

   it("reads the planned OGE executing NEP cycle only as an integer year", () => {
      expect(getOgeExecutingFromNep({ properties: { ogeDurchfuehrendAbNep: 2029 } })).toBe(2029);
      expect(getOgeExecutingFromNep({ properties: { ogeDurchfuehrendAbNep: "2029" } })).toBeNull();
      expect(getOgeExecutingFromNep({ properties: {} })).toBeNull();
   });

   describe("isOgeExecutingOperatorHighlighted", () => {
      const current = { properties: { ogeIstDurchfuehrenderNetzbetreiber: true } };
      const fromNep27 = { properties: { ogeIstDurchfuehrenderNetzbetreiber: false, ogeDurchfuehrendAbNep: 2027 } };
      const fromNep31 = { properties: { ogeIstDurchfuehrenderNetzbetreiber: false, ogeDurchfuehrendAbNep: 2031 } };
      const other = { properties: { ogeIstDurchfuehrenderNetzbetreiber: false } };

      it("highlights nothing while the OGE highlight is off, even with a NEP horizon", () => {
         const options = { highlightOgeExecutingOperator: false, ogeExecutingNepHorizon: 2031 };

         expect(isOgeExecutingOperatorHighlighted(current, options)).toBe(false);
         expect(isOgeExecutingOperatorHighlighted(fromNep27, options)).toBe(false);
      });

      it("highlights only today's OGE executing measures without a NEP horizon", () => {
         const options = { highlightOgeExecutingOperator: true, ogeExecutingNepHorizon: null };

         expect(isOgeExecutingOperatorHighlighted(current, options)).toBe(true);
         expect(isOgeExecutingOperatorHighlighted(fromNep27, options)).toBe(false);
         expect(isOgeExecutingOperatorHighlighted(other, options)).toBe(false);
      });

      it("applies the NEP horizon cumulatively", () => {
         const nep29 = { highlightOgeExecutingOperator: true, ogeExecutingNepHorizon: 2029 };
         const nep31 = { highlightOgeExecutingOperator: true, ogeExecutingNepHorizon: 2031 };

         expect(isOgeExecutingOperatorHighlighted(current, nep29)).toBe(true);
         expect(isOgeExecutingOperatorHighlighted(fromNep27, nep29)).toBe(true);
         expect(isOgeExecutingOperatorHighlighted(fromNep31, nep29)).toBe(false);
         expect(isOgeExecutingOperatorHighlighted(fromNep31, nep31)).toBe(true);
         expect(isOgeExecutingOperatorHighlighted(other, nep31)).toBe(false);
      });

      it("ignores compressor measures hidden by the active filters", () => {
         const site = {
            properties: {
               featureTyp: "verdichterstandort",
               massnahmen: [
                  { id: "V1", ogeIstDurchfuehrenderNetzbetreiber: false },
                  { id: "V2", ogeIstDurchfuehrenderNetzbetreiber: true, ogeDurchfuehrendAbNep: null },
                  { id: "V3", ogeIstDurchfuehrenderNetzbetreiber: false, ogeDurchfuehrendAbNep: 2027 }
               ]
            }
         };
         const options = { highlightOgeExecutingOperator: true, ogeExecutingNepHorizon: 2031 };

         expect(
            isOgeExecutingOperatorHighlighted(site, { ...options, isVisibleMeasure: unit => unit.id === "V1" })
         ).toBe(false);
         expect(
            isOgeExecutingOperatorHighlighted(site, { ...options, isVisibleMeasure: unit => unit.id === "V2" })
         ).toBe(true);
         expect(
            isOgeExecutingOperatorHighlighted(site, { ...options, isVisibleMeasure: unit => unit.id === "V3" })
         ).toBe(true);
      });

      it("highlights a compressor site when any of its measures is planned within the horizon", () => {
         const site = {
            properties: {
               featureTyp: "verdichterstandort",
               ogeIstDurchfuehrenderNetzbetreiber: false,
               massnahmen: [{ id: "V1" }, { id: "V2", ogeDurchfuehrendAbNep: 2027 }]
            }
         };

         expect(
            isOgeExecutingOperatorHighlighted(site, {
               highlightOgeExecutingOperator: true,
               ogeExecutingNepHorizon: 2027
            })
         ).toBe(true);
         expect(isOgeExecutingOperatorHighlighted(site, { highlightOgeExecutingOperator: true })).toBe(false);
      });
   });
});
