import { useEffect, useCallback, useRef } from "react";
import { useRideStore } from "@/store";
import { webrtcManager } from "@/lib/webrtc-manager";

const playRemoteAudio = (peerId: string, stream: MediaStream) => {
  const audio = new Audio();
  audio.srcObject = stream;
  audio.autoplay = true;
  audio.play().catch((e) => console.error("Failed to play audio:", e));
};

export function useWebRTC() {
  const rideCode = useRideStore((state) => state.rideCode);
  const remoteStreams = useRef<Map<string, MediaStream>>(new Map());

  const initializeAudio = useCallback(async () => {
    try {
      const stream = await webrtcManager.initLocalAudio();
      return stream;
    } catch (error) {
      console.error("Failed to initialize audio:", error);
      throw error;
    }
  }, []);

  const connectToPeer = useCallback(async (peerId: string) => {
    try {
      const pc = await webrtcManager.createPeerConnection(peerId);
      await webrtcManager.sendOffer(peerId);
      // Send offer to other peer via Socket.io (handled in socket listener)
      return pc;
    } catch (error) {
      console.error(`Failed to connect to peer ${peerId}:`, error);
      throw error;
    }
  }, []);

  const disconnectFromPeer = useCallback((peerId: string) => {
    webrtcManager.closePeerConnection(peerId);
  }, []);

  const setAudioEnabled = useCallback((enabled: boolean) => {
    webrtcManager.setAudioEnabled(enabled);
  }, []);

  useEffect(() => {
    if (!rideCode) return;

    // Initialize local audio when ride starts
    initializeAudio().catch(console.error);

    // Listen for remote audio
    const onRemoteAudio = ({
      peerId,
      stream,
    }: {
      peerId: string;
      stream: MediaStream;
    }) => {
      remoteStreams.current.set(peerId, stream);
      // Play audio immediately
      playRemoteAudio(peerId, stream);
    };

    // Listen for connection state changes
    const onConnectionChange = ({
      peerId,
      state,
    }: {
      peerId: string;
      state: string;
    }) => {
      console.log(`Peer ${peerId} connection state: ${state}`);
    };

    webrtcManager.on("remoteAudioReady", onRemoteAudio);
    webrtcManager.on("connectionStateChange", onConnectionChange);

    return () => {
      webrtcManager.off("remoteAudioReady", onRemoteAudio);
      webrtcManager.off("connectionStateChange", onConnectionChange);
      webrtcManager.closeAll();
    };
  }, [rideCode, initializeAudio]);

  return {
    initializeAudio,
    connectToPeer,
    disconnectFromPeer,
    setAudioEnabled,
  };
}
