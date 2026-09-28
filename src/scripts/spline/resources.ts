const SCENE_URL = "/assets/3d/flooring-07d94fcf.splinecode";

let runtimePromise: Promise<typeof import("@splinetool/runtime")> | undefined;
let scenePromise: Promise<ArrayBuffer> | undefined;

/** Both canvases share downloads, but each decoder receives its own buffer. */
export function loadFlooringResources() {
  runtimePromise ||= import("@splinetool/runtime").catch(error => {
    runtimePromise = undefined;
    throw error;
  });
  scenePromise ||= fetch(SCENE_URL, { cache: "force-cache" })
    .then(response => {
      if (!response.ok) throw new Error(`Scene request failed: ${response.status}`);
      return response.arrayBuffer();
    })
    .catch(error => {
      scenePromise = undefined;
      throw error;
    });

  return Promise.all([runtimePromise, scenePromise]);
}
