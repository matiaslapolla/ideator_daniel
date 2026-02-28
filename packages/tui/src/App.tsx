import React, { useState } from "react";
import { Box, Text, useInput, useApp } from "ink";
import Dashboard from "./views/Dashboard";
import Generate from "./views/Generate";
import IdeaDetailView from "./views/IdeaDetail";
import PipelineView from "./views/PipelineView";

type View = "dashboard" | "generate" | "pipeline" | "detail";

export default function App() {
  const { exit } = useApp();
  const [view, setView] = useState<View>("dashboard");
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);

  useInput((input, key) => {
    if (input === "q" && view === "dashboard") {
      exit();
    }
    if (input === "n" && view === "dashboard") {
      setView("generate");
    }
    if (key.escape) {
      if (view === "detail" || view === "pipeline") setView("dashboard");
      if (view === "generate") setView("dashboard");
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="magenta">
          Ideator
        </Text>
        <Text color="gray"> — AI Idea Generator</Text>
      </Box>

      {view === "dashboard" && (
        <Dashboard
          onSelect={(id) => {
            setSelectedIdeaId(id);
            setView("detail");
          }}
          onGenerate={() => setView("generate")}
        />
      )}
      {view === "generate" && (
        <Generate
          onStarted={() => setView("pipeline")}
          onCancel={() => setView("dashboard")}
        />
      )}
      {view === "pipeline" && (
        <PipelineView onDone={() => setView("dashboard")} />
      )}
      {view === "detail" && selectedIdeaId && (
        <IdeaDetailView
          ideaId={selectedIdeaId}
          onBack={() => setView("dashboard")}
        />
      )}

      <Box marginTop={1}>
        <Text color="gray" dimColor>
          {view === "dashboard"
            ? "n=new  Enter=view  q=quit"
            : "Esc=back"}
        </Text>
      </Box>
    </Box>
  );
}
