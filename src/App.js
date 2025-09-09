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
  
  // Tab state
  const [activeTab, setActiveTab] = useState('market');
  
  // Game state
  const [score, setScore] = useState(() => 
    Number(localStorage.getItem("shrimp-score")) || 0
  );
  const [xanTokens, setXanTokens] = useState(() => 
    Number(localStorage.getItem("xan-tokens")) || 0
  );
  const [gameScore, setGameScore] = useState(0);
  const [highScore, setHighScore] = useState(() => 
    Number(localStorage.getItem("shrimp-high")) || 0
  );
  const [gameRunning, setGameRunning] = useState(false);
  const [gameTime, setGameTime] = useState(60);
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
    localStorage.setItem("xan-tokens", xanTokens.toString());
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem("shrimp-high", score.toString());
    }
  }, [score, xanTokens, highScore]);

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
    
    setScore(prev => prev + totalPoints);
    setGameScore(prev => prev + totalPoints);
    setShrimpCaught(prev => prev + 1);
    setCombo(prev => prev + 1);
    setComboTimer(3000);
    
    if (combo > 2) {
      playSound('combo', 0.4);
    }
    
    createParticles(shrimpToCatch.x + 25, shrimpToCatch.y + 25, totalPoints);
    setShrimp(prev => prev.filter(s => s.id !== shrimpId));
  }, [shrimp, currentSkin, combo, activePowerUps, createParticles, playSound]);

  // Buy skin
  const buySkin = useCallback((skin) => {
    if (score >= skin.cost && xanTokens >= 1) {
      playSound('purchase', 0.3);
      setScore(prev => prev - skin.cost);
      setXanTokens(prev => prev - 1); // 1 XAN fee
      setCurrentSkin(skin);
    } else {
      playSound('error', 0.2);
      if (score < skin.cost) {
        alert("Not enough points!");
      } else {
        alert("Not enough XAN tokens for transaction fee!");
      }
    }
  }, [score, xanTokens, playSound]);

  // Buy power-up
  const buyPowerUp = useCallback((powerUp) => {
    if (score >= powerUp.cost && xanTokens >= 1) {
      playSound('purchase', 0.3);
      setScore(prev => prev - powerUp.cost);
      setXanTokens(prev => prev - 1); // 1 XAN fee
      setActivePowerUps(prev => [...prev, { ...powerUp, timeLeft: powerUp.duration }]);
    } else {
      playSound('error', 0.2);
      if (score < powerUp.cost) {
        alert("Not enough points!");
      } else {
        alert("Not enough XAN tokens for transaction fee!");
      }
    }
  }, [score, xanTokens, playSound]);

  // Convert score to XAN tokens
  const convertToXAN = useCallback((amount) => {
    const scoreNeeded = amount * 5; // 5 score = 1 XAN
    if (score >= scoreNeeded) {
      playSound('purchase', 0.3);
      setScore(prev => prev - scoreNeeded);
      setXanTokens(prev => prev + amount);
    } else {
      playSound('error', 0.2);
      alert("Not enough points to convert!");
    }
  }, [score, playSound]);

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
      setGameTime(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });

      setShrimp(prev => prev.map(s => ({
        ...s,
        x: Math.max(0, Math.min(GAME_CONFIG.gameArea.width - 50, s.x + s.vx)),
        y: Math.max(0, Math.min(GAME_CONFIG.gameArea.height - 50, s.y + s.vy)),
        life: s.life - 1000,
      })).filter(s => s.life > 0));

      setParticles(prev => prev.map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        life: p.life - 1000,
        opacity: p.life / 1000,
      })).filter(p => p.life > 0));

      setActivePowerUps(prev => prev.map(p => ({
        ...p,
        timeLeft: p.timeLeft - 1000,
      })).filter(p => p.timeLeft > 0));

      setComboTimer(prev => {
        if (prev <= 1000) {
          setCombo(0);
          return 0;
        }
        return prev - 1000;
      });

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

  // Tab button style
  const getTabButtonStyle = (tabName) => ({
    padding: '15px 25px',
    fontSize: '16px',
    fontWeight: 'bold',
    backgroundColor: activeTab === tabName ? '#4ECDC4' : '#334455',
    color: activeTab === tabName ? '#001122' : 'white',
    border: 'none',
    borderRadius: '10px 10px 0 0',
    cursor: 'pointer',
    marginRight: '5px',
    transition: 'all 0.3s ease',
    transform: activeTab === tabName ? 'translateY(-2px)' : 'none',
    boxShadow: activeTab === tabName ? '0 4px 8px rgba(0,0,0,0.3)' : 'none'
  });

  // Tab content style
  const tabContentStyle = {
    backgroundColor: '#334455',
    padding: '30px',
    borderRadius: '0 15px 15px 15px',
    minHeight: '400px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
  };

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
          <strong>XAN Tokens: {xanTokens}</strong>
        </div>
        <div style={{ backgroundColor: '#334455', padding: '10px', borderRadius: '10px' }}>
          <strong>Game Score: {gameScore}</strong>
        </div>
        <div style={{ backgroundColor: '#445566', padding: '10px', borderRadius: '10px' }}>
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

      {/* Tab Navigation */}
      <div style={{ margin: '30px auto', maxWidth: '800px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0' }}>
          <button
            onClick={() => setActiveTab('intentmachine')}
            style={getTabButtonStyle('intentmachine')}
          >
            🔄 Intent Machine
          </button>
          <button
            onClick={() => setActiveTab('market')}
            style={getTabButtonStyle('market')}
          >
            🎨 Market
          </button>
          <button
            onClick={() => setActiveTab('powerups')}
            style={getTabButtonStyle('powerups')}
          >
            ⚡ Power-ups
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            style={getTabButtonStyle('stats')}
          >
            📊 Stats
          </button>
        </div>

        {/* Tab Content */}
        <div style={tabContentStyle}>
          {/* Intent Machine Tab */}
          {activeTab === 'intentmachine' && (
            <div>
              <h3 style={{ color: '#9B59B6', marginTop: '0' }}>🔄 Intent Machine</h3>
              <p style={{ marginBottom: '30px', fontSize: '16px', lineHeight: '1.6' }}>
                Convert your earned points to XAN tokens! XAN tokens are required as transaction fees 
                for all purchases in the Market and Power-ups sections.
              </p>
              
              <div style={{ 
                backgroundColor: '#445566', 
                padding: '25px', 
                borderRadius: '15px', 
                marginBottom: '30px',
                border: '2px solid #9B59B6' 
              }}>
                <h4 style={{ color: '#9B59B6', marginTop: '0' }}>💱 Conversion Rate</h4>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4ECDC4' }}>
                  5 🦐 Points = 1 XAN Token
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                {/* Quick conversion buttons */}
                {[1, 5, 10, 25].map(amount => (
                  <div key={amount} style={{
                    backgroundColor: '#445566',
                    padding: '20px',
                    borderRadius: '10px',
                    border: '2px solid #9B59B6',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px', color: '#9B59B6' }}>
                      Convert {amount} XAN
                    </div>
                    <div style={{ color: '#ccc', fontSize: '14px', marginBottom: '15px' }}>
                      Cost: {amount * 5} 🦐 Points
                    </div>
                    <button
                      onClick={() => convertToXAN(amount)}
                      disabled={score < amount * 5}
                      style={{
                        padding: '12px 20px',
                        backgroundColor: score >= amount * 5 ? '#9B59B6' : '#666',
                        color: score >= amount * 5 ? 'white' : '#ccc',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: score >= amount * 5 ? 'pointer' : 'not-allowed',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        width: '100%'
                      }}
                    >
                      CONVERT
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ 
                backgroundColor: '#2C3E50', 
                padding: '20px', 
                borderRadius: '10px', 
                marginTop: '30px',
                border: '1px solid #34495E'
              }}>
                <h4 style={{ color: '#E74C3C', marginTop: '0' }}>⚠️ Transaction Fees</h4>
                <p style={{ margin: '0', color: '#BDC3C7' }}>
                  Every purchase in Market and Power-ups requires 1 XAN token as a transaction fee. 
                  Make sure you have enough XAN tokens before making purchases!
                </p>
              </div>
            </div>
          )}

          {/* Market Tab */}
          {activeTab === 'market' && (
            <div>
              <h3 style={{ color: '#4ECDC4', marginTop: '0' }}>🎨 Shrimp Skins Market</h3>
              <p style={{ marginBottom: '20px' }}>
                Current Skin: <span style={{ color: currentSkin.color }}>●</span> {currentSkin.name} 
                <span style={{ color: '#FFD93D' }}> (x{currentSkin.multiplier} Points Multiplier)</span>
                <br />
                <span style={{ color: '#E74C3C', fontSize: '14px' }}>⚠️ All purchases require 1 XAN token as transaction fee</span>
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
                {SKINS.map(skin => (
                  <div key={skin.name} style={{
                    backgroundColor: '#445566',
                    padding: '20px',
                    borderRadius: '10px',
                    border: currentSkin.name === skin.name ? '3px solid #4ECDC4' : '2px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '5px' }}>
                        <span style={{ color: skin.color, fontSize: '24px' }}>●</span> {skin.name}
                      </div>
                      <div style={{ color: '#FFD93D', fontSize: '14px' }}>
                        x{skin.multiplier} Points Multiplier
                      </div>
                      <div style={{ color: '#4ECDC4', fontSize: '16px', marginTop: '5px' }}>
                        {skin.cost === 0 ? 'FREE' : `${skin.cost} 🦐 + 1 XAN fee`}
                      </div>
                    </div>
                    <button
                      onClick={() => buySkin(skin)}
                      disabled={(score < skin.cost || (skin.cost > 0 && xanTokens < 1)) || currentSkin.name === skin.name}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: currentSkin.name === skin.name ? '#666' : 
                          ((score >= skin.cost && (skin.cost === 0 || xanTokens >= 1)) ? '#4ECDC4' : '#666'),
                        color: currentSkin.name === skin.name ? '#ccc' : 
                          ((score >= skin.cost && (skin.cost === 0 || xanTokens >= 1)) ? '#001122' : '#ccc'),
                        border: 'none',
                        borderRadius: '8px',
                        cursor: ((score >= skin.cost && (skin.cost === 0 || xanTokens >= 1)) && currentSkin.name !== skin.name) ? 'pointer' : 'not-allowed',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                    >
                      {currentSkin.name === skin.name ? 'EQUIPPED' : 'BUY'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Power-ups Tab */}
          {activeTab === 'powerups' && (
            <div>
              <h3 style={{ color: '#FFD93D', marginTop: '0' }}>⚡ Power-ups Store</h3>
              <p style={{ marginBottom: '20px' }}>
                Boost your shrimp catching abilities with these temporary power-ups!
                <br />
                <span style={{ color: '#E74C3C', fontSize: '14px' }}>⚠️ All purchases require 1 XAN token as transaction fee</span>
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
                {POWER_UPS.map(powerUp => (
                  <div key={powerUp.name} style={{
                    backgroundColor: '#445566',
                    padding: '20px',
                    borderRadius: '10px',
                    border: '2px solid #FFD93D',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '5px', color: '#FFD93D' }}>
                        ⚡ {powerUp.name}
                      </div>
                      <div style={{ color: '#ccc', fontSize: '14px', marginBottom: '5px' }}>
                        Duration: {powerUp.duration / 1000} seconds
                      </div>
                      <div style={{ color: '#4ECDC4', fontSize: '16px' }}>
                        {powerUp.cost} 🦐 + 1 XAN fee
                      </div>
                    </div>
                    <button
                      onClick={() => buyPowerUp(powerUp)}
                      disabled={score < powerUp.cost || xanTokens < 1}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: (score >= powerUp.cost && xanTokens >= 1) ? '#FFD93D' : '#666',
                        color: (score >= powerUp.cost && xanTokens >= 1) ? '#001122' : '#ccc',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: (score >= powerUp.cost && xanTokens >= 1) ? 'pointer' : 'not-allowed',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                    >
                      BUY
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div>
              <h3 style={{ color: '#A8E6CF', marginTop: '0' }}>📊 Game Statistics</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '30px' }}>
                <div style={{
                  backgroundColor: '#445566',
                  padding: '25px',
                  borderRadius: '10px',
                  border: '2px solid #4ECDC4'
                }}>
                  <h4 style={{ color: '#4ECDC4', margin: '0 0 15px 0' }}>💰 Score Stats</h4>
                  <p><strong>Total Score:</strong> {score} 🦐</p>
                  <p><strong>XAN Tokens:</strong> {xanTokens} XAN</p>
                  <p><strong>Game Score:</strong> {gameScore} 🦐</p>
                  <p><strong>High Score:</strong> {highScore} 🦐</p>
                </div>
                
                <div style={{
                  backgroundColor: '#445566',
                  padding: '25px',
                  borderRadius: '10px',
                  border: '2px solid #FF6B6B'
                }}>
                  <h4 style={{ color: '#FF6B6B', margin: '0 0 15px 0' }}>🎯 Game Stats</h4>
                  <p><strong>Shrimp Caught:</strong> {shrimpCaught}</p>
                  <p><strong>Current Combo:</strong> x{combo}</p>
                  <p><strong>Active Power-ups:</strong> {activePowerUps.length}</p>
                </div>
                
                <div style={{
                  backgroundColor: '#445566',
                  padding: '25px',
                  borderRadius: '10px',
                  border: '2px solid #FFD93D'
                }}>
                  <h4 style={{ color: '#FFD93D', margin: '0 0 15px 0' }}>🎨 Current Setup</h4>
                  <p><strong>Active Skin:</strong> {currentSkin.name}</p>
                  <p><strong>Points Multiplier:</strong> x{currentSkin.multiplier}</p>
                  <p><strong>Skin Color:</strong> <span style={{ color: currentSkin.color }}>●</span></p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
