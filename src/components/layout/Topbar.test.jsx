/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DATENSATZ_MARKTABFRAGE } from "@/lib/domain/constants";
import Topbar from "./Topbar";

function renderTopbar(props = {}) {
   const onDatensatzChange = vi.fn();
   render(
      <ThemeProvider>
         <TooltipProvider>
            <Topbar onDatensatzChange={onDatensatzChange} {...props} />
         </TooltipProvider>
      </ThemeProvider>
   );
   return { onDatensatzChange };
}

afterEach(() => {
   cleanup();
   window.localStorage.clear();
   document.documentElement.className = "";
   document.documentElement.style.colorScheme = "";
});

describe("Topbar", () => {
   it("shows the NEP title by default", () => {
      renderTopbar();

      expect(screen.getByText("Zweiter Entwurf des NEP Gas und Wasserstoff 2025")).toBeTruthy();
      expect(screen.getByRole("heading", { name: "Interaktive Karte der H₂-Maßnahmen" })).toBeTruthy();
   });

   it("shows the Marktabfrage kicker and heading", () => {
      renderTopbar({ datensatz: DATENSATZ_MARKTABFRAGE });

      expect(screen.getByText("Marktabfrage Wasserstoff und Strom 2026 Qualitätssicherung")).toBeTruthy();
      expect(screen.getByRole("heading", { name: "Interaktive Karte der H₂-Projekte und PtG-Anlagen" })).toBeTruthy();
   });

   it("hides the dataset switch without showDatensatzSwitch", () => {
      renderTopbar();

      expect(screen.queryByRole("group", { name: "Datensatz" })).toBeNull();
   });

   it("reports a switch via onDatensatzChange", () => {
      const { onDatensatzChange } = renderTopbar({ showDatensatzSwitch: true });

      expect(screen.getByRole("group", { name: "Datensatz" })).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Marktabfrage 2026" }));

      expect(onDatensatzChange).toHaveBeenCalledWith(DATENSATZ_MARKTABFRAGE);
   });

   it("reflects the active dataset via aria-pressed", () => {
      renderTopbar({ showDatensatzSwitch: true });

      expect(screen.getByRole("button", { name: "NEP 2025" }).getAttribute("aria-pressed")).toBe("true");
      expect(screen.getByRole("button", { name: "Marktabfrage 2026" }).getAttribute("aria-pressed")).toBe("false");
   });
});
