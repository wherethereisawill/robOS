import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card"  
import { Button } from "./ui/button";

function ListDatasets() {
    return (
        <div>
            <div className="flex flex-row items-center justify-between mb-2">
                <h2 className="text-2xl font-semibold mt-2 mb-2 text-left">Datasets</h2>
                <Button variant="outline" className="rounded-full w-fit">New dataset</Button>
            </div>
            <Card>
                <CardContent>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div className="flex-grow text-left space-y-1">
                                <CardTitle>Dataset 1</CardTitle>
                                <CardDescription>so100</CardDescription>
                            </div>
                        </CardHeader>
                    </Card>
                </CardContent>
            </Card>
        </div>
    );
}

export default ListDatasets;