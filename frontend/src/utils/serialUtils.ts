export function checksum(data: number[]): number {
  const sumData = data.reduce((sum, val) => sum + val, 0);
  return (~sumData) & 0xFF;
}

export function buildPingPacket(servoId: number): Uint8Array {
  // Header (0xFF, 0xFF), ID, Length, Instruction
  const packet = [0xFF, 0xFF, servoId, 2, 0x01]; // 0x01 = PING

  // Calculate checksum only on ID, Length, Instruction
  const checksumValue = checksum(packet.slice(2)); 
  packet.push(checksumValue);

  return new Uint8Array(packet);
}