import './App.css'
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button"
import { buildPingPacket } from './utils/serialUtils';

function App() {
  const [port, setPort] = useState<SerialPort | null>(null);

  useEffect(() => {
    async function tryReconnect() {
      const ports = await navigator.serial.getPorts();
      if (ports.length > 0) {
        const port = ports[0];
        console.log('Found previously authorized port:', port);
    
        try {
          if (!port.readable) {
            await port.open({ baudRate: 1000000 });
            console.log('✅ Port opened successfully');
          }
        } catch (error) {
          if (error instanceof DOMException && error.name === "InvalidStateError") {
            // Safe to continue
          } else {
            throw error; // Unexpected error
          }
        }
        setPort(port);
      }
    }
    tryReconnect();
  }, []);
  
  async function connectToSerial() {
    try {
      const selectedPort = await navigator.serial.requestPort();
      await selectedPort.open({ baudRate: 1000000 }); // Open at 1 Mbps
      setPort(selectedPort);
      console.log('✅ Serial port connected:', selectedPort);
    } catch (error) {
      console.error('❌ Error opening serial port:', error);
    }
  }

  async function pingServo(servoId: number) {
    if (!port) return;

    const writer = port.writable?.getWriter();
    const reader = port.readable?.getReader();

    try {
      const packet = buildPingPacket(servoId);
      await writer?.write(packet);
      const { value } = await reader!.read(); // Wait for servo reply
      const data = new Uint8Array(value || []);
      if (data.length >= 6 && data[0] === 0xFF && data[1] === 0xFF) {
        console.log('✅ Servo replied to PING!');
      } else {
        console.warn('❌ Invalid PING response.');
      }
    } catch (error) {
      console.error('Failed to PING servo:', error);
    } finally {
      writer?.releaseLock();
      reader?.releaseLock();
    }
  }

  return (
    <>
      <h1 className="mt-10 mb-10 text-left text-4xl font-bold">Robot OS</h1>
      <div className="p-4">
        <Button 
          onClick={connectToSerial} 
          className="p-2 m-2"
        >
          Connect to Robot
        </Button>

        <Button 
          onClick={() => pingServo(6)} 
          disabled={!port} 
          className="p-2 m-2"
        >
          Ping Servo
        </Button>
      </div>
    </>
  );
}

export default App;