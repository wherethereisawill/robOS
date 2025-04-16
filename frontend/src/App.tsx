import { useState, useEffect, useRef } from 'react';
import './App.css'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Setup from '@/components/Setup';
import RecordTab from '@/components/RecordTab';
import { PortInfo } from '@/types/serial';
import { MediaDevice, ActiveCamera } from '@/types/camera';

function App() {
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [activeCameras, setActiveCameras] = useState<ActiveCamera[]>([]);
  const streamsRef = useRef<Map<string, MediaStream>>(new Map());

  useEffect(() => {
    const handleDisconnect = (event: Event) => {
      const port = event.target as SerialPort;
      console.log('Disconnect event for port:', port);
      setPorts((prev) => prev.filter((p) => p.port !== port));
    };
    if (navigator.serial) {
        navigator.serial.addEventListener('disconnect', handleDisconnect);
    }
    return () => {
      if (navigator.serial) {
        navigator.serial.removeEventListener('disconnect', handleDisconnect);
      }
    };
  }, [setPorts]);

  // Connect to serial port
  async function connectToSerial(robotType: 'leader' | 'follower') {
    try {
        // Ensure navigator.serial is available
        if (!navigator.serial) {
            console.error('Web Serial API not supported by this browser.');
            alert('Web Serial API is not supported by this browser.');
            return;
        }
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
                // Attempt to gracefully close the port if opening failed mid-way
                try {
                    await selectedPort.close();
                    console.log('Attempted to close port after opening error.');
                } catch (closeError) {
                    console.error('Error closing port after failed open:', closeError);
                }
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

  // Cleanup camera streams on unmount
  useEffect(() => {
    return () => {
        console.log("App unmounting, cleaning up camera streams...");
        streamsRef.current.forEach((stream, streamId) => {
            stream.getTracks().forEach(track => track.stop());
            console.log(`Stopped stream: ${streamId}`);
        });
        streamsRef.current.clear();
        setActiveCameras([]);
    };
  }, []);

  // Function to start a camera (passed down)
  const startCamera = async (device: MediaDevice) => {
    console.log("Attempting to start camera:", device.label);
    // Prevent adding the same device multiple times
    if (activeCameras.some(cam => cam.deviceId === device.deviceId)) {
        console.warn(`Camera ${device.label} (${device.deviceId}) is already active.`);
        return;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: device.deviceId } }
        });

        const streamId = crypto.randomUUID();
        streamsRef.current.set(streamId, stream);
        console.log(`Stream ${streamId} added to ref for device ${device.deviceId}`);

        const newCamera: ActiveCamera = {
            deviceId: device.deviceId,
            label: device.label,
            kind: device.kind,
            groupId: device.groupId,
            streamId
        };

        setActiveCameras(prev => [...prev, newCamera]);
        console.log("Active cameras updated:", [...activeCameras, newCamera]);

    } catch (error) {
        console.error(`Error starting camera ${device.label}:`, error);
        // If starting fails, ensure we don't leave a dangling stream in the ref (though unlikely)
        const potentiallyAddedStream = Array.from(streamsRef.current.entries())
                                           .find(([_, s]) => s.getVideoTracks()[0]?.getSettings().deviceId === device.deviceId);
        if (potentiallyAddedStream) {
            const [streamId, stream] = potentiallyAddedStream;
            stream.getTracks().forEach(track => track.stop());
            streamsRef.current.delete(streamId);
            console.log(`Cleaned up stream ${streamId} after start error.`);
        }
    }
  };

  return (
    <>
      <h1 className="mt-10 mb-10 text-left text-4xl font-bold">RobOS</h1>
      <Tabs defaultValue="setup" className="w-full">
      <TabsList className="mb-4">
          <TabsTrigger className="hover:cursor-pointer" value="setup">Setup</TabsTrigger>
          <TabsTrigger className="hover:cursor-pointer" value="record">Record</TabsTrigger>
          <TabsTrigger className="hover:cursor-pointer" value="train">Train</TabsTrigger>
      </TabsList>
      <TabsContent value="setup">
          <Setup 
              ports={ports} 
              onConnectRobot={connectToSerial} 
              activeCameras={activeCameras} 
              streamsRef={streamsRef} 
              onStartCamera={startCamera} 
          />
      </TabsContent>
      <TabsContent value="record">
          <RecordTab 
              ports={ports} 
              activeCameras={activeCameras} 
              streamsRef={streamsRef} 
          />
      </TabsContent>
      <TabsContent value="train">Train.</TabsContent>
      </Tabs>
    </>
  );
}

export default App;