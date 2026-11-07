class RTLoop {
  private shoot: () => void
  private fps?: number
  private fpsCounter = 0
  private showFps?: boolean
  private cb: () => void | Promise<void>

  constructor({
    cb,
    shoot,
    fps,
    showFps,
  }: {
    cb: () => void | Promise<void>
    shoot: () => void
    fps?: number
    showFps?: boolean
  }) {
    this.shoot = shoot
    this.cb = cb
    this.fps = fps
    this.showFps = showFps
  }
  startFpsCounter() {
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
    document.body.appendChild(counterElement)

    setInterval(() => {
      counterElement.innerText = `FPS: ${this.fpsCounter}`
      this.fpsCounter = 0
    }, 1000)
  }
  start() {
    if (this.showFps) this.startFpsCounter()

    const cb = this.cb
    const shoot = this.shoot
    const increaseFpsCounter = () => {
      this.fpsCounter++
    }
    const FPS = this.fps

    let loop: FrameRequestCallback = async () => {
      requestAnimationFrame(loop)
      await cb()
      shoot()
      increaseFpsCounter()
    }

    if (FPS !== undefined) {
      const fpsInterval = 1000 / FPS
      let lastFrameTime = 0
      loop = async (currentTime: number) => {
        requestAnimationFrame(loop)
        const delta = currentTime - lastFrameTime
        if (delta > fpsInterval) {
          lastFrameTime = currentTime - (delta % fpsInterval)
          await cb()
          shoot()
          increaseFpsCounter()
        }
      }
    }

    requestAnimationFrame(loop)
  }
}

export default RTLoop
