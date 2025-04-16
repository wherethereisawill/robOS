import { CardHeader } from "./ui/card"
import { CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Card, CardDescription } from "./ui/card"
import { AspectRatio } from "@radix-ui/react-aspect-ratio"
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from "lucide-react"

// Define the type for the state array elements
interface PortInfo {
    port: SerialPort;
    type: 'leader' | 'follower';
}

function ConnectedRobots() {
    // Update state to hold PortInfo objects
    const [ports, setPorts] = useState<PortInfo[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    // Reset ports on page load
    useEffect(() => {
        setPorts([]);
    }, []);

    // Get the robot type
    const getRobotType = (portInfo: PortInfo) => {
        return `${portInfo.type.charAt(0).toUpperCase() + portInfo.type.slice(1)}`;
    };

    // Handle unplug event
    useEffect(() => {
        const handleDisconnect = (event: Event) => {
          const port = event.target as SerialPort;
          setPorts((prev) => prev.filter((p) => p.port !== port));
        };
        navigator.serial.addEventListener('disconnect', handleDisconnect);
        return () => {
          navigator.serial.removeEventListener('disconnect', handleDisconnect);
        };
      }, [setPorts]);

    // Update connectToSerial to accept robotType
    async function connectToSerial(robotType: 'leader' | 'follower') {
        try {
            const selectedPort = await navigator.serial.requestPort();

            const existingPortIndex = ports.findIndex(p => p.port === selectedPort);

            if (existingPortIndex !== -1) {
                // Port already exists, update its type
                setPorts(prevPorts => {
                    const updatedPorts = [...prevPorts];
                    updatedPorts[existingPortIndex] = { ...updatedPorts[existingPortIndex], type: robotType };
                    console.log(`✅ Updated robot type for port to: ${robotType}`, selectedPort);
                    return updatedPorts;
                });
            } else {
                // New port, try to open and add it
                try {
                    await selectedPort.open({ baudRate: 1000000 });
                    setPorts(prevPorts => [...prevPorts, { port: selectedPort, type: robotType }]);
                    console.log(`✅ Added new port with type ${robotType}:`, selectedPort);
                } catch (error) {
                    console.error(`❌ Error opening new serial port:`, error);
                }
            }
        } catch (error) {
            if (error instanceof DOMException && error.name === 'NotFoundError') {
                console.log('User cancelled the port selection dialog.');
            } else {
                 console.error('❌ Error requesting/handling serial port:', error);
            }
        }
    }

    return (
        <>
            <div className="flex flex-row items-center justify-between mb-2">
                <h2 className="text-2xl font-semibold mt-2 mb-2 text-left">Connected robots</h2>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button className="rounded-full w-fit">Add robot</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Choose robot type</DialogTitle>
                            <DialogDescription>
                            </DialogDescription>
                        </DialogHeader>
                        {ports.length != 2 && (
                            <Alert>
                                <Terminal className="h-4 w-4" />
                                <AlertTitle>Unplug the arm you want to connect before continuing!</AlertTitle>
                            <AlertDescription>
                                After selecting "Follower" or "Leader" your browser will display a list of available ports. Once the list is shown, plug in your arm and select it from the list.
                                </AlertDescription>
                            </Alert>
                        )}
                        {!ports.some(p => p.type === 'follower') && (
                            <Button onClick={async () => {
                                await connectToSerial('follower');
                                setIsOpen(false);
                            }} variant="secondary" className="rounded-full">Follower</Button>
                        )}
                        {!ports.some(p => p.type === 'leader') && (
                            <Button onClick={async () => {
                                await connectToSerial('leader');
                                setIsOpen(false);
                            }} variant="secondary" className="rounded-full">Leader</Button>
                        )}
                        {ports.some(p => p.type === 'follower') && ports.some(p => p.type === 'leader') && (
                            <p className="text-sm text-muted-foreground">Both leader and follower arms are already connected.</p>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
            {ports.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                    {ports.map((portInfo, index) => (
                        <Card key={index} className="gap-y-0 mb-4">
                            <div className="w-[300px] mx-auto">
                                <AspectRatio ratio={1}>
                                    <img src={portInfo.type === 'follower' ? '/followerArm.png' : '/leaderArm.png'} alt="Robot arm" className="rounded-md object-cover" />
                                </AspectRatio>
                            </div>
                            <CardHeader>
                                <CardTitle>so100</CardTitle>
                                <CardDescription>{getRobotType(portInfo)}</CardDescription>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="gap-y-0 mb-10">
                    <div className="w-[300px] mx-auto">
                        <AspectRatio ratio={1}>
                            <img src="/followerArm.png" alt="Robot arm" className="rounded-md object-cover" />
                        </AspectRatio>
                    </div>
                    <CardHeader>
                        <CardTitle>No robots connected</CardTitle>
                        <CardDescription>Connect a robot to get started</CardDescription>
                    </CardHeader>
                </Card>
            )}
        </>
    );
}

export default ConnectedRobots;