import { isValidHackerSkinId, isValidLobbySkinId } from "../skinRegistry.js?v=20260806-summer-season";

const BEST_STAGE_STORAGE_KEY = "traceProtocolBest";
const PURCHASED_AI_SKINS_STORAGE_KEY = "traceProtocolPurchasedAiSkins";
const SELECTED_AI_SKIN_STORAGE_KEY = "traceProtocolAiPortraitSkin";
const SELECTED_HACKER_SKIN_STORAGE_KEY = "traceProtocolHackerPortraitSkin";
const OWNED_HACKER_SKINS_STORAGE_KEY = "traceProtocolOwnedHackerSkins";
const OWNED_LOBBY_SKINS_STORAGE_KEY = "traceProtocolOwnedLobbySkins";
const SELECTED_LOBBY_SKIN_STORAGE_KEY = "traceProtocolLobbySkin";

const DEFAULT_BEST_STAGE = 0;
const DEFAULT_PURCHASED_SKINS = [];
const DEFAULT_SELECTED_SKIN = "classic";
// Temporary QA unlocks are exposed only by local development servers such as VS Code Go Live.
const LOCAL_DEVELOPMENT_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);
const IS_LOCAL_DEVELOPMENT = LOCAL_DEVELOPMENT_HOSTS.has(globalThis.location?.hostname || "");
const QA_UNLOCKED_HACKER_SKINS = IS_LOCAL_DEVELOPMENT ? ["summerOverride"] : [];
const QA_UNLOCKED_LOBBY_SKINS = IS_LOCAL_DEVELOPMENT ? ["summerSeasonLobby"] : [];

function readStorageValue(key) {
  try {
    return window.localStorage?.getItem(key);
  } catch {
    return null;
  }
}

function writeStorageValue(key, value) {
  try {
    window.localStorage?.setItem(key, value);
  } catch {
  }
}

function removeStorageValue(key) {
  try {
    window.localStorage?.removeItem(key);
  } catch {
  }
}

function normalizeSkinIds(skinIds) {
  if (!Array.isArray(skinIds)) return [...DEFAULT_PURCHASED_SKINS];
  return [...new Set(skinIds.filter((skinId) => typeof skinId === "string" && skinId.length > 0))];
}

export function getBestStage() {
  const bestStage = Number(readStorageValue(BEST_STAGE_STORAGE_KEY) || DEFAULT_BEST_STAGE);
  if (!Number.isFinite(bestStage) || bestStage < 0) return DEFAULT_BEST_STAGE;
  return bestStage;
}

export function saveBestStage(stage) {
  const bestStage = Number(stage);
  writeStorageValue(
    BEST_STAGE_STORAGE_KEY,
    String(Number.isFinite(bestStage) && bestStage >= 0 ? bestStage : DEFAULT_BEST_STAGE)
  );
}

export function resetBestStage() {
  removeStorageValue(BEST_STAGE_STORAGE_KEY);
}

export function getPurchasedSkins() {
  try {
    return normalizeSkinIds(JSON.parse(readStorageValue(PURCHASED_AI_SKINS_STORAGE_KEY) || "[]"));
  } catch {
    return [...DEFAULT_PURCHASED_SKINS];
  }
}

export function savePurchasedSkins(skinIds) {
  writeStorageValue(PURCHASED_AI_SKINS_STORAGE_KEY, JSON.stringify(normalizeSkinIds(skinIds)));
}

export function getSelectedSkin() {
  const selectedSkin = readStorageValue(SELECTED_AI_SKIN_STORAGE_KEY);
  return selectedSkin || DEFAULT_SELECTED_SKIN;
}

export function saveSelectedSkin(skinId) {
  writeStorageValue(
    SELECTED_AI_SKIN_STORAGE_KEY,
    typeof skinId === "string" && skinId.length > 0 ? skinId : DEFAULT_SELECTED_SKIN
  );
}

export function getSelectedHackerSkin() {
  const selectedSkin = readStorageValue(SELECTED_HACKER_SKIN_STORAGE_KEY);
  return isValidHackerSkinId(selectedSkin) && getOwnedHackerSkins().includes(selectedSkin)
    ? selectedSkin
    : DEFAULT_SELECTED_SKIN;
}

export function saveSelectedHackerSkin(skinId) {
  const selectedSkin = isValidHackerSkinId(skinId) && getOwnedHackerSkins().includes(skinId)
    ? skinId
    : DEFAULT_SELECTED_SKIN;
  writeStorageValue(
    SELECTED_HACKER_SKIN_STORAGE_KEY,
    selectedSkin
  );
}

export function getOwnedHackerSkins() {
  try {
    const stored = normalizeSkinIds(JSON.parse(readStorageValue(OWNED_HACKER_SKINS_STORAGE_KEY) || "[]"));
    return [...new Set([
      DEFAULT_SELECTED_SKIN,
      ...QA_UNLOCKED_HACKER_SKINS,
      ...stored.filter(isValidHackerSkinId),
    ])];
  } catch {
    return [DEFAULT_SELECTED_SKIN, ...QA_UNLOCKED_HACKER_SKINS];
  }
}

export function grantHackerSkin(skinId) {
  if (!isValidHackerSkinId(skinId)) return getOwnedHackerSkins();
  const owned = [...new Set([...getOwnedHackerSkins(), skinId])];
  writeStorageValue(OWNED_HACKER_SKINS_STORAGE_KEY, JSON.stringify(owned));
  return owned;
}

export function getOwnedLobbySkins() {
  try {
    const stored = normalizeSkinIds(JSON.parse(readStorageValue(OWNED_LOBBY_SKINS_STORAGE_KEY) || "[]"));
    return [...new Set([
      "default",
      ...QA_UNLOCKED_LOBBY_SKINS,
      ...stored.filter(isValidLobbySkinId),
    ])];
  } catch {
    return ["default", ...QA_UNLOCKED_LOBBY_SKINS];
  }
}

export function grantLobbySkin(skinId) {
  if (!isValidLobbySkinId(skinId)) return getOwnedLobbySkins();
  const owned = [...new Set([...getOwnedLobbySkins(), skinId])];
  writeStorageValue(OWNED_LOBBY_SKINS_STORAGE_KEY, JSON.stringify(owned));
  return owned;
}

export function getSelectedLobbySkin() {
  const selectedSkin = readStorageValue(SELECTED_LOBBY_SKIN_STORAGE_KEY);
  return isValidLobbySkinId(selectedSkin) && getOwnedLobbySkins().includes(selectedSkin)
    ? selectedSkin
    : "default";
}

export function saveSelectedLobbySkin(skinId) {
  const selectedSkin = isValidLobbySkinId(skinId) && getOwnedLobbySkins().includes(skinId)
    ? skinId
    : "default";
  writeStorageValue(SELECTED_LOBBY_SKIN_STORAGE_KEY, selectedSkin);
}
