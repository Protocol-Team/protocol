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
    animationType: "gif",
    animations: {
      idle: new URL("summer_idle.gif", SUMMER_ROOT).href,
      run: new URL("summer_run.gif", SUMMER_ROOT).href,
      jumpStart: new URL("summer_jump.gif", SUMMER_ROOT).href,
      jumpAir: new URL("summer_jump.gif", SUMMER_ROOT).href,
      jumpLanding: new URL("summer_landing.gif", SUMMER_ROOT).href,
      slide: new URL("summer_slide.gif", SUMMER_ROOT).href,
      climb: new URL("summer_wall_climb.gif", SUMMER_ROOT).href,
    },
    sourceCrop: {
      idle: { x: 210, y: 90, w: 251, h: 480 },
      run: { x: 144, y: 190, w: 351, h: 341 },
      jumpStart: { x: 51, y: 57, w: 425, h: 483 },
      jumpAir: { x: 51, y: 57, w: 425, h: 483 },
      jumpLanding: { x: 135, y: 71, w: 387, h: 499 },
      slide: { x: 108, y: 191, w: 424, h: 379 },
      climb: { x: 214, y: 186, w: 212, h: 384 },
    },
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
