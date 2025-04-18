import ListDatasets from "./ListDatasets";
import ListEpisodes from "./ListEpisodes";
import { getToken } from "@/utils/token";

export function RecordTabV2() {
    const token = getToken();

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
                <ListDatasets />
            </div>
            <div className="w-2/3">
                <ListEpisodes />
            </div>
        </div>
    );
}