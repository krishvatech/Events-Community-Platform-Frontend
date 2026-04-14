/**
 * PresenterAudioManager.js
 * Manages independent audio control for any presenter during screen sharing
 * Handles: Web Audio API pipeline, volume control, enable/disable toggle, cleanup
 */

export class PresenterAudioManager {
  constructor(presenterParticipant, peerConnection) {
    this.presenterParticipant = presenterParticipant;
    this.peerConnection = peerConnection;
    this.audioContext = null;
    this.gainNode = null;
    this.rawAudioTrack = null;
    this.audioSender = null;
    this.mediaStreamSource = null;
    this.mediaStreamDestination = null;
    this.volume = 1.0;
    this.enabled = false;
    this.isCleanedUp = false;
  }

  /**
   * Setup screen share audio pipeline
   * Intercepts getDisplayMedia to capture audio track
   */
  async setupScreenShareAudio(capturedStream) {
    try {
      if (!capturedStream) {
        console.warn("[PresenterAudioManager] No captured stream provided");
        return false;
      }

      const audioTracks = capturedStream.getAudioTracks();
      if (!audioTracks || audioTracks.length === 0) {
        console.warn("[PresenterAudioManager] No audio tracks in captured stream");
        return false;
      }

      const audioTrack = audioTracks[0];
      this.rawAudioTrack = audioTrack;

      // Create Web Audio API pipeline
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.audioContext = ctx;

      // Create source from the raw audio track
      const mediaStream = new MediaStream([audioTrack]);
      const source = ctx.createMediaStreamSource(mediaStream);
      this.mediaStreamSource = source;

      // Create gain node for volume control
      const gain = ctx.createGain();
      gain.gain.value = this.volume;
      this.gainNode = gain;

      // Create destination to get processed audio
      const dest = ctx.createMediaStreamDestination();
      this.mediaStreamDestination = dest;

      // Connect: source → gain → destination
      source.connect(gain);
      gain.connect(dest);

      // Add the processed audio track to peer connection
      const processedAudioTrack = dest.stream.getAudioTracks()[0];
      if (processedAudioTrack && this.peerConnection && this.peerConnection.addTrack) {
        this.audioSender = this.peerConnection.addTrack(processedAudioTrack, dest.stream);
        console.log("[PresenterAudioManager] Audio sender added to peer connection");
      }

      this.enabled = true;
      console.log("[PresenterAudioManager] Screen share audio pipeline initialized");
      return true;
    } catch (error) {
      console.error("[PresenterAudioManager] Error setting up screen share audio:", error);
      this.cleanup();
      return false;
    }
  }

  /**
   * Toggle audio on/off without destroying the pipeline
   */
  toggleAudio(enabled) {
    if (!this.rawAudioTrack) {
      console.warn("[PresenterAudioManager] No audio track to toggle");
      return false;
    }

    try {
      this.rawAudioTrack.enabled = enabled;
      this.enabled = enabled;
      console.log(`[PresenterAudioManager] Audio toggled: ${enabled}`);
      return true;
    } catch (error) {
      console.error("[PresenterAudioManager] Error toggling audio:", error);
      return false;
    }
  }

  /**
   * Set volume (0-1 range)
   */
  setVolume(volumeValue) {
    const cleanValue = Math.max(0, Math.min(1, Number(volumeValue) || 0));

    if (!this.gainNode) {
      console.warn("[PresenterAudioManager] No gain node to set volume");
      return false;
    }

    try {
      this.gainNode.gain.value = cleanValue;
      this.volume = cleanValue;
      console.log(`[PresenterAudioManager] Volume set to: ${cleanValue}`);
      return true;
    } catch (error) {
      console.error("[PresenterAudioManager] Error setting volume:", error);
      return false;
    }
  }

  /**
   * Get current state
   */
  getState() {
    return {
      enabled: this.enabled,
      volume: this.volume,
      hasAudioTrack: !!this.rawAudioTrack,
      hasAudioContext: !!this.audioContext,
      isCleanedUp: this.isCleanedUp,
    };
  }

  /**
   * Get presenter metadata
   */
  getMetadata() {
    return {
      participantId: this.presenterParticipant?.id,
      participantName: this.presenterParticipant?.name,
      participantUserId: this.presenterParticipant?.customParticipantId,
    };
  }

  /**
   * Cleanup all audio resources
   */
  async cleanup() {
    if (this.isCleanedUp) {
      console.log("[PresenterAudioManager] Already cleaned up, skipping");
      return;
    }

    try {
      // Stop and remove raw audio track
      if (this.rawAudioTrack) {
        this.rawAudioTrack.stop();
        this.rawAudioTrack = null;
      }

      // Disconnect audio nodes
      if (this.mediaStreamSource) {
        this.mediaStreamSource.disconnect();
        this.mediaStreamSource = null;
      }

      if (this.gainNode) {
        this.gainNode.disconnect();
        this.gainNode = null;
      }

      if (this.mediaStreamDestination) {
        this.mediaStreamDestination.disconnect();
        this.mediaStreamDestination = null;
      }

      // Close audio context
      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
      }

      // Remove sender from peer connection
      if (this.audioSender && this.peerConnection) {
        try {
          this.peerConnection.removeTrack(this.audioSender);
        } catch (e) {
          console.warn("[PresenterAudioManager] Error removing audio sender:", e);
        }
        this.audioSender = null;
      }

      this.enabled = false;
      this.volume = 1.0;
      this.isCleanedUp = true;
      console.log("[PresenterAudioManager] Cleanup completed");
    } catch (error) {
      console.error("[PresenterAudioManager] Error during cleanup:", error);
      this.isCleanedUp = true;
    }
  }
}
