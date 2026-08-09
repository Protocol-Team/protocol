import { addDailyMissionUsb } from "./dailyMissionRepository.js";
import { SHOP_ITEMS, grantShopItem } from "./shopRepository.js";
import { grantAiSkin, grantHackerSkin, grantLobbySkin } from "./localGameRepository.js?v=20260809-summer-ownership-fix";
import { SUMMER_SEASON_ID } from "../skinRegistry.js?v=20260806-summer-season";

const STORAGE_KEY = "traceProtocolSeasonPass";
const SCHEMA_VERSION = 1;
export const SEASON_PASS_MAX_LEVEL = 30;
export const SEASON_PASS_XP_PER_LEVEL = 10;
export const DAILY_MISSION_SEASON_PASS_XP = 5;

const ITEM_REWARDS = {
  attackTime: { itemId: "attackTime", name: "공격 시간 +5초", icon: "./assets/images/items/attack-watch.svg" },
  shieldModule: { itemId: "shieldModule", name: "실드 모듈", icon: "./assets/images/items/shield-module.svg" },
  energyMax: { itemId: "energyMax", name: "에너지 최대치 +20", icon: "./assets/images/items/energy-battery.svg" },
  revive: { itemId: "revive", name: "부활", icon: "./assets/images/items/revive-cross.svg" },
};

function createReward(level, track) {
  if (track === "premium" && level === 10) {
    return {
      type: "characterSkin",
      rewardId: "summerOverride",
      name: "Summer Override",
      icon: "./assets/images/Summer/concepart.png",
      seasonId: SUMMER_SEASON_ID,
    };
  }
  if (track === "premium" && level === 15) {
    return {
      type: "lobbySkin",
      rewardId: "summerSeasonLobby",
      name: "Summer Season Lobby",
      icon: "./assets/images/Summer/Summer_season_Lobby.png",
      seasonId: SUMMER_SEASON_ID,
    };
  }
  if (track === "premium" && level === 20) {
    return {
      type: "aiSkin",
      rewardId: "glitch",
      name: "픽셀 속 해안가",
      icon: "./assets/images/AI_skin_glitch/preview.png",
      seasonId: SUMMER_SEASON_ID,
    };
  }
  const itemLevelMap = track === "premium"
    ? { 5: "attackTime", 25: "shieldModule", 30: "energyMax" }
    : { 10: "attackTime", 20: "shieldModule", 30: "revive" };
  const itemId = itemLevelMap[level];
  if (itemId) return { type: "item", ...ITEM_REWARDS[itemId] };
  return {
    type: "usb",
    amount: track === "premium" ? 2 : 1,
    name: "USB",
    icon: "usb",
  };
}

export const SEASON_PASS_REWARDS = Array.from({ length: SEASON_PASS_MAX_LEVEL }, (_, index) => {
  const level = index + 1;
  return { level, free: createReward(level, "free"), premium: createReward(level, "premium") };
});

function defaultState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    level: 1,
    xp: 0,
    premiumUnlocked: false,
    claimed: {},
  };
}

function readState() {
  try { return JSON.parse(window.localStorage?.getItem(STORAGE_KEY) || "null"); } catch { return null; }
}

function writeState(state) {
  try { window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

function normalizeState(stored) {
  const defaults = defaultState();
  const level = Math.max(1, Math.min(SEASON_PASS_MAX_LEVEL, Number(stored?.level) || defaults.level));
  return {
    ...defaults,
    ...stored,
    schemaVersion: SCHEMA_VERSION,
    level,
    xp: level >= SEASON_PASS_MAX_LEVEL
      ? 0
      : Math.max(0, Math.min(SEASON_PASS_XP_PER_LEVEL - 1, Number(stored?.xp) || 0)),
    premiumUnlocked: Boolean(stored?.premiumUnlocked),
    claimed: { ...(stored?.claimed || {}) },
  };
}

export function getSeasonPassState() {
  const state = normalizeState(readState());
  reconcileSeasonalOwnership(state);
  if (!readState()) writeState(state);
  return state;
}

function reconcileSeasonalOwnership(state) {
  if (state.claimed?.["premium-10"]) grantHackerSkin("summerOverride");
  if (state.claimed?.["premium-15"]) grantLobbySkin("summerSeasonLobby");
  if (state.claimed?.["premium-20"]) grantAiSkin("glitch");
}

function dispatch(state, eventName = "protocol:season-pass-update") {
  window.dispatchEvent(new CustomEvent(eventName, { detail: state }));
}

export function addSeasonPassXp(amount = DAILY_MISSION_SEASON_PASS_XP) {
  const state = getSeasonPassState();
  if (state.level >= SEASON_PASS_MAX_LEVEL) return state;
  let remaining = Math.max(0, Number(amount) || 0);
  while (remaining > 0 && state.level < SEASON_PASS_MAX_LEVEL) {
    const needed = SEASON_PASS_XP_PER_LEVEL - state.xp;
    if (remaining < needed) {
      state.xp += remaining;
      remaining = 0;
    } else {
      remaining -= needed;
      state.xp = 0;
      state.level += 1;
    }
  }
  writeState(state);
  dispatch(state);
  return state;
}

export function unlockSeasonPassPremium() {
  const state = getSeasonPassState();
  state.premiumUnlocked = true;
  writeState(state);
  dispatch(state);
  return state;
}

export function claimSeasonPassReward(level, track = "free") {
  const rewardLevel = Math.max(1, Number(level) || 0);
  const rewardTrack = track === "premium" ? "premium" : "free";
  const state = getSeasonPassState();
  const reward = SEASON_PASS_REWARDS[rewardLevel - 1]?.[rewardTrack];
  const claimKey = `${rewardTrack}-${rewardLevel}`;
  if (!reward || rewardLevel > state.level || state.claimed[claimKey]) {
    return { ok: false, reason: rewardLevel > state.level ? "locked" : "claimed", state, reward };
  }
  if (rewardTrack === "premium" && !state.premiumUnlocked) {
    return { ok: false, reason: "premium", state, reward };
  }
  if (reward.type === "usb") addDailyMissionUsb(reward.amount);
  if (reward.type === "item") grantShopItem(reward.itemId);
  if (reward.type === "characterSkin") grantHackerSkin(reward.rewardId);
  if (reward.type === "lobbySkin") grantLobbySkin(reward.rewardId);
  if (reward.type === "aiSkin") grantAiSkin(reward.rewardId);
  state.claimed[claimKey] = true;
  writeState(state);
  dispatch(state);
  return { ok: true, state, reward };
}

export function claimAllSeasonPassRewards() {
  const state = getSeasonPassState();
  const claimed = [];
  for (let level = 1; level <= state.level; level += 1) {
    for (const track of ["free", "premium"]) {
      const result = claimSeasonPassReward(level, track);
      if (result.ok) claimed.push({ level, track, reward: result.reward });
    }
  }
  return { state: getSeasonPassState(), claimed };
}

let listenerReady = false;
export function initSeasonPass() {
  if (listenerReady) return;
  listenerReady = true;
  window.addEventListener("protocol:daily-mission-completed", (event) => {
    addSeasonPassXp(event.detail?.xp || DAILY_MISSION_SEASON_PASS_XP);
  });
  getSeasonPassState();
}

export function getSeasonPassItem(itemId) {
  return ITEM_REWARDS[itemId] || SHOP_ITEMS.find((item) => item.id === itemId);
}
