import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";

const API = process.env.API_URL ?? "http://localhost:3001";

const DOMAINS = [
  { label: "Any domain", value: "" },
  { label: "SaaS", value: "SaaS" },
  { label: "Fintech", value: "Fintech" },
  { label: "Health", value: "Health" },
  { label: "Education", value: "Education" },
  { label: "E-commerce", value: "E-commerce" },
  { label: "DevTools", value: "DevTools" },
  { label: "AI/ML", value: "AI/ML" },
  { label: "Marketplace", value: "Marketplace" },
  { label: "Social", value: "Social" },
  { label: "Gaming", value: "Gaming" },
  { label: "Sustainability", value: "Sustainability" },
];

type Step = "query" | "domain" | "creativity" | "custom-sources" | "confirm";

export default function Generate(props: {
  onStarted: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<Step>("query");
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("");
  const [creativity, setCreativity] = useState("50");
  const [subreddits, setSubreddits] = useState("");
  const [rssFeeds, setRssFeeds] = useState("");
  const [onlyCustomSources, setOnlyCustomSources] = useState(false);
  const [customStep, setCustomStep] = useState<"subreddits" | "rss" | "only">("subreddits");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useInput((_input, key) => {
    if (key.escape) {
      if (step === "query") props.onCancel();
      else if (step === "domain") setStep("query");
      else if (step === "creativity") setStep("domain");
      else if (step === "custom-sources") setStep("creativity");
      else if (step === "confirm") setStep("custom-sources");
    }
  });

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const creativityNum = Math.max(0, Math.min(100, Number(creativity) || 50));

    try {
      const subs = subreddits.split(",").map(s => s.trim()).filter(Boolean);
      const feeds = rssFeeds.split(",").map(s => s.trim()).filter(Boolean);
      const customSources = (subs.length || feeds.length)
        ? { redditSubreddits: subs.length ? subs : undefined, rssFeeds: feeds.length ? feeds : undefined }
        : undefined;

      const resp = await fetch(`${API}/api/pipeline/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          domain: domain || undefined,
          creativity: creativityNum,
          customSources,
          onlyCustomSources: onlyCustomSources || undefined,
        }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      props.onStarted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setSubmitting(false);
    }
  }

  if (step === "query") {
    return (
      <Box flexDirection="column">
        <Text bold>Step 1/5 — Enter a topic to generate ideas:</Text>
        <Box marginTop={1}>
          <Text color="magenta">&gt; </Text>
          <TextInput
            value={query}
            onChange={setQuery}
            onSubmit={() => {
              if (query.trim()) setStep("domain");
            }}
            placeholder="e.g. B2B tools for restaurants..."
          />
        </Box>
        <Text color="gray" dimColor>
          Enter to continue, Esc to cancel
        </Text>
      </Box>
    );
  }

  if (step === "domain") {
    return (
      <Box flexDirection="column">
        <Text bold>Step 2/5 — Select a domain focus:</Text>
        <Box marginTop={1}>
          <SelectInput
            items={DOMAINS}
            onSelect={(item) => {
              setDomain(item.value);
              setStep("creativity");
            }}
          />
        </Box>
        <Text color="gray" dimColor>
          Enter to select, Esc to go back
        </Text>
      </Box>
    );
  }

  if (step === "creativity") {
    return (
      <Box flexDirection="column">
        <Text bold>Step 3/5 — Set creativity level (0-100, default 50):</Text>
        <Box marginTop={1}>
          <Text color="magenta">&gt; </Text>
          <TextInput
            value={creativity}
            onChange={setCreativity}
            onSubmit={() => setStep("custom-sources")}
            placeholder="50"
          />
        </Box>
        <Text color="gray" dimColor>
          Enter to continue, Esc to go back
        </Text>
      </Box>
    );
  }

  if (step === "custom-sources") {
    if (customStep === "subreddits") {
      return (
        <Box flexDirection="column">
          <Text bold>Step 4/5 — Custom subreddits (comma-separated, optional):</Text>
          <Box marginTop={1}>
            <Text color="magenta">&gt; </Text>
            <TextInput
              value={subreddits}
              onChange={setSubreddits}
              onSubmit={() => setCustomStep("rss")}
              placeholder="e.g. startups, SaaS, smallbusiness"
            />
          </Box>
          <Text color="gray" dimColor>
            Enter to continue (leave empty to skip), Esc to go back
          </Text>
        </Box>
      );
    }
    if (customStep === "rss") {
      return (
        <Box flexDirection="column">
          <Text bold>Step 4/5 — Custom RSS feeds (comma-separated URLs, optional):</Text>
          <Box marginTop={1}>
            <Text color="magenta">&gt; </Text>
            <TextInput
              value={rssFeeds}
              onChange={setRssFeeds}
              onSubmit={() => {
                const hasSubs = subreddits.split(",").some(s => s.trim());
                const hasFeeds = rssFeeds.split(",").some(s => s.trim());
                if (hasSubs || hasFeeds) {
                  setCustomStep("only");
                } else {
                  setCustomStep("subreddits");
                  setStep("confirm");
                }
              }}
              placeholder="e.g. https://example.com/feed.xml"
            />
          </Box>
          <Text color="gray" dimColor>
            Enter to continue (leave empty to skip), Esc to go back
          </Text>
        </Box>
      );
    }
    // "only" sub-step
    return (
      <Box flexDirection="column">
        <Text bold>Step 4/5 — Only use your custom sources? (skip all defaults)</Text>
        <Box marginTop={1}>
          <SelectInput
            items={[
              { label: "No — add to defaults", value: "no" },
              { label: "Yes — only my sources", value: "yes" },
            ]}
            onSelect={(item) => {
              setOnlyCustomSources(item.value === "yes");
              setCustomStep("subreddits");
              setStep("confirm");
            }}
          />
        </Box>
        <Text color="gray" dimColor>
          Enter to select, Esc to go back
        </Text>
      </Box>
    );
  }

  // confirm step
  const creativityDisplay = Math.max(0, Math.min(100, Number(creativity) || 50));
  return (
    <Box flexDirection="column">
      <Text bold>Step 5/5 — Confirm and start pipeline:</Text>
      <Box marginTop={1} flexDirection="column">
        <Text>  Query:      <Text color="cyan">{query}</Text></Text>
        <Text>  Domain:     <Text color="cyan">{domain || "Any"}</Text></Text>
        <Text>  Creativity: <Text color="cyan">{creativityDisplay}</Text></Text>
        {subreddits.trim() && <Text>  Subreddits: <Text color="cyan">{subreddits.trim()}</Text></Text>}
        {rssFeeds.trim() && <Text>  RSS Feeds:  <Text color="cyan">{rssFeeds.trim()}</Text></Text>}
        {onlyCustomSources && <Text>  <Text color="yellow">Only custom sources (defaults skipped)</Text></Text>}
      </Box>
      {submitting && (
        <Text color="yellow" dimColor>
          Starting pipeline...
        </Text>
      )}
      {error && <Text color="red">{error}</Text>}
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Enter to start, Esc to go back
        </Text>
      </Box>
      <Box>
        <TextInput
          value=""
          onChange={() => {}}
          onSubmit={submit}
        />
      </Box>
    </Box>
  );
}
