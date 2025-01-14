import { useState, useEffect, useRef } from "react";
import styled from "@emotion/styled";
import { motion } from "framer-motion";
import { GameAgent } from "./agent";

interface Resource {
  oxygen: number;
  water: number;
  temperature: number;
  energy: number;
}

interface Upgrade {
  id: string;
  name: string;
  cost: number;
  resourceType: keyof Resource;
  multiplier: number;
  purchased: boolean;
}

interface Event {
  id: string;
  title: string;
  description: string;
  effect: (resources: Resource) => Resource;
  severity: "positive" | "negative";
}

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const GameBoard = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  margin: 2rem 0;
  width: 100%;
  max-width: 1000px;
`;

const ResourceCard = styled(motion.div)`
  background: #2a2a2a;
  padding: 1.5rem;
  border-radius: 10px;
  color: white;
  width: 100%;
  height: 200px; // Fixed height to prevent layout shifts
`;

const Button = styled(motion.button)`
  background: #e53170;
  color: white;
  border: none;
  padding: 0.8rem 1.5rem;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
  margin: 0.5rem;
  width: 150px; // Fixed width to maintain consistent size
  height: 50px; // Fixed height to maintain consistent size

  &:hover {
    background: #ff4081;
  }

  &:disabled {
    background: #666;
    cursor: not-allowed;
  }

  &.agent-action {
    background: #00ff00;
    transform: scale(1.1);
    box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
  }
`;

const EventArea = styled.div`
  height: 120px; // Increased fixed height to prevent layout shifts
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 1rem 0;
  width: 100%;
  max-width: 1000px;
`;

const EventCard = styled(motion.div)<{ $severity: "positive" | "negative" }>`
  background: ${(props) =>
    props.$severity === "positive" ? "#2e7d32" : "#c62828"};
  padding: 1rem;
  border-radius: 10px;
  color: white;
  width: 100%;
  max-width: 600px;
  position: relative;
`;

const UpgradeSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin: 2rem 0;
  width: 100%;
  max-width: 1000px;
`;

const UpgradeCard = styled(motion.div)`
  background: #3a3a3a;
  padding: 1rem;
  border-radius: 10px;
  cursor: pointer;
  width: 100%;
  height: 150px; // Fixed height to prevent layout shifts

  &:hover {
    background: #4a4a4a;
  }

  &[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Stats = styled.div`
  display: flex;
  justify-content: space-around;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin: 1rem 0;
  padding: 1rem;
  background: #2a2a2a;
  border-radius: 10px;
  width: 100%;
  max-width: 1000px;
  min-height: 80px; // Fixed height to prevent layout shifts
`;

function App() {
  const [resources, setResources] = useState<Resource>({
    oxygen: 0,
    water: 0,
    temperature: -60,
    energy: 100,
  });

  const [credits, setCredits] = useState(30);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [gameWon, setGameWon] = useState(false);
  const [gameLost, setGameLost] = useState(false);
  const [criticalTimer, setCriticalTimer] = useState(0);
  const [countdownSeconds, setCountdownSeconds] = useState(30);
  const [upgrades, setUpgrades] = useState<Upgrade[]>([
    {
      id: "oxygen1",
      name: "Basic Oxygen Generator",
      cost: 80,
      resourceType: "oxygen",
      multiplier: 1.2,
      purchased: false,
    },
    {
      id: "water1",
      name: "Water Extractor",
      cost: 80,
      resourceType: "water",
      multiplier: 1.2,
      purchased: false,
    },
    {
      id: "temp1",
      name: "Thermal Generator",
      cost: 80,
      resourceType: "temperature",
      multiplier: 1.2,
      purchased: false,
    },
    {
      id: "oxygen2",
      name: "Advanced Oxygen System",
      cost: 200,
      resourceType: "oxygen",
      multiplier: 1.5,
      purchased: false,
    },
    {
      id: "water2",
      name: "Deep Core Extractor",
      cost: 200,
      resourceType: "water",
      multiplier: 1.5,
      purchased: false,
    },
    {
      id: "temp2",
      name: "Fusion Array",
      cost: 200,
      resourceType: "temperature",
      multiplier: 1.5,
      purchased: false,
    },
    {
      id: "energy1",
      name: "Solar Array",
      cost: 150,
      resourceType: "energy",
      multiplier: 1.3,
      purchased: false,
    },
    {
      id: "energy2",
      name: "Nuclear Generator",
      cost: 300,
      resourceType: "energy",
      multiplier: 1.8,
      purchased: false,
    },
  ]);

  const [agent, setAgent] = useState<GameAgent | null>(null);
  const [isAgentPlaying, setIsAgentPlaying] = useState(false);
  const [pendingActions, setPendingActions] = useState<
    Array<{ type: "generate" | "purchase"; target: string }>
  >([]);

  const [gameStarted, setGameStarted] = useState(false);
  const [eventsEnabled, setEventsEnabled] = useState(false);

  const [agentActionTarget, setAgentActionTarget] = useState<string | null>(
    null
  );

  const gameStateRef = useRef({
    resources,
    credits,
    upgrades,
    gameWon,
    gameLost,
    criticalTimer,
    countdownSeconds,
  });

  useEffect(() => {
    gameStateRef.current = {
      resources,
      credits,
      upgrades,
      gameWon,
      gameLost,
      criticalTimer,
      countdownSeconds,
    };
  }, [
    resources,
    credits,
    upgrades,
    gameWon,
    gameLost,
    criticalTimer,
    countdownSeconds,
  ]);

  const events: Event[] = [
    {
      id: "dust_storm",
      title: "Dust Storm",
      description: "A massive dust storm hits your colony!",
      severity: "negative",
      effect: (res) => ({
        ...res,
        oxygen: Math.max(0, res.oxygen - 12),
        temperature: Math.max(-60, res.temperature - 5),
        energy: Math.max(0, res.energy - 15),
      }),
    },
    {
      id: "ice_discovery",
      title: "Ice Discovery",
      description: "Your rovers discovered an underground ice deposit!",
      severity: "positive",
      effect: (res) => ({
        ...res,
        water: Math.min(100, res.water + 12),
      }),
    },
    {
      id: "solar_flare",
      title: "Solar Flare",
      description: "A solar flare increases atmospheric temperature!",
      severity: "positive",
      effect: (res) => ({
        ...res,
        temperature: Math.min(50, res.temperature + 4),
      }),
    },
    {
      id: "meteor_impact",
      title: "Meteor Impact",
      description: "A meteor has struck nearby, releasing underground water!",
      severity: "positive",
      effect: (res) => ({
        ...res,
        water: Math.min(100, res.water + 15),
        temperature: Math.min(50, res.temperature + 2),
      }),
    },
    {
      id: "radiation_storm",
      title: "Radiation Storm",
      description: "A radiation storm is affecting your oxygen generators!",
      severity: "negative",
      effect: (res) => ({
        ...res,
        oxygen: Math.max(0, res.oxygen - 12),
      }),
    },
    {
      id: "volcanic_activity",
      title: "Volcanic Activity",
      description: "Dormant volcanoes are showing activity!",
      severity: "positive",
      effect: (res) => ({
        ...res,
        temperature: Math.min(50, res.temperature + 6),
      }),
    },
    {
      id: "equipment_failure",
      title: "Equipment Failure",
      description: "Critical systems are malfunctioning!",
      severity: "negative",
      effect: (res) => ({
        ...res,
        oxygen: Math.max(0, res.oxygen - 10),
        water: Math.max(0, res.water - 8),
      }),
    },
    {
      id: "atmospheric_leak",
      title: "Atmospheric Leak",
      description: "Oxygen is rapidly escaping through a breach!",
      severity: "negative",
      effect: (res) => ({
        ...res,
        oxygen: Math.max(0, res.oxygen - 15),
      }),
    },
    {
      id: "freezing_wave",
      title: "Freezing Wave",
      description: "A severe cold front is approaching!",
      severity: "negative",
      effect: (res) => ({
        ...res,
        temperature: Math.max(-60, res.temperature - 8),
        water: Math.max(0, res.water - 5),
      }),
    },
    {
      id: "sandstorm",
      title: "Sandstorm",
      description: "A violent sandstorm is damaging equipment!",
      severity: "negative",
      effect: (res) => ({
        ...res,
        oxygen: Math.max(0, res.oxygen - 7),
        water: Math.max(0, res.water - 4),
      }),
    },
    {
      id: "system_failure",
      title: "Critical System Failure",
      description: "Multiple systems are failing simultaneously!",
      severity: "negative",
      effect: (res) => ({
        ...res,
        oxygen: Math.max(0, res.oxygen - 20),
        water: Math.max(0, res.water - 15),
        energy: Math.max(0, res.energy - 25),
      }),
    },
    {
      id: "energy_surge",
      title: "Energy Grid Surge",
      description: "Power systems are overloading!",
      severity: "negative",
      effect: (res) => ({
        ...res,
        energy: Math.max(0, res.energy - 30),
      }),
    },
  ];

  // Track active events with timestamps
  const [eventCooldowns, setEventCooldowns] = useState<Record<string, number>>(
    {}
  );

  // Agent control effect
  useEffect(() => {
    if (!isAgentPlaying || !agent || gameWon || gameLost || !gameStarted) {
      console.log("Agent not running because:", {
        isAgentPlaying,
        hasAgent: !!agent,
        gameWon,
        gameLost,
        gameStarted,
      });
      return;
    }

    console.log("Agent is active, starting interval...");

    // Make initial request immediately
    const makeRequest = async () => {
      console.log("Requesting agent actions...");
      const state = gameStateRef.current;
      const gameState = {
        resources: { ...state.resources },
        credits: state.credits,
        upgrades: [...state.upgrades],
        gameWon: state.gameWon,
        gameLost: state.gameLost,
        criticalTimer: state.criticalTimer > 0 ? state.countdownSeconds : null,
      };

      try {
        const actions = await agent.getNextActions(gameState);
        console.log("Received agent actions:", actions);
        setPendingActions(actions);
      } catch (error) {
        console.error("Error getting agent actions:", error);
      }
    };

    // Make initial request
    makeRequest();

    // Get new actions every 5 seconds
    const agentInterval = setInterval(makeRequest, 5000);

    return () => {
      console.log("Cleaning up agent interval");
      clearInterval(agentInterval);
    };
  }, [isAgentPlaying, agent, gameWon, gameLost, gameStarted]);

  // Execute pending actions
  useEffect(() => {
    if (!isAgentPlaying || pendingActions.length === 0 || !gameStarted) {
      console.log("Not executing actions because:", {
        isAgentPlaying,
        pendingActionsLength: pendingActions.length,
        gameStarted,
      });
      return;
    }

    console.log("Starting to execute pending actions:", pendingActions);

    // Execute actions every 500ms to complete all 10 within 5 seconds
    const actionInterval = setInterval(() => {
      setPendingActions((prev) => {
        const [nextAction, ...remainingActions] = prev;
        if (nextAction) {
          console.log("Executing action:", nextAction);
          setAgentActionTarget(nextAction.target);
          if (nextAction.type === "generate") {
            handleAction(nextAction.target as keyof Resource);
          } else if (nextAction.type === "purchase") {
            const upgrade = upgrades.find((u) => u.id === nextAction.target);
            if (upgrade) {
              purchaseUpgrade(upgrade);
            }
          }
        }
        return remainingActions;
      });
    }, 500);

    return () => {
      console.log("Cleaning up action execution interval");
      clearInterval(actionInterval);
      if (!isAgentPlaying) {
        setAgentActionTarget(null);
      }
    };
  }, [isAgentPlaying, pendingActions, gameStarted]);

  // Initialize agent when API key is provided
  const initializeAgent = (apiKey: string) => {
    console.log("Initializing agents with key length:", apiKey.length);
    try {
      const newAgent = new GameAgent(apiKey);
      // const newObserver = new GameObserver(apiKey);
      setAgent(newAgent);
      // setObserver(newObserver);
      console.log("Agents initialized successfully");
    } catch (error) {
      console.error("Error initializing agents:", error);
    }
  };

  // Event generation effect
  useEffect(() => {
    if (!gameStarted || gameWon || gameLost || !eventsEnabled) return;

    const eventInterval = setInterval(() => {
      const currentTime = Date.now();

      // Clean up expired cooldowns
      setEventCooldowns((prev) => {
        const newCooldowns = { ...prev };
        Object.entries(newCooldowns).forEach(([eventId, timestamp]) => {
          if (currentTime - timestamp > 15000) {
            delete newCooldowns[eventId];
          }
        });
        return newCooldowns;
      });

      // 50% chance of event
      if (Math.random() < 0.5) {
        const availableEvents = events.filter(
          (event) =>
            !eventCooldowns[event.id] ||
            currentTime - eventCooldowns[event.id] > 15000
        );

        if (availableEvents.length > 0) {
          const randomEvent =
            availableEvents[Math.floor(Math.random() * availableEvents.length)];

          setCurrentEvent(randomEvent);
          setResources((prev) => randomEvent.effect(prev));

          setEventCooldowns((prev) => ({
            ...prev,
            [randomEvent.id]: currentTime,
          }));

          setTimeout(() => setCurrentEvent(null), 3000);
        }
      }
    }, 6000);

    return () => clearInterval(eventInterval);
  }, [gameWon, gameLost, gameStarted, eventsEnabled]);

  // Resource drain effect
  useEffect(() => {
    if (!gameStarted || gameWon || gameLost) return;

    const drainInterval = setInterval(() => {
      setResources((prev) => {
        const energyEfficiency = prev.energy / 100;
        const baseDrain = {
          oxygen: 1.2,
          water: 0.8,
          temperature: 0.4,
          energy: 0.6,
        };

        return {
          oxygen: Math.max(
            0,
            prev.oxygen - baseDrain.oxygen * (2 - energyEfficiency)
          ),
          water: Math.max(
            0,
            prev.water - baseDrain.water * (2 - energyEfficiency)
          ),
          temperature: Math.max(
            -60,
            prev.temperature - baseDrain.temperature * (2 - energyEfficiency)
          ),
          energy: Math.max(0, prev.energy - baseDrain.energy),
        };
      });
    }, 3000);

    return () => clearInterval(drainInterval);
  }, [gameWon, gameLost, gameStarted]);

  // Combined critical check and countdown effect
  useEffect(() => {
    if (!gameStarted || gameWon || gameLost) return;

    const isCritical =
      resources.oxygen <= 5 || resources.water <= 5 || resources.energy <= 5;

    if (isCritical) {
      if (criticalTimer === 0) {
        // Initial critical state
        setCriticalTimer(1);
        setCountdownSeconds(30);
      }

      const countdownInterval = setInterval(() => {
        setCountdownSeconds((prev) => {
          if (prev <= 1) {
            setGameLost(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    } else {
      setCriticalTimer(0);
      setCountdownSeconds(30);
    }
  }, [resources, gameWon, gameLost, criticalTimer, gameStarted]);

  // Win condition check
  useEffect(() => {
    if (gameLost) return; // Don't check for win if already lost

    if (
      resources.oxygen >= 100 &&
      resources.water >= 100 &&
      resources.temperature >= 15
    ) {
      setGameWon(true);
    }
  }, [resources, gameLost]);

  // Game over cleanup
  useEffect(() => {
    if (gameLost) {
      setCurrentEvent(null);
      setEventCooldowns({});
    }
  }, [gameLost]);

  const getMultiplier = (resourceType: keyof Resource) => {
    return upgrades
      .filter((u) => u.resourceType === resourceType && u.purchased)
      .reduce((mult, upgrade) => mult * upgrade.multiplier, 1);
  };

  const handleAction = (type: keyof Resource) => {
    if (!gameStarted) {
      setGameStarted(true);
    }
    if (gameWon || gameLost) return;

    // Special case for energy - doesn't require energy to generate
    if (type === "energy") {
      const multiplier = getMultiplier(type);
      setResources((prev) => ({
        ...prev,
        energy: Math.min(100, prev.energy + 8 * multiplier), // Base energy gain of 8
      }));
      setCredits((prev) => prev + 2);
      return;
    }

    // For all other actions, check energy requirement
    if (resources.energy < 10) {
      return; // Can't perform action without energy
    }

    const multiplier = getMultiplier(type);
    setResources((prev) => {
      const energyEfficiency = prev.energy / 100; // 0 to 1
      const baseGain = {
        temperature: 0.3,
        oxygen: 3,
        water: 3,
        energy: 5,
      };

      return {
        ...prev,
        [type]:
          type === "temperature"
            ? Math.min(
                50,
                prev[type] +
                  baseGain.temperature * multiplier * energyEfficiency
              )
            : Math.min(
                100,
                prev[type] + baseGain[type] * multiplier * energyEfficiency
              ),
        energy: Math.max(0, prev.energy - 10), // Energy cost for non-energy actions
      };
    });
    setCredits((prev) => prev + 2);
  };

  const purchaseUpgrade = (upgrade: Upgrade) => {
    if (!gameStarted) {
      setGameStarted(true);
    }
    if (gameWon || gameLost) return;

    if (credits >= upgrade.cost && !upgrade.purchased) {
      setCredits((prev) => prev - upgrade.cost);
      setUpgrades((prev) =>
        prev.map((u) => (u.id === upgrade.id ? { ...u, purchased: true } : u))
      );
    }
  };

  return (
    <Container>
      <h1>Mars Terraforming</h1>

      <Stats>
        <div>Credits: {credits}</div>
        <div>Energy: {resources.energy.toFixed(1)}%</div>
        <div>Active Events: {Object.keys(eventCooldowns).length}</div>
        {!gameStarted && (
          <div style={{ color: "#ffd700" }}>
            Click any button to start the game
          </div>
        )}
        {gameWon && (
          <div style={{ color: "#4caf50" }}>TERRAFORMING COMPLETE!</div>
        )}
        {gameLost && <div style={{ color: "#f44336" }}>MISSION FAILED</div>}
        {!gameWon && !gameLost && criticalTimer > 0 && (
          <div style={{ color: "#ff9800" }}>
            CRITICAL WARNING: {countdownSeconds}s until failure
          </div>
        )}
        <div>
          <Button
            onClick={() => setEventsEnabled(!eventsEnabled)}
            style={{ marginRight: "1rem" }}
          >
            {eventsEnabled ? "Disable Events" : "Enable Events"}
          </Button>
          {!agent && (
            <input
              type="text"
              placeholder="Enter OpenAI API Key"
              onChange={(e) => initializeAgent(e.target.value)}
              style={{
                padding: "0.5rem",
                marginRight: "1rem",
                borderRadius: "5px",
                border: "1px solid #666",
              }}
            />
          )}
          <Button
            onClick={() => setIsAgentPlaying(!isAgentPlaying)}
            disabled={!agent || gameWon || gameLost}
            style={{ opacity: !agent ? 0.5 : 1 }}
          >
            {isAgentPlaying ? "Stop Agent" : "Start Agent"}
          </Button>
        </div>
      </Stats>

      <EventArea>
        {gameLost ? (
          <EventCard
            $severity="negative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h3>Colony Lost</h3>
            <p>
              Critical resource depletion has led to colony failure. Mars
              remains uninhabitable.
            </p>
          </EventCard>
        ) : gameWon ? (
          <EventCard
            $severity="positive"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h3>Mission Accomplished!</h3>
            <p>Mars has been successfully terraformed and is now habitable!</p>
          </EventCard>
        ) : currentEvent ? (
          <EventCard
            $severity={currentEvent.severity}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <h3>{currentEvent.title}</h3>
            <p>{currentEvent.description}</p>
            <small>Cooldown: 15s</small>
          </EventCard>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            style={{ color: "#666", fontSize: "0.9em" }}
          >
            No active events
          </motion.div>
        )}
      </EventArea>

      <GameBoard>
        <ResourceCard
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            border: resources.oxygen <= 5 ? "2px solid #f44336" : "none",
          }}
        >
          <h2>Oxygen</h2>
          <p>{resources.oxygen.toFixed(1)}%</p>
          <Button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleAction("oxygen")}
            disabled={gameWon || gameLost || resources.energy < 10}
            className={agentActionTarget === "oxygen" ? "agent-action" : ""}
          >
            Generate Oxygen
          </Button>
        </ResourceCard>

        <ResourceCard
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            border: resources.water <= 5 ? "2px solid #f44336" : "none",
          }}
        >
          <h2>Water</h2>
          <p>{resources.water.toFixed(1)}%</p>
          <Button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleAction("water")}
            disabled={gameWon || gameLost || resources.energy < 10}
            className={agentActionTarget === "water" ? "agent-action" : ""}
          >
            Create Water
          </Button>
        </ResourceCard>

        <ResourceCard whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <h2>Temperature</h2>
          <p>{resources.temperature.toFixed(1)}°C</p>
          <Button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleAction("temperature")}
            disabled={gameWon || gameLost || resources.energy < 10}
            className={
              agentActionTarget === "temperature" ? "agent-action" : ""
            }
          >
            Heat Planet
          </Button>
        </ResourceCard>

        <ResourceCard
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            border: resources.energy <= 5 ? "2px solid #f44336" : "none",
          }}
        >
          <h2>Energy</h2>
          <p>{resources.energy.toFixed(1)}%</p>
          <Button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleAction("energy")}
            disabled={gameWon || gameLost}
            className={agentActionTarget === "energy" ? "agent-action" : ""}
          >
            Generate Power
          </Button>
        </ResourceCard>
      </GameBoard>

      <h2>Upgrades</h2>
      <UpgradeSection>
        {upgrades.map((upgrade) => (
          <UpgradeCard
            key={upgrade.id}
            onClick={() => purchaseUpgrade(upgrade)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              opacity: upgrade.purchased || gameWon ? 0.5 : 1,
              cursor: gameWon
                ? "not-allowed"
                : upgrade.purchased
                ? "default"
                : "pointer",
              background:
                agentActionTarget === upgrade.id ? "#00ff00" : undefined,
              transform:
                agentActionTarget === upgrade.id ? "scale(1.1)" : undefined,
              transition: "all 0.2s ease-in-out",
            }}
          >
            <h3>{upgrade.name}</h3>
            <p>Cost: {upgrade.cost} credits</p>
            <p>{upgrade.purchased ? "Purchased" : "Available"}</p>
          </UpgradeCard>
        ))}
      </UpgradeSection>

      {gameLost && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring" }}
          style={{
            background: "linear-gradient(45deg, #f44336, #d32f2f)",
            padding: "2rem",
            borderRadius: "10px",
            marginTop: "2rem",
            color: "white",
          }}
        >
          <h2>Mission Failed</h2>
          <p>
            Critical resource depletion has caused the colony to fail. The harsh
            environment of Mars remains unconquered.
          </p>
        </motion.div>
      )}

      {gameWon && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring" }}
          style={{
            background: "linear-gradient(45deg, #4caf50, #45a049)",
            padding: "2rem",
            borderRadius: "10px",
            marginTop: "2rem",
            color: "white",
          }}
        >
          <h2>Congratulations! Mars is now habitable! 🎉</h2>
          <p>
            You have successfully terraformed Mars and created a new home for
            humanity!
          </p>
        </motion.div>
      )}
    </Container>
  );
}

export default App;
