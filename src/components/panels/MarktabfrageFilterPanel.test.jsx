/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ALL_VALUE } from "@/lib/domain/constants";
import { PROJEKT_TYP_PTG, PROJEKT_TYP_WASSERSTOFF } from "@/lib/domain/marktabfrage";
import MarktabfrageFilterPanel from "./MarktabfrageFilterPanel";

globalThis.ResizeObserver ??= class ResizeObserver {
   observe() {}
   unobserve() {}
   disconnect() {}
};

afterEach(() => {
   cleanup();
});

const projektTypOptions = [
   { value: ALL_VALUE, label: "Alle" },
   { value: PROJEKT_TYP_WASSERSTOFF, label: "H₂-Projekte" },
   { value: PROJEKT_TYP_PTG, label: "PtG-Anlagen" }
];

const kategorieOptions = [
   { value: ALL_VALUE, label: "Alle" },
   { value: "Ausspeisung", label: "Exit" },
   { value: "Einspeisung", label: "Entry" },
   { value: "Speicher", label: "Speicher" }
];

const netzOptions = [
   { value: ALL_VALUE, label: "Alle" },
   { value: "FNB-Netz", label: "FNB-Netz" },
   { value: "VNB-Netz", label: "VNB-Netz" }
];

const minLeistungOptions = [
   { value: ALL_VALUE, label: "Alle" },
   { value: "10", label: "mind. 10 MW" },
   { value: "50", label: "mind. 50 MW" }
];

const baseFilters = {
   typ: ALL_VALUE,
   kategorie: ALL_VALUE,
   netz: ALL_VALUE,
   minLeistungMw: ALL_VALUE,
   jahrVon: 2030,
   jahrBis: 2035,
   haertegradVon: 0,
   haertegradBis: 3
};

const baseMetrics = { wasserstoffCount: 12, ptgCount: 5, leistungMw: 250 };

function renderPanel({
   filters = {},
   hatWasserstoffProjekte = true,
   jahrBounds = { min: 2025, max: 2040 },
   metrics = baseMetrics,
   setFilter = vi.fn(),
   setHaertegradRange = vi.fn(),
   setJahrRange = vi.fn(),
   onResetFilters = vi.fn(),
   typAutoSwitchGrund = null
} = {}) {
   render(
      <TooltipProvider>
         <MarktabfrageFilterPanel
            filters={{ ...baseFilters, ...filters }}
            hatWasserstoffProjekte={hatWasserstoffProjekte}
            jahrBounds={jahrBounds}
            kategorieOptions={kategorieOptions}
            metrics={metrics}
            minLeistungOptions={minLeistungOptions}
            netzOptions={netzOptions}
            onResetFilters={onResetFilters}
            projektTypOptions={projektTypOptions}
            setFilter={setFilter}
            setHaertegradRange={setHaertegradRange}
            setJahrRange={setJahrRange}
            typAutoSwitchGrund={typAutoSwitchGrund}
         />
      </TooltipProvider>
   );

   return { setFilter, setHaertegradRange, setJahrRange, onResetFilters };
}

function getSegmentButton(groupName, buttonName) {
   return within(screen.getByRole("group", { name: groupName })).getByRole("button", {
      name: `${groupName}: ${buttonName}`
   });
}

describe("MarktabfrageFilterPanel", () => {
   it("renders the dashboard tiles with MW capacity", () => {
      renderPanel({ metrics: { wasserstoffCount: 12, ptgCount: 5, leistungMw: 250 } });

      const dashboard = within(screen.getByRole("region", { name: "Kennzahlen der aktuellen Ansicht" }));
      expect(dashboard.getByText("Projekte")).toBeTruthy();
      expect(dashboard.getByText("12")).toBeTruthy();
      expect(dashboard.getByText("PtG-Anlagen")).toBeTruthy();
      expect(dashboard.getByText("5")).toBeTruthy();
      expect(dashboard.getByText("Leistung 2035")).toBeTruthy();
      expect(dashboard.getByText("250")).toBeTruthy();
      expect(dashboard.getByText("MW")).toBeTruthy();
   });

   it("switches the capacity tile to GW at 1000 MW or more", () => {
      renderPanel({ metrics: { wasserstoffCount: 0, ptgCount: 0, leistungMw: 2500 } });

      expect(screen.getByText("2,5")).toBeTruthy();
      expect(screen.getByText("GW")).toBeTruthy();
      expect(screen.queryByText("MW")).toBeNull();
   });

   it("renders project type chips and reports selection via setFilter", () => {
      const { setFilter } = renderPanel();

      expect(getSegmentButton("Projekttyp", "Alle")).toBeTruthy();
      fireEvent.click(getSegmentButton("Projekttyp", "PtG-Anlagen"));

      expect(setFilter).toHaveBeenCalledWith("typ", PROJEKT_TYP_PTG);
   });

   it("renders category chips with shape-color symbols (except for Alle)", () => {
      const { setFilter } = renderPanel();

      expect(getSegmentButton("Kategorie", "Alle").querySelector("svg[style]")).toBeNull();
      expect(getSegmentButton("Kategorie", "Exit").querySelector("svg[style] circle")).toBeTruthy();
      expect(getSegmentButton("Kategorie", "Entry").querySelector("svg[style] path")).toBeTruthy();

      fireEvent.click(getSegmentButton("Kategorie", "Speicher"));
      expect(setFilter).toHaveBeenCalledWith("kategorie", "Speicher");
   });

   it("renders network chips and reports selection via setFilter", () => {
      const { setFilter } = renderPanel();

      expect(getSegmentButton("Netz", "Alle")).toBeTruthy();
      fireEvent.click(getSegmentButton("Netz", "FNB-Netz"));

      expect(setFilter).toHaveBeenCalledWith("netz", "FNB-Netz");
   });

   it("renders the minimum capacity filter with the active value", () => {
      renderPanel({ filters: { minLeistungMw: "50" } });

      const trigger = screen.getByRole("combobox", { name: "Mindestleistung" });
      expect(trigger.textContent).toContain("mind. 50 MW");
   });

   it("hides category, network, and the Härtegrad slider for PtG plants", () => {
      renderPanel({ filters: { typ: PROJEKT_TYP_PTG } });

      expect(screen.queryByRole("group", { name: "Kategorie" })).toBeNull();
      expect(screen.queryByRole("group", { name: "Netz" })).toBeNull();
      expect(screen.queryByRole("slider", { name: "Härtegrad von" })).toBeNull();
      expect(screen.getByRole("group", { name: "Projekttyp" })).toBeTruthy();
   });

   it("reports year slider changes via setJahrRange", () => {
      const { setJahrRange } = renderPanel({ filters: { jahrVon: 2030, jahrBis: 2035 } });

      const jahrVon = screen.getByRole("slider", { name: "Inbetriebnahmejahr von" });
      expect(screen.getByText("2030 bis 2035")).toBeTruthy();

      fireEvent.keyDown(jahrVon, { key: "ArrowRight" });
      expect(setJahrRange).toHaveBeenCalledWith([2031, 2035]);
   });

   it("shows the Härtegrad range as an HG label", () => {
      renderPanel({ filters: { haertegradVon: 0, haertegradBis: 3 } });

      expect(screen.getByRole("slider", { name: "Härtegrad von" })).toBeTruthy();
      expect(screen.getByText("HG 0 bis HG 3")).toBeTruthy();
   });

   it("hides the Härtegrad slider when no hydrogen projects are present", () => {
      renderPanel({ hatWasserstoffProjekte: false });

      expect(screen.queryByRole("slider", { name: "Härtegrad von" })).toBeNull();
      expect(screen.getByRole("slider", { name: "Inbetriebnahmejahr von" })).toBeTruthy();
   });

   it("hides the Netz filter when the dataset contains no hydrogen projects", () => {
      renderPanel({ hatWasserstoffProjekte: false });

      // Ohne H₂-Projekte würde der Netz-Filter (samt Auto-Umschalten auf H₂-Projekte)
      // garantiert leere Ergebnisse erzeugen; er verschwindet wie der Härtegrad-Slider.
      expect(screen.queryByRole("group", { name: "Netz" })).toBeNull();
      expect(screen.getByRole("group", { name: "Kategorie" })).toBeTruthy();
   });

   it("announces the automatic project type switch as a status message depending on the reason", () => {
      renderPanel({ typAutoSwitchGrund: "haertegrad" });
      expect(screen.getByRole("status", { name: "Hinweis zum Projekttyp-Filter" }).textContent).toContain(
         "keinen Härtegrad"
      );
      cleanup();

      renderPanel({ typAutoSwitchGrund: "netz" });
      expect(screen.getByRole("status", { name: "Hinweis zum Projekttyp-Filter" }).textContent).toContain(
         "keine Netzzuordnung"
      );
   });

   it("keeps the status message empty as long as no automatic switch happened", () => {
      renderPanel();

      expect(screen.getByRole("status", { name: "Hinweis zum Projekttyp-Filter" }).textContent).toBe("");
   });
});
