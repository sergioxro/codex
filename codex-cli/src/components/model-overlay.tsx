import TypeaheadOverlay from "./typeahead-overlay.js";
import {
  getAvailableModels,
  RECOMMENDED_MODELS,
} from "../utils/model-utils.js";
import { Box, Text, useInput } from "ink";
import React, { useEffect, useState } from "react";
import { ModelEffort } from "../utils/config.js";

/**
 * Props for <ModelOverlay>.
 *
 * When `hasLastResponse` is true the user has already received at least one
 * assistant response in the current session which means switching models is no
 * longer supported – the overlay should therefore show an error and only allow
 * the user to close it.
 */
type Props = {
  currentModel: string;
  currentEffort?: ModelEffort;
  hasLastResponse: boolean;
  onSelect: (model: string, effort?: ModelEffort) => void;
  onExit: () => void;
};

export default function ModelOverlay({
  currentModel,
  currentEffort,
  hasLastResponse,
  onSelect,
  onExit,
}: Props): JSX.Element {
  const [items, setItems] = useState<Array<{ label: string; value: string }>>(
    [],
  );
  const [showEffortSelect, setShowEffortSelect] = useState(false);
  const [selectedModel, setSelectedModel] = useState(currentModel);

  useEffect(() => {
    (async () => {
      const models = await getAvailableModels();

      // Split the list into recommended and “other” models.
      const recommended = RECOMMENDED_MODELS.filter((m) => models.includes(m));
      const others = models.filter((m) => !recommended.includes(m));

      const ordered = [...recommended, ...others.sort()];

      setItems(
        ordered.map((m) => ({
          label: recommended.includes(m) ? `⭐ ${m}` : m,
          value: m,
        })),
      );
    })();
  }, []);

  const handleModelSelect = (model: string) => {
    setSelectedModel(model);
    if (model.startsWith('o')) {
      setShowEffortSelect(true);
    } else {
      onSelect(model);
    }
  };

  const handleEffortSelect = (value: string) => {
    onSelect(selectedModel, value as ModelEffort);
  };

  // ---------------------------------------------------------------------------
  // If the conversation already contains a response we cannot change the model
  // anymore because the backend requires a consistent model across the entire
  // run.  In that scenario we replace the regular typeahead picker with a
  // simple message instructing the user to start a new chat.  The only
  // available action is to dismiss the overlay (Esc or Enter).
  // ---------------------------------------------------------------------------

  // Always register input handling so hooks are called consistently.
  useInput((_input, key) => {
    if (hasLastResponse && (key.escape || key.return)) {
      onExit();
    }
    if (showEffortSelect && key.escape) {
      setShowEffortSelect(false);
    }
  });

  if (hasLastResponse) {
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="gray"
        width={80}
      >
        <Box paddingX={1}>
          <Text bold color="red">
            Unable to switch model
          </Text>
        </Box>
        <Box paddingX={1}>
          <Text>
            You can only pick a model before the assistant sends its first
            response. To use a different model please start a new chat.
          </Text>
        </Box>
        <Box paddingX={1}>
          <Text dimColor>press esc or enter to close</Text>
        </Box>
      </Box>
    );
  }

  if (showEffortSelect) {
    const effortItems = [
      { label: 'Low Effort', value: 'low' },
      { label: 'Medium Effort', value: 'medium' },
      { label: 'High Effort', value: 'high' },
    ];

    return (
      <TypeaheadOverlay
        title="Select model effort"
        description={
          <Text>
            Current effort: <Text color="greenBright">{currentEffort || 'medium'}</Text>
          </Text>
        }
        initialItems={effortItems}
        currentValue={currentEffort || 'medium'}
        onSelect={handleEffortSelect}
        onExit={() => setShowEffortSelect(false)}
      />
    );
  }

  return (
    <TypeaheadOverlay
      title="Switch model"
      description={
        <Text>
          Current model: <Text color="greenBright">{currentModel}</Text>
          {currentEffort && selectedModel.startsWith('o') && (
            <Text> (Effort: <Text color="greenBright">{currentEffort}</Text>)</Text>
          )}
        </Text>
      }
      initialItems={items}
      currentValue={currentModel}
      onSelect={handleModelSelect}
      onExit={onExit}
    />
  );
}
