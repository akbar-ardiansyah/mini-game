import { useEffect, useRef, useCallback } from 'react'

// ─── Constants ───────────────────────────────────────────────────────────────
export const CANVAS_W = 400
export const CANVAS_H = 600
const BIRD_X = 80
const BIRD_R = 16
const GRAVITY = 0.35
const JUMP_VEL = -8
const PIPE_W = 52
const PIPE_GAP = 200
const PIPE_SPEED = 2.0
const PIPE_INTERVAL = 2200 // ms

// ─── Types ───────────────────────────────────────────────────────────────────
interface Bird {
  y: number
  vy: number
}

interface Pipe {
  x: number
  gapY: number // centre of the gap
}

type Phase = 'idle' | 'playing' | 'dead'

interface State {
  phase: Phase
  bird: Bird
  pipes: Pipe[]
  score: number
  best: number
  lastPipeTime: number
  frame: number
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function randomGapY() {
  return PIPE_GAP / 2 + 60 + Math.random() * (CANVAS_H - PIPE_GAP - 120)
}

function circleRect(
  cx: number, cy: number, r: number,
  rx: number, ry: number, rw: number, rh: number,
): boolean {
  const nearX = Math.max(rx, Math.min(cx, rx + rw))
  const nearY = Math.max(ry, Math.min(cy, ry + rh))
  const dx = cx - nearX
  const dy = cy - nearY
  return dx * dx + dy * dy < r * r
}

function collides(bird: Bird, pipe: Pipe): boolean {
  const topH = pipe.gapY - PIPE_GAP / 2
  const botY = pipe.gapY + PIPE_GAP / 2
  return (
    circleRect(BIRD_X, bird.y, BIRD_R - 2, pipe.x, 0, PIPE_W, topH) ||
    circleRect(BIRD_X, bird.y, BIRD_R - 2, pipe.x, botY, PIPE_W, CANVAS_H - botY)
  )
}

function initialState(): State {
  return {
    phase: 'idle',
    bird: { y: CANVAS_H / 2, vy: 0 },
    pipes: [],
    score: 0,
    best: 0,
    lastPipeTime: 0,
    frame: 0,
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useFlappyBird(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const stateRef = useRef<State>(initialState())
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)

  const draw = useCallback((ctx: CanvasRenderingContext2D, state: State) => {
    const { bird, pipes, score, phase, frame } = state

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
    sky.addColorStop(0, '#87ceeb')
    sky.addColorStop(1, '#d4f1f9')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    // Ground
    ctx.fillStyle = '#8B6914'
    ctx.fillRect(0, CANVAS_H - 30, CANVAS_W, 30)
    ctx.fillStyle = '#5a8a00'
    ctx.fillRect(0, CANVAS_H - 30, CANVAS_W, 8)

    // Pipes
    pipes.forEach(pipe => {
      const topH = pipe.gapY - PIPE_GAP / 2
      const botY = pipe.gapY + PIPE_GAP / 2

      // Pipe body
      ctx.fillStyle = '#4caf50'
      ctx.fillRect(pipe.x, 0, PIPE_W, topH)
      ctx.fillRect(pipe.x, botY, PIPE_W, CANVAS_H - botY)

      // Pipe cap
      ctx.fillStyle = '#388e3c'
      ctx.fillRect(pipe.x - 4, topH - 20, PIPE_W + 8, 20)
      ctx.fillRect(pipe.x - 4, botY, PIPE_W + 8, 20)

      // Pipe highlight
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.fillRect(pipe.x + 4, 0, 8, topH)
      ctx.fillRect(pipe.x + 4, botY, 8, CANVAS_H - botY)
    })

    // Bird body
    const wingOffset = phase === 'playing' ? Math.sin(frame * 0.3) * 4 : 0
    ctx.save()
    ctx.translate(BIRD_X, bird.y)
    // Tilt with velocity
    const tilt = Math.max(-0.5, Math.min(0.8, bird.vy * 0.05))
    ctx.rotate(tilt)

    // Body
    ctx.fillStyle = '#FFD700'
    ctx.beginPath()
    ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2)
    ctx.fill()

    // Wing
    ctx.fillStyle = '#FFA500'
    ctx.beginPath()
    ctx.ellipse(-4, wingOffset, 10, 7, -0.4, 0, Math.PI * 2)
    ctx.fill()

    // Eye
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(6, -4, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#222'
    ctx.beginPath()
    ctx.arc(7, -4, 2.5, 0, Math.PI * 2)
    ctx.fill()

    // Beak
    ctx.fillStyle = '#ff6600'
    ctx.beginPath()
    ctx.moveTo(BIRD_R - 2, -1)
    ctx.lineTo(BIRD_R + 8, 2)
    ctx.lineTo(BIRD_R - 2, 5)
    ctx.closePath()
    ctx.fill()

    ctx.restore()

    // Score
    ctx.fillStyle = '#fff'
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 3
    ctx.font = 'bold 36px "Segoe UI", system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.strokeText(String(score), CANVAS_W / 2, 60)
    ctx.fillText(String(score), CANVAS_W / 2, 60)

    // Overlay
    if (phase === 'idle') {
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 42px "Segoe UI", system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Flappy Bird', CANVAS_W / 2, CANVAS_H / 2 - 30)
      ctx.font = '20px "Segoe UI", system-ui, sans-serif'
      ctx.fillStyle = '#ffe'
      ctx.fillText('Press Space or Tap to start', CANVAS_W / 2, CANVAS_H / 2 + 20)
    }

    if (phase === 'dead') {
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      ctx.fillStyle = '#ff4444'
      ctx.font = 'bold 42px "Segoe UI", system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Game Over', CANVAS_W / 2, CANVAS_H / 2 - 50)
      ctx.fillStyle = '#fff'
      ctx.font = '24px "Segoe UI", system-ui, sans-serif'
      ctx.fillText(`Score: ${score}`, CANVAS_W / 2, CANVAS_H / 2)
      ctx.fillText(`Best: ${state.best}`, CANVAS_W / 2, CANVAS_H / 2 + 36)
      ctx.font = '18px "Segoe UI", system-ui, sans-serif'
      ctx.fillStyle = '#ffe'
      ctx.fillText('Press Space or Tap to restart', CANVAS_W / 2, CANVAS_H / 2 + 80)
    }
  }, [])

  const flap = useCallback(() => {
    const s = stateRef.current
    if (s.phase === 'idle') {
      stateRef.current = {
        ...initialState(),
        best: s.best,
        phase: 'playing',
        bird: { y: CANVAS_H / 2, vy: JUMP_VEL },
        lastPipeTime: performance.now(),
      }
      return
    }
    if (s.phase === 'dead') {
      stateRef.current = {
        ...initialState(),
        best: s.best,
        phase: 'playing',
        bird: { y: CANVAS_H / 2, vy: JUMP_VEL },
        lastPipeTime: performance.now(),
      }
      return
    }
    // playing
    stateRef.current = {
      ...s,
      bird: { ...s.bird, vy: JUMP_VEL },
    }
  }, [])

  const loop = useCallback((timestamp: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    lastTimeRef.current = timestamp

    let s = stateRef.current

    if (s.phase === 'playing') {
      // Physics
      const newVy = s.bird.vy + GRAVITY
      const newY = s.bird.y + newVy
      const newFrame = s.frame + 1

      // Spawn pipes
      let pipes = s.pipes
      if (timestamp - s.lastPipeTime > PIPE_INTERVAL) {
        pipes = [...pipes, { x: CANVAS_W + 10, gapY: randomGapY() }]
        s = { ...s, lastPipeTime: timestamp }
      }

      // Move pipes & score
      let score = s.score
      pipes = pipes.map(p => {
        const nx = p.x - PIPE_SPEED
        // Bird just passed pipe centre
        if (p.x > BIRD_X && nx <= BIRD_X) score += 1
        return { ...p, x: nx }
      })
      // Remove off-screen
      pipes = pipes.filter(p => p.x + PIPE_W > 0)

      const bird: Bird = { y: newY, vy: newVy }

      // Collision: ground / ceiling
      const hitGround = newY + BIRD_R > CANVAS_H - 30
      const hitCeiling = newY - BIRD_R < 0
      const hitPipe = pipes.some(p => collides(bird, p))

      if (hitGround || hitCeiling || hitPipe) {
        stateRef.current = {
          ...s,
          phase: 'dead',
          bird,
          pipes,
          score,
          best: Math.max(score, s.best),
          frame: newFrame,
        }
      } else {
        stateRef.current = { ...s, bird, pipes, score, frame: newFrame }
      }
    }

    draw(ctx, stateRef.current)
    rafRef.current = requestAnimationFrame(loop)
  }, [draw, canvasRef])

  useEffect(() => {
    lastTimeRef.current = performance.now()
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [loop])

  return { flap }
}
