import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(scriptDir, '../..')
const regionPath = resolve(scriptDir, 'map-region.json')
const queryPath = resolve(scriptDir, 'map-query.overpassql')
const outputDir = resolve(projectRoot, 'src/map/generated')
const outputPath = resolve(outputDir, 'carilo.compact.json')
const manifestPath = resolve(outputDir, 'carilo.manifest.json')
const endpoint = 'https://overpass-api.de/api/interpreter'

const region = JSON.parse(await readFile(regionPath, 'utf8'))
const queryTemplate = await readFile(queryPath, 'utf8')
const query = queryTemplate.replace('{{bbox}}', region.bbox.join(','))

const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
    'user-agent': 'hito.uno-map-prototype/0.1 (https://hito.uno)',
  },
  body: new URLSearchParams({ data: query }),
})

if (!response.ok) {
  throw new Error(`Overpass responded with ${response.status} ${response.statusText}`)
}

const source = await response.json()
const [centerLat, centerLon] = region.center
const cosLat = Math.cos((centerLat * Math.PI) / 180)
const round = (value) => Math.round(value * 4) / 4

function projectPoint({ lat, lon }) {
  return [
    round((lon - centerLon) * 111_320 * cosLat),
    round(-(lat - centerLat) * 110_540),
  ]
}

function squaredDistance(point, start, end) {
  let x = start[0]
  let y = start[1]
  let dx = end[0] - x
  let dy = end[1] - y

  if (dx !== 0 || dy !== 0) {
    const t = ((point[0] - x) * dx + (point[1] - y) * dy) / (dx * dx + dy * dy)
    if (t > 1) {
      x = end[0]
      y = end[1]
    } else if (t > 0) {
      x += dx * t
      y += dy * t
    }
  }

  dx = point[0] - x
  dy = point[1] - y
  return dx * dx + dy * dy
}

function simplify(points, tolerance) {
  if (points.length <= 2) return points

  const first = points[0]
  const last = points.at(-1)
  let maxDistance = tolerance * tolerance
  let index = -1

  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = squaredDistance(points[i], first, last)
    if (distance > maxDistance) {
      index = i
      maxDistance = distance
    }
  }

  if (index === -1) return [first, last]
  const left = simplify(points.slice(0, index + 1), tolerance)
  const right = simplify(points.slice(index), tolerance)
  return [...left.slice(0, -1), ...right]
}

function closePolygon(points) {
  if (points.length < 3) return points
  const [firstX, firstY] = points[0]
  const [lastX, lastY] = points.at(-1)
  return firstX === lastX && firstY === lastY ? points : [...points, points[0]]
}

function polygonArea(points) {
  let area = 0
  for (let index = 0; index < points.length - 1; index += 1) {
    area += points[index][0] * points[index + 1][1]
    area -= points[index + 1][0] * points[index][1]
  }
  return Math.abs(area) / 2
}

function buildingHeight(tags, id) {
  const explicitHeight = Number.parseFloat(tags.height)
  const levels = Number.parseFloat(tags['building:levels'])
  const candidate = Number.isFinite(explicitHeight)
    ? explicitHeight
    : Number.isFinite(levels)
      ? levels * 3
      : 4.5 + (id % 7) * 1.15
  return round(Math.min(18, Math.max(3.5, candidate)))
}

function roadClass(tags) {
  const value = tags.highway
  if (['primary', 'secondary', 'tertiary'].includes(value)) return 'avenue'
  if (['residential', 'living_street', 'unclassified'].includes(value)) return 'street'
  if (['service', 'track'].includes(value)) return 'service'
  return 'path'
}

const roadWidths = { avenue: 8, street: 5.5, service: 3.5, path: 1.8 }
const buildings = []
const roads = []
const areas = []

for (const element of source.elements ?? []) {
  if (element.type !== 'way' || !Array.isArray(element.geometry)) continue
  const rawPoints = element.geometry.map(projectPoint)
  const tags = element.tags ?? {}

  if (tags.building) {
    const points = closePolygon(simplify(closePolygon(rawPoints), region.simplification.buildingsMeters))
    if (points.length >= 4 && polygonArea(points) >= 18) {
      buildings.push({ id: element.id, height: buildingHeight(tags, element.id), points })
    }
    continue
  }

  if (tags.highway) {
    const kind = roadClass(tags)
    const points = simplify(rawPoints, region.simplification.roadsMeters)
    if (points.length >= 2) roads.push({ id: element.id, kind, width: roadWidths[kind], points })
    continue
  }

  const areaKind = tags.natural === 'water' || tags.waterway ? 'water' : tags.leisure === 'park' ? 'park' : 'forest'
  const points = closePolygon(simplify(closePolygon(rawPoints), region.simplification.areasMeters))
  if (points.length >= 4 && polygonArea(points) >= 80) {
    areas.push({ id: element.id, kind: areaKind, points })
  }
}

function pointInPolygon(point, polygon) {
  let inside = false
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const [x, y] = polygon[index]
    const [prevX, prevY] = polygon[previous]
    const intersects = y > point[1] !== prevY > point[1]
      && point[0] < ((prevX - x) * (point[1] - y)) / (prevY - y || 1) + x
    if (intersects) inside = !inside
  }
  return inside
}

function distanceToRoad(point) {
  let closest = Number.POSITIVE_INFINITY
  for (const road of roads) {
    for (let index = 0; index < road.points.length - 1; index += 1) {
      closest = Math.min(closest, squaredDistance(point, road.points[index], road.points[index + 1]))
    }
  }
  return Math.sqrt(closest)
}

function mulberry32(seed) {
  return () => {
    let value = (seed += 0x6d2b79f5)
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
  }
}

const projectedCorners = [
  projectPoint({ lat: region.bbox[0], lon: region.bbox[1] }),
  projectPoint({ lat: region.bbox[2], lon: region.bbox[3] }),
]
const minX = Math.min(projectedCorners[0][0], projectedCorners[1][0])
const maxX = Math.max(projectedCorners[0][0], projectedCorners[1][0])
const minZ = Math.min(projectedCorners[0][1], projectedCorners[1][1])
const maxZ = Math.max(projectedCorners[0][1], projectedCorners[1][1])
const random = mulberry32(224307646)
const trees = []

for (let attempt = 0; attempt < 3_500 && trees.length < 260; attempt += 1) {
  const point = [round(minX + random() * (maxX - minX)), round(minZ + random() * (maxZ - minZ))]
  const insideBuilding = buildings.some((building) => pointInPolygon(point, building.points))
  const insideWater = areas.some((area) => area.kind === 'water' && pointInPolygon(point, area.points))
  if (!insideBuilding && !insideWater && distanceToRoad(point) > 7) {
    trees.push([point[0], point[1], round(5 + random() * 7)])
  }
}

const compact = {
  schemaVersion: 1,
  id: region.id,
  label: region.label,
  center: region.center,
  bounds: [minX, minZ, maxX, maxZ],
  scaleMetersPerUnit: region.scaleMetersPerUnit,
  buildings,
  roads,
  areas,
  trees,
}

const compactJson = `${JSON.stringify(compact)}\n`
const querySha256 = createHash('sha256').update(query).digest('hex')
const artifactSha256 = createHash('sha256').update(compactJson).digest('hex')
const manifest = {
  schemaVersion: 1,
  source: 'OpenStreetMap',
  attribution: '© OpenStreetMap contributors',
  license: 'ODbL',
  licenseUrl: 'https://www.openstreetmap.org/copyright',
  endpoint,
  bbox: region.bbox,
  snapshotAt: new Date().toISOString(),
  querySha256,
  artifactSha256,
  counts: {
    sourceWays: source.elements?.length ?? 0,
    buildings: buildings.length,
    roads: roads.length,
    areas: areas.length,
    proceduralTrees: trees.length,
  },
}

await mkdir(outputDir, { recursive: true })
await writeFile(outputPath, compactJson)
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

console.log(`Generated ${outputPath}`)
console.log(manifest.counts)
