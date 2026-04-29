import {
  getLeaderboard,
  getUsername,
  renderLeaderboard,
  sanitizeName,
  setUsername,
  submitScore,
  type ScoreEntry,
} from "./Leaderboard";
import type { Theme } from "./Themes";

export class UI {
  private scoreEl = document.getElementById("score")!;
  private coinsEl = document.getElementById("coins")!;
  private distanceEl = document.getElementById("distance")!;
  private cityFlagEl = document.getElementById("city-flag")!;
  private cityNameEl = document.getElementById("city-name")!;
  private startScreen = document.getElementById("start-screen")!;
  private gameOverScreen = document.getElementById("gameover-screen")!;
  private playBtn = document.getElementById("play-btn")! as HTMLButtonElement;
  private retryBtn = document.getElementById("retry-btn")! as HTMLButtonElement;
  private goDistance = document.getElementById("go-distance")!;
  private goCoins = document.getElementById("go-coins")!;
  private goScore = document.getElementById("go-score")!;
  private goRank = document.getElementById("go-rank")!;
  private banner = document.getElementById("city-banner")!;
  private bannerFlag = document.getElementById("banner-flag")!;
  private bannerCity = document.getElementById("banner-city")!;
  private bannerCountry = document.getElementById("banner-country")!;
  private flyMeter = document.getElementById("fly-meter")!;
  private flyBar = document.getElementById("fly-bar")!;
  private flyRemaining = document.getElementById("fly-remaining")!;
  private flyToast = document.getElementById("fly-toast")!;
  private usernameInput = document.getElementById("username-input")! as HTMLInputElement;
  private leaderboardList = document.getElementById("leaderboard-list")!;
  private leaderboardListGo = document.getElementById("leaderboard-list-go")!;

  private bannerTimeout: number | null = null;

  constructor() {
    // Seed username field with stored name + render leaderboard
    const stored = getUsername();
    if (stored) this.usernameInput.value = stored;
    else this.usernameInput.placeholder = "MAV67";
    this.usernameInput.addEventListener("input", () => {
      setUsername(sanitizeName(this.usernameInput.value));
    });
    this.refreshLeaderboard();
  }

  /** Currently entered username (sanitized, defaulted). */
  getName(): string {
    return sanitizeName(this.usernameInput.value || getUsername() || "GUEST");
  }

  private refreshLeaderboard(highlightName?: string) {
    const board = getLeaderboard();
    renderLeaderboard(this.leaderboardList, board, highlightName);
    renderLeaderboard(this.leaderboardListGo, board, highlightName);
  }

  onStart(cb: () => void) {
    const fire = () => {
      // Persist whatever name is in the box (sanitized)
      const name = this.getName();
      setUsername(name);
      this.usernameInput.value = name;
      this.startScreen.classList.add("hidden");
      cb();
    };
    this.playBtn.addEventListener("click", fire);
    this.playBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      fire();
    });
  }

  onRetry(cb: () => void) {
    const fire = () => {
      this.gameOverScreen.classList.add("hidden");
      cb();
    };
    this.retryBtn.addEventListener("click", fire);
    this.retryBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      fire();
    });
  }

  setScore(n: number) {
    this.scoreEl.textContent = String(Math.floor(n));
  }

  setCoins(n: number) {
    this.coinsEl.textContent = String(n);
  }

  setDistance(m: number) {
    this.distanceEl.textContent = `${Math.floor(m)}m`;
  }

  /** No-op kept for backward compatibility — Level UI was removed. */
  setLevel(_n: number) {
    /* level UI removed per Oscar's feedback */
  }

  /** No-op kept for backward compatibility — Level Up toast removed. */
  showLevelUp(_level: number) {
    /* level UI removed per Oscar's feedback */
  }

  setCity(theme: Theme) {
    this.cityFlagEl.textContent = theme.flag;
    this.cityNameEl.textContent = theme.city;
  }

  showCityBanner(theme: Theme) {
    this.bannerFlag.textContent = theme.flag;
    this.bannerCity.textContent = theme.city;
    this.bannerCountry.textContent = theme.country;
    this.banner.classList.remove("hidden");
    this.banner.classList.add("show");
    if (this.bannerTimeout) window.clearTimeout(this.bannerTimeout);
    this.bannerTimeout = window.setTimeout(() => {
      this.banner.classList.remove("show");
      window.setTimeout(() => this.banner.classList.add("hidden"), 400);
    }, 2200);
  }

  showGameOver(stats: {
    distance: number;
    coins: number;
    score: number;
    level: number;
  }) {
    this.goDistance.textContent = `${Math.floor(stats.distance)}m`;
    this.goCoins.textContent = String(stats.coins);
    this.goScore.textContent = String(Math.floor(stats.score));
    // Submit score, get rank within the full stored board (not just top 100)
    const name = this.getName();
    const entry: ScoreEntry = {
      name,
      distance: Math.floor(stats.distance),
      coins: stats.coins,
      date: Date.now(),
    };
    const { rank, totalPlayers } = submitScore(entry);
    if (rank == null) {
      this.goRank.textContent = "—";
    } else if (rank <= 100) {
      // Visible on the leaderboard
      this.goRank.textContent = `#${rank}`;
    } else {
      // Outside top 100 — still show the actual rank so user knows where
      // they sit (e.g. "#487 / 1240")
      this.goRank.textContent = `#${rank} / ${totalPlayers}`;
    }
    // Refresh leaderboard with this run highlighted (auto-scrolls to row)
    this.refreshLeaderboard(name);
    this.gameOverScreen.classList.remove("hidden");
  }

  setFlyMeter(remainingM: number) {
    if (remainingM <= 0) {
      this.flyMeter.classList.add("hidden");
      return;
    }
    this.flyMeter.classList.remove("hidden");
    const pct = Math.max(0, Math.min(100, (remainingM / 100) * 100));
    (this.flyBar as HTMLElement).style.width = `${pct}%`;
    this.flyRemaining.textContent = `${Math.ceil(remainingM)}m`;
  }

  showFlyStart() {
    this.flyToast.classList.remove("hidden");
    this.flyToast.classList.add("show");
    window.setTimeout(() => {
      this.flyToast.classList.remove("show");
      window.setTimeout(() => this.flyToast.classList.add("hidden"), 400);
    }, 1400);
  }

  /** Floating "+25" popup at screen position (x, y in pixels). */
  scorePop(screenX: number, screenY: number, value: number) {
    const el = document.createElement("div");
    el.className = "score-pop";
    el.textContent = `+${value}`;
    el.style.left = `${screenX}px`;
    el.style.top = `${screenY}px`;
    document.getElementById("app")!.appendChild(el);
    window.setTimeout(() => el.remove(), 900);
  }
}
