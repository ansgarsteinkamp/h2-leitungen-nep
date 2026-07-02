/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import NetworkMap from "./NetworkMap";

vi.mock("@/components/map/MapViewport", () => ({
   default({ children }) {
      return <section aria-label="map">{children}</section>;
   }
}));

vi.mock("@/components/map/MapCameraEffects", () => ({
   default({ resetViewKey }) {
      return <div data-reset-view-key={resetViewKey} data-testid="camera-effects" />;
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
   default({ highlightOgeExecutingOperator, presentation = "interactive" }) {
      return (
         <div
            data-highlight-oge-executing-operator={String(highlightOgeExecutingOperator)}
            data-presentation={presentation}
            data-testid="pipeline-layer"
         />
      );
   }
}));

vi.mock("@/components/map/PlaceLayer", () => ({
   default({ places }) {
      return <div data-place-count={places.length} data-testid="place-layer" />;
   }
}));

const collection = { type: "FeatureCollection", features: [] };

function renderNetworkMap(props = {}) {
   return render(
      <TooltipProvider>
         <NetworkMap
            europeContext={collection}
            filteredPipelines={collection}
            germany={collection}
            onSelectPipeline={vi.fn()}
            resetViewKey={0}
            searchActive={false}
            searchBounds={[]}
            selection={null}
            {...props}
         />
      </TooltipProvider>
   );
}

describe("NetworkMap", () => {
   afterEach(() => {
      cleanup();
      vi.clearAllMocks();
   });

   it("restores the legend when the map reset key changes", () => {
      const { rerender } = renderNetworkMap();

      fireEvent.click(screen.getByRole("button", { name: "Legende ausblenden" }));
      expect(screen.queryByRole("complementary", { name: "Kartenlegende" })).toBeNull();

      rerender(
         <TooltipProvider>
            <NetworkMap
               europeContext={collection}
               filteredPipelines={collection}
               germany={collection}
               onSelectPipeline={vi.fn()}
               resetViewKey={1}
               searchActive={false}
               searchBounds={[]}
               selection={null}
            />
         </TooltipProvider>
      );

      expect(screen.getByRole("complementary", { name: "Kartenlegende" })).toBeTruthy();
   });

   it("passes OGE executing operator highlighting to the pipeline layer", () => {
      const { rerender } = renderNetworkMap();

      expect(screen.getByTestId("pipeline-layer").getAttribute("data-highlight-oge-executing-operator")).toBe("false");

      rerender(
         <TooltipProvider>
            <NetworkMap
               europeContext={collection}
               filteredPipelines={collection}
               germany={collection}
               highlightOgeExecutingOperator
               onSelectPipeline={vi.fn()}
               resetViewKey={0}
               searchActive={false}
               searchBounds={[]}
               selection={null}
            />
         </TooltipProvider>
      );

      expect(screen.getByTestId("pipeline-layer").getAttribute("data-highlight-oge-executing-operator")).toBe("true");
   });

   it("shows the OGE executing operator highlight in the legend only while active", () => {
      const { rerender } = renderNetworkMap();

      expect(screen.queryByText("OGE als durchführender FNB")).toBeNull();

      rerender(
         <TooltipProvider>
            <NetworkMap
               europeContext={collection}
               filteredPipelines={collection}
               germany={collection}
               highlightOgeExecutingOperator
               onSelectPipeline={vi.fn()}
               resetViewKey={0}
               searchActive={false}
               searchBounds={[]}
               selection={null}
            />
         </TooltipProvider>
      );

      expect(screen.getByText("OGE als durchführender FNB")).toBeTruthy();
   });

   it("shows places with muted pipeline context as alternate map content", () => {
      renderNetworkMap({
         mapContent: "places",
         places: [
            {
               id: "Ort:Achim:0",
               latitude: 52.9908,
               longitude: 9.04,
               name: "Achim",
               type: "Ort"
            }
         ]
      });

      expect(screen.getByTestId("place-layer").getAttribute("data-place-count")).toBe("1");
      expect(screen.getByTestId("pipeline-layer").getAttribute("data-presentation")).toBe("context");
      expect(screen.queryByRole("complementary", { name: "Kartenlegende" })).toBeNull();
   });

   it("emits map content changes from the map content switch", () => {
      const onMapContentChange = vi.fn();

      renderNetworkMap({ onMapContentChange });
      fireEvent.click(screen.getByRole("button", { name: "Orte" }));

      expect(onMapContentChange).toHaveBeenCalledWith("places");
   });

   it("disables the places switch option when place data is unavailable", () => {
      const onMapContentChange = vi.fn();

      renderNetworkMap({
         onMapContentChange,
         placesDisabled: true,
         placesUnavailableReason: "Orte werden geladen."
      });
      const placesButton = screen.getByRole("button", { name: "Orte" });

      expect(placesButton.hasAttribute("disabled")).toBe(true);
      expect(placesButton.getAttribute("aria-describedby")).toBeTruthy();
      expect(screen.getByText("Orte werden geladen.")).toBeTruthy();
      fireEvent.click(placesButton);
      expect(onMapContentChange).not.toHaveBeenCalled();
   });
});
