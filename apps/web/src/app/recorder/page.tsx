"use client"

import { useCallback, useRef, useState, useEffect } from "react"
import { Download, Mic, Pause, Play, Square, Trash2 } from "lucide-react"

import { Button } from "@my-better-t-app/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@my-better-t-app/ui/components/card"
import { LiveWaveform } from "@/components/ui/live-waveform"
import { useRecorder, type WavChunk } from "@/hooks/use-recorder"
import { sha256 } from "@/lib/checksum"

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 10)
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${ms}`
}

function formatDuration(seconds: number) {
  return `${seconds.toFixed(1)}s`
}

function ChunkRow({ chunk, index, isUploading }: { chunk: WavChunk; index: number; isUploading?: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)

  const toggle = () => {
    const el = audioRef.current
    if (!el) return
    if (playing) {
      el.pause()
      el.currentTime = 0
      setPlaying(false)
    } else {
      el.play()
      setPlaying(true)
    }
  }

  const download = () => {
    const a = document.createElement("a")
    a.href = chunk.url
    a.download = `chunk-${index + 1}.wav`
    a.click()
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-sm border border-border/50 bg-muted/30 px-3 py-2">
      <audio
        ref={audioRef}
        src={chunk.url}
        onEnded={() => setPlaying(false)}
        preload="none"
      />
      <span className="text-xs font-medium text-muted-foreground tabular-nums">
        #{index + 1}
      </span>
      <span className="text-xs tabular-nums">{formatDuration(chunk.duration)}</span>
      <span className="text-[10px] text-muted-foreground">16kHz PCM</span>
      {isUploading && (
        <span className="text-[10px] text-amber-600 font-medium">Uploading...</span>
      )}
      <div className="ml-auto flex gap-1">
        <Button variant="ghost" size="icon-xs" onClick={toggle}>
          {playing ? <Square className="size-3" /> : <Play className="size-3" />}
        </Button>
        <Button variant="ghost" size="icon-xs" onClick={download}>
          <Download className="size-3" />
        </Button>
      </div>
    </div>
  )
}

export default function RecorderPage() {
  const [deviceId] = useState<string | undefined>()
  const { status, start, stop, pause, resume, chunks, elapsed, stream, clearChunks } =
    useRecorder({ chunkDuration: 5, deviceId })
  
  const sessionIdRef = useRef<string>("")
  const [uploadingChunks, setUploadingChunks] = useState<Set<string>>(new Set())

  // Initialize upload worker
  useEffect(() => {
    if (typeof window === "undefined") return

    // Create session ID on component mount
    sessionIdRef.current = `session-${Date.now()}`
    console.log("[Recorder] Session ID:", sessionIdRef.current)
  }, [])

  // Send chunks to server when they're created
  useEffect(() => {
    chunks.forEach(async (chunk) => {
      if (uploadingChunks.has(chunk.id)) return

      try {
        setUploadingChunks((prev) => new Set(prev).add(chunk.id))

        const checksum = await sha256(chunk.blob)
        const chunkIndex = chunks.indexOf(chunk)

        console.log(
          `[Recorder] Uploading chunk ${chunkIndex}:`,
          chunk.id
        )

        const formData = new FormData()
        formData.append("file", chunk.blob)
        formData.append("sessionId", sessionIdRef.current)
        formData.append("chunkIndex", String(chunkIndex))
        formData.append("checksum", checksum)

        const apiUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000"
        const res = await fetch(`${apiUrl}/api/upload`, {
          method: "POST",
          body: formData,
        })

        if (!res.ok) {
          throw new Error(`Upload failed: ${res.status}`)
        }

        const data = await res.json()
        console.log("[Recorder] Chunk uploaded:", data)

        setUploadingChunks((prev) => {
          const next = new Set(prev)
          next.delete(chunk.id)
          return next
        })
      } catch (e) {
        console.error("[Recorder] Failed to upload chunk:", e)
        setUploadingChunks((prev) => {
          const next = new Set(prev)
          next.delete(chunk.id)
          return next
        })
      }
    })
  }, [chunks])

  const isRecording = status === "recording"
  const isPaused = status === "paused"
  const isActive = isRecording || isPaused

  const handlePrimary = useCallback(() => {
    if (isActive) {
      stop()
    } else {
      start()
    }
  }, [isActive, stop, start])

  return (
    <div className="container mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Recorder</CardTitle>
          <CardDescription>16 kHz / 16-bit PCM WAV — chunked every 5 s</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          {/* Waveform */}
          <div className="overflow-hidden rounded-sm border border-border/50 bg-muted/20 text-foreground">
            <LiveWaveform
              active={isRecording}
              processing={isPaused}
              stream={stream}
              height={80}
              barWidth={3}
              barGap={1}
              barRadius={2}
              sensitivity={1.8}
              smoothingTimeConstant={0.85}
              fadeEdges
              fadeWidth={32}
              mode="static"
            />
          </div>

          {/* Timer */}
          <div className="text-center font-mono text-3xl tabular-nums tracking-tight">
            {formatTime(elapsed)}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            {/* Record / Stop */}
            <Button
              size="lg"
              variant={isActive ? "destructive" : "default"}
              className="gap-2 px-5"
              onClick={handlePrimary}
              disabled={status === "requesting"}
            >
              {isActive ? (
                <>
                  <Square className="size-4" />
                  Stop
                </>
              ) : (
                <>
                  <Mic className="size-4" />
                  {status === "requesting" ? "Requesting..." : "Record"}
                </>
              )}
            </Button>

            {/* Pause / Resume */}
            {isActive && (
              <Button
                size="lg"
                variant="outline"
                className="gap-2"
                onClick={isPaused ? resume : pause}
              >
                {isPaused ? (
                  <>
                    <Play className="size-4" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="size-4" />
                    Pause
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chunks */}
      {chunks.length > 0 && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Chunks</CardTitle>
            <CardDescription>
              {chunks.length} recorded
              {uploadingChunks.size > 0 && ` • ${uploadingChunks.size} uploading`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {chunks.map((chunk, i) => (
              <ChunkRow
                key={chunk.id}
                chunk={chunk}
                index={i}
                isUploading={uploadingChunks.has(chunk.id)}
              />
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 gap-1.5 self-end text-destructive"
              onClick={clearChunks}
            >
              <Trash2 className="size-3" />
              Clear all
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
