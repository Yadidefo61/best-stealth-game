// audio.js — procedural WebAudio sounds for Moonlit Vault.
// No audio files: every sound is synthesised when it is needed.
export function createAudio() {
  let ctx = null;
  let master = null;
  let ambient = null;

  const api = {
    enabled: false,
    // Call from a user gesture (key / click) to unlock audio.
    unlock() {
      if (ctx) {
        if (ctx.state === "suspended") ctx.resume();
        return;
      }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.5;
        master.connect(ctx.destination);
        api.enabled = true;
        api.startAmbient();
      } catch (err) {
        api.enabled = false;
      }
    },

    // Quiet night drone: two detuned low sines under a slow tremolo.
    startAmbient() {
      if (!ctx || ambient) return;
      const g = ctx.createGain();
      g.gain.value = 0.035;
      const o1 = ctx.createOscillator();
      o1.type = "sine"; o1.frequency.value = 55;
      const o2 = ctx.createOscillator();
      o2.type = "sine"; o2.frequency.value = 55.7;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.015;
      lfo.connect(lfoGain); lfoGain.connect(g.gain);
      o1.connect(g); o2.connect(g); g.connect(master);
      o1.start(); o2.start(); lfo.start();
      ambient = { o1, o2, lfo, g };
    },

    // Short filtered noise burst, pitched by how fast the step is.
    footstep(running) {
      if (!ctx) return;
      const dur = 0.07;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = running ? 700 : 420;
      const g = ctx.createGain();
      g.gain.value = running ? 0.22 : 0.1;
      src.connect(filter); filter.connect(g); g.connect(master);
      src.start();
    },

    // A guard's footstep: a low thud, louder the closer the guard is,
    // so the player hears patrols coming before seeing them.
    guardStep(distance) {
      if (!ctx) return;
      const gain = Math.max(0, 0.16 * (1 - distance / 280));
      if (gain <= 0.005) return;
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(95, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.09);
      const g = ctx.createGain();
      g.gain.setValueAtTime(gain, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      o.connect(g); g.connect(master);
      o.start(); o.stop(ctx.currentTime + 0.12);
    },

    // Soft pebble clink: two short high sine pings.
    pebble() {
      if (!ctx) return;
      [1320, 990].forEach((freq, i) => {
        const o = ctx.createOscillator();
        o.type = "sine"; o.frequency.value = freq;
        const g = ctx.createGain();
        const t = ctx.currentTime + i * 0.09;
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        o.connect(g); g.connect(master);
        o.start(t); o.stop(t + 0.14);
      });
    },

    // Rising two-note sting when a guard grows suspicious.
    suspicious() {
      if (!ctx) return;
      const o = ctx.createOscillator();
      o.type = "triangle";
      const t = ctx.currentTime;
      o.frequency.setValueAtTime(330, t);
      o.frequency.linearRampToValueAtTime(495, t + 0.25);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + 0.55);
    },

    // Harsh alarm sting when a guard is fully alerted.
    alarm() {
      if (!ctx) return;
      const t = ctx.currentTime;
      [0, 0.16, 0.32].forEach((off, i) => {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = i % 2 === 0 ? 620 : 465;
        const g = ctx.createGain();
        const s = t + off;
        g.gain.setValueAtTime(0.0001, s);
        g.gain.exponentialRampToValueAtTime(0.14, s + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, s + 0.18);
        o.connect(g); g.connect(master);
        o.start(s); o.stop(s + 0.2);
      });
    },

    // Bright two-note chime when an artifact is picked up.
    pickup() {
      if (!ctx) return;
      const t = ctx.currentTime;
      [880, 1318].forEach((freq, i) => {
        const o = ctx.createOscillator();
        o.type = "sine"; o.frequency.value = freq;
        const g = ctx.createGain();
        const s = t + i * 0.1;
        g.gain.setValueAtTime(0.0001, s);
        g.gain.exponentialRampToValueAtTime(0.2, s + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, s + 0.35);
        o.connect(g); g.connect(master);
        o.start(s); o.stop(s + 0.4);
      });
    },

    // Low thud when the thief is caught.
    caught() {
      if (!ctx) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(160, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.5);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.35, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + 0.6);
    },

    // Little major arpeggio when the thief escapes.
    win() {
      if (!ctx) return;
      const t = ctx.currentTime;
      [523, 659, 784, 1046].forEach((freq, i) => {
        const o = ctx.createOscillator();
        o.type = "sine"; o.frequency.value = freq;
        const g = ctx.createGain();
        const s = t + i * 0.13;
        g.gain.setValueAtTime(0.0001, s);
        g.gain.exponentialRampToValueAtTime(0.18, s + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, s + 0.5);
        o.connect(g); g.connect(master);
        o.start(s); o.stop(s + 0.55);
      });
    },
  };
  return api;
}
