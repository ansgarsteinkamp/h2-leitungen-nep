/**
 * @vitest-environment jsdom
 */
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { INITIAL_BOUNDS } from "@/lib/domain/constants";
import MapCameraEffects from "./MapCameraEffects";

const mockMap = vi.hoisted(() => ({
   fitBounds: vi.fn(),
   getBoundsZoom: vi.fn(() => 7),
   getZoom: vi.fn(() => 6),
   panTo: vi.fn()
}));

vi.mock("react-leaflet", () => ({
   useMap: () => mockMap
}));

afterEach(() => {
   cleanup();
   mockMap.fitBounds.mockClear();
   mockMap.getBoundsZoom.mockClear();
   mockMap.getZoom.mockClear();
   mockMap.panTo.mockClear();
   mockMap.getBoundsZoom.mockReturnValue(7);
   mockMap.getZoom.mockReturnValue(6);
});

describe("MapCameraEffects", () => {
   it("zooms to a selected pipeline when the current zoom is below the selection fit zoom", () => {
      const selection = {
         item: {
            type: "Feature",
            geometry: {
               type: "LineString",
               coordinates: [
                  [7.1, 51.1],
                  [7.2, 51.2]
               ]
            },
            properties: { id: "H2-001-01" }
         }
      };

      render(<MapCameraEffects resetViewKey={0} searchActive={false} searchBounds={[]} selection={selection} />);

      const selectionBounds = [
         [51.1, 7.1],
         [51.2, 7.2]
      ];

      expect(mockMap.getBoundsZoom).toHaveBeenCalledWith(selectionBounds, false, [80, 80]);
      expect(mockMap.fitBounds).toHaveBeenCalledWith(selectionBounds, {
         animate: true,
         maxZoom: 7,
         padding: [80, 80]
      });
      expect(mockMap.panTo).not.toHaveBeenCalled();
   });

   it("keeps a deeper user zoom when selecting a pipeline", () => {
      mockMap.getZoom.mockReturnValue(10);
      mockMap.getBoundsZoom.mockReturnValue(7);
      const selection = {
         item: {
            type: "Feature",
            geometry: {
               type: "LineString",
               coordinates: [
                  [7.1, 51.1],
                  [7.2, 51.2]
               ]
            },
            properties: { id: "H2-001-01" }
         }
      };

      render(<MapCameraEffects resetViewKey={0} searchActive={false} searchBounds={[]} selection={selection} />);

      expect(mockMap.panTo).toHaveBeenCalledWith(
         expect.objectContaining({
            lat: expect.closeTo(51.15),
            lng: expect.closeTo(7.15)
         }),
         {
            animate: true,
            duration: 0.35
         }
      );
      expect(mockMap.panTo).toHaveBeenCalledTimes(1);
      expect(mockMap.fitBounds).toHaveBeenCalledTimes(1);
      expect(mockMap.fitBounds).toHaveBeenCalledWith(INITIAL_BOUNDS, { padding: [48, 48] });
   });

   it("resumes active search bounds when a selection is closed explicitly", () => {
      const searchBounds = [
         [51, 7],
         [52, 8]
      ];
      const selection = {
         item: {
            type: "Feature",
            geometry: {
               type: "LineString",
               coordinates: [
                  [7.1, 51.1],
                  [7.2, 51.2]
               ]
            },
            properties: { id: "H2-001-01" }
         }
      };
      const { rerender } = render(
         <MapCameraEffects
            resetViewKey={0}
            searchActive
            searchBounds={searchBounds}
            selection={selection}
            selectionCloseKey={0}
         />
      );

      mockMap.fitBounds.mockClear();

      rerender(
         <MapCameraEffects
            resetViewKey={0}
            searchActive
            searchBounds={searchBounds}
            selection={null}
            selectionCloseKey={1}
         />
      );

      expect(mockMap.fitBounds).toHaveBeenCalledTimes(1);
      expect(mockMap.fitBounds).toHaveBeenCalledWith(searchBounds, {
         animate: true,
         maxZoom: 8,
         padding: [48, 48]
      });
   });

   it("returns to the initial view when a selection is closed explicitly without search bounds", () => {
      const selection = {
         item: {
            type: "Feature",
            geometry: {
               type: "LineString",
               coordinates: [
                  [7.1, 51.1],
                  [7.2, 51.2]
               ]
            },
            properties: { id: "H2-001-01" }
         }
      };
      const { rerender } = render(
         <MapCameraEffects
            resetViewKey={0}
            searchActive={false}
            searchBounds={[]}
            selection={selection}
            selectionCloseKey={0}
         />
      );

      mockMap.fitBounds.mockClear();

      rerender(
         <MapCameraEffects
            resetViewKey={0}
            searchActive={false}
            searchBounds={[]}
            selection={null}
            selectionCloseKey={1}
         />
      );

      expect(mockMap.fitBounds).toHaveBeenCalledTimes(1);
      expect(mockMap.fitBounds).toHaveBeenCalledWith(INITIAL_BOUNDS, { animate: true, padding: [48, 48] });
   });

   it("keeps the viewport when a filter change clears the selection implicitly", () => {
      const selection = {
         item: {
            type: "Feature",
            geometry: {
               type: "LineString",
               coordinates: [
                  [7.1, 51.1],
                  [7.2, 51.2]
               ]
            },
            properties: { id: "H2-001-01" }
         }
      };
      const { rerender } = render(
         <MapCameraEffects
            resetViewKey={0}
            searchActive={false}
            searchBounds={[]}
            selection={selection}
            selectionCloseKey={0}
         />
      );

      mockMap.fitBounds.mockClear();
      mockMap.panTo.mockClear();

      // Gleicher selectionCloseKey: Die Auswahl verschwindet als Nebenwirkung eines
      // Filterwechsels — der Kartenausschnitt des Nutzers bleibt unangetastet.
      rerender(
         <MapCameraEffects
            resetViewKey={0}
            searchActive={false}
            searchBounds={[]}
            selection={null}
            selectionCloseKey={0}
         />
      );

      expect(mockMap.fitBounds).not.toHaveBeenCalled();
      expect(mockMap.panTo).not.toHaveBeenCalled();
   });

   it("keeps the viewport when a search that never moved the camera is cleared", () => {
      // Suche aktiv, aber ohne Auto-Fit (z. B. mehr als 30 Treffer): searchBounds bleiben leer.
      const { rerender } = render(
         <MapCameraEffects resetViewKey={0} searchActive searchBounds={[]} selection={null} selectionCloseKey={0} />
      );

      mockMap.fitBounds.mockClear();

      rerender(
         <MapCameraEffects
            resetViewKey={0}
            searchActive={false}
            searchBounds={[]}
            selection={null}
            selectionCloseKey={0}
         />
      );

      expect(mockMap.fitBounds).not.toHaveBeenCalled();
   });

   it("returns to the initial view when active search bounds become empty", () => {
      const searchBounds = [
         [51, 7],
         [52, 8]
      ];
      const { rerender } = render(
         <MapCameraEffects resetViewKey={0} searchActive searchBounds={searchBounds} selection={null} />
      );

      mockMap.fitBounds.mockClear();

      rerender(<MapCameraEffects resetViewKey={0} searchActive searchBounds={[]} selection={null} />);

      expect(mockMap.fitBounds).toHaveBeenCalledTimes(1);
      expect(mockMap.fitBounds).toHaveBeenCalledWith(INITIAL_BOUNDS, { animate: true, padding: [48, 48] });
   });

   it("keeps the viewport when a dataset switch swaps in another selection", () => {
      const nepSelection = {
         item: {
            type: "Feature",
            geometry: {
               type: "LineString",
               coordinates: [
                  [7.1, 51.1],
                  [7.2, 51.2]
               ]
            },
            properties: { id: "H2-001-01" }
         }
      };
      const marktabfrageSelection = {
         item: {
            type: "Feature",
            geometry: { type: "Point", coordinates: [9.5, 52.5] },
            properties: { id: "MA-1" }
         }
      };
      const { rerender } = render(
         <MapCameraEffects
            datensatzKey="nep"
            resetViewKey={0}
            searchActive={false}
            searchBounds={[]}
            selection={nepSelection}
            selectionCloseKey={0}
         />
      );

      mockMap.fitBounds.mockClear();
      mockMap.panTo.mockClear();

      // Der Datensatz-Wechsel tauscht die Auswahl des anderen Modus ein — keine neue
      // Nutzer-Auswahl, der Kartenausschnitt bleibt stehen.
      rerender(
         <MapCameraEffects
            datensatzKey="marktabfrage"
            resetViewKey={0}
            searchActive={false}
            searchBounds={[]}
            selection={marktabfrageSelection}
            selectionCloseKey={0}
         />
      );

      expect(mockMap.fitBounds).not.toHaveBeenCalled();
      expect(mockMap.panTo).not.toHaveBeenCalled();
   });

   it("keeps the viewport when a dataset switch swaps in other search bounds", () => {
      const nepSearchBounds = [
         [51, 7],
         [52, 8]
      ];
      const marktabfrageSearchBounds = [
         [50, 6],
         [53, 9]
      ];
      const { rerender } = render(
         <MapCameraEffects
            datensatzKey="nep"
            resetViewKey={0}
            searchActive
            searchBounds={nepSearchBounds}
            selection={null}
            selectionCloseKey={0}
         />
      );

      mockMap.fitBounds.mockClear();

      rerender(
         <MapCameraEffects
            datensatzKey="marktabfrage"
            resetViewKey={0}
            searchActive
            searchBounds={marktabfrageSearchBounds}
            selection={null}
            selectionCloseKey={0}
         />
      );

      expect(mockMap.fitBounds).not.toHaveBeenCalled();
   });

   it("keeps the viewport when a dataset switch ends the previous search", () => {
      const searchBounds = [
         [51, 7],
         [52, 8]
      ];
      const { rerender } = render(
         <MapCameraEffects
            datensatzKey="nep"
            resetViewKey={0}
            searchActive
            searchBounds={searchBounds}
            selection={null}
            selectionCloseKey={0}
         />
      );

      mockMap.fitBounds.mockClear();

      // Ohne den Guard würde das Suchende beim Wechsel zur Übersicht zurückspringen.
      rerender(
         <MapCameraEffects
            datensatzKey="marktabfrage"
            resetViewKey={0}
            searchActive={false}
            searchBounds={[]}
            selection={null}
            selectionCloseKey={0}
         />
      );

      expect(mockMap.fitBounds).not.toHaveBeenCalled();
   });

   it("does not return to the overview when a bounds-less search starts after a dataset switch", () => {
      const nepSearchBounds = [
         [51, 7],
         [52, 8]
      ];
      // NEP-Suche bewegt die Kamera: Ownership entsteht.
      const { rerender } = render(
         <MapCameraEffects
            datensatzKey="nep"
            resetViewKey={0}
            searchActive
            searchBounds={nepSearchBounds}
            selection={null}
            selectionCloseKey={0}
         />
      );

      rerender(
         <MapCameraEffects
            datensatzKey="marktabfrage"
            resetViewKey={0}
            searchActive={false}
            searchBounds={[]}
            selection={null}
            selectionCloseKey={0}
         />
      );

      mockMap.fitBounds.mockClear();

      // Suche im neuen Modus mit zu vielen Treffern für Auto-Fit: neue, aber leere Bounds-Referenz.
      // Die Ownership des alten Modus ist mit dem Wechsel verfallen — kein Rücksprung zur Übersicht.
      rerender(
         <MapCameraEffects
            datensatzKey="marktabfrage"
            resetViewKey={0}
            searchActive
            searchBounds={[]}
            selection={null}
            selectionCloseKey={0}
         />
      );

      expect(mockMap.fitBounds).not.toHaveBeenCalled();
   });

   it("focuses a new selection made after a dataset switch", () => {
      const { rerender } = render(
         <MapCameraEffects
            datensatzKey="nep"
            resetViewKey={0}
            searchActive={false}
            searchBounds={[]}
            selection={null}
            selectionCloseKey={0}
         />
      );

      rerender(
         <MapCameraEffects
            datensatzKey="marktabfrage"
            resetViewKey={0}
            searchActive={false}
            searchBounds={[]}
            selection={null}
            selectionCloseKey={0}
         />
      );

      mockMap.fitBounds.mockClear();

      const selection = {
         item: {
            type: "Feature",
            geometry: { type: "Point", coordinates: [9.5, 52.5] },
            properties: { id: "MA-1" }
         }
      };
      rerender(
         <MapCameraEffects
            datensatzKey="marktabfrage"
            resetViewKey={0}
            searchActive={false}
            searchBounds={[]}
            selection={selection}
            selectionCloseKey={0}
         />
      );

      expect(mockMap.fitBounds).toHaveBeenCalledWith([[52.5, 9.5]], {
         animate: true,
         maxZoom: 7,
         padding: [80, 80]
      });
   });

   it("lets an explicit reset take precedence over active search bounds", () => {
      const searchBounds = [
         [51, 7],
         [52, 8]
      ];
      const { rerender } = render(
         <MapCameraEffects resetViewKey={0} searchActive searchBounds={searchBounds} selection={null} />
      );

      mockMap.fitBounds.mockClear();

      rerender(<MapCameraEffects resetViewKey={1} searchActive searchBounds={searchBounds} selection={null} />);

      expect(mockMap.fitBounds).toHaveBeenCalledTimes(1);
      expect(mockMap.fitBounds).toHaveBeenCalledWith(INITIAL_BOUNDS, { padding: [48, 48] });
   });
});
