export const SUMMER_SEASON_ID = "summer-2026";

const CLASSIC_HACKER_ANIMATIONS = {
  idle: { directory: "idle", frameCount: 8, frameSeconds: Array(8).fill(0.14) },
  run: { directory: "run", frameCount: 8, frameSeconds: Array(8).fill(0.09) },
  jumpStart: { directory: "jumpStart", frameCount: 3, frameSeconds: [0.14, 0.11, 0.09] },
  jumpAir: { directory: "jumpAir", frameCount: 3, frameSeconds: Array(3).fill(0.11) },
  jumpLanding: { directory: "jumpLanding", frameCount: 2, frameSeconds: [0.16, 0.22] },
  slide: { directory: "slide", frameCount: 6, frameSeconds: [0.11, 0.12, 0.18, 0.18, 0.14, 0.22] },
  climb: { directory: "climb", frameCount: 6, frameSeconds: Array(6).fill(0.14) },
};

const SUMMER_ROOT = new URL("../assets/images/Summer/", import.meta.url);
const CLASSIC_HACKER_PORTRAIT_ROOT = new URL("../assets/images/hacker_script/", import.meta.url);
const SUMMER_HACKER_PORTRAIT_ROOT = new URL("../assets/images/Summer_script/", import.meta.url);

function createPortraitSet(root, files) {
  return Object.fromEntries(
    Object.entries(files).map(([expression, file]) => [expression, new URL(file, root).href])
  );
}

const SUMMER_HACKER_ANIMATIONS = {
  idle: { directory: "frames/idle", frameCount: 6, frameSeconds: Array(6).fill(0.15) },
  run: { directory: "frames/run", frameCount: 8, frameSeconds: Array(8).fill(0.09) },
  jumpStart: { directory: "frames/jump", frameCount: 6, frameSeconds: Array(6).fill(0.09) },
  jumpAir: { directory: "frames/jump", frameCount: 6, frameSeconds: Array(6).fill(0.09) },
  jumpLanding: { directory: "frames/landing", frameCount: 3, frameSeconds: Array(3).fill(0.12) },
  slide: { directory: "frames/slide", frameCount: 8, frameSeconds: [0.11, 0.06, 0.07, 0.12, 0.11, 0.10, 0.10, 0.15] },
  climb: { directory: "frames/climb", frameCount: 10, frameSeconds: [0.10, 0.11, 0.10, 0.11, 0.10, 0.11, 0.10, 0.11, 0.10, 0.14] },
};

export const HACKER_SKINS = Object.freeze({
  classic: {
    id: "classic",
    name: "해커",
    desc: "기본 스킨",
    category: "default",
    preview: new URL("../assets/images/hacker_script/idle.png", import.meta.url).href,
    animationType: "frames",
    animationBaseUrl: new URL("../assets/images/hacker_new_frames/", import.meta.url),
    animations: CLASSIC_HACKER_ANIMATIONS,
    portraits: createPortraitSet(CLASSIC_HACKER_PORTRAIT_ROOT, {
      idle: "idle.png",
      happy: "happy.png",
      frown: "frown.png",
      angry: "angry.png",
      surprised: "surprised.png",
    }),
    renderScale: {},
    lobbyPreview: { scale: 1.55, offsetX: -12, offsetY: -16, focusY: 28, originY: 32 },
  },
  summerOverride: {
    id: "summerOverride",
    name: "Summer Override",
    desc: "프리미엄 패스\nLv.10 보상 스킨",
    category: "seasonal",
    seasonId: SUMMER_SEASON_ID,
    unlockSource: "premium-pass-level-10",
    preview: new URL("concepart.png", SUMMER_ROOT).href,
    animationType: "frames",
    animationBaseUrl: SUMMER_ROOT,
    animations: SUMMER_HACKER_ANIMATIONS,
    portraits: createPortraitSet(SUMMER_HACKER_PORTRAIT_ROOT, {
      idle: "idle.png",
      happy: "happy.png",
      frown: "frown.png",
      angry: "angry.png",
      surprised: "suprised.png",
    }),
    renderScale: {},
    lobbyPreview: { scale: 1.05, offsetY: 0, focusY: 34, originY: 34 },
  },
});

export const LOBBY_SKINS = Object.freeze({
  default: {
    id: "default",
    name: "기본 로비",
    desc: "Protocol 기본 로비",
    category: "default",
    asset: new URL("../assets/images/Background_image/lobby.png", import.meta.url).href,
  },
  summerSeasonLobby: {
    id: "summerSeasonLobby",
    name: "Summer Season Lobby",
    desc: "프리미엄 패스 Lv.15 보상 로비",
    category: "seasonal",
    seasonId: SUMMER_SEASON_ID,
    unlockSource: "premium-pass-level-15",
    asset: new URL("Summer_season_Lobby.png", SUMMER_ROOT).href,
  },
});

export function isValidHackerSkinId(skinId) {
  return Object.hasOwn(HACKER_SKINS, skinId);
}

export function isValidLobbySkinId(skinId) {
  return Object.hasOwn(LOBBY_SKINS, skinId);
}
