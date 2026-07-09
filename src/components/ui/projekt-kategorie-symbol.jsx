import {
   shapeColorForKategorie,
   shapeGeometryForKategorie,
   shapeStrokeForKategorie,
   shapeStrokeWidthForKategorie
} from "@/components/theme/marktabfrageShapes";

// Symbol für Legende und Filterchips — dieselbe Form-Geometrie wie die Karten-Marker.
export function ProjektKategorieSymbol({ className, kategorie, style }) {
   const { markup } = shapeGeometryForKategorie(kategorie);
   return (
      <svg
         aria-hidden="true"
         className={className}
         dangerouslySetInnerHTML={{ __html: markup }}
         style={{
            fill: shapeColorForKategorie(kategorie),
            stroke: shapeStrokeForKategorie(kategorie),
            strokeWidth: shapeStrokeWidthForKategorie(kategorie),
            strokeOpacity: 0.9,
            // Das Dreieck reicht bis an den viewBox-Rand; ohne sichtbaren Overflow würde
            // seine Kontur dort beschnitten.
            overflow: "visible",
            ...style
         }}
         viewBox="0 0 12 12"
      />
   );
}
