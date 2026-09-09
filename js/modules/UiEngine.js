// UiEngine.js - Gesture recording, playback, and state management
const MAX_RECORD_BUFFER = 1000;

class UiEngine {
  constructor() {
    this.recordedGestures = [];
    this.isPlayingBack = false;
    this.playbackStartTime = null;
    this.isRecording = false;
  }

  startRecording() {
    this.recordedGestures = [];
    this.isRecording = true;
  }

  stopRecording() {
    this.isRecording = false;
    return this.recordedGestures.length;
  }

  recordGesture(gestureData) {
    if (this.isRecording) {
      this.recordedGestures.push({
        position: gestureData.position.clone(),
        rotation: gestureData.rotation,
        tension: gestureData.tension,
        handVelocity: gestureData.handVelocity
      });

      // Circular buffer limit
      if (this.recordedGestures.length > MAX_RECORD_BUFFER) {
        this.recordedGestures.shift();
      }
    }
  }

  startPlayback() {
    this.isPlayingBack = true;
    this.playbackStartTime = null;
  }

  stopPlayback() {
    this.isPlayingBack = false;
    this.playbackStartTime = null;
  }

  updatePlayback() {
    if (!this.isPlayingBack || this.recordedGestures.length === 0) {
      return null;
    }

    const now = performance.now();
    if (!this.playbackStartTime) {
      this.playbackStartTime = now;
    }

    const elapsed = now - this.playbackStartTime;

    const gestureIndex = Math.min(
      Math.floor((elapsed / 10) % this.recordedGestures.length),
      this.recordedGestures.length - 1
    );

    const gesture = this.recordedGestures[gestureIndex];
    if (gesture) {
      return {
        position: gesture.position.clone(),
        rotation: gesture.rotation,
        tension: gesture.tension,
        handVelocity: gesture.handVelocity
      };
    }
    return null;
  }

  getRecordedGestures() {
    return [...this.recordedGestures];
  }

  getRecordedGestureCount() {
    return this.recordedGestures.length;
  }

  cleanup() {
    this.recordedGestures = [];
    this.isPlayingBack = false;
    this.playbackStartTime = null;
    this.isRecording = false;
  }
}

export { UiEngine };
