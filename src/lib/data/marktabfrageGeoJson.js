import {
   FEATURE_TYPE_MARKTABFRAGE_PROJEKT,
   KATEGORIE_EINSPEISUNG,
   KATEGORIEN,
   NETZE,
   PROJEKT_TYP_WASSERSTOFF,
   PROJEKT_TYPEN,
   getHaertegradStufe
} from "@/lib/domain/marktabfrage";

const KATEGORIE_VALUES = new Set(KATEGORIEN);
const NETZ_VALUES = new Set(NETZE);
const PROJEKT_TYP_VALUES = new Set(PROJEKT_TYPEN);
const GEOMETRIE_STATUS_VALUES = new Set(["vorhanden", "fehlt"]);

const isBlank = value => value === null || value === undefined || String(value).trim() === "";

const toCoordinate = value => (typeof value === "number" && Number.isFinite(value) ? value : null);

function normalizePointGeometry(geometry, label) {
   if (geometry === null || geometry === undefined) return null;

   if (typeof geometry !== "object" || geometry.type !== "Point" || !Array.isArray(geometry.coordinates)) {
      throw new Error(`${label}: Marktabfrage-Projekte benötigen eine Punktgeometrie oder geometry: null.`);
   }

   // Bewusst einzeln statt destrukturiert: Bei zu kurzen Arrays liefert Destrukturierung
   // undefined und unterliefe den null-Vergleich.
   const lon = toCoordinate(geometry.coordinates[0]);
   const lat = toCoordinate(geometry.coordinates[1]);
   if (lon === null || lat === null) {
      throw new Error(`${label}: Koordinate des Punkts muss Länge und Breite als Zahlen enthalten.`);
   }
   if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
      throw new Error(`${label}: Koordinate des Punkts liegt außerhalb gültiger Längen-/Breitengrade.`);
   }

   return { ...geometry, coordinates: [lon, lat] };
}

function normalizeGeometrieStatus(properties, geometry, label) {
   const rawStatus = String(properties.geometrieStatus ?? "").trim();
   if (!rawStatus) return geometry ? "vorhanden" : "fehlt";

   if (!GEOMETRIE_STATUS_VALUES.has(rawStatus)) {
      throw new Error(`${label}: geometrieStatus muss "vorhanden" oder "fehlt" sein.`);
   }
   if (rawStatus === "vorhanden" && !geometry) {
      throw new Error(`${label}: geometrieStatus "vorhanden" passt nicht zu geometry: null.`);
   }
   if (rawStatus === "fehlt" && geometry) {
      throw new Error(`${label}: geometrieStatus "fehlt" passt nicht zu einer vorhandenen Geometrie.`);
   }

   return rawStatus;
}

function normalizeJahr(value, label, key) {
   if (isBlank(value)) return null;

   // Vierstellig wie die Zeitreihen-Jahre: Platzhalter (0) oder Tippfehler (20355) würden sonst
   // die Slider-Grenzen für den gesamten Datensatz verzerren.
   const jahr = Number(value);
   if (!Number.isInteger(jahr) || jahr < 1000 || jahr > 9999) {
      throw new Error(`${label}: ${key} muss ein vierstelliges Jahr sein.`);
   }

   return jahr;
}

function normalizeZeitreihen(zeitreihen, label) {
   if (zeitreihen === null || zeitreihen === undefined) return {};
   if (typeof zeitreihen !== "object" || Array.isArray(zeitreihen)) {
      throw new Error(`${label}: zeitreihen muss ein Objekt mit Jahreswerten sein.`);
   }

   Object.entries(zeitreihen).forEach(([reihe, werte]) => {
      if (werte === null || typeof werte !== "object" || Array.isArray(werte)) {
         throw new Error(`${label}: Zeitreihe "${reihe}" muss ein Objekt mit Jahreswerten sein.`);
      }
      Object.entries(werte).forEach(([jahr, wert]) => {
         if (!/^\d{4}$/.test(jahr) || !Number.isFinite(wert)) {
            throw new Error(`${label}: Zeitreihe "${reihe}" enthält für "${jahr}" keinen gültigen Zahlenwert.`);
         }
      });
   });

   return zeitreihen;
}

// Härtegrad und Kategorie gelten nur für Wasserstoff-Projekte; PtG-Anlagen sind fachlich immer
// Einspeisungen und kennen keinen Härtegrad.
function normalizeWasserstoffAttribute(attribute, label) {
   const kategorie = String(attribute.kategorie ?? "").trim();
   if (!KATEGORIE_VALUES.has(kategorie)) {
      throw new Error(`${label}: Wasserstoff-Projekte benötigen eine Kategorie (Einspeisung, Ausspeisung, Speicher).`);
   }

   const haertegradStufe = getHaertegradStufe(attribute.haertegrad);
   if (haertegradStufe === null && !isBlank(attribute.haertegrad)) {
      throw new Error(`${label}: Unbekannter Härtegrad "${attribute.haertegrad}".`);
   }

   const netz = isBlank(attribute.netz) ? null : String(attribute.netz).trim();
   if (netz !== null && !NETZ_VALUES.has(netz)) {
      throw new Error(`${label}: Unbekanntes Netz "${attribute.netz}" (erwartet: ${NETZE.join(", ")}).`);
   }

   return {
      betreiber: isBlank(attribute.grosskundeNetzanschlussnehmer)
         ? null
         : String(attribute.grosskundeNetzanschlussnehmer).trim(),
      haertegradStufe,
      inbetriebnahmeJahr: normalizeJahr(attribute.jahrDerInbetriebnahme, label, "jahrDerInbetriebnahme"),
      kategorie,
      netz,
      projektnummer: isBlank(attribute.projektnummer) ? null : String(attribute.projektnummer).trim()
   };
}

function normalizePtgAttribute(attribute, label) {
   return {
      betreiber: isBlank(attribute.anlagenbetreiber) ? null : String(attribute.anlagenbetreiber).trim(),
      haertegradStufe: null,
      inbetriebnahmeJahr: normalizeJahr(attribute.initialeInbetriebnahme, label, "initialeInbetriebnahme"),
      kategorie: KATEGORIE_EINSPEISUNG,
      netz: null,
      projektnummer: null
   };
}

export function normalizeMarktabfrageFeature(feature, label) {
   const properties = feature.properties;
   const marktabfrage = properties.marktabfrage;

   if (!marktabfrage || typeof marktabfrage !== "object") {
      throw new Error(`${label}: Marktabfrage-Projekte benötigen das Objekt marktabfrage.`);
   }

   const projektTyp = String(marktabfrage.projektTyp ?? "").trim();
   if (!PROJEKT_TYP_VALUES.has(projektTyp)) {
      throw new Error(`${label}: Unbekannter Marktabfrage-Projekttyp "${marktabfrage.projektTyp}".`);
   }

   const id = String(properties.id ?? "").trim();
   if (!id) {
      throw new Error(`${label}: Die ID darf nicht leer sein.`);
   }
   if (isBlank(properties.name)) {
      throw new Error(`${label}: Der Name darf nicht leer sein.`);
   }

   const attribute = marktabfrage.attribute && typeof marktabfrage.attribute === "object" ? marktabfrage.attribute : {};
   const geometry = normalizePointGeometry(feature.geometry, label);
   const abgeleitet =
      projektTyp === PROJEKT_TYP_WASSERSTOFF
         ? normalizeWasserstoffAttribute(attribute, label)
         : normalizePtgAttribute(attribute, label);

   return {
      ...feature,
      geometry,
      properties: {
         ...properties,
         ...abgeleitet,
         id,
         // Wie id/betreiber auf einen getrimmten String normieren: Nicht-String-Werte (z. B.
         // Objekte) würden sonst später das Rendern als React-Child crashen.
         name: String(properties.name).trim(),
         featureTyp: FEATURE_TYPE_MARKTABFRAGE_PROJEKT,
         geometrieStatus: normalizeGeometrieStatus(properties, geometry, label),
         projektTyp,
         marktabfrage: {
            ...marktabfrage,
            attribute,
            zeitreihen: normalizeZeitreihen(marktabfrage.zeitreihen, label)
         }
      }
   };
}

// Nur String-Blätter übernehmen: Nicht-String-Werte (Zahlen, Arrays, null) würden beim Rendern
// im Detailpanel crashen; verschachtelte Objekte werden rekursiv bereinigt.
function sanitizeLabels(labels) {
   const result = {};
   Object.entries(labels).forEach(([key, value]) => {
      if (typeof value === "string") {
         result[key] = value;
      } else if (value && typeof value === "object" && !Array.isArray(value)) {
         result[key] = sanitizeLabels(value);
      }
   });
   return result;
}

export function getMarktabfrageLabels(collection) {
   const labels = collection?.metadata?.marktabfrageLabels;
   return labels && typeof labels === "object" && !Array.isArray(labels) ? sanitizeLabels(labels) : {};
}

export const EMPTY_MARKTABFRAGE_COLLECTION = Object.freeze({
   type: "FeatureCollection",
   features: [],
   labels: {}
});
