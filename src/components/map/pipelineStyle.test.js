import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { COUNTRY_STYLES } from "./mapTheme";
import { getPipelineStyle, getSelectionHaloStyle } from "./pipelineStyle";
import {
   getLineTypeColor,
   getSelectionHaloColor,
   LINE_TYPE_COLORS,
   PIPELINE_FALLBACK_COLOR,
   SELECTION_HALO_COLORS,
   SELECTION_HALO_FALLBACK_COLOR
} from "@/components/theme/pipelineTheme";

const css = readFileSync(resolve("src/index.css"), "utf8");

function themeDeclarations(selector) {
   const match = css.match(new RegExp(`${selector}\\s*\\{([\\s\\S]*?)\\}`));
   if (!match) throw new Error(`Missing ${selector} theme block`);

   return new Map(
      [...match[1].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map(([, property, value]) => [property, value.trim()])
   );
}

function mapVariableNames() {
   return [
      COUNTRY_STYLES,
      LINE_TYPE_COLORS,
      SELECTION_HALO_COLORS,
      PIPELINE_FALLBACK_COLOR,
      SELECTION_HALO_FALLBACK_COLOR
   ]
      .flatMap(value => [...JSON.stringify(value).matchAll(/--map-[a-z-]+/g)].map(match => match[0]))
      .filter((value, index, values) => values.indexOf(value) === index);
}

function pipeline(leitungstyp = "Neubau", properties = {}) {
   return {
      type: "Feature",
      geometry: {
         type: "LineString",
         coordinates: [
            [7, 51],
            [8, 52]
         ]
      },
      properties: {
         id: "H2-1",
         leitungstyp,
         startnetz: true,
         ...properties
      }
   };
}

describe("map theme tokens", () => {
   it("keeps line type colors themeable with CSS fallbacks", () => {
      expect(LINE_TYPE_COLORS.Neubau).toBe("var(--map-pipeline-neubau, #d97757)");
      expect(LINE_TYPE_COLORS.Umstellung).toBe("var(--map-pipeline-umstellung, #86b7a7)");
      expect(SELECTION_HALO_COLORS.Neubau).toBe("var(--map-pipeline-selection-halo-neubau, #d97757)");
      expect(SELECTION_HALO_COLORS.Umstellung).toBe("var(--map-pipeline-selection-halo-umstellung, #86b7a7)");
      expect(PIPELINE_FALLBACK_COLOR).toBe("var(--map-pipeline-fallback, #e5e5e2)");
      expect(SELECTION_HALO_FALLBACK_COLOR).toBe("var(--map-pipeline-selection-halo-fallback, #faf9f5)");
   });

   it("keeps country styles themeable with CSS fallbacks", () => {
      expect(COUNTRY_STYLES.context.className).toBe("country-boundary country-boundary-context");
      expect(COUNTRY_STYLES.context.color).toBe("var(--map-country-context-stroke, #74746a)");
      expect(COUNTRY_STYLES.context.fillColor).toBe("var(--map-country-context-fill, #30302e)");
      expect(COUNTRY_STYLES.germany.className).toBe("country-boundary country-boundary-germany");
      expect(COUNTRY_STYLES.germany.color).toBe("var(--map-country-germany-stroke, #faf9f5)");
      expect(COUNTRY_STYLES.germany.fillColor).toBe("var(--map-country-germany-fill, #22221f)");
   });

   it("defines every map CSS variable in both light and dark themes", () => {
      const rootTheme = themeDeclarations(":root");
      const darkTheme = themeDeclarations("\\.dark");

      mapVariableNames().forEach(variableName => {
         expect(rootTheme.has(variableName)).toBe(true);
         expect(darkTheme.has(variableName)).toBe(true);
      });
   });

   it("uses fallback colors that preserve the dark theme palette", () => {
      const darkTheme = themeDeclarations("\\.dark");

      expect(darkTheme.get("--map-pipeline-neubau")).toBe("#d97757");
      expect(darkTheme.get("--map-pipeline-umstellung")).toBe("#86b7a7");
      expect(darkTheme.get("--map-pipeline-selection-halo-neubau")).toBe("#d97757");
      expect(darkTheme.get("--map-pipeline-selection-halo-umstellung")).toBe("#86b7a7");
      expect(darkTheme.get("--map-pipeline-fallback")).toBe("#e5e5e2");
      expect(darkTheme.get("--map-pipeline-selection-halo-fallback")).toBe("#faf9f5");
   });

   it("uses a higher-contrast conversion halo only in the light theme", () => {
      const rootTheme = themeDeclarations(":root");
      const darkTheme = themeDeclarations("\\.dark");

      expect(rootTheme.get("--map-pipeline-umstellung")).toBe("#f09bc1");
      expect(rootTheme.get("--map-pipeline-selection-halo-umstellung")).toBe("#bc4f84");
      expect(darkTheme.get("--map-pipeline-umstellung")).toBe(
         darkTheme.get("--map-pipeline-selection-halo-umstellung")
      );
   });

   it("uses fallback colors for unknown line type swatches and halos", () => {
      expect(getLineTypeColor("Unbekannt")).toBe(PIPELINE_FALLBACK_COLOR);
      expect(getSelectionHaloColor("Unbekannt")).toBe(SELECTION_HALO_FALLBACK_COLOR);
   });
});

describe("getPipelineStyle", () => {
   it("uses line type theme tokens", () => {
      expect(getPipelineStyle(pipeline("Neubau"), null).color).toBe(LINE_TYPE_COLORS.Neubau);
      expect(getPipelineStyle(pipeline("Umstellung"), null).color).toBe(LINE_TYPE_COLORS.Umstellung);
   });

   it("falls back to the pipeline fallback token for unknown line types", () => {
      expect(getPipelineStyle(pipeline("Unbekannt"), null).color).toBe(PIPELINE_FALLBACK_COLOR);
   });

   it("uses a dedicated fallback token for unknown selection halos", () => {
      expect(getSelectionHaloStyle(pipeline("Unbekannt")).color).toBe(SELECTION_HALO_FALLBACK_COLOR);
   });

   it("uses a type-specific selection halo color with the shared pulse class", () => {
      expect(getSelectionHaloStyle(pipeline("Umstellung")).color).toBe(SELECTION_HALO_COLORS.Umstellung);
      expect(getSelectionHaloStyle(pipeline("Umstellung")).className).toBe("pipeline-selection-halo");
      expect(getSelectionHaloStyle(pipeline("Neubau")).className).toBe("pipeline-selection-halo");
   });

   it("marks only inactive nonstandard pipelines for the light theme opacity override", () => {
      expect(getPipelineStyle(pipeline("Neubau", { startnetz: false }), null).className).toBe("pipeline-nonstandard");
      expect(getPipelineStyle(pipeline("Neubau", { startnetz: false }), "H2-1").className).toBeNull();
      expect(getPipelineStyle(pipeline("Neubau", { startnetz: false }), null, "H2-1").className).toBeNull();
      expect(getPipelineStyle(pipeline("Neubau"), null).className).toBeNull();
   });

   it("keeps the same base weight regardless of OGE participation", () => {
      const withoutOge = getPipelineStyle(pipeline("Neubau", { durchfuehrendeNetzbetreiber: ["GASCADE"] }), null);
      const withOge = getPipelineStyle(pipeline("Neubau", { durchfuehrendeNetzbetreiber: ["OGE"] }), null);

      expect(withOge.weight).toBe(withoutOge.weight);
      expect(withOge.weight).toBe(3.5);
   });

   it("keeps selected and hovered states independent of OGE participation", () => {
      const selected = getPipelineStyle(pipeline("Neubau", { durchfuehrendeNetzbetreiber: ["OGE"] }), "H2-1");
      const hovered = getPipelineStyle(pipeline("Neubau", { durchfuehrendeNetzbetreiber: ["OGE"] }), null, "H2-1");

      expect(selected.weight).toBe(6.5);
      expect(hovered.weight).toBe(6.5);
   });
});
