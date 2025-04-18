import ListDatasets from "./ListDatasets";
import ListEpisodes from "./ListEpisodes";
import { getToken } from "@/utils/token";
import { useState } from "react";

function RecordTabV2() {
    const token = getToken();
    const [selectedDataset, setSelectedDataset] = useState<string | null>(null);

    if (!token) {
        return (
            <div className="text-center py-8">
                <p className="text-muted-foreground">
                    Please configure your Hugging Face token in the setup tab.
                </p>
            </div>
        );
    }

    return (
        <div className="flex gap-8">
            <div className="w-1/3">
                <ListDatasets onDatasetSelect={setSelectedDataset} />
            </div>
            <div className="w-2/3">
                <ListEpisodes datasetName={selectedDataset || ""} />
            </div>
        </div>
    );
}

export default RecordTabV2;