// Color inversion (menu toggle). The whole page is inverted with a CSS filter; images and videos are
// inverted back so photos keep their real colours. Stored on this device only.
const KEY = "socialverse-color-invert";
const CLASS = "sv-invert";

export function isColorInverted(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains(CLASS);
}

export function setColorInverted(on: boolean) {
  document.documentElement.classList.toggle(CLASS, on);
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* storage unavailable: the choice lasts for this page only */
  }
}

// Applied on load (the main page only; swipe-preview pages inherit the inversion from the page
// around them, so they must not invert again).
export function applyStoredColorInvert() {
  if (document.documentElement.hasAttribute("data-embed")) return;
  let on = false;
  try {
    on = localStorage.getItem(KEY) === "1";
  } catch {
    on = false;
  }
  document.documentElement.classList.toggle(CLASS, on);
}
