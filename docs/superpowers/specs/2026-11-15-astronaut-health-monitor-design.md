# Astronaut Health Monitor: Design

NASA Space Apps Challenge 2026, *Create Health Monitoring Software for Astronauts on Space Missions*.
Written 2026-11-15. Global submission closes 2026-11-15 23:59 PKT; local judging is 16:00–18:00 the same day.

## 1. Intent

On long missions astronauts must spot changes in their own health, often with no quick answer from
Earth. This tool lets one astronaut record a few health indicators each day, see at a glance which
body system needs attention, understand why it matters in space, and know what to do and whom to
tell. It is a hackathon prototype shown to a judge in a 7-minute slot and linked from the
submission page.

## 2. Goals, non-goals, anti-goals

**Goals**
- A static website (frontend only) with six screens that works from a public link with no login.
- Every number on screen traces to a named source; anything that is this app's own rule says so.
- Uses real NASA material: NASA health-standard radiation limits, NASA Human Research Program
  figures, and NASA's DONKI space-weather feed.
- A presenter can turn a body region red in under a minute by entering one reading.
- Covers each row of the hazard table in the Karachi challenge guide (section 11), including
  cabin readings beside health data, symptom reporting on the body map, working offline after
  the first load, and exporting the health record.

**Non-goals**
- No backend, accounts, multi-crew view, camera input, AI chat, or real telemetry.
- No diagnosis and no drug dosing. Guidance is limited to countermeasures NASA documents, plus
  "tell the crew medical officer / contact the flight surgeon".

**Anti-goals (would make it a failure even if it works)**
- An invented formula presented as science (for example a composite "readiness score", or exercise
  minutes changing the bone-loss line).
- Simulated readings shown without a visible "simulated data" label.
- NASA logos, mission patches or other NASA branding anywhere.
- A secret (the personal NASA API key) reaching the browser or a committed file.

## 3. Decisions made by the team

- Frontend only. (Team)
- Simulated crew readings are acceptable. (Team)
- Six screens as listed in section 6; the concept is the team's. (Team)
- Presentation is a 7-slide deck, not a video. (Team)
- Use the live NASA space-weather feed; the team supplies a personal api.nasa.gov key. (Team)
- Work in `astronaut-health-monitor/`; nothing is pushed. (Team)

## 4. Decisions made by the plan author (review these)

- **Stack:** plain HTML, CSS and JavaScript ES modules, no build step and no npm dependencies.
  Chart.js 4.4.7 is vendored as one file for charts. Tests use Node's built-in runner.
  Alternative not taken: Vite + React, which adds an install and a build for six screens.
- **API key:** the personal key is used only by a Node script that saves a snapshot file. The
  browser calls the feed with NASA's public `DEMO_KEY` (10 requests an hour per visitor, measured
  2026-11-15), caches the answer for 6 hours, and falls back to the snapshot. This satisfies the
  repo rule that secrets never reach browser code or query strings.
- **Mission day:** fixed at day 120 for the demo. NASA's bone-loss figure comes from four-to-six
  month missions, so day 120 keeps the estimate inside the range the data covers.
- **Status rule:** a region takes the worst status of its indicators. There is no combined score.
- **Escalation:** amber means self-care; amber or red for three days running means tell the crew
  medical officer; red means contact the flight surgeon. This is the app's own rule.
- **Gamification:** a check-in streak, a weekly completion ring and a personal best. No badges
  that imitate mission patches and no crew leaderboard (health data is private).
- **Hydration and meals** are routine tasks, not measured indicators, because no source gives a
  spaceflight threshold for them.
- **Cabin environment:** two readings, cabin CO2 and cabin temperature, entered in the check-in
  and judged against NASA-STD-3001 limits. Noise is left out because NASA's briefs disagree on
  the sleep-area limit.
- **Symptoms:** a symptom reported on a body region counts only on the day it is reported.
  Severity maps to status as an app rule: mild and moderate are amber, severe is red.
- **Unusual change:** each reading also shows its difference from the wearer's own 14-day
  average. It is information only and never changes a status, so no new rule is invented.
- **Reminders:** each routine task has a scheduled time; tasks past their time are marked
  overdue using the device clock. No browser notifications.
- **Offline:** a service worker (network first, cache as fallback) makes the claim real.
- **AGENTS.md section 0** ("Production with real users") is set to **no**.
- **Folder docs rule:** each new folder gets a short `AGENTS.md`; a `docs/` subfolder is created
  only when there is something to put in it.

## 5. Data sheet

Every value used by the app. "App rule" means the cut-off is ours and the UI must say so.

### 5.1 NASA figures

| Value | Figure | Source |
|---|---|---|
| Bone mineral density loss | 1% to 1.5% per month, on four-to-six month missions | https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/ |
| Eye swelling (SANS) | about 70% of ISS astronauts | https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/ |
| Sunrises and sunsets on the ISS | 16 per day | https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/ |
| Daily exercise | about 2 hours (ARED, T2 treadmill, CEVIS cycle) | https://www.nasa.gov/missions/station/iss-research/astronaut-exercise/ |
| Mars communication delay | up to 20 minutes one way | https://www.nasa.gov/hrp/hazard-distance-from-earth/ |
| Mars gravity | three-eighths of Earth's | https://www.nasa.gov/hrp/hazards/ |
| Moon gravity | one-sixth of Earth's | https://science.nasa.gov/moon/facts/ |
| Career radiation limit | 600 mSv | NASA-STD-3001 brief OCHMO-TB-020 Rev E: https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf |
| Solar particle event limit | 250 mSv per event | same brief |
| ISS dose, 180 days | 77 mSv (solar max) to 86 mSv (solar min) | same brief, sample calculation |
| Lunar surface dose, 180 days | 167 mSv | same brief, sample calculation |
| Surface mission dose rate | approximately 0.5 mSv per day | same brief, page 6 |
| Mars transit dose rate | 1.5 mSv per day (the brief's worked example, not a standard) | same brief, page 6 |
| Cabin CO2 limit | average 1-hour partial pressure no more than 3 mmHg (requirement V2 6004) | NASA-STD-3001 brief OCHMO-TB-004 Rev D: https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf |
| CO2 symptoms seen in flight | headaches at 2.8–4.5 mmHg; fatigue, malaise, decreased sleep and nausea above 4.5 mmHg | same brief, page 4 |
| Cabin temperature, crew health limits | 18 °C to 27 °C (requirement V2 6012) | NASA-STD-3001 brief OCHMO-TB-002 Rev A: https://www.nasa.gov/wp-content/uploads/2023/07/eclss-technical-brief-ochmo.pdf |
| Cabin temperature, performance zone | 20 °C to 25 °C (requirement V2 6013) | same brief, page 4 |
| Interplanetary trip | six months | https://www.nasa.gov/hrp/hazard-gravity-fields/ |
| Time on Mars | up to two years | https://www.nasa.gov/hrp/hazards/ |

Countermeasures NASA documents, used as guidance text: resistive exercise and bisphosphonates
(bone); exercise, diet, fluids and compression garments before landing (cardiovascular); LED
lighting on an Earth-like cycle and protected relaxation time (sleep); journaling, growing plants,
windows, privacy and contact with family (behavioral health); shelter, monitoring and timely
alerts (solar particle events); dehydration raises kidney-stone risk (gravity page).

### 5.2 Mission profiles (scenario parameters)

| id | Name | Gravity | Dose rate (mSv/day) | Prior dose (mSv) | Stay (days) | One-way delay (s) |
|---|---|---|---|---|---|---|
| `iss` | ISS, low Earth orbit | Weightless | 0.45 | 0 | 180 | 0 |
| `moon` | Lunar surface | 1/6 g | 0.93 | 0 | 180 | 1.3 |
| `mars-transit` | Mars transit | Weightless | 1.5 | 0 | 180 | 1200 |
| `mars-surface` | Mars surface | 3/8 g | 0.5 | 270 | 730 | 1200 |

Derivations: 0.45 = midpoint of 77 and 86 mSv over 180 days; 0.93 = 167 ÷ 180; prior dose 270 =
180 days of transit at 1.5; 1.3 s = Earth–Moon distance ÷ speed of light; ISS delay 0 is shown as
"near real time".

### 5.3 Indicator thresholds

| Indicator | Green | Amber | Red | Source |
|---|---|---|---|---|
| Blood pressure (mmHg) | sys < 120 and dia < 80 | sys 120–139 or dia 80–89 | sys ≥ 140 or dia ≥ 90, or sys < 90 or dia < 60 | ACC/AHA categories via https://www.cdc.gov/high-blood-pressure/about/index.html ; low BP via https://www.nhlbi.nih.gov/health/low-blood-pressure |
| Resting heart rate (bpm) | 40–100 | 101–120 | < 40 or > 120 | 60–100 adults, 40–60 trained athletes: https://medlineplus.gov/ency/article/003399.htm . The 120 cut is an app rule. |
| Fasting blood sugar (mg/dL) | 70–99 | 100–125 | ≥ 126 or < 70 | https://diabetes.org/about-diabetes/diagnosis and https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose |
| Body temperature (°C) | 36.1–37.2 | 37.3–38.0, or < 36.1 | > 38.0 | https://medlineplus.gov/ency/article/001982.htm |
| Sleep last night (hours) | ≥ 7 | 6 to < 7 | < 6 | 7 or more hours: https://www.cdc.gov/sleep/about/index.html . The 6-hour cut is an app rule. |
| Mood (1–5 self-rating) | 4–5 | 3 | 1–2 | App rule. No clinical source. |
| Vision change today | none | slight blur | clear change or loss | App rule. A symptom report, not a SANS diagnosis. |
| Cabin CO2 (mmHg) | ≤ 3.0 | > 3.0 to 4.5 | > 4.5 | NASA-STD-3001 limit and in-flight symptom levels, OCHMO-TB-004 |
| Cabin temperature (°C) | 20–25 | 18 to < 20, or > 25 to 27 | < 18 or > 27 | NASA-STD-3001 performance zone and crew health limits, OCHMO-TB-002 |
| Symptom on a body region | none reported | mild or moderate | severe | App rule. |
| Exercise, 7-day average (min/day) | ≥ 120 | 60–119 | < 60 | Target from NASA (about 2 hours); cuts are app rules. |
| Radiation | projected dose at end of stay < 600 mSv | projected ≥ 600 mSv | cumulative ≥ 600 mSv, or a solar particle event alert | NASA-STD-3001 |

Blood sugar is tracked because the challenge names it. NASA's pages do not tie it to a specific
hazard, and the UI must not claim they do.

### 5.4 Input validation (reject outside these)

sys 60–260, dia 30–160 and dia < sys, heart rate 25–230, blood sugar 20–600, temperature 30.0–43.0,
sleep 0–24, mood integer 1–5, vision one of `none`, `slight`, `marked`, cabin CO2 0–40, cabin
temperature 0.0–50.0, journal up to 2000 characters. A symptom needs a known body region, text of
1–200 characters, and severity `mild`, `moderate` or `severe`.

### 5.5 Space weather (NASA DONKI)

- Endpoints: `https://api.nasa.gov/DONKI/SEP` and `https://api.nasa.gov/DONKI/FLR` with
  `startDate`, `endDate` (last 30 days) and `api_key`. The API allows browser calls from any
  origin (`access-control-allow-origin: *`, measured 2026-11-15).
- The field names (`eventTime`, `classType`, `peakTime`, `link`) are from NASA's documentation and
  were not confirmed against a live response because the demo key was rate-limited. The first
  step of the space-weather task confirms them.
- App rule: red if a solar particle event started within 48 hours; amber if one started within
  7 days or an X-class flare peaked within 48 hours; otherwise green.
- The UI states that DONKI reports events observed from near Earth, and that a real vehicle would
  use its own dosimeters.

## 6. Screens

A top bar on every screen shows the mission day, the mission profile selector, and the
"simulated data" label.

1. **Body map (home).** Figure with six body regions (head, eyes, heart, gut, bones, whole body)
   plus a "Cabin" item beside it, each green, amber or red with an icon and a word. Shows the
   count of items needing attention, the top alert, the next scheduled task, and "check-in due"
   until today's check-in is done. Selecting a region opens a panel with latest readings, the
   change from the wearer's 14-day average, a link to the trend, why it matters in space, how to
   measure it, the action, and a form to report a symptom or discomfort in that body region.
2. **Daily check-in.** One step per indicator, plus one step for the two cabin readings and one
   for the journal, each with how to measure it and why it matters, then a review step. Any step
   can be skipped.
3. **Trends.** A chart per indicator with the normal band shaded and a 7 / 30 / all-days toggle;
   cabin CO2 and temperature with NASA's limits drawn; the bone-loss estimate band, drawn only
   to day 180 and labelled an estimate from NASA's average; the cumulative radiation line
   against the 600 mSv limit.
4. **Alerts and actions.** Everything amber or red, worst first, each with meaning, action,
   escalation level and reply delay for the current mission. Live space-weather card. "Build
   report for ground" produces a text summary to copy; the screen states nothing is transmitted.
   "Download health record" saves the readings as a CSV file.
5. **Routine and rewards.** Today's seven tasks in time order (07:30 health check-in, 08:00
   bright-light period, 10:00 resistive exercise 60 min, 12:30 water with every meal, 16:00
   cardio 60 min, 20:30 journal entry, 21:30 wind-down time), each citing its NASA reason and
   marked overdue once its time has passed; streak, weekly ring, personal best. The journal entry
   is written as a step of the check-in, so the journal and check-in tasks tick themselves.
6. **Hazard library.** NASA's five hazards as cards, each paraphrased with its source link, links
   to the indicators the app tracks for it, and one line on how the app responds to that hazard.

Status is never shown by colour alone. Every user-entered string is rendered as text, never HTML.
The top bar shows "Offline: using saved data" when the device has no connection. A footer on
every screen reads: "Prototype for NASA Space Apps 2026. Decision support only, not a medical
diagnosis."

## 7. Simulated history

Deterministic (seeded) readings for days 1–119; day 120 has no entry until the user checks in.
Ordinary days stay inside the green bands. Scripted episodes give the demo a story:

- Days 84–86: temperature 37.6, 38.3, 37.5 with heart rate raised by 12.
- Days 98–99: no check-in (breaks the streak).
- Days 112–119: sleep 6.6, 6.4, 6.5, 6.2, 6.3, 6.0, 5.9, 5.8; mood 3, 3, 3, 3, 2, 3, 2, 2;
  resistive exercise skipped on days 114, 116, 117, 118 and 119; cardio skipped on days 118 and 119.
- Days 116–119: blood pressure 124/78, 127/79, 129/81, 131/82.
- Days 118–119: cabin CO2 3.2 and 3.4 mmHg. Ordinary days are 2.0–2.8 mmHg, and cabin
  temperature is 21.5–23.5 °C throughout.

All seven routine tasks are marked done on every other day, except the check-in task on days 98–99.
No symptoms are simulated.

Result before check-in on the ISS profile: head red (sleep, mood), heart amber, cabin amber,
bones amber (7-day exercise average over days 113–119 is exactly 60 minutes), others green;
5 items need attention; streak 20, personal best 97; weekly ring 35 of 49.

## 8. Submission constraints the build must respect

- English only. Public link that opens with no login, tested in a private window.
- State in the project description that code was written with AI assistance (Claude) and that
  crew readings are simulated.
- List in the submission: NASA sources in 5.1, DONKI, the clinical sources in 5.3, Chart.js (MIT).
- No personal information, no likeness of anyone under 18, no commercial promotion.

## 9. Left to the builder

Visual design (within: dark, calm, readable at arm's length, not colour-only), the drawing of the
body figure, chart styling, copy wording for explanations (paraphrase the cited source; do not
add medical claims), and file-internal structure.

## 10. Not verified

- The definitions of the five judging criteria (they are in a separate Judging and Awards Guide).
- DONKI response field names (see 5.5).
- The two Canadian Space Agency pages in the challenge resources could not be reached and are not used.

## 11. Karachi challenge guide (Challenge #04 PDF)

The local organisers' guide is what the Karachi judge is most likely to have read. Its hazard
table and feature list are mapped here; the hazard library shows the "App response" column.

| Hazard | Guide's expected software solution | App response |
|---|---|---|
| Space radiation | Display available radiation exposure data and maintain health records | Cumulative dose against NASA's 600 mSv limit, projection, live space-weather alert, exportable record |
| Isolation and confinement | Mood tracking, sleep monitoring, regular well-being assessments | Daily mood and sleep check-in, journal, three-day escalation rule |
| Distance from Earth | Accessible health records, offline functionality, self-assessment guidance | Works offline, records stored on the device and exportable, reply-delay-aware guidance |
| Gravity fields | Track physical indicators and display changes over time | Blood pressure, heart rate, vision, exercise and bone-loss estimate on trend charts |
| Hostile or closed environments | Record environmental measurements alongside personal health data | Cabin CO2 and temperature in the same check-in, judged against NASA-STD-3001 limits |

Guide feature list → where it lives: interactive body map with symptom recording (home);
dynamic charts (trends); colour-coded alerts (home, alerts); reminders (routine times, overdue
marks, check-in due); simple medical guidance (region panel, alerts); gamification (routine);
"decision-support tool rather than replacing professional medical diagnosis" (footer wording).

Two cautions about the guide itself: its page 1 paragraph "What Is the Challenge Asking" describes
a different challenge (a lunar outpost game) and is ignored; the bar chart on its page 4 is
labelled conceptual and is not used as data.
