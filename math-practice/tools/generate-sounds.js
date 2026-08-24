/**
 * tools/generate-sounds.js — Generate three sound effect WAV files (used when ffmpeg is unavailable)
 * Usage: node tools/generate-sounds.js
 * Note: MP3 is optional; SoundManager falls back to WAV or Web Audio when missing.
 */
'use strict';
const fs = require('fs');
const path = require('path');

function writeWav(filePath, samples) {
    const rate = 44100, bits = 16, ch = 1;
    const dataSize = samples.length * 2;
    const buf = Buffer.alloc(44 + dataSize);
    buf.write('RIFF', 0);
    buf.writeUInt32LE(36 + dataSize, 4);
    buf.write('WAVE', 8);
    buf.write('fmt ', 12);
    buf.writeUInt32LE(16, 16);
    buf.writeUInt16LE(1, 20);          // PCM
    buf.writeUInt16LE(ch, 22);
    buf.writeUInt32LE(rate, 24);
    buf.writeUInt32LE(rate * ch * bits / 8, 28);
    buf.writeUInt16LE(ch * bits / 8, 32);
    buf.writeUInt16LE(bits, 34);
    buf.write('data', 36);
    buf.writeUInt32LE(dataSize, 40);
    for (let i = 0; i < samples.length; i++) {
        buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), 44 + i * 2);
    }
    fs.writeFileSync(filePath, buf);
}

function tone(freq, dur, type, vol) {
    const rate = 44100;
    const n = Math.floor(rate * dur);
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        const t = i / rate;
        let v;
        if (type === 'sine') v = Math.sin(2 * Math.PI * freq * t);
        else if (type === 'triangle') {
            const p = 2 * Math.abs(2 * (freq * t % 1) - 1) - 1;
            v = p;
        } else v = Math.sin(2 * Math.PI * freq * t);
        // fast-decay envelope
        const env = Math.min(1, (n - i) / (rate * 0.06));
        out[i] = v * vol * env;
    }
    return out;
}

const dir = path.join(__dirname, '..', 'sounds');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

writeWav(path.join(dir, 'correct.wav'), tone(880, 0.18, 'sine', 0.5));
writeWav(path.join(dir, 'wrong.wav'), tone(330, 0.32, 'sine', 0.45));
writeWav(path.join(dir, 'third-wrong.wav'), tone(196, 0.75, 'triangle', 0.5));
console.log('Generated sounds: correct.wav, wrong.wav, third-wrong.wav');
