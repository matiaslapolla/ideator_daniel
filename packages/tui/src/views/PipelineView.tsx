import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";

const PHASES = ["discovery", "research", "analysis", "validation", "output"];

interface PipelineEvent {
  phase: string;
  status: string;
  message: string;
}

const API = process.env.API_URL ?? "http://localhost:3001";

export default function PipelineView(props: { onDone: () => void }) {
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [currentPhase, setCurrentPhase] = useState<string>("discovery");
  const [status, setStatus] = useState<string>("running");

  useEffect(() => {
    const wsUrl = API.replace("http", "ws") + "/ws/pipeline";
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.phase) setCurrentPhase(data.phase);
        if (data.status) setStatus(data.status);
        if (data.message) {
          setEvents((prev) => [
            ...prev,
            {
              phase: data.phase,
              status: data.status,
              message: data.message,
            },
          ]);
        }
      } catch {}
    };

    return () => ws.close();
  }, []);

  useInput((input, key) => {
    if (
      (key.return || key.escape) &&
      (status === "completed" || status === "failed")
    ) {
      props.onDone();
    }
  });

  return (
    <Box flexDirection="column">
      <Text bold>Pipeline Running</Text>

      {/* Phase indicators */}
      <Box marginTop={1} gap={1}>
        {PHASES.map((phase) => {
          const idx = PHASES.indexOf(currentPhase);
          const phaseIdx = PHASES.indexOf(phase);
          const isActive = phase === currentPhase;
          const isDone = phaseIdx < idx || status === "completed";

          return (
            <Text
              key={phase}
              color={isDone ? "green" : isActive ? "magenta" : "gray"}
              bold={isActive}
            >
              {isDone ? "[x]" : isActive ? "[>]" : "[ ]"} {phase}
            </Text>
          );
        })}
      </Box>

      {/* Status */}
      <Box marginTop={1}>
        {status === "running" && (
          <Text color="magenta">
            <Spinner type="dots" />{" "}
            {events.length > 0
              ? events[events.length - 1].message
              : "Starting..."}
          </Text>
        )}
        {status === "completed" && (
          <Text color="green" bold>
            Pipeline complete! Press Enter to view results.
          </Text>
        )}
        {status === "failed" && (
          <Text color="red" bold>
            Pipeline failed.{" "}
            {events.length > 0 ? events[events.length - 1].message : ""}
          </Text>
        )}
      </Box>

      {/* Recent events */}
      <Box flexDirection="column" marginTop={1}>
        {events.slice(-8).map((event, i) => (
          <Box key={i}>
            <Text color="magenta" dimColor>
              [{event.phase}]{" "}
            </Text>
            <Text color="gray">{event.message}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
