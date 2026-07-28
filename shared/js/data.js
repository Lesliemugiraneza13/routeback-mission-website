/**
 * RouteBack, all shared data, loaded on every page.
 * One file so every page reads the same numbers, nothing drifts between them.
 * In order below: the delay-estimation model, shared site config, the Route 95
 * dataset and its planning engine (rbComputePlan), the Northern Mauritius stop
 * catalogue, the wider route catalogue, alternative transport providers, the
 * team roster, Contact-page reason categories, and the compiled Northern
 * Journey Guide. Each section keeps its own "=====" divider comment below.
 */

/* ===== Delay-estimation model ===== */
/**
 * RouteBack, automatic delay estimation.
 *
 * Replaces manual Quiet / Normal / Busy selection. The band and multiplier
 * are picked from the requested day type and time, then nudged by a small
 * set of locality modifiers (weekend coastal activity, school periods, etc).
 * This is a first-version model built from general travel-pattern knowledge
 * of Northern Mauritius, not a measured traffic feed. The UI must always
 * present the result as a planning range, never as live traffic.
 */

const RB_DELAY_BANDS = {
  low: { minPct: 0.03, maxPct: 0.05, label: { en: 'Low', fr: 'Faible' } },
  moderate: { minPct: 0.08, maxPct: 0.12, label: { en: 'Moderate', fr: 'Modéré' } },
  high: { minPct: 0.16, maxPct: 0.22, label: { en: 'High', fr: 'Élevé' } },
};

// Purpose: Converts a HH:MM time string into minutes so scheduling logic can be compared numerically.
function rbTimeToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Base band from day type and time of day. */
// Purpose: Chooses the base delay band for a given day type and time of day.
function rbBaseBand(dayType, timeMinutes) {
  if (dayType === 'sun-ph') {
    if (timeMinutes < 9 * 60) return 'low';
    if (timeMinutes < 15 * 60) return 'moderate';
    if (timeMinutes < 18 * 60) return 'high';
    return 'moderate';
  }
  if (dayType === 'saturday') {
    if (timeMinutes < 8 * 60) return 'low';
    if (timeMinutes < 11 * 60) return 'moderate';
    if (timeMinutes < 15 * 60) return 'high';
    if (timeMinutes < 19 * 60) return 'moderate';
    return 'low';
  }
  // weekday
  if (timeMinutes < 6 * 60 + 30) return 'low';
  if (timeMinutes < 7 * 60) return 'moderate';
  if (timeMinutes < 9 * 60) return 'high';
  if (timeMinutes < 15 * 60) return 'moderate';
  if (timeMinutes < 16 * 60) return 'moderate';
  if (timeMinutes < 18 * 60 + 30) return 'high';
  return 'moderate';
}

const BAND_ORDER = ['low', 'moderate', 'high'];
// Purpose: Moves a delay band up or down a small number of steps to reflect increasing congestion.
function rbBumpBand(band, steps) {
  const idx = Math.max(0, Math.min(BAND_ORDER.length - 1, BAND_ORDER.indexOf(band) + steps));
  return BAND_ORDER[idx];
}

/** Northern-locality modifiers, applied on top of the time-of-day band. */
// Purpose: Applies locality-specific modifiers that increase or decrease the expected delay for certain places.
function rbLocalityModifier(localityId, dayType, timeMinutes) {
  const weekend = dayType !== 'weekday';
  const coastal = ['grand-baie', 'pereybere', 'cap-malheureux', 'mont-choisy', 'trou-aux-biches', 'pointe-aux-canonniers'];
  if (coastal.includes(localityId) && weekend && timeMinutes >= 9 * 60 && timeMinutes <= 17 * 60) return 1;
  if (localityId === 'goodlands' && dayType === 'weekday' && ((timeMinutes >= 7 * 60 && timeMinutes <= 8 * 60) || (timeMinutes >= 13 * 60 && timeMinutes <= 15 * 60))) return 1;
  if ((localityId === 'pamplemousses' || localityId === 'ssrn-hospital') && dayType === 'weekday' && timeMinutes >= 8 * 60 && timeMinutes <= 16 * 60) return 1;
  if (localityId === 'grand-baie' && dayType === 'weekday' && ((timeMinutes >= 7 * 60 && timeMinutes <= 9 * 60) || (timeMinutes >= 16 * 60 && timeMinutes <= 18 * 60 + 30))) return 1;
  return 0;
}

/**
 * Estimate a delay band and minute range for a trip.
 * @param {object} p
 * @param {'weekday'|'saturday'|'sun-ph'} p.dayType
 * @param {string} p.time - "HH:MM" the traveller expects to be moving at
 * @param {string} p.originLocality
 * @param {string} p.destLocality
 * @param {number} p.baseDurationMinutes
 * @param {number} p.stopCount
 */
// Purpose: Estimates a planning delay range for a trip using the shared delay model.
function rbEstimateDelay({ dayType, time, originLocality, destLocality, baseDurationMinutes, stopCount }) {
  const minutes = rbTimeToMinutes(time || '08:00');
  let band = rbBaseBand(dayType, minutes);
  const modifier = Math.max(
    rbLocalityModifier(originLocality, dayType, minutes),
    rbLocalityModifier(destLocality, dayType, minutes)
  );
  band = rbBumpBand(band, modifier);
  if (stopCount >= 8) band = rbBumpBand(band, 1);

  const { minPct, maxPct, label } = RB_DELAY_BANDS[band];
  const minMinutes = Math.max(2, Math.round(baseDurationMinutes * minPct));
  const maxMinutes = Math.max(minMinutes + 2, Math.round(baseDurationMinutes * maxPct));

  return {
    band, label, minMinutes, maxMinutes,
    note: {
      en: 'Estimated from the selected stops, day and journey time. This is a planning range, not live traffic information.',
      fr: 'Estimé à partir des arrêts, du jour et de l’heure sélectionnés. Il s’agit d’une plage de planification, pas d’une information de trafic en direct.',
    },
  };
}

/* ===== source: shared/data/config.js ===== */
/**
 * RouteBack, shared project configuration.
 * missingRouteFormUrl stays empty until the team has an approved external
 * form. Pages must only render that action when the URL is non-empty,
 * never insert a placeholder or dead link.
 */
const routebackConfig = {
  missingRouteFormUrl: '',
};

/* ===== source: shared/data/routes.js ===== */
/**
 * RouteBack, Route 95 dataset.
 *
 * Every figure here is either:
 *  - "observed"        : timed or measured directly by the RouteBack team
 *  - "published"       : taken from a printed/secondary timetable reference
 *  - "team-sequenced"  : the team's own stop ordering, built from the
 *                        direction stops were recorded in
 *  - "estimated"       : interpolated between two verified points (first/last
 *                        bus, or the two verified stop times) so a feature
 *                        like stop-specific boarding time can work at all
 *
 * Nothing here is live. There is no bus tracking, no traffic feed, no fare API.
 * Intermediate stop offsets and the assumed departure frequency are estimated
 * interpolations, not individually verified, and are labelled as such in the UI.
 */

const RB_LOCALITIES = [
  { id: 'pamplemousses', name: 'Pamplemousses', order: 1 },
  { id: 'beau-plan', name: 'Beau Plan', order: 2 },
  { id: 'ssrn-hospital', name: 'SSRN Hospital', order: 3 },
  { id: 'saint-andre', name: 'Saint André', order: 4 },
  { id: 'solitude', name: 'Solitude', order: 5 },
  { id: 'triolet', name: 'Triolet', order: 6 },
  { id: 'trou-aux-biches', name: 'Trou aux Biches', order: 7 },
  { id: 'mont-choisy', name: 'Mont Choisy', order: 8 },
  { id: 'pointe-aux-canonniers', name: 'Pointe aux Canonniers', order: 9 },
  { id: 'grand-baie', name: 'Grand Baie', order: 10 },
  { id: 'pereybere', name: 'Pereybère', order: 11 },
  { id: 'cap-malheureux', name: 'Cap Malheureux', order: 12 },
  { id: 'grand-gaube', name: 'Grand Gaube', order: 13 },
  { id: 'goodlands', name: 'Goodlands', order: 14 },
  { id: 'saint-antoine', name: 'Saint Antoine Traffic Centre', order: 15 },
];

// Team-observed local stops. offsets.outbound / offsets.inbound are cumulative
// minutes from the start of that direction (see RB_ROUTE_95.directions below).
// Only the Decathlon (13 min) and SSRN (20 min) outbound offsets come directly
// from a team timing; everything else is an estimated interpolation that keeps
// the sequence monotonic and lands on the verified end-to-end duration.
const RB_STOPS = [
  { id: 'saint-francis', name: 'Saint Francis Catholic Church Bus Stop', locality: 'pamplemousses', order: 1.0, offsets: { outbound: 0, inbound: 100 } },
  { id: 'decathlon', name: 'Decathlon Bus Stop', locality: 'pamplemousses', order: 1.4, alche: true, offsets: { outbound: 13, inbound: 87 } },
  { id: 'mahogany', name: 'Mahogany Bus Stop', locality: 'beau-plan', order: 2.0, offsets: { outbound: 18, inbound: 92 } },
  { id: 'ssrn', name: 'SSRN Bus Stop', locality: 'ssrn-hospital', order: 3.0, offsets: { outbound: 20, inbound: 80 } },
  { id: 'triolet-8th', name: 'Triolet 8th Mile Bus Stop', locality: 'triolet', order: 6.0, offsets: { outbound: 45, inbound: 55 } },
  { id: 'triolet-9th', name: 'Triolet 9th Mile Bus Stop', locality: 'triolet', order: 6.3, offsets: { outbound: 48, inbound: 52 } },
  { id: 'mont-choisy-stop', name: 'Mont Choisy Bus Stop', locality: 'mont-choisy', order: 8.0, offsets: { outbound: 65, inbound: 35 } },
  { id: 'grand-baie-church', name: 'Grand Baie Catholic Church Bus Stop', locality: 'grand-baie', order: 10.0, offsets: { outbound: 78, inbound: 22 } },
  { id: 'grand-baie-police', name: 'Grand Baie Police Bus Stop', locality: 'grand-baie', order: 10.3, offsets: { outbound: 81, inbound: 19 } },
  { id: 'saint-antoine-stop', name: 'Saint Antoine Bus Stop', locality: 'saint-antoine', order: 15.0, offsets: { outbound: 95, inbound: 0 } },
];

/** Build a departure list at an assumed headway between a first and last time. */
// Purpose: Builds an assumed departure timetable between a first and last bus time.
function rbBuildDepartures(first, last, headwayMinutes) {
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const toStr = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  const start = toMin(first);
  const end = toMin(last);
  const list = [];
  for (let t = start; t < end; t += headwayMinutes) list.push(toStr(t));
  list.push(last);
  return list;
}

const RB_ROUTE_95 = {
  number: '95',
  operator: 'TBS, Triolet Bus Service',
  operatingDays: { en: 'Monday to Sunday', fr: 'Lundi à dimanche' },
  originName: 'Pamplemousses',
  destinationName: 'Saint Antoine Traffic Centre',

  timetable: {
    source: {
      en: 'First and last bus times are a published secondary reference, checked 21 July 2026. Times between them are estimated at a 30-minute assumed frequency, not individually verified. Nothing here is live.',
      fr: 'Les heures de premier et dernier bus proviennent d’une référence publiée en second lieu, vérifiée le 21 juillet 2026. Les heures intermédiaires sont estimées à une fréquence supposée de 30 minutes, non vérifiées individuellement. Rien ici n’est en direct.',
    },
    sourceUrl: '',
    sourceType: 'published-secondary',
    dateChecked: '2026-07-21',
    verificationStatus: 'first-last-verified, intermediate-estimated',
    headwayMinutesAssumed: 30,
  },

  directions: {
    'toward-saint-antoine': {
      originLocality: 'pamplemousses',
      destLocality: 'saint-antoine',
      label: { en: 'Direction: Saint Antoine Traffic Centre', fr: 'Direction : Traffic Centre de Saint Antoine' },
      totalDurationMinutes: 95,
      first: '06:05',
      last: { weekday: '16:55', saturday: '16:55', 'sun-ph': '16:55' },
    },
    'toward-pamplemousses': {
      originLocality: 'saint-antoine',
      destLocality: 'pamplemousses',
      label: { en: 'Direction: Pamplemousses', fr: 'Direction : Pamplemousses' },
      totalDurationMinutes: 100,
      first: '06:05',
      last: { weekday: '16:10', saturday: '16:10', 'sun-ph': '17:45' },
    },
  },

  // Only these two pairs have a team-observed fare. Everything else is honestly marked unconfirmed.
  fares: [
    {
      from: 'grand-baie', to: 'pamplemousses',
      regular: 40, student: 20, currency: 'Rs',
      sourceUrl: '', sourceType: 'team-observed', dateChecked: '2026-07-21', verificationStatus: 'verified',
      note: { en: 'Team-observed fare.', fr: 'Tarif observé par l’équipe.' },
    },
    {
      from: 'grand-baie', to: 'triolet',
      regular: 35, student: null, currency: 'Rs',
      sourceUrl: '', sourceType: 'team-observed', dateChecked: '2026-07-21', verificationStatus: 'pending',
      note: { en: 'Team-observed fare, pending final confirmation.', fr: 'Tarif observé par l’équipe, en attente de confirmation finale.' },
    },
  ],

  connections: {
    'pamplemousses': [
      { route: '75/75A', towards: 'Triolet' },
      { route: '22', towards: 'Port Louis or Grand Gaube' },
      { route: '63', towards: 'Roches Noires', note: { en: 'Exact boarding point pending confirmation.', fr: 'Point de montée exact en attente de confirmation.' } },
    ],
    'triolet': [
      { route: '75/75A', towards: 'Pamplemousses' },
      { route: '28', towards: 'Rivière du Rempart' },
    ],
    'grand-baie': [
      { route: '29', towards: 'Rivière du Rempart' },
      { route: '82', towards: 'Port Louis', note: { en: 'Confirmation required.', fr: 'Confirmation requise.' } },
      { route: '228', towards: 'Grande Pointe aux Piments' },
    ],
    'saint-antoine': [
      { route: '22', towards: 'Port Louis or Grand Gaube' },
      { route: '26', towards: 'Central Flacq' },
      { route: '82', towards: 'Port Louis', note: { en: 'Confirmation required.', fr: 'Confirmation requise.' } },
      { route: '228', towards: 'Grande Pointe aux Piments' },
    ],
  },

  alche: {
    dropoff: 'Decathlon Bus Stop',
    destination: { en: 'ALCHE campus', fr: 'Campus ALCHE' },
    note: {
      en: 'Walking time from this stop has not been verified. Confirm the final walking route before you travel.',
      fr: 'Le temps de marche depuis cet arrêt n’a pas été vérifié. Confirmez l’itinéraire à pied avant de voyager.',
    },
  },
};

function rbLocalityById(id) { return RB_LOCALITIES.find((l) => l.id === id); }
function rbStopById(id) { return RB_STOPS.find((s) => s.id === id); }
function rbStopsForLocality(localityId) { return RB_STOPS.filter((s) => s.locality === localityId).sort((a, b) => a.order - b.order); }

/** Which direction connects a start and destination locality. */
// Purpose: Returns the route direction key that matches the selected origin and destination localities.
function rbDirectionFor(startLocality, destLocality) {
  const start = rbLocalityById(startLocality);
  const dest = rbLocalityById(destLocality);
  if (!start || !dest) return null;
  return start.order < dest.order ? 'toward-saint-antoine' : 'toward-pamplemousses';
}

/** Cumulative-minute offset for a locality in a given direction, from its stops
 *  if any exist, otherwise interpolated from its position along the route. */
// Purpose: Looks up the cumulative offset for a locality along a chosen direction.
// Purpose: Looks up the cumulative offset for a locality along a chosen direction.
function rbLocalityOffset(localityId, directionKey) {
  const stops = rbStopsForLocality(localityId);
  const dir = RB_ROUTE_95.directions[directionKey];
  if (stops.length) {
    const values = stops.map((s) => s.offsets[directionKey === 'toward-saint-antoine' ? 'outbound' : 'inbound']);
    return Math.min(...values);
  }
  const loc = rbLocalityById(localityId);
  const originOrder = rbLocalityById(dir.originLocality).order;
  const destOrder = rbLocalityById(dir.destLocality).order;
  const fraction = Math.abs(loc.order - originOrder) / Math.abs(destOrder - originOrder);
  return Math.round(fraction * dir.totalDurationMinutes);
}

// Purpose: Looks up the cumulative offset for a stop along a chosen direction.
// Purpose: Looks up the cumulative offset for a stop along a chosen direction.
function rbStopOffset(stopId, directionKey) {
  const stop = rbStopById(stopId);
  if (!stop) return null;
  return stop.offsets[directionKey === 'toward-saint-antoine' ? 'outbound' : 'inbound'];
}

// Purpose: Returns the last bus time for a given direction and day type.
// Purpose: Returns the last bus time for a given direction and day type.
function rbDayTypeLastBus(directionKey, dayType) {
  const dir = RB_ROUTE_95.directions[directionKey];
  const key = dayType === 'sun-ph' ? 'sun-ph' : (dayType === 'saturday' ? 'saturday' : 'weekday');
  return dir.last[key];
}

// Purpose: Builds the departure list for a chosen direction and day type.
// Purpose: Builds the departure list for a chosen direction and day type.
function rbDeparturesForDirection(directionKey, dayType) {
  const dir = RB_ROUTE_95.directions[directionKey];
  const last = rbDayTypeLastBus(directionKey, dayType);
  return rbBuildDepartures(dir.first, last, RB_ROUTE_95.timetable.headwayMinutesAssumed);
}

// Purpose: Converts minutes into a HH:MM time string for display.
// Purpose: Converts minutes into a HH:MM time string for display.
function rbMinutesToTime(mins) {
  const wrapped = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
}
// Purpose: Converts a HH:MM string into minutes so the planner can compare times numerically.
function rbTimeToMin(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }

/**
 * Compute a planner result. mode is 'leave-around' or 'arrive-by'.
 * startLocality/destLocality are required; startStopId/destStopId are optional
 * (fall back to the locality-level offset when not given).
 */
// Purpose: Computes the main journey plan and related meta data for the planner results.
function rbComputePlan({ startLocality, destLocality, startStopId, destStopId, dayType, mode, time, passengerType }) {
  const directionKey = rbDirectionFor(startLocality, destLocality);
  if (!directionKey) return null;
  const dir = RB_ROUTE_95.directions[directionKey];

  const originOffset = startStopId ? rbStopOffset(startStopId, directionKey) : rbLocalityOffset(startLocality, directionKey);
  const destOffset = destStopId ? rbStopOffset(destStopId, directionKey) : rbLocalityOffset(destLocality, directionKey);
  const baseDurationMinutes = destOffset - originOffset;

  const departures = rbDeparturesForDirection(directionKey, dayType);
  const requested = rbTimeToMin(time || '08:00');

  let chosenDeparture;
  if (mode === 'arrive-by') {
    const delayPreview = rbEstimateDelay({
      dayType, time, originLocality: startLocality, destLocality, baseDurationMinutes,
      stopCount: 0,
    });
    const targetBoardingAtStop = requested - baseDurationMinutes - delayPreview.maxMinutes;
    const candidates = departures.map((d) => rbTimeToMin(d) + originOffset).filter((t) => t <= targetBoardingAtStop);
    chosenDeparture = candidates.length
      ? candidates[candidates.length - 1] - originOffset
      : rbTimeToMin(departures[0]);
  } else {
    const candidates = departures.map((d) => rbTimeToMin(d)).filter((d) => d + originOffset >= requested);
    chosenDeparture = candidates.length ? candidates[0] : rbTimeToMin(departures[departures.length - 1]);
  }

  const boardingAtStop = chosenDeparture + originOffset;
  const arrivalAtDest = chosenDeparture + destOffset;

  // "Waiting time" only has a direct meaning in Leave Around mode, where the user
  // names a leave time and we show the gap until the bus actually reaches their stop.
  // In Arrive By mode the user names an arrival time instead, so the equivalent figure
  // is the safety margin: how much earlier than required they're expected to arrive,
  // given the cautious (worst-case-delay) departure that was chosen.
  const waitingMinutes = mode === 'arrive-by' ? null : Math.max(0, boardingAtStop - requested);

  const lowOrder = Math.min(rbLocalityById(startLocality).order, rbLocalityById(destLocality).order);
  const highOrder = Math.max(rbLocalityById(startLocality).order, rbLocalityById(destLocality).order);
  let stopsBetween = RB_STOPS.filter((s) => s.order >= lowOrder && s.order <= highOrder).sort((a, b) => a.order - b.order);
  if (directionKey === 'toward-pamplemousses') stopsBetween = stopsBetween.slice().reverse();

  const delay = rbEstimateDelay({
    dayType, time: rbMinutesToTime(boardingAtStop), originLocality: startLocality, destLocality,
    baseDurationMinutes, stopCount: stopsBetween.length,
  });

  const arrivalBufferMinutes = mode === 'arrive-by'
    ? Math.max(0, requested - (arrivalAtDest + delay.maxMinutes))
    : null;

  const startName = startStopId ? rbStopById(startStopId).name : rbLocalityById(startLocality).name;
  const destName = destStopId ? rbStopById(destStopId).name : rbLocalityById(destLocality).name;

  const fareEntry = RB_ROUTE_95.fares.find((f) =>
    (f.from === startLocality && f.to === destLocality) || (f.from === destLocality && f.to === startLocality));

  const connectionsAtDestination = RB_ROUTE_95.connections[destLocality] || null;
  const alcheRelevant = stopsBetween.some((s) => s.alche) || destLocality === 'pamplemousses' || startLocality === 'pamplemousses';

  return {
    routeSignature: `95:${startLocality}:${destLocality}:${startStopId || ''}:${destStopId || ''}:${dayType}:${mode}:${time}`,
    number: RB_ROUTE_95.number,
    operator: RB_ROUTE_95.operator,
    directionKey,
    directionLabel: dir.label,
    from: startName, to: destName,
    fromLocalityName: rbLocalityById(startLocality).name,
    toLocalityName: rbLocalityById(destLocality).name,
    operatingDays: RB_ROUTE_95.operatingDays,
    mode,
    boardingAtStop: rbMinutesToTime(boardingAtStop),
    arrivalAtDest: rbMinutesToTime(arrivalAtDest),
    arrivalRange: { min: rbMinutesToTime(arrivalAtDest + delay.minMinutes), max: rbMinutesToTime(arrivalAtDest + delay.maxMinutes) },
    waitingMinutes,
    arrivalBufferMinutes,
    baseDurationMinutes,
    delay,
    lastBus: rbDayTypeLastBus(directionKey, dayType),
    timetableSource: RB_ROUTE_95.timetable.source,
    fare: fareEntry || null,
    passengerType,
    stops: stopsBetween,
    connections: connectionsAtDestination,
    alche: alcheRelevant ? RB_ROUTE_95.alche : null,
  };
}

/* ===== source: shared/data/stops-catalogue.js ===== */
/**
 * RouteBack, Northern Mauritius stop catalogue.
 * Research source: https://www.mauritius-buses.com/routing/request (consulted
 * for area names only, not scraped or depended on at runtime, per project rules).
 *
 * Areas along the published Route 95 corridor (RB_LOCALITIES) are labelled
 * "published". Areas researched beyond that corridor, with no specific stop
 * verified yet, are labelled "needs-verification". Route 95's own team-timed
 * stops are labelled "team-observed". No coordinates are invented anywhere.
 */
const RB_STOP_CATALOGUE_AREAS = [
  'Pamplemousses', 'Beau Plan', 'SSRN', 'Triolet', 'Solitude', 'Trou aux Biches',
  'Mont Choisy', 'Pointe aux Canonniers', 'Grand Baie', 'Pereybère', 'Cap Malheureux',
  'Goodlands', 'Saint Antoine', 'Grand Gaube', 'Rivière du Rempart', 'Roches Noires',
  'Plaine des Roches', 'Mapou', 'Labourdonnais', 'Lower Vale', 'Upper Vale',
  'Petit Raffray', 'Poudre d’Or', 'Calodyne',
];

const RB_STOP_STATUS_LABEL = {
  'published': { en: 'Published', fr: 'Publié' },
  'team-observed': { en: 'Team observed', fr: 'Observé par l’équipe' },
  'needs-verification': { en: 'Needs verification', fr: 'Vérification requise' },
};

// Purpose: Converts a label into a URL-safe slug for route or section identifiers.
function rbSlugify(text) {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/**
 * Full catalogue record shape (kept for every entry, even where several
 * fields are honestly left blank/unverified):
 * { id, officialName, displayName:{en,fr}, area, aliases:[], sourceUrl,
 *   sourceType, dateChecked, verificationStatus, latitude, longitude }
 */
const RB_STOP_CATALOGUE = RB_STOP_CATALOGUE_AREAS.map((area) => {
  const onCorridor = RB_LOCALITIES.some((l) => l.name === area || l.name.startsWith(area));
  return {
    id: `area-${rbSlugify(area)}`,
    officialName: area,
    displayName: { en: area, fr: area },
    area,
    aliases: [],
    sourceUrl: '',
    sourceType: onCorridor ? 'published-secondary' : 'area-reference',
    dateChecked: onCorridor ? '2026-07-21' : '',
    verificationStatus: onCorridor ? 'published' : 'needs-verification',
    latitude: null,
    longitude: null,
  };
});

// Purpose: Returns the catalogue entry for a requested area.
function rbStopCatalogueByArea(area) { return RB_STOP_CATALOGUE.find((s) => s.area === area); }

/**
 * One flat, searchable list combining every selectable "stop" in the system:
 * the 24 catalogue areas (selectable as a whole area) plus Route 95's 10
 * team-timed stops. Every entry carries a plain-language status label and a
 * lowercase search blob covering name, area and any aliases, so free-text
 * search can match official names, English/French names, aliases and area
 * names all at once, exactly as entered here, nothing is ever hidden.
 */
const RB_ALL_STOPS_INDEX = (function build() {
  const entries = [];

  RB_STOP_CATALOGUE.forEach((rec) => {
    entries.push({
      id: rec.id,
      kind: 'area',
      name: rec.officialName,
      area: rec.area,
      aliases: rec.aliases,
      status: rec.verificationStatus,
      localityId: (RB_LOCALITIES.find((l) => l.name === rec.area) || {}).id || null,
      searchText: rbSlugify([rec.officialName, rec.area, ...rec.aliases].join(' ')).replace(/-/g, ' '),
    });
  });

  RB_STOPS.forEach((stop) => {
    const locality = rbLocalityById(stop.locality);
    const localityName = locality ? locality.name : stop.locality;
    // Group under the catalogue's short area name (e.g. "SSRN", "Saint Antoine")
    // rather than the fuller locality name, so a stop never splits off into
    // its own near-duplicate group next to the area it belongs to.
    const catalogueMatch = RB_STOP_CATALOGUE.find((rec) => localityName === rec.area || localityName.startsWith(rec.area));
    const areaName = catalogueMatch ? catalogueMatch.area : localityName;
    entries.push({
      id: stop.id,
      kind: 'stop',
      name: stop.name,
      area: areaName,
      aliases: [],
      status: 'team-observed',
      localityId: stop.locality,
      searchText: rbSlugify([stop.name, localityName].join(' ')).replace(/-/g, ' '),
    });
  });

  return entries;
})();

// Purpose: Returns the list of area names that appear in the stop catalogue.
function rbAllAreaNames() {
  return Array.from(new Set(RB_ALL_STOPS_INDEX.map((e) => e.area))).sort((a, b) => a.localeCompare(b));
}

/**
 * Rank a single entry against a lowercase query. Higher is better; null means
 * "does not match at all" (only these are excluded from results).
 */
// Purpose: Scores a stop entry against a search query so the best matches appear first.
function rbMatchRank(entry, query) {
  if (!query) return 4; // no search text yet, default listing order
  const name = entry.name.toLowerCase();
  const area = entry.area.toLowerCase();
  const aliasHit = entry.aliases.some((a) => a.toLowerCase().includes(query));
  if (name === query) return 0; // exact stop-name match
  if (name.startsWith(query)) return 1; // starts-with match
  if (aliasHit) return 2; // alias match
  if (area.includes(query) || area.startsWith(query)) return 3; // area-name match
  if (entry.searchText.includes(query)) return 4; // partial match anywhere
  return null;
}

/**
 * Search the full catalogue. Never removes a valid match because of the
 * optional preferredArea, it only sorts that area's group first.
 */
// Purpose: Searches the Northern stop catalogue for entries that match the current query.
function rbSearchStops(query, preferredArea) {
  const q = (query || '').trim().toLowerCase();
  const ranked = [];
  RB_ALL_STOPS_INDEX.forEach((entry) => {
    const rank = rbMatchRank(entry, q);
    if (rank === null) return;
    ranked.push({ entry, rank });
  });
  ranked.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (preferredArea) {
      const aPref = a.entry.area === preferredArea ? 0 : 1;
      const bPref = b.entry.area === preferredArea ? 0 : 1;
      if (aPref !== bPref) return aPref - bPref;
    }
    if (a.entry.area !== b.entry.area) return a.entry.area.localeCompare(b.entry.area);
    return a.entry.name.localeCompare(b.entry.name);
  });
  return ranked.map((r) => r.entry);
}

/** Group an already-sorted result list by area, preserving first-seen order. */
// Purpose: Groups stop-search results by area so the combobox can display them clearly.
function rbGroupStopsByArea(list) {
  const groups = [];
  const index = new Map();
  list.forEach((entry) => {
    if (!index.has(entry.area)) {
      index.set(entry.area, { area: entry.area, items: [] });
      groups.push(index.get(entry.area));
    }
    index.get(entry.area).items.push(entry);
  });
  return groups;
}

// Purpose: Finds a stop entry by its identifier in the full searchable catalogue index.
function rbStopEntryById(id) { return RB_ALL_STOPS_INDEX.find((e) => e.id === id) || null; }

/* ===== source: shared/data/routes-catalogue.js ===== */
/**
 * RouteBack, Northern route catalogue.
 * Route 95 is the only fully developed route (direction, stops, operator,
 * timetable, source and date all checked). Every other number here is
 * honestly marked Researched or Needs verification, not Supported now,
 * until the same checks are done for it.
 */
const RB_ROUTE_CATALOGUE = [
  { number: '95', status: 'supported-now' },
  { number: '20', status: 'researched' },
  { number: '20A', status: 'researched' },
  { number: '20B', status: 'researched' },
  { number: '20C', status: 'researched' },
  { number: '21', status: 'researched' },
  { number: '22', status: 'needs-stop-verification' },
  { number: '23', status: 'researched' },
  { number: '24', status: 'researched' },
  { number: '26', status: 'needs-timetable-verification' },
  { number: '27', status: 'researched' },
  { number: '28', status: 'needs-stop-verification' },
  { number: '29', status: 'needs-stop-verification' },
  { number: '63', status: 'needs-stop-verification' },
  { number: '75', status: 'needs-timetable-verification' },
  { number: '75A', status: 'needs-timetable-verification' },
  { number: '82', status: 'needs-stop-verification' },
  { number: '84', status: 'researched' },
  { number: '85', status: 'researched' },
  { number: '86', status: 'researched' },
  { number: '94', status: 'researched' },
  { number: '101', status: 'researched' },
  { number: '101B', status: 'researched' },
  { number: '171', status: 'researched' },
  { number: '175', status: 'researched' },
  { number: '187', status: 'researched' },
  { number: '215', status: 'researched' },
  { number: '221', status: 'researched' },
  { number: '222', status: 'researched' },
  { number: '222A', status: 'researched' },
  { number: '226', status: 'researched' },
  { number: '226A', status: 'researched' },
  { number: '227', status: 'researched' },
  { number: '228', status: 'needs-stop-verification' },
  { number: '231', status: 'researched' },
];

const RB_ROUTE_STATUS_LABEL = {
  'supported-now': { en: 'Supported now', fr: 'Pris en charge maintenant' },
  'researched': { en: 'Researched', fr: 'Recherché' },
  'needs-stop-verification': { en: 'Needs stop verification', fr: 'Vérification des arrêts requise' },
  'needs-timetable-verification': { en: 'Needs timetable verification', fr: 'Vérification de l’horaire requise' },
  'needs-fare-verification': { en: 'Needs fare verification', fr: 'Vérification du tarif requise' },
};

// Purpose: Returns the route catalogue entry for a given route number.
function rbRouteCatalogueEntry(number) { return RB_ROUTE_CATALOGUE.find((r) => r.number === number); }

/* ===== source: shared/data/providers.js ===== */
/**
 * RouteBack, alternative transport provider directory.
 * RouteBack does not operate, rank, or take commission from any of these services.
 * Logos: where an official logo file was supplied it is used via object-fit: contain.
 * Where none was supplied, a plain neutral wordmark tile stands in its place.
 */
const RB_PROVIDERS = [
  {
    id: 'moride',
    name: 'MoRide',
    logo: 'images/providers/moride.jpg',
    logoIsPlaceholder: false,
    website: 'https://www.moridemauritius.com/',
    phone: '+230 5258 0813',
    email: 'info@moridemauritius.com',
  },
  {
    id: 'taxi-service-mauritius',
    name: 'Taxi Service Mauritius',
    logo: 'images/providers/taxi-service-mauritius.jpg',
    logoIsPlaceholder: false,
    website: 'https://taxiservicemauritius.com/',
    quoteUrl: 'https://taxiservicemauritius.com/request-a-quote/',
    contactUrl: 'https://taxiservicemauritius.com/contact-us/',
    phone: '+230 5955 0305',
  },
  {
    id: 'taxi-mauritius-transfer',
    name: 'Taxi Mauritius Transfer',
    logo: 'images/providers/taxi-mauritius-transfer.jpg',
    logoIsPlaceholder: false,
    website: 'https://taximauritiustransfer.com/',
    contactUrl: 'https://taximauritiustransfer.com/contact-us/',
    phone: '+230 5505 1236',
  },
  {
    id: 'barefoot-transfers',
    name: 'Barefoot Transfers Mauritius',
    logo: 'images/providers/barefoot-transfers.svg',
    logoIsPlaceholder: true,
    website: 'https://www.barefoottransfersmauritius.com/',
    phone: '+230 5492 8500',
    email: 'barefoottransfersmauritius@gmail.com',
  },
  {
    id: 'my-proride',
    name: 'My PRORIDE',
    logo: 'images/providers/my-proride.svg',
    logoIsPlaceholder: true,
    website: 'https://myproride.com/',
    phone: '+230 5836 4657',
  },
  {
    id: 'ala-lila',
    name: 'Ala-lila',
    logo: 'images/providers/ala-lila.svg',
    logoIsPlaceholder: true,
    website: 'https://www.alalila.mu/',
    signinUrl: 'https://www.alalila.mu/signin',
    registerUrl: 'https://www.alalila.mu/register',
    contactUrl: 'https://www.alalila.mu/contactus',
  },
  {
    id: 'yugo',
    name: 'Yugo Mauritius',
    logo: 'images/providers/yugo.jpg',
    logoIsPlaceholder: false,
    website: 'https://www.yugo.mu/',
    bookingUrl: 'https://www.yugo.mu/booking/taxi-ride',
    appUrl: 'https://app.yugo.mu/',
    phone: '+230 260 2626',
    email: 'hello@yugo.mu',
  },
  {
    id: 'dodogo',
    name: 'DodoGo',
    logo: 'images/providers/dodogo.jpg',
    logoIsPlaceholder: false,
    website: 'https://www.dodogo.mu/',
    bookingUrl: 'https://www.dodogo.mu/booking/',
    frUrl: 'https://www.dodogo.mu/fr/',
  },
  {
    id: 'island-taxi-mauritius',
    name: 'Island Taxi Mauritius',
    logo: 'images/providers/island-taxi-mauritius.jpg',
    logoIsPlaceholder: false,
    website: 'https://islandtaximauritius.com/',
    contactUrl: 'https://islandtaximauritius.com/contact-us/',
    airportUrl: 'https://islandtaximauritius.com/airport-transfer-mauritius/',
    phone: '+230 5882 9537',
    email: 'info@islandtaximauritius.com',
  },
  {
    id: 'uber',
    name: 'Uber Mauritius',
    logo: 'images/providers/uber.jpg',
    logoIsPlaceholder: false,
    website: 'https://www.uber.com/mu/en/',
    newsroomUrl: 'https://www.uber.com/mu/en/newsroom/',
    mUrl: 'https://m.uber.com/',
    availabilityNote: {
      en: 'Uber vehicle availability varies by area and time of day in Northern Mauritius, check the app for coverage near you before relying on it.',
      fr: 'La disponibilité des véhicules Uber varie selon la zone et l’heure dans le Nord de Maurice, vérifiez la couverture dans l’application avant d’en dépendre.',
    },
  },
];

/* ===== source: shared/data/team.js ===== */
/**
 * RouteBack, team dataset. Content is scoped to each member's project role
 * and contribution; no personal history is inferred beyond what the team
 * described about its own working process.
 */
const RB_TEAM = [
  {
    id: 'leslie-mugiraneza',
    name: 'Leslie Mugiraneza',
    role: { en: 'Product Design and Frontend Integration Lead', fr: 'Responsable design produit et intégration frontend' },
    photo: 'images/team/leslie-mugiraneza.jpg',
    bio: {
      en: 'Leslie shaped how RouteBack looks and holds together as one interface: the design system, the bento layout on Home, and the way every page shares the same header, footer and component set.',
      fr: 'Leslie a défini l’apparence de RouteBack et sa cohérence en une seule interface : le système de design, la mise en page en bento de l’accueil, et le partage du même en-tête, pied de page et composants sur toutes les pages.',
    },
    responsibilities: [
      { en: 'Defined the colour, type and spacing system used across every page', fr: 'Défini le système de couleurs, typographie et espacement utilisé sur toutes les pages' },
      { en: 'Built the bento card layout and section rhythm on the Home page', fr: 'Conçu la mise en page en cartes bento et le rythme des sections de la page d’accueil' },
      { en: 'Integrated shared header, footer and navigation across all eight pages', fr: 'Intégré l’en-tête, le pied de page et la navigation partagés sur les huit pages' },
      { en: 'Reviewed light and dark theme consistency page by page', fr: 'Vérifié la cohérence des thèmes clair et sombre page par page' },
    ],
    skills: [
      { label: { en: 'Design systems', fr: 'Systèmes de design' }, level: 92 },
      { label: { en: 'Layout & CSS Grid', fr: 'Mise en page et CSS Grid' }, level: 88 },
      { label: { en: 'Frontend integration', fr: 'Intégration frontend' }, level: 85 },
      { label: { en: 'Visual QA', fr: 'Contrôle visuel qualité' }, level: 80 },
    ],
    contribution: { en: 'Home page bento system, shared component library, cross-page visual QA', fr: 'Système bento de l’accueil, bibliothèque de composants partagés, QA visuelle multi-pages' },
  },
  {
    id: 'elvire-akayezu',
    name: 'Elvire Akayezu',
    role: { en: 'Journey Planner and Frontend Logic Developer', fr: 'Développeuse planificateur de trajet et logique frontend' },
    photo: 'images/team/elvire-akayezu.jpg',
    bio: {
      en: 'Elvire built the logic behind the Plan Journey page: the dependent dropdowns, the shared data source between Home and the Planner, and the calculations that turn a route selection into a clear, honest result card.',
      fr: 'Elvire a construit la logique derrière la page Planifier un trajet : les menus déroulants dépendants, la source de données partagée entre l’accueil et le planificateur, et les calculs qui transforment une sélection en un résultat clair et honnête.',
    },
    responsibilities: [
      { en: 'Built the dependent dropdown chain for Starting area through Traffic condition', fr: 'Construit la chaîne de menus déroulants dépendants, de la zone de départ à l’état du trafic' },
      { en: 'Wrote the planning-range and fare-lookup logic shared by Home and Planner', fr: 'Rédigé la logique de plage horaire et de recherche de tarif partagée entre l’accueil et le planificateur' },
      { en: 'Implemented Saved Routes: duplicate prevention, save-without-profile flow, remove', fr: 'Mis en œuvre les trajets enregistrés : prévention des doublons, sauvegarde sans profil, suppression' },
      { en: 'Connected possible-connection and ALCHE guidance data to planner results', fr: 'Relié les données de correspondances possibles et le repère ALCHE aux résultats du planificateur' },
    ],
    skills: [
      { label: { en: 'JavaScript logic', fr: 'Logique JavaScript' }, level: 90 },
      { label: { en: 'Data modelling', fr: 'Modélisation de données' }, level: 87 },
      { label: { en: 'Form UX', fr: 'Expérience de formulaire' }, level: 82 },
      { label: { en: 'Local storage design', fr: 'Conception du stockage local' }, level: 84 },
    ],
    contribution: { en: 'Plan Journey engine, Home quick planner, Saved Routes logic', fr: 'Moteur du planificateur, planificateur rapide de l’accueil, logique des trajets enregistrés' },
  },
  {
    id: 'fortunate-ansong',
    name: 'Fortunate Ansong',
    role: { en: 'Transport Research and Alternative Services Lead', fr: 'Responsable recherche transport et services alternatifs' },
    photo: 'images/team/fortunate-ansong.jpg',
    bio: {
      en: 'Fortunate researched Route 95 on the ground (stops, fares, and timetable references) and compiled the alternative-provider directory so students have real, direct-contact options beyond the bus.',
      fr: 'Fortunate a mené la recherche de terrain sur la ligne 95, arrêts, tarifs et références d’horaires, et a compilé l’annuaire des prestataires alternatifs afin que les étudiants disposent d’options directes au-delà du bus.',
    },
    responsibilities: [
      { en: 'Recorded team-observed stops, localities and fare checks for Route 95', fr: 'Recensé les arrêts, localités et vérifications tarifaires observés par l’équipe pour la ligne 95' },
      { en: 'Sourced and verified contact details for all ten alternative transport providers', fr: 'Recherché et vérifié les coordonnées des dix prestataires de transport alternatifs' },
      { en: 'Wrote the non-ranking, no-commission notice for the Services page', fr: 'Rédigé la mention de non-classement et d’absence de commission pour la page Services' },
      { en: 'Documented the possible connecting routes at each major locality', fr: 'Documenté les correspondances possibles à chaque localité principale' },
    ],
    skills: [
      { label: { en: 'Field research', fr: 'Recherche de terrain' }, level: 93 },
      { label: { en: 'Data verification', fr: 'Vérification des données' }, level: 89 },
      { label: { en: 'Provider sourcing', fr: 'Recherche de prestataires' }, level: 86 },
      { label: { en: 'Source labelling', fr: 'Étiquetage des sources' }, level: 88 },
    ],
    contribution: { en: 'Route 95 field data, Services directory, connecting-route documentation', fr: 'Données de terrain de la ligne 95, annuaire Services, documentation des correspondances' },
  },
  {
    id: 'kalungi-bright-angel',
    name: 'Kalungi Bright Angel',
    role: { en: 'Accessibility, Bilingual UX and Form Validation Developer', fr: 'Développeur accessibilité, expérience bilingue et validation de formulaires' },
    photo: 'images/team/kalungi-bright-angel.jpg',
    bio: {
      en: 'Kalungi made sure RouteBack works for every visitor: keyboard navigation, screen-reader labelling, the English/French toggle, and the validation logic behind every form on the site.',
      fr: 'Kalungi a veillé à ce que RouteBack fonctionne pour chaque visiteur : navigation au clavier, étiquetage pour lecteurs d’écran, bascule anglais/français, et la logique de validation de chaque formulaire du site.',
    },
    responsibilities: [
      { en: 'Implemented skip links, landmarks, focus order and visible focus states', fr: 'Mis en œuvre les liens d’évitement, repères, ordre de focus et états de focus visibles' },
      { en: 'Built the English/French toggle and reviewed every page for natural French wrapping', fr: 'Construit la bascule anglais/français et vérifié chaque page pour un affolement naturel du français' },
      { en: 'Wrote field-level and form-level validation with error summaries on Assistance and Profile forms', fr: 'Rédigé la validation au niveau des champs et des formulaires, avec récapitulatifs d’erreurs sur Assistance et Profil' },
      { en: 'Checked colour contrast and confirmed no meaning is carried by colour alone', fr: 'Vérifié le contraste des couleurs et confirmé qu’aucune signification ne repose uniquement sur la couleur' },
    ],
    skills: [
      { label: { en: 'Accessibility (WCAG)', fr: 'Accessibilité (WCAG)' }, level: 91 },
      { label: { en: 'Bilingual UX', fr: 'Expérience bilingue' }, level: 90 },
      { label: { en: 'Form validation', fr: 'Validation de formulaires' }, level: 88 },
      { label: { en: 'Keyboard interaction', fr: 'Interaction au clavier' }, level: 87 },
    ],
    contribution: { en: 'Accessibility pass, EN/FR system, Assistance and Profile form validation', fr: 'Passe d’accessibilité, système EN/FR, validation des formulaires Assistance et Profil' },
  },
  {
    id: 'ihirwe-hildegardine',
    name: 'Ihirwe Hildegardine',
    role: { en: 'Mission, Content, Quality Assurance and Documentation Lead', fr: 'Responsable mission, contenu, assurance qualité et documentation' },
    photo: 'images/team/ihirwe-hildegardine.jpg',
    bio: {
      en: 'Ihirwe wrote the Mission page and the site\'s English and French copy, ran the verification process behind every claim on RouteBack, and kept the final quality check honest: no placeholders, no invented statistics.',
      fr: 'Ihirwe a rédigé la page Mission et les textes du site en anglais et en français, mené le processus de vérification derrière chaque affirmation de RouteBack, et supervisé le contrôle qualité final, sans espace réservé ni statistique inventée.',
    },
    responsibilities: [
      { en: 'Wrote the Mission narrative and the research-to-documentation verification timeline', fr: 'Rédigé le récit de la Mission et la chronologie de vérification de la recherche à la documentation' },
      { en: 'Authored bilingual copy across Home, Planner, Assistance and Services', fr: 'Rédigé les textes bilingues des pages Accueil, Planificateur, Assistance et Services' },
      { en: 'Ran the final quality pass: broken links, missing assets, honest limitation notices', fr: 'Effectué le contrôle qualité final : liens rompus, ressources manquantes, mentions de limites honnêtes' },
      { en: 'Maintained the README and completion documentation', fr: 'Tenu à jour le README et la documentation de fin de projet' },
    ],
    skills: [
      { label: { en: 'Bilingual copywriting', fr: 'Rédaction bilingue' }, level: 92 },
      { label: { en: 'Quality assurance', fr: 'Assurance qualité' }, level: 89 },
      { label: { en: 'Information architecture', fr: 'Architecture de l’information' }, level: 84 },
      { label: { en: 'Documentation', fr: 'Documentation' }, level: 90 },
    ],
    contribution: { en: 'Mission page, bilingual copy across the site, final QA and documentation', fr: 'Page Mission, textes bilingues du site, QA finale et documentation' },
  },
];

/* ===== source: shared/data/assistance.js ===== */
/**
 * RouteBack, Assistance reason definitions.
 */
const RB_ASSISTANCE_CATEGORIES = [
  { id: 'missing-route', en: 'Missing route', fr: 'Ligne manquante' },
  { id: 'incorrect-route', en: 'Incorrect route information', fr: 'Information de ligne incorrecte' },
  { id: 'missing-stop', en: 'Missing bus stop', fr: 'Arrêt de bus manquant' },
  { id: 'incorrect-destination', en: 'Incorrect destination', fr: 'Destination incorrecte' },
  { id: 'timing-delay', en: 'Timing or delay information', fr: 'Information d’horaire ou de retard' },
  { id: 'fare-info', en: 'Fare information', fr: 'Information tarifaire' },
  { id: 'alt-service', en: 'Alternative service', fr: 'Service alternatif' },
  { id: 'question', en: 'General question', fr: 'Question générale' },
];

// Purpose: Returns the assistance category definition for a given category identifier.
function rbAssistanceCategoryById(id) { return RB_ASSISTANCE_CATEGORIES.find((c) => c.id === id); }

/* ===== Northern Mauritius Bus Guide (compiled planning reference) =====
 * Extracted from the user-supplied "Master Northern Mauritius Bus Guide" PDF.
 * This is a separate, compiled secondary source, not a team observation, and
 * it must never be merged with or silently override RB_ROUTE_95's verified
 * team-observed fares (see RB_ROUTE_95.fares in the routes.js section above).
 * Every duration/fare here is a planning RANGE from a compiled reference, not
 * a live or guaranteed figure, and the UI must always say so. */
const RB_NORTHERN_GUIDE_SOURCE = {
  label: { en: 'Compiled northern route reference', fr: 'Référence de lignes du Nord compilée' },
  note: {
    en: 'Planning guide only, not official and not live. Confirm the route, duration and fare with the operator before travelling.',
    fr: 'Guide de planification uniquement, ni officiel ni en direct. Confirmez la ligne, la durée et le tarif auprès de l’opérateur avant de voyager.',
  },
};

// Purpose: Builds a guide-leg object from route timing and fare information.
function rbGuideLeg(routeText, durationMin, durationMax, fareMin, fareMax, transfer) {
  return { routeText, durationMin, durationMax, fareMin, fareMax, transfer };
}

const RB_NORTHERN_GUIDE = [
  { destination: 'Grand Baie', fromPortLouis: rbGuideLeg('215 (Express) / 82', 40, 45, 35, 40, false), fromSSRN: rbGuideLeg('23 (Direct) or 84 to Triolet, then 22/87', 35, 45, 24, 30, true) },
  { destination: 'Goodlands', fromPortLouis: rbGuideLeg('82 (Express)', 45, 50, 35, 40, false), fromSSRN: rbGuideLeg('23 / 95 (Direct)', 25, 30, 20, 24, false) },
  { destination: 'Triolet', fromPortLouis: rbGuideLeg('22 / 87 (Direct)', 30, 35, 27, 30, false), fromSSRN: rbGuideLeg('84 / 240 (Direct)', 15, 20, 17, 20, false) },
  { destination: 'Rivière du Rempart', fromPortLouis: rbGuideLeg('23 / 210 (Direct)', 45, 55, 30, 35, false), fromSSRN: rbGuideLeg('23 / 210 (Direct)', 35, 40, 24, 27, false) },
  { destination: 'Trou aux Biches', fromPortLouis: rbGuideLeg('20C (Direct Coastal) / 22', 45, 55, 30, 35, false), fromSSRN: rbGuideLeg('84 to Triolet, then transfer to 22/87', 40, 50, 27, 30, true) },
  { destination: 'Mont Choisy', fromPortLouis: rbGuideLeg('20C / 87 (Direct)', 50, 60, 30, 35, false), fromSSRN: rbGuideLeg('84 to Triolet, then transfer to 22/87', 45, 55, 27, 30, true) },
  { destination: 'Péreybère', fromPortLouis: rbGuideLeg('215 to Grand Baie, then 82', 55, 65, 40, 40, true), fromSSRN: rbGuideLeg('23 to Grand Baie, then transfer to 82', 50, 60, 27, 30, true) },
  { destination: 'Cap Malheureux', fromPortLouis: rbGuideLeg('20C (Direct)', 65, 75, 35, 40, false), fromSSRN: rbGuideLeg('23 to Grand Baie, then transfer to 215A/82', 55, 65, 30, 30, true) },
  { destination: 'Grand Gaube', fromPortLouis: rbGuideLeg('82 to Goodlands, then transfer to 4', 65, 75, 40, 40, true), fromSSRN: rbGuideLeg('95 to Goodlands, then transfer to 4', 50, 60, 27, 30, true) },
  { destination: 'Poudre d’Or', fromPortLouis: rbGuideLeg('23 (Direct)', 40, 45, 30, 30, false), fromSSRN: rbGuideLeg('23 (Direct)', 20, 25, 20, 20, false) },
  { destination: 'Roches Noires', fromPortLouis: rbGuideLeg('23 to R. du Rempart, then 26', 70, 80, 40, 44, true), fromSSRN: rbGuideLeg('23 to R. du Rempart, then 26', 55, 65, 30, 30, true) },
  { destination: 'Pointe aux Piments', fromPortLouis: rbGuideLeg('20C / 22 (Direct)', 35, 45, 27, 30, false), fromSSRN: rbGuideLeg('84 to Triolet, then transfer to 22', 35, 45, 24, 27, true) },
  { destination: 'Bain Boeuf', fromPortLouis: rbGuideLeg('215 to Grand Baie, then 82', 60, 70, 40, 40, true), fromSSRN: rbGuideLeg('23 to Grand Baie, then transfer to 82', 55, 65, 30, 30, true) },
  { destination: 'Pamplemousses', fromPortLouis: rbGuideLeg('23 / 85 / 86 (Direct)', 20, 25, 24, 24, false), fromSSRN: rbGuideLeg('Immediate area (walking)', 3, 5, 0, 17, false) },
  { destination: 'Plaine des Papayes', fromPortLouis: rbGuideLeg('95 (Direct)', 30, 35, 24, 30, false), fromSSRN: rbGuideLeg('84 / 95 (Direct)', 10, 10, 17, 17, false) },
  { destination: 'Fond du Sac', fromPortLouis: rbGuideLeg('22 / 84 (Direct)', 25, 30, 24, 27, false), fromSSRN: rbGuideLeg('84 / 240 (Direct)', 10, 15, 17, 20, false) },
  { destination: 'The Vale', fromPortLouis: rbGuideLeg('23 / 82 (Direct)', 35, 40, 30, 35, false), fromSSRN: rbGuideLeg('23 (Direct)', 25, 30, 20, 24, false) },
  { destination: 'Petit Raffray', fromPortLouis: rbGuideLeg('82 to Goodlands, then 47', 55, 65, 35, 40, true), fromSSRN: rbGuideLeg('95 to Goodlands, then 47', 40, 45, 24, 27, true) },
  { destination: 'Roche Terre', fromPortLouis: rbGuideLeg('82 to Goodlands, then 4A', 55, 60, 35, 40, true), fromSSRN: rbGuideLeg('95 to Goodlands, then 4A', 35, 40, 24, 24, true) },
  { destination: 'Cottage', fromPortLouis: rbGuideLeg('23 / 82 (Direct)', 35, 40, 30, 30, false), fromSSRN: rbGuideLeg('23 / 95 (Direct)', 15, 20, 17, 20, false) },
  { destination: 'Espérance 13 Cantons', fromPortLouis: rbGuideLeg('23 (Direct)', 40, 40, 30, 30, false), fromSSRN: rbGuideLeg('23 (Direct)', 25, 25, 20, 20, false) },
  { destination: 'Piton', fromPortLouis: rbGuideLeg('23 / 210 (Direct)', 35, 35, 27, 30, false), fromSSRN: rbGuideLeg('23 / 210 (Direct)', 15, 15, 17, 20, false) },
  { destination: 'Mapou', fromPortLouis: rbGuideLeg('23 / 82 (Direct)', 30, 30, 27, 30, false), fromSSRN: rbGuideLeg('23 / 95 (Direct)', 10, 15, 17, 20, false) },
  { destination: 'Ville Bague', fromPortLouis: rbGuideLeg('33 (Direct)', 40, 40, 30, 30, false), fromSSRN: rbGuideLeg('33 (Direct)', 20, 20, 20, 20, false) },
  { destination: 'Amaury', fromPortLouis: rbGuideLeg('33 / 210 (Direct)', 45, 45, 30, 35, false), fromSSRN: rbGuideLeg('33 / 210 (Direct)', 25, 30, 20, 24, false) },
  { destination: 'Plaine des Roches', fromPortLouis: rbGuideLeg('23 to R. du Rempart, then feeder bus', 65, 75, 40, 40, true), fromSSRN: rbGuideLeg('23 to R. du Rempart, then feeder bus', 50, 55, 27, 30, true) },
];

// Purpose: Returns the Northern Guide entry for a requested destination.
function rbNorthernGuideEntry(destination) { return RB_NORTHERN_GUIDE.find((e) => e.destination === destination); }
// Purpose: Formats a duration range so it is easy to read in the guide table.
function rbFormatGuideRange(min, max, unit) { return min === max ? `${min}${unit}` : `${min}–${max}${unit}`; }
// Purpose: Formats a fare range into a human-friendly display string for the guide.
function rbFormatGuideFare(min, max) {
  if (min === 0 && max > 0) return `Free – Rs ${max}`;
  return min === max ? `Rs ${min}` : `Rs ${min}–${max}`;
}

