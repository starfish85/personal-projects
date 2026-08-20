<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import { FILTERS, TYPE_META } from '../data/pois'
import { showToast } from '../stores/app'
import { isInsidePark, leafletBounds } from '../utils/geo'

const props = defineProps({
  pois: { type: Array, default: () => [] },
  user: { type: Object, default: null },
  route: { type: Array, default: () => [] },
  activeFilter: { type: String, default: '' },
  selectedId: { type: String, default: '' },
  showFilters: { type: Boolean, default: false },
})

const emit = defineEmits(['select', 'filter', 'locate'])

const el = ref(null)
const filtersEl = ref(null)
let map
let overlay
let userLayer
let poiLayer
let routeLayer

function typeIcon(poi, selected) {
  const meta = TYPE_META[poi.type]
  const isSpot = poi.type === 'attraction'
  const coverIcon = poi.type === 'food' || poi.type === 'toilet'
  const size = selected
    ? isSpot
      ? 22
      : coverIcon
        ? 30
        : 42
    : isSpot
      ? 14
      : coverIcon
        ? 26
        : 32
  const cls = `poi-pin ${selected ? 'sel' : ''} ${isSpot ? 'dot' : ''}`
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div class="${cls}" style="--c:${meta.pin};--ink:${meta.ink}">${isSpot ? '' : meta.icon}</div>`,
  })
}

function userIcon() {
  return L.divIcon({
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: '<div class="me-dot"></div>',
  })
}

function drawPois() {
  if (!poiLayer) return
  poiLayer.clearLayers()
  for (const poi of props.pois) {
    L.marker([poi.lat, poi.lng], {
      icon: typeIcon(poi, poi.id === props.selectedId),
      zIndexOffset: poi.id === props.selectedId ? 400 : 200,
    })
      .on('click', () => emit('select', poi))
      .addTo(poiLayer)
  }
}

function drawUser() {
  if (!userLayer) return
  userLayer.clearLayers()
  if (!props.user) return
  L.marker([props.user.lat, props.user.lng], {
    icon: userIcon(),
    zIndexOffset: 600,
    interactive: false,
  }).addTo(userLayer)
}

function drawRoute() {
  if (!routeLayer) return
  routeLayer.clearLayers()
  if (!props.route?.length) return
  L.polyline(
    props.route.map((p) => [p.lat, p.lng]),
    { color: '#1570ef', weight: 6, opacity: 0.9 },
  ).addTo(routeLayer)
}

onMounted(() => {
  const bounds = leafletBounds()
  map = L.map(el.value, {
    crs: L.CRS.EPSG3857,
    zoomControl: true,
    attributionControl: false,
    minZoom: 14,
    maxZoom: 18,
  })
  const mapUrl = `${import.meta.env.BASE_URL}maps/park.jpg?v=3`
  overlay = L.imageOverlay(mapUrl, bounds, { opacity: 1, interactive: false })
  overlay.addTo(map)
  map.fitBounds(bounds, { padding: [8, 8], animate: false })
  map.setMaxBounds(bounds)
  map.options.maxBoundsViscosity = 1
  routeLayer = L.layerGroup().addTo(map)
  poiLayer = L.layerGroup().addTo(map)
  userLayer = L.layerGroup().addTo(map)
  drawRoute()
  drawPois()
  drawUser()
  if (filtersEl.value) {
    L.DomEvent.disableClickPropagation(filtersEl.value)
    L.DomEvent.disableScrollPropagation(filtersEl.value)
  }
  requestAnimationFrame(() => map.invalidateSize())
})

watch(() => props.pois, drawPois, { deep: true })
watch(() => props.selectedId, drawPois)
watch(() => props.user, drawUser, { deep: true })
watch(() => props.route, drawRoute, { deep: true })

onBeforeUnmount(() => {
  map?.remove()
  map = null
})

function locate() {
  emit('locate')
  if (!map) return
  map.stop()
  const bounds = leafletBounds()
  const here = props.user
  if (here && isInsidePark(here) && Number.isFinite(here.lat) && Number.isFinite(here.lng)) {
    map.setView([here.lat, here.lng], Math.max(map.getZoom(), 16), { animate: false })
  } else {
    map.fitBounds(bounds, { padding: [8, 8], animate: false })
    if (here) showToast('您不在园内，已回到全园地图')
    else showToast('还没有定位，已回到全园地图')
  }
  requestAnimationFrame(() => map.invalidateSize())
}

defineExpose({ locate, invalidate: () => map?.invalidateSize() })
</script>

<template>
  <div class="wrap">
    <div ref="el" class="map" />
    <div
      v-if="showFilters"
      ref="filtersEl"
      class="filters"
      @pointerdown.stop
      @mousedown.stop
      @touchstart.stop
    >
      <button
        v-for="item in FILTERS"
        :key="item.id"
        type="button"
        class="chip"
        :class="{ on: activeFilter === item.id }"
        @click.stop="$emit('filter', activeFilter === item.id ? '' : item.id)"
      >
        {{ item.label }}
      </button>
      <button type="button" class="chip locate" @click.stop="locate">回到当前位置</button>
    </div>
  </div>
</template>

<style scoped>
.wrap {
  position: relative;
  height: 100%;
  overflow: hidden;
}
.map {
  height: 100%;
  width: 100%;
  overflow: hidden;
  z-index: 0;
}
.filters {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 10px;
  z-index: 2000;
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 4px 2px;
  pointer-events: auto;
}
.chip {
  flex: 0 0 auto;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.95);
  border: 0;
  color: var(--primary);
  font-weight: 800;
  font-size: var(--fs-xs);
  box-shadow: var(--shadow);
}
.chip.on {
  background: var(--primary);
  color: #fff;
}
</style>

<style>
.poi-pin {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--c, #d08a84);
  color: var(--ink, #8d4a44);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
  box-sizing: border-box;
}
.poi-pin.dot {
  border-width: 2px;
  box-shadow: 0 0 0 1px rgba(160, 20, 20, 0.35);
}
.poi-pin.sel {
  outline: 3px solid #111;
}
.me-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #1570ef;
  border: 3px solid #fff;
  box-shadow: 0 0 0 8px rgba(21, 112, 239, 0.25);
}
</style>
