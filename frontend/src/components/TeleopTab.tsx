import { PortInfo } from "@/types/serial";
import { ActiveCamera } from "@/types/camera";
import { RefObject } from "react";

// Define props for TeleopTab
interface TeleopTabProps {
    ports: PortInfo[];
    activeCameras: ActiveCamera[];
    streamsRef: RefObject<Map<string, MediaStream>>;
}

function TeleopTab({ ports, activeCameras }: TeleopTabProps) {

    return (
        <>
            <p>Number of connected robots: {ports.length}</p>
            <p>Number of active cameras: {activeCameras.length}</p>
        </>
      );
    }

export default TeleopTab;