import { useEffect, useRef, useState } from "react";

export function usePipelineSelection(filteredCollection) {
   const [selection, setSelection] = useState(null);
   const activationId = useRef(0);

   const nextActivationId = () => {
      activationId.current += 1;
      return activationId.current;
   };

   useEffect(() => {
      if (!selection) return;

      const selectedId = selection.item.properties.id;
      const stillVisible = filteredCollection.features.some(feature => feature.properties.id === selectedId);
      // Keep the detail panel in sync with filters: hidden selections are closed immediately.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!stillVisible) setSelection(null);
   }, [filteredCollection, selection]);

   const selectPipeline = (item, source = "map") => {
      setSelection({ kind: "pipeline", item, source, activationId: nextActivationId() });
   };

   const selectResult = result => {
      selectPipeline(result.item, "result");
   };

   return {
      clearSelection: () => setSelection(null),
      selectPipeline,
      selectResult,
      selection
   };
}
