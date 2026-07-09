export const FEATURE_TYPE_MARKTABFRAGE_PROJEKT = "marktabfrage_projekt";

export const PROJEKT_TYP_WASSERSTOFF = "wasserstoff_projekt";
export const PROJEKT_TYP_PTG = "ptg_anlage";
export const PROJEKT_TYPEN = [PROJEKT_TYP_WASSERSTOFF, PROJEKT_TYP_PTG];

export const KATEGORIE_AUSSPEISUNG = "Ausspeisung";
export const KATEGORIE_EINSPEISUNG = "Einspeisung";
export const KATEGORIE_SPEICHER = "Speicher";
export const KATEGORIEN = [KATEGORIE_AUSSPEISUNG, KATEGORIE_EINSPEISUNG, KATEGORIE_SPEICHER];

// Kurzlabels für platzarme UI (Filterchips): Exit/Entry sind die branchenüblichen Begriffe des
// Entry-Exit-Systems. Die Datenwerte und Detailansichten führen weiter Ausspeisung/Einspeisung.
export const KATEGORIE_KURZLABELS = {
   [KATEGORIE_AUSSPEISUNG]: "Exit",
   [KATEGORIE_EINSPEISUNG]: "Entry",
   [KATEGORIE_SPEICHER]: "Speicher"
};

export const kategorieKurzlabel = kategorie => KATEGORIE_KURZLABELS[kategorie] ?? kategorie;

// Netzzuordnung der H₂-Projekte aus der Marktabfrage: Fernleitungs- oder Verteilnetz.
// PtG-Anlagen aus der Marktabfrage Strom tragen keine solche Angabe.
export const NETZ_FNB = "FNB-Netz";
export const NETZ_VNB = "VNB-Netz";
export const NETZE = [NETZ_FNB, NETZ_VNB];

export const HAERTEGRAD_MIN_STUFE = 0;
export const HAERTEGRAD_MAX_STUFE = 3;

// "H2-Bedarf gesichert" ist die sicherste Stufe der Härtegrad-Skala und wird als HG 0 geführt.
const HAERTEGRAD_STUFEN = {
   "H2-Bedarf gesichert": 0,
   "HG 1": 1,
   "HG 2": 2,
   "HG 3": 3
};

// Referenzjahr für Leistungs-Kennzahlen: mittleres Stützjahr der Marktabfrage-Zeitreihen.
export const LEISTUNG_REFERENZJAHR = 2035;

export function getHaertegradStufe(haertegrad) {
   // Object.hasOwn verhindert, dass geerbte Schlüssel wie "toString" eine Funktion liefern.
   const key = String(haertegrad ?? "").trim();
   return Object.hasOwn(HAERTEGRAD_STUFEN, key) ? HAERTEGRAD_STUFEN[key] : null;
}

export const haertegradStufeLabel = stufe => `HG ${stufe}`;

export function isMarktabfrageProjektFeature(input) {
   const props = input?.properties ?? input ?? {};
   // Getrimmt wie getFeatureTyp im NEP-Pfad, damit umgebende Leerzeichen das Routing zwischen
   // Marktabfrage- und NEP-Pipeline nicht kippen.
   return String(props.featureTyp ?? "").trim() === FEATURE_TYPE_MARKTABFRAGE_PROJEKT;
}

export function getMarktabfrageAttribute(input) {
   const props = input?.properties ?? input ?? {};
   return props.marktabfrage?.attribute ?? {};
}

export function getMarktabfrageZeitreihen(input) {
   const props = input?.properties ?? input ?? {};
   return props.marktabfrage?.zeitreihen ?? {};
}

export function isPtgAnlage(input) {
   const props = input?.properties ?? input ?? {};
   return props.projektTyp === PROJEKT_TYP_PTG;
}

// Die für die Kategorie maßgebliche H₂-Leistungszeitreihe (MW): Ausspeisung und Speicher werden
// über die Ausspeiseleistung beschrieben, Einspeisung und PtG-Anlagen über die Einspeiseleistung.
export function getLeistungszeitreiheMw(input) {
   const props = input?.properties ?? input ?? {};
   const zeitreihen = getMarktabfrageZeitreihen(props);
   if (props.kategorie === KATEGORIE_EINSPEISUNG) return zeitreihen.einspeiseleistungH2Mw ?? null;
   return zeitreihen.ausspeiseleistungH2Mw ?? null;
}

// Zeitreihen führen nur Stützjahre mit Werten; ein fehlendes Jahr bedeutet "keine Leistung in
// diesem Jahr" (z. B. vor der Inbetriebnahme) und wird als null zurückgegeben.
export function getLeistungMw(input, jahr) {
   const zeitreihe = getLeistungszeitreiheMw(input);
   const wert = zeitreihe?.[String(jahr)];
   return Number.isFinite(wert) ? wert : null;
}

// Größter Wert der kategorie-passenden Leistungszeitreihe über alle Stützjahre — Grundlage des
// Mindestleistungs-Filters ("Leistung in mindestens einem Jahr erreicht den Schwellwert").
export function getMaxLeistungMw(input) {
   const zeitreihe = getLeistungszeitreiheMw(input);
   if (!zeitreihe) return null;

   const werte = Object.values(zeitreihe).filter(Number.isFinite);
   return werte.length > 0 ? Math.max(...werte) : null;
}
