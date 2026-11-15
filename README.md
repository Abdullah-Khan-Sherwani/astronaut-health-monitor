# Astronaut Health Monitor

NASA Space Apps Challenge 2026: *Create Health Monitoring Software for Astronauts on Space Missions*.

A visual self-assessment tool for astronauts on long missions. The crew member records daily
readings, sees at a glance which part of the body or cabin needs attention, and is told what to do
next and when to involve the crew medical officer or the flight surgeon.

It is a prototype for decision support. It is not a medical diagnosis.

## Screens

| Screen | What it does |
|---|---|
| Body map | A figure with selectable regions, each marked OK, Watch or Act now, with the reason, the action and symptom reporting |
| Check-in | A guided daily entry of nine readings and a journal, with how to measure each one and why it matters in space |
| Trends | Charts of every reading against its normal range, an estimated bone-loss band and a radiation dose projection |
| Alerts | What needs attention in order of urgency, live space weather, a report for ground and a CSV export |
| Routine | The day's health tasks with reminders, a check-in streak and a weekly completion ring |
| Hazards | NASA's five hazards of human spaceflight, each linked to the readings this app tracks for it |

Four mission profiles (ISS, lunar surface, Mars transit, Mars surface) change gravity, radiation
dose rate and the communication delay used in the guidance.

## Run it

No install and no build step. You need Python 3 (for a local server) and Node 22 or later (for the tests).

```bash
npm run serve      # then open http://localhost:8000
npm test           # 46 unit tests for the health rules and projections
```

To refresh the saved space-weather snapshot with your own NASA key (free at https://api.nasa.gov):

```bash
cp .env.example .env    # then put your key in .env
npm run weather
```

The key is used only by that script. The browser uses NASA's public `DEMO_KEY`, keeps the answer
for six hours, and falls back to the saved snapshot when the feed cannot be reached. After the
first visit the app works with no connection.

## Data

**Crew readings are simulated.** Real astronaut medical data is not public. The 119 days of
history are generated from a fixed seed with scripted episodes so the demo is repeatable. The
limits, rates and guidance the readings are judged against are real. Every one is listed with
its source under [Sources](#sources) at the bottom of this page.

## Use of AI

The idea, the scope and the decisions are the team's. The code and documents were written with
AI assistance (Claude, by Anthropic) and reviewed by the team. The presentation was prepared with
OpenAI Codex assistance and combines actual app screenshots with AI-generated space illustrations.
The app itself uses no AI-generated imagery and does not call any AI model.

## Credits

- [Chart.js](https://www.chartjs.org/) 4.4.7, MIT licence, included in `vendor/`.
- This project is not affiliated with or endorsed by NASA. It uses no NASA logos or branding.

## More

- Design: `docs/superpowers/specs/2026-11-15-astronaut-health-monitor-design.md`
- Build plan: `docs/superpowers/plans/2026-11-15-astronaut-health-monitor.md`
- Submission text, slide outline and judge questions: `docs/submission.md`
- Presentation: [SpaceEX visual deck](SpaceEX-Astronaut-Health-Monitor-Visual.pptx), with all pictures embedded.

## Sources

The app shows no source links on screen, to keep the screens clear. Everything it uses is listed here.

### NASA data and resources

| Used for | Figure | Source |
|---|---|---|
| The five hazards and their effects | Summaries on the Hazards screen | [5 Hazards of Human Spaceflight](https://www.nasa.gov/hrp/hazards/) and the five hazard pages |
| Career radiation limit | 600 mSv | [NASA-STD-3001 brief OCHMO-TB-020](https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf) |
| Solar particle event limit | 250 mSv per event | same brief |
| Dose rates per mission profile | ISS 77–86 mSv and lunar surface 167 mSv per 180 days; surface about 0.5 mSv a day; Mars transit 1.5 mSv a day (the brief's worked example) | same brief |
| Cabin CO2 limit | 3 mmHg one-hour average; symptoms reported from 2.8 to above 4.5 mmHg | [NASA-STD-3001 brief OCHMO-TB-004](https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf) |
| Cabin temperature | 18–27 °C health limits, 20–25 °C performance zone | [NASA-STD-3001 brief OCHMO-TB-002](https://www.nasa.gov/wp-content/uploads/2023/07/eclss-technical-brief-ochmo.pdf) |
| Bone-loss estimate | 1–1.5% a month on four-to-six month missions | [Risk of Spaceflight-Induced Bone Changes](https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/) |
| Vision | About 70% of ISS astronauts show eye swelling | [Risk of SANS](https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/) |
| Sleep | 16 sunrises a day on the ISS | [Risk from Inadequate Sleep](https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/) |
| Exercise target | About two hours a day | [Astronaut Exercise](https://www.nasa.gov/missions/station/iss-research/astronaut-exercise/) |
| Communication delay | Up to 20 minutes one way at Mars | [Distance from Earth hazard](https://www.nasa.gov/hrp/hazard-distance-from-earth/) |
| Live space weather | Solar particle events and coronal mass ejections | [NASA DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/) through api.nasa.gov |

### Clinical ranges

| Reading | Source |
|---|---|
| Blood pressure | ACC/AHA categories via [CDC](https://www.cdc.gov/high-blood-pressure/about/index.html); low pressure via [NHLBI](https://www.nhlbi.nih.gov/health/low-blood-pressure) |
| Resting heart rate | [MedlinePlus](https://medlineplus.gov/ency/article/003399.htm) |
| Fasting blood sugar | [American Diabetes Association](https://diabetes.org/about-diabetes/diagnosis) |
| Body temperature | [MedlinePlus](https://medlineplus.gov/ency/article/001982.htm) |
| Sleep | [CDC](https://www.cdc.gov/sleep/about/index.html) |

Some cut-offs have no published source and are this app's own rules: the mood scale, the vision
report, symptom severity, the six-hour sleep line, the heart-rate red line, the exercise bands and
the space-weather time windows. The note under each reading in the app says so.

### Every NASA page and document used

- [NASA: 5 Hazards of Human Spaceflight](https://www.nasa.gov/hrp/hazards/)
- [NASA: Space Radiation hazard](https://www.nasa.gov/hrp/hazard-space-radiation/)
- [NASA: Isolation and Confinement hazard](https://www.nasa.gov/hrp/hazard-isolation-and-confinement/)
- [NASA: Distance from Earth hazard](https://www.nasa.gov/hrp/hazard-distance-from-earth/)
- [NASA: Gravity Fields hazard](https://www.nasa.gov/hrp/hazard-gravity-fields/)
- [NASA: Hostile/Closed Environments hazard](https://www.nasa.gov/hrp/hazard-hostile-closed-environments/)
- [NASA-STD-3001 brief OCHMO-TB-020: Ionizing Radiation Protection](https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf)
- [NASA-STD-3001 brief OCHMO-TB-004: Carbon Dioxide](https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf)
- [NASA-STD-3001 brief OCHMO-TB-002: Life Support](https://www.nasa.gov/wp-content/uploads/2023/07/eclss-technical-brief-ochmo.pdf)
- [NASA-STD-3001 Volume 1: Crew Health](https://www.nasa.gov/reference/nasa-std-3001v1/)
- [NASA: Risk of Spaceflight-Induced Bone Changes](https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/)
- [NASA: Risk of Spaceflight Associated Neuro-ocular Syndrome](https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/)
- [NASA: Risk from Inadequate Sleep and Irregular Schedules](https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/)
- [NASA: Risk of Cardiovascular Adaptations](https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/)
- [NASA: Risk of Behavioral Conditions and Psychiatric Disorders](https://www.nasa.gov/reference/risk-of-behavioral-conditions-and-psychiatric-disorders/)
- [NASA: Astronaut Exercise](https://www.nasa.gov/missions/station/iss-research/astronaut-exercise/)
- [NASA Science: Moon Facts](https://science.nasa.gov/moon/facts/)
- [NASA CCMC DONKI space weather database](https://ccmc.gsfc.nasa.gov/tools/DONKI/)
