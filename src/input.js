const ACTION_KEYS = new Map([
  ["KeyW", "thrust"],
  ["ArrowUp", "thrust"],
  ["KeyA", "left"],
  ["ArrowLeft", "left"],
  ["KeyD", "right"],
  ["ArrowRight", "right"],
  ["KeyR", "reset"],
  ["Space", "pause"],
  ["KeyF", "debug"]
]);

const BLOCKED_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"]);

export class Input {
  constructor() {
    this.held = new Set();
    this.pressed = new Set();
    this.pointerActions = new Map();

    window.addEventListener("keydown", (event) => this.handleKeyDown(event));
    window.addEventListener("keyup", (event) => this.handleKeyUp(event));
    window.addEventListener("blur", () => this.clear());

    this.bindTouchControls();
  }

  bindTouchControls() {
    const holdButtons = document.querySelectorAll("[data-hold-action]");
    const pressButtons = document.querySelectorAll("[data-press-action]");

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
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this.pressed.add(action);
      });
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
