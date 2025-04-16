import { PortInfo } from "@/types/serial";
import { ActiveCamera } from "@/types/camera";
import { RefObject } from "react";
import { Button } from "@/components/ui/button";

// Define props for TeleopTab
interface RecordTabProps {
    ports: PortInfo[];
    activeCameras: ActiveCamera[];
    streamsRef: RefObject<Map<string, MediaStream>>;
}

function RecordTab({ ports, activeCameras }: RecordTabProps) {

    return (
        <>
            <div className="flex flex-row items-center justify-between mb-2">
                <h2 className="text-2xl font-semibold mt-2 mb-2 text-left">Info</h2>
            </div>
            <div className="text-left">
                <p>Number of connected robots: {ports.length}</p>
                <p>Number of active cameras: {activeCameras.length}</p>
            </div>
            <div className="flex flex-row items-center justify-between mb-2">
                <h2 className="text-2xl font-semibold mt-2 mb-2 text-left">Datasets</h2>
                <Button className="rounded-full w-fit">Record new dataset</Button>
            </div>
        </>
      );
    }

export default RecordTab;