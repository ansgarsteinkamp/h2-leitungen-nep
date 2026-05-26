/**
 * @vitest-environment jsdom
 */
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import MapLegend from "./MapLegend";

describe("MapLegend", () => {
   it("lists all OGE participation and line type combinations", () => {
      render(<MapLegend />);

      const legend = screen.getByRole("complementary", { name: "Kartenlegende" });
      const entries = within(legend).getAllByRole("listitem");

      expect(entries).toHaveLength(4);
      expect(entries.map(entry => entry.textContent)).toEqual([
         "OGE-Bezug Umstellung",
         "OGE-Bezug Neubau",
         "Kein OGE-Bezug Umstellung",
         "Kein OGE-Bezug Neubau"
      ]);
      expect(within(legend).getByRole("list")).toBeTruthy();
   });
});
