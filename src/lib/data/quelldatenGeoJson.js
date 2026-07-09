import { getMarktabfrageLabels, normalizeMarktabfrageFeature } from "@/lib/data/marktabfrageGeoJson";
import { isMarktabfrageProjektFeature } from "@/lib/domain/marktabfrage";
import { normalizeOperatorName } from "@/lib/domain/operators";
import {
   FEATURE_TYPES,
   FEATURE_TYPE_LEITUNG,
   FEATURE_TYPE_VERDICHTERSTANDORT,
   FEATURE_TYPE_VERDICHTER_MASSNAHME,
   getFeatureTyp,
   hasOgeExecutingOperator,
   hasOgeParticipation,
   isStandardFeature,
   splitListValue
} from "@/lib/domain/pipeline";

const REQUIRED_PROPERTIES = ["id", "name", "startnetz", "netzausbauvorschlag"];

const ARRAY_PROPERTIES = ["bundeslaender", "durchfuehrendeNetzbetreiber", "ansprechpartner"];

const BOOLEAN_PROPERTIES = [
   "startnetz",
   "netzausbauvorschlag",
   "standardAnzeige",
   "szenario1",
   "szenario2",
   "szenario3",
   "finalInvestmentDecision",
   "ogeBeteiligung",
   "ogeIstDurchfuehrenderNetzbetreiber"
];

const REQUIRED_BOOLEAN_PROPERTIES = ["startnetz", "netzausbauvorschlag"];
const MARKER_BOOLEAN_PROPERTIES = ["szenario1", "szenario2", "szenario3"];

const NUMBER_PROPERTIES = [
   "ibnJahr",
   "laengeKm",
   "dnMm",
   "dpBar",
   "kostenMioEur",
   "verdichterleistungMw",
   "anlagenleistungM3h"
];
const OPERATOR_LIST_PROPERTIES = ["durchfuehrendeNetzbetreiber", "ansprechpartner"];
const ID_LIST_PROPERTIES = ["officialIds", "ids", "kernnetzAntragsIds"];
const DATE_PROPERTIES = ["inbetriebnahmeBis", "inbetriebnahmeNachKernnetzgenehmigung"];
const DATE_LIST_PROPERTIES = ["inbetriebnahmeBisWerte", "inbetriebnahmeNachKernnetzgenehmigungWerte"];

const KNOWN_FEATURE_TYPES = new Set(FEATURE_TYPES);
const GEOMETRIE_STATUS_VALUES = new Set(["vorhanden", "fehlt", "aggregiert"]);
const LINE_GEOMETRY_TYPES = new Set(["LineString", "MultiLineString"]);

const BOM = String.fromCharCode(0xfeff);

const stripBom = text => (text.startsWith(BOM) ? text.slice(1) : text);

const isBlank = value => value === null || value === undefined || String(value).trim() === "";

const toArray = value => {
   if (Array.isArray(value)) {
      return value.flatMap(item => (isBlank(item) ? [] : splitListValue(item)));
   }
   if (isBlank(value)) return [];

   return splitListValue(value);
};

const toIdArray = value => {
   const items = Array.isArray(value) ? value : isBlank(value) ? [] : [value];
   return items.map(item => String(item ?? "").trim()).filter(item => item !== "");
};

const toBoolean = (value, { allowMarkers = false } = {}) => {
   if (typeof value === "boolean") return value;
   if (value === 1 || value === "1") return true;
   if (value === 0 || value === "0") return false;
   if (isBlank(value)) return null;

   const normalized = String(value).trim().toLocaleLowerCase("de-DE");
   if (["ja", "yes", "true", "wahr"].includes(normalized) || (allowMarkers && normalized === "x")) return true;
   if (
      ["nein", "no", "false", "falsch"].includes(normalized) ||
      (allowMarkers && ["-", "–", "—"].includes(normalized))
   ) {
      return false;
   }

   return null;
};

const toNumber = value => {
   if (typeof value === "number") return Number.isFinite(value) ? value : null;
   if (isBlank(value)) return null;

   const raw = String(value).trim().replace(/\s/g, "");
   const hasDecimalComma = raw.includes(",");
   const hasValidGermanGrouping = /^[-+]?(?:\d+|\d{1,3}(?:\.\d{3})+),\d+$/.test(raw);
   if (hasDecimalComma && !hasValidGermanGrouping) return null;

   const normalized = hasDecimalComma ? raw.replace(/\./g, "").replace(",", ".") : raw;
   const parsed = Number(normalized);
   return Number.isFinite(parsed) ? parsed : null;
};

const toCoordinate = value => {
   if (typeof value === "number") return Number.isFinite(value) ? value : null;
   if (typeof value !== "string" || isBlank(value)) return null;

   const parsed = Number(value.trim());
   return Number.isFinite(parsed) ? parsed : null;
};

const isPosition = value =>
   Array.isArray(value) && value.length >= 2 && toCoordinate(value[0]) !== null && toCoordinate(value[1]) !== null;

const normalizePosition = ([lon, lat]) => [toCoordinate(lon), toCoordinate(lat)];

function validatePosition(position, label, path) {
   if (!isPosition(position)) {
      throw new Error(`${label}: Koordinate ${path} muss Länge und Breite als Zahlen enthalten.`);
   }

   const [lon, lat] = normalizePosition(position);
   if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
      throw new Error(`${label}: Koordinate ${path} liegt außerhalb gültiger Längen-/Breitengrade.`);
   }
}

function normalizeGeometry(geometry, featureTyp, label) {
   if (geometry === null || geometry === undefined) return null;

   if (typeof geometry !== "object") {
      throw new Error(`${label} enthält keine gültige Geometrie.`);
   }

   if (geometry.type === "Point") {
      if (featureTyp === FEATURE_TYPE_LEITUNG) {
         throw new Error(
            `${label}: Leitungen benötigen eine LineString- oder MultiLineString-Geometrie, keine Punktgeometrie.`
         );
      }

      // Laut v3-Vertrag sind Punktgeometrien für Verdichterstandorte vorgesehen; GDRM-Anlagen,
      // Aggregate und Sonstiges haben geometry: null. Die Karte rendert Points als Verdichter.
      if (featureTyp !== FEATURE_TYPE_VERDICHTERSTANDORT) {
         throw new Error(
            `${label}: Nur Verdichterstandorte dürfen eine Punktgeometrie haben (featureTyp "${featureTyp}").`
         );
      }

      validatePosition(geometry.coordinates, label, "des Punkts");

      return {
         ...geometry,
         coordinates: normalizePosition(geometry.coordinates)
      };
   }

   if (LINE_GEOMETRY_TYPES.has(geometry.type) && featureTyp !== FEATURE_TYPE_LEITUNG) {
      throw new Error(`${label}: Nur Leitungen dürfen eine Liniengeometrie haben (featureTyp "${featureTyp}").`);
   }

   if (geometry.type === "LineString" && Array.isArray(geometry.coordinates)) {
      if (geometry.coordinates.length < 2) {
         throw new Error(`${label}: LineString muss mindestens zwei Koordinaten enthalten.`);
      }

      geometry.coordinates.forEach((position, index) => validatePosition(position, label, `[${index}]`));

      return {
         ...geometry,
         coordinates: geometry.coordinates.map(normalizePosition)
      };
   }

   if (geometry.type === "MultiLineString" && Array.isArray(geometry.coordinates)) {
      if (geometry.coordinates.length === 0) {
         throw new Error(`${label}: MultiLineString muss mindestens eine Linie enthalten.`);
      }

      geometry.coordinates.forEach((line, lineIndex) => {
         if (!Array.isArray(line) || line.length < 2) {
            throw new Error(
               `${label}: MultiLineString-Linie ${lineIndex + 1} muss mindestens zwei Koordinaten enthalten.`
            );
         }

         line.forEach((position, positionIndex) =>
            validatePosition(position, label, `[${lineIndex}][${positionIndex}]`)
         );
      });

      return {
         ...geometry,
         coordinates: geometry.coordinates.map(line => line.map(normalizePosition))
      };
   }

   throw new Error(
      `${label} muss eine gültige LineString-, MultiLineString- oder Punktgeometrie enthalten oder geometry: null setzen.`
   );
}

function getIsoDateYear(value, label, key) {
   if (isBlank(value)) return null;

   const raw = String(value).trim();
   const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
   if (!match) {
      throw new Error(`${label}: ${key} muss ein gültiges Datum im Format JJJJ-MM-TT sein.`);
   }

   const [, yearText, monthText, dayText] = match;
   const year = Number(yearText);
   const month = Number(monthText);
   const day = Number(dayText);
   const date = new Date(Date.UTC(year, month - 1, day));
   const valid = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;

   if (!valid) {
      throw new Error(`${label}: ${key} muss ein gültiges Datum im Format JJJJ-MM-TT sein.`);
   }

   return year;
}

function normalizeFeatureTyp(properties, label) {
   const featureTyp = getFeatureTyp(properties);
   if (!KNOWN_FEATURE_TYPES.has(featureTyp)) {
      throw new Error(`${label}: Unbekannter featureTyp "${featureTyp}".`);
   }

   return featureTyp;
}

function normalizeMeasureProperties(properties, label) {
   if (!properties || typeof properties !== "object") {
      throw new Error(`${label} enthält keine Eigenschaften.`);
   }

   const missing = REQUIRED_PROPERTIES.filter(key => !(key in properties));
   if (missing.length > 0) {
      throw new Error(`${label}: Es fehlen erwartete Felder: ${missing.join(", ")}.`);
   }

   const normalized = { ...properties };
   ARRAY_PROPERTIES.forEach(key => {
      normalized[key] = toArray(normalized[key]);
   });
   OPERATOR_LIST_PROPERTIES.forEach(key => {
      normalized[key] = normalized[key].map(normalizeOperatorName);
   });
   BOOLEAN_PROPERTIES.forEach(key => {
      if (key in normalized) {
         const rawValue = normalized[key];
         normalized[key] = toBoolean(normalized[key], { allowMarkers: MARKER_BOOLEAN_PROPERTIES.includes(key) });
         if (REQUIRED_BOOLEAN_PROPERTIES.includes(key) && normalized[key] === null) {
            if (isBlank(rawValue)) {
               normalized[key] = false;
               return;
            }

            throw new Error(`${label}: ${key} muss ein gültiger Ja/Nein-Wert sein.`);
         }
      }
   });
   const rawIbnJahr = normalized.ibnJahr;
   NUMBER_PROPERTIES.forEach(key => {
      if (key in normalized) normalized[key] = toNumber(normalized[key]);
   });

   normalized.id = String(normalized.id ?? "").trim();
   if (!normalized.id) {
      throw new Error(`${label}: Die ID darf nicht leer sein.`);
   }
   if (isBlank(normalized.name)) {
      throw new Error(`${label}: Der Name darf nicht leer sein.`);
   }
   if (!isBlank(rawIbnJahr) && normalized.ibnJahr === null) {
      throw new Error(`${label}: ibnJahr muss ein gültiges Jahr sein.`);
   }
   if (normalized.ibnJahr !== null && normalized.ibnJahr !== undefined && !Number.isInteger(normalized.ibnJahr)) {
      throw new Error(`${label}: ibnJahr muss ein ganzzahliges Jahr sein.`);
   }
   DATE_PROPERTIES.forEach(key => getIsoDateYear(normalized[key], label, key));

   ID_LIST_PROPERTIES.forEach(key => {
      if (key in normalized) normalized[key] = toIdArray(normalized[key]);
   });
   DATE_LIST_PROPERTIES.forEach(key => {
      if (key in normalized) {
         normalized[key] = toIdArray(normalized[key]);
         normalized[key].forEach(value => getIsoDateYear(value, label, key));
      }
   });
   if ("ibnJahre" in normalized) {
      normalized.ibnJahre = toIdArray(normalized.ibnJahre).map(value => {
         const year = toNumber(value);
         if (year === null || !Number.isInteger(year)) {
            throw new Error(`${label}: ibnJahre darf nur ganzzahlige Jahre enthalten.`);
         }
         return year;
      });
   }

   normalized.standardAnzeige = isStandardFeature(normalized);
   normalized.ogeBeteiligung = hasOgeParticipation(normalized);
   normalized.ogeIstDurchfuehrenderNetzbetreiber = hasOgeExecutingOperator(normalized);

   return normalized;
}

function normalizeNestedMeasures(measures, label) {
   if (measures === null || measures === undefined) return [];
   if (!Array.isArray(measures)) {
      throw new Error(`${label}: massnahmen muss eine Liste von Einzelmaßnahmen sein.`);
   }

   return measures.map((measure, index) => {
      const measureLabel = `${label}, Maßnahme ${index + 1}`;
      const normalized = normalizeMeasureProperties(measure, measureLabel);
      normalized.featureTyp = FEATURE_TYPE_VERDICHTER_MASSNAHME;
      return normalized;
   });
}

function normalizeGeometrieStatus(properties, geometry, label) {
   const rawStatus = String(properties.geometrieStatus ?? "").trim();
   if (!rawStatus) return geometry ? "vorhanden" : "fehlt";

   if (!GEOMETRIE_STATUS_VALUES.has(rawStatus)) {
      throw new Error(`${label}: geometrieStatus muss "vorhanden", "fehlt" oder "aggregiert" sein.`);
   }
   if (rawStatus === "vorhanden" && !geometry) {
      throw new Error(`${label}: geometrieStatus "vorhanden" passt nicht zu geometry: null.`);
   }
   if (rawStatus !== "vorhanden" && geometry) {
      throw new Error(`${label}: geometrieStatus "${rawStatus}" passt nicht zu einer vorhandenen Geometrie.`);
   }

   return rawStatus;
}

function normalizeProperties(properties, geometry, featureIndex) {
   const label = `Feature ${featureIndex + 1}`;
   const featureTyp = normalizeFeatureTyp(properties ?? {}, label);
   const normalized = normalizeMeasureProperties(properties, label);
   normalized.featureTyp = featureTyp;

   if (featureTyp === FEATURE_TYPE_LEITUNG && !("leitungstyp" in normalized)) {
      throw new Error(`${label}: Leitungen benötigen das Feld leitungstyp.`);
   }

   if (featureTyp === FEATURE_TYPE_VERDICHTERSTANDORT) {
      normalized.massnahmen = normalizeNestedMeasures(normalized.massnahmen, label);
      // Ohne Einzelmaßnahmen würden die Parent-Aggregate des Standorts wie eine Maßnahme
      // ausgewertet — genau die Fehlklassifikation, die die strikte Semantik ausschließt.
      if (normalized.massnahmen.length === 0) {
         throw new Error(`${label}: Verdichterstandorte benötigen mindestens eine Einzelmaßnahme in massnahmen.`);
      }
   }

   normalized.geometrieStatus = normalizeGeometrieStatus(normalized, geometry, label);

   return normalized;
}

// Quelldaten ab v4 mischen NEP-Maßnahmen und Marktabfrage-Projekte in einer Datei; die Anwendung
// verarbeitet beide Datensätze getrennt. IDs teilen sich dateiweit einen Namensraum.
export function parseQuelldatenGeoJson(text) {
   let collection;

   try {
      collection = JSON.parse(stripBom(text));
   } catch {
      throw new Error("Die Datei ist kein gültiges GeoJSON.");
   }

   if (collection?.type !== "FeatureCollection" || !Array.isArray(collection.features)) {
      throw new Error("Erwartet wird eine GeoJSON FeatureCollection.");
   }

   if (collection.features.length === 0) {
      throw new Error("Die Datei enthält keine Maßnahmen.");
   }

   const ids = new Set();
   const pipelineFeatures = [];
   const marktabfrageFeatures = [];

   const registerIds = (measureIds, label) => {
      measureIds.forEach(id => {
         if (ids.has(id)) {
            throw new Error(`${label}: Die ID "${id}" ist doppelt vergeben.`);
         }
         ids.add(id);
      });
   };

   collection.features.forEach((feature, index) => {
      const label = `Feature ${index + 1}`;
      if (feature?.type !== "Feature") {
         throw new Error(`Eintrag ${index + 1} muss ein GeoJSON Feature sein.`);
      }
      if (!feature.properties || typeof feature.properties !== "object") {
         throw new Error(`${label} enthält keine Eigenschaften.`);
      }

      if (isMarktabfrageProjektFeature(feature)) {
         const normalized = normalizeMarktabfrageFeature(feature, label);
         registerIds([normalized.properties.id], label);
         marktabfrageFeatures.push(normalized);
         return;
      }

      const featureTyp = normalizeFeatureTyp(feature.properties, label);
      const geometry = normalizeGeometry(feature.geometry, featureTyp, label);
      const properties = normalizeProperties(feature.properties, geometry, index);
      // Einzelmaßnahmen von Verdichterstandorten teilen den ID-Namensraum der Features:
      // Duplikate würden in Metriken doppelt zählen.
      registerIds([properties.id, ...(properties.massnahmen ?? []).map(measure => measure.id)], label);
      pipelineFeatures.push({ ...feature, geometry, properties });
   });

   return {
      marktabfrageCollection: {
         type: "FeatureCollection",
         features: marktabfrageFeatures,
         labels: getMarktabfrageLabels(collection)
      },
      pipelineCollection: { ...collection, features: pipelineFeatures }
   };
}
