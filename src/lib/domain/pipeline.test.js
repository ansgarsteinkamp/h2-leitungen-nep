import { describe, expect, it } from "vitest";

import {
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

   describe("isOgeExecutingOperatorHighlighted", () => {
      const current = { properties: { ogeIstDurchfuehrenderNetzbetreiber: true } };
      const fromNep27 = { properties: { ogeIstDurchfuehrenderNetzbetreiber: false, ogeDurchfuehrendAbNep: 2027 } };
      const fromNep29 = { properties: { ogeIstDurchfuehrenderNetzbetreiber: false, ogeDurchfuehrendAbNep: 2029 } };
      const fromNep31 = { properties: { ogeIstDurchfuehrenderNetzbetreiber: false, ogeDurchfuehrendAbNep: 2031 } };
      const other = { properties: { ogeIstDurchfuehrenderNetzbetreiber: false } };

      it("highlights nothing while the OGE highlight is off, even with selected NEP cycles", () => {
         const options = { highlightOgeExecutingOperator: false, ogeExecutingNeps: [2027, 2031] };

         expect(isOgeExecutingOperatorHighlighted(current, options)).toBe(false);
         expect(isOgeExecutingOperatorHighlighted(fromNep27, options)).toBe(false);
      });

      it("highlights only today's OGE executing measures without selected NEP cycles", () => {
         const options = { highlightOgeExecutingOperator: true, ogeExecutingNeps: [] };

         expect(isOgeExecutingOperatorHighlighted(current, options)).toBe(true);
         expect(isOgeExecutingOperatorHighlighted(fromNep27, options)).toBe(false);
         expect(isOgeExecutingOperatorHighlighted(other, options)).toBe(false);
      });

      it("applies each selected NEP cycle on its own, not cumulatively", () => {
         const nep31 = { highlightOgeExecutingOperator: true, ogeExecutingNeps: [2031] };
         const nep27And31 = { highlightOgeExecutingOperator: true, ogeExecutingNeps: [2027, 2031] };

         expect(isOgeExecutingOperatorHighlighted(current, nep31)).toBe(true);
         expect(isOgeExecutingOperatorHighlighted(fromNep27, nep31)).toBe(false);
         expect(isOgeExecutingOperatorHighlighted(fromNep31, nep31)).toBe(true);
         expect(isOgeExecutingOperatorHighlighted(fromNep27, nep27And31)).toBe(true);
         expect(isOgeExecutingOperatorHighlighted(fromNep29, nep27And31)).toBe(false);
         expect(isOgeExecutingOperatorHighlighted(other, nep27And31)).toBe(false);
      });

      it("highlights a compressor site with measures from several cycles for each of these cycles", () => {
         const site = {
            properties: {
               featureTyp: "verdichterstandort",
               massnahmen: [
                  { id: "V1", ogeDurchfuehrendAbNep: 2027 },
                  { id: "V2", ogeDurchfuehrendAbNep: 2031 }
               ]
            }
         };
         const highlighted = ogeExecutingNeps =>
            isOgeExecutingOperatorHighlighted(site, { highlightOgeExecutingOperator: true, ogeExecutingNeps });

         expect(highlighted([2031])).toBe(true);
         expect(highlighted([2027])).toBe(true);
         expect(highlighted([2029])).toBe(false);
      });
   });
});
