const stripBom = text => text.replace(/^\uFEFF/, "");

const PLACES_DATA_PATH = "data/orte.json";

const joinAssetPath = (baseUrl, assetPath) => `${baseUrl.replace(/\/?$/, "/")}${assetPath}`;

const isBlank = value => value === null || value === undefined || String(value).trim() === "";

const isObject = value => Boolean(value) && typeof value === "object" && !Array.isArray(value);

function validatePlace(place, index) {
   if (!isObject(place)) {
      throw new Error(`Ort ${index + 1}: Erwartet wird ein Objekt.`);
   }

   if (isBlank(place.name)) {
      throw new Error(`Ort ${index + 1}: Der Ortsname fehlt.`);
   }

   if (isBlank(place.typ)) {
      throw new Error(`Ort ${index + 1}: Der Ortstyp fehlt.`);
   }

   if (!isObject(place.koordinaten)) {
      throw new Error(`Ort ${index + 1}: Die Koordinaten fehlen.`);
   }

   const latitude = Number(place.koordinaten.lat);
   const longitude = Number(place.koordinaten.lon);

   if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
   ) {
      throw new Error(`Ort ${index + 1}: Erwartet werden gültige Breiten- und Längengrade.`);
   }

   return {
      id: `${String(place.typ).trim()}:${String(place.name).trim()}:${index}`,
      latitude,
      longitude,
      name: String(place.name).trim(),
      type: String(place.typ).trim()
   };
}

export function validatePlacesData(data) {
   if (!Array.isArray(data)) {
      throw new Error("Die Ortsdaten müssen eine JSON-Liste sein.");
   }

   if (data.length === 0) {
      throw new Error("Die Ortsdaten enthalten keine Orte.");
   }

   return data.map(validatePlace);
}

export async function loadPlaces(baseUrl) {
   let response;
   try {
      response = await fetch(joinAssetPath(baseUrl, PLACES_DATA_PATH));
   } catch (error) {
      throw new Error("Die Ortsdaten konnten nicht geladen werden.", { cause: error });
   }

   if (!response.ok) {
      throw new Error("Die Ortsdaten konnten nicht geladen werden.");
   }

   let text;
   try {
      text = await response.text();
   } catch (error) {
      throw new Error("Die Ortsdaten konnten nicht geladen werden.", { cause: error });
   }

   try {
      return validatePlacesData(JSON.parse(stripBom(text)));
   } catch (error) {
      if (error instanceof SyntaxError) {
         throw new Error("Die Ortsdaten sind kein gültiges JSON.", { cause: error });
      }

      throw error;
   }
}
