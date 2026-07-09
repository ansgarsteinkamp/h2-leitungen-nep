/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import MarktabfrageLegend from "./MarktabfrageLegend";

function renderLegend(props) {
   return render(
      <TooltipProvider>
         <MarktabfrageLegend {...props} />
      </TooltipProvider>
   );
}

afterEach(() => {
   cleanup();
});

describe("MarktabfrageLegend", () => {
   it("lists the three project categories", () => {
      renderLegend();

      const legend = screen.getByRole("complementary", { name: "Kartenlegende" });
      const entries = within(legend).getAllByRole("listitem");

      expect(entries.map(entry => entry.textContent)).toEqual(["Ausspeisung", "Einspeisung", "Speicher"]);
   });

   it("adds the pipeline context entry only when the pipeline context is active", () => {
      const { rerender } = renderLegend();

      expect(screen.queryByText("H₂-Leitungen des NEP 2025")).toBeNull();

      rerender(
         <TooltipProvider>
            <MarktabfrageLegend showPipelineContext />
         </TooltipProvider>
      );

      const legend = screen.getByRole("complementary", { name: "Kartenlegende" });
      const entries = within(legend).getAllByRole("listitem");

      expect(entries).toHaveLength(4);
      expect(entries.at(-1).textContent).toBe("H₂-Leitungen des NEP 2025");
   });

   it("calls onHide via the hide button", () => {
      const onHide = vi.fn();

      renderLegend({ onHide });
      fireEvent.click(screen.getByRole("button", { name: "Legende ausblenden" }));

      expect(onHide).toHaveBeenCalledOnce();
   });

   it("renders no hide button without onHide", () => {
      renderLegend();

      expect(screen.queryByRole("button", { name: "Legende ausblenden" })).toBeNull();
   });
});
