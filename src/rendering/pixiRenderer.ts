import * as PIXI from 'pixi.js'
import { createAgentTexture } from './agentSprite'
import { agentColorFromRole, agentAlpha, agentScale, linkAlpha, linkColor } from './colorEncoding'
import type { WorkerSnapshot } from '../simulation/types'

const MAX_AGENTS = 5000

export class PixiRenderer {
  app: PIXI.Application
  private linksGfx: PIXI.Graphics
  private agentsContainer: PIXI.ParticleContainer
  private halosGfx: PIXI.Graphics
  private sprites: PIXI.Sprite[] = []
  private agentTexture!: PIXI.Texture
  private lastLinkDraw = 0
  private lastHaloDraw = 0

  constructor(canvas: HTMLCanvasElement) {
    const w = Math.max(canvas.width, canvas.clientWidth, 300)
    const h = Math.max(canvas.height, canvas.clientHeight, 200)

    this.app = new PIXI.Application({
      view: canvas,
      backgroundColor: 0x080B14,
      backgroundAlpha: 1,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      width: w,
      height: h,
      preferWebGLVersion: 2,
    })

    this.linksGfx = new PIXI.Graphics()
    this.agentsContainer = new PIXI.ParticleContainer(MAX_AGENTS, {
      position: true,
      scale: true,
      alpha: true,
      tint: true,
    })
    this.halosGfx = new PIXI.Graphics()

    this.app.stage.addChild(this.linksGfx)
    this.app.stage.addChild(this.halosGfx)
    this.app.stage.addChild(this.agentsContainer)

    this.agentTexture = createAgentTexture(this.app.renderer as PIXI.Renderer)

    for (let i = 0; i < MAX_AGENTS; i++) {
      const sprite = new PIXI.Sprite(this.agentTexture)
      sprite.anchor.set(0.5)
      sprite.visible = false
      sprite.scale.set(0.5)
      this.sprites.push(sprite)
      this.agentsContainer.addChild(sprite)
    }
  }

  update(snapshot: WorkerSnapshot, tick: number): void {
    const {
      agentX, agentY, agentActivity, agentFatigue,
      agentValence, agentCluster, agentRole, agentLastSpike,
      agentEnergy, agentCount, links, roles,
    } = snapshot

    const n = Math.min(agentCount, MAX_AGENTS)

    for (let i = 0; i < n; i++) {
      const sprite = this.sprites[i]
      sprite.visible = true
      sprite.x = agentX[i]
      sprite.y = agentY[i]
      sprite.tint = agentColorFromRole(agentRole[i], roles, agentFatigue[i], agentValence[i], agentCluster[i])
      sprite.alpha = agentAlpha(agentActivity[i])
      const spikedRecently = tick - agentLastSpike[i] < 8
      const baseScale = agentScale(agentEnergy[i], spikedRecently)
      sprite.scale.set(baseScale * 0.8)
    }

    for (let i = n; i < this.sprites.length; i++) {
      if (!this.sprites[i].visible) break
      this.sprites[i].visible = false
    }

    const now = performance.now()

    // LINKS
    if (now - this.lastLinkDraw > 100) {
      this.lastLinkDraw = now
      this.linksGfx.clear()
      const maxLinks = Math.min(links.length, 2000)
      for (let i = 0; i < maxLinks; i++) {
        const link = links[i]
        if (!link.active || link.weight < 0.1) continue
        const srcIdx = link.sourceId
        const tgtIdx = link.targetId
        if (srcIdx >= agentCount || tgtIdx >= agentCount) continue
        const alpha = linkAlpha(link.weight)
        const color = linkColor(link.type)
        const width = link.weight > 0.5 ? 3 : link.weight > 0.25 ? 2 : 1
        this.linksGfx.lineStyle(width, color, alpha)
        this.linksGfx.moveTo(agentX[srcIdx], agentY[srcIdx])
        this.linksGfx.lineTo(agentX[tgtIdx], agentY[tgtIdx])
      }
    }

    // HALOS
    if (now - this.lastHaloDraw > 60) {
      this.lastHaloDraw = now
      this.halosGfx.clear()
      let haloCount = 0
      for (let i = 0; i < n && haloCount < 100; i++) {
        const dt = tick - agentLastSpike[i]
        if (dt >= 0 && dt < 15) {
          const t = 1 - dt / 15
          const color = agentColorFromRole(agentRole[i], roles, agentFatigue[i], agentValence[i], agentCluster[i])
          this.halosGfx.beginFill(color, t * 0.15)
          this.halosGfx.drawCircle(agentX[i], agentY[i], 8 + t * 12)
          this.halosGfx.endFill()
          haloCount++
        }
      }
    }
  }

  setCamera(x: number, y: number, zoom: number): void {
    this.app.stage.x = x
    this.app.stage.y = y
    this.app.stage.scale.set(zoom)
  }

  resize(w: number, h: number): void {
    this.app.renderer.resize(w, h)
  }

  destroy(): void {
    this.app.destroy(false, { children: true, texture: true })
  }
}
