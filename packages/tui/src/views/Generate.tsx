import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";

const API = process.env.API_URL ?? "http://localhost:3001";

export default function Generate(props: {
  onStarted: () => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!query.trim() || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const resp = await fetch(`${API}/api/pipeline/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      props.onStarted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setSubmitting(false);
    }
  }

  return (
    <Box flexDirection="column">
      <Text bold>Enter a topic to generate ideas:</Text>
      <Box marginTop={1}>
        <Text color="magenta">&gt; </Text>
        <TextInput
          value={query}
          onChange={setQuery}
          onSubmit={submit}
          placeholder="e.g. B2B tools for restaurants..."
        />
      </Box>
      {submitting && (
        <Text color="yellow" dimColor>
          Starting pipeline...
        </Text>
      )}
      {error && <Text color="red">{error}</Text>}
      <Text color="gray" dimColor>
        Press Enter to start, Esc to cancel
      </Text>
    </Box>
  );
}
