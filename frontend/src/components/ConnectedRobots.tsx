import { CardHeader } from "./ui/card"
import { CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Card, CardDescription } from "./ui/card"
import { AspectRatio } from "@radix-ui/react-aspect-ratio"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useState } from "react";
import { PortInfo } from "@/types/serial";
import { AlertCircle } from "lucide-react"


// Define props for ConnectedRobots
interface ConnectedRobotsProps {
    ports: PortInfo[];
    onConnectRobot: (robotType: 'leader' | 'follower') => Promise<void>;
}

function ConnectedRobots({ ports, onConnectRobot }: ConnectedRobotsProps) {
    // Dialog open state remains local to this component
    const [isOpen, setIsOpen] = useState(false);

    // Get the robot type (this can stay local)
    const getRobotType = (portInfo: PortInfo) => {
        return `${portInfo.type.charAt(0).toUpperCase() + portInfo.type.slice(1)}`;
    };

    return (
        <>
            <div className="flex flex-row items-center justify-between mb-2">
                <h2 className="text-2xl font-semibold mt-2 mb-2 text-left">Robots</h2>
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
                            <Alert className="bg-slate-50">
                                <AlertCircle className="h-4 w-4 stroke-black" />
                                <AlertTitle className="text-slate-950">Unplug the arm you want to connect before continuing!</AlertTitle>
                                <AlertDescription className="text-slate-950">
                                    After selecting "Follower" or "Leader" your browser will display a list of available ports. Once the list is shown, plug in your arm and select it from the list.
                                </AlertDescription>
                            </Alert>
                        )}
                        {!ports.some(p => p.type === 'follower') && (
                            <Button onClick={async () => {
                                await onConnectRobot('follower');
                                setIsOpen(false);
                            }} variant="secondary" className="rounded-full">Follower</Button>
                        )}
                        {!ports.some(p => p.type === 'leader') && (
                            <Button onClick={async () => {
                                await onConnectRobot('leader');
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