/**
 * shared/utils.js — Shared utility functions (v1.2 multi-input scheme)
 * Used by grade-1 / grade-5 pages (loaded via <script src="../shared/utils.js">)
 */

/* ========== Date & daily unlock ========== */

/** Get a Date object for today at 00:00:00 in Pacific Time (America/Los_Angeles) */
function getPacificDate() {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const get = (t) => parts.find(p => p.type === t).value;
    return new Date(Number(get('year')), Number(get('month')) - 1, Number(get('day')));
}

/**
 * Calculate the day index (0-based) from the start date to today in Pacific Time.
 * Uses UTC date difference to avoid the 1-hour DST shift error.
 * Returns < 0 if practice has not started yet.
 */
function getDayIndex(startDateStr) {
    const [y, m, d] = startDateStr.split('-').map(Number);
    const startUTC = Date.UTC(y, m - 1, d);
    const p = getPacificDate();
    const todayUTC = Date.UTC(p.getFullYear(), p.getMonth(), p.getDate());
    return Math.floor((todayUTC - startUTC) / 86400000);
}

/* ========== Progress storage (localStorage) ========== */

/** Save progress: Key = {grade}_day{dayIndex} */
function saveProgress(grade, dayIndex, data) {
    try {
        localStorage.setItem(grade + '_day' + dayIndex, JSON.stringify(data));
    } catch (e) {
        console.warn('saveProgress failed:', e);
    }
}

/** Load progress; returns null if no record */
function loadProgress(grade, dayIndex) {
    try {
        const raw = localStorage.getItem(grade + '_day' + dayIndex);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        console.warn('loadProgress failed:', e);
        return null;
    }
}

/* ========== Answer parsing (multi-input scheme) ========== */

/** Parse fraction input { numerator, denominator }; returns normalized object or null */
function parseFractionInput(numerator, denominator) {
    const n = String(numerator).trim();
    const d = String(denominator).trim();
    if (n === '' || d === '' || !/^\d+$/.test(n) || !/^\d+$/.test(d)) return null;
    const num = parseInt(n, 10), den = parseInt(d, 10);
    if (den === 0) return null;
    return { numerator: num, denominator: den };
}

/** Parse mixed-number input { whole, numerator, denominator }; returns normalized object or null */
function parseMixedInput(whole, numerator, denominator) {
    const w = String(whole).trim();
    const n = String(numerator).trim();
    const d = String(denominator).trim();
    if (w === '' || n === '' || d === '' || !/^\d+$/.test(w) || !/^\d+$/.test(n) || !/^\d+$/.test(d)) return null;
    const wh = parseInt(w, 10), num = parseInt(n, 10), den = parseInt(d, 10);
    if (den === 0 || num >= den) return null; // numerator must be smaller than denominator
    return { whole: wh, numerator: num, denominator: den };
}

/** Parse remainder input { quotient, remainder }; returns normalized object or null */
function parseRemainderInput(quotient, remainder) {
    const q = String(quotient).trim();
    const r = String(remainder).trim();
    if (q === '' || r === '' || !/^\d+$/.test(q) || !/^\d+$/.test(r)) return null;
    return { quotient: parseInt(q, 10), remainder: parseInt(r, 10) };
}

/** Parse numeric input (integer/decimal) to number or null */
function parseNumberInput(input) {
    const s = String(input).trim();
    if (s === '' || !/^-?\d+(\.\d+)?$/.test(s)) return null;
    return parseFloat(s);
}

/* ========== Answer comparison ========== */

/** Greatest common divisor */
function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { [a, b] = [b, a % b]; }
    return a || 1;
}

/** Reduce a fraction, returns { numerator, denominator } */
function reduceFraction(numerator, denominator) {
    if (denominator === 0) return { numerator, denominator };
    const g = gcd(numerator, denominator);
    return { numerator: numerator / g, denominator: denominator / g };
}

/**
 * Compare two answers for equivalence (v1.2 multi-input scheme).
 * Supported formats:
 *  - Integer/decimal: string (e.g. '21', '8.4') or number
 *  - Fraction: { numerator, denominator }
 *  - Mixed number: { whole, numerator, denominator } (equivalent to improper fraction, e.g. 2 1/3 ≡ 7/3)
 *  - Remainder: { quotient, remainder }
 */
function compareAnswers(user, correct) {
    // —— Numeric (integer/decimal): numeric equivalence, '8.4' == '8.40' ——
    if (typeof correct === 'string' || typeof correct === 'number') {
        const cu = (typeof user === 'object' && user !== null) ? null : user;
        const nu = parseNumberInput(cu);
        const nc = parseNumberInput(correct);
        if (nu === null || nc === null) return false;
        return Math.abs(nu - nc) < 1e-9;
    }

    // —— Object types ——
    if (typeof user !== 'object' || user === null) return false;

    if ('quotient' in correct) {
        // Remainder: quotient and remainder must both match
        const u = parseRemainderInput(user.quotient, user.remainder);
        return !!(u && u.quotient === correct.quotient && u.remainder === correct.remainder);
    }

    if ('whole' in correct) {
        // Mixed number: convert to improper fraction and compare (also accepts improper fraction input)
        const u = parseMixedInput(user.whole, user.numerator, user.denominator);
        if (!u) {
            // Allow the user to answer with an improper fraction instead
            const f = parseFractionInput(user.numerator, user.denominator);
            if (!f) return false;
            const cImp = correct.whole * correct.denominator + correct.numerator;
            const uImp = f.numerator;
            return reduceFraction(uImp, f.denominator).numerator / reduceFraction(uImp, f.denominator).denominator
                === reduceFraction(cImp, correct.denominator).numerator / reduceFraction(cImp, correct.denominator).denominator;
        }
        const uImp = u.whole * u.denominator + u.numerator;
        const cImp = correct.whole * correct.denominator + correct.numerator;
        const ur = reduceFraction(uImp, u.denominator);
        const cr = reduceFraction(cImp, correct.denominator);
        return ur.numerator === cr.numerator && ur.denominator === cr.denominator;
    }

    // Fraction: compare after reduction (cross-multiplication equivalence)
    const u = parseFractionInput(user.numerator, user.denominator);
    if (!u) return false;
    const ur = reduceFraction(u.numerator, u.denominator);
    const cr = reduceFraction(correct.numerator, correct.denominator);
    return ur.numerator === cr.numerator && ur.denominator === cr.denominator;
}

/** Format a standard answer as a readable string (result page / review list) */
function formatAnswer(q) {
    const a = q.answer;
    if (typeof a === 'string' || typeof a === 'number') return String(a);
    if ('quotient' in a) return a.quotient + ' R ' + a.remainder;
    if ('whole' in a) return a.whole + ' ' + a.numerator + '/' + a.denominator;
    return a.numerator + '/' + a.denominator;
}

/* ========== Sound management ========== */

/**
 * SoundManager: plays three sound effects.
 * Tries sounds/ audio files first (relative path); falls back to WAV,
 * then to Web Audio API synthesized tones when files are missing.
 */
const SoundManager = {
    sounds: {},
    ctx: null,
    muted: false,

    init() {
        const base = window.CONFIG && CONFIG.SOUND_PATH ? CONFIG.SOUND_PATH : '../sounds/';
        ['correct', 'wrong', 'third-wrong'].forEach(name => {
            const audio = new Audio(base + name + '.mp3');
            audio.preload = 'auto';
            audio.volume = name === 'correct' ? 0.7 : 0.6;
            audio.addEventListener('error', () => {
                // MP3 missing → try WAV
                audio._broken = true;
                const alt = new Audio(base + name + '.wav');
                alt.preload = 'auto';
                alt.volume = audio.volume;
                alt.addEventListener('error', () => { alt._broken = true; });
                this.sounds[name] = alt;
            });
            this.sounds[name] = audio;
        });
        // Initialize Web Audio context (resumed on first user gesture)
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (AC) this.ctx = new AC();
        } catch (e) { /* ignore */ }
    },

    play(type) {
        if (this.muted) return;
        const s = this.sounds[type];
        if (s && !s._broken) {
            s.currentTime = 0;
            s.play().catch(() => this.synth(type));
            return;
        }
        this.synth(type);
    },

    /** Web Audio fallback tones */
    synth(type) {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const t0 = this.ctx.currentTime;
        const cfg = {
            correct:    { freq: 880,  dur: 0.18, type: 'sine',  vol: 0.25 },
            wrong:      { freq: 330,  dur: 0.32, type: 'sine',  vol: 0.22 },
            'third-wrong': { freq: 196, dur: 0.75, type: 'triangle', vol: 0.28 }
        }[type];
        if (!cfg) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = cfg.type;
        osc.frequency.setValueAtTime(cfg.freq, t0);
        gain.gain.setValueAtTime(cfg.vol, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + cfg.dur);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(t0);
        osc.stop(t0 + cfg.dur);
    }
};
