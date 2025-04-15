import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { useEffect, useState } from "react";

// Define a type for the custom event if not globally available
interface SerialPortEvent extends Event {
    target: SerialPort;
}

function Setup() {

    const [ports, setPorts] = useState<SerialPort[]>([]); // State holds an array of ports

    // Effect for initial connection check on mount
    useEffect(() => {
        async function checkForExistingPorts() {
            const existingPorts = await navigator.serial.getPorts();
            if (existingPorts.length > 0) {
                console.log('Found previously authorized usb ports:', existingPorts);
                const successfullyOpenedPorts: SerialPort[] = [];
                for (const p of existingPorts) {
                    try {
                        // Attempt to open only if not already open - check readable state
                        if (!p.readable) {
                            await p.open({ baudRate: 1000000 });
                            console.log('✅ Previously authorized USB port opened successfully:', p);
                        } else {
                             console.log('Previously authorized USB port already open:', p);
                        }
                        successfullyOpenedPorts.push(p); // Add the port
                    } catch (error) {
                        if (error instanceof DOMException && error.name === "InvalidStateError") {
                            // Port might already be open from another context or failed to close properly
                            console.warn('Port already open or in invalid state on initial check:', p, error);
                            // Assume it's usable if already open
                            successfullyOpenedPorts.push(p);
                        } else {
                            console.error('Error opening previously authorized port on initial check:', p, error);
                            // Do not add port if opening failed
                        }
                    }
                }
                setPorts(successfullyOpenedPorts); // Set the initial ports state
            }
        }
        if (navigator.serial) {
            checkForExistingPorts();
        } else {
             console.warn("Web Serial API not supported by this browser.");
        }
    }, []); // Empty dependency array: runs only once on mount

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
                if (!newPort.readable) {
                    await newPort.open({ baudRate: 1000000 });
                    console.log('✅ Newly connected USB port opened successfully');
                }
                setPorts(prevPorts => [...prevPorts, newPort]); // Add the new port to the array
            } catch (error) {
                console.error('Error opening newly connected port:', error);
            }
        };

        const handleDisconnect = (event: Event) => {
            // Cast event properly
            const disconnectedPort = (event as SerialPortEvent).target;
            console.log('USB device disconnected (event):', disconnectedPort);
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
            <div className="flex flex-row items-center justify-between mb-2">
                <h2 className="text-2xl font-semibold mt-2 mb-2 text-left">Connected cameras</h2>
                <Button className="rounded-full w-fit">Add camera</Button>
            </div>
                <Card className="gap-y-0">
                <div className="w-[300px] mx-auto">
                    <AspectRatio ratio={1}>
                        <img src="/cam.png" alt="Robot arm" className="rounded-md object-cover" />
                    </AspectRatio>
                </div>
                <CardHeader>
                    <CardTitle>No cameras connected</CardTitle>
                    <CardDescription>Connect a camera to get started</CardDescription>
                </CardHeader>
            </Card>
        </>
      );
    }
    
export default Setup;