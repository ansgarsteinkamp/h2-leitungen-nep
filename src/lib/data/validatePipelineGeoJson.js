import { normalizeOperatorName } from "@/lib/domain/operators";
import { hasOgeExecutingOperator, hasOgeParticipation, isStandardFeature, splitListValue } from "@/lib/domain/pipeline";

const REQUIRED_PROPERTIES = ["id", "name", "leitungstyp", "startnetz", "netzausbauvorschlag", "ibnJahr"];

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

const NUMBER_PROPERTIES = ["ibnJahr", "laengeKm", "dnMm", "dpBar", "kostenMioEur"];
const OPERATOR_LIST_PROPERTIES = ["durchfuehrendeNetzbetreiber", "ansprechpartner"];

const stripBom = text => text.replace(/^\uFEFF/, "");

const isBlank = value => value === null || value === undefined || String(value).trim() === "";

const toArray = value => {
   if (Array.isArray(value)) {
      return value.flatMap(item => (isBlank(item) ? [] : splitListValue(item)));
   }
   if (isBlank(value)) return [];

   return splitListValue(value);
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

function validatePosition(position, featureIndex, path) {
   if (!isPosition(position)) {
      throw new Error(`Feature ${featureIndex + 1}: Koordinate ${path} muss Länge und Breite als Zahlen enthalten.`);
   }

   const [lon, lat] = normalizePosition(position);
   if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
      throw new Error(`Feature ${featureIndex + 1}: Koordinate ${path} liegt außerhalb gültiger Längen-/Breitengrade.`);
   }
}

function normalizeGeometry(geometry, featureIndex) {
   if (!geometry || typeof geometry !== "object") {
      throw new Error(`Feature ${featureIndex + 1} enthält keine gültige Geometrie.`);
   }

   if (geometry.type === "LineString" && Array.isArray(geometry.coordinates)) {
      if (geometry.coordinates.length < 2) {
         throw new Error(`Feature ${featureIndex + 1}: LineString muss mindestens zwei Koordinaten enthalten.`);
      }

      geometry.coordinates.forEach((position, index) => validatePosition(position, featureIndex, `[${index}]`));

      return {
         ...geometry,
         coordinates: geometry.coordinates.map(normalizePosition)
      };
   }

   if (geometry.type === "MultiLineString" && Array.isArray(geometry.coordinates)) {
      if (geometry.coordinates.length === 0) {
         throw new Error(`Feature ${featureIndex + 1}: MultiLineString muss mindestens eine Linie enthalten.`);
      }

      geometry.coordinates.forEach((line, lineIndex) => {
         if (!Array.isArray(line) || line.length < 2) {
            throw new Error(
               `Feature ${featureIndex + 1}: MultiLineString-Linie ${lineIndex + 1} muss mindestens zwei Koordinaten enthalten.`
            );
         }

         line.forEach((position, positionIndex) =>
            validatePosition(position, featureIndex, `[${lineIndex}][${positionIndex}]`)
         );
      });

      return {
         ...geometry,
         coordinates: geometry.coordinates.map(line => line.map(normalizePosition))
      };
   }

   throw new Error(
      `Feature ${featureIndex + 1} muss eine gültige LineString- oder MultiLineString-Geometrie enthalten.`
   );
}

function getIsoDateYear(value, featureIndex, key) {
   if (isBlank(value)) return null;

   const raw = String(value).trim();
   const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
   if (!match) {
      throw new Error(`Feature ${featureIndex + 1}: ${key} muss ein gültiges Datum im Format JJJJ-MM-TT sein.`);
   }

   const [, yearText, monthText, dayText] = match;
   const year = Number(yearText);
   const month = Number(monthText);
   const day = Number(dayText);
   const date = new Date(Date.UTC(year, month - 1, day));
   const valid = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;

   if (!valid) {
      throw new Error(`Feature ${featureIndex + 1}: ${key} muss ein gültiges Datum im Format JJJJ-MM-TT sein.`);
   }

   return year;
}

function normalizeProperties(properties, featureIndex) {
   if (!properties || typeof properties !== "object") {
      throw new Error(`Feature ${featureIndex + 1} enthält keine Eigenschaften.`);
   }

   const missing = REQUIRED_PROPERTIES.filter(key => !(key in properties));
   if (missing.length > 0) {
      throw new Error(`Feature ${featureIndex + 1}: Es fehlen erwartete Felder: ${missing.join(", ")}.`);
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

            throw new Error(`Feature ${featureIndex + 1}: ${key} muss ein gültiger Ja/Nein-Wert sein.`);
         }
      }
   });
   const rawIbnJahr = normalized.ibnJahr;
   NUMBER_PROPERTIES.forEach(key => {
      if (key in normalized) normalized[key] = toNumber(normalized[key]);
   });

   normalized.id = String(normalized.id ?? "").trim();
   if (!normalized.id) {
      throw new Error(`Feature ${featureIndex + 1}: Die ID darf nicht leer sein.`);
   }
   if (isBlank(normalized.name)) {
      throw new Error(`Feature ${featureIndex + 1}: Der Name darf nicht leer sein.`);
   }
   if (!isBlank(rawIbnJahr) && normalized.ibnJahr === null) {
      throw new Error(`Feature ${featureIndex + 1}: ibnJahr muss ein gültiges Jahr sein.`);
   }
   if (normalized.ibnJahr !== null && !Number.isInteger(normalized.ibnJahr)) {
      throw new Error(`Feature ${featureIndex + 1}: ibnJahr muss ein ganzzahliges Jahr sein.`);
   }
   getIsoDateYear(normalized.inbetriebnahmeBis, featureIndex, "inbetriebnahmeBis");

   normalized.standardAnzeige = isStandardFeature(normalized);
   normalized.ogeBeteiligung = hasOgeParticipation(normalized);
   normalized.ogeIstDurchfuehrenderNetzbetreiber = hasOgeExecutingOperator(normalized);

   return normalized;
}

export function parsePipelineGeoJson(text) {
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
      throw new Error("Die Datei enthält keine Leitungen.");
   }

   const ids = new Set();

   return {
      ...collection,
      features: collection.features.map((feature, index) => {
         if (feature?.type !== "Feature") {
            throw new Error(`Eintrag ${index + 1} muss ein GeoJSON Feature sein.`);
         }

         const properties = normalizeProperties(feature.properties, index);
         if (ids.has(properties.id)) {
            throw new Error(`Feature ${index + 1}: Die ID "${properties.id}" ist doppelt vergeben.`);
         }
         ids.add(properties.id);

         return {
            ...feature,
            geometry: normalizeGeometry(feature.geometry, index),
            properties
         };
      })
   };
}
