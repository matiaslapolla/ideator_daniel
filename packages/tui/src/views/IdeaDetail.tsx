import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";

interface IdeaFull {
  id: string;
  name: string;
  description: string;
  complexity: {
    overall: number;
    technical: number;
    market: number;
    capital: number;
    explanation: string;
  };
  targetClients: Array<{
    segment: string;
    size: string;
    industry: string;
    painPoints: string[];
  }>;
  clientContacts: Array<{
    companyName: string;
    website: string;
    reasoning: string;
  }>;
  marketingFunnels: Array<{
    name: string;
    estimatedCost: string;
    timeToFirstLead: string;
    stages: Array<{ name: string; description: string }>;
  }>;
}

const API = process.env.API_URL ?? "http://localhost:3001";

export default function IdeaDetailView(props: {
  ideaId: string;
  onBack: () => void;
}) {
  const [idea, setIdea] = useState<IdeaFull | null>(null);
  const [section, setSection] = useState(0);

  useEffect(() => {
    fetch(`${API}/api/ideas/${props.ideaId}`)
      .then((r) => r.json())
      .then(setIdea)
      .catch(() => {});
  }, [props.ideaId]);

  useInput((input, key) => {
    if (key.escape) props.onBack();
    if (key.tab || key.rightArrow)
      setSection((s) => Math.min(s + 1, 3));
    if (key.leftArrow) setSection((s) => Math.max(s - 1, 0));
  });

  if (!idea) return <Text color="gray">Loading...</Text>;

  const sections = ["Overview", "Clients", "Contacts", "Funnels"];

  return (
    <Box flexDirection="column">
      <Text bold color="white">
        {idea.name}
      </Text>
      <Text color="gray" wrap="wrap">
        {idea.description}
      </Text>

      {/* Section tabs */}
      <Box marginTop={1} gap={2}>
        {sections.map((s, i) => (
          <Text
            key={s}
            color={i === section ? "magenta" : "gray"}
            bold={i === section}
            underline={i === section}
          >
            {s}
          </Text>
        ))}
      </Box>

      <Box marginTop={1} flexDirection="column">
        {section === 0 && (
          <>
            <Text>
              Complexity: {idea.complexity.overall}/10 (T:
              {idea.complexity.technical} M:{idea.complexity.market} C:
              {idea.complexity.capital})
            </Text>
            <Text color="gray" wrap="wrap">
              {idea.complexity.explanation}
            </Text>
          </>
        )}

        {section === 1 &&
          idea.targetClients.map((c, i) => (
            <Box key={i} flexDirection="column" marginBottom={1}>
              <Text bold>
                {c.segment} ({c.industry}, {c.size})
              </Text>
              {c.painPoints.map((p, j) => (
                <Text key={j} color="gray">
                  • {p}
                </Text>
              ))}
            </Box>
          ))}

        {section === 2 &&
          idea.clientContacts.map((c, i) => (
            <Box key={i} flexDirection="column" marginBottom={1}>
              <Text bold>{c.companyName}</Text>
              <Text color="cyan">{c.website}</Text>
              <Text color="gray">{c.reasoning}</Text>
            </Box>
          ))}

        {section === 3 &&
          idea.marketingFunnels.map((f, i) => (
            <Box key={i} flexDirection="column" marginBottom={1}>
              <Text bold>
                {f.name} — {f.estimatedCost}, {f.timeToFirstLead}
              </Text>
              {f.stages.map((s, j) => (
                <Text key={j} color="gray">
                  {j + 1}. {s.name}: {s.description}
                </Text>
              ))}
            </Box>
          ))}
      </Box>

      <Text color="gray" dimColor>
        Tab/Arrow=switch section Esc=back
      </Text>
    </Box>
  );
}
