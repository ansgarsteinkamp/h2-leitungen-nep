import { Check, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { HelpTooltip } from "@/components/ui/help-tooltip";
import fieldDescriptions from "@/data/fieldDescriptions.json";
import {
   boolLabel,
   cleanText,
   costLabel,
   listLabel,
   numberLabel,
   pipelineMeta,
   pipelineTitle
} from "@/lib/domain/formatters";

const DATE_FORMAT = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
const EMPTY_VALUE = "keine Angabe";
const SCENARIO_FIELDS = ["szenario1", "szenario2", "szenario3"];
const LOCAL_FIELD_DESCRIPTIONS = {
   nepEinordnung: {
      label: "Einordnung",
      description:
         "Leitet die fachliche Einordnung im überarbeiteten NEP-Entwurf aus Startnetz, Netzausbauvorschlag und Modellierungsergebnissen ab."
   }
};

const DETAIL_GROUPS = [
   {
      id: "basis",
      title: "Stammdaten, Status und Kennungen",
      fields: [
         "id",
         "kurzel",
         "version",
         "leitungstyp",
         "projektstatus",
         "finalInvestmentDecision",
         "kernnetzAntragsId",
         "entsogTyndpProjektNr"
      ]
   },
   {
      id: "nep",
      title: "Einordnung im NEP",
      fields: ["nepEinordnung", "startnetz", "netzausbauvorschlag"]
   },
   {
      id: "szenarien",
      title: "Modellierungsergebnisse 2037",
      fields: ["szenario1", "szenario2", "szenario3"]
   },
   {
      id: "zeitplan",
      title: "Zeitplan",
      fields: ["ibnJahr", "inbetriebnahmeBis"]
   },
   {
      id: "technik",
      title: "Technische Kenndaten und Lage",
      fields: ["laengeKm", "dnMm", "dpBar", "bundeslaender"]
   },
   {
      id: "wirtschaft",
      title: "Bedarfsabdeckung und Maßnahmenkosten",
      fields: ["bedarfsabdeckung", "kostenMioEur", "erdgasverstaerkendeMassnahmen"]
   },
   {
      id: "beteiligte",
      title: "Beteiligte",
      fields: ["durchfuehrendeNetzbetreiber", "ansprechpartner", "ogeBeteiligung"]
   },
   {
      id: "hinweise",
      title: "Beschreibung und Hinweise",
      fields: ["beschreibung", "sonstiges"]
   }
];

function isEmptyValue(value) {
   return (
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim() === "") ||
      (Array.isArray(value) && value.length === 0)
   );
}

function formatGermanDate(value) {
   if (isEmptyValue(value)) return EMPTY_VALUE;

   const [year, month, day] = String(value).split("-").map(Number);
   if (!year || !month || !day) return cleanText(value);

   return DATE_FORMAT.format(new Date(Date.UTC(year, month - 1, day)));
}

function formatValue(key, value) {
   if (isEmptyValue(value)) return EMPTY_VALUE;
   if (fieldDescriptions[key]?.type === "date") return formatGermanDate(value);
   if (Array.isArray(value)) return listLabel(value);
   if (key === "laengeKm") return numberLabel(value, "km");
   if (key === "dnMm") return numberLabel(value, "mm");
   if (key === "dpBar") return numberLabel(value, "bar");
   if (key === "kostenMioEur") return costLabel(value);
   return cleanText(value);
}

function getNepClassification(props) {
   if (props.startnetz === true) return "Startnetzmaßnahme";
   if (props.netzausbauvorschlag === true) return "Teil des Netzausbauvorschlags";
   if (SCENARIO_FIELDS.some(field => props[field] === true)) return "Nur in Modellierungsergebnissen 2037";
   return EMPTY_VALUE;
}

function BooleanValue({ value }) {
   const label = boolLabel(value);
   const Icon = value ? Check : X;

   return (
      <span
         aria-label={label}
         className={value ? "inline-flex text-primary" : "inline-flex text-muted-foreground"}
         role="img"
      >
         <Icon aria-hidden="true" className="size-4" />
      </span>
   );
}

function DetailRow({ field, value }) {
   const meta = LOCAL_FIELD_DESCRIPTIONS[field] ?? fieldDescriptions[field] ?? { label: field };

   return (
      <div className="grid min-h-9 grid-cols-[minmax(8.5rem,0.42fr)_minmax(0,1fr)] gap-x-3 gap-y-1 border-b border-border/45 py-2.5 text-xs @max-[430px]:grid-cols-1">
         <dt className="flex min-w-0 items-center gap-1.5 wrap-break-word text-muted-foreground">
            <span>{meta.label}</span>
            <HelpTooltip contentClassName="max-w-80" label={meta.label ?? field} side="left" sideOffset={6}>
               {meta.description}
            </HelpTooltip>
         </dt>
         <dd className="m-0 min-w-0 font-normal wrap-break-word text-card-foreground">
            {typeof value === "boolean" ? <BooleanValue value={value} /> : formatValue(field, value)}
         </dd>
      </div>
   );
}

export default function DetailPanel({ selection, onClose }) {
   const panelRef = useRef(null);

   useEffect(() => {
      if (!selection) return;
      panelRef.current?.focus();
   }, [selection]);

   if (!selection) return null;

   const feature = selection.item;
   const props = feature.properties;
   const detailValues = { ...props, nepEinordnung: getNepClassification(props) };

   return (
      <section
         aria-labelledby="selection-panel-title"
         className="@container h-full max-h-full overflow-auto border border-border/60 bg-muted/55 p-4 focus-visible:ring-3 focus-visible:ring-ring/65 focus-visible:outline-none dark:focus-visible:ring-ring/50"
         ref={panelRef}
         tabIndex={-1}
      >
         <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
            <div className="grid min-w-0 gap-1">
               <p className="m-0 text-[0.72rem] font-medium text-label-accent uppercase">{pipelineMeta(feature)}</p>
               <h2 id="selection-panel-title" className="m-0 text-sm leading-snug font-medium text-card-foreground">
                  {pipelineTitle(feature)}
               </h2>
            </div>
            <button
               aria-label="Auswahl schließen"
               className="grid size-8 flex-none place-items-center rounded-md border border-border bg-transparent text-foreground transition-colors hover:border-primary/70 hover:bg-primary/15 focus-visible:ring-3 focus-visible:ring-ring/65 focus-visible:outline-none dark:focus-visible:ring-ring/50"
               onClick={onClose}
               type="button"
            >
               <X aria-hidden="true" className="size-4" />
            </button>
         </div>
         <div className="mt-4 grid gap-5">
            {DETAIL_GROUPS.map(group => (
               <section aria-labelledby={`detail-group-${group.id}`} className="grid gap-2.5" key={group.id}>
                  <h3
                     id={`detail-group-${group.id}`}
                     className="m-0 text-[0.7rem] font-medium text-label-accent uppercase"
                  >
                     {group.title}
                  </h3>
                  <dl className="grid border-t border-border/50">
                     {group.fields.map(field => (
                        <DetailRow field={field} key={field} value={detailValues[field]} />
                     ))}
                  </dl>
               </section>
            ))}
         </div>
      </section>
   );
}
