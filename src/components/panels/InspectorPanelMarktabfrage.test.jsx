/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import InspectorPanel from "./InspectorPanel";

afterEach(() => {
   cleanup();
});

function makeResult(id, name) {
   return { kind: "marktabfrage", item: { properties: { id, name } }, title: name, source: "filtered" };
}

function renderInspector(props = {}) {
   const defaults = {
      onClearSearch: vi.fn(),
      onCloseSelection: vi.fn(),
      onSearchTermChange: vi.fn(),
      onSelectResult: vi.fn(),
      onShowSearchFallback: vi.fn(),
      results: { items: [] },
      searchTerm: "",
      selection: null
   };
   render(<InspectorPanel {...defaults} {...props} />);
}

describe("InspectorPanel in Marktabfrage mode", () => {
   it("uses getResultMeta for the result rows", () => {
      const getResultMeta = vi.fn(item => `Meta ${item.properties.id}`);

      renderInspector({
         getResultMeta,
         results: { items: [makeResult("H2-1", "Alpha")] }
      });

      expect(screen.getByText("Meta H2-1")).toBeTruthy();
      expect(getResultMeta).toHaveBeenCalledWith({ properties: { id: "H2-1", name: "Alpha" } });
   });

   it("replaces the DetailPanel with renderDetail", () => {
      const onCloseSelection = vi.fn();
      const selection = makeResult("H2-9", "Gamma");
      const renderDetail = vi.fn(() => <div data-testid="custom-detail">Eigenes Detail</div>);

      renderInspector({ onCloseSelection, renderDetail, selection });

      expect(screen.getByTestId("custom-detail")).toBeTruthy();
      expect(renderDetail).toHaveBeenCalledWith(selection, onCloseSelection);
   });

   it("sets the search field aria-label via searchInputLabel", () => {
      renderInspector({ searchInputLabel: "Suche nach Projekt, Betreiber oder ID" });

      expect(screen.getByRole("textbox", { name: "Suche nach Projekt, Betreiber oder ID" })).toBeTruthy();
   });
});
