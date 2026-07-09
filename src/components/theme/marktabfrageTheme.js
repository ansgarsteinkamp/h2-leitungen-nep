import { KATEGORIE_AUSSPEISUNG, KATEGORIE_EINSPEISUNG, KATEGORIE_SPEICHER } from "@/lib/domain/marktabfrage";

// Kategorie-Farben der Marktabfrage-Projekte. Hell: Teal für Exit, das
// Speicherorte-Rosé für Entry und Weiß mit dunkler Kontur für Speicher — die Kategorie trägt
// hier zusätzlich die Form (Kreis/Dreieck/Quadrat), Weiß funktioniert nur dank der Kontur.
// Dunkel: gesättigte, dunklere Verwandte der warmen Akzente — Terrakotta, Gold-Ocker und Jade
// (validiert mit scripts/validate_palette.js der dataviz-Guidance; die Theme-Töne Khaki/Salbei
// selbst verfehlen Chroma-Floor und Rot-Grün-Abstand).
export const PROJEKT_KATEGORIE_COLORS = {
   [KATEGORIE_AUSSPEISUNG]: "var(--map-projekt-ausspeisung, #0397ab)",
   [KATEGORIE_EINSPEISUNG]: "var(--map-projekt-einspeisung, #b94874)",
   [KATEGORIE_SPEICHER]: "var(--map-projekt-speicher, #ffffff)"
};

export const PROJEKT_FALLBACK_COLOR = "var(--map-pipeline-fallback, #e5e5e2)";

export function getProjektKategorieColor(input) {
   const props = input?.properties ?? input ?? {};
   return PROJEKT_KATEGORIE_COLORS[props.kategorie] ?? PROJEKT_FALLBACK_COLOR;
}

// Akzentfarbe für Cluster-Ringe und den Auswahl-Halo: Die weiße Speicher-Füllung wäre auf dem
// hellen Kartengrund unsichtbar, deshalb übernimmt dort die dunkle Konturfarbe (im dunklen
// Theme bleibt es das Jade der Füllung). Die übrigen Kategorien nutzen ihre Füllfarbe.
const PROJEKT_SPEICHER_AKZENT_COLOR = "var(--map-projekt-speicher-akzent, #20201d)";

export function getProjektAkzentColor(input) {
   const props = input?.properties ?? input ?? {};
   if (props.kategorie === KATEGORIE_SPEICHER) return PROJEKT_SPEICHER_AKZENT_COLOR;
   return getProjektKategorieColor(input);
}
