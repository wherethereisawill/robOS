import { PortInfo } from "@/types/serial";
import { ActiveCamera } from "@/types/camera";
import { RefObject, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useState } from "react";
import { buildSyncReadPacket, buildSyncMovePacket } from "@/utils/serialUtils";
import { Trash2 } from "lucide-react"; // Import Trash icon
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
  

// Define the structure for a recorded frame
interface RecordedFrame {
    frame_index: number;
    observation: { state: Record<number, number | null> };
    action: Record<number, number | null>;
}

// Define an Episode as an array of RecordedFrames
type Episode = RecordedFrame[];

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
        const timeoutMs = 10; // Reduced timeout for potentially faster loops

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
            // Slightly safer loop condition
            for (let i = currentOffset; i <= receivedData.length - expectedResponseLengthPerServo; i++) {
                // Check header and ID
                if (receivedData[i] === 0xFF && receivedData[i+1] === 0xFF && receivedData[i+2] === servoId) {
                    const packetSlice = receivedData.slice(i, i + expectedResponseLengthPerServo);
                    // Check for error byte (index 4)
                    if (packetSlice[4] === 0) { // Assuming 0 means no error
                        const posLow = packetSlice[5];
                        const posHigh = packetSlice[6];
                        positions[servoId] = (posHigh << 8) | posLow;
                    } else {
                        console.warn(`Servo ${servoId} reported error: ${packetSlice[4]}`);
                    }
                    currentOffset = i + expectedResponseLengthPerServo; // Move offset past this packet
                    break; // Found packet for this servo, move to next servoId
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

        const writer = port.writable.getWriter();
        await writer.write(packet);
        writer.releaseLock();

        await new Promise(resolve => setTimeout(resolve, 10));
      }, []);

    const [servoPositions, setServoPositions] = useState<Array<Record<number, number | null>>>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [recordedEpisodes, setRecordedEpisodes] = useState<Episode[]>([]);
    const [currentEpisodeData, setCurrentEpisodeData] = useState<Episode>([]);
    const frameIndexRef = useRef<number>(0);

    // Function to handle reading leader and commanding follower
    const syncLeaderToFollower = useCallback(async () => {
        const leaderPortInfo = ports.find(p => p.type === 'leader');
        const followerPortInfo = ports.find(p => p.type === 'follower');

        let currentPositionsForUI: Array<Record<number, number | null>> = [];

        if (leaderPortInfo?.port && followerPortInfo?.port) {
            try {
                // 1. Read positions from Leader (becomes the action)
                const leaderPositions = await syncReadPositions(leaderPortInfo.port, [4, 6]); // Assuming servos 4 and 6

                // 2. Read positions from Follower (becomes the observation)
                const followerPositions = await syncReadPositions(followerPortInfo.port, [4, 6]);

                // --- Recording Logic ---
                if (isRecording) {
                    const frameData: RecordedFrame = {
                        frame_index: frameIndexRef.current,
                        observation: { state: followerPositions },
                        action: leaderPositions
                    };
                    // Append to the current episode's data
                    setCurrentEpisodeData(prev => [...prev, frameData]);
                    frameIndexRef.current += 1;
                }
                // --- End Recording Logic ---

                // 3. Prepare target positions for Follower command
                const targetPositions: [number, number][] = Object.entries(leaderPositions)
                    .filter(([_, pos]) => pos !== null)
                    .map(([id, pos]) => [parseInt(id, 10), pos as number]);

                // 4. Command Follower if there are valid targets
                if (targetPositions.length > 0) {
                    await syncMoveServos(followerPortInfo.port, targetPositions);
                }

                // 5. Read current positions from *all* ports for UI update
                // Read again to show the most up-to-date state (esp. follower after move)
                currentPositionsForUI = await Promise.all(
                    ports.map(async (portInfo) => {
                        if (portInfo.port) {
                            try {
                                // Only read servos 4 and 6 for UI consistency
                                const positions = await syncReadPositions(portInfo.port, [4, 6]);
                                return positions;
                            } catch (error) {
                                console.error(`Error fetching positions for ${portInfo.type}:`, error);
                                return { 4: null, 6: null }; // Default state on error
                            }
                        } else {
                            return { 4: null, 6: null }; // Default state if port not connected
                        }
                    })
                );

            } catch (error) {
                console.error("Error in syncLeaderToFollower loop:", error);
                // Ensure UI state is consistent even on error
                currentPositionsForUI = ports.map(() => ({ 4: null, 6: null }));
            }
        } else {
             // If leader or follower not connected, just read whatever is connected for UI
             currentPositionsForUI = await Promise.all(
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
             // Cannot record if leader or follower is missing
             if (isRecording) {
                console.warn("Recording paused: Leader or Follower port not available.");
             }
        }

        setServoPositions(currentPositionsForUI);

    }, [ports, syncReadPositions, syncMoveServos, isRecording]);

    // Interval effect for polling/syncing when NOT recording
    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null;

        // Only run polling if NOT recording and ports are available
        if (ports.length === 2 && !isRecording) {
            intervalId = setInterval(syncLeaderToFollower, 100); // Slower polling for UI
        } else {
            if (intervalId) {
                clearInterval(intervalId);
            }
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [ports, isRecording, syncLeaderToFollower]);


    // Interval effect specifically for recording
     useEffect(() => {
        let recordingIntervalId: NodeJS.Timeout | null = null;

        if (isRecording) {
            const leaderPortInfo = ports.find(p => p.type === 'leader');
            const followerPortInfo = ports.find(p => p.type === 'follower');

            if (leaderPortInfo?.port && followerPortInfo?.port) {
                console.log("Starting recording interval...");
                // Run recording sync at a higher frequency
                recordingIntervalId = setInterval(syncLeaderToFollower, 33.33); // ~30Hz
            } else {
                 console.warn("Cannot start recording interval: Leader or Follower port missing.");
                 setIsRecording(false); // Stop recording if ports aren't ready
            }
        } else {
             // console.log("Recording is stopped.");
             if (recordingIntervalId) {
                 clearInterval(recordingIntervalId);
             }
        }

        return () => {
            if (recordingIntervalId) {
                console.log("Clearing recording interval.");
                clearInterval(recordingIntervalId);
            }
        };
    }, [isRecording, ports, syncLeaderToFollower]); // Depend on isRecording and ports


    // Handler to toggle recording state
    const handleRecordClick = () => {
        const wasRecording = isRecording;
        setIsRecording(prev => !prev);

        if (!wasRecording) { // About to start recording
            console.log("Starting new episode recording...");
            // Reset current episode data and frame index
            setCurrentEpisodeData([]);
            frameIndexRef.current = 0;
        } else { // About to stop recording
             // Check if the current episode has any data before saving
            if (currentEpisodeData.length > 0) {
                 console.log(`Stopping recording. Episode finished with ${currentEpisodeData.length} frames.`);
                 // Add the completed episode to the list of episodes
                setRecordedEpisodes(prev => [...prev, currentEpisodeData]);
            } else {
                console.log("Stopping recording. No frames recorded in this attempt.");
            }
             // Clear the current episode data regardless
            setCurrentEpisodeData([]);
        }
    };

    // Handler to delete an episode
    const handleDeleteEpisode = (episodeIndex: number) => {
        console.log(`Deleting episode ${episodeIndex + 1}`);
        setRecordedEpisodes(prev => prev.filter((_, index) => index !== episodeIndex));
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
                                    ' Loading...'
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <div className="flex flex-row items-center justify-between mb-2 mt-4">
                <h2 className="text-2xl font-semibold mt-2 mb-2 text-left">Recorded episodes</h2>
                <Button className="rounded-full w-fit" onClick={handleRecordClick} variant={isRecording ? "destructive" : "default"}>
                    {isRecording ? "Stop Recording" : "Record new episode"}
                </Button>
            </div>
            {recordedEpisodes.length > 0 && (
                <div>
                    <ul className="space-y-2">
                        {recordedEpisodes.map((episode, index) => (
                            <Card key={index}>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div className="text-left">
                                        <CardTitle>Episode {index + 1}</CardTitle>
                                        <CardDescription>{episode.length} frames</CardDescription>
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteEpisode(index)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </CardHeader>
                          </Card>
                        ))}
                    </ul>
                     <Button variant="outline" size="sm" className="mt-4 rounded-full" onClick={() => setRecordedEpisodes([])}>
                            Clear all episodes
                    </Button>
                </div>
            )}
        </>
      );
    }

export default RecordTab;