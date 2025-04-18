import ListDatasets from "./ListDatasets";
import ListEpisodes from "./ListEpisodes";

function RecordTabV2() {
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

export default RecordTabV2;