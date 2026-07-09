/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import NetworkMap from "./NetworkMap";

vi.mock("@/components/map/MapViewport", () => ({
   default({ children, exportFilenameTitle, label }) {
      return (
         <section aria-label="map" data-export-filename-title={exportFilenameTitle} data-label={label}>
            {children}
         </section>
      );
   }
}));

vi.mock("@/components/map/MapCameraEffects", () => ({
   default() {
      return <div data-testid="camera-effects" />;
   }
}));

vi.mock("@/components/map/MapZoomControls", () => ({
   default() {
      return <div data-testid="zoom-controls" />;
   }
}));

vi.mock("@/components/map/CountryLayers", () => ({
   default() {
      return <div data-testid="country-layers" />;
   }
}));

vi.mock("@/components/map/PipelineLayer", () => ({
   default({ presentation = "interactive" }) {
      return <div data-presentation={presentation} data-testid="pipeline-layer" />;
   }
}));

vi.mock("@/components/map/PlaceLayer", () => ({
   default({ places }) {
      return <div data-place-count={places.length} data-testid="place-layer" />;
   }
}));

vi.mock("@/components/map/MarktabfrageLayer", () => ({
   default({ presentation = "interactive", projekte, selectedProjektId }) {
      return (
         <div
            data-presentation={presentation}
            data-projekt-count={projekte.features.length}
            data-selected={String(selectedProjektId)}
            data-testid="marktabfrage-layer"
         />
      );
   }
}));

vi.mock("@/components/map/MarktabfrageLegend", () => ({
   default({ onHide, showPipelineContext }) {
      return (
         <div data-show-pipeline-context={String(showPipelineContext)} data-testid="marktabfrage-legend">
            <button onClick={onHide} type="button">
               Marktabfrage-Legende ausblenden
            </button>
         </div>
      );
   }
}));

const collection = { type: "FeatureCollection", features: [] };
const pipelineContext = {
   type: "FeatureCollection",
   features: [{ properties: { id: "L1" }, geometry: { type: "LineString", coordinates: [] } }]
};

function marktabfrageMapJsx(props = {}) {
   return (
      <TooltipProvider>
         <NetworkMap
            europeContext={collection}
            filteredPipelines={collection}
            germany={collection}
            marktabfrageMode
            marktabfrageProjekte={collection}
            onSelectPipeline={vi.fn()}
            pipelineContext={pipelineContext}
            resetViewKey={0}
            searchActive={false}
            searchBounds={[]}
            selection={null}
            {...props}
         />
      </TooltipProvider>
   );
}

function renderMarktabfrageMap(props = {}) {
   return render(marktabfrageMapJsx(props));
}

describe("NetworkMap in Marktabfrage mode", () => {
   afterEach(() => {
      cleanup();
      vi.clearAllMocks();
   });

   it("renders interactive projects, the pipeline context, and the Marktabfrage legend", () => {
      renderMarktabfrageMap();

      expect(screen.getByTestId("marktabfrage-layer").getAttribute("data-presentation")).toBe("interactive");
      expect(screen.getByTestId("pipeline-layer").getAttribute("data-presentation")).toBe("context");
      expect(screen.getByTestId("marktabfrage-legend").getAttribute("data-show-pipeline-context")).toBe("true");
      expect(screen.queryByTestId("place-layer")).toBeNull();
   });

   it("shows Marktabfrage context and places without pipelines and legend in places mode", () => {
      renderMarktabfrageMap({
         mapContent: "places",
         places: [{ id: "Ort:1", latitude: 52, longitude: 9, name: "Achim", type: "Ort" }]
      });

      expect(screen.getByTestId("marktabfrage-layer").getAttribute("data-presentation")).toBe("context");
      expect(screen.getByTestId("place-layer").getAttribute("data-place-count")).toBe("1");
      expect(screen.queryByTestId("pipeline-layer")).toBeNull();
      expect(screen.queryByTestId("marktabfrage-legend")).toBeNull();
   });

   it("renders an empty layer instead of crashing when project data is missing", () => {
      renderMarktabfrageMap({ marktabfrageProjekte: null });

      const layer = screen.getByTestId("marktabfrage-layer");
      expect(layer.getAttribute("data-projekt-count")).toBe("0");
   });

   it("labels the content switch with Projekte", () => {
      renderMarktabfrageMap();

      expect(screen.getByRole("button", { name: "Projekte" })).toBeTruthy();
   });

   it("passes mode-specific map label and export filename to the viewport", () => {
      const { rerender } = renderMarktabfrageMap();

      const viewport = screen.getByLabelText("map");
      expect(viewport.getAttribute("data-label")).toBe(
         "Interaktive Karte der H₂-Projekte und PtG-Anlagen aus der Marktabfrage 2026"
      );
      expect(viewport.getAttribute("data-export-filename-title")).toBe("Karte der H₂-Projekte und PtG-Anlagen");

      // Im NEP-Modus greifen die Defaults des Viewports (Props bleiben undefined).
      rerender(marktabfrageMapJsx({ marktabfrageMode: false }));
      expect(screen.getByLabelText("map").getAttribute("data-label")).toBeNull();
      expect(screen.getByLabelText("map").getAttribute("data-export-filename-title")).toBeNull();
   });

   it("keeps the hidden legend state per dataset when switching modes", () => {
      const { rerender } = renderMarktabfrageMap();

      fireEvent.click(screen.getByRole("button", { name: "Marktabfrage-Legende ausblenden" }));
      expect(screen.queryByTestId("marktabfrage-legend")).toBeNull();

      // Die NEP-Legende (ungemockt) bleibt vom Ausblenden der Marktabfrage-Legende unberührt.
      rerender(marktabfrageMapJsx({ marktabfrageMode: false }));
      expect(screen.getByRole("complementary", { name: "Kartenlegende" })).toBeTruthy();

      rerender(marktabfrageMapJsx({}));
      expect(screen.queryByTestId("marktabfrage-legend")).toBeNull();

      // Ein Ansichts-Reset stellt die ausgeblendete Legende wieder her.
      rerender(marktabfrageMapJsx({ resetViewKey: 1 }));
      expect(screen.getByTestId("marktabfrage-legend")).toBeTruthy();
   });
});
