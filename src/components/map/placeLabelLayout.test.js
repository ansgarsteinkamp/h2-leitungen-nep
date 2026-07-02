import { describe, expect, it } from "vitest";

import { layoutPlaceLabels } from "./placeLabelLayout";

const mapSize = { width: 260, height: 160 };
const project = place => place.point;
const place = (name, point, type = "Ort") => ({
   id: `${type}:${name}`,
   latitude: 0,
   longitude: 0,
   name,
   point,
   type
});

describe("layoutPlaceLabels", () => {
   it("places labels around points without overlapping already occupied labels", () => {
      const labels = layoutPlaceLabels(
         [place("Ahaus", { x: 120, y: 80 }), place("Ahlen", { x: 122, y: 81 }), place("Ahlten", { x: 180, y: 110 })],
         { mapSize, project, zoom: 6 }
      );

      expect(labels).toHaveLength(3);
      expect(new Set(labels.map(label => label.placement)).size).toBeGreaterThan(1);
   });

   it("prefers labels that stay inside the visible map area", () => {
      const [label] = layoutPlaceLabels([place("Aachen", { x: 250, y: 80 })], { mapSize, project, zoom: 6 });

      expect(label.placement).toContain("left");
   });

   it("keeps only the marker when no label candidate has enough room", () => {
      const labels = layoutPlaceLabels([place("Sehrlangerortsname", { x: 12, y: 12 })], {
         mapSize: { width: 45, height: 45 },
         project,
         zoom: 6
      });

      expect(labels).toEqual([]);
   });

   it("gives storage locations priority in dense areas", () => {
      const labels = layoutPlaceLabels(
         [place("Normalort", { x: 40, y: 30 }), place("Speicher", { x: 40, y: 30 }, "Speicher")],
         { mapSize: { width: 130, height: 60 }, project, zoom: 6 }
      );

      expect(labels).toHaveLength(1);
      expect(labels[0].place.type).toBe("Speicher");
   });
});
