// Demo-mode media that must survive a reload: uploaded videos are kept in IndexedDB (a blob: URL dies
// with the page), and each uploaded reel gets a poster frame so it shows something before it decodes.

const DB_NAME = "socialverse-media";
const STORE = "files";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveMedia(key: string, blob: Blob): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function loadMedia(key: string): Promise<Blob | null> {
  const db = await openDb();
  try {
    return await new Promise<Blob | null>((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as Blob) ?? null);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

/** JPEG data URL of the first frame of a video file, or null if the browser cannot decode it. */
export function makePoster(file: File, width = 360): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(null), 5000);
    video.onerror = () => finish(null);
    video.onloadedmetadata = () => {
      // Not the very first frame: uploaded clips often start black, and that black would become the poster.
      video.currentTime = Math.min(1, (video.duration || 0) / 2 || 0.1);
    };
    video.onseeked = () => {
      try {
        const h = Math.round((width * video.videoHeight) / (video.videoWidth || width));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = h || width;
        canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
        finish(canvas.toDataURL("image/jpeg", 0.7));
      } catch {
        finish(null);
      }
    };
    video.src = url;
  });
}
