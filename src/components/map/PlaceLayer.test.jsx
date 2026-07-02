/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import PlaceLayer from "./PlaceLayer";

const map = {
   getSize: () => ({ x: 420, y: 260 }),
   getZoom: () => 6,
   latLngToContainerPoint: ([latitude, longitude]) => ({ x: longitude, y: latitude }),
   off: vi.fn(),
   on: vi.fn()
};

vi.mock("react-leaflet", () => ({
   CircleMarker({ center, children, interactive, pathOptions, radius }) {
      return (
         <div
            data-center={center.join(",")}
            data-fill={pathOptions.fillColor}
            data-interactive={String(interactive)}
            data-radius={radius}
            data-testid="circle-marker"
         >
            {children}
         </div>
      );
   },
   Marker({ children, icon, interactive, position }) {
      return (
         <div
            data-icon-class={icon?.options?.className ?? ""}
            data-icon-html={icon?.options?.html ?? ""}
            data-interactive={String(interactive)}
            data-position={position.join(",")}
            data-testid="marker"
         >
            {children}
         </div>
      );
   },
   Pane({ children, name }) {
      return <section data-testid={`pane-${name}`}>{children}</section>;
   },
   Tooltip({ children }) {
      return <div data-testid="place-tooltip">{children}</div>;
   },
   useMap: () => map
}));

const places = [
   {
      id: "Ort:Achim:0",
      latitude: 80,
      longitude: 80,
      name: "<Achim & Co>",
      type: "Ort"
   },
   {
      id: "Speicher:Epe:1",
      latitude: 100,
      longitude: 170,
      name: "Epe",
      type: "Speicher"
   }
];

describe("PlaceLayer", () => {
   beforeEach(() => {
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
         measureText: text => ({ width: String(text).length * 6 })
      });
   });

   afterEach(() => {
      cleanup();
      vi.restoreAllMocks();
   });

   it("renders accessible place names and escaped label HTML", () => {
      render(<PlaceLayer places={places} />);

      const accessiblePlaceList = screen.getByRole("region", { name: "Orte in der Karte" });
      expect(accessiblePlaceList.textContent).toContain("<Achim & Co>");
      expect(accessiblePlaceList.textContent).toContain("Epe, Speicher");

      const labelIcons = screen
         .getAllByTestId("marker")
         .filter(marker => marker.getAttribute("data-icon-class") === "place-label-icon");
      expect(labelIcons.length).toBeGreaterThan(0);
      expect(labelIcons.some(marker => marker.getAttribute("data-icon-html").includes("&lt;Achim &amp; Co&gt;"))).toBe(
         true
      );

      expect(
         screen
            .getAllByTestId("marker")
            .some(marker => marker.getAttribute("data-icon-class") === "place-storage-marker-icon")
      ).toBe(true);
   });
});
