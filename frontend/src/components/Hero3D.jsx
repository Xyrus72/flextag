/**
 * Hero3D — WebGL background scene for the landing hero.
 *
 * Meaningful, not decorative: golden cashback coins rise from the bottom of
 * the viewport (money flowing back to creators), orbiting a holographic
 * wireframe core that echoes the FlexTag orbit motif. The camera drifts with
 * the cursor for depth.
 *
 * Loaded lazily (React.lazy) so three.js stays out of the main bundle —
 * dashboard pages never pay for it.
 */

import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sparkles, Float } from '@react-three/drei'
import * as THREE from 'three'

/* ── Camera drifts toward the cursor ─────────────────────────────────────── */
function CameraRig() {
  useFrame((state) => {
    const { camera, pointer } = state
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, pointer.x * 1.6, 0.04)
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, pointer.y * 0.9, 0.04)
    camera.lookAt(0, 0, 0)
  })
  return null
}

/* ── One golden coin ─────────────────────────────────────────────────────── */
function Coin({ seed }) {
  const ref = useRef()
  // Deterministic pseudo-random layout from the seed
  const cfg = useMemo(() => {
    const rand = (n) => {
      const x = Math.sin(seed * 127.1 + n * 311.7) * 43758.5453
      return x - Math.floor(x)
    }
    return {
      x:       (rand(1) - 0.5) * 22,
      z:       -2 - rand(2) * 10,
      y0:      -8 + rand(3) * 16,
      speed:   0.35 + rand(4) * 0.55,
      spin:    0.4 + rand(5) * 1.2,
      wobble:  rand(6) * Math.PI * 2,
      scale:   0.22 + rand(7) * 0.3,
    }
  }, [seed])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    // Rise, then wrap back to the bottom
    const y = ((cfg.y0 + t * cfg.speed + 8) % 16) - 8
    ref.current.position.set(cfg.x + Math.sin(t * 0.5 + cfg.wobble) * 0.4, y, cfg.z)
    ref.current.rotation.x = t * cfg.spin
    ref.current.rotation.z = t * cfg.spin * 0.6
    // Fade near the wrap edges so coins never pop in/out
    const edge = 1 - Math.min(1, Math.max(0, (Math.abs(y) - 6) / 2))
    ref.current.material.opacity = edge * 0.9
  })

  return (
    <mesh ref={ref} scale={cfg.scale}>
      <cylinderGeometry args={[1, 1, 0.18, 24]} />
      <meshStandardMaterial
        color="#f5b942"
        emissive="#7a4b00"
        emissiveIntensity={0.55}
        metalness={0.9}
        roughness={0.25}
        transparent
      />
    </mesh>
  )
}

/* ── Holographic wireframe core behind the phone ─────────────────────────── */
function HoloCore() {
  const outer = useRef()
  const inner = useRef()
  useFrame((state) => {
    const t = state.clock.elapsedTime
    outer.current.rotation.x = t * 0.12
    outer.current.rotation.y = t * 0.18
    inner.current.rotation.x = -t * 0.2
    inner.current.rotation.z = t * 0.15
    const pulse = 1 + Math.sin(t * 1.4) * 0.04
    outer.current.scale.setScalar(pulse)
  })
  return (
    <group position={[3.2, 0.2, -4]}>
      <mesh ref={outer}>
        <icosahedronGeometry args={[3.4, 1]} />
        <meshBasicMaterial color="#7c3aed" wireframe transparent opacity={0.22} />
      </mesh>
      <mesh ref={inner}>
        <torusGeometry args={[2.2, 0.015, 8, 96]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.5} />
      </mesh>
    </group>
  )
}

/* ── Second, dimmer core on the text side for balance ────────────────────── */
function EchoCore() {
  const ref = useRef()
  useFrame((state) => {
    const t = state.clock.elapsedTime
    ref.current.rotation.y = -t * 0.1
    ref.current.rotation.x = t * 0.07
  })
  return (
    <mesh ref={ref} position={[-7, -2.5, -8]}>
      <octahedronGeometry args={[2.6, 0]} />
      <meshBasicMaterial color="#ec4899" wireframe transparent opacity={0.1} />
    </mesh>
  )
}

export default function Hero3D() {
  const coins = useMemo(() => Array.from({ length: 18 }, (_, i) => i + 1), [])
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 12], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <fog attach="fog" args={['#050816', 10, 24]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 6, 5]} intensity={1.4} color="#a78bfa" />
      <pointLight position={[-6, -3, 2]} intensity={12} color="#06b6d4" />

      <CameraRig />
      <HoloCore />
      <EchoCore />
      <Float speed={1.2} rotationIntensity={0.3} floatIntensity={0.6}>
        <group>{coins.map(seed => <Coin key={seed} seed={seed} />)}</group>
      </Float>
      <Sparkles count={90} scale={[24, 12, 8]} size={2} speed={0.35} opacity={0.5} color="#67e8f9" />
    </Canvas>
  )
}
