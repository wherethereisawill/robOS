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

function ListDatasets() {
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const token = getToken();

    useEffect(() => {
        if (!token) return;

        const fetchDatasets = async () => {
            try {
                const response = await fetch(
                    "https://huggingface.co/api/datasets?author=willnorris&sort=createdAt&direction=-1&limit=50",
                    {
                        method: "GET",
                        headers: {"Authorization": `Bearer ${token}`}
                    }
                );
                const data = await response.json();
                setDatasets(data);
            } catch (error) {
                console.error("Error fetching datasets:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDatasets();
    }, [token]);

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
                        <div className="text-center py-4">Create a dataset to get started</div>
                    ) : (
                        datasets.map((dataset) => {
                            return (
                                <Card key={dataset.id}>
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <div className="flex-grow text-left space-y-2">
                                            <CardTitle>{dataset.id.split('/')[1]}</CardTitle>
                                            <CardDescription>{dataset.createdAt.split('T')[0]}</CardDescription>
                                        </div>
                                        <Button variant="outline" size="icon">
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