import * as PIXI from 'pixi.js'
import type { RoleConfig } from '../simulation/types'

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360
  s = Math.max(0, Math.min(1, s))
  l = Math.max(0, Math.min(1, l))
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60)      { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else              { r = c; g = 0; b = x }
  return [r + m, g + m, b + m]
}

function hexStringToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16)
}

const roleColorCache = new Map<string, number>()

export function agentColorFromRole(
  roleIndex: number,
  roles: RoleConfig[] | undefined,
  fatigue: number,
  valence: number,
  clusterId: number,
): number {
  if (roles && roles[roleIndex]) {
    const role = roles[roleIndex]
    const cacheKey = role.color
    let base = roleColorCache.get(cacheKey)
    if (base === undefined) {
      base = hexStringToNumber(role.color)
      roleColorCache.set(cacheKey, base)
    }

    if (fatigue > 0.5) {
      const r = ((base >> 16) & 0xFF)
      const g = ((base >> 8) & 0xFF)
      const b = (base & 0xFF)
      const shift = (fatigue - 0.5) * 2
      return PIXI.utils.rgb2hex([
        Math.max(0, (r / 255) * (1 - shift * 0.3)),
        Math.max(0, (g / 255) * (1 - shift * 0.5)),
        Math.min(1, (b / 255) + shift * 0.3),
      ])
    }
    if (valence < -0.5) {
      const r = ((base >> 16) & 0xFF) / 255
      const g = ((base >> 8) & 0xFF) / 255
      const b = (base & 0xFF) / 255
      const avg = (r + g + b) / 3
      const desat = 0.7
      return PIXI.utils.rgb2hex([
        r * (1 - desat) + avg * desat,
        g * (1 - desat) + avg * desat,
        b * (1 - desat) + avg * desat,
      ])
    }
    return base
  }

  let hue = ((clusterId >= 0 ? clusterId : 0) * 26 + 180) % 360
  let sat = 0.7
  const lit = 0.6
  if (fatigue > 0.5) hue -= 35 * (fatigue - 0.5) * 2
  if (valence < -0.5) sat = 0.3
  const [r, g, b] = hslToRgb(hue, sat, lit)
  return PIXI.utils.rgb2hex([r, g, b])
}

export function agentAlpha(activity: number): number {
  return 0.35 + Math.min(1, activity) * 0.65
}

export function agentScale(energy: number, spikedRecently: boolean): number {
  let base = 0.6 + energy * 0.6
  if (spikedRecently) base *= 1.7
  return base
}

export function linkAlpha(weight: number): number {
  if (weight < 0.05) return 0
  return 0.4 + weight * 0.5
}

export function linkColor(type: 'excitatory' | 'inhibitory'): number {
  return type === 'excitatory' ? 0x66AAFF : 0xFF6666
}
