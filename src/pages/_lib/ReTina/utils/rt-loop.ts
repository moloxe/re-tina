class RTLoop {
  private shoot: () => void
  private fps?: number
  private fpsCounter = 0
  private showFps?: boolean
  private cb: (dt: number) => void | Promise<void>
  private rafId: number | null = null

  constructor({
    cb,
    shoot,
    fps,
    showFps,
  }: {
    cb: (dt: number) => void | Promise<void>
    shoot: () => void
    fps?: number
    showFps?: boolean
  }) {
    this.shoot = shoot
    this.cb = cb
    this.fps = fps
    this.showFps = showFps
  }

  private createFpsCounterElement() {
    const counterElement = document.createElement('div')
    counterElement.setAttribute(
      'style',
      ` position: absolute;
        top: 0;
        left: 0;
        color: green;
        background: black;
        font-size: 16px;
        font-family: monospace;
        pointer-events: none;`
    )
    counterElement.innerText = 'FPS: --'
    document.body.appendChild(counterElement)
    return counterElement
  }

  start() {
    const counterElement = this.showFps ? this.createFpsCounterElement() : null

    const cb = this.cb
    const shoot = this.shoot
    const FPS = this.fps
    const fpsInterval = FPS !== undefined ? 1000 / FPS : 0
    // Small tolerance (0.5ms) prevents dropping V-Sync frames due to rAF timestamp jitter (e.g. 16.62ms at 60Hz)
    const jitterTolerance = 0.5

    let lastFrameTime: number | null = null
    let lastExecTime: number | null = null
    let fpsLastTime: number | null = null

    const updateFpsCounter = (currentTime: number) => {
      if (!counterElement) return
      this.fpsCounter++
      if (fpsLastTime === null) {
        fpsLastTime = currentTime
        return
      }
      const elapsed = currentTime - fpsLastTime
      if (elapsed >= 500) {
        counterElement.innerText = `FPS: ${Math.round((this.fpsCounter * 1000) / elapsed)}`
        this.fpsCounter = 0
        fpsLastTime = currentTime
      }
    }

    const loop: FrameRequestCallback = async (currentTime: number) => {
      if (FPS !== undefined && lastFrameTime !== null) {
        const delta = currentTime - lastFrameTime
        if (delta < fpsInterval - jitterTolerance) {
          this.rafId = requestAnimationFrame(loop)
          return
        }
        lastFrameTime = currentTime - (delta % fpsInterval)
      } else {
        lastFrameTime = currentTime
      }

      const rawDt =
        lastExecTime === null
          ? 1 / (FPS ?? 60)
          : (currentTime - lastExecTime) / 1000
      lastExecTime = currentTime

      // Clamp deltaTime to 100ms max to avoid huge physics jumps after tab switching
      const dt = Math.min(Math.max(rawDt, 0), 0.1)

      await cb(dt)
      shoot()
      updateFpsCounter(currentTime)

      this.rafId = requestAnimationFrame(loop)
    }

    this.rafId = requestAnimationFrame(loop)
  }

  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }
}

export default RTLoop
