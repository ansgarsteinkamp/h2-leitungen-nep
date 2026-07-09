import { PROJEKT_FALLBACK_COLOR, PROJEKT_KATEGORIE_COLORS } from "@/components/theme/marktabfrageTheme";
import { KATEGORIE_AUSSPEISUNG, KATEGORIE_EINSPEISUNG, KATEGORIE_SPEICHER } from "@/lib/domain/marktabfrage";

// Form-Kodierung der Projektkategorien, redundant zur Farbe: Ausspeisung als Kreis,
// Einspeisung als Dreieck, Speicher als Quadrat. Karte (marktabfrageShapes.js), Legende und
// Filterchips (ProjektKategorieSymbol) ziehen ihre Geometrie aus diesem Modul, damit die
// Formen nirgends auseinanderlaufen.
const PROJEKT_KATEGORIE_SHAPES = {
   [KATEGORIE_AUSSPEISUNG]: "circle",
   [KATEGORIE_EINSPEISUNG]: "triangle",
   [KATEGORIE_SPEICHER]: "square"
};

// Geometrien im 12×12-Raster. Der Scale gleicht die visuelle Masse an: Das spitz zulaufende
// Dreieck braucht mehr Kantenlänge als der Kreis, das kompakte Quadrat etwas weniger.
const SHAPE_GEOMETRIES = {
   circle: { markup: '<circle cx="6" cy="6" r="5"/>', scale: 1 },
   triangle: { markup: '<path d="M6 0.6 L11.8 11 L0.2 11 Z"/>', scale: 1.2 },
   square: { markup: '<rect x="1.5" y="1.5" width="9" height="9"/>', scale: 0.95 }
};

const BASE_SIZE = 12;
const SELECTED_SIZE = 16;

export const shapeGeometryForKategorie = kategorie => SHAPE_GEOMETRIES[PROJEKT_KATEGORIE_SHAPES[kategorie] ?? "circle"];

export const shapeColorForKategorie = kategorie => PROJEKT_KATEGORIE_COLORS[kategorie] ?? PROJEKT_FALLBACK_COLOR;

// Speicher-Quadrate sind im hellen Theme weiß gefüllt und leben von ihrer dunklen Kontur;
// die übrigen Formen behalten die helle Standardkontur der Kartenmarker.
export const shapeStrokeForKategorie = kategorie =>
   kategorie === KATEGORIE_SPEICHER
      ? "var(--map-projekt-speicher-stroke, var(--map-place-marker-stroke, #ffffff))"
      : "var(--map-place-marker-stroke, #ffffff)";

// Weil die weiße Speicher-Füllung allein von der Kontur getragen wird, fällt sie etwas
// kräftiger aus als bei den farbigen Formen.
export const shapeStrokeWidthForKategorie = kategorie => (kategorie === KATEGORIE_SPEICHER ? 1.5 : 1);

// SVG-String für die Leaflet-DivIcons. Farbe und Kontur laufen wie bei den Cluster-Badges über
// CSS-Variablen im style-Attribut, damit Theme-Wechsel und PNG-Export sie live auflösen.
export function projektMarkerSvg(kategorie, { selected = false } = {}) {
   const { markup, scale } = shapeGeometryForKategorie(kategorie);
   const size = Math.round((selected ? SELECTED_SIZE : BASE_SIZE) * scale);
   const html =
      `<svg viewBox="0 0 12 12" width="${size}" height="${size}" aria-hidden="true"` +
      ` style="fill:${shapeColorForKategorie(kategorie)};fill-opacity:${selected ? 1 : 0.88};` +
      `stroke:${shapeStrokeForKategorie(kategorie)};stroke-width:${shapeStrokeWidthForKategorie(kategorie)};` +
      `stroke-opacity:0.9">${markup}</svg>`;
   return { html, size };
}
