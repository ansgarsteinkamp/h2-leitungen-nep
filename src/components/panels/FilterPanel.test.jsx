/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ALL_VALUE, MEASURE_TYPE_OPTIONS, NETWORK_VIEW_OPTIONS, SCENARIO_OPTIONS } from "@/lib/domain/constants";
import { initialPipelineFilters } from "@/hooks/usePipelineFilters";
import { TooltipProvider } from "@/components/ui/tooltip";
import FilterPanel from "./FilterPanel";

afterEach(() => {
   cleanup();
});

const options = {
   lineTypes: [{ value: ALL_VALUE, label: "Alle" }],
   operators: [{ value: ALL_VALUE, label: "Alle genannten Unternehmen" }],
   years: [{ value: ALL_VALUE, label: "Alle Jahre" }]
};

const metrics = { costMioEur: 0, count: 0, lengthKm: 0 };

function renderFilterPanel({
   filters = {},
   highlightOgeExecutingOperator = false,
   measureTypeOptions = MEASURE_TYPE_OPTIONS,
   networkViewOptions = NETWORK_VIEW_OPTIONS,
   onHighlightOgeExecutingOperatorChange = vi.fn(),
   onResetFilters = vi.fn(),
   options: filterOptions = options,
   scenarioOptions = SCENARIO_OPTIONS,
   setFilter = vi.fn()
} = {}) {
   render(
      <TooltipProvider>
         <FilterPanel
            filters={{ ...initialPipelineFilters, ...filters }}
            highlightOgeExecutingOperator={highlightOgeExecutingOperator}
            measureTypeOptions={measureTypeOptions}
            metrics={metrics}
            onHighlightOgeExecutingOperatorChange={onHighlightOgeExecutingOperatorChange}
            onResetFilters={onResetFilters}
            networkViewOptions={networkViewOptions}
            options={filterOptions}
            scenarioOptions={scenarioOptions}
            setFilter={setFilter}
         />
      </TooltipProvider>
   );

   return {
      onHighlightOgeExecutingOperatorChange,
      onResetFilters,
      setFilter
   };
}

function getHelpTrigger(label) {
   return screen.getByRole("button", { name: `${label} erläutern` });
}

function queryHelpTrigger(label) {
   return screen.queryByRole("button", { name: `${label} erläutern` });
}

function getSegmentButton(groupName, buttonName) {
   return within(screen.getByRole("group", { name: groupName })).getByRole("button", {
      name: `${groupName}: ${buttonName}`
   });
}

function querySegmentButton(groupName, buttonName) {
   return within(screen.getByRole("group", { name: groupName })).queryByRole("button", {
      name: `${groupName}: ${buttonName}`
   });
}

function expectPressed(button, pressed = true) {
   expect(button.getAttribute("aria-pressed")).toBe(String(pressed));
}

describe("FilterPanel", () => {
   it("shows help only for filters with explanatory domain logic", () => {
      renderFilterPanel();

      expect(getHelpTrigger("Netzauswahl")).toBeTruthy();
      expect(getHelpTrigger("In Szenario 2037 enthalten")).toBeTruthy();
      expect(getHelpTrigger("NEP-Einordnung")).toBeTruthy();
      expect(getHelpTrigger("Netzbetreiber oder Ansprechpartner")).toBeTruthy();
      expect(getHelpTrigger("Nur OGE-Bezug")).toBeTruthy();
      expect(getHelpTrigger("Hervorheben, wenn OGE durchführender FNB ist")).toBeTruthy();

      expect(getHelpTrigger("Kosten")).toBeTruthy();

      expect(queryHelpTrigger("Leitungstyp")).toBeNull();
      expect(queryHelpTrigger("Inbetriebnahmejahr")).toBeNull();
   });

   it("exposes OGE participation as a simple switch control", () => {
      const setFilter = vi.fn();

      renderFilterPanel({ setFilter });

      const switchFilter = screen.getByRole("switch", { name: "Nur OGE-Bezug" });

      expect(screen.getByText("Nur OGE-Bezug")).toBeTruthy();
      expect(getHelpTrigger("Nur OGE-Bezug")).toBeTruthy();
      expect(switchFilter).toHaveProperty("checked", false);

      fireEvent.click(switchFilter);

      expect(setFilter).toHaveBeenCalledWith("ogeParticipationOnly", true);
   });

   it("exposes OGE executing operator highlighting as a display switch", () => {
      const onHighlightOgeExecutingOperatorChange = vi.fn();
      const setFilter = vi.fn();

      renderFilterPanel({ onHighlightOgeExecutingOperatorChange, setFilter });

      const highlightSwitch = screen.getByRole("switch", {
         name: "Hervorheben, wenn OGE durchführender FNB ist"
      });

      expect(highlightSwitch).toHaveProperty("checked", false);
      expect(screen.getByText("Hervorheben, wenn OGE durchführender FNB ist")).toBeTruthy();
      expect(getHelpTrigger("Hervorheben, wenn OGE durchführender FNB ist")).toBeTruthy();

      fireEvent.click(highlightSwitch);

      expect(onHighlightOgeExecutingOperatorChange).toHaveBeenCalledWith(true);
      expect(setFilter).not.toHaveBeenCalled();
   });

   it("reflects active OGE executing operator highlighting in the switch", () => {
      const onHighlightOgeExecutingOperatorChange = vi.fn();

      renderFilterPanel({ highlightOgeExecutingOperator: true, onHighlightOgeExecutingOperatorChange });

      const highlightSwitch = screen.getByRole("switch", {
         name: "Hervorheben, wenn OGE durchführender FNB ist"
      });

      expect(highlightSwitch).toHaveProperty("checked", true);

      fireEvent.click(highlightSwitch);

      expect(onHighlightOgeExecutingOperatorChange).toHaveBeenCalledWith(false);
   });

   it("uses a compact network view selector for scenario views", () => {
      renderFilterPanel({ filters: { networkView: "scenario1" } });

      const networkView = screen.getByRole("combobox", {
         name: "Netzauswahl"
      });

      expect(networkView).toHaveProperty("disabled", false);
      expect(networkView.textContent).toContain("Szenario 1 (2037) + Startnetz");
   });

   it.each(NETWORK_VIEW_OPTIONS)("renders the $label network view label", option => {
      renderFilterPanel({ filters: { networkView: option.value } });

      expect(screen.getByRole("combobox", { name: "Netzauswahl" }).textContent).toContain(option.label);
   });

   it("shows the selected network view and keeps the scenario marker as an explicit filter", () => {
      renderFilterPanel({ filters: { networkView: "all", scenario: "szenario1" } });

      const networkView = screen.getByRole("combobox", {
         name: "Netzauswahl"
      });

      expect(networkView.textContent).toContain("Alle Leitungsmaßnahmen");
      expectPressed(getSegmentButton("In Szenario 2037 enthalten", "Szenario 1"));
   });

   it("renders measure categories as compact visible filters", () => {
      const setFilter = vi.fn();

      renderFilterPanel({ setFilter });

      expect(screen.queryByRole("combobox", { name: "NEP-Einordnung" })).toBeNull();
      expectPressed(getSegmentButton("NEP-Einordnung", "Alle"));

      fireEvent.click(getSegmentButton("NEP-Einordnung", "Startnetz"));

      expect(setFilter).toHaveBeenCalledWith("measureType", "startnetz");
   });

   it("omits unavailable measure category options from the visible filters", () => {
      renderFilterPanel({
         measureTypeOptions: MEASURE_TYPE_OPTIONS.filter(option => option.value !== "scenarioOnly")
      });

      expect(querySegmentButton("NEP-Einordnung", "Nur Szenarioergebnis")).toBeNull();
   });

   it("hides measure categories when the startnetz network view already fixes the category", () => {
      renderFilterPanel({
         filters: { networkView: "startnetz" },
         measureTypeOptions: MEASURE_TYPE_OPTIONS.filter(option => [ALL_VALUE, "startnetz"].includes(option.value))
      });

      expect(screen.queryByRole("group", { name: "NEP-Einordnung" })).toBeNull();
      expect(queryHelpTrigger("NEP-Einordnung")).toBeNull();
      expect(screen.queryByRole("group", { name: "In Szenario 2037 enthalten" })).toBeNull();
      expect(queryHelpTrigger("In Szenario 2037 enthalten")).toBeNull();
      expect(screen.getByRole("group", { name: "Leitungstyp" })).toBeTruthy();
   });

   it("hides the scenario marker filter inside scenario network views", () => {
      const setFilter = vi.fn();

      renderFilterPanel({ filters: { networkView: "scenario1" }, setFilter });

      expect(queryHelpTrigger("In Szenario 2037 enthalten")).toBeNull();
      expect(screen.queryByRole("button", { name: "In Szenario 2037 enthalten: Szenario 1" })).toBeNull();
      expect(setFilter).not.toHaveBeenCalled();
   });

   it("resets filters and map with the compact reset action", () => {
      const onResetFilters = vi.fn();

      renderFilterPanel({ onResetFilters });

      fireEvent.click(screen.getByRole("button", { name: "Filter und Karte zurücksetzen" }));

      expect(onResetFilters).toHaveBeenCalledOnce();
   });

   it("keeps the OGE help tooltip trigger separate from the switch", () => {
      const setFilter = vi.fn();

      renderFilterPanel({ setFilter });

      fireEvent.click(getHelpTrigger("Nur OGE-Bezug"));

      expect(setFilter).not.toHaveBeenCalled();
      expect(screen.getByRole("switch", { name: "Nur OGE-Bezug" })).toHaveProperty("checked", false);
   });

   it("keeps the OGE executing operator highlight tooltip trigger separate from the switch", () => {
      const onHighlightOgeExecutingOperatorChange = vi.fn();

      renderFilterPanel({ onHighlightOgeExecutingOperatorChange });

      fireEvent.click(getHelpTrigger("Hervorheben, wenn OGE durchführender FNB ist"));

      expect(onHighlightOgeExecutingOperatorChange).not.toHaveBeenCalled();
      expect(screen.getByRole("switch", { name: "Hervorheben, wenn OGE durchführender FNB ist" })).toHaveProperty(
         "checked",
         false
      );
   });

   it("reflects an active OGE participation filter in the switch", () => {
      renderFilterPanel({ filters: { ogeParticipationOnly: true } });

      expect(screen.getByRole("switch", { name: "Nur OGE-Bezug" })).toHaveProperty("checked", true);
   });

   it("uses line type symbols without implying a single OGE participation color", () => {
      renderFilterPanel({
         options: {
            ...options,
            lineTypes: [
               { value: ALL_VALUE, label: "Alle" },
               { value: "Neubau", label: "Neubau" },
               { value: "Umstellung", label: "Umstellung" }
            ]
         }
      });

      expect(getSegmentButton("Leitungstyp", "Alle").querySelector("span[style]")).toBeNull();

      const neubauStyles = [...getSegmentButton("Leitungstyp", "Neubau").querySelectorAll("span[style]")].map(item =>
         item.getAttribute("style")
      );
      const umstellungStyles = [...getSegmentButton("Leitungstyp", "Umstellung").querySelectorAll("span[style]")].map(
         item => item.getAttribute("style")
      );

      expect(neubauStyles).toHaveLength(2);
      expect(umstellungStyles).toHaveLength(2);
      expect(neubauStyles.every(style => style.includes("repeating-linear-gradient"))).toBe(true);
      expect(umstellungStyles.every(style => style.includes("repeating-linear-gradient"))).toBe(false);
   });
});
