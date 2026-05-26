import fnbOperators from "@/data/fnb.json";

const FNB_ALIASES = {
   "gtg nord": "Gastransport Nord GmbH",
   "natran d": "NaTran Deutschland GmbH",
   natran_d: "NaTran Deutschland GmbH",
   "terranets bw": "terranets bw GmbH",
   "thyssengas h2": "Thyssengas GmbH"
};

const legalFormPattern = /\b(gmbh|mbh|ag|kg|co|co kg|& co kg)\b/g;

export const normalizeLookupText = value =>
   String(value ?? "")
      .toLocaleLowerCase("de-DE")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[._-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

const stripLegalForms = value => normalizeLookupText(value).replace(legalFormPattern, "").replace(/\s+/g, " ").trim();

const lookup = new Map();
const searchTermsByCanonicalName = new Map();

function addSearchTerm(canonicalName, term) {
   if (!canonicalName || !term) return;

   const terms = searchTermsByCanonicalName.get(canonicalName) ?? new Set();
   terms.add(canonicalName);
   terms.add(term);
   searchTermsByCanonicalName.set(canonicalName, terms);
}

function addLookup(key, value) {
   const normalized = normalizeLookupText(key);
   if (normalized) lookup.set(normalized, value);

   const withoutLegalForm = stripLegalForms(key);
   if (withoutLegalForm) lookup.set(withoutLegalForm, value);

   addSearchTerm(value, key);
}

fnbOperators.forEach(operator => {
   addLookup(operator.name, operator.name);
   addLookup(operator.abkuerzung, operator.name);
});

Object.entries(FNB_ALIASES).forEach(([alias, canonicalName]) => addLookup(alias, canonicalName));

export function normalizeOperatorName(value) {
   const cleaned = String(value ?? "").trim();
   if (!cleaned) return "";

   return lookup.get(normalizeLookupText(cleaned)) ?? lookup.get(stripLegalForms(cleaned)) ?? cleaned;
}

export function getOperatorSearchTerms(value) {
   const canonicalName = normalizeOperatorName(value);
   return [...(searchTermsByCanonicalName.get(canonicalName) ?? new Set([canonicalName]))];
}
