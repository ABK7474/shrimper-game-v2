import React, { useState, useEffect, useCallback, useRef } from 'react';
import "./App.css";
import { useSound } from './hooks/useSound';
// Game configuration
const GAME_CONFIG = {
  gameArea: { width: 800, height: 600 },
  shrimpSpawnRate: 2000, // ms
  shrimpLifetime: 3000, // ms
  powerUpDuration: 10000, // ms
};

// Skins with enhanced properties
const SKINS = [
  { name: "Default", cost: 0, multiplier: 1, color: "#FF6B6B" },
  { name: "Galaxy", cost: 50, multiplier: 1.2, color: "#4ECDC4" },
  { name: "Gold", cost: 100, multiplier: 1.5, color: "#FFD93D" },
  { name: "Pirate", cost: 150, multiplier: 2, color: "#6BCF7F" },
  { name: "Diamond", cost: 300, multiplier: 2.5, color: "#A8E6CF" },
];

// Power-ups
const POWER_UPS = [
  { name: "Double Points", cost: 20, duration: 10000, effect: "doublePoints" },
  { name: "Speed Boost", cost: 30, duration: 8000, effect: "speedBoost" },
  { name: "Magnet", cost: 40, duration: 15000, effect: "magnet" },
];

// Shrimp types
const SHRIMP_TYPES = [
  { type: "normal", points: 1, color: "#FF8A65", size: 30, speed: 2 },
  { type: "golden", points: 5, color: "#FFD54F", size: 35, speed: 1.5, rare: true },
  { type: "rainbow", points: 10, color: "#CE93D8", size: 40, speed: 1, rare: true },
];

function App() {
  const { playSound } = useSound();
  // Game state
  const [score, setScore] = useState(() => 
    Number(localStorage.getItem("shrimp-score")) || 0
  );
  const [gameScore, setGameScore] = useState(0); // Oyun içi skor
  const [highScore, setHighScore] = useState(() => 
    Number(localStorage.getItem("shrimp-high")) || 0
  );
  const [gameRunning, setGameRunning] = useState(false);
  const [gameTime, setGameTime] = useState(60); // 60 seconds game time
  const [currentSkin, setCurrentSkin] = useState(SKINS[0]);
  
  // Game objects
  const [shrimp, setShrimp] = useState([]);
  const [particles, setParticles] = useState([]);
  const [activePowerUps, setActivePowerUps] = useState([]);
  
  // Game stats
  const [shrimpCaught, setShrimpCaught] = useState(0);
  const [combo, setCombo] = useState(0);
  const [comboTimer, setComboTimer] = useState(0);
  
  const gameAreaRef = useRef(null);
  const gameLoopRef = useRef(null);
  const shrimpIdRef = useRef(0);
  const particleIdRef = useRef(0);

  // Save score to localStorage
  useEffect(() => {
    localStorage.setItem("shrimp-score", score.toString());
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem("shrimp-high", score.toString());
    }
  }, [score, highScore]);

  // Generate random shrimp
  const createShrimp = useCallback(() => {
    if (!gameRunning) return;
    
    const shrimpType = SHRIMP_TYPES[
      Math.random() < 0.1 ? (Math.random() < 0.5 ? 1 : 2) : 0
    ];
    
    const newShrimp = {
      id: shrimpIdRef.current++,
      x: Math.random() * (GAME_CONFIG.gameArea.width - 50),
      y: Math.random() * (GAME_CONFIG.gameArea.height - 50),
      type: shrimpType,
      life: GAME_CONFIG.shrimpLifetime,
      vx: (Math.random() - 0.5) * shrimpType.speed,
      vy: (Math.random() - 0.5) * shrimpType.speed,
    };
    
    setShrimp(prev => [...prev, newShrimp]);
  }, [gameRunning]);

  // Create particle effect
  const createParticles = useCallback((x, y, points) => {
    const newParticles = Array.from({ length: 5 }, () => ({
      id: particleIdRef.current++,
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4 - 2,
      life: 1000,
      points,
      opacity: 1,
    }));
    
    setParticles(prev => [...prev, ...newParticles]);
  }, []);

  // Catch shrimp
  const catchShrimp = useCallback((shrimpId, event) => {
    event.stopPropagation();
    
    const shrimpToCatch = shrimp.find(s => s.id === shrimpId);
    if (!shrimpToCatch) return;
    playSound('catch', 0.3);
    const basePoints = shrimpToCatch.type.points;
    const skinMultiplier = currentSkin.multiplier;
    const comboMultiplier = Math.min(1 + combo * 0.1, 3);
    const powerUpMultiplier = activePowerUps.some(p => p.effect === 'doublePoints') ? 2 : 1;
    
    const totalPoints = Math.floor(basePoints * skinMultiplier * comboMultiplier * powerUpMultiplier);
    
    setScore(prev => prev + totalPoints);        // Toplam skor (birikmeli)
    setGameScore(prev => prev + totalPoints);    // Oyun içi skor
    setShrimpCaught(prev => prev + 1);
    setCombo(prev => prev + 1);
    setComboTimer(3000); // 3 seconds combo timer
    if (combo > 2) {
    playSound('combo', 0.4);
  }
    // Create particles at shrimp position
    createParticles(shrimpToCatch.x + 25, shrimpToCatch.y + 25, totalPoints);
    
    // Remove caught shrimp
    setShrimp(prev => prev.filter(s => s.id !== shrimpId));
  }, [shrimp, currentSkin, combo, activePowerUps, createParticles, playSound]);

  // Buy skin
  const buySkin = useCallback((skin) => {
    if (score >= skin.cost) {
      // BAŞARILI SATIN ALMA SESİ
      playSound('purchase', 0.3);
      setScore(prev => prev - skin.cost);
      setCurrentSkin(skin);
    } else {
      // HATA SESİ
      playSound('error', 0.2);
      alert("Not enough points!");
  }
}, [score, playSound]);

  // Buy power-up
  const buyPowerUp = useCallback((powerUp) => {
    if (score >= powerUp.cost) {
      setScore(prev => prev - powerUp.cost);
      setActivePowerUps(prev => [...prev, { ...powerUp, timeLeft: powerUp.duration }]);
    }
  }, [score]);

  // Start game
  const startGame = useCallback(() => {
    playSound('gamestart', 0.5);
    setGameRunning(true);
    setGameTime(60);
    setGameScore(0);
    setShrimpCaught(0);
    setCombo(0);
    setShrimp([]);
    setParticles([]);
    setActivePowerUps([]);
  }, [playSound]);

  // End game
  const endGame = useCallback(() => {
    playSound('gameover', 0.6);
    setGameRunning(false);
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
    }
  }, [playSound]);

  // Game loop
  useEffect(() => {
    if (!gameRunning) return;

    gameLoopRef.current = setInterval(() => {
      // Update game time
      setGameTime(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });

      // Update shrimp positions and lifetime
      setShrimp(prev => prev.map(s => ({
        ...s,
        x: Math.max(0, Math.min(GAME_CONFIG.gameArea.width - 50, s.x + s.vx)),
        y: Math.max(0, Math.min(GAME_CONFIG.gameArea.height - 50, s.y + s.vy)),
        life: s.life - 1000,
      })).filter(s => s.life > 0));

      // Update particles
      setParticles(prev => prev.map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        life: p.life - 1000,
        opacity: p.life / 1000,
      })).filter(p => p.life > 0));

      // Update power-ups
      setActivePowerUps(prev => prev.map(p => ({
        ...p,
        timeLeft: p.timeLeft - 1000,
      })).filter(p => p.timeLeft > 0));

      // Update combo timer
      setComboTimer(prev => {
        if (prev <= 1000) {
          setCombo(0);
          return 0;
        }
        return prev - 1000;
      });

      // Spawn new shrimp
      if (Math.random() < 0.3) {
        createShrimp();
      }
    }, 1000);

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameRunning, endGame, createShrimp]);

  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif', 
      textAlign: 'center', 
      backgroundColor: '#001122',
      color: 'white',
      minHeight: '100vh',
      padding: '20px'
    }}>
      <h1 style={{ color: '#4ECDC4', fontSize: '3em', margin: '0' }}>🦐 Shrimper Game 🦐</h1>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', margin: '20px 0' }}>
        <div style={{ backgroundColor: '#334455', padding: '10px', borderRadius: '10px' }}>
          <strong>Total Score: {score}</strong>
        </div>
        <div style={{ backgroundColor: '#445566', padding: '10px', borderRadius: '10px' }}>
          <strong>Game Score: {gameScore}</strong>
        </div>
        <div style={{ backgroundColor: '#334455', padding: '10px', borderRadius: '10px' }}>
          <strong>High Score: {highScore}</strong>
        </div>
        {gameRunning && (
          <>
            <div style={{ backgroundColor: '#FF6B6B', padding: '10px', borderRadius: '10px' }}>
              <strong>Time: {gameTime}s</strong>
            </div>
            <div style={{ backgroundColor: '#FFD93D', padding: '10px', borderRadius: '10px', color: 'black' }}>
              <strong>Combo: x{combo}</strong>
            </div>
          </>
        )}
      </div>

      {/* Game Area */}
      <div 
        ref={gameAreaRef}
        style={{
          width: GAME_CONFIG.gameArea.width,
          height: GAME_CONFIG.gameArea.height,
          backgroundColor: '#006699',
          margin: '20px auto',
          position: 'relative',
          border: '3px solid #4ECDC4',
          borderRadius: '15px',
          overflow: 'hidden',
          cursor: gameRunning ? 'crosshair' : 'default',
          backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(120, 200, 255, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)'
        }}
      >
        {/* Shrimp */}
        {shrimp.map(s => (
          <div
            key={s.id}
            onClick={(e) => catchShrimp(s.id, e)}
            className="shrimp-bounce"
            style={{
              position: 'absolute',
              left: s.x,
              top: s.y,
              width: s.type.size,
              height: s.type.size,
              backgroundColor: s.type.color,
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: '0 0 10px rgba(0,0,0,0.3)',
              border: s.type.rare ? '2px solid gold' : 'none',
            }}
          >
            🦐
          </div>
        ))}
        
        {/* Particles */}
        {particles.map(p => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: p.x,
              top: p.y,
              color: '#FFD93D',
              fontSize: '14px',
              fontWeight: 'bold',
              opacity: p.opacity,
              pointerEvents: 'none',
              zIndex: 100,
            }}
          >
            +{p.points}
          </div>
        ))}
        
        {!gameRunning && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0,0,0,0.8)',
            padding: '30px',
            borderRadius: '15px',
            textAlign: 'center',
          }}>
            <h2>🎮 Ready to Fish? 🎮</h2>
            <p>Click on shrimp to catch them!</p>
            <p>Different shrimp give different points</p>
            <p>Build combos for bonus multipliers!</p>
            <button
              onClick={startGame}
              style={{
                padding: '15px 30px',
                fontSize: '18px',
                backgroundColor: '#4ECDC4',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              Start Game!
            </button>
          </div>
        )}
      </div>

      {/* Active Power-ups */}
      {activePowerUps.length > 0 && (
        <div style={{ margin: '10px 0' }}>
          <h4>Active Power-ups:</h4>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            {activePowerUps.map((powerUp, index) => (
              <div key={index} style={{
                backgroundColor: '#FF6B6B',
                padding: '5px 10px',
                borderRadius: '15px',
                fontSize: '12px'
              }}>
                {powerUp.name} ({Math.ceil(powerUp.timeLeft / 1000)}s)
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shop */}
      <div style={{ margin: '30px 0', display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
        {/* Skins */}
        <div style={{ backgroundColor: '#334455', padding: '20px', borderRadius: '15px', minWidth: '200px' }}>
          <h3>🎨 Skins</h3>
          <p>Current: <span style={{ color: currentSkin.color }}>●</span> {currentSkin.name} (x{currentSkin.multiplier})</p>
          {SKINS.map(skin => (
            <div key={skin.name} style={{ margin: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>
                <span style={{ color: skin.color }}>●</span> {skin.name} (x{skin.multiplier}) - {skin.cost}🦐
              </span>
              <button
                onClick={() => buySkin(skin)}
                disabled={score < skin.cost || currentSkin.name === skin.name}
                style={{
                  padding: '5px 10px',
                  backgroundColor: score >= skin.cost && currentSkin.name !== skin.name ? '#4ECDC4' : '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: score >= skin.cost && currentSkin.name !== skin.name ? 'pointer' : 'not-allowed',
                  fontSize: '12px'
                }}
              >
                {currentSkin.name === skin.name ? 'Equipped' : 'Buy'}
              </button>
            </div>
          ))}
        </div>

        {/* Power-ups */}
        <div style={{ backgroundColor: '#334455', padding: '20px', borderRadius: '15px', minWidth: '200px' }}>
          <h3>⚡ Power-ups</h3>
          {POWER_UPS.map(powerUp => (
            <div key={powerUp.name} style={{ margin: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px' }}>
                {powerUp.name} - {powerUp.cost}🦐
              </span>
              <button
                onClick={() => buyPowerUp(powerUp)}
                disabled={score < powerUp.cost}
                style={{
                  padding: '5px 10px',
                  backgroundColor: score >= powerUp.cost ? '#FFD93D' : '#666',
                  color: 'black',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: score >= powerUp.cost ? 'pointer' : 'not-allowed',
                  fontSize: '12px'
                }}
              >
                Buy
              </button>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div style={{ backgroundColor: '#334455', padding: '20px', borderRadius: '15px', minWidth: '200px' }}>
          <h3>📊 Stats</h3>
          <p>Shrimp Caught: {shrimpCaught}</p>
          <p>Current Combo: x{combo}</p>
          <p>High Score: {highScore}</p>
        </div>
      </div>
    </div>
  );
}

export default App;
