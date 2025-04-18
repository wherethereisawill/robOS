import ConnectedCameras from "./ConnectedCameras";
import ConnectedRobots from "./ConnectedRobots";
import { TokenConfig } from "./TokenConfig";
import { PortInfo } from "@/types/serial";
import { MediaDevice, ActiveCamera } from "@/types/camera";
import { RefObject } from "react";

// Define props for Setup
interface SetupProps {
    ports: PortInfo[];
    onConnectRobot: (robotType: 'leader' | 'follower') => Promise<void>;
    activeCameras: ActiveCamera[];
    streamsRef: RefObject<Map<string, MediaStream>>;
    onStartCamera: (device: MediaDevice) => Promise<void>;
}

function Setup({ ports, onConnectRobot, activeCameras, streamsRef, onStartCamera }: SetupProps) {
    // const syncReadPositions = useCallback(async (port: SerialPort, servoIds: number[]) => {
    //     if (!port) {
    //         console.error('No port provided');
    //         return;
    //     }

    //     if (!port.readable || !port.writable) {
    //         console.error('Port streams are not available');
    //         return;
    //     }

    //     // Check if streams are locked
    //     if (port.readable.locked || port.writable.locked) {
    //         console.warn('Port streams are locked, waiting for release...');
    //         // Wait a bit and check if locks are released
    //         await new Promise(resolve => setTimeout(resolve, 100));
    //         if (port.readable.locked || port.writable.locked) {
    //             console.error('Port streams still locked after waiting, cannot proceed');
    //             return;
    //         }
    //     }

    //     let writer;
    //     let reader;
    //     const expectedResponseLengthPerServo = 8;
    //     const totalExpectedLength = servoIds.length * expectedResponseLengthPerServo;
    //     let receivedData = new Uint8Array(0);
    //     const positions: Record<number, number | null> = {};
    
    //     try {
    //       writer = port.writable.getWriter();
    //       reader = port.readable.getReader();
    
    //       const packet = buildSyncReadPacket(servoIds);
    //       await writer.write(packet);
    
    //       // Read loop to accumulate data until expected length or timeout
    //       const startTime = Date.now();
    //       const timeoutMs = 30; // Needs to timeout after 30ms to avoid blocking the main thread
    
    //       while (receivedData.length < totalExpectedLength && (Date.now() - startTime) < timeoutMs) {
    //         try {
    //           const { value, done } = await reader.read();
    //           if (done) {
    //             console.warn('Reader stream closed unexpectedly during SYNC READ.');
    //             break;
    //           }
    //           if (value) {
    //             const newData = new Uint8Array(receivedData.length + value.length);
    //             newData.set(receivedData);
    //             newData.set(value, receivedData.length);
    //             receivedData = newData;
    //           }
    //         } catch(readError) {
    //             console.error("Error during read:", readError);
    //             break; 
    //         }
    //       }
    
    //       if (receivedData.length < totalExpectedLength) {
    //           console.warn(`SYNC READ timed out or received incomplete data. Expected ${totalExpectedLength}, got ${receivedData.length} bytes.`);
    //       }
    
    //       // Parse the accumulated data
    //       let currentOffset = 0;
    //       for (const servoId of servoIds) {
    //         positions[servoId] = null;
    //         let packetFound = false;
    //         for (let i = currentOffset; i <= receivedData.length - expectedResponseLengthPerServo; i++) {
    //             if (receivedData[i] === 0xFF && receivedData[i+1] === 0xFF && receivedData[i+2] === servoId) {
    //                 const packetSlice = receivedData.slice(i, i + expectedResponseLengthPerServo);
    //                 if (packetSlice[4] === 0) {
    //                     const posLow = packetSlice[5];
    //                     const posHigh = packetSlice[6];
    //                     positions[servoId] = (posHigh << 8) | posLow;
    //                     currentOffset = i + expectedResponseLengthPerServo;
    //                     packetFound = true;
    //                     break;
    //                 } else {
    //                     console.warn(`❌ Servo ${servoId} response indicates error: ${packetSlice[4]}`);
    //                     currentOffset = i + expectedResponseLengthPerServo; 
    //                     packetFound = true;
    //                     break;
    //                 }
    //             }
    //         }
    //         if (!packetFound && currentOffset < receivedData.length) {
    //             console.warn(`Could not find valid response packet for servo ${servoId} starting from offset ${currentOffset}`);
    //         }
    //       }
    
    //       console.log('Final servo positions:', positions);
    
    //     } catch (error) {
    //       console.error('Failed SYNC READ:', error);
    //     } finally {
    //       // Always release locks in finally block
    //       if (reader) {
    //         try {
    //           reader.releaseLock();
    //         } catch (e) {
    //           console.warn('Error releasing reader lock:', e);
    //         }
    //       }
    //       if (writer) {
    //         try {
    //           writer.releaseLock();
    //         } catch (e) {
    //           console.warn('Error releasing writer lock:', e);
    //         }
    //       }
    //     }
    // }, []);

    return (
        <div className="space-y-6">
            <TokenConfig />
            <ConnectedRobots ports={ports} onConnectRobot={onConnectRobot} />
            <ConnectedCameras 
                activeCameras={activeCameras} 
                streamsRef={streamsRef} 
                onStartCamera={onStartCamera} 
            />
        </div>
    );
}

export default Setup;
