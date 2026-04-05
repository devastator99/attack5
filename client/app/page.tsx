"use client";

import { useEffect, useRef } from "react";

export default function Recorder() {
  const workerRef = useRef<Worker | null>(null);
  const chunkIndexRef = useRef(0);
  const sessionId = "session-" + Date.now();

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../workers/upload.worker.ts", import.meta.url)
    );

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = async (event:any) => {
      const blob = event.data;

      const checksum = await sha256(blob);

      workerRef.current?.postMessage({
        blob,
        sessionId,
        chunkIndex: chunkIndexRef.current++,
        checksum,
      });
    };

    mediaRecorder.start(5000); // 5 sec chunks
  }

  return <button onClick={startRecording}>Start</button>;
}

// simple checksum helper
async function sha256(blob: Blob) {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}