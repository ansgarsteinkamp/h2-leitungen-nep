import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { COUNTRY_STYLES } from "./mapTheme";
import { getPipelineStyle, getSelectionHaloStyle } from "./pipelineStyle";
import {
   getLineTypeDashArray,
   getLineTypeSymbolBackground,
   getPipelineColor,
   getPipelineParticipationKey,
   getSelectionHaloColor,
   LINE_TYPE_DASH_ARRAYS,
   PIPELINE_PARTICIPATION_COLORS,
   PIPELINE_FALLBACK_COLOR,
   PIPELINE_SYMBOL_COLORS,
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
      PIPELINE_PARTICIPATION_COLORS,
      PIPELINE_SYMBOL_COLORS,
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
         ogeBeteiligung: true,
         startnetz: true,
         ...properties
      }
   };
}

describe("map theme tokens", () => {
   it("keeps OGE participation colors themeable with CSS fallbacks", () => {
      expect(PIPELINE_PARTICIPATION_COLORS.oge).toBe("var(--map-pipeline-oge, #d97757)");
      expect(PIPELINE_PARTICIPATION_COLORS.noOge).toBe("var(--map-pipeline-no-oge, #86b7a7)");
      expect(SELECTION_HALO_COLORS.oge).toBe("var(--map-pipeline-selection-halo-oge, #d97757)");
      expect(SELECTION_HALO_COLORS.noOge).toBe("var(--map-pipeline-selection-halo-no-oge, #86b7a7)");
      expect(PIPELINE_SYMBOL_COLORS.oge).toBe("var(--map-pipeline-symbol-oge, #d97757)");
      expect(PIPELINE_SYMBOL_COLORS.noOge).toBe("var(--map-pipeline-symbol-no-oge, #86b7a7)");
      expect(PIPELINE_FALLBACK_COLOR).toBe("var(--map-pipeline-fallback, #e5e5e2)");
      expect(SELECTION_HALO_FALLBACK_COLOR).toBe("var(--map-pipeline-selection-halo-fallback, #faf9f5)");
   });

   it("encodes line type through dash arrays", () => {
      expect(LINE_TYPE_DASH_ARRAYS.Neubau).toBe("4 4");
      expect(LINE_TYPE_DASH_ARRAYS.Umstellung).toBeNull();
      expect(getLineTypeDashArray("Unbekannt")).toBeNull();
      expect(getLineTypeSymbolBackground("Neubau", "red")).toBe(
         "repeating-linear-gradient(90deg, red 0 4px, transparent 4px 8px)"
      );
      expect(getLineTypeSymbolBackground("Umstellung", "red")).toBe("red");
   });

   it("keeps country styles themeable with CSS fallbacks", () => {
      expect(COUNTRY_STYLES.context.className).toBe("country-boundary country-boundary-context");
      expect(COUNTRY_STYLES.context.color).toBe("var(--map-country-context-stroke, #74746a)");
      expect(COUNTRY_STYLES.context.fillColor).toBe("var(--map-country-context-fill, #30302e)");
      expect(COUNTRY_STYLES.germany.className).toBe("country-boundary country-boundary-germany");
      expect(COUNTRY_STYLES.germany.color).toBe("var(--map-country-germany-stroke, #faf9f5)");
      expect(COUNTRY_STYLES.germany.weight).toBe(2.1);
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

   it("uses non-OGE-theme colors in the dark theme", () => {
      const darkTheme = themeDeclarations("\\.dark");

      expect(darkTheme.get("--map-pipeline-oge")).toBe("#d97757");
      expect(darkTheme.get("--map-pipeline-no-oge")).toBe("#86b7a7");
      expect(darkTheme.get("--map-pipeline-selection-halo-oge")).toBe("#d97757");
      expect(darkTheme.get("--map-pipeline-selection-halo-no-oge")).toBe("#86b7a7");
      expect(darkTheme.get("--map-pipeline-symbol-oge")).toBe("#d97757");
      expect(darkTheme.get("--map-pipeline-symbol-no-oge")).toBe("#86b7a7");
      expect(darkTheme.get("--map-pipeline-fallback")).toBe("#e5e5e2");
      expect(darkTheme.get("--map-pipeline-selection-halo-fallback")).toBe("#faf9f5");
      expect(darkTheme.get("--map-country-germany-stroke")).toBe("#faf9f5");
      expect(darkTheme.get("--map-country-germany-fill")).toBe("#22221f");
   });

   it("uses the requested OGE theme palette with higher-contrast light halos", () => {
      const rootTheme = themeDeclarations(":root");
      const darkTheme = themeDeclarations("\\.dark");

      expect(rootTheme.get("--map-pipeline-oge").toLowerCase()).toBe("#52a436");
      expect(rootTheme.get("--map-pipeline-no-oge").toLowerCase()).toBe("#d2eae6");
      expect(rootTheme.get("--map-pipeline-selection-halo-oge")).toBe("#3f8429");
      expect(rootTheme.get("--map-pipeline-selection-halo-no-oge")).toBe("#75b8af");
      expect(rootTheme.get("--map-pipeline-symbol-oge").toLowerCase()).toBe("#52a436");
      expect(rootTheme.get("--map-pipeline-symbol-no-oge")).toBe("#bedfd9");
      expect(rootTheme.get("--map-background")).toBe("#ffffff");
      expect(rootTheme.get("--map-country-context-fill")).toBe("#f6fcfc");
      expect(rootTheme.get("--map-country-context-stroke")).toBe("#9ed8d7");
      expect(rootTheme.get("--map-country-germany-stroke")).toBe("#f0efa9");
      expect(rootTheme.get("--map-legend-background")).toBe("#f6fcfc");
      expect(rootTheme.get("--map-zoom-control-background")).toBe("#d2eae6");
      expect(darkTheme.get("--map-legend-background")).toBe("rgb(27 27 25 / 0.9)");
      expect(darkTheme.get("--map-pipeline-oge")).toBe(darkTheme.get("--map-pipeline-selection-halo-oge"));
      expect(darkTheme.get("--map-pipeline-no-oge")).toBe(darkTheme.get("--map-pipeline-selection-halo-no-oge"));
   });

   it("uses fallback colors when OGE participation is unknown", () => {
      expect(getPipelineParticipationKey({ ogeBeteiligung: true })).toBe("oge");
      expect(getPipelineParticipationKey({ ogeBeteiligung: false })).toBe("noOge");
      expect(getPipelineColor({ ogeBeteiligung: undefined })).toBe(PIPELINE_FALLBACK_COLOR);
      expect(getSelectionHaloColor({ ogeBeteiligung: undefined })).toBe(SELECTION_HALO_FALLBACK_COLOR);
   });
});

describe("getPipelineStyle", () => {
   it("uses OGE participation theme tokens", () => {
      expect(getPipelineStyle(pipeline("Neubau", { ogeBeteiligung: true }), null).color).toBe(
         PIPELINE_PARTICIPATION_COLORS.oge
      );
      expect(getPipelineStyle(pipeline("Neubau", { ogeBeteiligung: false }), null).color).toBe(
         PIPELINE_PARTICIPATION_COLORS.noOge
      );
   });

   it("falls back to the pipeline fallback token for unknown OGE participation", () => {
      expect(getPipelineStyle(pipeline("Neubau", { ogeBeteiligung: undefined }), null).color).toBe(
         PIPELINE_FALLBACK_COLOR
      );
   });

   it("uses line type dash arrays", () => {
      expect(getPipelineStyle(pipeline("Neubau"), null).dashArray).toBe("4 4");
      expect(getPipelineStyle(pipeline("Umstellung"), null).dashArray).toBeNull();
      expect(getPipelineStyle(pipeline("Unbekannt"), null).dashArray).toBeNull();
   });

   it("uses a dedicated fallback token for unknown selection halo participation", () => {
      expect(getSelectionHaloStyle(pipeline("Neubau", { ogeBeteiligung: undefined })).color).toBe(
         SELECTION_HALO_FALLBACK_COLOR
      );
   });

   it("uses a participation-specific selection halo color with the shared pulse class", () => {
      expect(getSelectionHaloStyle(pipeline("Umstellung", { ogeBeteiligung: false })).color).toBe(
         SELECTION_HALO_COLORS.noOge
      );
      expect(getSelectionHaloStyle(pipeline("Umstellung")).className).toBe("pipeline-selection-halo");
      expect(getSelectionHaloStyle(pipeline("Neubau")).className).toBe("pipeline-selection-halo");
   });

   it("does not add class-based visual categories beyond participation and line type", () => {
      expect(getPipelineStyle(pipeline("Neubau", { startnetz: false }), null).className).toBeNull();
      expect(getPipelineStyle(pipeline("Neubau"), null).className).toBeNull();
   });

   it("keeps the same base weight regardless of OGE participation", () => {
      const withoutOge = getPipelineStyle(pipeline("Neubau", { ogeBeteiligung: false }), null);
      const withOge = getPipelineStyle(pipeline("Neubau", { ogeBeteiligung: true }), null);

      expect(withOge.weight).toBe(withoutOge.weight);
      expect(withOge.weight).toBe(3);
   });

   it("keeps selected and hovered states independent of OGE participation", () => {
      const selected = getPipelineStyle(pipeline("Neubau", { ogeBeteiligung: true }), "H2-1");
      const hovered = getPipelineStyle(pipeline("Neubau", { ogeBeteiligung: false }), null, "H2-1");

      expect(selected.weight).toBe(5.75);
      expect(hovered.weight).toBe(5.75);
   });
});
