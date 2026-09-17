export interface MovementDetectorConfig {
  warmupMs: number
  calibrationSamples: number
  movementThresholdCm: number
  cooldownMs: number
}

const defaultConfig: MovementDetectorConfig = {
  warmupMs: 1000,
  calibrationSamples: 10,
  movementThresholdCm: 100,
  cooldownMs: 300,
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export class MovementDetector {
  private baselineMean = 0
  private calibrationSamples: number[] = []
  private isCalibrated = false
  private lastMovementAt = 0
  private startedAt = 0
  private hasStarted = false

  constructor(private readonly config: MovementDetectorConfig = defaultConfig) {}

  reset(startTime = Date.now()): void {
    this.baselineMean = 0
    this.calibrationSamples = []
    this.isCalibrated = false
    this.lastMovementAt = 0
    this.startedAt = startTime
    this.hasStarted = true
  }

  update(distanceCm: number, now = Date.now()): boolean {
    if (!this.hasStarted) {
      this.reset(now)
    }

    // Wait before calibration begins so the sensor can stabilize.
    if (now - this.startedAt < this.config.warmupMs) {
      return false
    }

    // During calibration, collect a short baseline.
    if (!this.isCalibrated) {
      console.log(`Calibrating movement detector: ${this.calibrationSamples.length + 1}/${this.config.calibrationSamples}`)
      this.calibrationSamples.push(distanceCm)

      if (this.calibrationSamples.length >= this.config.calibrationSamples) {
        this.baselineMean = average(this.calibrationSamples)
        this.isCalibrated = true
      }

      return false
    }

    // After calibration, compare new readings against the baseline.
    const deviation = Math.abs(distanceCm - this.baselineMean)

    if (
      deviation >= this.config.movementThresholdCm &&
      now - this.lastMovementAt >= this.config.cooldownMs
    ) {
      this.lastMovementAt = now
      return true
    }

    return false
  }

  getState() {
    return {
      isCalibrated: this.isCalibrated,
      baselineMean: this.baselineMean,
    }
  }
}