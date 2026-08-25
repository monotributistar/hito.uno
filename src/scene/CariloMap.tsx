import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { experiences, type Experience, type ExperienceId } from '../experience-data'
import cariloSource from '../map/generated/carilo.compact.json'

type Point2 = [number, number]
type Building = { id: number; height: number; points: Point2[] }
type Road = {
  id: number
  kind: 'avenue' | 'street' | 'service' | 'path'
  width: number
  points: Point2[]
}
type Area = { id: number; kind: 'water' | 'park' | 'forest'; points: Point2[] }
type MapData = {
  scaleMetersPerUnit: number
  buildings: Building[]
  roads: Road[]
  areas: Area[]
  trees: [number, number, number][]
}

const mapData = cariloSource as unknown as MapData
const MAP_SCALE = 1 / mapData.scaleMetersPerUnit
const MAP_POSITION = new THREE.Vector3(20, -3.5, -2)
const MAP_ROTATION = -0.08
const up = new THREE.Vector3(0, 1, 0)

function mapPointToWorld([x, z]: Point2) {
  return new THREE.Vector3(x, 0, z)
    .multiplyScalar(MAP_SCALE)
    .applyAxisAngle(up, MAP_ROTATION)
    .add(MAP_POSITION)
}

function makeShape(points: Point2[]) {
  const shape = new THREE.Shape()
  points.forEach(([x, z], index) => {
    if (index === 0) shape.moveTo(x, -z)
    else shape.lineTo(x, -z)
  })
  return shape
}

function CityBuildings() {
  const geometry = useMemo(() => {
    const parts = mapData.buildings.map((building) => {
      const part = new THREE.ExtrudeGeometry(makeShape(building.points), {
        depth: building.height * 2.8,
        bevelEnabled: false,
        curveSegments: 1,
      })
      part.rotateX(-Math.PI / 2)
      part.computeVertexNormals()
      return part
    })
    const merged = mergeGeometries(parts, false)
    parts.forEach((part) => part.dispose())
    return merged
  }, [])
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry, 24), [geometry])

  return (
    <group>
      <mesh geometry={geometry}>
        <meshLambertMaterial color="#bfd5ca" transparent opacity={0.9} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#234f52" transparent opacity={0.88} />
      </lineSegments>
    </group>
  )
}

function MapAreas() {
  const geometries = useMemo(() => {
    const grouped = new Map<Area['kind'], THREE.BufferGeometry[]>()
    for (const area of mapData.areas) {
      const geometry = new THREE.ShapeGeometry(makeShape(area.points))
      geometry.rotateX(-Math.PI / 2)
      geometry.translate(0, 0.05, 0)
      grouped.set(area.kind, [...(grouped.get(area.kind) ?? []), geometry])
    }
    return [...grouped.entries()].map(([kind, parts]) => {
      const geometry = mergeGeometries(parts, false)
      parts.forEach((part) => part.dispose())
      return { kind, geometry }
    })
  }, [])
  const colors: Record<Area['kind'], string> = {
    water: '#a9dce0',
    park: '#d6e7d2',
    forest: '#c9dfd1',
  }

  return geometries.map(({ kind, geometry }) => (
    <mesh geometry={geometry} key={kind}>
      <meshBasicMaterial color={colors[kind]} transparent opacity={0.72} />
    </mesh>
  ))
}

function Roads() {
  const segments = useMemo(() => mapData.roads.flatMap((road) => (
    road.points.slice(0, -1).map((start, index) => {
      const end = road.points[index + 1]
      const dx = end[0] - start[0]
      const dz = end[1] - start[1]
      return {
        x: (start[0] + end[0]) / 2,
        z: (start[1] + end[1]) / 2,
        length: Math.hypot(dx, dz),
        width: road.width,
        angle: -Math.atan2(dz, dx),
      }
    })
  )), [])
  const lineGeometry = useMemo(() => {
    const positions = mapData.roads.flatMap((road) => road.points.slice(0, -1).flatMap((start, index) => {
      const end = road.points[index + 1]
      return [start[0], 0.24, start[1], end[0], 0.24, end[1]]
    }))
    return new THREE.BufferGeometry().setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    )
  }, [])

  const setInstances = (mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return
    const matrix = new THREE.Matrix4()
    const quaternion = new THREE.Quaternion()
    const position = new THREE.Vector3()
    const scale = new THREE.Vector3()
    segments.forEach((segment, index) => {
      position.set(segment.x, 0.12, segment.z)
      quaternion.setFromAxisAngle(up, segment.angle)
      scale.set(segment.length + 0.8, 0.16, segment.width)
      matrix.compose(position, quaternion, scale)
      mesh.setMatrixAt(index, matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }

  return (
    <group>
      <instancedMesh ref={setInstances} args={[undefined, undefined, segments.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#f4f2e8" />
      </instancedMesh>
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial color="#6f9993" transparent opacity={0.48} />
      </lineSegments>
    </group>
  )
}

function Trees() {
  const setInstances = (mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return
    const matrix = new THREE.Matrix4()
    const quaternion = new THREE.Quaternion()
    const position = new THREE.Vector3()
    const scale = new THREE.Vector3()
    mapData.trees.forEach(([x, z, height], index) => {
      position.set(x, height * 0.8, z)
      quaternion.setFromAxisAngle(up, (index * 2.39996) % (Math.PI * 2))
      const radius = 1.2 + (index % 3) * 0.22
      scale.set(radius, (height * 1.6) / 5, radius)
      matrix.compose(position, quaternion, scale)
      mesh.setMatrixAt(index, matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }

  return (
    <instancedMesh ref={setInstances} args={[undefined, undefined, mapData.trees.length]}>
      <coneGeometry args={[2.2, 5, 5]} />
      <meshLambertMaterial color="#65957c" transparent opacity={0.72} />
    </instancedMesh>
  )
}

function pointOnRoad(points: Point2[], progress: number) {
  const lengths = points.slice(0, -1).map((start, index) => (
    Math.hypot(points[index + 1][0] - start[0], points[index + 1][1] - start[1])
  ))
  const total = lengths.reduce((sum, value) => sum + value, 0)
  let distance = progress * total

  for (let index = 0; index < lengths.length; index += 1) {
    if (distance <= lengths[index]) {
      const ratio = lengths[index] === 0 ? 0 : distance / lengths[index]
      const start = points[index]
      const end = points[index + 1]
      return {
        x: THREE.MathUtils.lerp(start[0], end[0], ratio),
        z: THREE.MathUtils.lerp(start[1], end[1], ratio),
        angle: -Math.atan2(end[1] - start[1], end[0] - start[0]),
      }
    }
    distance -= lengths[index]
  }
  return { x: points[0][0], z: points[0][1], angle: 0 }
}

function Traffic({ reducedMotion }: { reducedMotion: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const routes = useMemo(() => mapData.roads
    .filter((road) => road.kind !== 'path' && road.points.length >= 3)
    .sort((a, b) => b.points.length - a.points.length)
    .slice(0, 16), [])

  useFrame(() => {
    if (!mesh.current) return
    const matrix = new THREE.Matrix4()
    const quaternion = new THREE.Quaternion()
    const position = new THREE.Vector3()
    const scale = new THREE.Vector3(2.4, 0.7, 1.05)
    const time = reducedMotion ? 0 : performance.now() * 0.000018
    routes.forEach((road, index) => {
      const location = pointOnRoad(road.points, (time + index / routes.length) % 1)
      position.set(location.x, 0.72, location.z)
      quaternion.setFromAxisAngle(up, location.angle)
      matrix.compose(position, quaternion, scale)
      mesh.current?.setMatrixAt(index, matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, routes.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#ed8068" />
    </instancedMesh>
  )
}

function CameraRig({ reducedMotion, experience }: { reducedMotion: boolean; experience: Experience }) {
  const lookTarget = useRef(new THREE.Vector3(14, -1, 0))

  useFrame(({ camera }, delta) => {
    const target = mapPointToWorld(experience.focus)
    const time = reducedMotion ? 0 : performance.now() * 0.001
    const driftX = reducedMotion ? 0 : Math.sin(time * 0.22) * 0.7
    const driftZ = reducedMotion ? 0 : Math.cos(time * 0.17) * 0.55
    const desiredPosition = new THREE.Vector3(
      target.x + 43 + driftX,
      target.y + 56,
      target.z + 43 + driftZ,
    )

    const damping = reducedMotion ? 1 : 1 - Math.exp(-delta * 2.4)
    camera.position.lerp(desiredPosition, damping)
    lookTarget.current.lerp(target, damping)
    camera.lookAt(lookTarget.current)

    if (camera instanceof THREE.OrthographicCamera) {
      camera.zoom = reducedMotion
        ? experience.zoom
        : THREE.MathUtils.damp(camera.zoom, experience.zoom, 2.6, delta)
      camera.updateProjectionMatrix()
    }
  })
  return null
}

function ProductMarker({ position, index, reducedMotion }: {
  position: Point2
  index: number
  reducedMotion: boolean
}) {
  const marker = useRef<THREE.Group>(null)

  useFrame(() => {
    if (!marker.current || reducedMotion) return
    const wave = (Math.sin(performance.now() * 0.003 + index * 1.4) + 1) / 2
    marker.current.scale.setScalar(1 + wave * 0.14)
  })

  return (
    <group ref={marker} position={[position[0], 0.5, position[1]]}>
      <mesh position={[0, 27, 0]} renderOrder={4}>
        <cylinderGeometry args={[0.8, 0.8, 54, 8]} />
        <meshBasicMaterial color="#ed8068" transparent opacity={0.82} depthTest={false} />
      </mesh>
      <mesh position={[0, 56, 0]} renderOrder={5}>
        <octahedronGeometry args={[5.2, 0]} />
        <meshBasicMaterial color="#ed8068" depthTest={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1, 0]} renderOrder={4}>
        <ringGeometry args={[7 + index * 1.3, 9 + index * 1.3, 24]} />
        <meshBasicMaterial color="#ed8068" transparent opacity={0.86} side={THREE.DoubleSide} depthTest={false} />
      </mesh>
    </group>
  )
}

function ProductMarkers({ experience, reducedMotion }: { experience: Experience; reducedMotion: boolean }) {
  return (
    <group>
      {experience.products.map((product, index) => (
        <ProductMarker
          key={`${experience.id}-${product.label}`}
          position={product.marker}
          index={index}
          reducedMotion={reducedMotion}
        />
      ))}
    </group>
  )
}

function Scene({ activeId }: { activeId: ExperienceId }) {
  const reducedMotion = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const experience = experiences.find((item) => item.id === activeId) ?? experiences[0]
  return (
    <>
      <color attach="background" args={['#eef1e8']} />
      <fog attach="fog" args={['#eef1e8', 125, 220]} />
      <hemisphereLight args={['#f9fbf1', '#9cb2a4', 2.3]} />
      <directionalLight color="#fff9e8" intensity={2.1} position={[35, 70, 20]} />
      <CameraRig reducedMotion={reducedMotion} experience={experience} />
      <group scale={MAP_SCALE} position={MAP_POSITION} rotation={[0, MAP_ROTATION, 0]}>
        <MapAreas />
        <Roads />
        <CityBuildings />
        <Trees />
        <Traffic reducedMotion={reducedMotion} />
        <ProductMarkers experience={experience} reducedMotion={reducedMotion} />
      </group>
    </>
  )
}

export default function CariloMap({ activeId }: { activeId: ExperienceId }) {
  return (
    <Canvas
      orthographic
      dpr={[1, 1.5]}
      camera={{ position: [66, 72, 66], zoom: 7.2, near: 0.1, far: 280 }}
      gl={{ alpha: false, antialias: true, powerPreference: 'high-performance' }}
    >
      <Scene activeId={activeId} />
    </Canvas>
  )
}
