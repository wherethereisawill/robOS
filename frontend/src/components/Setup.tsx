import { Button } from "./ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { useEffect, useState, useCallback } from "react";
import { buildSyncReadPacket } from '@/utils/serialUtils';
import ConnectedCameras from "./ConnectedCameras";

// Define a type for the custom event if not globally available
interface SerialPortEvent extends Event {
    target: SerialPort;
}

function Setup() {
    const [ports, setPorts] = useState<SerialPort[]>([]); // State holds an array of ports
    const [currentPort, setCurrentPort] = useState<SerialPort | null>(null); // Add state for current port

    const syncReadPositions = useCallback(async (port: SerialPort, servoIds: number[]) => {
        if (!port) {
            console.error('No port provided');
            return;
        }

        if (!port.readable || !port.writable) {
            console.error('Port streams are not available');
            return;
        }

        // Check if streams are locked
        if (port.readable.locked || port.writable.locked) {
            console.warn('Port streams are locked, waiting for release...');
            // Wait a bit and check if locks are released
            await new Promise(resolve => setTimeout(resolve, 100));
            if (port.readable.locked || port.writable.locked) {
                console.error('Port streams still locked after waiting, cannot proceed');
                return;
            }
        }

        let writer;
        let reader;
        const expectedResponseLengthPerServo = 8;
        const totalExpectedLength = servoIds.length * expectedResponseLengthPerServo;
        let receivedData = new Uint8Array(0);
        const positions: Record<number, number | null> = {};
    
        try {
          writer = port.writable.getWriter();
          reader = port.readable.getReader();
    
          const packet = buildSyncReadPacket(servoIds);
          await writer.write(packet);
    
          // Read loop to accumulate data until expected length or timeout
          const startTime = Date.now();
          const timeoutMs = 30; // Needs to timeout after 30ms to avoid blocking the main thread
    
          while (receivedData.length < totalExpectedLength && (Date.now() - startTime) < timeoutMs) {
            try {
              const { value, done } = await reader.read();
              if (done) {
                console.warn('Reader stream closed unexpectedly during SYNC READ.');
                break;
              }
              if (value) {
                const newData = new Uint8Array(receivedData.length + value.length);
                newData.set(receivedData);
                newData.set(value, receivedData.length);
                receivedData = newData;
              }
            } catch(readError) {
                console.error("Error during read:", readError);
                break; 
            }
          }
    
          if (receivedData.length < totalExpectedLength) {
              console.warn(`SYNC READ timed out or received incomplete data. Expected ${totalExpectedLength}, got ${receivedData.length} bytes.`);
          }
    
          // Parse the accumulated data
          let currentOffset = 0;
          for (const servoId of servoIds) {
            positions[servoId] = null;
            let packetFound = false;
            for (let i = currentOffset; i <= receivedData.length - expectedResponseLengthPerServo; i++) {
                if (receivedData[i] === 0xFF && receivedData[i+1] === 0xFF && receivedData[i+2] === servoId) {
                    const packetSlice = receivedData.slice(i, i + expectedResponseLengthPerServo);
                    if (packetSlice[4] === 0) {
                        const posLow = packetSlice[5];
                        const posHigh = packetSlice[6];
                        positions[servoId] = (posHigh << 8) | posLow;
                        currentOffset = i + expectedResponseLengthPerServo;
                        packetFound = true;
                        break;
                    } else {
                        console.warn(`❌ Servo ${servoId} response indicates error: ${packetSlice[4]}`);
                        currentOffset = i + expectedResponseLengthPerServo; 
                        packetFound = true;
                        break;
                    }
                }
            }
            if (!packetFound && currentOffset < receivedData.length) {
                console.warn(`Could not find valid response packet for servo ${servoId} starting from offset ${currentOffset}`);
            }
          }
    
          console.log('Final servo positions:', positions);
    
        } catch (error) {
          console.error('Failed SYNC READ:', error);
        } finally {
          // Always release locks in finally block
          if (reader) {
            try {
              reader.releaseLock();
            } catch (e) {
              console.warn('Error releasing reader lock:', e);
            }
          }
          if (writer) {
            try {
              writer.releaseLock();
            } catch (e) {
              console.warn('Error releasing writer lock:', e);
            }
          }
        }
    }, []);

    // Effect for initial connection check on mount
    useEffect(() => {
        async function checkForExistingPorts() {
            const existingPorts = await navigator.serial.getPorts();
            if (existingPorts.length > 0) {
                const successfullyOpenedPorts: SerialPort[] = [];
                for (const p of existingPorts) {
                    try {
                        // Check if port is already connected and has streams
                        if (p.readable && p.writable) {
                            successfullyOpenedPorts.push(p);
                            try {
                                await syncReadPositions(p, [4, 6]);
                            } catch (readError) {
                                console.warn('Failed to read positions from ready port:', readError);
                            }
                            continue;
                        }

                        // If port is in an intermediate state, wait a bit
                        if (p.connected) {
                            console.log('Port is connected but streams not ready, waiting...');
                            await new Promise(resolve => setTimeout(resolve, 50));
                            // Recheck state after waiting
                            if (p.readable && p.writable) {
                                console.log('Port streams now ready after waiting');
                                successfullyOpenedPorts.push(p);
                                try {
                                    await syncReadPositions(p, [4, 6]);
                                } catch (readError) {
                                    console.warn('Failed to read positions from ready port:', readError);
                                }
                                continue;
                            }
                        }

                        // If we get here, try to open the port
                        await p.open({ baudRate: 1000000 });
                        successfullyOpenedPorts.push(p);
                        await syncReadPositions(p, [4, 6]);

                    } catch (error) {
                        if (error instanceof DOMException && error.name === "InvalidStateError") {
                            console.log('Port in invalid state, may be opening or already open');
                            // Wait a bit to let any in-progress operations complete
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            
                            // Check if the port is now usable
                            if (p.readable && p.writable) {
                                console.log('Port is now ready after waiting');
                                successfullyOpenedPorts.push(p);
                                try {
                                    await syncReadPositions(p, [4, 6]);
                                } catch (readError) {
                                    console.warn('Failed to read positions:', readError);
                                }
                            } else {
                                console.warn('Port still not ready after waiting');
                            }
                        } else {
                            console.error('Error handling port:', error);
                        }
                    }
                }
                setPorts(successfullyOpenedPorts);
                if (successfullyOpenedPorts.length > 0) {
                    setCurrentPort(successfullyOpenedPorts[0]);
                }
            }
        }
        if (navigator.serial) {
            checkForExistingPorts();
        } else {
             console.warn("Web Serial API not supported by this browser.");
        }
    }, [syncReadPositions]); // Add syncReadPositions to dependencies

    // Effect for handling connect/disconnect events
    useEffect(() => {
        if (!navigator.serial) {
            return;
        }

        const handleConnect = async (event: Event) => {
            // Cast event properly, using the interface if needed
            const newPort = (event as SerialPortEvent).target;
            console.log('USB device connected (event):', newPort);

            // Check if the port is already in our list
            if (ports.some(p => p === newPort)) {
                console.log('Ignoring connect event as this port is already tracked.');
                return;
            }

            try {
                console.log('Port initial state:', {
                    readable: newPort.readable,
                    writable: newPort.writable
                });

                if (!newPort.readable) {
                    console.log('Opening port...');
                    await newPort.open({ baudRate: 1000000 });
                    console.log('✅ Newly connected USB port opened successfully');
                }

                console.log('Port state after opening:', {
                    readable: newPort.readable,
                    writable: newPort.writable
                });

                setPorts(prevPorts => [...prevPorts, newPort]); // Add the new port to the array
                setCurrentPort(newPort); // Set as current port
                
                // Verify port state before reading
                console.log('Port state before reading:', {
                    readable: newPort.readable,
                    writable: newPort.writable
                });
                
                // Call syncReadPositions for servos 4 and 6
                console.log('Attempting to read servo positions...');
                await syncReadPositions(newPort, [4, 6]);
            } catch (error) {
                console.error('Error in connection process:', error);
            }
        };

        const handleDisconnect = (event: Event) => {
            // Cast event properly
            const disconnectedPort = (event as SerialPortEvent).target;
            console.log('USB device disconnected (event):', disconnectedPort);
            
            // If the disconnected port was the current port, clear it
            if (currentPort === disconnectedPort) {
                setCurrentPort(null);
            }
            
            // Check if the disconnected port is the one currently in state
            setPorts(prevPorts => {
                const portExists = prevPorts.some(p => p === disconnectedPort);
                if (portExists) {
                    console.log('Removing disconnected port from active list:', disconnectedPort);
                    // Don't call port.close() here, as the disconnect event implies it's already gone
                    return prevPorts.filter(p => p !== disconnectedPort); // Remove the port
                }
                return prevPorts; // Return unchanged array if the port wasn't tracked
            });
        };

        navigator.serial.addEventListener('connect', handleConnect);
        navigator.serial.addEventListener('disconnect', handleDisconnect);

        // Cleanup function
        return () => {
            navigator.serial.removeEventListener('connect', handleConnect);
            navigator.serial.removeEventListener('disconnect', handleDisconnect);
        };
        // Depend on 'ports' array itself to re-evaluate if needed, though listener logic is stable
    }, [ports]);

    async function connectToSerial() {
        try {
            const selectedPort = await navigator.serial.requestPort();

             // Check if the selected port is already in the list
            if (ports.some(p => p === selectedPort)) {
                console.log('Selected port is already connected and tracked.');
                // Optionally, provide feedback to the user.
                 // Potentially re-open if needed, though requestPort usually grants a fresh object?
                 // For now, just log and don't re-add.
                 try {
                     if (!selectedPort.readable) {
                         await selectedPort.open({ baudRate: 1000000 });
                         console.log('✅ Re-opened already tracked port:', selectedPort);
                     }
                 } catch (error) {
                     console.error('Error trying to re-open already tracked port:', error)
                 }
                return;
            }

            await selectedPort.open({ baudRate: 1000000 });
            setPorts(prevPorts => [...prevPorts, selectedPort]); // Add the newly connected port
            console.log('✅ USB port connected via button:', selectedPort);
        } catch (error) {
            // Handle user cancellation specifically
            if (error instanceof DOMException && error.name === 'NotFoundError') {
                console.log('User cancelled the port selection dialog.');
            } else {
                 console.error('❌ Error opening serial port via button:', error);
            }
        }
    }

    // Helper function to get some identifiable info from the port
    const getPortIdentifier = (port: SerialPort, index: number): string => {
        const portInfo = port.getInfo();
        // Use available info, or fallback to index
        return portInfo.usbVendorId && portInfo.usbProductId
            ? `Vendor ID: ${portInfo.usbVendorId}, Product ID: ${portInfo.usbProductId}`
            : `Robot ${index + 1}`;
    }

    return (
        <>
            <div className="flex flex-row items-center justify-between mb-2">
                <h2 className="text-2xl font-semibold mt-2 mb-2 text-left">Connected robots</h2>
                <Button onClick={connectToSerial} className="rounded-full w-fit">Add robot</Button>
            </div>
            {ports.length > 0 ? (
                 ports.map((port, index) => (
                    <Card key={index} className="gap-y-0 mb-4"> {/* Added mb-4 for spacing */}
                        <CardHeader>
                            {/* Use getPortIdentifier for a more specific title */}
                            <CardTitle>Robot connected</CardTitle>
                            <CardDescription>{getPortIdentifier(port, index)}</CardDescription>
                        </CardHeader>
                        {/* Optionally add CardContent or CardFooter with more details or actions */}
                    </Card>
                 ))
            ) : (
                <Card className="gap-y-0 mb-10">
                    <div className="w-[300px] mx-auto">
                        <AspectRatio ratio={1}>
                            <img src="/arm.png" alt="Robot arm" className="rounded-md object-cover" />
                        </AspectRatio>
                    </div>
                    <CardHeader>
                        <CardTitle>No robots connected</CardTitle>
                        <CardDescription>Connect a robot to get started</CardDescription>
                    </CardHeader>
                </Card>
            )}
            <ConnectedCameras />
        </>
      );
    }
    
export default Setup;