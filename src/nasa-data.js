// Every NASA figure the app shows, with its source. Values and URLs are from the design data sheet
// (docs/superpowers/specs/2026-11-15-astronaut-health-monitor-design.md, section 5).

export const MISSION_DAY = 120;

export const SOURCES = {
  hazards: { title: 'NASA: 5 Hazards of Human Spaceflight', url: 'https://www.nasa.gov/hrp/hazards/' },
  radiationHazard: { title: 'NASA: Space Radiation hazard', url: 'https://www.nasa.gov/hrp/hazard-space-radiation/' },
  isolation: { title: 'NASA: Isolation and Confinement hazard', url: 'https://www.nasa.gov/hrp/hazard-isolation-and-confinement/' },
  distance: { title: 'NASA: Distance from Earth hazard', url: 'https://www.nasa.gov/hrp/hazard-distance-from-earth/' },
  gravity: { title: 'NASA: Gravity Fields hazard', url: 'https://www.nasa.gov/hrp/hazard-gravity-fields/' },
  hostile: { title: 'NASA: Hostile/Closed Environments hazard', url: 'https://www.nasa.gov/hrp/hazard-hostile-closed-environments/' },
  radiationBrief: { title: 'NASA-STD-3001 brief OCHMO-TB-020: Ionizing Radiation Protection', url: 'https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf' },
  co2Brief: { title: 'NASA-STD-3001 brief OCHMO-TB-004: Carbon Dioxide', url: 'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf' },
  eclssBrief: { title: 'NASA-STD-3001 brief OCHMO-TB-002: Life Support', url: 'https://www.nasa.gov/wp-content/uploads/2023/07/eclss-technical-brief-ochmo.pdf' },
  std3001: { title: 'NASA-STD-3001 Volume 1: Crew Health', url: 'https://www.nasa.gov/reference/nasa-std-3001v1/' },
  boneRisk: { title: 'NASA: Risk of Spaceflight-Induced Bone Changes', url: 'https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/' },
  sansRisk: { title: 'NASA: Risk of Spaceflight Associated Neuro-ocular Syndrome', url: 'https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/' },
  sleepRisk: { title: 'NASA: Risk from Inadequate Sleep and Irregular Schedules', url: 'https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/' },
  cardioRisk: { title: 'NASA: Risk of Cardiovascular Adaptations', url: 'https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/' },
  behaviorRisk: { title: 'NASA: Risk of Behavioral Conditions and Psychiatric Disorders', url: 'https://www.nasa.gov/reference/risk-of-behavioral-conditions-and-psychiatric-disorders/' },
  exercise: { title: 'NASA: Astronaut Exercise', url: 'https://www.nasa.gov/missions/station/iss-research/astronaut-exercise/' },
  moonFacts: { title: 'NASA Science: Moon Facts', url: 'https://science.nasa.gov/moon/facts/' },
  donki: { title: 'NASA CCMC DONKI space weather database', url: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/' },
};

export const NASA = {
  boneLossPctPerMonth: { min: 1, max: 1.5 },
  boneLossValidDays: 180,
  sansEyeSwellingPct: 70,
  sunrisesPerDay: 16,
  exerciseMinPerDay: 120,
  careerLimitMsv: 600,
  speLimitMsv: 250,
  marsDelayMinOneWay: 20,
};

// Scenario parameters. Derivations are in the design, section 5.2.
export const PROFILES = [
  { id: 'iss', name: 'ISS, low Earth orbit', gravity: 'Weightless', doseMsvPerDay: 0.45, priorDoseMsv: 0, stayDays: 180, delaySecOneWay: 0, doseSource: 'radiationBrief' },
  { id: 'moon', name: 'Lunar surface', gravity: '1/6 g', doseMsvPerDay: 0.93, priorDoseMsv: 0, stayDays: 180, delaySecOneWay: 1.3, doseSource: 'radiationBrief' },
  { id: 'mars-transit', name: 'Mars transit', gravity: 'Weightless', doseMsvPerDay: 1.5, priorDoseMsv: 0, stayDays: 180, delaySecOneWay: 1200, doseSource: 'radiationBrief' },
  { id: 'mars-surface', name: 'Mars surface', gravity: '3/8 g', doseMsvPerDay: 0.5, priorDoseMsv: 270, stayDays: 730, delaySecOneWay: 1200, doseSource: 'radiationBrief' },
];

export const HAZARDS = [
  {
    id: 'radiation',
    name: 'Space radiation',
    summary: 'Outside Earth\'s protection, crews are exposed to galactic cosmic rays and bursts of particles from the Sun.',
    effects: ['Higher lifetime cancer risk', 'Damage to the central nervous system', 'Changes in thinking and movement'],
    indicatorIds: ['radiation'],
    appResponse: 'Shows cumulative dose against NASA\'s 600 mSv career limit, projects it to the end of the stay, raises a live space-weather alert, and keeps an exportable record.',
    source: 'radiationHazard',
  },
  {
    id: 'isolation',
    name: 'Isolation and confinement',
    summary: 'A small crew lives in a small space for months or years, far from family and normal routines.',
    effects: ['Sleep loss', 'Body-clock disruption', 'Work overload', 'Low mood and anxiety'],
    indicatorIds: ['sleep', 'mood'],
    appResponse: 'Daily mood and sleep check-in, a journal step, and a rule that escalates anything flagged three days running.',
    source: 'isolation',
  },
  {
    id: 'distance',
    name: 'Distance from Earth',
    summary: 'Mars is about 140 million miles away. A message takes up to 20 minutes each way, so the crew must handle problems themselves.',
    effects: ['Delayed medical advice', 'Limited supplies and equipment', 'Menu fatigue reducing appetite'],
    indicatorIds: [],
    appResponse: 'Works with no connection, stores the health record on the device and exports it, and words its guidance for the reply delay of the current mission.',
    source: 'distance',
  },
  {
    id: 'gravity',
    name: 'Gravity fields',
    summary: 'The body adapts to weightlessness on the way, partial gravity on the surface, and full gravity on return.',
    effects: ['Bone and muscle loss', 'Fluid shifting to the head, affecting vision', 'Dizziness and fainting on return to gravity', 'Kidney-stone risk from dehydration'],
    indicatorIds: ['bp', 'hr', 'vision', 'exercise'],
    appResponse: 'Tracks blood pressure, heart rate, vision and exercise over time, with NASA\'s bone-loss estimate for the mission day.',
    source: 'gravity',
  },
  {
    id: 'hostile',
    name: 'Hostile, closed environments',
    summary: 'The spacecraft is a sealed ecosystem. Its air, temperature, light, noise and microbes all affect crew health.',
    effects: ['Raised stress hormones', 'Immune system changes', 'Microbes spreading more easily between people'],
    indicatorIds: ['temp', 'cabinCo2', 'cabinTemp'],
    appResponse: 'Records cabin CO2 and temperature in the same check-in as personal readings and judges them against NASA-STD-3001 limits.',
    source: 'hostile',
  },
];

// Daily routine. Times are this app's schedule; the reasons are NASA's.
export const TASKS = [
  { id: 'resistive', label: 'Resistive exercise (ARED)', time: '10:00', minutes: 60, auto: false, source: 'exercise', why: 'Loading the bones and muscles counters the density and strength lost in weightlessness.' },
  { id: 'cardio', label: 'Treadmill or cycle (T2 / CEVIS)', time: '16:00', minutes: 60, auto: false, source: 'exercise', why: 'Crews average about two hours of exercise a day to protect heart, bone and muscle.' },
  { id: 'water', label: 'Water with every meal', time: '12:30', minutes: 0, auto: false, source: 'gravity', why: 'Dehydration and calcium lost from bone raise the risk of kidney stones.' },
  { id: 'light', label: 'Bright-light period', time: '08:00', minutes: 0, auto: false, source: 'sleepRisk', why: 'With 16 sunrises a day on the station, timed light keeps the body clock on schedule.' },
  { id: 'journal', label: 'Journal entry', time: '20:30', minutes: 0, auto: true, source: 'behaviorRisk', why: 'NASA encourages regular journaling as self-care during isolation.' },
  { id: 'winddown', label: 'Wind-down time', time: '21:30', minutes: 0, auto: false, source: 'sleepRisk', why: 'Protected time for relaxation helps prevent burnout and supports sleep.' },
  { id: 'checkin', label: 'Daily health check-in', time: '07:30', minutes: 0, auto: true, source: 'hazards', why: 'On long missions the crew are the first to spot changes in their own health.' },
];
