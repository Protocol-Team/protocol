// js/lobby.js
// Handles only Splash/Lobby screen transitions and lobby button wiring.

import { playLobbyBgm, playSfx, unlockAudio } from "./audio.js?v=20260724-stage-effect-cleanup";
import {
  getPurchasedSkins as loadPurchasedSkins,
  getSelectedSkin as loadSelectedSkin,
  getSelectedHackerSkin,
  savePurchasedSkins,
  saveSelectedSkin,
  saveSelectedHackerSkin,
} from "./repositories/localGameRepository.js";
import {
  getDailyMissionState,
  getDailyUsbHistory,
  getMillisecondsUntilMidnight,
  recordDailyMissionEvent,
  spendDailyMissionUsb,
  addDailyMissionUsb,
} from "./repositories/dailyMissionRepository.js?v=20260803-currency-v1";
import {
  SHOP_ITEMS,
  USB_UNIT_KRW,
  getDailyShopOffers,
  getShopState,
  purchaseShopOffer,
  purchaseShopItem,
  recordUsbPackPurchase,
} from "./repositories/shopRepository.js";
import {
  SEASON_PASS_MAX_LEVEL,
  SEASON_PASS_XP_PER_LEVEL,
  SEASON_PASS_REWARDS,
  claimAllSeasonPassRewards,
  claimSeasonPassReward,
  getSeasonPassState,
  initSeasonPass,
  unlockSeasonPassPremium,
} from "./repositories/seasonPassRepository.js";

const CLASSIC_CLEAR_STORAGE_KEY = "traceProtocolClassicStage11Returned";
const PROFILE_STORAGE_KEY = "traceProtocolProfileSettings";
const DEFAULT_PROFILE_AVATAR_ID = "avatar-03";
// Add future avatars here. Each entry only needs a stable id, display name, and image path.
const PROFILE_AVATARS = [
  { id: "avatar-01", name: "NIGHT RUNNER", src: "./assets/images/profile/avatar-01.png" },
  { id: "avatar-02", name: "CYBER ORACLE", src: "./assets/images/profile/avatar-02.png" },
  { id: "avatar-03", name: "SHADOW AGENT", src: "./assets/images/profile/avatar-03.png" },
];
const SELECTABLE_AI_SKINS = [
  {
    id: "classic",
    name: "AI 시스템",
    desc: "기본 스킨",
    preview: "./assets/images/skin-previews/ai-classic-0.png",
    lobbyPreview: { scale: 1.28, offsetY: -38, focusY: 34, originY: 34 },
    owned: true,
  },
  {
    id: "android",
    name: "과거의 그것",
    desc: "불빛은 박동없는\n심장으로 움직이고.",
    preview: "./assets/images/skin-previews/ai-android-0.png",
    lobbyPreview: { scale: 1.35, offsetY: -17, focusY: 48, originY: 48 },
    owned: false,
  },
];
const SELECTABLE_HACKER_SKINS = [
  {
    id: "classic",
    name: "해커",
    desc: "기본 스킨",
    preview: "./assets/images/hacker_script/idle.png",
    lobbyPreview: { scale: 1.55, offsetX: -8, focusY: 28, originY: 32 },
    owned: true,
  },
];
const MAX_SKIN_SLOTS = 5;

// New skins inherit this centered portrait composition. Use lobbyPreview on a skin only
// when its source artwork needs small eye-line or framing corrections.
const DEFAULT_LOBBY_SKIN_PREVIEW = Object.freeze({
  scale: 1.35,
  offsetX: 0,
  offsetY: -10,
  focusX: 50,
  focusY: 40,
  originX: 50,
  originY: 40,
});

function getLobbySkinPreviewStyle(skin) {
  const preview = { ...DEFAULT_LOBBY_SKIN_PREVIEW, ...(skin?.lobbyPreview || {}) };
  return [
    `--skin-preview-scale:${preview.scale}`,
    `--skin-preview-x:${preview.offsetX}px`,
    `--skin-preview-y:${preview.offsetY}px`,
    `--skin-preview-focus-x:${preview.focusX}%`,
    `--skin-preview-focus-y:${preview.focusY}%`,
    `--skin-preview-origin-x:${preview.originX}%`,
    `--skin-preview-origin-y:${preview.originY}%`,
  ].join(";");
}

export function initLobby({
  onStart,
  onHelp,
} = {}) {
  const root = document.getElementById("lobbyRoot");
  const splashScreen = document.getElementById("splashScreen");
  const splashEnterBtn = document.getElementById("splashEnterBtn");
  const lobbyScreen = document.getElementById("lobbyScreen");
  const startBtn = document.getElementById("lobbyStartBtn");
  const skinBtn = document.getElementById("lobbySkinBtn");
  const helpBtn = document.getElementById("lobbyHelpBtn");
  const pathNoteBtn = document.getElementById("lobbyPathNoteBtn");
  const missionBtn = document.getElementById("lobbyMissionBtn");
  const shopBtn = document.getElementById("lobbyShopBtn");
  const seasonPassBtn = document.getElementById("lobbySeasonPassBtn");
  const dailyMissionScreen = document.getElementById("dailyMissionScreen");
  const shopScreen = document.getElementById("shopScreen");
  const seasonPassScreen = document.getElementById("seasonPassScreen");
  const skinPanel = createSkinPanel();
  const skinPurchaseModal = createSkinPurchaseModal();
  const pathNoteModal = createPathNoteModal();
  const modePanel = createModePanel();
  const stageSelectPanel = createStageSelectPanel();
  const skinSelectScreen = createSkinSelectScreen();
  const dailyMissionCountdown = document.getElementById("dailyMissionCountdown");
  const dailyMissionAllClear = document.getElementById("dailyMissionAllClear");
  const dailyUsbCount = document.getElementById("dailyUsbCount");
  const totalUsbCount = document.getElementById("totalUsbCount");
  const shopUsbCount = document.getElementById("shopUsbCount");
  const shopItemGrid = document.getElementById("shopItemGrid");
  const shopStatus = document.getElementById("shopStatus");
  const dailyUsbHistoryList = document.getElementById("dailyUsbHistoryList");
  const seasonPassTrack = document.getElementById("seasonPassTrack");
  const seasonPassScroller = document.getElementById("seasonPassScroller");
  const seasonPassLevel = document.getElementById("seasonPassLevel");
  const seasonPassLobbyLevel = document.getElementById("seasonPassLobbyLevel");
  const seasonPassXpLabel = document.getElementById("seasonPassXpLabel");
  const seasonPassXpBar = document.getElementById("seasonPassXpBar");
  const seasonPassPremiumBtn = document.getElementById("seasonPassPremiumBtn");
  const seasonPassClaimAllBtn = document.getElementById("seasonPassClaimAllBtn");
  const seasonPassStatus = document.getElementById("seasonPassStatus");
  const profileBtn = document.getElementById("profileBtn");
  const profilePanel = document.getElementById("profilePanel");
  const profileAvatar = document.getElementById("profileAvatar");
  const profileAvatarFallback = profileBtn?.querySelector(".profile-avatar-fallback");
  const profileName = document.getElementById("profileName");
  const authPanel = createAuthPanel();
  const authUser = authPanel.querySelector(".lobby-auth-user");
  const authEmail = authPanel.querySelector(".lobby-auth-email");
  const authMessage = authPanel.querySelector(".lobby-auth-message");
  const authLoginBtn = authPanel.querySelector(".lobby-auth-login");
  const authLogoutBtn = authPanel.querySelector(".lobby-auth-logout");
  const profilePreview = authPanel.querySelector(".profile-editor-avatar");
  const profileNicknameInput = authPanel.querySelector("#profileNickname");
  const profileNicknameStatus = authPanel.querySelector(".profile-nickname-status");
  const profileAvatarPicker = authPanel.querySelector(".profile-avatar-picker");

  let active = true;
  let helpOverlayOpen = false;
  let skinPanelOpen = false;
  let activeSkinCategory = "";
  let modePanelOpen = false;
  let profilePanelOpen = false;
  let stageSelectOpen = false;
  let returnToDailyMissionFromStageSelect = false;
  let returnToDailyMissionFromShop = false;
  let pendingPurchaseSkinId = "";
  let enteringLobby = false;
  let lastMissionDateKey = "";
  let authService = null;
  let authSession = null;
  let authLoading = true;
  let authError = "";

  initSeasonPass();

  document.body.classList.add("lobby-active");
  startBtn?.after(modePanel);
  profilePanel?.appendChild(authPanel);
  root?.appendChild(stageSelectPanel);
  root?.appendChild(skinSelectScreen);
  skinBtn?.after(skinPanel);
  root?.appendChild(skinPurchaseModal);
  root?.appendChild(pathNoteModal);

  const refreshDailyMission = (state = getDailyMissionState()) => {
    if (dailyUsbCount) dailyUsbCount.textContent = String(state.todayUsb || 0);
    if (totalUsbCount) totalUsbCount.textContent = String(state.totalUsb || 0);
    if (shopUsbCount) shopUsbCount.textContent = String(state.walletUsb || 0);
    const hackerAiProgress = dailyMissionScreen?.querySelector(
      '[data-mission-id="hackerAiClear"] .daily-mission-progress'
    );
    if (hackerAiProgress) {
      const hackerRemaining = Math.max(0, 3 - (Number(state.progress?.dailyHackerClears) || 0));
      const aiRemaining = Math.max(0, 3 - (Number(state.progress?.dailyAiClears) || 0));
      const hackerRemainingText = hackerAiProgress.querySelector('[data-role="hacker-remaining"]');
      const aiRemainingText = hackerAiProgress.querySelector('[data-role="ai-remaining"]');
      if (hackerRemainingText) hackerRemainingText.textContent = `${hackerRemaining}판`;
      if (aiRemainingText) aiRemainingText.textContent = `${aiRemaining}판`;
    }
    if (dailyUsbHistoryList) {
      const history = getDailyUsbHistory();
      dailyUsbHistoryList.innerHTML = history.length
        ? history.map(({ dateKey, usb, isToday }) => `
            <li><span>${formatUsbHistoryDate(dateKey, isToday)}</span><strong>${usb}개</strong></li>
          `).join("")
        : "<li><span>기록 없음</span><strong>0개</strong></li>";
    }
    dailyMissionScreen?.querySelectorAll("[data-mission-id]").forEach((card) => {
      const complete = Boolean(state.claimed?.[card.dataset.missionId]);
      card.classList.toggle("is-complete", complete);
      card.setAttribute("aria-disabled", complete ? "true" : "false");
      if (card.matches(".daily-mission-stage-link, .daily-mission-shop-link, .daily-mission-darkweb-link")) {
        card.tabIndex = complete ? -1 : 0;
      }
      card.querySelector(".daily-mission-claim")?.toggleAttribute("disabled", complete);
    });
    dailyMissionAllClear?.classList.toggle("hidden", !state.claimed?.allDaily);
    lastMissionDateKey = state.dateKey;
  };

  const formatUsbHistoryDate = (value, isToday = false) => {
    const [year, month, day] = String(value).split("-").map(Number);
    const weekday = ["일", "월", "화", "수", "목", "금", "토"][
      new Date(year, month - 1, day, 12).getDay()
    ];
    return `${isToday ? "오늘" : `${month}월 ${day}일`} (${weekday})`;
  };

  const updateDailyMissionCountdown = () => {
    const now = new Date();
    const remaining = Math.max(0, Math.floor(getMillisecondsUntilMidnight(now) / 1000));
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;
    if (dailyMissionCountdown) {
      dailyMissionCountdown.textContent =
        `${String(hours).padStart(2, "0")}시간 ${String(minutes).padStart(2, "0")}분 ${String(seconds).padStart(2, "0")}초`;
    }
    const state = getDailyMissionState(now);
    if (state.dateKey !== lastMissionDateKey) {
      refreshDailyMission(state);
    }
  };

  refreshDailyMission();
  updateDailyMissionCountdown();
  window.setInterval(updateDailyMissionCountdown, 1000);
  window.addEventListener("protocol:daily-mission-update", (event) => refreshDailyMission(event.detail));

  const renderSeasonPassReward = (reward) => {
    if (reward.type === "item") {
      return `<img src="${reward.icon}" alt=""><span>${reward.name}</span>`;
    }
    return `<span class="season-pass-usb-icon" aria-hidden="true"><img src="./assets/images/ui/usb-drive.png" alt=""></span><strong>×${reward.amount}</strong>`;
  };

  const renderSeasonPass = (state = getSeasonPassState()) => {
    const level = Math.max(1, Number(state.level) || 1);
    const xp = level >= SEASON_PASS_MAX_LEVEL ? SEASON_PASS_XP_PER_LEVEL : Math.max(0, Number(state.xp) || 0);
    const progress = level >= SEASON_PASS_MAX_LEVEL ? 100 : (xp / SEASON_PASS_XP_PER_LEVEL) * 100;
    if (seasonPassLevel) seasonPassLevel.textContent = `LV. ${level}`;
    if (seasonPassLobbyLevel) seasonPassLobbyLevel.textContent = `LV. ${level}`;
    if (seasonPassXpLabel) seasonPassXpLabel.textContent = level >= SEASON_PASS_MAX_LEVEL ? "MAX LEVEL" : `${xp} / ${SEASON_PASS_XP_PER_LEVEL} XP`;
    if (seasonPassXpBar) seasonPassXpBar.style.width = `${progress}%`;
    if (seasonPassPremiumBtn) {
      seasonPassPremiumBtn.textContent = state.premiumUnlocked ? "PREMIUM PASS · 활성화" : "프리미엄 패스 구매 · KRW 9,900";
      seasonPassPremiumBtn.classList.toggle("is-owned", state.premiumUnlocked);
    }
    if (!seasonPassTrack) return;
    seasonPassTrack.innerHTML = SEASON_PASS_REWARDS.map(({ level: rewardLevel, free, premium }) => {
      const freeClaimed = Boolean(state.claimed?.[`free-${rewardLevel}`]);
      const premiumClaimed = Boolean(state.claimed?.[`premium-${rewardLevel}`]);
      const freeLocked = rewardLevel > level;
      const premiumLocked = freeLocked || !state.premiumUnlocked;
      return `
        <article class="season-pass-column${rewardLevel === level ? " is-current" : ""}">
          <div class="season-pass-level">LEVEL <strong>${rewardLevel}</strong></div>
          <button class="season-pass-reward free${freeClaimed ? " is-claimed" : ""}${freeLocked ? " is-locked" : ""}" type="button" data-season-pass-claim="free" data-season-pass-level="${rewardLevel}" ${freeClaimed || freeLocked ? "disabled" : ""}>
            <span class="season-pass-reward-art">${renderSeasonPassReward(free)}</span><small>${freeClaimed ? "수령 완료" : freeLocked ? "잠김" : "수령"}</small>
          </button>
          <button class="season-pass-reward premium${premiumClaimed ? " is-claimed" : ""}${premiumLocked ? " is-locked" : ""}" type="button" data-season-pass-claim="premium" data-season-pass-level="${rewardLevel}" ${premiumClaimed || premiumLocked ? "disabled" : ""}>
            <span class="season-pass-reward-art">${renderSeasonPassReward(premium)}</span><small>${premiumClaimed ? "수령 완료" : !state.premiumUnlocked ? "프리미엄 필요" : freeLocked ? "잠김" : "수령"}</small>
          </button>
        </article>`;
    }).join("");
  };

  renderSeasonPass();
  window.addEventListener("protocol:season-pass-update", (event) => renderSeasonPass(event.detail));

  seasonPassScroller?.addEventListener("wheel", (event) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    seasonPassScroller.scrollLeft += event.deltaY;
  }, { passive: false });

  seasonPassScreen?.addEventListener("click", (event) => {
    const rewardButton = event.target?.closest?.("[data-season-pass-claim]");
    if (rewardButton) {
      const result = claimSeasonPassReward(rewardButton.dataset.seasonPassLevel, rewardButton.dataset.seasonPassClaim);
      if (seasonPassStatus) seasonPassStatus.textContent = result.ok
        ? `${result.reward.name}${result.reward.type === "usb" ? ` ${result.reward.amount}개` : ""} 보상을 획득했습니다.`
        : result.reason === "premium" ? "프리미엄 패스를 구매하면 보상을 받을 수 있습니다." : "아직 받을 수 없는 보상입니다.";
      if (result.ok) playSfx("click");
      return;
    }
    if (event.target?.closest?.("#seasonPassPremiumBtn")) {
      const state = unlockSeasonPassPremium();
      if (seasonPassStatus) seasonPassStatus.textContent = "프리미엄 패스가 활성화되었습니다. 이제 아래 트랙의 보상을 수령할 수 있습니다.";
      if (state) playSfx("click");
      return;
    }
    if (event.target?.closest?.("#seasonPassClaimAllBtn")) {
      const result = claimAllSeasonPassRewards();
      if (seasonPassStatus) seasonPassStatus.textContent = result.claimed.length
        ? `${result.claimed.length}개의 시즌패스 보상을 한 번에 수령했습니다.`
        : "지금 수령할 수 있는 보상이 없습니다.";
      if (result.claimed.length) playSfx("click");
    }
  });

  const setShopStatus = (message = "") => {
    if (shopStatus) shopStatus.textContent = message;
  };

  const renderShopItems = () => {
    if (!shopItemGrid) return;
    const state = getShopState();
    const dailyOffers = getDailyShopOffers();
    const itemById = new Map(SHOP_ITEMS.map((item) => [item.id, item]));
    const offers = [
      { type: "free", item: itemById.get(dailyOffers.freeItemId), tag: "DAILY FREE" },
      { type: "discount", item: itemById.get(dailyOffers.discountItemId), tag: `TODAY -${dailyOffers.discountPercent}%` },
      ...SHOP_ITEMS.map((item) => ({ type: "standard", item, tag: "FULL PRICE" })),
    ].filter(({ item }) => item);
    shopItemGrid.innerHTML = offers.map(({ type, item, tag }) => {
      const isFree = type === "free";
      const isDiscount = type === "discount";
      const claimed = isFree ? dailyOffers.freeClaimed : isDiscount ? dailyOffers.discountClaimed : false;
      const discountedPrice = isDiscount
        ? Math.max(1, Math.round(item.price * (100 - dailyOffers.discountPercent) / 100))
        : item.price;
      const price = isFree
        ? "무료 획득"
        : isDiscount
          ? `<span class="shop-price-usb shop-price-discount" title="정가 ${item.price} USB · ${dailyOffers.discountPercent}% 할인"><span class="usb-token" aria-hidden="true"><img src="./assets/images/ui/usb-drive.png" alt=""></span><s>${item.price}</s><strong>${discountedPrice}</strong></span>`
          : `<span class="shop-price-usb" title="약 ${item.price * USB_UNIT_KRW}원 가치"><span class="usb-token" aria-hidden="true"><img src="./assets/images/ui/usb-drive.png" alt=""></span>${item.price}</span>`;
      const offerAttributes = isFree || isDiscount
        ? `data-shop-offer="${type}" data-offer-item="${item.id}"`
        : `data-buy-item="${item.id}"`;
      const description = isFree
        ? "매일 1회, 오늘의 랜덤 아이템을 무료로 획득합니다."
        : isDiscount
          ? `오늘의 랜덤 아이템을 ${dailyOffers.discountPercent}% 할인된 가격에 구매합니다.`
          : item.desc;
      return `
        <article class="shop-product shop-product-${type}">
          <span class="shop-product-tag">${tag}</span>
          <h4>${item.name}</h4>
          <div class="shop-item-icon" aria-hidden="true"><img src="${item.icon}" alt=""></div>
          <p class="shop-item-desc">${description}</p>
          <span class="shop-item-owned">보유 : ${Math.max(0, Number(state.inventory[item.id]) || 0)}개</span>
          <button type="button" ${offerAttributes} ${claimed ? "disabled" : ""}>${claimed ? "오늘 획득 완료" : price}</button>
        </article>`;
    }).join("");
  };

  renderShopItems();
  window.addEventListener("protocol:shop-update", renderShopItems);

  shopScreen?.addEventListener("wheel", (event) => {
    const grid = event.target?.closest?.("#shopItemGrid");
    if (!grid || Math.abs(event.deltaY) <= Math.abs(event.deltaX) || grid.scrollWidth <= grid.clientWidth) return;
    event.preventDefault();
    grid.scrollLeft += event.deltaY;
  }, { passive: false, capture: true });

  shopScreen?.addEventListener("click", (event) => {
    const tab = event.target?.closest?.("[data-shop-tab]");
    if (tab) {
      const selected = tab.dataset.shopTab;
      shopScreen.querySelectorAll("[data-shop-tab]").forEach((button) => {
        const activeTab = button.dataset.shopTab === selected;
        button.classList.toggle("is-active", activeTab);
        button.setAttribute("aria-selected", String(activeTab));
      });
      shopScreen.querySelectorAll("[data-shop-panel]").forEach((panel) => {
        panel.classList.toggle("hidden", panel.dataset.shopPanel !== selected);
      });
      setShopStatus();
      playSfx("click");
      return;
    }

    const offerButton = event.target?.closest?.("[data-shop-offer]");
    if (offerButton) {
      const offerType = offerButton.dataset.shopOffer;
      const result = purchaseShopOffer(offerType, offerButton.dataset.offerItem, spendDailyMissionUsb);
      setShopStatus(result.ok
        ? offerType === "free" ? "오늘의 무료 아이템을 획득했습니다." : "오늘의 할인 아이템을 구매했습니다."
        : result.reason === "balance" ? "USB가 부족합니다." : "오늘의 상품은 이미 획득했습니다.");
      refreshDailyMission();
      if (result.ok) playSfx("click");
      return;
    }

    const itemButton = event.target?.closest?.("[data-buy-item]");
    if (itemButton) {
      const result = purchaseShopItem(itemButton.dataset.buyItem, spendDailyMissionUsb);
      setShopStatus(result.ok ? "아이템이 보관함에 추가되었습니다." : result.reason === "balance" ? "USB가 부족합니다." : "이미 획득한 상품입니다.");
      refreshDailyMission();
      if (result.ok) playSfx("click");
      return;
    }

    const packButton = event.target?.closest?.("[data-usb-pack]");
    if (packButton) {
      const amount = Math.max(0, Number(packButton.dataset.usbPack) || 0);
      if (amount === 1) {
        const today = new Date().toISOString().slice(0, 10);
        const key = "traceProtocolFreeUsbPackDate";
        if (window.localStorage?.getItem(key) === today) {
          setShopStatus("무료 USB는 하루에 한 번 획득할 수 있습니다.");
          return;
        }
        window.localStorage?.setItem(key, today);
      }
      addDailyMissionUsb(amount);
      recordUsbPackPurchase();
      setShopStatus(amount === 1 ? "무료 USB 1개를 획득했습니다." : `결제 데모 완료: USB ${amount}개가 충전되었습니다.`);
      playSfx("click");
    }
  });

  const getProfileScope = () => authSession?.user?.id || "guest";

  const getProfileSettings = () => {
    try {
      const stored = JSON.parse(window.localStorage?.getItem(PROFILE_STORAGE_KEY) || "{}");
      const profile = stored?.[getProfileScope()] || {};
      const avatarId = PROFILE_AVATARS.some((avatar) => avatar.id === profile.avatarId)
        ? profile.avatarId
        : DEFAULT_PROFILE_AVATAR_ID;
      return {
        avatarId,
        nickname: typeof profile.nickname === "string" ? profile.nickname : "",
      };
    } catch {
      return { avatarId: DEFAULT_PROFILE_AVATAR_ID, nickname: "" };
    }
  };

  const saveProfileSettings = (patch) => {
    try {
      const stored = JSON.parse(window.localStorage?.getItem(PROFILE_STORAGE_KEY) || "{}");
      stored[getProfileScope()] = { ...getProfileSettings(), ...patch };
      window.localStorage?.setItem(PROFILE_STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // Keep the current profile usable even when local storage is unavailable.
    }
  };

  const getProfileAvatar = (avatarId) => {
    return PROFILE_AVATARS.find((avatar) => avatar.id === avatarId)
      || PROFILE_AVATARS.find((avatar) => avatar.id === DEFAULT_PROFILE_AVATAR_ID)
      || PROFILE_AVATARS[0];
  };

  const getAuthDisplayName = (user) => {
    const metadata = user?.user_metadata || {};
    return metadata.full_name || metadata.name || metadata.user_name || metadata.nickname
      || user?.email?.split("@")[0] || "GUEST USER";
  };

  const renderProfileAvatarPicker = (selectedId) => {
    profileAvatarPicker?.querySelectorAll("[data-avatar-id]").forEach((button) => {
      const selected = button.dataset.avatarId === selectedId;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
  };

  const renderAuthPanel = () => {
    const user = authSession?.user || null;
    const signedIn = Boolean(user);
    const configured = Boolean(authService?.isAuthConfigured?.());
    const profileSettings = getProfileSettings();
    const profileAvatarData = getProfileAvatar(profileSettings.avatarId);
    const displayName = getAuthDisplayName(user);
    const nickname = profileSettings.nickname || displayName;

    authUser?.classList.toggle("hidden", !signedIn);
    authLoginBtn?.classList.toggle("hidden", signedIn);
    authLogoutBtn?.classList.toggle("hidden", !signedIn);
    if (authEmail) authEmail.textContent = user?.email || "Google user";
    if (profileName) profileName.textContent = nickname;
    if (profileBtn) profileBtn.setAttribute("aria-label", `${nickname} 프로필 메뉴`);
    if (profileAvatar) {
      profileAvatar.classList.remove("hidden");
      profileAvatar.src = profileAvatarData.src;
      profileAvatar.alt = `${profileAvatarData.name} 프로필 이미지`;
    }
    if (profilePreview) {
      profilePreview.src = profileAvatarData.src;
      profilePreview.alt = `${profileAvatarData.name} 프로필 이미지`;
      profilePreview.classList.remove("hidden");
    }
    profileAvatarFallback?.classList.add("hidden");
    if (profileNicknameInput && document.activeElement !== profileNicknameInput) {
      profileNicknameInput.value = nickname;
    }
    renderProfileAvatarPicker(profileSettings.avatarId);
    if (authMessage) {
      authMessage.textContent = authLoading
        ? "Checking Google link..."
        : authError || (
            !configured
              ? "Google login unavailable."
              : signedIn ? "Google connected" : "Google not connected."
          );
    }
    if (authLoginBtn) {
      authLoginBtn.disabled = authLoading || !configured;
      authLoginBtn.textContent = authLoading ? "CHECKING..." : "Google Login";
    }
    if (authLogoutBtn) {
      authLogoutBtn.disabled = authLoading;
      authLogoutBtn.textContent = authLoading ? "WAIT..." : "Logout";
    }
  };

  const showAuthError = (message) => {
    authError = message;
    authLoading = false;
    renderAuthPanel();
  };

  const initializeAuth = async () => {
    renderAuthPanel();
    try {
      authService = await import("./services/authService.js");
    } catch {
      showAuthError("Google login unavailable.");
      return;
    }

    authService.onAuthStateChange((event, session) => {
      authSession = session || null;
      authLoading = false;
      authError = "";
      renderAuthPanel();
    });

    const result = await authService.getCurrentSession();
    authSession = result.session || null;
    authError = result.ok || result.reason === "supabase-not-configured"
      ? ""
      : "Login status unavailable.";
    authLoading = false;
    renderAuthPanel();
  };

  const getPurchasedSkins = () => {
    return new Set(loadPurchasedSkins());
  };

  const isSkinOwned = (skinId) => {
    const skin = SELECTABLE_AI_SKINS.find((item) => item.id === skinId);
    if (skin?.owned) return true;
    return getPurchasedSkins().has(skinId);
  };

  const purchaseSkin = (skinId) => {
    const purchased = getPurchasedSkins();
    purchased.add(skinId);
    savePurchasedSkins([...purchased]);
  };

  const getSelectedSkin = () => {
    const stored = loadSelectedSkin();
    if (SELECTABLE_AI_SKINS.some((skin) => skin.id === stored) && isSkinOwned(stored)) return stored;
    return SELECTABLE_AI_SKINS[0].id;
  };

  const setSkinPanelOpen = (open) => {
    skinPanelOpen = Boolean(open);
    if (skinPanelOpen) {
      activeSkinCategory = "";
      renderSkinPanel();
    }
    skinBtn?.setAttribute("aria-expanded", skinPanelOpen ? "true" : "false");
    skinPanel.classList.toggle("hidden", !skinPanelOpen);
  };

  const isDarkWebUnlocked = () => {
    try {
      return localStorage.getItem(CLASSIC_CLEAR_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  };

  const refreshModeButtons = () => {
    const unlocked = isDarkWebUnlocked();
    const darkWebButton = modePanel.querySelector("[data-mode='darkweb']");
    darkWebButton?.classList.toggle("locked", !unlocked);
    darkWebButton?.querySelector(".lobby-mode-condition")?.classList.toggle("hidden", unlocked);
    if (darkWebButton) {
      darkWebButton.disabled = !unlocked;
      darkWebButton.setAttribute("aria-disabled", unlocked ? "false" : "true");
    }
  };

  const setModePanelOpen = (open) => {
    modePanelOpen = Boolean(open);
    startBtn?.setAttribute("aria-expanded", modePanelOpen ? "true" : "false");
    modePanel.classList.toggle("hidden", !modePanelOpen);
    refreshModeButtons();
  };

  const setProfilePanelOpen = (open) => {
    profilePanelOpen = Boolean(open);
    profileBtn?.setAttribute("aria-expanded", profilePanelOpen ? "true" : "false");
    profilePanel?.classList.toggle("hidden", !profilePanelOpen);
  };

  const setStageSelectOpen = (open) => {
    stageSelectOpen = Boolean(open);
    stageSelectPanel.classList.toggle("hidden", !stageSelectOpen);
    lobbyScreen?.classList.toggle("hidden", stageSelectOpen);
    modePanel.classList.add("hidden");
    if (!stageSelectOpen) setModePanelOpen(false);
  };

  const showFeatureScreen = (screen) => {
    setSkinPanelOpen(false);
    setModePanelOpen(false);
    setProfilePanelOpen(false);
    dailyMissionScreen?.classList.toggle("hidden", screen !== dailyMissionScreen);
    shopScreen?.classList.toggle("hidden", screen !== shopScreen);
    seasonPassScreen?.classList.toggle("hidden", screen !== seasonPassScreen);
    document.body.classList.toggle("lobby-feature-active", Boolean(screen));
    lobbyScreen?.classList.toggle("hidden", Boolean(screen));
  };

  const showStageSelect = ({ returnToDailyMission = false } = {}) => {
    returnToDailyMissionFromStageSelect = Boolean(returnToDailyMission);
    active = true;
    root?.classList.remove("hidden");
    document.body.classList.add("lobby-active", "lobby-ready");
    document.body.classList.remove("lobby-modal-open");
    splashScreen?.classList.add("hidden");
    setSkinPanelOpen(false);
    setModePanelOpen(false);
    setProfilePanelOpen(false);
    setSkinPurchaseModalOpen(false);
    setPathNoteModalOpen(false);
    showFeatureScreen(null);
    setStageSelectOpen(true);
  };

  const setSkinPurchaseModalOpen = (open, mode = "confirm") => {
    skinPurchaseModal.classList.toggle("hidden", !open);
    skinPurchaseModal.dataset.mode = mode;
    skinPurchaseModal.querySelector(".lobby-skin-purchase-title").textContent =
      mode === "complete" ? "구매완료" : "구매하시겠습니까?";
    skinPurchaseModal.querySelector(".lobby-skin-purchase-text").textContent =
      mode === "complete"
        ? "과거의 그것 스킨을 사용할 수 있습니다."
        : "과거의 그것 스킨을 구매하시겠습니까?";
    skinPurchaseModal.querySelector(".lobby-skin-purchase-confirm").classList.toggle("hidden", mode === "complete");
    skinPurchaseModal.querySelector(".lobby-skin-purchase-cancel").classList.toggle("hidden", mode === "complete");
    skinPurchaseModal.querySelector(".lobby-skin-purchase-ok").classList.toggle("hidden", mode !== "complete");
  };

  const setPathNoteModalOpen = (open) => {
    pathNoteModal.classList.toggle("hidden", !open);
    document.body.classList.toggle("lobby-modal-open", Boolean(open));
  };

  const closeLobbyPopups = (except = "") => {
    if (except !== "skin") setSkinPanelOpen(false);
    if (except !== "mode") setModePanelOpen(false);
    if (except !== "profile") setProfilePanelOpen(false);
    setSkinPurchaseModalOpen(false);
    setPathNoteModalOpen(false);
  };

  const refreshSkinButtons = () => {
    const selectedSkin = getSelectedSkin();
    skinPanel.querySelectorAll('.lobby-skin-option[data-skin-category="ai"]').forEach((button) => {
      const selected = button.dataset.skin === selectedSkin;
      const locked = !isSkinOwned(button.dataset.skin);
      button.classList.toggle("selected", selected);
      button.classList.toggle("locked", locked);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
      button.setAttribute("aria-disabled", locked ? "true" : "false");
    });
    skinPanel.querySelectorAll('.lobby-skin-option[data-skin-category="hacker"]').forEach((button) => {
      const selected = button.dataset.skin === "classic";
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
  };

  const renderSkinPanel = () => {
    renderSkinPanelContent(skinPanel, "", getSelectedSkin(), getSelectedHackerSkin());
    refreshSkinButtons();
  };

  const renderSkinSelectScreen = (category = activeSkinCategory) => {
    activeSkinCategory = category === "ai" ? "ai" : "hacker";
    const isAi = activeSkinCategory === "ai";
    const skins = isAi ? SELECTABLE_AI_SKINS : SELECTABLE_HACKER_SKINS;
    const storedHackerSkin = getSelectedHackerSkin();
    const selectedSkin = isAi
      ? getSelectedSkin()
      : (skins.some((skin) => skin.id === storedHackerSkin) ? storedHackerSkin : skins[0].id);
    const slots = Array.from({ length: MAX_SKIN_SLOTS }, (_, index) => skins[index] || null);
    skinSelectScreen.querySelector(".lobby-skin-select-kicker").textContent = isAi ? "AI SYSTEM SKIN" : "HACKER SKIN";
    skinSelectScreen.querySelector(".lobby-skin-select-title").textContent =
      `${isAi ? "AI 시스템" : "해커"} 스킨을 선택하세요.`;
    skinSelectScreen.querySelector(".lobby-skin-select-track").innerHTML = slots.map((skin, index) => {
      if (!skin) return `
        <button class="lobby-skin-select-card empty" type="button" disabled>
          <span>SKIN ${index + 1}</span>
          <b class="lobby-skin-empty-mark">EMPTY</b>
          <div class="lobby-skin-card-copy"><strong>COMMING SOON</strong></div>
        </button>`;
      const owned = !isAi || isSkinOwned(skin.id);
      const selected = skin.id === selectedSkin;
      return `
        <button class="lobby-skin-select-card${selected ? " selected" : ""}${owned ? "" : " locked"}"
          type="button" data-full-skin="${skin.id}" data-skin-category="${activeSkinCategory}" aria-pressed="${selected}">
          <span>SKIN ${index + 1}</span>
          <div class="lobby-skin-card-preview" data-preview-skin="${activeSkinCategory}-${skin.id}" aria-hidden="true"><img src="${skin.preview}" alt=""></div>
          <div class="lobby-skin-card-copy">
            <strong>${skin.name}</strong><small>${skin.desc}</small>${owned ? "" : "<em>구매 필요</em>"}
          </div>
        </button>`;
    }).join("");
    skinSelectScreen.dataset.availableSkinCount = String(skins.length);
    const selectedIndex = Math.max(0, skins.findIndex((skin) => skin.id === selectedSkin));
    setSkinCarouselIndex(selectedIndex, { behavior: "auto" });
  };

  const setSkinCarouselIndex = (index, { behavior = "smooth" } = {}) => {
    const scroller = skinSelectScreen.querySelector(".lobby-skin-select-scroller");
    const cards = [...skinSelectScreen.querySelectorAll(".lobby-skin-select-card")];
    const availableSkinCount = Math.max(1, Number(skinSelectScreen.dataset.availableSkinCount) || 1);
    const lastAvailableIndex = Math.min(cards.length - 1, availableSkinCount - 1);
    const nextIndex = Math.max(0, Math.min(lastAvailableIndex, Number(index) || 0));
    skinSelectScreen.dataset.carouselIndex = String(nextIndex);
    skinSelectScreen.querySelector("[data-action='previous-skin']")?.toggleAttribute("disabled", nextIndex === 0);
    skinSelectScreen.querySelector("[data-action='next-skin']")?.toggleAttribute("disabled", nextIndex >= lastAvailableIndex);
    if (scroller && cards.length) {
      requestAnimationFrame(() => {
        const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
        const left = cards.length > 1 ? (maxScroll * nextIndex) / (cards.length - 1) : 0;
        scroller.scrollTo({ left, behavior });
      });
    }
  };

  const selectCarouselSkinAtIndex = (index) => {
    const skins = activeSkinCategory === "ai" ? SELECTABLE_AI_SKINS : SELECTABLE_HACKER_SKINS;
    const skin = skins[index];
    if (!skin) return false;
    if (activeSkinCategory === "ai") {
      selectSkin(skin.id);
      if (!isSkinOwned(skin.id)) return false;
    } else {
      saveSelectedHackerSkin(skin.id);
    }
    renderSkinSelectScreen(activeSkinCategory);
    setSkinCarouselIndex(index);
    return true;
  };

  const syncSkinCarouselControls = () => {
    const scroller = skinSelectScreen.querySelector(".lobby-skin-select-scroller");
    const cards = [...skinSelectScreen.querySelectorAll(".lobby-skin-select-card")];
    if (!scroller || !cards.length) return;
    const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    const closestIndex = maxScroll > 0
      ? Math.round((scroller.scrollLeft / maxScroll) * (cards.length - 1))
      : Number(skinSelectScreen.dataset.carouselIndex) || 0;
    skinSelectScreen.dataset.carouselIndex = String(closestIndex);
    const availableSkinCount = Math.max(1, Number(skinSelectScreen.dataset.availableSkinCount) || 1);
    const lastAvailableIndex = Math.min(cards.length - 1, availableSkinCount - 1);
    skinSelectScreen.querySelector("[data-action='previous-skin']")?.toggleAttribute("disabled", closestIndex === 0);
    skinSelectScreen.querySelector("[data-action='next-skin']")?.toggleAttribute("disabled", closestIndex >= lastAvailableIndex);
  };

  const setSkinSelectScreenOpen = (open, category = activeSkinCategory) => {
    if (open) renderSkinSelectScreen(category);
    skinSelectScreen.classList.toggle("hidden", !open);
    document.body.classList.toggle("lobby-skin-select-active", Boolean(open));
    lobbyScreen?.classList.toggle("hidden", Boolean(open));
    setSkinPanelOpen(false);
  };

  const selectSkin = (skinId, { persist = true } = {}) => {
    const nextSkin = SELECTABLE_AI_SKINS.some((skin) => skin.id === skinId) ? skinId : SELECTABLE_AI_SKINS[0].id;
    if (!isSkinOwned(nextSkin)) {
      pendingPurchaseSkinId = nextSkin;
      setSkinPurchaseModalOpen(true, "confirm");
      return;
    }
    if (persist) saveSelectedSkin(nextSkin);
    refreshSkinButtons();
    document.dispatchEvent(new CustomEvent("protocol:ai-skin-change", {
      detail: { skin: nextSkin },
    }));
  };

  const showLobby = () => {
    active = true;
    root?.classList.remove("hidden");
    document.body.classList.add("lobby-active", "lobby-ready");
    document.body.classList.remove("lobby-modal-open");
    setSkinPanelOpen(false);
    setModePanelOpen(false);
    setStageSelectOpen(false);
    setSkinSelectScreenOpen(false);
    setSkinPurchaseModalOpen(false);
    setPathNoteModalOpen(false);
    splashScreen?.classList.add("hidden");
    showFeatureScreen(null);
    playLobbyBgm();
  };

  const hideLobby = () => {
    active = false;
    root?.classList.add("hidden");
    document.body.classList.remove("lobby-active", "lobby-ready", "lobby-modal-open", "lobby-skin-select-active");
    setProfilePanelOpen(false);
    setSkinPanelOpen(false);
    setModePanelOpen(false);
    setSkinSelectScreenOpen(false);
    setSkinPurchaseModalOpen(false);
    setPathNoteModalOpen(false);
    dailyMissionScreen?.classList.add("hidden");
    shopScreen?.classList.add("hidden");
  };

  const startLobbyBgm = () => {
    if (!active) return;
    unlockAudio();
    playLobbyBgm();
  };

  const restoreLobbyAfterHelp = () => {
    if (!active || !helpOverlayOpen) return;
    helpOverlayOpen = false;
    root?.classList.remove("hidden");
    document.body.classList.remove("lobby-modal-open");
  };

  selectSkin(getSelectedSkin(), { persist: false });
  refreshSkinButtons();

  const prepareLobbyAudio = () => {
    if (splashScreen?.classList.contains("hidden")) {
      startLobbyBgm();
      return;
    }
    unlockAudio();
  };

  root?.addEventListener("pointerdown", prepareLobbyAudio);
  document.addEventListener("keydown", prepareLobbyAudio);

  const enterLobby = () => {
    if (!active || enteringLobby || splashScreen?.classList.contains("hidden")) return;
    enteringLobby = true;
    unlockAudio();
    playSfx("click");
    splashEnterBtn?.setAttribute("disabled", "");
    window.setTimeout(() => {
      showLobby();
      enteringLobby = false;
    }, 180);
  };

  splashEnterBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    enterLobby();
  });

  authLoginBtn?.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!authService || authLoading) return;
    authLoading = true;
    authError = "";
    renderAuthPanel();
    const result = await authService.signInWithGoogle();
    if (!result.ok) {
      showAuthError("Google login failed.");
      return;
    }
    authLoading = false;
    renderAuthPanel();
  });

  authLogoutBtn?.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!authService || authLoading) return;
    authLoading = true;
    authError = "";
    renderAuthPanel();
    const result = await authService.signOut();
    if (!result.ok) {
      showAuthError("Logout failed.");
      return;
    }
    authSession = null;
    authLoading = false;
    renderAuthPanel();
  });

  authPanel.addEventListener("click", (event) => {
    const actionButton = event.target?.closest?.("[data-profile-action]");
    if (!actionButton) return;
    event.preventDefault();
    event.stopPropagation();
    const action = actionButton.dataset.profileAction;

    if (action === "choose-avatar") {
      profileAvatarPicker?.classList.toggle("hidden");
      return;
    }

    if (action === "select-avatar") {
      const avatarId = actionButton.dataset.avatarId;
      if (!PROFILE_AVATARS.some((avatar) => avatar.id === avatarId)) return;
      saveProfileSettings({ avatarId });
      renderAuthPanel();
      profileAvatarPicker?.classList.add("hidden");
      return;
    }

    if (action === "save-nickname") {
      const nickname = String(profileNicknameInput?.value || "").trim().slice(0, 18);
      if (!nickname) {
        if (profileNicknameStatus) profileNicknameStatus.textContent = "닉네임을 입력하세요.";
        return;
      }
      saveProfileSettings({ nickname });
      if (profileNicknameStatus) profileNicknameStatus.textContent = "닉네임이 저장되었습니다.";
      renderAuthPanel();
      setProfilePanelOpen(false);
    }
  });

  profileBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    startLobbyBgm();
    const shouldOpen = !profilePanelOpen;
    closeLobbyPopups("profile");
    setProfilePanelOpen(shouldOpen);
  });

  document.addEventListener("keydown", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement
      && (target.matches("input, textarea, select") || target.isContentEditable)) {
      return;
    }
    if (event.code !== "Enter" && event.code !== "Space") return;
    enterLobby();
  });

  startBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    startLobbyBgm();
    const shouldOpen = !modePanelOpen;
    closeLobbyPopups("mode");
    setModePanelOpen(shouldOpen);
  });

  modePanel.addEventListener("click", (event) => {
    const button = event.target?.closest?.("[data-mode]");
    if (!button || button.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    startLobbyBgm();
    setModePanelOpen(false);
    const mode = button.dataset.mode || "classic";
    if (mode === "classic") {
      showStageSelect();
      return;
    }
    hideLobby();
    onStart?.(mode);
  });

  stageSelectPanel.addEventListener("click", (event) => {
    const stageButton = event.target?.closest?.("[data-stage]");
    if (stageButton) {
      event.preventDefault();
      event.stopPropagation();
      const stage = Number(stageButton.dataset.stage) || 1;
      returnToDailyMissionFromStageSelect = false;
      setStageSelectOpen(false);
      hideLobby();
      onStart?.("classic", stage);
      return;
    }
    if (event.target?.closest?.("[data-action='back-to-lobby']")) {
      event.preventDefault();
      event.stopPropagation();
      const shouldReturnToDailyMission = returnToDailyMissionFromStageSelect;
      returnToDailyMissionFromStageSelect = false;
      setStageSelectOpen(false);
      if (shouldReturnToDailyMission) {
        refreshDailyMission();
        showFeatureScreen(dailyMissionScreen);
      }
    }
  });

  helpBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    startLobbyBgm();
    helpOverlayOpen = true;
    root?.classList.add("hidden");
    document.body.classList.add("lobby-modal-open");
    onHelp?.();
  });

  skinBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    startLobbyBgm();
    const shouldOpen = !skinPanelOpen;
    closeLobbyPopups("skin");
    refreshSkinButtons();
    setSkinPanelOpen(shouldOpen);
  });

  skinPanel.addEventListener("click", (event) => {
    const categoryButton = event.target?.closest?.("[data-open-skin-category]");
    if (categoryButton) {
      event.preventDefault();
      event.stopPropagation();
      activeSkinCategory = categoryButton.dataset.openSkinCategory;
      setSkinSelectScreenOpen(true, activeSkinCategory);
      return;
    }

    if (event.target?.closest?.("[data-skin-back]")) {
      event.preventDefault();
      event.stopPropagation();
      activeSkinCategory = "";
      renderSkinPanel();
      return;
    }

    const button = event.target?.closest?.(".lobby-skin-option");
    if (!button || button.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    if (button.dataset.skinCategory === "ai") selectSkin(button.dataset.skin);
    else refreshSkinButtons();
  });

  skinSelectScreen.addEventListener("click", (event) => {
    if (event.target?.closest?.("[data-action='start-from-skins']")) {
      event.preventDefault();
      setSkinSelectScreenOpen(false);
      showStageSelect();
      return;
    }
    if (event.target?.closest?.("[data-action='back-from-skins']")) {
      event.preventDefault();
      event.stopPropagation();
      setSkinSelectScreenOpen(false);
      setSkinPanelOpen(true);
      return;
    }
    const carouselAction = event.target?.closest?.("[data-skin-carousel]")?.dataset.skinCarousel;
    if (carouselAction) {
      event.preventDefault();
      const currentIndex = Number(skinSelectScreen.dataset.carouselIndex) || 0;
      const nextIndex = currentIndex + (carouselAction === "next" ? 1 : -1);
      if (!selectCarouselSkinAtIndex(nextIndex)) setSkinCarouselIndex(currentIndex);
      return;
    }
    const button = event.target?.closest?.("[data-full-skin]");
    if (!button) return;
    event.preventDefault();
    const skins = button.dataset.skinCategory === "ai" ? SELECTABLE_AI_SKINS : SELECTABLE_HACKER_SKINS;
    const index = skins.findIndex((skin) => skin.id === button.dataset.fullSkin);
    selectCarouselSkinAtIndex(index);
  });
  skinSelectScreen.querySelector(".lobby-skin-select-scroller")?.addEventListener("scroll", syncSkinCarouselControls, { passive: true });

  skinPurchaseModal.addEventListener("click", (event) => {
    if (event.target === skinPurchaseModal) {
      setSkinPurchaseModalOpen(false);
      return;
    }

    const action = event.target?.closest?.("button")?.dataset?.action;
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();

    if (action === "cancel" || action === "ok") {
      setSkinPurchaseModalOpen(false);
      return;
    }

    if (action === "confirm" && pendingPurchaseSkinId) {
      purchaseSkin(pendingPurchaseSkinId);
      refreshSkinButtons();
      renderSkinSelectScreen("ai");
      setSkinPurchaseModalOpen(true, "complete");
    }
  });

  pathNoteBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    startLobbyBgm();
    closeLobbyPopups();
    setPathNoteModalOpen(true);
  });

  pathNoteModal.addEventListener("click", (event) => {
    if (event.target === pathNoteModal || event.target?.closest?.("[data-action='close-path-note']")) {
      event.preventDefault();
      event.stopPropagation();
      setPathNoteModalOpen(false);
    }
  });

  missionBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    startLobbyBgm();
    closeLobbyPopups();
    refreshDailyMission();
    showFeatureScreen(dailyMissionScreen);
  });

  dailyMissionScreen?.querySelector(".daily-mission-attendance")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const state = getDailyMissionState();
    if (state.claimed?.attendance) {
      refreshDailyMission(state);
      return;
    }
    playSfx("click");
    refreshDailyMission(recordDailyMissionEvent("attendance"));
  });

  const openStageSelectFromMission = (event) => {
    const card = event.target?.closest?.(".daily-mission-stage-link");
    if (!card) return;
    const state = getDailyMissionState();
    if (state.claimed?.[card.dataset.missionId]) {
      refreshDailyMission(state);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    playSfx("click");
    showStageSelect({ returnToDailyMission: true });
  };

  dailyMissionScreen?.addEventListener("click", openStageSelectFromMission);
  dailyMissionScreen?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    openStageSelectFromMission(event);
  });

  const openShopFromMission = (event) => {
    const card = event.target?.closest?.(".daily-mission-shop-link");
    if (!card) return;
    event.preventDefault();
    event.stopPropagation();
    playSfx("click");
    refreshDailyMission(recordDailyMissionEvent("shopVisit"));
    returnToDailyMissionFromShop = true;
    showFeatureScreen(shopScreen);
  };

  dailyMissionScreen?.addEventListener("click", openShopFromMission);
  dailyMissionScreen?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    openShopFromMission(event);
  });

  const openDarkWebFromMission = (event) => {
    const card = event.target?.closest?.(".daily-mission-darkweb-link");
    if (!card) return;
    event.preventDefault();
    event.stopPropagation();
    const state = getDailyMissionState();
    if (state.claimed?.[card.dataset.missionId] || !isDarkWebUnlocked()) {
      refreshDailyMission(state);
      return;
    }
    playSfx("click");
    hideLobby();
    onStart?.("darkweb");
  };

  dailyMissionScreen?.addEventListener("click", openDarkWebFromMission);
  dailyMissionScreen?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    openDarkWebFromMission(event);
  });

  shopBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    startLobbyBgm();
    closeLobbyPopups();
    recordDailyMissionEvent("shopVisit");
    returnToDailyMissionFromShop = false;
    showFeatureScreen(shopScreen);
  });

  seasonPassBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    startLobbyBgm();
    closeLobbyPopups();
    renderSeasonPass();
    showFeatureScreen(seasonPassScreen);
  });

  for (const screen of [dailyMissionScreen, shopScreen, seasonPassScreen]) {
    screen?.addEventListener("click", (event) => {
      if (!event.target?.closest?.("[data-action='back-to-lobby']")) return;
      event.preventDefault();
      event.stopPropagation();
      if (screen === shopScreen && returnToDailyMissionFromShop) {
        returnToDailyMissionFromShop = false;
        refreshDailyMission();
        showFeatureScreen(dailyMissionScreen);
        return;
      }
      returnToDailyMissionFromShop = false;
      showFeatureScreen(null);
    });
  }

  document.addEventListener("click", (event) => {
    if (!skinPurchaseModal.classList.contains("hidden")) return;
    if (skinPanelOpen && !event.target?.closest?.("#lobbySkinBtn, .lobby-skin-panel")) {
      setSkinPanelOpen(false);
    }
    if (modePanelOpen && !event.target?.closest?.("#lobbyStartBtn, .lobby-mode-panel")) {
      setModePanelOpen(false);
    }
    if (profilePanelOpen && !event.target?.closest?.("#profileBtn, .profile-panel")) {
      setProfilePanelOpen(false);
    }
  });

  const overlay = document.getElementById("overlay");
  const observer = overlay
    ? new MutationObserver(() => {
        if (overlay.classList.contains("hidden")) restoreLobbyAfterHelp();
      })
    : null;
  observer?.observe(overlay, { attributes: true, attributeFilter: ["class"] });
  initializeAuth();

  return {
    showLobby,
    hideLobby,
    playLobbyBgm: startLobbyBgm,
    refreshModeButtons,
    showStageSelect,
  };
}

function createAuthPanel() {
  const panel = document.createElement("div");
  panel.className = "lobby-auth-panel";
  panel.setAttribute("aria-live", "polite");
  panel.innerHTML = `
    <section class="profile-nickname-section">
      <div class="profile-section-heading"><strong>NICKNAME</strong></div>
      <div class="profile-nickname-control">
        <input id="profileNickname" type="text" maxlength="18" autocomplete="nickname" aria-label="닉네임" />
        <button class="profile-save-button" type="button" data-profile-action="save-nickname">저장</button>
      </div>
      <p class="profile-nickname-status" aria-live="polite">로비에 표시할 이름입니다.</p>
    </section>
    <section class="profile-editor-section">
      <div class="profile-section-heading"><strong>PROFILE IMAGE</strong></div>
      <button class="profile-change-button" type="button" data-profile-action="choose-avatar">
        <img class="profile-editor-avatar" alt="" />
        <span><strong>프로필 변경</strong></span>
        <b aria-hidden="true">›</b>
      </button>
      <div class="profile-avatar-picker hidden" aria-label="프로필 이미지 선택">
        ${PROFILE_AVATARS.map((avatar) => `
          <button class="profile-avatar-option" type="button" data-profile-action="select-avatar" data-avatar-id="${avatar.id}" aria-label="${avatar.name}" aria-pressed="false">
            <img src="${avatar.src}" alt="" />
          </button>`).join("")}
      </div>
    </section>
    <section class="profile-link-section">
      <div class="profile-section-heading"><strong>GOOGLE LINK STATUS</strong></div>
      <div class="lobby-auth-user hidden">
        <span class="profile-link-dot" aria-hidden="true"></span>
        <span class="lobby-auth-email"></span>
      </div>
      <p class="lobby-auth-message">Checking Google link...</p>
      <div class="lobby-auth-actions">
        <button class="lobby-button lobby-auth-login" type="button">Google Login</button>
        <button class="lobby-button lobby-auth-logout hidden" type="button">Logout</button>
      </div>
    </section>
  `;
  return panel;
}

function createStageSelectPanel() {
  const panel = document.createElement("section");
  panel.className = "lobby-stage-select hidden";
  panel.setAttribute("aria-label", "클래식 모드 스테이지 선택");
  panel.innerHTML = `
    <div class="lobby-stage-select-header">
      <div><p class="lobby-kicker">CLASSIC MODE</p><h2>SELECT STAGE</h2><p>플레이할 스테이지를 선택하세요.</p></div>
      <button class="lobby-button" type="button" data-action="back-to-lobby">BACK</button>
    </div>
    <div class="lobby-stage-scroller" tabindex="0" aria-label="스테이지 목록">
      <div class="lobby-stage-track">
        ${Array.from({ length: 11 }, (_, index) => `<button class="lobby-stage-card" type="button" data-stage="${index + 1}"><span>STAGE</span><strong>${index + 1}</strong><small>${index % 2 === 0 ? "ATTACK" : "DEFENSE"}</small></button>`).join("")}
      </div>
    </div>
    <p class="lobby-stage-scroll-hint">← → 또는 좌우로 스크롤</p>
  `;
  const scroller = panel.querySelector(".lobby-stage-scroller");
  scroller?.addEventListener("wheel", (event) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    scroller.scrollLeft += event.deltaY;
  }, { passive: false });
  return panel;
}

function createModePanel() {
  const panel = document.createElement("div");
  panel.className = "lobby-mode-panel hidden";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "게임 모드 선택");
  panel.innerHTML = `
    <button class="lobby-mode-option" type="button" data-mode="classic">
      <span class="lobby-mode-number">01</span>
      <span><strong>CLASSIC MODE</strong><small>튜토리얼과 스토리가 있는 기존 캠페인</small></span>
    </button>
    <button class="lobby-mode-option" type="button" data-mode="darkweb">
      <span class="lobby-mode-number">02</span>
      <span><strong>DARK WEB MODE</strong><small>사이드 맵을 돌파하고 메인 코어 룸으로 진입</small><em class="lobby-mode-condition">조건: 클래식 모드 클리어</em></span>
    </button>
  `;
  return panel;
}

function createSkinPanel() {
  const panel = document.createElement("div");
  panel.className = "lobby-skin-panel hidden";
  panel.setAttribute("aria-label", "캐릭터 스킨 선택");
  renderSkinPanelContent(panel, "", "classic", "classic");

  return panel;
}

function createSkinSelectScreen() {
  const screen = document.createElement("section");
  screen.className = "lobby-skin-select-screen hidden";
  screen.setAttribute("aria-label", "스킨 선택");
  screen.innerHTML = `
    <div class="lobby-skin-select-board">
      <div class="lobby-skin-select-header">
        <div>
          <p class="lobby-kicker lobby-skin-select-kicker">HACKER SKIN</p>
          <h2 class="lobby-skin-select-title">해커 스킨을 선택하세요.</h2>
        </div>
        <button class="lobby-button" type="button" data-action="back-from-skins">BACK</button>
      </div>
      <div class="lobby-skin-select-carousel">
        <button class="lobby-skin-carousel-button previous" type="button" data-action="previous-skin" data-skin-carousel="previous" aria-label="이전 스킨" disabled>‹</button>
        <div class="lobby-skin-select-scroller" aria-label="스킨 목록">
          <div class="lobby-skin-select-track"></div>
        </div>
        <button class="lobby-skin-carousel-button next" type="button" data-action="next-skin" data-skin-carousel="next" aria-label="다음 스킨">›</button>
      </div>
      <button class="lobby-button lobby-skin-start-button" type="button" data-action="start-from-skins">START GAME</button>
    </div>`;
  return screen;
}

function renderSkinPanelContent(panel, category, selectedAiSkin, selectedHackerSkin = "classic") {
  if (!category) {
    const hackerSkin = SELECTABLE_HACKER_SKINS.find((skin) => skin.id === selectedHackerSkin)
      || SELECTABLE_HACKER_SKINS[0];
    const aiSkin = SELECTABLE_AI_SKINS.find((skin) => skin.id === selectedAiSkin)
      || SELECTABLE_AI_SKINS[0];
    panel.classList.remove("skin-list-view");
    panel.innerHTML = `
      <div class="lobby-skin-categories">
        <button class="lobby-skin-category" type="button" data-open-skin-category="hacker">
          <span class="lobby-skin-equipped-badge"><span class="lobby-skin-equipped-dot" aria-hidden="true"></span><span>적용 중</span></span>
          <span class="lobby-skin-category-preview-frame" aria-hidden="true"><img class="lobby-skin-category-preview" src="${hackerSkin.preview}" alt="" style="${getLobbySkinPreviewStyle(hackerSkin)}"></span>
          <strong class="lobby-skin-category-label">해커</strong>
        </button>
        <button class="lobby-skin-category" type="button" data-open-skin-category="ai" data-current-skin="${aiSkin.id}">
          <span class="lobby-skin-equipped-badge"><span class="lobby-skin-equipped-dot" aria-hidden="true"></span><span>적용 중</span></span>
          <span class="lobby-skin-category-preview-frame" aria-hidden="true"><img class="lobby-skin-category-preview" src="${aiSkin.preview}" alt="" style="${getLobbySkinPreviewStyle(aiSkin)}"></span>
          <strong class="lobby-skin-category-label">AI</strong>
        </button>
      </div>`;
    return;
  }

  const isAi = category === "ai";
  const skins = isAi ? SELECTABLE_AI_SKINS : SELECTABLE_HACKER_SKINS;
  const slots = Array.from({ length: MAX_SKIN_SLOTS }, (_, index) => skins[index] || null);
  panel.classList.add("skin-list-view");
  panel.innerHTML = `
    <div class="lobby-skin-list-header">
      <button type="button" class="lobby-skin-back" data-skin-back aria-label="캐릭터 선택으로 돌아가기">‹</button>
      <strong>${isAi ? "AI" : "해커"} 스킨</strong>
      <span>${skins.length} / ${MAX_SKIN_SLOTS}</span>
    </div>
    <div class="lobby-skin-options">
      ${slots.map((skin, index) => skin ? `
        <button class="lobby-skin-option${(isAi && skin.id === selectedAiSkin) || (!isAi && index === 0) ? " selected" : ""}"
          type="button" data-skin-category="${category}" data-skin="${skin.id}" aria-pressed="false">
          <span class="lobby-skin-slot-number" aria-hidden="true">${index + 1}</span>
          <span><strong>${skin.name}</strong><small>${skin.desc}</small></span>
        </button>` : `
        <button class="lobby-skin-option empty" type="button" disabled aria-label="비어 있는 스킨 슬롯 ${index + 1}">
          <span class="lobby-skin-slot-number" aria-hidden="true">${index + 1}</span>
          <span><strong>COMMING SOON</strong></span>
        </button>`).join("")}
    </div>`;
}

function createSkinPurchaseModal() {
  const modal = document.createElement("div");
  modal.className = "lobby-skin-purchase-modal hidden";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "스킨 구매 확인");
  modal.innerHTML = `
    <div class="lobby-skin-purchase-card">
      <h2 class="lobby-skin-purchase-title">구매하시겠습니까?</h2>
      <p class="lobby-skin-purchase-text">과거의 그것 스킨을 구매하시겠습니까?</p>
      <div class="lobby-skin-purchase-actions">
        <button class="lobby-skin-purchase-confirm" type="button" data-action="confirm">예</button>
        <button class="lobby-skin-purchase-cancel" type="button" data-action="cancel">아니오</button>
        <button class="lobby-skin-purchase-ok hidden" type="button" data-action="ok">확인</button>
      </div>
    </div>
  `;
  return modal;
}

function createPathNoteModal() {
  const modal = document.createElement("div");
  modal.className = "lobby-path-note-modal hidden";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "Path note");
  modal.innerHTML = `
    <div class="lobby-path-note-card">
      <p class="lobby-path-note-version">0.1v</p>
      <ul class="lobby-path-note-list">
        <li>해커 캐릭터 애셋을 새 GIF 추출 프레임 기반 애니메이션으로 교체했습니다.</li>
        <li>해킹 화면 이펙트를 추가했습니다.</li>
        <li>보상 선택 UI를 새 패널/버튼 이미지 기반으로 교체했습니다.</li>
        <li>레이저 길이/렌더링이 방향별로 다르게 보이던 문제를 수정했습니다.</li>
        <li>레이저는 설치된 칸을 다시 누르면 회전하도록 변경했습니다.</li>
        <li>슬라이딩 사운드와 피격시 사운드가 같아서 슬라이딩 사운드를 추가했습니다.</li>
      </ul>
      <button class="lobby-path-note-close" type="button" data-action="close-path-note">확인</button>
    </div>
  `;
  return modal;
}
