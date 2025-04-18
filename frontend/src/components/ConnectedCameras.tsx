import { CardHeader, CardTitle, CardDescription } from "./ui/card";
import { AspectRatio } from "@radix-ui/react-aspect-ratio";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { useState, useRef, useEffect, RefObject } from "react";
import { MediaDevice, ActiveCamera } from "@/types/camera";

// Define props for ConnectedCameras
interface ConnectedCamerasProps {
    activeCameras: ActiveCamera[];
    streamsRef: RefObject<Map<string, MediaStream>>;
    onStartCamera: (device: MediaDevice) => Promise<void>;
}

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
            muted
            className="rounded-md object-cover w-full h-full"
        />
    );
}

function ConnectedCameras({ activeCameras, streamsRef, onStartCamera }: ConnectedCamerasProps) {
    const [videoDevices, setVideoDevices] = useState<MediaDevice[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoadingCameras, setIsLoadingCameras] = useState(false);

    const listConnectedCameras = async () => {
        console.log("Listing available cameras...");
        setIsLoadingCameras(true);
        setVideoDevices([]);
        try {
            await navigator.mediaDevices.getUserMedia({ video: true });

            const devices = await navigator.mediaDevices.enumerateDevices();
            const allCameras = devices.filter(device => device.kind === 'videoinput');
            
            const availableCameras = allCameras.filter(
                camera => !activeCameras.some(active => active.deviceId === camera.deviceId)
            );
            console.log("Available cameras found:", availableCameras);
            setVideoDevices(availableCameras as MediaDevice[]);
        } catch (error) {
            console.error('Error listing cameras or getting permissions:', error);
        } finally {
            setIsLoadingCameras(false);
        }
    };

    return (
        <>
            <div className="flex flex-row items-center justify-between mb-2">
                <h2 className="text-2xl font-semibold mt-2 mb-2 text-left">Cameras</h2>
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
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col gap-2">
                            {isLoadingCameras ? (
                                <div className="text-sm text-muted-foreground">Loading...</div>
                            ) : videoDevices.length > 0 ? (
                                videoDevices.map((device) => (
                                    <Button 
                                        key={device.deviceId}
                                        onClick={async () => {
                                            await onStartCamera(device); 
                                            setIsOpen(false);
                                        }}
                                        className="rounded-full"
                                        variant="secondary"
                                    >
                                        {device.label || `Camera ${device.deviceId.slice(0, 4)}`}
                                    </Button>
                                ))
                            ) : (
                                <div key="no-cameras" className="text-sm text-muted-foreground mt-0">
                                    No additional cameras available or found.
                                </div>
                            )}
                        </div>
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
                        {activeCameras.map((camera) => {
                            const stream = streamsRef.current?.get(camera.streamId);
                            return (
                                <Card key={camera.deviceId} className="gap-y-5">
                                    <div className="w-[300px] mx-auto">
                                        <AspectRatio ratio={1}>
                                            {stream ? (
                                                <CameraStream 
                                                    key={camera.streamId}
                                                    stream={stream} 
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full bg-muted rounded-md">
                                                    <p className="text-xs text-muted-foreground">Stream unavailable</p>
                                                </div>
                                            )}
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
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}

export default ConnectedCameras;