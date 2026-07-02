import { describe, expect, it } from "vitest";

import { getPipelineParticipants, hasOgeExecutingOperator, hasOgeParticipation, isStandardFeature } from "./pipeline";

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
});
