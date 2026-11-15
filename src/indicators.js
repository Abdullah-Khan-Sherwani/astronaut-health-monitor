// Health indicators: thresholds, sources and the plain-language copy shown beside them.
// Thresholds are the design data sheet, section 5.3. Cut-offs marked "this app's own rule"
// have no external source and say so on screen.

const band = (v, green, amber) => (green(v) ? 'green' : amber(v) ? 'amber' : 'red');

const CDC_BP = { title: 'CDC: High Blood Pressure (ACC/AHA categories)', url: 'https://www.cdc.gov/high-blood-pressure/about/index.html' };
const MEDLINE_PULSE = { title: 'MedlinePlus: Pulse', url: 'https://medlineplus.gov/ency/article/003399.htm' };
const ADA = { title: 'American Diabetes Association: Diagnosis', url: 'https://diabetes.org/about-diabetes/diagnosis' };
const MEDLINE_TEMP = { title: 'MedlinePlus: Body temperature norms', url: 'https://medlineplus.gov/ency/article/001982.htm' };
const CDC_SLEEP = { title: 'CDC: About Sleep', url: 'https://www.cdc.gov/sleep/about/index.html' };
const NASA_BEHAVIOR = { title: 'NASA: Risk of Behavioral Conditions and Psychiatric Disorders', url: 'https://www.nasa.gov/reference/risk-of-behavioral-conditions-and-psychiatric-disorders/' };
const NASA_SANS = { title: 'NASA: Risk of Spaceflight Associated Neuro-ocular Syndrome', url: 'https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/' };
const NASA_CO2 = { title: 'NASA-STD-3001 brief OCHMO-TB-004: Carbon Dioxide', url: 'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf' };
const NASA_ECLSS = { title: 'NASA-STD-3001 brief OCHMO-TB-002: Life Support', url: 'https://www.nasa.gov/wp-content/uploads/2023/07/eclss-technical-brief-ochmo.pdf' };
const NASA_EXERCISE = { title: 'NASA: Astronaut Exercise', url: 'https://www.nasa.gov/missions/station/iss-research/astronaut-exercise/' };
const NASA_RADIATION = { title: 'NASA-STD-3001 brief OCHMO-TB-020: Ionizing Radiation Protection', url: 'https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf' };

export const STATUS_LABEL = { green: 'OK', amber: 'Watch', red: 'Act now', none: 'No data' };

export const SEVERITY_STATUS = { mild: 'amber', moderate: 'amber', severe: 'red' };

export const INDICATORS = [
  {
    id: 'bp', label: 'Blood pressure', unit: 'mmHg', region: 'heart', derived: false,
    question: 'What is your blood pressure?',
    fields: [
      { key: 'sys', label: 'Systolic (upper number)', min: 60, max: 260, step: 1 },
      { key: 'dia', label: 'Diastolic (lower number)', min: 30, max: 160, step: 1 },
    ],
    green: { sys: { min: 90, max: 119 }, dia: { min: 60, max: 79 } },
    classify: ({ sys, dia }) => {
      if (sys >= 140 || dia >= 90 || sys < 90 || dia < 60) return 'red';
      return sys >= 120 || dia >= 80 ? 'amber' : 'green';
    },
    format: v => `${v.sys}/${v.dia} mmHg`,
    why: 'Weightlessness changes how blood moves around the body, and NASA notes that low blood pressure raises the risk of fainting at landing.',
    howTo: ['Sit and rest for 5 minutes.', 'Put the cuff on your bare upper arm at heart level.', 'Stay still and quiet until the reading finishes.'],
    actions: {
      amber: ['Measure again after 5 minutes of rest.', 'Keep up today\'s exercise and fluids.'],
      red: ['Measure again after 5 minutes of rest.', 'Tell the crew medical officer and contact the flight surgeon.'],
    },
    source: CDC_BP, appRuleNote: null,
  },
  {
    id: 'hr', label: 'Resting heart rate', unit: 'bpm', region: 'heart', derived: false,
    question: 'What is your resting heart rate?',
    fields: [{ key: 'hr', label: 'Beats per minute', min: 25, max: 230, step: 1 }],
    green: { min: 40, max: 100 },
    classify: v => band(v, x => x >= 40 && x <= 100, x => x > 100 && x <= 120),
    format: v => `${v} bpm`,
    why: 'The heart and blood vessels adapt to weightlessness, and NASA lists changes in heart rhythm as a spaceflight risk.',
    howTo: ['Rest for 5 minutes.', 'Read the monitor, or count your pulse at the wrist for 60 seconds.'],
    actions: {
      amber: ['Rest and measure again in 15 minutes.'],
      red: ['Measure again.', 'Tell the crew medical officer and contact the flight surgeon.'],
    },
    source: MEDLINE_PULSE,
    appRuleNote: 'The range of 40 to 100 combines the adult and trained-athlete ranges; 120 as the red cut-off is this app\'s own rule.',
  },
  {
    id: 'glucose', label: 'Fasting blood sugar', unit: 'mg/dL', region: 'gut', derived: false,
    question: 'What is your blood sugar before eating?',
    fields: [{ key: 'glucose', label: 'mg/dL', min: 20, max: 600, step: 1 }],
    green: { min: 70, max: 99 },
    classify: v => band(v, x => x >= 70 && x < 100, x => x >= 100 && x < 126),
    format: v => `${v} mg/dL`,
    why: 'The challenge lists blood sugar as a useful indicator, and NASA lists inadequate food and nutrition as a spaceflight risk.',
    howTo: ['Measure before your first meal.', 'Clean and dry a fingertip.', 'Apply one drop of blood to the test strip.'],
    actions: {
      amber: ['Eat your scheduled meals.', 'Measure again tomorrow before eating.'],
      red: ['If the reading is below 70: take 15 g of fast-acting carbohydrate and measure again after 15 minutes.', 'Contact the flight surgeon.'],
    },
    source: ADA, appRuleNote: null,
  },
  {
    id: 'temp', label: 'Body temperature', unit: '°C', region: 'body', derived: false,
    question: 'What is your body temperature?',
    fields: [{ key: 'temp', label: '°C', min: 30, max: 43, step: 0.1 }],
    green: { min: 36.1, max: 37.2 },
    classify: v => band(v, x => x >= 36.1 && x <= 37.2, x => x < 36.1 || x <= 38.0),
    format: v => `${v} °C`,
    why: 'NASA reports immune system changes in space, and microbes spread more easily between people in a closed habitat.',
    howTo: ['Place the thermometer under your tongue.', 'Keep your mouth closed until it signals.'],
    actions: {
      amber: ['Measure again in 1 hour.', 'Rest and drink fluids.'],
      red: ['Measure again.', 'Tell the crew medical officer and contact the flight surgeon.'],
    },
    source: MEDLINE_TEMP, appRuleNote: null,
  },
  {
    id: 'sleep', label: 'Sleep last night', unit: 'h', region: 'head', derived: false,
    question: 'How many hours did you sleep last night?',
    fields: [{ key: 'sleep', label: 'Hours asleep', min: 0, max: 24, step: 0.1 }],
    green: { min: 7, max: 9 },
    classify: v => band(v, x => x >= 7, x => x >= 6),
    format: v => `${v} h`,
    why: 'On the station the Sun rises and sets 16 times a day, which disrupts the body clock. NASA links sleep loss to lower performance.',
    howTo: ['Enter the hours you were actually asleep, not the time in your sleep station.'],
    actions: {
      amber: ['Use today\'s bright-light period and wind-down time.', 'Keep the same bedtime tonight.'],
      red: ['Tell the crew medical officer.', 'Ask the flight surgeon to review your schedule.'],
    },
    source: CDC_SLEEP,
    appRuleNote: 'Seven or more hours is the CDC recommendation; 6 hours as the red cut-off is this app\'s own rule.',
  },
  {
    id: 'mood', label: 'Mood', unit: '', region: 'head', derived: false,
    question: 'How is your mood today, overall?',
    options: [
      { value: 1, label: 'Very low' }, { value: 2, label: 'Low' }, { value: 3, label: 'Okay' },
      { value: 4, label: 'Good' }, { value: 5, label: 'Very good' },
    ],
    green: { min: 4, max: 5 },
    classify: v => band(v, x => x >= 4, x => x === 3),
    format: v => `${v} of 5`,
    why: 'NASA finds that isolation and confinement can bring anxiety and low mood, which affect sleep, morale and decisions.',
    howTo: ['Choose the number that fits the day as a whole, not just this moment.'],
    actions: {
      amber: ['Write a journal entry.', 'Contact family, or spend time at a window or with the plants.'],
      red: ['Tell the crew medical officer and contact the flight surgeon.'],
    },
    source: NASA_BEHAVIOR,
    appRuleNote: 'The 1 to 5 scale and its cut-offs are this app\'s own rule.',
  },
  {
    id: 'vision', label: 'Vision', unit: '', region: 'eyes', derived: false,
    question: 'Any change in your vision today?',
    options: [
      { value: 'none', label: 'No change' }, { value: 'slight', label: 'Slight blur' },
      { value: 'marked', label: 'Clear change or loss' },
    ],
    classify: v => ({ none: 'green', slight: 'amber', marked: 'red' })[v] ?? 'none',
    format: v => ({ none: 'No change', slight: 'Slight blur', marked: 'Clear change or loss' })[v] ?? String(v),
    why: 'In weightlessness fluid shifts toward the head. NASA reports that about 70% of station astronauts have some swelling at the back of the eye.',
    howTo: ['Cover one eye at a time.', 'Read a familiar label at arm\'s length and compare with yesterday.'],
    actions: {
      amber: ['Report it at the next ground contact.', 'Check again tomorrow.'],
      red: ['Contact the flight surgeon now for an eye examination.'],
    },
    source: NASA_SANS,
    appRuleNote: 'This is a symptom report, not a diagnosis; its colours are this app\'s own rule.',
  },
  {
    id: 'cabinCo2', label: 'Cabin CO2', unit: 'mmHg', region: 'cabin', derived: false,
    question: 'What does the cabin air monitor show?',
    fields: [{ key: 'cabinCo2', label: 'CO2, 1-hour average (mmHg)', min: 0, max: 40, step: 0.1 }],
    green: { min: 0, max: 3 },
    classify: v => band(v, x => x <= 3, x => x <= 4.5),
    format: v => `${v} mmHg`,
    why: 'NASA limits cabin CO2 to a 1-hour average of 3 mmHg. Crews have reported headaches from 2.8 mmHg, and fatigue and poor sleep above 4.5 mmHg.',
    howTo: ['Read the 1-hour average CO2 from the cabin air monitor.'],
    actions: {
      amber: ['Move to a well-ventilated spot.', 'Check that air is flowing at your sleep station.'],
      red: ['Tell the crew.', 'Check the CO2 removal system and contact the flight surgeon.'],
    },
    source: NASA_CO2, appRuleNote: null,
  },
  {
    id: 'cabinTemp', label: 'Cabin temperature', unit: '°C', region: 'cabin', derived: false,
    question: 'What is the cabin temperature?',
    fields: [{ key: 'cabinTemp', label: 'Cabin temperature (°C)', min: 0, max: 50, step: 0.1 }],
    green: { min: 20, max: 25 },
    classify: v => band(v, x => x >= 20 && x <= 25, x => x >= 18 && x <= 27),
    format: v => `${v} °C`,
    why: 'NASA\'s crew health limits for cabin temperature are 18 to 27 °C, with 20 to 25 °C for comfort and performance.',
    howTo: ['Read the cabin thermometer, away from warm equipment.'],
    actions: {
      amber: ['Adjust the cabin temperature setting.', 'Check again in 1 hour.'],
      red: ['Tell the crew.', 'Check the thermal control system and contact ground.'],
    },
    source: NASA_ECLSS, appRuleNote: null,
  },
  {
    id: 'exercise', label: 'Exercise, 7-day average', unit: 'min/day', region: 'bones', derived: true,
    green: { min: 120, max: 150 },
    classify: v => band(v, x => x >= 120, x => x >= 60),
    format: v => `${v} min/day`,
    why: 'Weight-bearing bones lose 1 to 1.5% of their mineral density a month in space. Crews exercise about two hours a day to slow this.',
    howTo: ['Worked out from the exercise blocks you tick off in your routine.'],
    actions: {
      amber: ['Complete both exercise blocks today.'],
      red: ['Tell the crew medical officer.', 'Plan make-up sessions with the flight surgeon.'],
    },
    source: NASA_EXERCISE,
    appRuleNote: 'Two hours a day is NASA\'s figure; the amber and red bands are this app\'s own rule.',
  },
  {
    id: 'radiation', label: 'Radiation dose', unit: 'mSv', region: 'body', derived: true,
    why: 'NASA limits an astronaut\'s career dose to 600 mSv, and exposure from a single solar particle event to 250 mSv.',
    howTo: ['Read from your personal dosimeter. In this prototype the readings are simulated.'],
    actions: {
      amber: ['Review your projected dose with the flight surgeon.'],
      red: ['Move to the shelter area.', 'Contact the flight surgeon.'],
    },
    source: NASA_RADIATION, appRuleNote: null,
  },
];

// The two cabin readings share one check-in step.
export const CHECKIN_STEPS = [['bp'], ['hr'], ['glucose'], ['temp'], ['sleep'], ['mood'], ['vision'], ['cabinCo2', 'cabinTemp']];

export const REGIONS = [
  { id: 'head', label: 'Head', indicatorIds: ['sleep', 'mood'], bodyPart: true },
  { id: 'eyes', label: 'Eyes', indicatorIds: ['vision'], bodyPart: true },
  { id: 'heart', label: 'Heart', indicatorIds: ['bp', 'hr'], bodyPart: true },
  { id: 'gut', label: 'Gut', indicatorIds: ['glucose'], bodyPart: true },
  { id: 'bones', label: 'Bones and muscles', indicatorIds: ['exercise'], bodyPart: true },
  { id: 'body', label: 'Whole body', indicatorIds: ['temp', 'radiation'], bodyPart: true },
  { id: 'cabin', label: 'Cabin', indicatorIds: ['cabinCo2', 'cabinTemp'], bodyPart: false },
];
