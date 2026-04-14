/**
 * usePresenterAudio.ts
 * React hook for managing presenter audio state and lifecycle
 */

import { useCallback, useRef, useEffect, useState } from "react";
import { PresenterAudioManager } from "../utils/PresenterAudioManager";
import {
  logPresenterAudioAction,
  createPresenterSnapshot,
  createAudioErrorReport,
} from "../utils/presenterAudioUtils";

interface PresenterAudioState {
  enabled: boolean;
  volume: number;
  hasAudioContext: boolean;
  isInitializing: boolean;
  error: string | null;
}

interface UsePresenterAudioOptions {
  presenter: any;
  peerConnection: any;
  autoCleanup?: boolean;
}

/**
 * Hook for managing audio for a specific presenter
 */
export function usePresenterAudio({
  presenter,
  peerConnection,
  autoCleanup = true,
}: UsePresenterAudioOptions) {
  const managerRef = useRef<PresenterAudioManager | null>(null);
  const [audioState, setAudioState] = useState<PresenterAudioState>({
    enabled: false,
    volume: 1.0,
    hasAudioContext: false,
    isInitializing: false,
    error: null,
  });

  // Initialize or update manager when presenter or peerConnection changes
  useEffect(() => {
    // Clean up old manager if presenter changed
    if (
      managerRef.current &&
      presenter &&
      managerRef.current.presenterParticipant?.id !== presenter.id
    ) {
      managerRef.current.cleanup().catch((error) => {
        console.warn("[usePresenterAudio] Error cleaning up old manager:", error);
      });
      managerRef.current = null;
    }

    // Create new manager if needed
    if (presenter && peerConnection && !managerRef.current) {
      managerRef.current = new PresenterAudioManager(presenter, peerConnection);
      logPresenterAudioAction("manager_created", {
        presenterId: presenter.id,
        presenterName: presenter.name,
      });
    }

    return () => {
      // Cleanup on unmount if autoCleanup enabled
      if (autoCleanup && managerRef.current) {
        managerRef.current.cleanup().catch((error) => {
          console.warn("[usePresenterAudio] Error in cleanup:", error);
        });
      }
    };
  }, [presenter?.id, peerConnection, autoCleanup]);

  /**
   * Initialize audio pipeline from captured stream
   */
  const setupAudio = useCallback(
    async (capturedStream: MediaStream) => {
      if (!managerRef.current) {
        console.error("[usePresenterAudio] No audio manager available");
        setAudioState((prev) => ({
          ...prev,
          error: "Audio manager not initialized",
        }));
        return false;
      }

      setAudioState((prev) => ({ ...prev, isInitializing: true }));

      try {
        const success = await managerRef.current.setupScreenShareAudio(
          capturedStream
        );

        if (success) {
          const state = managerRef.current.getState();
          setAudioState({
            enabled: state.enabled,
            volume: state.volume,
            hasAudioContext: state.hasAudioContext,
            isInitializing: false,
            error: null,
          });
          logPresenterAudioAction("audio_setup_success", {
            volume: state.volume,
            enabled: state.enabled,
          });
          return true;
        } else {
          setAudioState((prev) => ({
            ...prev,
            isInitializing: false,
            error: "Failed to setup audio pipeline",
          }));
          return false;
        }
      } catch (error) {
        const errorReport = createAudioErrorReport(error, {
          action: "setupAudio",
          presenter: presenter?.id,
        });
        console.error("[usePresenterAudio] Setup error:", errorReport);
        setAudioState((prev) => ({
          ...prev,
          isInitializing: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }));
        return false;
      }
    },
    [presenter?.id]
  );

  /**
   * Toggle audio on/off
   */
  const toggleAudio = useCallback(
    (enabled: boolean) => {
      if (!managerRef.current) {
        console.error("[usePresenterAudio] No audio manager for toggle");
        return false;
      }

      try {
        const success = managerRef.current.toggleAudio(enabled);
        if (success) {
          setAudioState((prev) => ({ ...prev, enabled }));
          logPresenterAudioAction("audio_toggled", { enabled });
        }
        return success;
      } catch (error) {
        console.error("[usePresenterAudio] Toggle error:", error);
        setAudioState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "Toggle failed",
        }));
        return false;
      }
    },
    []
  );

  /**
   * Set volume (0-1 range)
   */
  const setVolume = useCallback(
    (volumeValue: number) => {
      if (!managerRef.current) {
        console.error("[usePresenterAudio] No audio manager for volume set");
        return false;
      }

      try {
        const success = managerRef.current.setVolume(volumeValue);
        if (success) {
          setAudioState((prev) => ({ ...prev, volume: volumeValue }));
          logPresenterAudioAction("volume_changed", { volume: volumeValue });
        }
        return success;
      } catch (error) {
        console.error("[usePresenterAudio] Volume set error:", error);
        return false;
      }
    },
    []
  );

  /**
   * Get current audio state
   */
  const getAudioState = useCallback(() => {
    if (!managerRef.current) return null;
    return managerRef.current.getState();
  }, []);

  /**
   * Get presenter metadata
   */
  const getPresenterMetadata = useCallback(() => {
    if (!managerRef.current) return null;
    return managerRef.current.getMetadata();
  }, []);

  /**
   * Cleanup audio resources
   */
  const cleanup = useCallback(async () => {
    if (!managerRef.current) {
      console.warn("[usePresenterAudio] No manager to cleanup");
      return;
    }

    try {
      await managerRef.current.cleanup();
      managerRef.current = null;
      setAudioState({
        enabled: false,
        volume: 1.0,
        hasAudioContext: false,
        isInitializing: false,
        error: null,
      });
      logPresenterAudioAction("audio_cleanup_complete");
    } catch (error) {
      console.error("[usePresenterAudio] Cleanup error:", error);
      setAudioState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Cleanup failed",
      }));
    }
  }, []);

  return {
    // State
    audioState,
    isEnabled: audioState.enabled,
    volume: audioState.volume,
    hasAudioContext: audioState.hasAudioContext,
    isInitializing: audioState.isInitializing,
    error: audioState.error,

    // Methods
    setupAudio,
    toggleAudio,
    setVolume,
    getAudioState,
    getPresenterMetadata,
    cleanup,

    // Internal ref (for advanced usage)
    managerRef,
  };
}

export default usePresenterAudio;
