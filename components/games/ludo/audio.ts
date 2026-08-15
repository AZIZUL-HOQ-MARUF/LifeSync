let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!_ctx || _ctx.state === 'closed') _ctx = new AudioCtx();
    if (_ctx.state === 'suspended') void _ctx.resume();
    return _ctx;
  } catch {
    return null;
  }
}

export function playDiceSound() {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const sr = ctx.sampleRate;
    const now = ctx.currentTime;

    const impacts: [number, number, number][] = [
      [0.000, 0.65, 4200],
      [0.018, 0.72, 3800],
      [0.040, 0.60, 4400],
      [0.067, 0.55, 3600],
      [0.099, 0.62, 4100],
      [0.136, 0.48, 3400],
      [0.178, 0.42, 3900],
      [0.220, 0.32, 3200],
    ];

    for (const [off, vol, cFreq] of impacts) {
      const t = now + off;
      const impLen = Math.floor(sr * 0.018);
      const impBuf = ctx.createBuffer(1, impLen, sr);
      const d = impBuf.getChannelData(0);
      for (let i = 0; i < impLen; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sr * 0.0028));
      }
      const src = ctx.createBufferSource();
      src.buffer = impBuf;

      const hiFilt = ctx.createBiquadFilter();
      hiFilt.type = 'bandpass';
      hiFilt.frequency.value = cFreq;
      hiFilt.Q.value = 1.2;

      const loFilt = ctx.createBiquadFilter();
      loFilt.type = 'lowpass';
      loFilt.frequency.value = 380;

      const hiGain = ctx.createGain();
      hiGain.gain.setValueAtTime(vol, t);
      const loGain = ctx.createGain();
      loGain.gain.setValueAtTime(vol * 0.5, t);

      src.connect(hiFilt); hiFilt.connect(hiGain); hiGain.connect(ctx.destination);
      src.connect(loFilt); loFilt.connect(loGain); loGain.connect(ctx.destination);
      src.start(t);
    }

    const rollLen = Math.floor(sr * 0.25);
    const rollBuf = ctx.createBuffer(1, rollLen, sr);
    const rd = rollBuf.getChannelData(0);
    for (let i = 0; i < rollLen; i++) rd[i] = (Math.random() * 2 - 1) * 0.06;
    const rollSrc = ctx.createBufferSource();
    rollSrc.buffer = rollBuf;
    const rollFilt = ctx.createBiquadFilter();
    rollFilt.type = 'bandpass';
    rollFilt.frequency.value = 2400;
    rollFilt.Q.value = 2.5;
    const rollGain = ctx.createGain();
    rollGain.gain.setValueAtTime(0.0, now);
    rollGain.gain.linearRampToValueAtTime(0.55, now + 0.015);
    rollGain.gain.linearRampToValueAtTime(0.55, now + 0.19);
    rollGain.gain.linearRampToValueAtTime(0.0, now + 0.25);
    rollSrc.connect(rollFilt); rollFilt.connect(rollGain); rollGain.connect(ctx.destination);
    rollSrc.start(now);

    const stopT = now + 0.240;
    const stopOsc = ctx.createOscillator();
    stopOsc.type = 'sine';
    stopOsc.frequency.setValueAtTime(180, stopT);
    stopOsc.frequency.exponentialRampToValueAtTime(60, stopT + 0.07);
    const stopGain = ctx.createGain();
    stopGain.gain.setValueAtTime(0.8, stopT);
    stopGain.gain.exponentialRampToValueAtTime(0.001, stopT + 0.13);
    stopOsc.connect(stopGain); stopGain.connect(ctx.destination);
    stopOsc.start(stopT); stopOsc.stop(stopT + 0.14);
  } catch { /* audio unavailable */ }
}

export function playCaptureSound() {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(1.2, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(oscGain); oscGain.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.13);
    const len = Math.floor(ctx.sampleRate * 0.015);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.002));
    const src = ctx.createBufferSource(); src.buffer = buf;
    const filt = ctx.createBiquadFilter(); filt.type = 'bandpass';
    filt.frequency.value = 1800; filt.Q.value = 1.5;
    const gain = ctx.createGain(); gain.gain.setValueAtTime(1.0, now);
    src.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
    src.start(now);
  } catch { /* audio unavailable */ }
}

export function playCompletionSound() {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const pops: [number, number][] = [[0, 880], [0.08, 1100], [0.16, 1400]];
    for (const [off, freq] of pops) {
      const t = now + off;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.04);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.7, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.13);
    }
    const sLen = Math.floor(ctx.sampleRate * 0.25);
    const sBuf = ctx.createBuffer(1, sLen, ctx.sampleRate);
    const sd = sBuf.getChannelData(0);
    for (let i = 0; i < sLen; i++) sd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.04));
    const sSrc = ctx.createBufferSource(); sSrc.buffer = sBuf;
    const sFilt = ctx.createBiquadFilter(); sFilt.type = 'highpass'; sFilt.frequency.value = 4000;
    const sGain = ctx.createGain(); sGain.gain.setValueAtTime(0.4, now);
    sSrc.connect(sFilt); sFilt.connect(sGain); sGain.connect(ctx.destination);
    sSrc.start(now);
  } catch { /* audio unavailable */ }
}

export function playTokenSound() {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 0.07);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.008));
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = 900;
    filt.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(1.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    src.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
    src.start(now);
  } catch { /* audio unavailable */ }
}
