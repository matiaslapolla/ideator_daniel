import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";

interface Idea {
  id: string;
  name: string;
  description: string;
  complexity: { overall: number };
  createdAt: string;
}

const API = process.env.API_URL ?? "http://localhost:3001";

export default function Dashboard(props: {
  onSelect: (id: string) => void;
  onGenerate: () => void;
}) {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/ideas?limit=20`)
      .then((r) => r.json())
      .then((data: { ideas: Idea[] }) => {
        setIdeas(data.ideas);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useInput((input, key) => {
    if (key.upArrow && cursor > 0) setCursor(cursor - 1);
    if (key.downArrow && cursor < ideas.length - 1) setCursor(cursor + 1);
    if (key.return && ideas[cursor]) {
      props.onSelect(ideas[cursor].id);
    }
  });

  if (loading) return <Text color="gray">Loading ideas...</Text>;

  if (ideas.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">No ideas generated yet.</Text>
        <Text color="gray">Press 'n' to generate new ideas.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold color="white" underline>
        Generated Ideas ({ideas.length})
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {ideas.map((idea, i) => (
          <Box key={idea.id}>
            <Text color={i === cursor ? "magenta" : "gray"}>
              {i === cursor ? ">" : " "}{" "}
            </Text>
            <Text color={i === cursor ? "white" : "gray"} bold={i === cursor}>
              {idea.name}
            </Text>
            <Text color="gray"> — </Text>
            <ComplexityLabel score={idea.complexity.overall} />
            <Text color="gray" dimColor>
              {" "}
              {idea.description.slice(0, 50)}...
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function ComplexityLabel(props: { score: number }) {
  const color =
    props.score <= 3 ? "green" : props.score <= 6 ? "yellow" : "red";
  return <Text color={color}>[{props.score}/10]</Text>;
}
