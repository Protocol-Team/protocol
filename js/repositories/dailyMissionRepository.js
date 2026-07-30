const STORAGE_KEY = "traceProtocolDailyMissions";
const SCHEMA_VERSION = 9;
const ALL_DAILY_REWARD = 5;
const MISSIONS = [
  { id: "attendance", reward: 2, target: 1 },
  { id: "shopVisit", reward: 2, target: 1 },
  { id: "classicPlay", reward: 3, target: 1 },
  { id: "hackerAiClear", reward: 4, target: 6 },
  { id: "dailyFourClear", reward: 4, target: 4 },
  { id: "darkWebCore", reward: 5, target: 1 },
];
const DAILY_FOUR_CLEAR_IDS = ["attendance", "shopVisit", "classicPlay", "hackerAiClear", "darkWebCore"];

function dateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function emptyState(today, totalUsb = 0, history = {}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    dateKey: today,
    totalUsb: Math.max(0, Number(totalUsb) || 0),
    todayUsb: 0,
    history: { ...history },
    progress: Object.fromEntries(MISSIONS.map(({ id }) => [id, 0])),
    claimed: {},
  };
}

function readState() {
  try {
    return JSON.parse(window.localStorage?.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function writeState(state) {
  try {
    window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
  }
}

function calculateClaimedReward(claimed = {}) {
  const missionReward = MISSIONS.reduce(
    (total, mission) => total + (claimed[mission.id] ? mission.reward : 0),
    0
  );
  return missionReward + (claimed.allDaily ? ALL_DAILY_REWARD : 0);
}

export function getDailyMissionState(now = new Date()) {
  let stored = readState();
  const today = dateKey(now);
  if (stored?.dateKey === today && stored.schemaVersion !== SCHEMA_VERSION) {
    const previousTodayUsb = Math.max(0, Number(stored.todayUsb) || 0);
    const migrated = emptyState(today, stored.totalUsb, stored.history);
    for (const { id } of MISSIONS) {
      if ((Number(stored.schemaVersion) || 0) < 8 && (id === "shopVisit" || id === "dailyFourClear")) continue;
      migrated.progress[id] = Math.max(0, Number(stored.progress?.[id]) || 0);
      if (stored.claimed?.[id]) migrated.claimed[id] = true;
    }
    migrated.progress.dailyHackerClears = Math.max(0, Number(stored.progress?.dailyHackerClears) || 0);
    migrated.progress.dailyAiClears = Math.max(0, Number(stored.progress?.dailyAiClears) || 0);
    const completedCount = DAILY_FOUR_CLEAR_IDS.filter((id) => migrated.claimed[id]).length;
    migrated.progress.dailyFourClear = Math.min(4, completedCount);
    if (completedCount >= 4) migrated.claimed.dailyFourClear = true;
    if (MISSIONS.every(({ id }) => migrated.claimed[id])) migrated.claimed.allDaily = true;
    migrated.todayUsb = calculateClaimedReward(migrated.claimed);
    migrated.totalUsb = Math.max(
      0,
      (Number(stored.totalUsb) || 0) + migrated.todayUsb - previousTodayUsb
    );
    migrated.history = { ...stored.history, [today]: migrated.todayUsb };
    stored = migrated;
    writeState(stored);
  }
  if (!stored || stored.dateKey !== today) {
    const history = { ...stored?.history };
    if (stored?.dateKey) history[stored.dateKey] = Number(stored.todayUsb) || 0;
    const reset = emptyState(today, stored?.totalUsb, history);
    writeState(reset);
    return reset;
  }
  const defaults = emptyState(today, stored.totalUsb);
  return {
    ...defaults,
    ...stored,
    progress: { ...defaults.progress, ...stored.progress },
    claimed: { ...stored.claimed },
  };
}

export function recordDailyMissionEvent(type, amount = 1, now = new Date()) {
  const state = getDailyMissionState(now);
  const mission = MISSIONS.find(({ id }) => id === type);
  if (!mission) return state;
  if (state.claimed[type]) return state;
  state.progress[type] = Math.min(mission.target, (Number(state.progress[type]) || 0) + Math.max(0, Number(amount) || 0));
  if (state.progress[type] >= mission.target && !state.claimed[type]) {
    state.claimed[type] = true;
    state.todayUsb += mission.reward;
    state.totalUsb += mission.reward;
  }
  const completedCount = DAILY_FOUR_CLEAR_IDS.filter((id) => state.claimed[id]).length;
  state.progress.dailyFourClear = Math.min(4, completedCount);
  if (completedCount >= 4 && !state.claimed.dailyFourClear) {
    const dailyFourMission = MISSIONS.find(({ id }) => id === "dailyFourClear");
    state.claimed.dailyFourClear = true;
    state.todayUsb += dailyFourMission.reward;
    state.totalUsb += dailyFourMission.reward;
  }
  if (MISSIONS.every(({ id }) => state.claimed[id]) && !state.claimed.allDaily) {
    state.claimed.allDaily = true;
    state.todayUsb += ALL_DAILY_REWARD;
    state.totalUsb += ALL_DAILY_REWARD;
  }
  state.history = { ...state.history, [state.dateKey]: state.todayUsb };
  writeState(state);
  window.dispatchEvent(new CustomEvent("protocol:daily-mission-update", { detail: state }));
  return state;
}

export function getDailyUsbHistory(now = new Date()) {
  const state = getDailyMissionState(now);
  const historyKeys = Object.keys(state.history || {}).sort();
  const earliestRecordedDate = historyKeys[0] || dateKey(now);
  const result = [];
  for (let offset = 7; offset >= 0; offset -= 1) {
    const day = new Date(now);
    day.setHours(12, 0, 0, 0);
    day.setDate(day.getDate() - offset);
    const key = dateKey(day);
    if (key < earliestRecordedDate) continue;
    result.push({
      dateKey: key,
      usb: Math.max(0, Number(state.history?.[key]) || 0),
      isToday: offset === 0,
    });
  }
  return result;
}

export function recordStageClearForDailyMissions({ mode, stage }) {
  if (mode === "darkweb") return getDailyMissionState();
  const stageNumber = Number(stage) || 0;
  const state = getDailyMissionState();
  const role = stageNumber % 2 === 1 ? "Hacker" : "Ai";
  const clearKey = `daily${role}Clears`;
  state.progress[clearKey] = (Number(state.progress[clearKey]) || 0) + 1;
  writeState(state);

  if ((state.progress.dailyHackerClears || 0) >= 3 && (state.progress.dailyAiClears || 0) >= 3) {
    return recordDailyMissionEvent("hackerAiClear", 6);
  }
  window.dispatchEvent(new CustomEvent("protocol:daily-mission-update", { detail: state }));
  return state;
}

export function getMillisecondsUntilMidnight(now = new Date()) {
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(0, midnight.getTime() - now.getTime());
}
