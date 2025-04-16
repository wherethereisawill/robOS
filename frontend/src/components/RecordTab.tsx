import { PortInfo } from "@/types/serial";
import { ActiveCamera } from "@/types/camera";
import { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useState } from "react";
import { buildSyncReadPacket, buildSyncMovePacket } from "@/utils/serialUtils";

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

    const syncMoveServos = useCallback(async (port: SerialPort, servosTargets: [number, number][]): Promise<void> => {
        
        if (!port) {
          console.error("No port provided");
          return;
        }
      
        if (!port.readable || !port.writable) {
          console.error("Port streams are not available");
          return;
        }
      
        const packet = buildSyncMovePacket(servosTargets);
        // console.log("Sending SYNC MOVE:", packet.map(b => `0x${b.toString(16).padStart(2, '0')}`));
      
        const writer = port.writable.getWriter();
        await writer.write(packet);
        writer.releaseLock();
      
        await new Promise(resolve => setTimeout(resolve, 10)); // sleep 10ms
      }, []);

    const [servoPositions, setServoPositions] = useState<Array<Record<number, number | null>>>([]);
    const [isRecording, setIsRecording] = useState(false);

    // New function to handle reading leader and commanding follower
    const syncLeaderToFollower = useCallback(async () => {
        const leaderPortInfo = ports.find(p => p.type === 'leader');
        const followerPortInfo = ports.find(p => p.type === 'follower');

        let currentPositions: Array<Record<number, number | null>> = [];

        if (leaderPortInfo?.port && followerPortInfo?.port) {
            try {
                // 1. Read positions from Leader
                const leaderPositions = await syncReadPositions(leaderPortInfo.port, [4, 6]); // Assuming servos 4 and 6

                // 2. Prepare target positions for Follower
                const targetPositions: [number, number][] = Object.entries(leaderPositions)
                    .filter(([_, pos]) => pos !== null)
                    .map(([id, pos]) => [parseInt(id, 10), pos as number]);

                // 3. Command Follower if there are valid targets
                if (targetPositions.length > 0) {
                    await syncMoveServos(followerPortInfo.port, targetPositions);
                }

                // 4. Read current positions from *all* ports for UI update
                // We read again after commanding to get potentially updated states
                currentPositions = await Promise.all(
                    ports.map(async (portInfo) => {
                        if (portInfo.port) {
                            try {
                                // Read positions (leader's might have changed slightly, follower's reflect command target)
                                const positions = await syncReadPositions(portInfo.port, [4, 6]); 
                                return positions;
                            } catch (error) {
                                console.error(`Error fetching positions for ${portInfo.type}:`, error);
                                return { 4: null, 6: null }; // Default on error
                            }
                        } else {
                            return { 4: null, 6: null }; // Default if port object missing
                        }
                    })
                );

            } catch (error) {
                console.error("Error in syncLeaderToFollower loop:", error);
                // Set default state in case of error during leader read or follower command
                 currentPositions = ports.map(() => ({ 4: null, 6: null }));
            }
        } else {
             // If leader or follower not connected, just read whatever is connected
             currentPositions = await Promise.all(
                ports.map(async (portInfo) => {
                    if (portInfo.port) {
                        try {
                            const positions = await syncReadPositions(portInfo.port, [4, 6]);
                            return positions;
                        } catch (error) {
                            console.error(`Error fetching positions for ${portInfo.type}:`, error);
                            return { 4: null, 6: null };
                        }
                    } else {
                        return { 4: null, 6: null };
                    }
                })
            );
        }

        setServoPositions(currentPositions);

    }, [ports, syncReadPositions, syncMoveServos]);

    useEffect(() => {
        // Only run the effect if we have ports connected AND recording is active
        if (ports.length > 0 && isRecording) { 
            // Set up interval to sync leader to follower periodically
            const intervalId = setInterval(syncLeaderToFollower, 33);

            // Cleanup function to clear the interval
            return () => clearInterval(intervalId);
        } else {
            // Clear positions if no ports are connected
            setServoPositions([]);
        }
        // Rerun effect if ports array, recording status, or control functions change
    }, [ports, isRecording, syncLeaderToFollower]); 

    // Handler to toggle recording state
    const handleRecordClick = () => {
        setIsRecording(prev => !prev);
    };

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
                <Button 
                    className="rounded-full w-fit" 
                    onClick={handleRecordClick}
                    variant={isRecording ? "destructive" : "default"}
                >
                    {isRecording ? "Stop Recording" : "Record new dataset"}
                </Button>
            </div>
        </>
      );
    }

export default RecordTab;