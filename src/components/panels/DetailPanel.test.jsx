/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import DetailPanel from "./DetailPanel";

afterEach(() => {
   cleanup();
});

function makeSelection(overrides = {}) {
   return {
      item: {
         type: "Feature",
         geometry: {
            type: "LineString",
            coordinates: [
               [7, 51],
               [8, 52]
            ]
         },
         properties: {
            id: "M-1",
            name: "Leitung Nord",
            featureTyp: "leitung",
            massnahmenart: "Leitung",
            ...overrides
         }
      }
   };
}

function renderPanel(props) {
   return render(
      <TooltipProvider>
         <DetailPanel onClose={() => {}} {...props} />
      </TooltipProvider>
   );
}

describe("DetailPanel", () => {
   it("focuses the panel on a new selection but not on re-renders with the same selection", () => {
      const focusedSelectionRef = { current: null };
      const { rerender } = renderPanel({ focusedSelectionRef, selection: makeSelection() });

      const panel = screen.getByRole("region", { name: "Leitung Nord" });
      expect(document.activeElement).toBe(panel);

      // Fokus wandert weg (z. B. auf den Schließen-Button); ein Re-Render mit derselben
      // Auswahl darf ihn nicht zurück in das Panel reißen.
      const schliessenButton = screen.getByRole("button", { name: "Auswahl schließen" });
      schliessenButton.focus();
      rerender(
         <TooltipProvider>
            <DetailPanel focusedSelectionRef={focusedSelectionRef} onClose={() => {}} selection={makeSelection()} />
         </TooltipProvider>
      );
      expect(document.activeElement).toBe(schliessenButton);

      // Eine neue Auswahl (andere ID) fokussiert das Panel wieder.
      rerender(
         <TooltipProvider>
            <DetailPanel
               focusedSelectionRef={focusedSelectionRef}
               onClose={() => {}}
               selection={makeSelection({ id: "M-2", name: "Leitung Süd" })}
            />
         </TooltipProvider>
      );
      expect(document.activeElement).toBe(screen.getByRole("region", { name: "Leitung Süd" }));
   });
});
