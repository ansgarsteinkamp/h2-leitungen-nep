import { Search, X } from "lucide-react";
import { useRef } from "react";

import DetailPanel from "@/components/panels/DetailPanel";
import { cn } from "@/lib/utils";

function ResultItem({ result, onSelect }) {
   const props = result.item.properties;
   const label = props.name || props.id;

   return (
      <li>
         <button
            className="grid min-h-14 w-full items-start gap-1.5 border-b border-border/45 bg-transparent px-2.5 py-3 text-left text-foreground transition-colors hover:bg-primary/10 hover:text-secondary focus-visible:ring-3 focus-visible:ring-ring/65 focus-visible:outline-none dark:focus-visible:ring-ring/50"
            data-pipeline-result-id={props.id}
            onClick={event => onSelect(result, event.currentTarget)}
            type="button"
         >
            <strong className="min-w-0 text-xs font-medium wrap-break-word text-card-foreground">{label}</strong>
            <small className="min-w-0 text-[0.68rem] wrap-break-word text-muted-foreground">
               {[props.id, props.leitungstyp, props.ibnJahr].filter(Boolean).join(" · ")}
            </small>
         </button>
      </li>
   );
}

export default function InspectorPanel({
   className,
   onClearSearch,
   onCloseSelection,
   onSearchTermChange,
   onSelectResult,
   results,
   searchTerm,
   selection
}) {
   const searchInputRef = useRef(null);
   const resultCount = results.items.length;
   const resultStatusText = resultCount === 0 ? "Keine Treffer" : `${resultCount} Treffer`;

   const clearSearch = () => {
      onClearSearch();
      window.requestAnimationFrame(() => searchInputRef.current?.focus());
   };

   return (
      <aside
         aria-label="Suche und Details"
         className={cn(
            "flex min-h-0 flex-col gap-3 focus-visible:ring-3 focus-visible:ring-ring/65 focus-visible:outline-none dark:focus-visible:ring-ring/50",
            className
         )}
         id="inspector-panel"
         tabIndex={-1}
      >
         <div className="border-b border-border/40 pb-3">
            <div className="grid min-h-10 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-primary/45 bg-field/75 px-3 text-muted-foreground shadow-none transition-colors hover:border-primary/65 focus-within:border-ring focus-within:bg-popover focus-within:ring-2 focus-within:ring-ring/65 dark:shadow-[0_0_0_1px_rgba(217,119,87,0.05)] dark:focus-within:border-primary/90 dark:focus-within:ring-primary/20">
               <Search aria-hidden="true" className="size-3.5" />
               <input
                  aria-label="Suche nach ID, Leitung, Betreiber oder Status"
                  className="min-w-0 border-0 bg-transparent text-[0.8rem] leading-5 text-popover-foreground outline-none placeholder:text-muted-foreground/55"
                  onChange={event => onSearchTermChange(event.target.value)}
                  placeholder="Suche"
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
               />
               {searchTerm && (
                  <button
                     aria-label="Suche löschen"
                     className="inline-grid size-6 place-items-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/65 focus-visible:outline-none dark:focus-visible:ring-ring/50"
                     onClick={clearSearch}
                     type="button"
                  >
                     <X aria-hidden="true" className="size-3.5" />
                  </button>
               )}
            </div>
         </div>

         {selection ? (
            <div className="min-h-0 flex-1 overflow-hidden">
               <DetailPanel onClose={onCloseSelection} selection={selection} />
            </div>
         ) : (
            <section className="min-h-0 flex-1 overflow-auto pt-1" aria-label="Treffer">
               <p className="sr-only" role="status" aria-live="polite">
                  {resultStatusText}
               </p>
               {resultCount > 0 ? (
                  <ul className="grid p-0">
                     {results.items.map(result => (
                        <ResultItem key={result.item.properties.id} onSelect={onSelectResult} result={result} />
                     ))}
                  </ul>
               ) : (
                  <div className="flex min-h-16 items-center justify-center px-3 text-xs text-muted-foreground/80">
                     Keine Treffer
                  </div>
               )}
            </section>
         )}
      </aside>
   );
}
