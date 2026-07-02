/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { loadPlaces } from "@/lib/data/loadPlaces";
import PipelineWorkspace from "./PipelineWorkspace";

vi.mock("@/lib/data/loadPlaces", () => ({
   loadPlaces: vi.fn()
}));

vi.mock("@/lib/data/geoCollections", () => ({
   buildCountryCollections: () => ({
      europeContext: { type: "FeatureCollection", features: [] },
      germany: { type: "FeatureCollection", features: [] }
   })
}));

vi.mock("@/components/layout/Topbar", () => ({
   default() {
      return <header />;
   }
}));

vi.mock("@/components/panels/FilterPanel", () => ({
   default() {
      return <aside data-testid="filter-panel" />;
   }
}));

vi.mock("@/components/panels/InspectorPanel", () => ({
   default() {
      return <aside data-testid="inspector-panel" />;
   }
}));

vi.mock("@/components/map/NetworkMap", () => ({
   default({ mapContent, onMapContentChange, places, placesDisabled, placesUnavailableReason }) {
      return (
         <section
            data-map-content={mapContent}
            data-place-count={places.length}
            data-places-disabled={String(placesDisabled)}
            data-places-unavailable-reason={placesUnavailableReason ?? ""}
            data-testid="network-map"
         >
            <button onClick={() => onMapContentChange("places")} type="button">
               Orte
            </button>
         </section>
      );
   }
}));

const collection = {
   type: "FeatureCollection",
   features: []
};

const places = [
   {
      id: "Ort:Achim:0",
      latitude: 52.9908,
      longitude: 9.04,
      name: "Achim",
      type: "Ort"
   }
];

describe("PipelineWorkspace", () => {
   afterEach(() => {
      cleanup();
      vi.clearAllMocks();
   });

   it("keeps the places layer disabled until place data is loaded", async () => {
      let resolvePlaces;
      loadPlaces.mockReturnValue(new Promise(resolve => (resolvePlaces = resolve)));

      render(<PipelineWorkspace countries={collection} pipelineCollection={collection} />);

      expect(screen.getByTestId("network-map").getAttribute("data-places-disabled")).toBe("true");
      expect(screen.getByTestId("network-map").getAttribute("data-places-unavailable-reason")).toBe(
         "Orte werden geladen."
      );

      fireEvent.click(screen.getByRole("button", { name: "Orte" }));
      expect(screen.getByTestId("network-map").getAttribute("data-map-content")).toBe("pipelines");

      resolvePlaces(places);

      await waitFor(() => {
         expect(screen.getByTestId("network-map").getAttribute("data-places-disabled")).toBe("false");
      });
      expect(screen.getByTestId("network-map").getAttribute("data-place-count")).toBe("1");

      fireEvent.click(screen.getByRole("button", { name: "Orte" }));
      expect(screen.getByTestId("network-map").getAttribute("data-map-content")).toBe("places");
   });
});
