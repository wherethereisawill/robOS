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

function ListEpisodes() {
    return (
        <div>
            <div className="flex flex-row items-center justify-between mb-2">
                <h2 className="text-2xl font-semibold mt-2 mb-2 text-left">Episodes</h2>
                <Button className="rounded-full w-fit">Record episode</Button>
            </div>
            <Card>
                <CardContent>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <EpisodeVideoPlayer 
                                src="/placeholder-video.mp4"
                                className="w-36 h-36 object-cover rounded-md mr-4 bg-muted"
                            />
                            <div className="flex-grow text-left space-y-1">
                                <CardTitle>Episode 1</CardTitle>
                                <CardDescription>Pick up the plastic cup and open its lid.</CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 flex-shrink-0">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                    </Card>
                </CardContent>
            </Card>
        </div>
    );
}

export default ListEpisodes;