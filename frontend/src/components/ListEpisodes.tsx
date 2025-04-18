import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"  
import { Button } from "./ui/button";
import { Trash2 } from "lucide-react";
import EpisodeVideoPlayer from "./EpisodeVideoPlayer";
import { getToken } from "@/utils/token";
import { useEffect, useState } from "react";

interface EpisodeSibling {
    rfilename: string;
}

interface ListEpisodesProps {
    datasetName: string;
}

function ListEpisodes({ datasetName }: ListEpisodesProps) {
    const token = getToken();
    const [isLoading, setIsLoading] = useState(true);
    const [episodes, setEpisodes] = useState<EpisodeSibling[]>([]);

    useEffect(() => {
        if (!token || !datasetName) return;

        const fetchEpisodes = async () => {
            setIsLoading(true);
            try {
                const episodesResponse = await fetch(
                    `https://huggingface.co/api/datasets/${datasetName}?full=true`,
                    {
                        method: "GET",
                        headers: {
                            "Authorization": `Bearer ${token}`,
                            "Content-Type": "application/json"
                        },
                        mode: "cors"
                    }
                );
                const episodes = await episodesResponse.json();
                const filteredEpisodes = episodes.siblings.filter((sibling: EpisodeSibling) => sibling.rfilename.endsWith('.parquet'));
                setEpisodes(filteredEpisodes);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchEpisodes();
    }, [token, datasetName]);

    return (
        <div>
            <div className="flex flex-row items-center justify-between mb-2">
                <h2 className="text-2xl font-semibold mt-2 mb-2 text-left">Episodes</h2>
                <Button className="rounded-full w-fit">Record episode</Button>
            </div>
            <Card>
                <CardContent className="space-y-4">
                    {isLoading ? (
                        <div className="text-center py-4">Loading...</div>
                    ) : episodes.length === 0 ? (
                        <div className="text-center py-4">No episodes yet... Record one!</div>
                    ) : (
                        episodes.map((episode, index) => (
                            <Card key={episode.rfilename}>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <EpisodeVideoPlayer 
                                        src="/placeholder-video.mp4"
                                        className="w-36 h-36 object-cover rounded-md mr-4 bg-muted"
                                    />
                                    <div className="flex-grow text-left space-y-1">
                                        <CardTitle>Episode {index + 1}</CardTitle>
                                        <CardDescription>{episode.rfilename}</CardDescription>
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 flex-shrink-0">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </CardHeader>
                            </Card>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default ListEpisodes;