/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import MapLegend from "./MapLegend";
import { MAP_EXPORT_EXCLUDE_ATTRIBUTE } from "./mapExport";

function renderLegend(props) {
   return render(
      <TooltipProvider>
         <MapLegend {...props} />
      </TooltipProvider>
   );
}

describe("MapLegend", () => {
   afterEach(() => {
      cleanup();
   });

   it("lists all OGE participation and line type combinations", () => {
      renderLegend();

      const legend = screen.getByRole("complementary", { name: "Kartenlegende" });
      const entries = within(legend).getAllByRole("listitem");

      expect(entries).toHaveLength(4);
      expect(entries.map(entry => entry.textContent)).toEqual([
         "OGE-Bezug Umstellung",
         "OGE-Bezug Neubau",
         "Kein OGE-Bezug Umstellung",
         "Kein OGE-Bezug Neubau"
      ]);
      expect(within(legend).getByRole("list")).toBeTruthy();
   });

   it("does not explain OGE executing operator highlights while the highlight is inactive", () => {
      renderLegend();

      expect(screen.queryByText("OGE als durchführender FNB")).toBeNull();
   });

   it("adds the OGE executing operator highlight when the highlight is active", () => {
      renderLegend({ showOgeExecutingOperatorHighlight: true });

      const legend = screen.getByRole("complementary", { name: "Kartenlegende" });
      const entries = within(legend).getAllByRole("listitem");

      expect(entries).toHaveLength(5);
      expect(entries.at(-1).textContent).toBe("OGE als durchführender FNB");
   });

   it("requests hiding from the map", () => {
      const onHide = vi.fn();

      renderLegend({ onHide });

      fireEvent.click(screen.getByRole("button", { name: "Legende ausblenden" }));

      expect(onHide).toHaveBeenCalledOnce();
   });

   it("does not render a no-op hide button", () => {
      renderLegend();

      expect(screen.queryByRole("button", { name: "Legende ausblenden" })).toBeNull();
   });

   it("excludes the hide button from PNG exports", () => {
      renderLegend({ onHide: vi.fn() });

      expect(
         screen.getByRole("button", { name: "Legende ausblenden" }).getAttribute(MAP_EXPORT_EXCLUDE_ATTRIBUTE)
      ).toBe("");
   });

   it("names the internal OGE planning horizon in the highlight entry", () => {
      renderLegend({ ogeExecutingNepHorizon: 2029, showOgeExecutingOperatorHighlight: true });

      const legend = screen.getByRole("complementary", { name: "Kartenlegende" });

      expect(within(legend).getAllByRole("listitem").at(-1).textContent).toBe(
         "OGE als durchführender FNB: NEP 2025 und interne OGE-Planung bis NEP 29"
      );
   });
});
