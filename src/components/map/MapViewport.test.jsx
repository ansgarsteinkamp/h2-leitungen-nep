/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import MapViewport from "./MapViewport";

const downloadTargetRefs = [];
const downloadFilenameTitles = [];

vi.mock("@/components/map/MapDownloadButton", () => ({
   default({ filenameTitle, targetRef }) {
      downloadTargetRefs.push(targetRef);
      downloadFilenameTitles.push(filenameTitle);
      return <button aria-label="Karte als PNG herunterladen" type="button" />;
   }
}));

vi.mock("react-leaflet", () => ({
   MapContainer({ children }) {
      return <div data-testid="map-container">{children}</div>;
   },
   useMap: () => ({
      getContainer: () => document.createElement("div"),
      invalidateSize: vi.fn()
   })
}));

describe("MapViewport", () => {
   afterEach(() => {
      cleanup();
      downloadTargetRefs.length = 0;
      downloadFilenameTitles.length = 0;
   });

   it("passes the viewport section as the PNG export target", () => {
      render(<MapViewport />);

      const viewport = screen.getByRole("region", { name: "Interaktive Karte der H₂-Maßnahmen aus dem NEP 2025" });

      expect(downloadTargetRefs).toHaveLength(1);
      expect(downloadTargetRefs[0].current).toBe(viewport);
   });

   it("applies a mode-specific label and hands the export filename title to the download button", () => {
      render(<MapViewport exportFilenameTitle="Karte der H₂-Projekte und PtG-Anlagen" label="Marktabfrage-Karte" />);

      expect(screen.getByRole("region", { name: "Marktabfrage-Karte" })).toBeTruthy();
      expect(downloadFilenameTitles).toEqual(["Karte der H₂-Projekte und PtG-Anlagen"]);
   });
});
