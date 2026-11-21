import { useRef, useEffect, useCallback } from 'react'
import { useFlappyBird, CANVAS_W, CANVAS_H } from './useFlappyBird'
import styles from './App.module.css'

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { flap } = useFlappyBird(canvasRef)

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault()
        flap()
      }
    },
    [flap],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  return (
    <div className={styles.wrapper}>
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className={styles.canvas}
        onClick={flap}
      />
    </div>
  )
}
