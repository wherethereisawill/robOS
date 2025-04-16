// Basic device info from enumerateDevices
export interface MediaDevice {
    deviceId: string;
    label: string;
    kind: string; // e.g., 'videoinput'
    groupId: string;
}

// Represents an active camera with its stream reference
export interface ActiveCamera extends MediaDevice {
    streamId: string; // Unique ID to reference the stream in streamsRef
} 