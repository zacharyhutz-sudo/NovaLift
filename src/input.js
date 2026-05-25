const ACTION_KEYS = new Map([
  ["KeyW", "thrust"],
  ["ArrowUp", "thrust"],
  ["KeyA", "left"],
  ["ArrowLeft", "left"],
  ["KeyD", "right"],
  ["ArrowRight", "right"],
  ["KeyR", "reset"],
  ["Space", "pause"],
  ["KeyF", "debug"],
  ["KeyX", "stage"],
  ["Enter", "stage"]
]);

const BLOCKED_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Enter"]);

export class Input {
  constructor() {
    this.held = new Set();
    this.pressed = new Set();
    this.pointerActions = new Map();

    window.addEventListener("keydown", (event) => this.handleKeyDown(event));
    window.addEventListener("keyup", (event) => this.handleKeyUp(event));
    window.addEventListener("blur", () => this.clear());
    document.addEventListener("selectstart", (event) => this.preventGameSelection(event));
    document.addEventListener("contextmenu", (event) => this.preventGameSelection(event));

    this.bindTouchControls();
  }

  preventGameSelection(event) {
    if (event.target.closest("#gameShell")) event.preventDefault();
  }

  bindTouchControls() {
    const holdButtons = document.querySelectorAll("[data-hold-action]");
    const pressButtons = document.querySelectorAll("[data-press-action]");

    document.querySelectorAll("button, #gameCanvas").forEach((element) => {
      element.addEventListener("touchstart", (event) => event.preventDefault(), { passive: false });
      element.addEventListener("touchmove", (event) => event.preventDefault(), { passive: false });
    });

    holdButtons.forEach((button) => {
      const action = button.dataset.holdAction;

      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        button.setPointerCapture?.(event.pointerId);
        this.pointerActions.set(event.pointerId, action);
        this.held.add(action);
        button.classList.add("is-active");
      });

      const release = (event) => {
        if (!this.pointerActions.has(event.pointerId)) return;
        event.preventDefault();
        const releasedAction = this.pointerActions.get(event.pointerId);
        this.pointerActions.delete(event.pointerId);
        this.held.delete(releasedAction);
        button.classList.remove("is-active");
      };

      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("lostpointercapture", (event) => {
        const releasedAction = this.pointerActions.get(event.pointerId);
        if (!releasedAction) return;
        this.pointerActions.delete(event.pointerId);
        this.held.delete(releasedAction);
        button.classList.remove("is-active");
      });
    });

    pressButtons.forEach((button) => {
      const action = button.dataset.pressAction;
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        button.setPointerCapture?.(event.pointerId);
        this.pressed.add(action);
        button.classList.add("is-active");
      });
      button.addEventListener("pointerup", (event) => {
        event.preventDefault();
        button.classList.remove("is-active");
      });
      button.addEventListener("pointercancel", () => button.classList.remove("is-active"));
      button.addEventListener("lostpointercapture", () => button.classList.remove("is-active"));
    });
  }

  handleKeyDown(event) {
    const action = ACTION_KEYS.get(event.code);
    if (!action) return;

    if (BLOCKED_KEYS.has(event.code)) event.preventDefault();

    if (!event.repeat) this.pressed.add(action);
    this.held.add(action);
  }

  handleKeyUp(event) {
    const action = ACTION_KEYS.get(event.code);
    if (!action) return;
    event.preventDefault();
    this.held.delete(action);
  }

  isHeld(action) {
    return this.held.has(action);
  }

  consume(action) {
    const didPress = this.pressed.has(action);
    this.pressed.delete(action);
    return didPress;
  }

  clear() {
    this.held.clear();
    this.pressed.clear();
    this.pointerActions.clear();
    document.querySelectorAll(".is-active").forEach((button) => button.classList.remove("is-active"));
  }
}
