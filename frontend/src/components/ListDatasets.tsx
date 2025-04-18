import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"  
import { Button } from "./ui/button";
import { ChevronRight } from "lucide-react"
import { useEffect, useState } from "react";
import { getToken } from "@/utils/token";

interface Dataset {
    id: string;
    description: string;
    author: string;
    createdAt: string;
    lastModified: string;
    private: boolean;
    downloads: number;
    likes: number;
    tags: string[];
}

interface ListDatasetsProps {
    onDatasetSelect: (datasetName: string) => void;
}

function ListDatasets({ onDatasetSelect }: ListDatasetsProps) {
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const token = getToken();

    useEffect(() => {
        if (!token) return;

        const fetchUserAndDatasets = async () => {
            try {
                // First fetch the user's name
                const userResponse = await fetch(
                    "https://huggingface.co/api/whoami-v2",
                    {
                        method: "GET",
                        headers: {
                            "Authorization": `Bearer ${token}`,
                            "Content-Type": "application/json"
                        },
                        mode: "cors"
                    }
                );
                const userData = await userResponse.json();

                // Then fetch their datasets
                const datasetsResponse = await fetch(
                    `https://huggingface.co/api/datasets?author=${userData.name}&sort=createdAt&direction=-1&limit=50`,
                    {
                        method: "GET",
                        headers: {
                            "Authorization": `Bearer ${token}`,
                            "Content-Type": "application/json"
                        },
                        mode: "cors"
                    }
                );
                const datasetsData = await datasetsResponse.json();
                setDatasets(datasetsData);
                
                // Automatically select the first dataset if available
                if (datasetsData.length > 0) {
                    onDatasetSelect(datasetsData[0].id);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchUserAndDatasets();
    }, [token, onDatasetSelect]);

    return (
        <div>
            <div className="flex flex-row items-center justify-between mb-2">
                <h2 className="text-2xl font-semibold mt-2 mb-2 text-left">Datasets</h2>
                <Button variant="outline" className="rounded-full w-fit">New dataset</Button>
            </div>
            <Card>
                <CardContent className="space-y-4">
                    {isLoading ? (
                        <div className="text-center py-4">Loading...</div>
                    ) : datasets.length === 0 ? (
                        <div className="text-center py-4">No datasets yet... Create one!</div>
                    ) : (
                        datasets.map((dataset) => {
                            const datasetName = dataset.id.split('/')[1];
                            return (
                                <Card key={dataset.id}>
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <div className="flex-grow text-left space-y-2">
                                            <CardTitle>{datasetName}</CardTitle>
                                            <CardDescription>{dataset.createdAt.split('T')[0]}</CardDescription>
                                        </div>
                                        <Button 
                                            variant="outline" 
                                            size="icon"
                                            onClick={() => onDatasetSelect(dataset.id)}
                                        >
                                            <ChevronRight />
                                        </Button>
                                    </CardHeader>
                                </Card>
                            );
                        })
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default ListDatasets;