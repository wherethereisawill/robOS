import { PortInfo } from "@/types/serial";
import { ActiveCamera } from "@/types/camera";
import { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useState } from "react";
import { buildSyncReadPacket } from "@/utils/serialUtils";

// Define props for TeleopTab
interface RecordTabProps {
    ports: PortInfo[];
    activeCameras: ActiveCamera[];
    streamsRef: RefObject<Map<string, MediaStream>>;
}

function RecordTab({ ports, activeCameras }: RecordTabProps) {

    const syncReadPositions = useCallback(async (port: SerialPort, servoIds: number[]) => {
        if (!port) {
            console.error('No port provided');
            return {};
        }

        if (!port.readable || !port.writable) {
            console.error('Port streams are not available');
            return {};
        }
        
        const writer = port.writable.getWriter();
        const reader = port.readable.getReader();
    
        const expectedResponseLengthPerServo = 8;
        const totalExpectedLength = servoIds.length * expectedResponseLengthPerServo;
        let receivedData = new Uint8Array(0);
        const positions: Record<number, number | null> = {};
    
        await writer.write(buildSyncReadPacket(servoIds));
    
        const startTime = Date.now();
        const timeoutMs = 30;
    
        while (receivedData.length < totalExpectedLength && (Date.now() - startTime) < timeoutMs) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) {
                const newData = new Uint8Array(receivedData.length + value.length);
                newData.set(receivedData);
                newData.set(value, receivedData.length);
                receivedData = newData;
            }
        }
    
        let currentOffset = 0;
        for (const servoId of servoIds) {
            positions[servoId] = null;
            for (let i = currentOffset; i <= receivedData.length - expectedResponseLengthPerServo; i++) {
                if (receivedData[i] === 0xFF && receivedData[i+1] === 0xFF && receivedData[i+2] === servoId) {
                    const packetSlice = receivedData.slice(i, i + expectedResponseLengthPerServo);
                    if (packetSlice[4] === 0) {
                        const posLow = packetSlice[5];
                        const posHigh = packetSlice[6];
                        positions[servoId] = (posHigh << 8) | posLow;
                    }
                    currentOffset = i + expectedResponseLengthPerServo;
                    break;
                }
            }
        }
    
        reader.releaseLock();
        writer.releaseLock();
    
        return positions;
    }, []);

    const [servoPositions, setServoPositions] = useState<Array<Record<number, number | null>>>([]);

    const fetchAllPositions = useCallback(async () => {
        const allPositions = await Promise.all(
            ports.map(async (portInfo) => {
                if (portInfo.port) {
                    try {
                        const positions = await syncReadPositions(portInfo.port, [4, 6]);
                        return positions;
                    } catch (error) {
                        console.error(`Error fetching positions for a port:`, error);
                        return { 4: null, 6: null };
                    }
                } else {
                    return { 4: null, 6: null };
                }
            })
        );

        setServoPositions(allPositions);
        // console.log("Fetched servo positions:", allPositions); // Might be too noisy now
    }, [ports, syncReadPositions]);

    useEffect(() => {
        if (ports.length > 0) {
            // Initial fetch
            fetchAllPositions();

            // Set up interval to fetch periodically
            const intervalId = setInterval(fetchAllPositions, 33.33);

            // Cleanup function to clear the interval
            return () => clearInterval(intervalId);
        } else {
            // Clear positions if no ports are connected
            setServoPositions([]);
        }
    }, [ports, fetchAllPositions]); // Rerun effect if ports or fetchAllPositions changes

    return (
        <>
            <div className="flex flex-row items-center justify-between mb-2">
                <h2 className="text-2xl font-semibold mt-2 mb-2 text-left">Info</h2>
            </div>
            <div className="text-left">
                <p>Number of connected robots: {ports.length}</p>
                <p>Number of active cameras: {activeCameras.length}</p>
                <div>
                    <ul>
                        {ports.map((portInfo, index) => (
                            <li key={index}>
                                <strong>{portInfo.type === 'leader' ? 'Leader' : 'Follower'} positions:</strong>
                                {servoPositions[index] ? (
                                    Object.entries(servoPositions[index]).map(([id, pos]) => (
                                        ` Servo ${id}: ${pos ?? 'N/A'}`
                                    )).join(', ')
                                ) : (
                                    ' Loading...' // Or N/A if fetch completed with nulls
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <div className="flex flex-row items-center justify-between mb-2">
                <h2 className="text-2xl font-semibold mt-2 mb-2 text-left">Datasets</h2>
                <Button className="rounded-full w-fit">Record new dataset</Button>
            </div>
        </>
      );
    }

export default RecordTab;