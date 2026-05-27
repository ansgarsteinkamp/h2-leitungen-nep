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
   default() {
      return <div data-testid="pipeline-layer" />;
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
});
