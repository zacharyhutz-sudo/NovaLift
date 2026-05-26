const FEEDBACK_SETTINGS_KEY = "novaliftFeedback.v1";
const TOAST_LIMIT = 4;
const SOUND_PATTERNS = {
  tap: [{ frequency: 420, duration: 0.035, gain: 0.045, type: "triangle" }],
  launch: [
    { frequency: 120, duration: 0.08, gain: 0.055, type: "sawtooth" },
    { frequency: 82, duration: 0.18, gain: 0.04, type: "sawtooth", offset: 0.07 }
  ],
  stage: [
    { frequency: 260, duration: 0.055, gain: 0.055, type: "square" },
    { frequency: 160, duration: 0.07, gain: 0.04, type: "triangle", offset: 0.04 }
  ],
  reward: [
    { frequency: 523, duration: 0.065, gain: 0.055, type: "sine" },
    { frequency: 659, duration: 0.07, gain: 0.055, type: "sine", offset: 0.06 },
    { frequency: 784, duration: 0.11, gain: 0.048, type: "sine", offset: 0.13 }
  ],
  unlock: [
    { frequency: 392, duration: 0.06, gain: 0.05, type: "sine" },
    { frequency: 523, duration: 0.08, gain: 0.055, type: "sine", offset: 0.07 },
    { frequency: 1046, duration: 0.14, gain: 0.04, type: "triangle", offset: 0.16 }
  ],
  error: [
    { frequency: 170, duration: 0.07, gain: 0.052, type: "sawtooth" },
    { frequency: 130, duration: 0.09, gain: 0.045, type: "sawtooth", offset: 0.07 }
  ],
  crash: [
    { frequency: 88, duration: 0.14, gain: 0.075, type: "sawtooth" },
    { frequency: 52, duration: 0.26, gain: 0.055, type: "square", offset: 0.08 }
  ],
  select: [{ frequency: 620, duration: 0.03, gain: 0.035, type: "sine" }]
};

export class FeedbackCenter {
  constructor({ toastRoot, rewardRoot, soundToggle } = {}) {
    this.toastRoot = toastRoot;
    this.rewardRoot = rewardRoot;
    this.soundToggle = soundToggle;
    this.audioContext = null;
    this.masterGain = null;
    this.settings = this.loadSettings();
    this.rewardDismissTimer = 0;
    this.toastId = 0;

    this.bindSoundToggle();
    this.updateSoundToggle();
  }

  loadSettings() {
    try {
      const parsed = JSON.parse(localStorage.getItem(FEEDBACK_SETTINGS_KEY) ?? "{}");
      return { soundEnabled: Boolean(parsed.soundEnabled) };
    } catch {
      return { soundEnabled: false };
    }
  }

  saveSettings() {
    try {
      localStorage.setItem(FEEDBACK_SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {
      // Local storage is optional for browser privacy modes.
    }
  }

  bindSoundToggle() {
    if (!this.soundToggle) return;
    const toggle = (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.settings.soundEnabled = !this.settings.soundEnabled;
      this.saveSettings();
      this.updateSoundToggle();
      this.sound(this.settings.soundEnabled ? "unlock" : "tap");
      this.toast({
        title: this.settings.soundEnabled ? "Sound on" : "Sound off",
        message: this.settings.soundEnabled ? "Launch and reward sounds are enabled." : "Game sounds are muted.",
        tone: "info",
        duration: 2200
      });
    };
    this.soundToggle.addEventListener("click", toggle);
  }

  updateSoundToggle() {
    if (!this.soundToggle) return;
    this.soundToggle.classList.toggle("is-active", this.settings.soundEnabled);
    this.soundToggle.textContent = this.settings.soundEnabled ? "SND On" : "SND Off";
    this.soundToggle.setAttribute("aria-pressed", String(this.settings.soundEnabled));
  }

  handle(event = {}) {
    if (!event || typeof event !== "object") return;
    if (event.toast !== false) this.toast(event);
    if (event.reward) this.reward(event.reward);
    if (event.haptic) this.haptic(event.haptic);
    if (event.sound) this.sound(event.sound);
  }

  tap() {
    this.haptic("light");
    this.sound("tap");
  }

  haptic(type = "light") {
    if (!navigator.vibrate) return;
    if (type === "none") return;
    if (type === "heavy") navigator.vibrate([38, 32, 38]);
    else if (type === "success") navigator.vibrate([18, 30, 42]);
    else if (type === "error") navigator.vibrate([22, 18, 22]);
    else if (type === "medium") navigator.vibrate(26);
    else navigator.vibrate(12);
  }

  toast({ title = "NovaLift", message = "", tone = "info", duration = 3600 } = {}) {
    if (!this.toastRoot) return;
    const toast = document.createElement("article");
    toast.className = `game-toast ${tone}`;
    toast.dataset.toastId = String(++this.toastId);
    toast.innerHTML = `
      <div class="game-toast-icon" aria-hidden="true">${getToastIcon(tone)}</div>
      <div class="game-toast-copy">
        <strong>${escapeHtml(title)}</strong>
        ${message ? `<span>${escapeHtml(message)}</span>` : ""}
      </div>
    `;
    this.toastRoot.prepend(toast);

    while (this.toastRoot.children.length > TOAST_LIMIT) {
      this.toastRoot.lastElementChild?.remove();
    }

    window.setTimeout(() => toast.classList.add("leaving"), Math.max(800, duration));
    window.setTimeout(() => toast.remove(), Math.max(1100, duration + 260));
  }

  reward({ title = "Reward", subtitle = "", stats = [], tone = "success" } = {}) {
    if (!this.rewardRoot) return;
    window.clearTimeout(this.rewardDismissTimer);
    this.rewardRoot.innerHTML = `
      <div class="reward-card ${escapeHtml(tone)}">
        <div class="reward-burst" aria-hidden="true"></div>
        <div class="reward-kicker">Milestone</div>
        <h2>${escapeHtml(title)}</h2>
        ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
        ${stats.length ? `<div class="reward-stats">${stats.map((stat) => `<span>${escapeHtml(stat)}</span>`).join("")}</div>` : ""}
      </div>
    `;
    this.rewardRoot.classList.remove("hidden");
    this.rewardDismissTimer = window.setTimeout(() => this.rewardRoot.classList.add("hidden"), 3800);
  }

  sound(name = "tap") {
    if (!this.settings.soundEnabled) return;
    const pattern = SOUND_PATTERNS[name] ?? SOUND_PATTERNS.tap;
    const context = this.getAudioContext();
    if (!context) return;
    if (context.state === "suspended") context.resume?.();
    const now = context.currentTime;
    pattern.forEach((note) => this.playNote(context, note, now + (note.offset ?? 0)));
  }

  getAudioContext() {
    if (this.audioContext) return this.audioContext;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    this.audioContext = new AudioContextClass();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.42;
    this.masterGain.connect(this.audioContext.destination);
    return this.audioContext;
  }

  playNote(context, note, startTime) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = note.type ?? "sine";
    oscillator.frequency.setValueAtTime(note.frequency, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(24, note.frequency * 0.72), startTime + note.duration);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(note.gain ?? 0.04, startTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + note.duration);
    oscillator.connect(gain);
    gain.connect(this.masterGain);
    oscillator.start(startTime);
    oscillator.stop(startTime + note.duration + 0.03);
  }
}

function getToastIcon(tone) {
  const icons = {
    success: "✓",
    reward: "★",
    warning: "!",
    danger: "×",
    error: "!",
    info: "i",
    launch: "↑"
  };
  return icons[tone] ?? icons.info;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
