/**
 * WebRTCService: Handles WebRTC PeerConnection, MediaStreams,
 * ICE Candidates, Track Replacement (Screen Share), Audio/Video Toggles.
 */

export interface WebRTCCallbacks {
  onRemoteStream?: (stream: MediaStream) => void;
  onIceCandidate?: (candidate: RTCIceCandidate) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onIceConnectionStateChange?: (state: RTCIceConnectionState) => void;
  onError?: (err: string) => void;
}

export class WebRTCService {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private cameraTrack: MediaStreamTrack | null = null;
  private callbacks: WebRTCCallbacks = {};
  private isScreenSharing: boolean = false;
  private pendingCandidates: RTCIceCandidateInit[] = [];

  constructor(callbacks?: WebRTCCallbacks) {
    if (callbacks) {
      this.callbacks = callbacks;
    }
  }

  public setCallbacks(callbacks: WebRTCCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Builds ICE servers list including public Google STUN and optional custom TURN servers.
   */
  public getIceServers(): RTCConfiguration {
    const iceServers: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
    ];

    const turnUrl = import.meta.env.VITE_TURN_URL || localStorage.getItem('connectcall_turn_url');
    const turnUsername = import.meta.env.VITE_TURN_USERNAME || localStorage.getItem('connectcall_turn_user');
    const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL || localStorage.getItem('connectcall_turn_cred');

    if (turnUrl) {
      iceServers.push({
        urls: turnUrl,
        username: turnUsername || undefined,
        credential: turnCredential || undefined,
      });
    }

    return {
      iceServers,
      iceCandidatePoolSize: 10,
    };
  }

  /**
   * Requests local audio/video media stream.
   */
  public async getLocalStream(video: boolean = true, audio: boolean = true): Promise<MediaStream> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const msg = 'MediaDevices API is not supported in this browser environment.';
      this.callbacks.onError?.(msg);
      throw new Error(msg);
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } : false,
        video: video ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStream = stream;

      const vTrack = stream.getVideoTracks()[0];
      if (vTrack) {
        this.cameraTrack = vTrack;
      }

      return stream;
    } catch (err: unknown) {
      const error = err as Error;
      let errorMsg = 'Failed to access camera/microphone.';
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMsg = video
          ? 'Camera & microphone permissions were denied. Please grant permission in browser settings.'
          : 'Microphone permission was denied. Please grant permission in browser settings.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMsg = 'Requested camera or microphone device was not found.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMsg = 'Hardware device is already in use by another application.';
      }
      this.callbacks.onError?.(errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Initializes RTCPeerConnection and attaches local stream tracks.
   */
  public createPeerConnection(): RTCPeerConnection {
    if (this.pc) {
      return this.pc;
    }

    const config = this.getIceServers();
    this.pc = new RTCPeerConnection(config);
    this.remoteStream = new MediaStream();

    // ICE Candidate handler
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.callbacks.onIceCandidate?.(event.candidate);
      }
    };

    this.pc.onicecandidateerror = (event) => {
      console.warn('ICE candidate gathering warning/error:', event);
    };

    // Remote track listener
    this.pc.ontrack = (event) => {
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }
      event.streams[0]?.getTracks().forEach((track) => {
        if (!this.remoteStream?.getTracks().includes(track)) {
          this.remoteStream?.addTrack(track);
        }
      });
      this.callbacks.onRemoteStream?.(this.remoteStream);
    };

    // Connection state changes
    this.pc.onconnectionstatechange = () => {
      if (!this.pc) return;
      const state = this.pc.connectionState;
      this.callbacks.onConnectionStateChange?.(state);

      if (state === 'failed') {
        this.callbacks.onError?.('WebRTC connection failed. ICE traversal could not be established.');
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      if (!this.pc) return;
      this.callbacks.onIceConnectionStateChange?.(this.pc.iceConnectionState);
    };

    // Add local tracks if stream is already loaded
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.pc?.addTrack(track, this.localStream!);
      });
    }

    return this.pc;
  }

  /**
   * Generates SDP Offer (caller side)
   */
  public async createOffer(): Promise<RTCSessionDescriptionInit> {
    const pc = this.createPeerConnection();
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await pc.setLocalDescription(offer);
    return offer;
  }

  /**
   * Accepts SDP Offer and generates SDP Answer (receiver side)
   */
  public async createAnswer(remoteOffer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    const pc = this.createPeerConnection();

    if (pc.signalingState !== 'stable') {
      await Promise.all([
        pc.setLocalDescription({ type: 'rollback' }),
      ]).catch(() => {});
    }

    await pc.setRemoteDescription(new RTCSessionDescription(remoteOffer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // Flush any early candidates
    if (this.pendingCandidates.length > 0) {
      for (const candidate of this.pendingCandidates) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('Error adding queued candidate in answer:', e);
        }
      }
      this.pendingCandidates = [];
    }

    return answer;
  }

  /**
   * Sets remote answer (caller receives answer from receiver)
   */
  public async handleAnswer(remoteAnswer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) return;
    if (this.pc.signalingState === 'have-local-offer') {
      await this.pc.setRemoteDescription(new RTCSessionDescription(remoteAnswer));

      // Flush any queued candidates
      if (this.pendingCandidates.length > 0) {
        for (const candidate of this.pendingCandidates) {
          try {
            await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn('Error adding queued candidate in handleAnswer:', e);
          }
        }
        this.pendingCandidates = [];
      }
    }
  }

  /**
   * Adds received ICE candidate
   */
  public async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc) return;
    try {
      if (this.pc.remoteDescription && this.pc.remoteDescription.type) {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        // Queue until remote description is set
        this.pendingCandidates.push(candidate);
      }
    } catch (err) {
      console.warn('Error adding ICE candidate:', err);
    }
  }

  /**
   * Toggle microphone audio track on/off
   */
  public toggleMicrophone(enabled?: boolean): boolean {
    if (!this.localStream) return false;
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (!audioTrack) return false;

    const newState = enabled !== undefined ? enabled : !audioTrack.enabled;
    audioTrack.enabled = newState;
    return newState;
  }

  public isMicrophoneMuted(): boolean {
    if (!this.localStream) return true;
    const audioTrack = this.localStream.getAudioTracks()[0];
    return audioTrack ? !audioTrack.enabled : true;
  }

  /**
   * Toggle camera video track on/off
   */
  public toggleCamera(enabled?: boolean): boolean {
    if (!this.localStream) return false;
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) return false;

    const newState = enabled !== undefined ? enabled : !videoTrack.enabled;
    videoTrack.enabled = newState;
    return newState;
  }

  public isCameraOff(): boolean {
    if (!this.localStream) return true;
    const videoTrack = this.localStream.getVideoTracks()[0];
    return videoTrack ? !videoTrack.enabled : true;
  }

  /**
   * Replaces outgoing video track with a new track (used for screen share)
   */
  public async replaceVideoTrack(newTrack: MediaStreamTrack | null): Promise<void> {
    if (!this.pc) return;
    const senders = this.pc.getSenders();
    const videoSender = senders.find((s) => s.track && s.track.kind === 'video');

    if (videoSender && newTrack) {
      await videoSender.replaceTrack(newTrack);
    }
  }

  /**
   * Starts screen sharing using getDisplayMedia
   */
  public async startScreenShare(onEnded?: () => void): Promise<MediaStream> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      const err = 'Screen sharing is not supported by your browser.';
      this.callbacks.onError?.(err);
      throw new Error(err);
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
        } as MediaTrackConstraints,
        audio: false,
      });

      this.screenStream = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];

      // Replace video track in RTCPeerConnection
      await this.replaceVideoTrack(screenTrack);
      this.isScreenSharing = true;

      // Handle user clicking native browser "Stop sharing" bar
      screenTrack.onended = () => {
        this.stopScreenShare();
        onEnded?.();
      };

      return screenStream;
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name !== 'NotAllowedError') {
        this.callbacks.onError?.('Could not share screen: ' + error.message);
      }
      throw error;
    }
  }

  /**
   * Restores camera track when screen sharing is stopped
   */
  public async stopScreenShare(): Promise<void> {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }

    if (this.cameraTrack) {
      await this.replaceVideoTrack(this.cameraTrack);
    }

    this.isScreenSharing = false;
  }

  public getIsScreenSharing(): boolean {
    return this.isScreenSharing;
  }

  public getLocalMediaStream(): MediaStream | null {
    return this.localStream;
  }

  public getRemoteMediaStream(): MediaStream | null {
    return this.remoteStream;
  }

  /**
   * Cleans up all tracks, connection states, and listeners.
   */
  public endCall(): void {
    // Stop local media tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.localStream = null;
    }

    // Stop screen share tracks
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.screenStream = null;
    }

    // Close RTCPeerConnection
    if (this.pc) {
      this.pc.onicecandidate = null;
      this.pc.ontrack = null;
      this.pc.onconnectionstatechange = null;
      this.pc.oniceconnectionstatechange = null;
      this.pc.close();
      this.pc = null;
    }

    this.remoteStream = null;
    this.cameraTrack = null;
    this.isScreenSharing = false;
    this.pendingCandidates = [];
  }
}
