import * as PIXI from 'pixi.js'

let cachedTexture: PIXI.Texture | null = null

export function createAgentTexture(renderer: PIXI.Renderer): PIXI.Texture {
  if (cachedTexture) return cachedTexture

  const gfx = new PIXI.Graphics()
  gfx.beginFill(0xFFFFFF)
  gfx.drawCircle(8, 8, 8)
  gfx.endFill()

  cachedTexture = renderer.generateTexture(gfx, {
    resolution: 2,
    region: new PIXI.Rectangle(0, 0, 16, 16),
  })

  gfx.destroy()
  return cachedTexture
}
