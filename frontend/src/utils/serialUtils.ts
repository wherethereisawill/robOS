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

export function buildSyncReadPacket(servoIds: number[]): Uint8Array {
  const addr = 0x38; // Current position memory address
  const dataLen = 2; // 2 bytes: position low + high

  const params = [addr, dataLen, ...servoIds];

  const length = params.length + 2; // instruction + checksum
  const packet = [0xFF, 0xFF, 0xFE, length, 0x82, ...params]; // 0xFE = Broadcast ID, 0x82 = SYNC_READ

  // Calculate checksum on ID, Length, Instruction, Params
  const checksumValue = checksum(packet.slice(2)); 
  packet.push(checksumValue);

  return new Uint8Array(packet);
}

export function buildSyncMovePacket(servosTargets: [number, number][]): Uint8Array {
  const addr = 0x2A; // Goal Position memory address
  const dataLen = 6; // position(2) + time(2) + speed(2)

  const params: number[] = [];

  for (const [servoId, position] of servosTargets) {
    const moveTime = 1000;
    const moveSpeed = 1000;

    params.push(servoId);
    params.push(position & 0xFF);           // Position low
    params.push((position >> 8) & 0xFF);    // Position high
    params.push(moveTime & 0xFF);           // Time low
    params.push((moveTime >> 8) & 0xFF);    // Time high
    params.push(moveSpeed & 0xFF);          // Speed low
    params.push((moveSpeed >> 8) & 0xFF);   // Speed high
  }

  const length = params.length + 4; // instruction + addr + data_len + checksum
  const packet = [0xFF, 0xFF, 0xFE, length, 0x83, addr, dataLen, ...params];

  const checksumValue = checksum(packet.slice(2));
  packet.push(checksumValue);

  return new Uint8Array(packet);
}