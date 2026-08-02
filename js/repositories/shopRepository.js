const STORAGE_KEY = "traceProtocolShop";
const SHOP_EVENT = "protocol:shop-update";
export const USB_UNIT_KRW = 200;

export const SHOP_ITEMS = [
  { id: "energyMax", icon: "./assets/images/items/energy-battery.svg", name: "에너지 최대치 +20", desc: "최대 에너지를 20 늘리고 즉시 충전합니다.", price: 6 },
  { id: "attackTime", icon: "./assets/images/items/attack-watch.svg", name: "공격 시간 +5초", desc: "현재 공격 턴의 제한 시간이 5초 늘어납니다.", price: 8 },
  { id: "shieldModule", icon: "./assets/images/items/shield-module.svg", name: "실드 모듈", desc: "해킹 중 무적 시간이 0.5초 늘어납니다.", price: 10 },
  { id: "revive", icon: "./assets/images/items/revive-cross.svg", name: "부활", desc: "DARK WEB 추가 목숨을 모두 소진한 뒤 1회 부활합니다.", price: 12 },
];

const DEFAULT_INVENTORY = { attackTime: 1, energyMax: 1, shieldModule: 1, revive: 1, replay: 1 };

function readState() {
  try { return JSON.parse(window.localStorage?.getItem(STORAGE_KEY) || "null"); } catch { return null; }
}

function writeState(state) {
  try { window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

function localDateKey(now = new Date()) {
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function dateSeed(value) {
  return [...value].reduce((seed, char) => ((seed * 31) + char.charCodeAt(0)) >>> 0, 7);
}

function createDailyOffers(dateKey) {
  const seed = dateSeed(dateKey);
  const freeIndex = seed % SHOP_ITEMS.length;
  const discountIndex = (Math.floor(seed / SHOP_ITEMS.length) + freeIndex + 1) % SHOP_ITEMS.length;
  return {
    dateKey,
    freeItemId: SHOP_ITEMS[freeIndex].id,
    discountItemId: SHOP_ITEMS[discountIndex].id,
    discountPercent: seed % 2 === 0 ? 20 : 40,
    freeClaimed: false,
    discountClaimed: false,
  };
}

function dispatch(state) {
  window.dispatchEvent(new CustomEvent(SHOP_EVENT, { detail: state }));
}

export function getShopState() {
  const stored = readState() || {};
  const today = localDateKey();
  const dailyOffers = stored.dailyOffers?.dateKey === today
    ? {
        ...createDailyOffers(today),
        ...stored.dailyOffers,
        freeClaimed: Boolean(stored.dailyOffers.freeClaimed),
        discountClaimed: Boolean(stored.dailyOffers.discountClaimed),
      }
    : createDailyOffers(today);
  const state = {
    inventory: { ...DEFAULT_INVENTORY, ...(stored.inventory || {}) },
    claimedOffers: { ...(stored.claimedOffers || {}) },
    purchasedPacks: Math.max(0, Number(stored.purchasedPacks) || 0),
    dailyOffers,
  };
  if (stored.dailyOffers?.dateKey !== today) writeState(state);
  return state;
}

export function getDailyShopOffers() {
  const state = getShopState();
  return { ...state.dailyOffers };
}

export function getShopInventory() {
  return { ...getShopState().inventory };
}

export function purchaseShopItem(itemId, spendUsb) {
  return purchaseShopOffer("standard", itemId, spendUsb);
}

export function purchaseShopOffer(offerType, itemId, spendUsb) {
  const item = SHOP_ITEMS.find(({ id }) => id === itemId);
  if (!item) return { ok: false, reason: "unknown" };
  const state = getShopState();
  const dailyOffer = state.dailyOffers;
  let price = item.price;
  if (offerType === "free") {
    if (dailyOffer.freeItemId !== item.id || dailyOffer.freeClaimed) return { ok: false, reason: "claimed" };
    price = 0;
  } else if (offerType === "discount") {
    if (dailyOffer.discountItemId !== item.id || dailyOffer.discountClaimed) return { ok: false, reason: "claimed" };
    price = Math.max(1, Math.round(item.price * (100 - dailyOffer.discountPercent) / 100));
  }
  if (price > 0 && !spendUsb(price)) return { ok: false, reason: "balance" };
  state.inventory[item.id] = Math.max(0, Number(state.inventory[item.id]) || 0) + 1;
  if (offerType === "free") state.dailyOffers.freeClaimed = true;
  if (offerType === "discount") state.dailyOffers.discountClaimed = true;
  writeState(state);
  dispatch(state);
  return { ok: true, state, item, price, offerType };
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

export function grantShopItem(itemId, amount = 1) {
  const state = getShopState();
  const added = Math.max(0, Number(amount) || 0);
  state.inventory[itemId] = Math.max(0, Number(state.inventory[itemId]) || 0) + added;
  writeState(state);
  dispatch(state);
  return state;
}

export function recordUsbPackPurchase() {
  const state = getShopState();
  state.purchasedPacks += 1;
  writeState(state);
  dispatch(state);
}
