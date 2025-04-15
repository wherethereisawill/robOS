import { CardHeader, CardTitle, CardDescription } from "./ui/card";
import { AspectRatio } from "@radix-ui/react-aspect-ratio";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { useState, useRef, useEffect } from "react";

interface MediaDevice {
    deviceId: string;
    label: string;
    kind: string;
    groupId: string;
}

interface ActiveCamera extends MediaDevice {
    streamId: string;
}

function ConnectedCameras() {
    const [videoDevices, setVideoDevices] = useState<MediaDevice[]>([]);
    const [activeCameras, setActiveCameras] = useState<ActiveCamera[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const streamsRef = useRef<Map<string, MediaStream>>(new Map());

    const listConnectedCameras = async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const cameras = devices.filter(device => device.kind === 'videoinput');
            // Filter out already active cameras
            const availableCameras = cameras.filter(
                camera => !activeCameras.some(active => active.deviceId === camera.deviceId)
            );
            setVideoDevices(availableCameras as MediaDevice[]);
        } catch (error) {
            console.error('Error listing cameras:', error);
        }
    };

    const startCamera = async (device: MediaDevice) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: device.deviceId } }
            });

            const streamId = crypto.randomUUID();
            streamsRef.current.set(streamId, stream);

            const newCamera: ActiveCamera = {
                deviceId: device.deviceId,
                label: device.label,
                kind: device.kind,
                groupId: device.groupId,
                streamId
            };

            setActiveCameras(prev => [...prev, newCamera]);
            setIsOpen(false);
        } catch (error) {
            console.error('Error starting camera:', error);
        }
    };

    // Cleanup streams when component unmounts
    useEffect(() => {
        return () => {
            streamsRef.current.forEach(stream => {
                stream.getTracks().forEach(track => track.stop());
            });
            streamsRef.current.clear();
        };
    }, []);

    function CameraStream({ stream }: { stream: MediaStream }) {
        const videoRef = useRef<HTMLVideoElement>(null);
    
        useEffect(() => {
            const videoElement = videoRef.current;
            if (videoElement && stream) {
                videoElement.srcObject = stream;
                return () => {
                    if (videoElement.srcObject === stream) {
                        videoElement.srcObject = null;
                    }
                };
            }
        }, [stream]);
    
        return (
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="rounded-md object-cover w-full h-full"
            />
        );
    }

    return (
        <>
            <div className="flex flex-row items-center justify-between mb-2">
                <h2 className="text-2xl font-semibold mt-2 mb-2 text-left">Connected cameras</h2>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={listConnectedCameras} className="rounded-full w-fit">
                            Add camera
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Select a camera</DialogTitle>
                            <DialogDescription> 
                                Choose one of the available cameras.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col gap-2">
                            {videoDevices.map((device) => (
                                <Button 
                                    key={device.deviceId}
                                    onClick={() => startCamera(device)}
                                    className="rounded-full"
                                    variant="secondary"
                                >
                                    {device.label || `Camera ${device.deviceId.slice(0, 4)}`}
                                </Button>
                            ))}
                        </div>
                        {videoDevices.length === 0 && (
                            <div key="no-cameras" className="text-sm text-muted-foreground mt-0">
                                No additional cameras available.
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
            <div>
                {activeCameras.length === 0 ? (
                    <Card key="no-cameras-card" className="gap-y-0">
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
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeCameras.map((camera) => (
                            <Card key={camera.deviceId} className="gap-y-5">
                                <div className="w-[300px] mx-auto">
                                    <AspectRatio ratio={1}>
                                        <CameraStream 
                                            key={camera.streamId} 
                                            stream={streamsRef.current.get(camera.streamId)!} 
                                        />
                                    </AspectRatio>
                                </div>
                                <CardHeader>
                                    <CardTitle>
                                        {camera.label || `Camera ${camera.deviceId.slice(0, 4)}`}
                                    </CardTitle>
                                    <CardDescription>
                                        Connected
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

export default ConnectedCameras;