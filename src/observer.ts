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

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

type GameHistory = {
  timestamp: number;
  resources: {
    oxygen: number;
    water: number;
    temperature: number;
    energy: number;
  };
  credits: number;
  purchasedUpgrades: string[];
  criticalTimer: number | null;
};

const SYSTEM_PROMPT = `You are an expert observer analyzing a Mars terraforming game. Your role is to provide insightful feedback about the current game state, trends, and strategy.

Analyze:
1. Resource Management
   - Balance between resources
   - Energy efficiency
   - Critical situations
   - Resource trends over time
   
2. Economy
   - Credit spending patterns
   - Upgrade choices and timing
   - Investment efficiency

3. Strategy
   - Current approach effectiveness
   - Adaptation to challenges
   - Risk management
   - Progress towards goals

You must respond with a JSON object in this exact format:
{
  "analysis": {
    "strengths": ["point1", "point2"],
    "concerns": ["point1", "point2"],
    "suggestions": ["point1", "point2"]
  }
}

Keep each point brief and specific. Focus on trends and patterns that could impact success. Remember to always format your response as a valid JSON object.`;

export class GameObserver {
  private openai: OpenAI;
  private messageHistory: Message[] = [];
  private gameHistory: GameHistory[] = [];
  private lastAnalysisTime: number = 0;
  private readonly ANALYSIS_INTERVAL = 10000; // 10 seconds

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true,
    });
    this.messageHistory = [{ role: "system", content: SYSTEM_PROMPT }];
  }

  async getAnalysis(gameState: GameState): Promise<{
    strengths: string[];
    concerns: string[];
    suggestions: string[];
  }> {
    const currentTime = Date.now();

    // Add state to history
    this.gameHistory.push({
      timestamp: currentTime,
      resources: { ...gameState.resources },
      credits: gameState.credits,
      purchasedUpgrades: gameState.upgrades
        .filter((u) => u.purchased)
        .map((u) => u.id),
      criticalTimer: gameState.criticalTimer,
    });

    // Keep last 5 minutes of history
    const fiveMinutesAgo = currentTime - 5 * 60 * 1000;
    this.gameHistory = this.gameHistory.filter(
      (h) => h.timestamp > fiveMinutesAgo
    );

    // Only analyze if enough time has passed
    if (currentTime - this.lastAnalysisTime < this.ANALYSIS_INTERVAL) {
      return this.getDefaultAnalysis();
    }
    this.lastAnalysisTime = currentTime;

    try {
      const stateMessage = this.formatGameStateWithHistory(gameState);

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
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: "json_object" },
      });

      const analysisText = response.choices[0]?.message?.content;
      if (!analysisText) {
        return this.getDefaultAnalysis();
      }

      // Add observer's response to history
      this.messageHistory.push({
        role: "assistant",
        content: analysisText,
      });

      try {
        const parsedResponse = JSON.parse(analysisText);
        if (parsedResponse.analysis) {
          return {
            strengths: parsedResponse.analysis.strengths || [],
            concerns: parsedResponse.analysis.concerns || [],
            suggestions: parsedResponse.analysis.suggestions || [],
          };
        }
      } catch (e) {
        console.error("Failed to parse analysis:", e);
      }

      return this.getDefaultAnalysis();
    } catch (error) {
      console.error("OpenAI API error:", error);
      return this.getDefaultAnalysis();
    }
  }

  private formatGameStateWithHistory(state: GameState): string {
    const purchasedUpgrades = state.upgrades
      .filter((u) => u.purchased)
      .map((u) => `${u.id} (${u.multiplier}x ${u.resourceType})`);

    // Calculate trends
    const trends = this.calculateTrends();

    return `Current Game State:

RESOURCES:
- Oxygen: ${state.resources.oxygen.toFixed(1)}% ${trends.oxygen}
- Water: ${state.resources.water.toFixed(1)}% ${trends.water}
- Temperature: ${state.resources.temperature.toFixed(1)}°C ${trends.temperature}
- Energy: ${state.resources.energy.toFixed(1)}% ${trends.energy}

Credits: ${state.credits} ${trends.credits}
Critical Timer: ${
      state.criticalTimer !== null
        ? `${state.criticalTimer}s remaining!`
        : "safe"
    }

RESOURCE TRENDS (Last 5 minutes):
- Critical Events: ${this.countCriticalEvents()}
- Upgrade Pace: ${this.analyzeUpgradePace()}
- Resource Stability: ${this.analyzeResourceStability()}

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

Analyze the game state and trends to provide strategic insights.`;
  }

  private calculateTrends(): { [key: string]: string } {
    if (this.gameHistory.length < 2)
      return {
        oxygen: "",
        water: "",
        temperature: "",
        energy: "",
        credits: "",
      };

    const current = this.gameHistory[this.gameHistory.length - 1];
    const previous = this.gameHistory[0];
    const getArrow = (current: number, previous: number) => {
      const diff = current - previous;
      if (Math.abs(diff) < 0.1) return "→";
      return diff > 0 ? "↑" : "↓";
    };

    return {
      oxygen: getArrow(current.resources.oxygen, previous.resources.oxygen),
      water: getArrow(current.resources.water, previous.resources.water),
      temperature: getArrow(
        current.resources.temperature,
        previous.resources.temperature
      ),
      energy: getArrow(current.resources.energy, previous.resources.energy),
      credits: getArrow(current.credits, previous.credits),
    };
  }

  private countCriticalEvents(): string {
    const criticalCount = this.gameHistory.filter(
      (h) => h.criticalTimer !== null
    ).length;
    const total = this.gameHistory.length;
    const percentage = ((criticalCount / total) * 100).toFixed(0);
    return `${percentage}% of time in critical state`;
  }

  private analyzeUpgradePace(): string {
    if (this.gameHistory.length < 2) return "Not enough data";

    const upgrades =
      this.gameHistory[this.gameHistory.length - 1].purchasedUpgrades;
    const timeSpan =
      (this.gameHistory[this.gameHistory.length - 1].timestamp -
        this.gameHistory[0].timestamp) /
      1000;
    const upgradesPerMinute = ((upgrades.length / timeSpan) * 60).toFixed(1);

    return `${upgradesPerMinute} upgrades/min`;
  }

  private analyzeResourceStability(): string {
    if (this.gameHistory.length < 10) return "Not enough data";

    const variations = {
      energy: this.calculateVariation((h) => h.resources.energy),
      oxygen: this.calculateVariation((h) => h.resources.oxygen),
      water: this.calculateVariation((h) => h.resources.water),
    };

    const avgVariation =
      (variations.energy + variations.oxygen + variations.water) / 3;
    if (avgVariation < 5) return "Very Stable";
    if (avgVariation < 10) return "Stable";
    if (avgVariation < 20) return "Fluctuating";
    return "Unstable";
  }

  private calculateVariation(getValue: (h: GameHistory) => number): number {
    const values = this.gameHistory.map(getValue);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map((v) => Math.pow(v - avg, 2));
    return Math.sqrt(
      squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length
    );
  }

  private getDefaultAnalysis() {
    return {
      strengths: ["Maintaining basic resource generation"],
      concerns: ["Resource levels need attention"],
      suggestions: [
        "Focus on energy efficiency",
        "Consider strategic upgrades",
      ],
    };
  }
}
