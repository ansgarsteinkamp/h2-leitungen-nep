/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import PipelineWorkspace from "./PipelineWorkspace";

function Wrapper({ children }) {
   return (
      <ThemeProvider>
         <TooltipProvider>{children}</TooltipProvider>
      </ThemeProvider>
   );
}

const renderWorkspace = props => render(<PipelineWorkspace {...props} />, { wrapper: Wrapper });

vi.mock("@/lib/data/loadPlaces", () => ({
   loadPlaces: vi.fn(() => new Promise(() => {}))
}));

vi.mock("@/lib/data/geoCollections", () => ({
   buildCountryCollections: () => ({
      europeContext: { type: "FeatureCollection", features: [] },
      germany: { type: "FeatureCollection", features: [] }
   })
}));

vi.mock("@/components/panels/FilterPanel", () => ({
   default({ highlightOgeExecutingOperator, onHighlightOgeExecutingOperatorChange, setFilter }) {
      return (
         <aside data-highlight={String(highlightOgeExecutingOperator)} data-testid="filter-panel">
            <button onClick={() => setFilter("searchTerm", "gibtsnicht")} type="button">
               NEP-Suche einschränken
            </button>
            <button onClick={() => onHighlightOgeExecutingOperatorChange(true)} type="button">
               OGE-Hervorhebung aktivieren
            </button>
         </aside>
      );
   }
}));

vi.mock("@/components/panels/MarktabfrageFilterPanel", () => ({
   default({ onResetFilters, metrics }) {
      return (
         <aside data-ptg-count={metrics.ptgCount} data-testid="marktabfrage-filter-panel">
            <button onClick={onResetFilters} type="button">
               Marktabfrage-Filter zurücksetzen
            </button>
         </aside>
      );
   }
}));

vi.mock("@/components/panels/InspectorPanel", () => ({
   default({ onSelectResult, results, searchInputLabel, selection }) {
      return (
         <aside
            data-result-count={results.items.length}
            data-search-label={searchInputLabel}
            data-selection-id={selection ? selection.item.properties.id : ""}
            data-testid="inspector-panel"
         >
            {results.items.length > 0 ? (
               <button onClick={() => onSelectResult(results.items[0])} type="button">
                  Ersten Treffer auswählen
               </button>
            ) : null}
         </aside>
      );
   }
}));

vi.mock("@/components/map/NetworkMap", () => ({
   default({ marktabfrageMode, marktabfrageProjekte, pipelineContext }) {
      return (
         <section
            data-context-count={pipelineContext.features.length}
            data-marktabfrage-mode={String(marktabfrageMode)}
            data-projekt-count={marktabfrageProjekte.features.length}
            data-testid="network-map"
         />
      );
   }
}));

const leitung = {
   type: "Feature",
   geometry: {
      type: "LineString",
      coordinates: [
         [7, 51],
         [8, 52]
      ]
   },
   properties: {
      id: "L1",
      name: "Leitung L1",
      featureTyp: "leitung",
      leitungstyp: "Neubau",
      startnetz: false,
      netzausbauvorschlag: true
   }
};

const projekt = {
   type: "Feature",
   geometry: { type: "Point", coordinates: [7, 51] },
   properties: {
      id: "WP1",
      name: "Projekt WP1",
      featureTyp: "marktabfrage_projekt",
      geometrieStatus: "vorhanden",
      projektTyp: "wasserstoff_projekt",
      kategorie: "Ausspeisung",
      haertegradStufe: 2,
      inbetriebnahmeJahr: 2030,
      betreiber: "Beispiel GmbH",
      projektnummer: "#1",
      marktabfrage: { projektTyp: "wasserstoff_projekt", attribute: {}, zeitreihen: {} }
   }
};

const countries = { type: "FeatureCollection", features: [] };
const pipelineCollection = { type: "FeatureCollection", features: [leitung] };
const marktabfrageCollection = { type: "FeatureCollection", features: [projekt], labels: {} };

describe("PipelineWorkspace dataset switching", () => {
   afterEach(() => {
      cleanup();
      vi.clearAllMocks();
   });

   it("shows no switch without Marktabfrage data and stays in NEP mode", () => {
      renderWorkspace({ countries, pipelineCollection });

      expect(screen.queryByRole("group", { name: "Datensatz" })).toBeNull();
      expect(screen.getByTestId("filter-panel")).toBeTruthy();
      expect(screen.queryByTestId("marktabfrage-filter-panel")).toBeNull();
      expect(screen.getByTestId("network-map").getAttribute("data-marktabfrage-mode")).toBe("false");
   });

   it("switches to Marktabfrage mode and back via the topbar switch", () => {
      renderWorkspace({ countries, marktabfrageCollection, pipelineCollection });

      expect(screen.getByRole("group", { name: "Datensatz" })).toBeTruthy();
      expect(screen.getByTestId("filter-panel")).toBeTruthy();
      expect(screen.getByRole("heading", { name: "Interaktive Karte der H₂-Maßnahmen" })).toBeTruthy();

      fireEvent.click(screen.getByRole("button", { name: "Marktabfrage 2026" }));

      expect(screen.getByTestId("marktabfrage-filter-panel")).toBeTruthy();
      expect(screen.queryByTestId("filter-panel")).toBeNull();
      expect(screen.getByRole("heading", { name: "Interaktive Karte der H₂-Projekte und PtG-Anlagen" })).toBeTruthy();

      const map = screen.getByTestId("network-map");
      expect(map.getAttribute("data-marktabfrage-mode")).toBe("true");
      expect(map.getAttribute("data-projekt-count")).toBe("1");
      // Leitungskontext: die Linien, die die NEP-Karte mit ihren aktuellen Filtern zeigt.
      expect(map.getAttribute("data-context-count")).toBe("1");
      expect(screen.getByTestId("inspector-panel").getAttribute("data-search-label")).toBe(
         "Suche nach Projektname, Betreiber, Ort, PLZ, ID oder Projektnummer"
      );

      fireEvent.click(screen.getByRole("button", { name: "NEP 2025" }));

      expect(screen.getByTestId("filter-panel")).toBeTruthy();
      expect(screen.queryByTestId("marktabfrage-filter-panel")).toBeNull();
      expect(screen.getByTestId("network-map").getAttribute("data-marktabfrage-mode")).toBe("false");
   });

   it("carries the active NEP filter into the pipeline context of Marktabfrage mode", () => {
      renderWorkspace({ countries, marktabfrageCollection, pipelineCollection });

      fireEvent.click(screen.getByRole("button", { name: "NEP-Suche einschränken" }));
      fireEvent.click(screen.getByRole("button", { name: "Marktabfrage 2026" }));

      expect(screen.getByTestId("network-map").getAttribute("data-context-count")).toBe("0");
   });

   it("keeps NEP filters and highlight untouched when resetting in Marktabfrage mode", () => {
      renderWorkspace({ countries, marktabfrageCollection, pipelineCollection });

      fireEvent.click(screen.getByRole("button", { name: "NEP-Suche einschränken" }));
      fireEvent.click(screen.getByRole("button", { name: "OGE-Hervorhebung aktivieren" }));
      expect(screen.getByTestId("filter-panel").getAttribute("data-highlight")).toBe("true");

      fireEvent.click(screen.getByRole("button", { name: "Marktabfrage 2026" }));
      fireEvent.click(screen.getByRole("button", { name: "Marktabfrage-Filter zurücksetzen" }));
      fireEvent.click(screen.getByRole("button", { name: "NEP 2025" }));

      // Der Reset im Marktabfrage-Modus lässt NEP-Darstellungsoption und NEP-Suchfilter unangetastet.
      expect(screen.getByTestId("filter-panel").getAttribute("data-highlight")).toBe("true");
      expect(screen.getByTestId("inspector-panel").getAttribute("data-result-count")).toBe("0");
   });

   it("keeps the NEP selection across a switch to Marktabfrage mode and back", () => {
      renderWorkspace({ countries, marktabfrageCollection, pipelineCollection });

      fireEvent.click(screen.getByRole("button", { name: "Ersten Treffer auswählen" }));
      expect(screen.getByTestId("inspector-panel").getAttribute("data-selection-id")).toBe("L1");

      fireEvent.click(screen.getByRole("button", { name: "Marktabfrage 2026" }));

      // Im Marktabfrage-Modus ist die (leere) Marktabfrage-Auswahl aktiv, das richtige Panel erscheint.
      expect(screen.getByTestId("marktabfrage-filter-panel")).toBeTruthy();
      expect(screen.getByTestId("inspector-panel").getAttribute("data-selection-id")).toBe("");

      fireEvent.click(screen.getByRole("button", { name: "NEP 2025" }));

      expect(screen.getByTestId("filter-panel")).toBeTruthy();
      expect(screen.getByTestId("inspector-panel").getAttribute("data-selection-id")).toBe("L1");
   });

   it("keeps the Marktabfrage selection across a switch to NEP mode and back", () => {
      renderWorkspace({ countries, marktabfrageCollection, pipelineCollection });

      fireEvent.click(screen.getByRole("button", { name: "Marktabfrage 2026" }));
      fireEvent.click(screen.getByRole("button", { name: "Ersten Treffer auswählen" }));
      expect(screen.getByTestId("inspector-panel").getAttribute("data-selection-id")).toBe("WP1");

      fireEvent.click(screen.getByRole("button", { name: "NEP 2025" }));

      expect(screen.getByTestId("filter-panel")).toBeTruthy();
      expect(screen.getByTestId("inspector-panel").getAttribute("data-selection-id")).toBe("");

      fireEvent.click(screen.getByRole("button", { name: "Marktabfrage 2026" }));

      expect(screen.getByTestId("marktabfrage-filter-panel")).toBeTruthy();
      expect(screen.getByTestId("inspector-panel").getAttribute("data-selection-id")).toBe("WP1");
   });
});
