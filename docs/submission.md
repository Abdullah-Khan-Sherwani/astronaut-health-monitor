# Submission pack

Drafts for the Space Apps project page, the seven slides and the judges' questions. Everything is
in English. The finished slides are in `SpaceEX-Astronaut-Health-Monitor-Visual.pptx`, with all pictures embedded.

Local judging: 15 November, 16:00–18:00 PKT, seven minutes to present and three for questions.
Submission closes 15 November at 23:59.

## Form fields

**Team name:** SpaceEX

**Team members:** Saad Inam, Abdullah Khan Sherwani

**Project name:** Astronaut Health Monitor

**High-level project summary**

On a long mission the crew are the first, and sometimes the only, people who can notice a change
in their own health. Astronaut Health Monitor is a visual self-assessment tool for that moment. A
crew member records a short daily check-in, sees on a body map which region or cabin reading needs
attention, and is told in plain words what to do and when to involve the crew medical officer or
the flight surgeon. Readings are judged against NASA-STD-3001 limits and published clinical
ranges, radiation dose is projected against NASA's career limit, and NASA's live space-weather
feed raises a solar particle event alert. The app works with no connection and words its guidance
for the communication delay of the mission, from near real time on the station to forty minutes
for a reply at Mars.

**Detailed project description**

*What it does.* Six screens:

1. Body map. A figure with seven selectable regions (head, eyes, heart, gut, bones and muscles,
   whole body, cabin). Each label shows OK, Watch or Act now as a word as well as a colour; the
   figure itself is drawn in blues only. Selecting a region opens a sheet with the reading, how it compares with the crew member's own 14-day
   average, why it matters in space, the steps to take, and who to tell. Symptoms can be reported
   on any region.
2. Check-in. A guided entry of blood pressure, heart rate, fasting blood sugar, body temperature,
   sleep, mood, vision, cabin CO2 and cabin temperature, plus a journal. Each step explains how to
   take the measurement and why it is needed. Out-of-range entries are rejected with the allowed
   range.
3. Trends. One chart at a time, chosen from a list of readings: each reading against its normal
   range, exercise minutes against NASA's two-hour target, an estimated bone-loss band, and
   cumulative radiation dose projected to the end of the stay against the 600 mSv career limit.
4. Alerts. Everything that needs attention in order of urgency, each with numbered actions and an
   escalation level: self-care, tell the crew medical officer after three flagged days, contact
   the flight surgeon for anything red. A space-weather panel shows NASA DONKI events. A report for
   ground can be built and copied, and the full record downloads as a CSV file.
5. Routine. The day's health tasks with times, overdue and next marks, the reason for each task, a
   check-in streak and a weekly completion ring.
6. Hazards. NASA's five hazards of human spaceflight, each with its effects, the readings the app
   tracks for it and their current status.

Four mission profiles (ISS, lunar surface, Mars transit, Mars surface) change gravity, radiation
dose rate and the reply delay.

*How it works.* A static website in plain HTML, CSS and JavaScript with no server and no build
step. The health rules are separate, tested modules (46 unit tests). The record is stored on the
device, and a service worker lets the app reload with no connection.

*What is real and what is simulated.* Crew readings are simulated, because real astronaut medical
data is not public; the app says so on every screen. The limits, rates and guidance are real and
all are listed with their sources in the project README. Where a cut-off is our own rule, the
note under that reading says so. The app is
decision support and does not diagnose.

*What comes next.* Input from wearables and the vehicle's own dosimeters, and a view for the crew
medical officer across the whole crew.

**Project link (demo):** the GitHub Pages address, once enabled (see Deployment below)

**Final project link (code):** https://github.com/Abdullah-Khan-Sherwani/astronaut-health-monitor

**NASA data and resources**

- 5 Hazards of Human Spaceflight and the five hazard pages (Human Research Program): the hazard
  summaries, their health effects and the countermeasures used as guidance text.
  https://www.nasa.gov/hrp/hazards/
- Risks of Human Spaceflight pages: bone loss of 1–1.5% a month, eye swelling in about 70% of ISS
  astronauts, 16 sunrises a day, behavioural health countermeasures.
  https://www.nasa.gov/hrp/risks/
- NASA-STD-3001 technical brief OCHMO-TB-020, Ionizing Radiation Protection: the 600 mSv career
  limit, the 250 mSv solar particle event limit and the dose rates behind each mission profile.
- NASA-STD-3001 technical brief OCHMO-TB-004, Carbon Dioxide: the 3 mmHg cabin limit and the
  symptom levels used for Watch and Act now.
- NASA-STD-3001 technical brief OCHMO-TB-002, Environmental Control and Life Support: the cabin
  temperature limits.
- NASA DONKI (Space Weather Database of Notifications, Knowledge, Information) through
  api.nasa.gov: live solar particle events and coronal mass ejections for the space-weather alert.
- Astronaut Exercise (ISS research): the two-hour daily exercise target and the equipment names.

**Space agency partner and other data**

- CDC: blood pressure categories (ACC/AHA) and the seven-hour sleep recommendation.
- NHLBI: low blood pressure.
- MedlinePlus (US National Library of Medicine): resting heart rate and body temperature ranges.
- American Diabetes Association: fasting blood sugar ranges.
- Chart.js 4.4.7 (MIT licence): the charts.
- The Canadian Space Agency pages listed for the challenge could not be reached while we were
  building, so no CSA data is used.

**Use of artificial intelligence**

The idea, scope and decisions are the team's. The code and the written documents were produced
with AI assistance (Claude, by Anthropic) and reviewed by the team. The presentation was prepared
with OpenAI Codex assistance, using actual app screenshots and AI-generated space illustrations.
The app itself uses no AI-generated imagery and does not call an AI model. No NASA logos or
branding are used.

## Seven slides

1. **Title.** Astronaut Health Monitor. Team name, members, the challenge: Create Health
   Monitoring Software for Astronauts on Space Missions.
2. **The problem.** On a long mission the crew must spot changes in themselves. At Mars a reply
   from the flight surgeon takes at least forty minutes. Medical equipment and expertise on board
   are limited. Five hazards act on the body at once.
3. **The product.** One screenshot: the body map with the head marked Act now and the heart, bones
   and cabin marked Watch. One line: see what needs attention, why, and what to do.
4. **The user experience.** Four small screenshots in order: check-in → status on the body map →
   numbered actions → escalation and the report for ground.
5. **Five hazards, five responses.**

   | Hazard | What the app does |
   |---|---|
   | Space radiation | Dose against NASA's 600 mSv limit, projection, live space-weather alert |
   | Isolation and confinement | Daily mood and sleep check-in, journal, three-day escalation rule |
   | Distance from Earth | Works offline, record on the device, guidance worded for the reply delay |
   | Gravity fields | Blood pressure, heart rate, vision, exercise and a bone-loss estimate over time |
   | Hostile, closed environment | Cabin CO2 and temperature judged against NASA-STD-3001 |

6. **Why it is valid.** NASA-STD-3001 limits: 600 mSv, 250 mSv, 3 mmHg CO2, 18–27 °C. NASA's
   1–1.5% monthly bone loss. Live NASA DONKI feed. Every threshold is listed with its source in the README, our
   own rules are labelled, readings are simulated and say so. 46 automated tests.
7. **What comes next.** Wearable and dosimeter input, a crew medical officer view, validation with
   flight surgeons.

Demo path for the seven minutes (about ninety seconds): Reset demo → body map shows 5 need
attention → open Head → open Cabin (CO2 3.4 against NASA's 3 mmHg) → Check-in, enter 150/95, save
→ heart turns red → Alerts shows "Contact the flight surgeon" → switch mission to Mars surface →
reply delay becomes 40 minutes and whole body turns Watch → Trends, radiation projection crosses
600 mSv → Alerts, tick the solar particle event demo → whole body turns Act now.

## Judges' questions

The ten questions in the Karachi challenge guide, with the screen that shows the answer.

1. **How does it monitor physical and psychological health?** One daily check-in covers both:
   seven personal readings including sleep and mood, two cabin readings and a journal. *Check-in, Body map.*
2. **Which indicators matter most?** The six the challenge names, plus vision, exercise, cabin CO2,
   cabin temperature and radiation, because NASA ties each of those to one of the five hazards.
   Blood sugar is tracked because the challenge asks for it; we do not claim NASA links it to a
   hazard. *Hazards.*
3. **How are unusual changes identified?** Two ways: each reading is classed against a published
   range, and it is compared with the crew member's own 14-day average. A flag that lasts three
   days is escalated. *Body map, Trends.*
4. **How are the five hazards monitored?** Each hazard has tracked readings and a stated response.
   *Hazards.*
5. **What happens to records during a communication delay or outage?** The record lives on the
   device, the app reloads with no connection, the record exports as CSV, and the guidance states
   the reply delay and tells the crew to start onboard steps. *Alerts.*
6. **Are the charts simple?** One chart on screen at a time, the normal range shaded, NASA limits
   drawn as dashed lines, three time ranges. *Trends.*
7. **How do reminders and alerts work?** Tasks have times and show Overdue or Next; the home screen
   shows the count needing attention and links to the alerts. *Routine, Body map, Alerts.*
8. **How does it give guidance without replacing diagnosis?** Guidance is limited to
   countermeasures NASA documents and to who to tell. It never names a condition. Every screen
   carries "Decision support only, not a medical diagnosis." *Alerts.*
9. **How are sleep, mood and behavioural health handled?** Daily sleep hours and a five-point mood
   rating, a journal (a NASA-documented countermeasure), wind-down and bright-light tasks, and
   escalation to the flight surgeon when either is red. *Check-in, Routine.*
10. **How does it stay usable and reliable in space?** No server, no network needed after the first
    load, readable text, status shown by a word as well as colour, full keyboard use, input
    validation, and tested health rules. *All screens.*

Harder questions to expect:

- *Is the data real?* The readings are simulated and labelled. The limits and rates are NASA's.
- *Why these thresholds?* Each is listed with its source in the README (Sources section); where it
  is ours, the note under the reading says so. Have the README open in a tab to show it.
- *Is the bone-loss number a measurement?* No. It is NASA's average range, drawn only to day 180
  because that is as far as the data reaches, and the caption says it is not a measurement.
- *Does DONKI apply at Mars?* It reports events seen from near Earth. The panel says a real vehicle
  would also use its own dosimeters.
- *Why 1.5 mSv a day for Mars transit?* It is the worked example in NASA's brief, not a standard,
  and is labelled as a scenario value.

## Checklist before pressing submit

- [ ] Demo link opens in a private browser window
- [ ] Slides link opens in a private browser window
- [ ] Team name and members filled in
- [ ] No NASA logos or branding in the slides or the app
- [ ] AI use disclosed in the project description
- [ ] Every field is in English
- [ ] "Submit for Judging" pressed before 23:59 and the confirmation banner seen

## Deployment (for the repository owner)

The site needs no build. Merge `feat/health-monitor` into `main`, then in the GitHub repository
choose Settings → Pages → Deploy from a branch → `main`, folder `/ (root)`. The address will be
`https://abdullah-khan-sherwani.github.io/astronaut-health-monitor/`. Open it once in a private
window to confirm before putting it in the form.
