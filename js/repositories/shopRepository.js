const STORAGE_KEY = "traceProtocolShop";
const SHOP_EVENT = "protocol:shop-update";

export const SHOP_ITEMS = [
  { id: "energyMax", icon: "⚡", name: "에너지 최대치 +20", desc: "최대 에너지를 20 늘리고 즉시 충전합니다.", price: 0, freeOnce: true },
  { id: "attackTime", icon: "⏱", name: "공격 시간 +5초", desc: "현재 공격 턴의 제한 시간이 5초 늘어납니다.", price: 1 },
  { id: "shieldModule", icon: "◇", name: "실드 모듈", desc: "해킹 중 무적 시간이 0.5초 늘어납니다.", price: 2 },
  { id: "revive", icon: "✚", name: "부활", desc: "DARK WEB 추가 목숨을 모두 소진한 뒤 1회 부활합니다.", price: 3 },
];

const DEFAULT_INVENTORY = { attackTime: 1, energyMax: 1, shieldModule: 1, revive: 1, replay: 1 };

function readState() {
  try { return JSON.parse(window.localStorage?.getItem(STORAGE_KEY) || "null"); } catch { return null; }
}

function writeState(state) {
  try { window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

function dispatch(state) {
  window.dispatchEvent(new CustomEvent(SHOP_EVENT, { detail: state }));
}

export function getShopState() {
  const stored = readState() || {};
  return {
    inventory: { ...DEFAULT_INVENTORY, ...(stored.inventory || {}) },
    claimedOffers: { ...(stored.claimedOffers || {}) },
    purchasedPacks: Math.max(0, Number(stored.purchasedPacks) || 0),
  };
}

export function getShopInventory() {
  return { ...getShopState().inventory };
}

export function purchaseShopItem(itemId, spendUsb) {
  const item = SHOP_ITEMS.find(({ id }) => id === itemId);
  if (!item) return { ok: false, reason: "unknown" };
  const state = getShopState();
  if (item.freeOnce && state.claimedOffers[item.id]) return { ok: false, reason: "claimed" };
  if (item.price > 0 && !spendUsb(item.price)) return { ok: false, reason: "balance" };
  state.inventory[item.id] = Math.max(0, Number(state.inventory[item.id]) || 0) + 1;
  if (item.freeOnce) state.claimedOffers[item.id] = true;
  writeState(state);
  dispatch(state);
  return { ok: true, state };
}

export function consumeShopItem(itemId) {
  const state = getShopState();
  const count = Math.max(0, Number(state.inventory[itemId]) || 0);
  if (count < 1) return false;
  state.inventory[itemId] = count - 1;
  writeState(state);
  dispatch(state);
  return true;
}

export function recordUsbPackPurchase() {
  const state = getShopState();
  state.purchasedPacks += 1;
  writeState(state);
  dispatch(state);
}
