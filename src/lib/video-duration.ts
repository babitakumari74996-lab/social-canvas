// Some clips (for example webm files from a recorder) do not store their length in the file header, so the
// browser reports duration = Infinity and the seek bar shows 0:00. For those, jump to the end once (the browser
// then learns the real length), go back to where the video was, and report the length.
// Returns a cleanup function.
// getStart (optional): if it returns a time, that time is used after the probe instead of the old position,
// so a start point chosen by the page (for example from another screen) is not overwritten.
export function listenDuration(
  el: HTMLVideoElement,
  onDuration?: (seconds: number) => void,
  getStart?: () => number | undefined,
): () => void {
  let fixing = false;
  let savedTime = 0;
  let wasPaused = true;

  const report = () => {
    if (Number.isFinite(el.duration) && el.duration > 0) onDuration?.(el.duration);
  };

  const onMeta = () => {
    if (Number.isFinite(el.duration) && el.duration > 0) {
      report();
      return;
    }
    if (fixing) return;
    fixing = true;
    savedTime = el.currentTime;
    wasPaused = el.paused;
    el.pause();
    el.currentTime = 1e101;
  };

  const onDurationChange = () => {
    if (fixing && Number.isFinite(el.duration) && el.duration > 0) {
      fixing = false;
      const start = getStart?.();
      el.currentTime = start !== undefined ? start : savedTime;
      if (!wasPaused) el.play().catch(() => {});
      report();
      return;
    }
    report();
  };

  el.addEventListener("loadedmetadata", onMeta);
  el.addEventListener("durationchange", onDurationChange);
  onMeta();

  return () => {
    el.removeEventListener("loadedmetadata", onMeta);
    el.removeEventListener("durationchange", onDurationChange);
  };
}
