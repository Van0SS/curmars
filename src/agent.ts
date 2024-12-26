import OpenAI from "openai";

interface GameState {
  resources: {
    oxygen: number;
    water: number;
    temperature: number;
    energy: number;
  };
  credits: number;
  upgrades: Array<{
    id: string;
    name: string;
    cost: number;
    resourceType: string;
    multiplier: number;
    purchased: boolean;
  }>;
  gameWon: boolean;
  gameLost: boolean;
  criticalTimer: number | null;
}

type GameAction = {
  type: "generate" | "purchase";
  target: string;
};

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

const SYSTEM_PROMPT = `You are an AI agent playing a Mars terraforming game. Your goal is to terraform Mars by managing resources efficiently.

WIN CONDITIONS:
- Oxygen: 100%
- Water: 100%
- Temperature: 15°C or higher

CRITICAL FAILURE CONDITIONS:
- Any resource (oxygen, water, energy) drops below 5% for 30 seconds
- Temperature doesn't affect critical failure

RESOURCE MECHANICS:
1. Energy:
   - Required for all actions except energy generation
   - Each action costs 10 energy
   - Naturally drains over time
   - Generate energy without energy cost

2. Resources Generation:
   - Base gains per action:
     * Oxygen: 3%
     * Water: 3%
     * Temperature: 0.3°C
     * Energy: 8%
   - All gains affected by energy efficiency (current energy / 100)
   - Resources drain over time

3. Upgrades:
   - Permanently multiply resource generation
   - Cost credits
   - Can't be refunded
   - Stack multiplicatively

STRATEGY TIPS:
- Keep energy above 20% for safety
- Prioritize energy upgrades early
- Buy upgrades when safe
- Balance resource generation

Respond with a JSON object containing an "actions" array with exactly 10 actions:
{
  "actions": [
    "generate:energy",
    "generate:oxygen",
    "purchase:oxygen1",
    ...
  ]
}

Available actions:
- generate:energy
- generate:oxygen
- generate:water
- generate:temperature
- purchase:[upgradeId]`;

export class GameAgent {
  private openai: OpenAI;
  private messageHistory: Message[] = [];

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true,
    });
    this.messageHistory = [{ role: "system", content: SYSTEM_PROMPT }];
  }

  async getNextActions(gameState: GameState): Promise<GameAction[]> {
    try {
      const stateMessage = this.formatGameState(gameState);

      // Add new state message
      this.messageHistory.push({ role: "user", content: stateMessage });

      // Keep only last 100 messages
      if (this.messageHistory.length > 100) {
        this.messageHistory = [
          this.messageHistory[0], // Keep system prompt
          ...this.messageHistory.slice(-99), // Keep last 99 messages
        ];
      }

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-2024-11-20",
        messages: this.messageHistory,
        temperature: 0.2,
        max_tokens: 500,
        response_format: { type: "json_object" },
      });

      const actionsText = response.choices[0]?.message?.content;
      if (!actionsText) {
        return this.getDefaultActions();
      }

      // Add agent's response to history
      this.messageHistory.push({
        role: "assistant",
        content: actionsText,
      });

      try {
        const parsedResponse = JSON.parse(actionsText);
        if (
          Array.isArray(parsedResponse.actions) &&
          parsedResponse.actions.length === 10
        ) {
          return parsedResponse.actions.map((action: string) =>
            this.parseAction(action)
          );
        }
      } catch (e) {
        console.error("Failed to parse actions:", e);
      }

      return this.getDefaultActions();
    } catch (error) {
      console.error("OpenAI API error:", error);
      return this.getDefaultActions();
    }
  }

  private formatGameState(state: GameState): string {
    const purchasedUpgrades = state.upgrades
      .filter((u) => u.purchased)
      .map((u) => `${u.id} (${u.multiplier}x ${u.resourceType})`);

    return `Current Game State:

RESOURCES:
- Oxygen: ${state.resources.oxygen.toFixed(1)}%
- Water: ${state.resources.water.toFixed(1)}%
- Temperature: ${state.resources.temperature.toFixed(1)}°C
- Energy: ${state.resources.energy.toFixed(1)}%

Credits: ${state.credits}
Critical Timer: ${
      state.criticalTimer !== null
        ? `${state.criticalTimer}s remaining!`
        : "safe"
    }

AVAILABLE UPGRADES:
${state.upgrades
  .filter((u) => !u.purchased)
  .map(
    (u) =>
      `- ${u.id}: ${u.name} (Cost: ${u.cost}, ${u.multiplier}x ${u.resourceType})`
  )
  .join("\n")}

PURCHASED UPGRADES:
${purchasedUpgrades.length > 0 ? purchasedUpgrades.join("\n") : "None"}

Analyze the situation and provide exactly 10 actions to execute in the next 10 seconds.
Prioritize preventing critical failure and maintaining energy levels.`;
  }

  private parseAction(actionStr: string): GameAction {
    const [type, target] = actionStr.split(":");
    if (type === "generate" || type === "purchase") {
      return { type, target };
    }
    return { type: "generate", target: "energy" }; // Default action
  }

  private getDefaultActions(): GameAction[] {
    // Safe default actions focusing on maintaining energy and oxygen
    return Array(10)
      .fill(null)
      .map((_, i) =>
        i % 3 === 0
          ? { type: "generate", target: "energy" }
          : i % 3 === 1
          ? { type: "generate", target: "oxygen" }
          : { type: "generate", target: "water" }
      );
  }
}
