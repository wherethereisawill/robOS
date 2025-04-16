import { useState, useEffect } from 'react';
import './App.css'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Setup from '@/components/Setup';
import Archive from '@/components/Archive';
import TeleopTab from '@/components/TeleopTab';
import { PortInfo } from '@/types/serial';

function App() {
  const [ports, setPorts] = useState<PortInfo[]>([]);

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
            alert('Web Serial API is not supported by this browser.'); // Inform user
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

  return (
    <>
      <h1 className="mt-10 mb-10 text-left text-4xl font-bold">RobOS</h1>
      <Tabs defaultValue="setup" className="w-full">
      <TabsList className="mb-4">
          <TabsTrigger className="hover:cursor-pointer" value="setup">Setup</TabsTrigger>
          <TabsTrigger className="hover:cursor-pointer" value="teleop">Teleop</TabsTrigger>
          <TabsTrigger className="hover:cursor-pointer" value="datasets">Datasets</TabsTrigger>
          <TabsTrigger className="hover:cursor-pointer" value="policies">Policies</TabsTrigger>
          <TabsTrigger className="hover:cursor-pointer" value="archive">Archive</TabsTrigger>
      </TabsList>
      <TabsContent value="setup"><Setup ports={ports} onConnectRobot={connectToSerial} /></TabsContent>
      <TabsContent value="teleop"><TeleopTab ports={ports} /></TabsContent>
      <TabsContent value="datasets">Datasets.</TabsContent>
      <TabsContent value="policies">Policies.</TabsContent>
      <TabsContent value="archive"><Archive /></TabsContent>
      </Tabs>
    </>
  );
}

export default App;