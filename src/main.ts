import maplibregl, { GeoJSONSource, LngLatBounds, Map as MlMap, MapLayerMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import rawRegions from '../data/regions.json';

type SuperregionId = 'americas' | 'asia-pacific' | 'emea';

interface Region {
  id: string;
  name: string;
  superregion: SuperregionId;
  status: 'regional-rep' | 'contact-person';
  lat: number;
  lng: number;
  website: string | null;
  logo: string | null;
}

interface Superregion {
  label: string;
  color: string;
  event: { name: string; url: string };
}

// Okabe-Ito palette: distinguishable with common colour-vision deficiencies.
const SUPERREGIONS: Record<SuperregionId, Superregion> = {
  americas: { label: 'Americas', color: '#0072B2', event: { name: 'Americas Open', url: 'https://robocupamericas.org/' } },
  'asia-pacific': { label: 'Asia-Pacific', color: '#D55E00', event: { name: 'Asia-Pacific Open', url: 'https://robocupap.org/' } },
  emea: { label: 'Europe, Middle East & Africa', color: '#009E73', event: { name: 'European Open', url: 'https://www.robocupjunior.eu/' } },
};

const CONTACT = 'junior_execs [@] lists.robocup.org';
const regions = (rawRegions as Region[]).slice().sort((a, b) => a.name.localeCompare(b.name));
const byId = new Map(regions.map((r) => [r.id, r]));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const state: { filter: SuperregionId | 'all'; query: string; selected: string | null } = {
  filter: 'all',
  query: '',
  selected: null,
};

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const browse = $('browse');
const detail = $('detail');
const list = $<HTMLUListElement>('list');
const count = $('count');
const search = $<HTMLInputElement>('search');

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function visibleRegions() {
  const q = state.query.trim().toLowerCase();
  return regions.filter(
    (r) => (state.filter === 'all' || r.superregion === state.filter) && (!q || r.name.toLowerCase().includes(q)),
  );
}

function logoImg(r: Region, size: 'sm' | 'lg', alt: string) {
  if (!r.logo) {
    const ph = el('span', `logo logo-${size} logo-empty`, r.name.charAt(0));
    ph.setAttribute('aria-hidden', 'true');
    return ph;
  }
  const img = el('img', `logo logo-${size}`);
  img.src = r.logo;
  img.alt = alt;
  img.loading = 'lazy';
  img.decoding = 'async';
  return img;
}

function srTag(id: SuperregionId) {
  const t = el('span', 'tag', SUPERREGIONS[id].label);
  t.style.setProperty('--c', SUPERREGIONS[id].color);
  return t;
}

// ---------- panel ----------

function renderSummary() {
  const n = (id: SuperregionId) => regions.filter((r) => r.superregion === id).length;
  $('summary').textContent =
    `${regions.length} regions across three SuperRegions: ${n('americas')} in the Americas, ` +
    `${n('asia-pacific')} in Asia-Pacific and ${n('emea')} in Europe, the Middle East and Africa. ` +
    `Find yours to discover local events and contacts.`;
}

function renderFilters() {
  const box = $('filters');
  const opts: [SuperregionId | 'all', string][] = [['all', 'All'], ...Object.entries(SUPERREGIONS).map(([k, v]) => [k as SuperregionId, v.label] as [SuperregionId, string])];
  for (const [id, label] of opts) {
    const b = el('button', 'chip', label);
    b.type = 'button';
    b.dataset.id = id;
    if (id !== 'all') b.style.setProperty('--c', SUPERREGIONS[id].color);
    b.addEventListener('click', () => {
      state.filter = id;
      update({ fit: true });
    });
    box.appendChild(b);
  }
}

function renderList() {
  const items = visibleRegions();
  document.querySelectorAll<HTMLButtonElement>('#filters .chip').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === state.filter)));
  count.textContent = items.length === 1 ? '1 region' : `${items.length} regions`;
  list.replaceChildren(
    ...items.map((r) => {
      const li = el('li');
      const b = el('button', 'row');
      b.type = 'button';
      const text = el('span', 'row-text');
      text.append(el('span', 'row-name', r.name), srTag(r.superregion));
      b.append(logoImg(r, 'sm', ''), text);
      b.addEventListener('click', () => select(r.id));
      li.appendChild(b);
      return li;
    }),
  );
  if (!items.length) {
    const li = el('li', 'empty', 'No regions match. ');
    const a = el('a', undefined, 'Start RoboCupJunior in your region');
    a.href = 'https://junior.robocup.org/qualification/#bringing-robocupjunior-to-a-new-region';
    a.target = '_top';
    li.appendChild(a);
    list.appendChild(li);
  }
}

function renderDetail(r: Region) {
  const sr = SUPERREGIONS[r.superregion];
  const back = el('button', 'back', '← All regions');
  back.type = 'button';
  back.addEventListener('click', () => select(null));

  const head = el('div', 'detail-head');
  const h = el('h2', 'detail-name', `RoboCupJunior ${r.name}`);
  h.tabIndex = -1;
  head.append(logoImg(r, 'lg', `RoboCupJunior ${r.name} logo`), h);

  const facts = el('dl', 'facts');
  const srDd = el('dd');
  srDd.appendChild(srTag(r.superregion));
  facts.append(el('dt', undefined, 'SuperRegion'), srDd);
  facts.append(
    el('dt', undefined, 'Led by'),
    el('dd', undefined, r.status === 'regional-rep' ? 'A Regional Representative' : 'A contact person (growing region)'),
  );
  const evDd = el('dd');
  const ev = el('a', undefined, sr.event.name);
  ev.href = sr.event.url;
  ev.target = '_blank';
  ev.rel = 'noopener';
  evDd.appendChild(ev);
  facts.append(el('dt', undefined, 'SuperRegional event'), evDd);

  const actions = el('div', 'actions');
  if (r.website) {
    const a = el('a', 'btn', `Visit RoboCupJunior ${r.name}`);
    a.href = r.website;
    a.target = '_blank';
    a.rel = 'noopener';
    actions.appendChild(a);
  } else {
    actions.appendChild(el('p', 'muted', `No website listed yet. To get in touch with RoboCupJunior ${r.name}, email ${CONTACT}.`));
  }
  const how = el('p', 'muted');
  how.append('Your Regional Representative can tell you about local events, divisions and qualification. ');
  const ql = el('a', undefined, 'How qualification works');
  ql.href = 'https://junior.robocup.org/qualification/';
  ql.target = '_top';
  how.appendChild(ql);

  detail.replaceChildren(back, head, facts, actions, how);
  h.focus({ preventScroll: true });
}

// ---------- map ----------

const map: MlMap = new maplibregl.Map({
  container: 'map',
  style: 'https://tiles.openfreemap.org/styles/positron',
  center: [20, 20],
  zoom: 1.2,
  minZoom: 0.6,
  maxZoom: 9,
  attributionControl: { compact: true },
  dragRotate: false,
  pitchWithRotate: false,
  touchPitch: false,
  cooperativeGestures: window.self !== window.top, // in an iframe, don't hijack page scrolling
});
map.touchZoomRotate.disableRotation();
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

function geojson(): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: visibleRegions().map((r) => ({
      type: 'Feature',
      id: r.id,
      properties: { id: r.id, name: r.name, color: SUPERREGIONS[r.superregion].color },
      geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
    })),
  };
}

function fitTo(items: Region[]) {
  if (!items.length) return;
  const b = new LngLatBounds();
  items.forEach((r) => b.extend([r.lng, r.lat]));
  const narrow = map.getContainer().clientWidth < 500;
  map.fitBounds(b, { padding: narrow ? 30 : 60, maxZoom: 4, duration: reducedMotion ? 0 : 800 });
}

const tooltip = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12, className: 'tip' });

map.on('load', () => {
  // Show place names in English (falling back to the local name) for an international audience.
  for (const layer of map.getStyle().layers) {
    if (layer.type === 'symbol' && map.getLayoutProperty(layer.id, 'text-field')) {
      map.setLayoutProperty(layer.id, 'text-field', ['coalesce', ['get', 'name:en'], ['get', 'name']]);
    }
  }

  // promoteId lets feature-state (the selected highlight) address features by region id.
  map.addSource('regions', { type: 'geojson', data: geojson(), cluster: true, clusterRadius: 36, clusterMaxZoom: 4, promoteId: 'id' });

  map.addLayer({
    id: 'clusters',
    type: 'circle',
    source: 'regions',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#32373c',
      'circle-radius': ['step', ['get', 'point_count'], 15, 5, 19, 10, 23],
      'circle-stroke-width': 3,
      'circle-stroke-color': '#ffffff',
    },
  });
  map.addLayer({
    id: 'cluster-count',
    type: 'symbol',
    source: 'regions',
    filter: ['has', 'point_count'],
    layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Bold'], 'text-size': 13, 'text-allow-overlap': true },
    paint: { 'text-color': '#ffffff' },
  });
  map.addLayer({
    id: 'points',
    type: 'circle',
    source: 'regions',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': ['get', 'color'],
      'circle-radius': ['case', ['boolean', ['feature-state', 'selected'], false], 12, 8],
      'circle-stroke-width': ['case', ['boolean', ['feature-state', 'selected'], false], 4, 2],
      'circle-stroke-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#32373c', '#ffffff'],
    },
  });

  map.on('click', 'clusters', async (e: MapLayerMouseEvent) => {
    const f = e.features?.[0];
    if (!f) return;
    const src = map.getSource('regions') as GeoJSONSource;
    const zoom = await src.getClusterExpansionZoom(f.properties!.cluster_id);
    map.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom, duration: reducedMotion ? 0 : 500 });
  });
  map.on('click', 'points', (e: MapLayerMouseEvent) => {
    const id = e.features?.[0]?.properties?.id;
    if (id) select(id);
  });
  for (const layer of ['clusters', 'points']) {
    map.on('mouseenter', layer, () => (map.getCanvas().style.cursor = 'pointer'));
    map.on('mouseleave', layer, () => {
      map.getCanvas().style.cursor = '';
      tooltip.remove();
    });
  }
  map.on('mousemove', 'points', (e: MapLayerMouseEvent) => {
    const f = e.features?.[0];
    if (!f) return;
    tooltip.setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number]).setText(f.properties!.name).addTo(map);
  });

  fitTo(regions);
  const fromHash = decodeURIComponent(location.hash.slice(1));
  if (byId.has(fromHash)) select(fromHash, { fromHash: true });
});

// ---------- state ----------

function setSelectedFeature(id: string | null, on: boolean) {
  if (id && map.getSource('regions')) map.setFeatureState({ source: 'regions', id }, { selected: on });
}

function select(id: string | null, opts: { fromHash?: boolean } = {}) {
  setSelectedFeature(state.selected, false);
  state.selected = id;
  if (!opts.fromHash) history.replaceState(null, '', id ? `#${id}` : location.pathname + location.search);

  if (!id) {
    detail.hidden = true;
    browse.hidden = false;
    search.focus({ preventScroll: true });
    return;
  }
  const r = byId.get(id)!;
  if (state.filter !== 'all' && state.filter !== r.superregion) {
    state.filter = 'all';
    update({ fit: false });
  }
  browse.hidden = true;
  detail.hidden = false;
  renderDetail(r);
  setSelectedFeature(id, true);
  const target: [number, number] = [r.lng, r.lat];
  const zoom = Math.max(map.getZoom(), 4);
  if (reducedMotion) map.jumpTo({ center: target, zoom });
  else map.flyTo({ center: target, zoom, speed: 1.4 });
}

function update({ fit }: { fit: boolean }) {
  renderList();
  const src = map.getSource('regions') as GeoJSONSource | undefined;
  if (src) {
    src.setData(geojson());
    if (state.selected) setSelectedFeature(state.selected, true);
  }
  if (fit && src) fitTo(visibleRegions());
}

function renderLegend() {
  const lg = $('legend');
  for (const sr of Object.values(SUPERREGIONS)) {
    const item = el('span', 'legend-item', sr.label);
    item.style.setProperty('--c', sr.color);
    lg.appendChild(item);
  }
}

let t: number | undefined;
search.addEventListener('input', () => {
  clearTimeout(t);
  t = window.setTimeout(() => {
    state.query = search.value;
    update({ fit: false });
  }, 120);
});
search.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const first = visibleRegions()[0];
    if (first) select(first.id);
  }
});
window.addEventListener('hashchange', () => {
  const id = decodeURIComponent(location.hash.slice(1));
  if (byId.has(id) && id !== state.selected) select(id, { fromHash: true });
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.selected) select(null);
});

renderSummary();
renderFilters();
renderLegend();
renderList();
