// import './App.css'
import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button"
import { buildPingPacket, buildSyncReadPacket } from '@/utils/serialUtils';

function Archive() {
  const [port, setPort] = useState<SerialPort | null>(null);
  const [servoPositions, setServoPositions] = useState<Record<number, number | null>>({});
  const isReading = useRef(false);

  useEffect(() => {
    async function tryReconnect() {
      const ports = await navigator.serial.getPorts();
      if (ports.length > 0) {
        const port = ports[0];
        console.log('Found previously authorized usb port:', port);
    
        try {
          if (!port.readable) {
            await port.open({ baudRate: 1000000 });
            console.log('✅ USB port opened successfully');
          }
        } catch (error) {
          if (error instanceof DOMException && error.name === "InvalidStateError") {
          } else {
            throw error;
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
      await selectedPort.open({ baudRate: 1000000 });
      setPort(selectedPort);
      console.log('✅ USB port connected:', selectedPort);
    } catch (error) {
      console.error('❌ Error opening serial port:', error);
    }
  }

  async function disconnectSerial() {
    if (!port) return;
    try {
      const writer = port.writable?.getWriter();
      const reader = port.readable?.getReader();
  
      try {
        writer?.releaseLock();
        reader?.releaseLock();
      } catch (e) {
        console.warn('No active writer/reader to release.');
      }
      await port.close();
      console.log('✅ USB port closed.');
      setPort(null);
    } catch (error) {
      console.error('❌ Error closing serial port:', error);
    }
  }  

  async function pingServo(servoId: number) {
    if (!port) return;
    const writer = port.writable?.getWriter();
    const reader = port.readable?.getReader();
    try {
      const packet = buildPingPacket(servoId);
      await writer?.write(packet);
      console.log('Sent PING to servo:', servoId);
      const { value, done } = await reader!.read(); 
      if (done) {
        console.warn('Reader closed before PING response.');
        return;
      }
      const data = new Uint8Array(value || []);
      if (data.length >= 6 && data[0] === 0xFF && data[1] === 0xFF && data[2] === servoId) {
        if (data[4] === 0) { 
            console.log(`✅ Servo ${servoId} replied to PING successfully!`);
        } else {
            console.warn(`❌ Servo ${servoId} PING response indicates error: ${data[4]}`);
        }
      } else if (data.length > 0) {
        console.warn(`❌ Invalid PING response from servo ${servoId}. Length: ${data.length}, Header: ${data[0]?.toString(16)}, ${data[1]?.toString(16)}`);
      } else {
          console.warn(`❌ No PING response received from servo ${servoId}.`);
      }
    } catch (error) {
      console.error(`Failed to PING servo ${servoId}:`, error);
    } finally {
      try { reader?.releaseLock(); } catch (e) { console.warn('Reader lock already released or cancelled.'); }
      try { writer?.releaseLock(); } catch (e) { console.warn('Writer lock already released.'); }
    }
  }

  const syncReadPositions = useCallback(async (servoIds: number[]) => {
    if (!port || !port.readable || !port.writable) {
        console.error('Port not available or not open when syncReadPositions called.');
        return;
    } 

    const writer = port.writable.getWriter();
    const reader = port.readable.getReader();
    const expectedResponseLengthPerServo = 8;
    const totalExpectedLength = servoIds.length * expectedResponseLengthPerServo;
    let receivedData = new Uint8Array(0);
    const positions: Record<number, number | null> = {};

    try {
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
                    console.log(`✅ Parsed position for servo ${servoId}: ${positions[servoId]}`);
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

      setServoPositions(positions);

    } catch (error) {
      console.error('Failed SYNC READ:', error);
    } finally {
      try { 
        if (reader && typeof reader.releaseLock === 'function') {
          reader.releaseLock(); 
        }
      } catch(e) { console.warn('Reader lock already released or error releasing.'); }
      try { 
        if (writer && typeof writer.releaseLock === 'function') {
          writer.releaseLock(); 
        }
      } catch(e) { console.warn('Writer lock already released or error releasing.'); }
    }
  }, [port]);

  useEffect(() => {
    if (!port) {
      return;
    }

    const servoIdsToRead = [4, 6];

    const intervalId = setInterval(async () => {
      if (isReading.current) {
        return;
      }

      isReading.current = true;
      try {
        await syncReadPositions(servoIdsToRead);
      } catch (error) {
        console.error("Error during scheduled syncRead:", error);
      } finally {
        isReading.current = false;
      }
    }, 33); // Poll at roughly ~30 Hz

    // Cleanup function to clear the interval when the component unmounts or port changes
    return () => {
      clearInterval(intervalId);
      isReading.current = false;
    };
  }, [port, syncReadPositions]);

  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { deviceId: { exact: ['0105c964da60ad97dd932d5a7cf3244eb786f5dfbe3d8f54ba318342e42c7f6f', '7455bc4aa220d56b34888e8b362de115ecd894bb231819b579ec0c0525003a61'] } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  };

  useEffect(() => {
    async function getDevices() {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      console.log('Video devices:', videoDevices);
    }
    getDevices();
  }, []);

  return (
    <>
      <h1 className="mt-10 mb-10 text-left text-4xl font-bold">RobOS</h1>
      <div className="p-4">
        <Button onClick={connectToSerial} className="p-2 m-2 cursor-pointer">Connect to Robot</Button>
        <Button onClick={disconnectSerial} className="p-2 m-2 cursor-pointer">Disconnect</Button>
        <Button onClick={() => pingServo(6)} disabled={!port} className="p-2 m-2 cursor-pointer">Ping Servo 6</Button>
        <Button onClick={startCamera} className="p-2 m-2 cursor-pointer">Start Camera</Button>
      </div>

      <div className="p-4">
        <h2 className="text-2xl font-semibold mb-2">Servo Positions:</h2>
        <pre className="p-3 rounded">{JSON.stringify(servoPositions, null, 2)}</pre>
      </div>
      <div>
        <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: 'auto' }} />
    </div>
    </>
  );
}

export default Archive;