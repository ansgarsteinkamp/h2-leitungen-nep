import { useEffect, useState } from "react";

import { ErrorState, LoadingState } from "@/components/layout/AppStates";
import PipelineWorkspace from "@/components/layout/PipelineWorkspace";
import UploadStart from "@/presets/upload/UploadStart";
import { loadCountries } from "@/lib/data/loadCountries";
import { parsePipelineGeoJson } from "@/lib/data/validatePipelineGeoJson";

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

const PIPELINE_FILE_ACCEPT = {
   "application/geo+json": [".geojson"],
   "application/json": [".json", ".geojson"]
};

export default function App() {
   const [countries, setCountries] = useState(null);
   const [countriesError, setCountriesError] = useState(null);
   const [pipelineCollection, setPipelineCollection] = useState(null);
   const [uploadError, setUploadError] = useState(null);
   const [isProcessing, setIsProcessing] = useState(false);

   useEffect(() => {
      let active = true;

      loadCountries(import.meta.env.BASE_URL)
         .then(data => {
            if (active) setCountries(data);
         })
         .catch(error => {
            if (active) setCountriesError(error);
         });

      return () => {
         active = false;
      };
   }, []);

   const handleFilesAccepted = async files => {
      const [file] = files;
      if (!file) return;

      if (file.size > MAX_UPLOAD_SIZE) {
         setUploadError(new Error("Die Datei ist zu groß. Bitte eine GeoJSON-Datei bis maximal 10 MB auswählen."));
         return;
      }

      setIsProcessing(true);
      setUploadError(null);

      try {
         const text = await file.text();
         const nextCollection = parsePipelineGeoJson(text);
         setPipelineCollection(nextCollection);
      } catch (error) {
         setUploadError(error);
      } finally {
         setIsProcessing(false);
      }
   };

   const resetUpload = () => {
      setPipelineCollection(null);
      setUploadError(null);
      setIsProcessing(false);
   };

   if (uploadError) return <ErrorState error={uploadError} onReset={resetUpload} />;

   if (!pipelineCollection) {
      return (
         <UploadStart
            accept={PIPELINE_FILE_ACCEPT}
            heading="Interaktive Karte der H₂-Maßnahmen aus dem NEP 2025"
            isProcessing={isProcessing}
            label="quelldaten_v3.geojson hier ablegen oder auswählen"
            maxFiles={1}
            maxSize={MAX_UPLOAD_SIZE}
            onFilesAccepted={handleFilesAccepted}
         />
      );
   }

   if (countriesError) {
      return <ErrorState error={countriesError} onReset={() => window.location.reload()} resetLabel="Neu laden" />;
   }
   if (!countries) return <LoadingState />;

   return <PipelineWorkspace countries={countries} pipelineCollection={pipelineCollection} />;
}
