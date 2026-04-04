/**
 * ARISE: VISION WORKER
 * Isolates MediaPipe inference to a separate thread
 */
import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

let poseLandmarker: any;

const init = async () => {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU"
        },
        runningMode: "VIDEO",
        numPoses: 1
    });
    self.postMessage({ type: "LOADED" });
};

self.onmessage = async (e) => {
    if (e.data.type === "INIT") await init();
    if (e.data.type === "DETECT" && poseLandmarker) {
        const result = poseLandmarker.detectForVideo(e.data.payload.image, e.data.payload.timestamp);
        self.postMessage({ type: "RESULT", payload: result });
    }
};
