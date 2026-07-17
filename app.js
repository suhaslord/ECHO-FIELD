const canvas = document.querySelector('#fieldCanvas');
const ctx = canvas.getContext('2d');
const wrap = document.querySelector('.canvas-wrap');
const cursorOrb = document.querySelector('#cursorOrb');
const statusText = document.querySelector('#statusText');
const phraseText = document.querySelector('#phraseText');
const waveform = document.querySelector('#waveform');
const instrument = document.querySelector('.instrument');
const toggleInspectorBtn = document.querySelector('#toggleInspector');
const toggleSoundBtn = document.querySelector('#toggleSound');

const customColor1 = document.querySelector('#customColor1');
const customColor2 = document.querySelector('#customColor2');
const customColor3 = document.querySelector('#customColor3');
const customColorsRow = document.querySelector('#customColorsRow');

const video = document.querySelector('#webcamVideo');
const camCanvas = document.querySelector('#webcamCanvas');
const camCtx = camCanvas.getContext('2d', { willReadFrequently: true });
const handOverlay = document.querySelector('#handOverlay');
const handOverlayCtx = handOverlay?.getContext('2d');

const phrases = [
  'move through the quiet',
  'a color remembers you',
  'listen for the shape',
  'nothing repeats exactly',
  'your attention leaves a trace',
  'the room is still becoming'
];

const poetryFragments = {
  subjects: ['the quiet', 'your focus', 'this digital space', 'the frequency', 'a line', 'the trace', 'the seed', 'every voice', 'an echo', 'the light'],
  verbs: ['remembers', 'bends toward', 'shapes', 'echoes', 'vibrates in', 'dissolves into', 'floats through', 'weaves', 'transforms', 'absorbs'],
  objects: ['the room', 'attention', 'a modern memory', 'the flow', 'the color', 'the electric light', 'infinite patterns', 'the digital air', 'the canvas', 'pure space']
};

const palettes = {
  prism: [265, 190, 76],
  violet: [268, 250, 290],
  lime: [74, 96, 115],
  custom: [265, 190, 76]
};

let width = 0;
let height = 0;
let dpr = 1;
let t = 0;
let seed = 731984512;
let mode = 'voice';
let energy = 0.22;
let micLevel = 0;
let density = 0.62;
let drift = 0.34;
let palette = 'prism';
let visualStyle = 'flow';
let intensity = 0.72;
let lineWeight = 0.8;
let formScale = 0.72;
let mediaRecorder = null;
let recordChunks = [];
let pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
let waveSpans = [];
let ripples = [];
let particles = [];

let audioStream = null;
let audioCtx = null;
let videoStream = null;
let handTracker = null;
let handFramePending = false;
let handConfidence = 0;
let handLostFrames = 0;
let visionTarget = { x: 0.5, y: 0.5 };
let visionLocked = false;

let lastInteractionTime = Date.now();
let isGhostMode = false;
let ghostT = 0;

// Synthesizer variables
let synthActive = false;
let audioSynthCtx = null;
let mainOsc = null;
let subOsc = null;
let delayNode = null;
let synthGain = null;
let synthFilter = null;

const pentatonic = [110, 130.81, 146.83, 164.81, 196.00, 220, 261.63, 293.66, 329.63, 392.00, 440, 523.25, 587.33, 659.25, 783.99, 880];

function resize() {
  const r = wrap.getBoundingClientRect();
  dpr = Math.min(2, window.devicePixelRatio || 1);
  width = r.width;
  height = r.height;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  initParticles();
}

function hash(n) {
  return Math.sin(n * 12.9898 + seed) * 43758.5453 % 1;
}

function noise(x, y) {
  return Math.sin(x * 1.7 + Math.sin(y * 1.13 + t * drift * 0.7)) +
         Math.sin(y * 1.2 + x * 0.62 - t * drift * 0.5) * 0.7 +
         Math.sin((x + y) * 2.4 + t * 0.08) * 0.4;
}

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

function easeTowards(current, target, factor) {
  return current + (target - current) * factor;
}



function generatePoetry() {
  const seedHash1 = hash(seed * 1.1);
  const seedHash2 = hash(seed * 2.2);
  const seedHash3 = hash(seed * 3.3);
  
  const s = poetryFragments.subjects[Math.floor(Math.abs(seedHash1) * poetryFragments.subjects.length)];
  const v = poetryFragments.verbs[Math.floor(Math.abs(seedHash2) * poetryFragments.verbs.length)];
  const o = poetryFragments.objects[Math.floor(Math.abs(seedHash3) * poetryFragments.objects.length)];
  const adj = mode === 'voice' ? 'vocal' : mode === 'vision' ? 'watching' : mode === 'motion' ? 'moving' : 'remembered';
  
  phraseText.textContent = `${s} ${v} ${adj} ${o}`;
}

function hexToHue(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h;
  if (max === min) h = 0;
  else if (max === r) h = (g - b) / (max - min) + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / (max - min) + 2;
  else h = (r - g) / (max - min) + 4;
  return Math.round(h * 60);
}

function updateCustomPalette() {
  const c1 = customColor1.value;
  const c2 = customColor2.value;
  const c3 = customColor3.value;
  
  palettes.custom = [hexToHue(c1), hexToHue(c2), hexToHue(c3)];
  
  document.documentElement.style.setProperty('--custom-1', c1);
  document.documentElement.style.setProperty('--custom-2', c2);
  document.documentElement.style.setProperty('--custom-3', c3);
}

function initSynth() {
  if (audioSynthCtx) return;
  try {
    audioSynthCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    synthGain = audioSynthCtx.createGain();
    synthGain.gain.setValueAtTime(0, audioSynthCtx.currentTime);
    
    synthFilter = audioSynthCtx.createBiquadFilter();
    synthFilter.type = 'lowpass';
    synthFilter.Q.setValueAtTime(1.5, audioSynthCtx.currentTime);
    
    delayNode = audioSynthCtx.createDelay();
    delayNode.delayTime.setValueAtTime(0.3, audioSynthCtx.currentTime);
    
    const delayGain = audioSynthCtx.createGain();
    delayGain.gain.setValueAtTime(0.25, audioSynthCtx.currentTime);
    
    synthFilter.connect(synthGain);
    synthGain.connect(delayNode);
    delayNode.connect(delayGain);
    delayGain.connect(synthFilter);
    synthGain.connect(audioSynthCtx.destination);
    
    mainOsc = audioSynthCtx.createOscillator();
    mainOsc.type = 'triangle';
    mainOsc.frequency.setValueAtTime(220, audioSynthCtx.currentTime);
    
    subOsc = audioSynthCtx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(110, audioSynthCtx.currentTime);
    
    const subGain = audioSynthCtx.createGain();
    subGain.gain.setValueAtTime(0.12, audioSynthCtx.currentTime);
    
    mainOsc.connect(synthFilter);
    subOsc.connect(subGain);
    subGain.connect(synthGain);
    
    mainOsc.start();
    subOsc.start();
  } catch (err) {
    console.warn("Failed to initialize synth:", err);
  }
}

function updateSynthSound() {
  if (!synthActive || !audioSynthCtx) return;
  if (audioSynthCtx.state === 'suspended') audioSynthCtx.resume();
  
  const dx = pointer.tx - pointer.x;
  const dy = pointer.ty - pointer.y;
  const speed = Math.sqrt(dx * dx + dy * dy);
  
  let dynamicEnergy = mode === 'voice' ? micLevel * 0.18 : mode === 'vision' ? handConfidence * 0.1 : 0;
  const targetVolume = Math.min(0.22, speed * 2.8 + 0.04 + dynamicEnergy);
  synthGain.gain.setTargetAtTime(targetVolume, audioSynthCtx.currentTime, 0.15);
  
  const scaleIndex = Math.floor(Math.max(0, Math.min(1, pointer.x)) * (pentatonic.length - 1));
  const targetFreq = pentatonic[scaleIndex];
  mainOsc.frequency.setTargetAtTime(targetFreq, audioSynthCtx.currentTime, 0.1);
  
  const targetFilterCutoff = 220 + (1 - pointer.y) * 1500 + energy * 350;
  synthFilter.frequency.setTargetAtTime(targetFilterCutoff, audioSynthCtx.currentTime, 0.25);
}

function playChime() {
  if (!synthActive || !audioSynthCtx) return;
  try {
    const chimeOsc = audioSynthCtx.createOscillator();
    const chimeGain = audioSynthCtx.createGain();
    
    chimeOsc.type = 'sine';
    const note = pentatonic[Math.floor(8 + Math.random() * 7)];
    chimeOsc.frequency.setValueAtTime(note * 2, audioSynthCtx.currentTime);
    
    chimeGain.gain.setValueAtTime(0.2, audioSynthCtx.currentTime);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, audioSynthCtx.currentTime + 1.2);
    
    chimeOsc.connect(chimeGain);
    chimeGain.connect(synthFilter || audioSynthCtx.destination);
    
    chimeOsc.start();
    chimeOsc.stop(audioSynthCtx.currentTime + 1.3);
  } catch (e) {}
}

function initParticles() {
  const count = Math.floor(200 + density * 500);
  particles = Array.from({ length: count }, (_, i) => ({
    x: Math.abs(hash(seed + i * 1.37)),
    y: Math.abs(hash(seed + i * 2.41)),
    vx: (hash(seed + i * 3.11) - 0.5) * 0.001,
    vy: (hash(seed + i * 4.19) - 0.5) * 0.001,
    size: 0.6 + Math.abs(hash(seed + i * 5.23)) * 1.8
  }));
}
function drawFlowField() {
  // Clear with trails
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(2, 2, 4, 0.22)';
  ctx.fillRect(0, 0, width, height);
  
  const cx = pointer.x * width;
  const cy = pointer.y * height;
  const colors = palettes[palette];
  const lines = Math.floor(28 + density * 44);

  // Parallax shift based on cursor
  const shiftX = (pointer.x - 0.5) * 20;
  const shiftY = (pointer.y - 0.5) * 20;
  ctx.translate(-shiftX, -shiftY);

  // Lighter composite for bloom
  ctx.globalCompositeOperation = 'screen';

  // Draw Field Contour Lines
  for (let i = 0; i < lines; i++) {
    const base = (i + 1) / (lines + 1);
    const hue = colors[i % 3];
    ctx.beginPath();
    for (let s = -30; s <= width + 60; s += 8) {
      const y = height * base +
                noise(s * 0.009, base * 4 + i * 0.11) * height * 0.065 +
                Math.sin(s * 0.014 + t * (0.35 + energy * 0.7) + i) * height * 0.025;
      const pull = Math.exp(-Math.pow((s - cx) / (width * 0.2), 2)) *
                   Math.sin((s - cx) * 0.025 + t) * height * 0.08;
      const yy = y + pull * (0.4 + energy);
      if (s === -30) ctx.moveTo(s, yy);
      else ctx.lineTo(s, yy);
    }
    ctx.strokeStyle = `hsla(${hue}, 88%, ${hue === 76 || hue === 96 ? '63' : '72'}%, ${0.15 + energy * 0.3})`;
    ctx.lineWidth = lineWeight * (i % 7 === 0 ? 1.5 : 0.6);
    ctx.stroke();
  }

  // Draw Ripples
  ripples.forEach((rip, idx) => {
    rip.radius += 3.5;
    rip.opacity = 1 - (rip.radius / rip.maxRadius);
    if (rip.radius >= rip.maxRadius) {
      ripples.splice(idx, 1);
      return;
    }
    ctx.beginPath();
    ctx.arc(rip.x * width, rip.y * height, rip.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${rip.hue}, 95%, 72%, ${rip.opacity * 0.6})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(rip.x * width, rip.y * height, rip.radius * 0.95, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${rip.hue}, 95%, 72%, ${rip.opacity * 0.2})`;
    ctx.lineWidth = 4;
    ctx.stroke();
  });

  // Advanced Swarm Particles
  const maxParticleForce = 0.0003 + (energy * 0.001);
  if (particles.length !== Math.floor(200 + density * 500)) initParticles(); // React to density dynamically
  
  particles.forEach((p, i) => {
    // Steer towards cursor (gravity)
    const dx = pointer.x - p.x;
    const dy = pointer.y - p.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    if (dist < 0.35) {
      const force = (0.35 - dist) * maxParticleForce;
      p.vx += dx * force;
      p.vy += dy * force;
    }
    
    // Add noise drift
    p.vx += (Math.random() - 0.5) * 0.0008;
    p.vy += (Math.random() - 0.5) * 0.0008;
    
    // Friction
    p.vx *= 0.95;
    p.vy *= 0.95;
    
    p.x += p.vx;
    p.y += p.vy;
    
    // Wrap
    if(p.x < 0) p.x += 1; if(p.x > 1) p.x -= 1;
    if(p.y < 0) p.y += 1; if(p.y > 1) p.y -= 1;
    
    ctx.fillStyle = `hsla(${colors[i % 3]}, 90%, 75%, ${Math.min(1, 1.2 - dist/0.4)})`;
    ctx.fillRect(p.x * width, p.y * height, p.size, p.size);
  });

  // Hover Glow Orb
  const glow = ctx.createRadialGradient(cx, cy, 1, cx, cy, width * 0.15);
  glow.addColorStop(0, 'rgba(255, 240, 255, 0.9)');
  glow.addColorStop(0.1, 'rgba(157, 123, 255, 0.4)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - width * 0.2, cy - height * 0.2, width * 0.4, height * 0.4);

  // Restore translation
  ctx.translate(shiftX, shiftY);
  ctx.globalCompositeOperation = 'source-over';
}


function clearField() {
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(2, 2, 4, 0.28)';
  ctx.fillRect(0, 0, width, height);
}

function drawField() {
  if (visualStyle === 'orbit') return drawOrbitField();
  if (visualStyle === 'constellation') return drawConstellationField();
  if (visualStyle === 'topography') return drawTopographyField();
  return drawFlowField();
}

function drawOrbitField() {
  clearField();
  const colors = palettes[palette];
  const cx = pointer.x * width;
  const cy = pointer.y * height;
  const radius = Math.min(width, height) * formScale * 0.72;
  const rings = Math.floor(12 + density * 26);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.translate(cx, cy);
  for (let ring = 0; ring < rings; ring++) {
    const ringRadius = radius * (0.12 + ring / rings * 0.9);
    const points = 90;
    ctx.beginPath();
    for (let i = 0; i <= points; i++) {
      const angle = i / points * Math.PI * 2;
      const wave = noise(Math.cos(angle) * 1.6 + ring * 0.1, Math.sin(angle) * 1.6 + ring * 0.08);
      const wobble = wave * radius * 0.018 + Math.sin(angle * 3 + t * (0.6 + energy)) * radius * 0.012;
      const x = Math.cos(angle) * (ringRadius + wobble) * (1 + pointer.x * 0.12);
      const y = Math.sin(angle) * (ringRadius + wobble) * (0.72 + pointer.y * 0.18);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `hsla(${colors[ring % 3]}, 90%, 72%, ${0.12 + intensity * 0.22})`;
    ctx.lineWidth = lineWeight * (ring % 5 === 0 ? 1.6 : 0.7);
    ctx.stroke();
  }
  const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, radius * 0.52);
  glow.addColorStop(0, `rgba(255, 245, 255, ${0.32 + intensity * 0.2})`);
  glow.addColorStop(0.3, 'rgba(157, 123, 255, 0.14)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
  ctx.restore();
}

function drawConstellationField() {
  clearField();
  const colors = palettes[palette];
  const count = Math.min(260, Math.floor(90 + density * 180));
  const nodes = [];
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < count; i++) {
    const p = particles[(i * 3) % particles.length];
    nodes.push({ x: ((p.x + Math.sin(t * 0.15 + i) * 0.012 + 1) % 1) * width, y: ((p.y + Math.cos(t * 0.12 + i * 0.7) * 0.012 + 1) % 1) * height });
  }
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    const b = nodes[(i + 1) % nodes.length];
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    if (dx * dx + dy * dy < (Math.min(width, height) * 0.22) ** 2) {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = `hsla(${colors[i % 3]}, 90%, 72%, ${0.08 + intensity * 0.18})`;
      ctx.lineWidth = lineWeight * 0.65;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.fillStyle = `hsla(${colors[i % 3]}, 95%, 78%, ${0.26 + intensity * 0.5})`;
    ctx.arc(a.x, a.y, 0.8 + lineWeight * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTopographyField() {
  clearField();
  const colors = palettes[palette];
  const cx = pointer.x * width;
  const cy = pointer.y * height;
  const maxRadius = Math.hypot(width, height) * formScale;
  const rings = Math.floor(18 + density * 35);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let ring = 0; ring < rings; ring++) {
    const baseRadius = maxRadius * (ring + 1) / rings;
    ctx.beginPath();
    for (let i = 0; i <= 140; i++) {
      const angle = i / 140 * Math.PI * 2;
      const terrain = noise(Math.cos(angle) * 1.8 + ring * 0.14, Math.sin(angle) * 1.8 - ring * 0.1);
      const r = baseRadius + terrain * 18 * (0.4 + intensity);
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r * 0.62;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `hsla(${colors[ring % 3]}, 88%, 70%, ${0.1 + intensity * 0.2})`;
    ctx.lineWidth = lineWeight * (ring % 6 === 0 ? 1.45 : 0.65);
    ctx.stroke();
  }
  ctx.restore();
}
function animate() {
  t += 0.012;
  
  // Ghost Mode Logic
  const now = Date.now();
  const autopilotChecked = document.querySelector('#toggleAutopilot')?.checked ?? true;
  if (autopilotChecked && now - lastInteractionTime > 4000 && mode !== 'vision') {
    isGhostMode = true;
    ghostT += 0.006;
    pointer.tx = 0.5 + Math.sin(ghostT * 1.3) * 0.35 + Math.sin(ghostT * 2.7) * 0.1;
    pointer.ty = 0.5 + Math.cos(ghostT * 1.1) * 0.35 + Math.sin(ghostT * 2.9) * 0.1;
    document.querySelector('#canvasHint').textContent = "AUTOPILOT / GHOST MODE";
    document.querySelector('#canvasHint').style.opacity = 0.8;
  } else {
    isGhostMode = false;
  }

  pointer.x += (pointer.tx - pointer.x) * 0.08;
  pointer.y += (pointer.ty - pointer.y) * 0.08;
  
  let activeEnergy = mode === 'voice' ? micLevel * 0.5 : mode === 'vision' ? handConfidence * 0.28 : 0;
  energy = 0.16 + Math.abs(Math.sin(t * 0.7)) * 0.16 + activeEnergy + drift * 0.12;
  
  drawField();
  updateSynthSound();
  
  cursorOrb.style.left = `${pointer.x * 100}%`;
  cursorOrb.style.top = `${pointer.y * 100}%`;

  // Update HUD Overlay dynamically
  const hudOverlay = document.querySelector('#hudOverlay');
  if (hudOverlay) {
    // Calculate FPS
    if (!animate.lastTime) animate.lastTime = now;
    if (!animate.frameCount) animate.frameCount = 0;
    animate.frameCount++;
    if (now - animate.lastTime >= 1000) {
      const fps = Math.round((animate.frameCount * 1000) / (now - animate.lastTime));
      const fpsEl = document.querySelector('#fpsCounter');
      if (fpsEl) fpsEl.textContent = `${fps} FPS`;
      animate.frameCount = 0;
      animate.lastTime = now;
    }

    // Tracker Status & Confidence
    let status = 'IDLE';
    let confidence = 0;
    if (mode === 'voice') {
      status = micLevel > 0.02 ? 'ACTIVE' : 'LISTENING';
      confidence = Math.min(100, Math.round(micLevel * 350));
    } else if (mode === 'vision') {
      status = visionLocked ? 'LOCKED' : handLostFrames > 0 && handLostFrames < 18 ? 'HOLDING' : 'SEARCHING';
      confidence = Math.min(100, Math.round(handConfidence * 100));
    } else if (mode === 'motion') {
      const dx = pointer.tx - pointer.x;
      const dy = pointer.ty - pointer.y;
      const speed = Math.sqrt(dx * dx + dy * dy);
      status = speed > 0.005 ? 'TRACKING' : 'ACTIVE';
      confidence = Math.min(100, Math.round(60 + speed * 1200));
    } else if (mode === 'memory') {
      status = 'STABLE';
      confidence = Math.round(85 + Math.sin(t * 2) * 5);
    }

    const statusEl = document.querySelector('#trackerStatus');
    if (statusEl) {
      statusEl.textContent = status;
      // Clear status classes and add current one
      statusEl.className = 'hud-value';
      statusEl.classList.add(`status-${status.toLowerCase()}`);
    }

    const confBar = document.querySelector('#confidenceBarInner');
    const confVal = document.querySelector('#confidenceVal');
    if (confBar) confBar.style.width = `${confidence}%`;
    if (confVal) confVal.textContent = `${confidence}%`;
  }

  // Update Target Lock Reticle position & visibility
  const targetLock = document.querySelector('#targetLock');
  if (targetLock) {
    const isVision = mode === 'vision';
    const isTracking = isVision && visionLocked;
    targetLock.classList.toggle('active', isTracking);
    if (isTracking) {
      targetLock.style.left = `${pointer.x * 100}%`;
      targetLock.style.top = `${pointer.y * 100}%`;
    }
  }

  // Animate Waveform
  if (waveSpans.length) {
    const waveColors = palettes[palette];
    for (let i = 0; i < waveSpans.length; i++) {
      let h;
      if (mode === 'voice' && micLevel > 0.01) {
        h = 8 + (micLevel * 45) * (0.3 + 0.7 * Math.sin(t * 6 + i * 0.3));
        waveSpans[i].style.backgroundColor = `hsla(${waveColors[i % 3]}, 88%, 70%, 0.9)`;
      } else if (mode === 'vision' && handConfidence > 0.01) {
        h = 8 + (handConfidence * 60) * (0.3 + 0.7 * Math.sin(t * 8 + i * 0.4));
        waveSpans[i].style.backgroundColor = `hsla(${waveColors[(i+1) % 3]}, 88%, 70%, 0.8)`;
      } else {
        const speed = mode === 'motion' ? 2.5 : 1.2;
        const amp = mode === 'motion' ? 12 : 5;
        const base = mode === 'motion' ? 14 : 8;
        h = base + Math.sin(t * speed + i * 0.18) * amp;
        waveSpans[i].style.backgroundColor = '';
      }
      h = Math.max(4, Math.min(36, h));
      waveSpans[i].style.height = `${h}px`;
    }
  }

  requestAnimationFrame(animate);
}

function buildWave() {
  waveform.innerHTML = '';
  waveSpans = [];
  for (let i = 0; i < 60; i++) {
    const s = document.createElement('span');
    s.style.height = `8px`;
    waveform.append(s);
    waveSpans.push(s);
  }
}

function syncInspectorBtn() {
  if (toggleInspectorBtn) {
    const isOpen = instrument.classList.contains('inspector-open');
    toggleInspectorBtn.classList.toggle('active', isOpen);
  }
}

function setMode(next) {
  mode = next;
  document.querySelectorAll('.input-module').forEach(b => {
    const on = b.dataset.mode === next;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on);
  });
  
  statusText.textContent = next === 'voice' ? 'LISTENING' : next === 'vision' ? 'HAND TRACKING' : next === 'motion' ? 'TRACKING' : 'REMEMBERING';
  generatePoetry();
  
  if (next === 'voice') {
    startMic();
    stopVision();
  } else if (next === 'vision') {
    startVision();
    stopMic();
  } else {
    stopMic();
    stopVision();
  }
}

async function startMic() {
  if (audioStream) return;
  if (!navigator.mediaDevices?.getUserMedia) return;
  try {
    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    audioCtx.createMediaStreamSource(audioStream).connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    
    const tick = () => {
      if (!audioStream) {
        micLevel = 0;
        return;
      }
      analyser.getByteFrequencyData(data);
      micLevel = data.reduce((a, b) => a + b, 0) / (data.length * 255);
      requestAnimationFrame(tick);
    };
    tick();
  } catch (err) {
    console.warn("Microphone access failed", err);
    statusText.textContent = 'MOTION READY';
    audioStream = null;
    audioCtx = null;
  }
}

function stopMic() {
  if (audioStream) {
    audioStream.getTracks().forEach(track => track.stop());
    audioStream = null;
  }
  if (audioCtx && audioCtx.state !== 'closed') {
    audioCtx.close();
    audioCtx = null;
  }
  micLevel = 0;
}

async function startVision() {
  if (videoStream) return;
  if (!navigator.mediaDevices?.getUserMedia) return;
  try {
    if (!window.Hands) throw new Error('Hand tracking model did not load');
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      audio: false
    });
    video.srcObject = videoStream;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    const previewLabel = document.querySelector('#trackingPreviewLabel');
    const preview = document.querySelector('#trackingPreview');

    handTracker = new Hands({ locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}` });
    handTracker.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.72, minTrackingConfidence: 0.68 });
    handTracker.onResults(results => {
      drawHandResults(results);
      const landmarks = results.multiHandLandmarks?.[0];
      if (!landmarks) {
        handLostFrames++;
        handConfidence = easeTowards(handConfidence, 0, 0.12);
        if (visionLocked && handLostFrames < 18) {
          if (previewLabel) previewLabel.textContent = 'HOLDING';
        } else {
          visionLocked = false;
          if (previewLabel) previewLabel.textContent = 'SEARCHING';
          if (preview) preview.classList.remove('active');
        }
        return;
      }

      const wrist = landmarks[0];
      const indexMcp = landmarks[5];
      const indexTip = landmarks[8];
      const palmX = (wrist.x + indexMcp.x + landmarks[9].x) / 3;
      const palmY = (wrist.y + indexMcp.y + landmarks[9].y) / 3;
      const targetX = 1 - clamp01(indexTip.x * 0.72 + palmX * 0.28);
      const targetY = clamp01(indexTip.y * 0.72 + palmY * 0.28);
      visionTarget.x = easeTowards(visionTarget.x, targetX, 0.28);
      visionTarget.y = easeTowards(visionTarget.y, targetY, 0.28);
      pointer.tx = visionTarget.x;
      pointer.ty = visionTarget.y;
      handConfidence = easeTowards(handConfidence, 1, 0.2);
      handLostFrames = 0;
      visionLocked = true;
      lastInteractionTime = Date.now();
      if (preview) preview.classList.add('active');
      if (previewLabel) previewLabel.textContent = 'LOCKED';
      const hint = document.querySelector('#canvasHint');
      if (hint) hint.style.opacity = 0;
    });

    await video.play();
    const tick = async () => {
      if (!videoStream) return;
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !handFramePending) {
        handFramePending = true;
        try { await handTracker.send({ image: video }); } catch (err) { console.warn('Hand frame failed', err); }
        handFramePending = false;
      }
      requestAnimationFrame(tick);
    };
    tick();
  } catch (err) {
    console.warn('Camera access failed', err);
    statusText.textContent = 'VISION UNAVAILABLE';
    const previewLabel = document.querySelector('#trackingPreviewLabel');
    if (previewLabel) previewLabel.textContent = 'MODEL OFFLINE';
    videoStream = null;
  }
}

function drawHandResults(results) {
  if (!handOverlay || !handOverlayCtx || !video.videoWidth) return;
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (handOverlay.width !== w || handOverlay.height !== h) {
    handOverlay.width = w;
    handOverlay.height = h;
  }
  handOverlayCtx.clearRect(0, 0, w, h);
  const landmarks = results.multiHandLandmarks?.[0];
  if (!landmarks) return;
  handOverlayCtx.save();
  handOverlayCtx.translate(w, 0);
  handOverlayCtx.scale(-1, 1);
  const connections = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];
  handOverlayCtx.strokeStyle = 'rgba(171, 255, 215, 0.9)';
  handOverlayCtx.lineWidth = Math.max(2, w / 180);
  connections.forEach(([a, b]) => {
    handOverlayCtx.beginPath();
    handOverlayCtx.moveTo(landmarks[a].x * w, landmarks[a].y * h);
    handOverlayCtx.lineTo(landmarks[b].x * w, landmarks[b].y * h);
    handOverlayCtx.stroke();
  });
  landmarks.forEach((point, index) => {
    handOverlayCtx.beginPath();
    handOverlayCtx.fillStyle = index === 8 ? '#fff4b0' : '#a9ffd4';
    handOverlayCtx.arc(point.x * w, point.y * h, index === 8 ? w / 38 : w / 70, 0, Math.PI * 2);
    handOverlayCtx.fill();
  });
  handOverlayCtx.restore();
}

function stopVision() {
  if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop());
    videoStream = null;
  }
  if (handTracker?.close) handTracker.close();
  handTracker = null;
  handFramePending = false;
  handConfidence = 0;
  handLostFrames = 0;
  visionLocked = false;
  if (handOverlayCtx && handOverlay) handOverlayCtx.clearRect(0, 0, handOverlay.width, handOverlay.height);
  const preview = document.querySelector('#trackingPreview');
  const previewLabel = document.querySelector('#trackingPreviewLabel');
  if (preview) preview.classList.remove('active');
  if (previewLabel) previewLabel.textContent = 'SEARCHING';
}
function setFieldNumber() {
  const n = String(Math.floor(seed % 1000)).padStart(3, '0');
  document.querySelector('#fieldNumber').textContent = document.querySelector('#fieldNumberBottom').textContent = n;
  document.querySelector('#seedValue').textContent = String(seed);
}

function randomize() {
  seed = Math.floor(Math.random() * 900000000) + 100000000;
  setFieldNumber();
  generatePoetry();
  statusText.textContent = 'NEW FIELD';
  document.querySelector('#canvasHint').style.opacity = 0;
  lastInteractionTime = Date.now(); // prevent ghost mode
}

function download(name, url) {
  const a = document.createElement('a');
  a.download = name;
  a.href = url;
  a.click();
}

function exportPng() {
  download(`echo-field-${seed}.png`, canvas.toDataURL('image/png'));
  statusText.textContent = 'PNG READY';
}

function savedFields() {
  try {
    return JSON.parse(localStorage.getItem('echo-fields') || '[]');
  } catch {
    return [];
  }
}

function renderSaved() {
  const items = savedFields();
  const host = document.querySelector('#savedFields');
  host.innerHTML = '';
  items.forEach((item, index) => {
    const img = document.createElement('img');
    img.className = 'saved-thumb';
    img.src = item.image;
    img.alt = `Saved field ${index + 1}`;
    img.title = `Load field ${item.seed}`;
    img.addEventListener('click', () => {
      seed = item.seed;
      palette = item.palette;
      visualStyle = item.visualStyle || 'flow';
      intensity = item.intensity ?? 0.72;
      lineWeight = item.lineWeight ?? 0.8;
      formScale = item.formScale ?? 0.72;
      density = item.density;
      drift = item.drift;
      setFieldNumber();
      document.querySelector('#density').value = density;
      document.querySelector('#drift').value = drift;
      document.querySelector('#densityValue').textContent = density.toFixed(2);
      document.querySelector('#driftValue').textContent = drift.toFixed(2);
      document.querySelector('#intensity').value = intensity;
      document.querySelector('#lineWeight').value = lineWeight;
      document.querySelector('#formScale').value = formScale;
      document.querySelector('#intensityValue').textContent = intensity.toFixed(2);
      document.querySelector('#lineWeightValue').textContent = lineWeight.toFixed(2);
      document.querySelector('#formScaleValue').textContent = formScale.toFixed(2);
      document.querySelectorAll('.form-choice').forEach(x => x.classList.toggle('selected', x.dataset.style === visualStyle));
      
      document.querySelectorAll('.palette-choice').forEach(x => {
        const selected = x.dataset.palette === palette;
        x.classList.toggle('selected', selected);
      });
      
      customColorsRow.style.display = palette === 'custom' ? 'flex' : 'none';
      
      generatePoetry();
      statusText.textContent = 'FIELD LOADED';
      lastInteractionTime = Date.now();
    });
    host.append(img);
  });
  document.querySelector('#savedCount').textContent = `${items.length} / 06`;
}

function saveField() {
  const items = savedFields();
  items.unshift({
    image: canvas.toDataURL('image/jpeg', 0.72),
    seed,
    palette,
    visualStyle,
    intensity,
    lineWeight,
    formScale,
    density,
    drift
  });
  localStorage.setItem('echo-fields', JSON.stringify(items.slice(0, 6)));
  renderSaved();
  statusText.textContent = 'FIELD SAVED';
}

function toggleRecorder() {
  if (mediaRecorder?.state === 'recording') {
    mediaRecorder.stop();
    return;
  }
  if (!canvas.captureStream || !window.MediaRecorder) {
    statusText.textContent = 'RECORD UNAVAILABLE';
    return;
  }
  
  recordChunks = [];
  let streamToCapture = canvas.captureStream(30);
  
  if (synthActive && audioSynthCtx && synthGain) {
    try {
      const dest = audioSynthCtx.createMediaStreamDestination();
      synthGain.connect(dest);
      const audioTrack = dest.stream.getAudioTracks()[0];
      if (audioTrack) {
        streamToCapture.addTrack(audioTrack);
      }
    } catch (e) {
      console.warn("Failed to inject synth audio track into WebM recorder", e);
    }
  }

  mediaRecorder = new MediaRecorder(streamToCapture, { mimeType: 'video/webm' });
  mediaRecorder.ondataavailable = e => e.data.size && recordChunks.push(e.data);
  mediaRecorder.onstop = () => {
    const blob = new Blob(recordChunks, { type: 'video/webm' });
    download(`echo-field-${seed}.webm`, URL.createObjectURL(blob));
    document.querySelector('#recordField').classList.remove('recording');
    document.querySelector('#recordLabel').textContent = 'RECORD';
    statusText.textContent = 'RECORDING SAVED';
  };
  mediaRecorder.start();
  document.querySelector('#recordField').classList.add('recording');
  document.querySelector('#recordLabel').textContent = 'STOP';
  statusText.textContent = 'RECORDING';
}

// Event Listeners
document.querySelectorAll('.input-module').forEach(b => {
  b.addEventListener('click', () => {
    lastInteractionTime = Date.now();
    setMode(b.dataset.mode);
  });
});

wrap.addEventListener('pointermove', e => {
  lastInteractionTime = Date.now();
  if (mode !== 'vision') { // Don't override vision tracking with mouse if vision is active
    const r = wrap.getBoundingClientRect();
    pointer.tx = (e.clientX - r.left) / r.width;
    pointer.ty = (e.clientY - r.top) / r.height;
    document.querySelector('#canvasHint').style.opacity = 0;
  }
});

// Click Ripples
wrap.addEventListener('click', e => {
  lastInteractionTime = Date.now();
  const r = wrap.getBoundingClientRect();
  const clickX = (e.clientX - r.left) / r.width;
  const clickY = (e.clientY - r.top) / r.height;
  
  ripples.push({
    x: clickX,
    y: clickY,
    radius: 0,
    maxRadius: 100 + Math.random() * 80,
    opacity: 1,
    hue: palettes[palette][Math.floor(Math.random() * 3)]
  });
  
  if (ripples.length > 6) ripples.shift();
  playChime();
});

document.querySelector('#newField').addEventListener('click', randomize);
document.querySelector('#randomize').addEventListener('click', randomize);
document.querySelector('#saveField').addEventListener('click', saveField);
document.querySelector('#exportPng').addEventListener('click', exportPng);
document.querySelector('#recordField').addEventListener('click', toggleRecorder);


document.querySelectorAll('.form-choice').forEach(button => {
  button.addEventListener('click', () => {
    visualStyle = button.dataset.style;
    document.querySelectorAll('.form-choice').forEach(item => item.classList.toggle('selected', item === button));
    statusText.textContent = `${button.dataset.style.toUpperCase()} FORM`;
    lastInteractionTime = Date.now();
  });
});

[['intensity', 'intensityValue', value => intensity = value], ['lineWeight', 'lineWeightValue', value => lineWeight = value], ['formScale', 'formScaleValue', value => formScale = value]].forEach(([id, outputId, setValue]) => {
  document.querySelector(`#${id}`)?.addEventListener('input', event => {
    const value = Number(event.target.value);
    setValue(value);
    document.querySelector(`#${outputId}`).textContent = value.toFixed(2);
    lastInteractionTime = Date.now();
  });
});
document.querySelector('#density').addEventListener('input', e => {
  density = Number(e.target.value);
  document.querySelector('#densityValue').textContent = density.toFixed(2);
  lastInteractionTime = Date.now();
});

document.querySelector('#drift').addEventListener('input', e => {
  drift = Number(e.target.value);
  document.querySelector('#driftValue').textContent = drift.toFixed(2);
  lastInteractionTime = Date.now();
});

document.querySelectorAll('.palette-choice').forEach(b => {
  b.addEventListener('click', () => {
    palette = b.dataset.palette;
    document.querySelectorAll('.palette-choice').forEach(x => x.classList.toggle('selected', x === b));
    customColorsRow.style.display = palette === 'custom' ? 'flex' : 'none';
    statusText.textContent = 'PALETTE SHIFTED';
    lastInteractionTime = Date.now();
  });
});

// Custom Colors listeners
customColor1.addEventListener('input', updateCustomPalette);
customColor2.addEventListener('input', updateCustomPalette);
customColor3.addEventListener('input', updateCustomPalette);

if (toggleInspectorBtn) {
  toggleInspectorBtn.addEventListener('click', () => {
    instrument.classList.toggle('inspector-open');
    syncInspectorBtn();
    lastInteractionTime = Date.now();
  });
}

if (toggleSoundBtn) {
  toggleSoundBtn.addEventListener('click', () => {
    synthActive = !synthActive;
    toggleSoundBtn.classList.toggle('active', synthActive);
    toggleSoundBtn.textContent = synthActive ? 'SOUND: ON' : 'SOUND: OFF';
    if (synthActive) {
      initSynth();
    } else {
      if (synthGain && audioSynthCtx) {
        synthGain.gain.setTargetAtTime(0, audioSynthCtx.currentTime, 0.05);
      }
    }
    lastInteractionTime = Date.now();
  });
}

document.querySelector('#closeInspector').addEventListener('click', () => {
  instrument.classList.remove('inspector-open');
  syncInspectorBtn();
  lastInteractionTime = Date.now();
});

document.querySelector('#howItWorks').addEventListener('click', () => {
  document.querySelector('#howOverlay').hidden = false;
});

document.querySelector('#closeHow').addEventListener('click', () => {
  document.querySelector('#howOverlay').hidden = true;
});

document.querySelector('#howDone').addEventListener('click', () => {
  document.querySelector('#howOverlay').hidden = true;
});

document.querySelector('#beginButton').addEventListener('click', () => {
  document.querySelector('#welcomeOverlay').style.display = 'none';
  localStorage.setItem('echo-started', '1');
  instrument.classList.add('inspector-open');
  syncInspectorBtn();
  setMode('motion');
});

if (localStorage.getItem('echo-started')) {
  document.querySelector('#welcomeOverlay').style.display = 'none';
  instrument.classList.add('inspector-open');
  syncInspectorBtn();
  setMode('motion');
}

window.addEventListener('resize', resize);

// Initialization
updateCustomPalette();
buildWave();
renderSaved();
setFieldNumber();
resize();
animate();


