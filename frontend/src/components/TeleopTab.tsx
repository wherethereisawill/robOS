import { PortInfo } from "@/types/serial";

// Define props for TeleopTab
interface TeleopTabProps {
    ports: PortInfo[];
}

function TeleopTab({ ports }: TeleopTabProps) {

    return (
        <>
            <h1>Teleop</h1>
            {/* Now you can use the ports prop here, e.g.: */}
            <p>Number of connected robots: {ports.length}</p>
        </>
      );
    }

export default TeleopTab;
