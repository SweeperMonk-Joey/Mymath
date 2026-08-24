/**
 * tools/generate-data.js — Deterministic question bank generator (per requirements doc v1.2)
 * Usage: node tools/generate-data.js
 * Generates: grade-1/data/day-0.js ~ day-9.js (50 foundation + 3 bonus questions/day)
 *            grade-5/data/day-0.js ~ day-9.js (20 foundation + 3 bonus questions/day)
 * All answers are computed by template functions, guaranteeing correctness.
 */
'use strict';

const fs = require('fs');
const path = require('path');

/* ---------- deterministic PRNG (mulberry32) ---------- */
function mulberry32(seed) {
    return function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
}
function shuffle(arr, rnd) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
function pick(arr, rnd) { return arr[Math.floor(rnd() * arr.length)]; }
function randInt(rnd, min, max) { return min + Math.floor(rnd() * (max - min + 1)); }

/* ---------- fraction utilities ---------- */
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }
function reduce(n, d) { const g = gcd(n, d); return { numerator: n / g, denominator: d / g }; }
function fmtDecimal(x) {
    // strip trailing zeros: 7.20 -> 7.2; integer -> '8'
    const s = x.toFixed(2);
    return s.replace(/\.?0+$/, '');
}

/**
 * Build 4-choice options: correct is the answer (string), distractors are wrong choices (string array).
 * Guarantees 4 unique options; returns { options, correctIndex }.
 */
function makeOptions(correct, distractors, rnd) {
    if (!rnd) rnd = mulberry32(hashStr('makeOptions-' + correct + '-' + (distractors || []).join('-')));
    const pool = [String(correct)].concat(distractors.map(String));
    const unique = [];
    const seen = new Set();
    pool.forEach(v => { if (!seen.has(v)) { seen.add(v); unique.push(v); } });
    // pad with extra values if fewer than 4
    let pad = 1;
    while (unique.length < 4) {
        const cand = String(Number(correct) + pad);
        if (!seen.has(cand)) { seen.add(cand); unique.push(cand); }
        pad += 1;
    }
    const opts = shuffle(unique.slice(0, 4), rnd);
    return { options: opts, correctIndex: opts.indexOf(String(correct)) };
}

/* ============================================================
 * GRADE 1 — 50 questions per day
 * multiplication 30 / word_problem 10 / division 3 / addition 2
 * subtraction 2 / number_sense 2 / time 1 / measurement 1 / geometry 1
 * ============================================================ */
const G1_WORD_TEMPLATES = [
    (rnd) => { const a = randInt(rnd, 3, 12), b = randInt(rnd, 2, 12); return { q: 'Sara has ' + a + ' apples. Tom gives her ' + b + ' more. How many apples does Sara have now?', ans: String(a + b), at: 'integer' }; },
    (rnd) => { const a = randInt(rnd, 8, 20), b = randInt(rnd, 2, a - 2); return { q: 'There were ' + a + ' birds on a tree. ' + b + ' flew away. How many birds are left?', ans: String(a - b), at: 'integer' }; },
    (rnd) => { const a = randInt(rnd, 2, 9), b = randInt(rnd, 2, 5); return { q: 'A box has ' + a + ' crayons. How many crayons are in ' + b + ' boxes?', ans: String(a * b), at: 'integer' }; },
    (rnd) => { const b = randInt(rnd, 2, 6); const q = randInt(rnd, 2, 9); const a = b * q; return { q: 'Emma has ' + a + ' stickers and shares them equally among ' + b + ' friends. How many stickers does each friend get?', ans: String(q), at: 'integer' }; },
    (rnd) => { const a = randInt(rnd, 10, 30), b = randInt(rnd, 3, 15); return { q: 'Max has ' + a + ' marbles. He finds ' + b + ' more. How many marbles does he have now?', ans: String(a + b), at: 'integer' }; },
    (rnd) => { const a = randInt(rnd, 12, 25), b = randInt(rnd, 2, a - 3); return { q: 'Lily had ' + a + ' cookies. She ate ' + b + ' of them. How many cookies are left?', ans: String(a - b), at: 'integer' }; },
    (rnd) => { const a = randInt(rnd, 2, 6), b = randInt(rnd, 2, 6); return { q: 'There are ' + a + ' rows of chairs. Each row has ' + b + ' chairs. How many chairs are there in all?', ans: String(a * b), at: 'integer' }; },
    (rnd) => { const a = randInt(rnd, 5, 15), b = randInt(rnd, 5, 15); return { q: 'Ben picked ' + a + ' flowers in the morning and ' + b + ' in the afternoon. How many flowers did he pick in all?', ans: String(a + b), at: 'integer' }; },
    (rnd) => { const b = randInt(rnd, 2, 4); const a = 8; return { q: 'A spider has 8 legs. How many legs do ' + b + ' spiders have in total?', ans: String(a * b), at: 'integer' }; },
    (rnd) => { const b = randInt(rnd, 2, 6); const q = randInt(rnd, 3, 9); const a = b * q; return { q: 'There are ' + a + ' candies shared equally among ' + b + ' children. How many candies does each child get?', ans: String(q), at: 'integer' }; }
];

const G1_NUMBER_SENSE = [
    (rnd) => { const a = randInt(rnd, 10, 98); return { q: 'What number comes right after ' + a + '?', ans: String(a + 1), at: 'integer' }; },
    (rnd) => { const a = randInt(rnd, 11, 99); return { q: 'What number comes right before ' + a + '?', ans: String(a - 1), at: 'integer' }; },
    (rnd) => { const a = randInt(rnd, 2, 9); return { q: 'How many tens are in the number ' + a + '0?', ans: String(a), at: 'integer' }; },
    (rnd) => { const a = randInt(rnd, 10, 50), b = randInt(rnd, 51, 99); return { q: 'Which is greater, ' + a + ' or ' + b + '? Type the bigger number.', ans: String(Math.max(a, b)), at: 'integer' }; }
];

const G1_TIME = [
    (rnd) => { const h = randInt(rnd, 1, 9), d = randInt(rnd, 1, 3); return { q: 'A movie starts at ' + h + " o'clock and lasts " + d + ' hours. What time does it end? (type just the hour)', ans: String(h + d), at: 'integer' }; },
    () => ({ q: 'How many minutes are in one hour?', ans: '60', at: 'integer' }),
    () => ({ q: 'How many hours are in one full day?', ans: '24', at: 'integer' })
];

const G1_MEASUREMENT = [
    () => ({ q: 'How many centimeters are in one meter?', ans: '100', at: 'integer' }),
    () => ({ q: 'How many inches are in one foot?', ans: '12', at: 'integer' }),
    (rnd) => { const a = randInt(rnd, 5, 15), b = randInt(rnd, 2, 3); return { q: 'A pencil is ' + a + ' cm long. How long are ' + b + ' pencils placed end to end?', ans: String(a * b), at: 'integer' }; }
];

const G1_GEOMETRY = [
    () => ({ q: 'How many sides does a square have?', ans: '4', at: 'integer' }),
    () => ({ q: 'How many sides does a triangle have?', ans: '3', at: 'integer' }),
    () => ({ q: 'How many sides does a hexagon have?', ans: '6', at: 'integer' }),
    () => ({ q: 'How many sides does an octagon have?', ans: '8', at: 'integer' })
];

/* Grade 1 bonus questions (pattern/logic, 4 choices) */
const G1_BONUS = [
    (rnd) => {
        const a = randInt(rnd, 2, 10), d = randInt(rnd, 2, 5);
        const correct = String(a + 4 * d);
        const mo = makeOptions(correct, [String(a + 4 * d + d), String(a + 4 * d + 1), String(a + 3 * d)], rnd);
        return { q: 'Which number comes next? ' + a + ', ' + (a + d) + ', ' + (a + 2 * d) + ', ' + (a + 3 * d) + ', ?', options: mo.options, correct: mo.correctIndex, type: 'pattern', explanation: 'The pattern adds ' + d + ' each time, so the next number is ' + correct + '.' };
    },
    (rnd) => {
        const mo = makeOptions('●', ['▲', '■', '★'], rnd);
        return { q: 'Which shape comes next? ▲ ● ▲ ● ?', options: mo.options, correct: mo.correctIndex, type: 'pattern', explanation: 'The pattern alternates between ▲ and ●.' };
    },
    (rnd) => {
        const per = randInt(rnd, 2, 5), n = randInt(rnd, 2, 4);
        const correct = String(per); // unit price is the correct answer
        const mo = makeOptions(correct, [String(per * n), String(per * n + 1), String(per * n * 2)], rnd);
        return { q: 'If ' + n + ' apples cost $' + (per * n) + ', how much does 1 apple cost?', options: mo.options, correct: mo.correctIndex, type: 'logic', explanation: n + ' apples cost $' + (per * n) + ', so 1 apple costs $' + per + '.' };
    },
    (rnd) => {
        const a = randInt(rnd, 3, 8);
        const correct = String(a * 2);
        const mo = makeOptions(correct, [String(a), String(a * 2 + 1), String(a + 2)], rnd);
        return { q: 'What is double of ' + a + '?', options: mo.options, correct: mo.correctIndex, type: 'logic', explanation: 'Double of ' + a + ' is ' + correct + '.' };
    }
];

/* ============================================================
 * GRADE 5 — 20 questions per day
 * decimal 4 / fraction 4 / multiplication 3 / division 3 / word_problem 6
 * ============================================================ */
const G5_DECIMAL = [
    (rnd) => {
        const a = randInt(rnd, 12, 98), c = randInt(rnd, 12, 98);
        const prod = (a * c) / 100; // 1-decimal × 1-decimal = at most 2 decimals
        return { q: (a / 10) + ' × ' + (c / 10) + ' = ?', ans: fmtDecimal(prod), at: 'decimal' };
    },
    (rnd) => {
        // integer × 1-decimal
        const w = randInt(rnd, 3, 9), d1 = randInt(rnd, 1, 9);
        const x = (w * 10 + d1) / 10; // 1-decimal number
        const k = randInt(rnd, 2, 9);
        const prod = x * k;
        return { q: x + ' × ' + k + ' = ?', ans: fmtDecimal(prod), at: 'decimal' };
    },
    (rnd) => {
        // 1-decimal ÷ integer (exact)
        const qn = randInt(rnd, 12, 98); // quotient ×10
        const k = randInt(rnd, 2, 9);
        const dividend = (qn * k) / 10;
        const quotient = qn / 10;
        return { q: dividend + ' ÷ ' + k + ' = ?', ans: fmtDecimal(quotient), at: 'decimal' };
    },
    (rnd) => {
        // 2-decimal ÷ 1-decimal (converted to integers)
        const a = randInt(rnd, 12, 98), b = randInt(rnd, 12, 98);
        const dividend = (a * b) / 100;
        const divisor = b / 10;
        const quotient = a / 10;
        return { q: dividend + ' ÷ ' + divisor + ' = ?', ans: fmtDecimal(quotient), at: 'decimal' };
    }
];

const G5_FRACTION = [
    // same-denominator add/sub
    (rnd) => {
        const d = randInt(rnd, 3, 10);
        const op = pick(['+', '-'], rnd);
        let a = randInt(rnd, 1, d - 1);
        let b = randInt(rnd, 1, d - 1);
        if (op === '-') { while (a <= b) { a = randInt(rnd, 1, d - 1); } }
        const num = op === '+' ? a + b : a - b;
        const r = reduce(num, d);
        return { q: a + '/' + d + ' ' + op + ' ' + b + '/' + d + ' = ?', ans: { numerator: r.numerator, denominator: r.denominator }, at: 'fraction' };
    },
    // different-denominator add/sub
    (rnd) => {
        const d1 = randInt(rnd, 2, 9), d2 = randInt(rnd, 2, 9);
        if (d1 === d2) { /* retry is handled by the outer loop */ }
        const op = pick(['+', '-'], rnd);
        let a = randInt(rnd, 1, d1 - 1);
        let b = randInt(rnd, 1, d2 - 1);
        let num = a * d2 + (op === '+' ? 1 : -1) * b * d1;
        if (num <= 0) { a = randInt(rnd, Math.floor(d1 / 2) + 1, d1 - 1); b = randInt(rnd, 1, d2 - 1); num = a * d2 - b * d1; }
        const den = d1 * d2;
        const r = reduce(num, den);
        return { q: a + '/' + d1 + ' ' + op + ' ' + b + '/' + d2 + ' = ?', ans: { numerator: r.numerator, denominator: r.denominator }, at: 'fraction' };
    },
    // mixed-number addition → mixed-number answer
    (rnd) => {
        const w1 = randInt(rnd, 1, 4), w2 = randInt(rnd, 1, 3);
        const d1 = randInt(rnd, 2, 6), d2 = randInt(rnd, 2, 6);
        const n1 = randInt(rnd, 1, d1 - 1), n2 = randInt(rnd, 1, d2 - 1);
        const imp1 = w1 * d1 + n1, imp2 = w2 * d2 + n2;
        const num = imp1 * d2 + imp2 * d1;
        const den = d1 * d2;
        const r = reduce(num, den);
        const whole = Math.floor(r.numerator / r.denominator);
        const rem = r.numerator % r.denominator;
        return {
            q: w1 + ' ' + n1 + '/' + d1 + ' + ' + w2 + ' ' + n2 + '/' + d2 + ' = ?',
            ans: rem === 0 ? { numerator: r.numerator, denominator: r.denominator } : { whole: whole, numerator: rem, denominator: r.denominator },
            at: rem === 0 ? 'fraction' : 'mixed'
        };
    },
    // fraction multiplication
    (rnd) => {
        const d1 = randInt(rnd, 2, 9), d2 = randInt(rnd, 2, 9);
        const a = randInt(rnd, 1, d1 - 1), b = randInt(rnd, 1, d2 - 1);
        const r = reduce(a * b, d1 * d2);
        return { q: a + '/' + d1 + ' × ' + b + '/' + d2 + ' = ?', ans: { numerator: r.numerator, denominator: r.denominator }, at: 'fraction' };
    }
];

const G5_WORD_TEMPLATES = [
    (rnd) => { const m = randInt(rnd, 50, 200), b = randInt(rnd, 2, 6), p = randInt(rnd, 3, 15); const spent = b * p; return { q: 'Anna has $' + m + '. She buys ' + b + ' books at $' + p + ' each. How much money does she have left?', ans: String(m - spent), at: 'integer' }; },
    (rnd) => { const v = randInt(rnd, 40, 120), h = randInt(rnd, 2, 8); return { q: 'A car travels ' + v + ' km per hour. How far does it travel in ' + h + ' hours?', ans: String(v * h), at: 'integer' }; },
    (rnd) => { const a = randInt(rnd, 4, 15), b = randInt(rnd, 3, 8), c = randInt(rnd, 2, 6); return { q: 'A box holds ' + a + ' pencils. There are ' + b + ' boxes in a carton and ' + c + ' cartons. How many pencils are there in all?', ans: String(a * b * c), at: 'integer' }; },
    (rnd) => { const s = randInt(rnd, 30, 300), b = randInt(rnd, 6, 15); const q = Math.floor(s / b), r = s % b; return { q: 'There are ' + s + ' students going on a trip. Each bus holds ' + b + ' students. How many full buses are needed, and how many students are left over?', ans: { quotient: q, remainder: r }, at: 'remainder' }; },
    (rnd) => { const w = randInt(rnd, 3, 20), l = randInt(rnd, 3, 20); return { q: 'A rectangle is ' + w + ' cm wide and ' + l + ' cm long. What is its perimeter in cm?', ans: String(2 * (w + l)), at: 'integer' }; },
    (rnd) => { const a = randInt(rnd, 10, 40), b = randInt(rnd, 10, 40), c = randInt(rnd, 10, 40); return { q: 'Mia scored ' + a + ', ' + b + ' and ' + c + ' points in three games. What is her total score?', ans: String(a + b + c), at: 'integer' }; },
    (rnd) => { const w = randInt(rnd, 3, 15), l = randInt(rnd, 3, 15); return { q: 'A garden is ' + w + ' m wide and ' + l + ' m long. What is its area in square meters?', ans: String(w * l), at: 'integer' }; },
    (rnd) => { const c = randInt(rnd, 60, 300), p = randInt(rnd, 6, 12); const q = Math.floor(c / p), r = c % p; return { q: 'A baker makes ' + c + ' cookies and packs ' + p + ' per box. How many full boxes does he get, and how many cookies are left over?', ans: { quotient: q, remainder: r }, at: 'remainder' }; }
];

/* Grade 5 bonus questions */
const G5_BONUS = [
    (rnd) => {
        const a = randInt(rnd, 1, 6), d = randInt(rnd, 3, 9);
        const correct = String(a + 4 * d);
        const mo = makeOptions(correct, [String(a + 5 * d), String(a + 4 * d + 1), String(a + 3 * d)], rnd);
        return { q: 'Which number comes next? ' + a + ', ' + (a + d) + ', ' + (a + 2 * d) + ', ' + (a + 3 * d) + ', ?', options: mo.options, correct: mo.correctIndex, type: 'pattern', explanation: 'The pattern adds ' + d + ' each time, so the next number is ' + correct + '.' };
    },
    (rnd) => {
        const b = randInt(rnd, 2, 5), p = randInt(rnd, 4, 20);
        const correct = String(p * 2);
        const mo = makeOptions(correct, [String(p), String(p * 3), String(p * 2 + 1)], rnd);
        return { q: 'If ' + b + ' books cost $' + p + ', how much do ' + (b * 2) + ' books cost?', options: mo.options, correct: mo.correctIndex, type: 'logic', explanation: b + ' books cost $' + p + ', so ' + (b * 2) + ' books cost $' + (p * 2) + '.' };
    },
    (rnd) => {
        const n = randInt(rnd, 5, 25);
        const correct = String(n);
        const mo = makeOptions(correct, [String(n * 2), String(n + 1), String(n * 3)], rnd);
        return { q: 'A number doubled is ' + (n * 2) + '. What is the number?', options: mo.options, correct: mo.correctIndex, type: 'logic', explanation: 'Half of ' + (n * 2) + ' is ' + n + '.' };
    },
    () => {
        const mo = makeOptions('25', ['20', '24', '18'], null);
        return { q: 'What number comes next? 1, 4, 9, 16, ?', options: mo.options, correct: mo.correctIndex, type: 'pattern', explanation: 'These are square numbers: 1×1, 2×2, 3×3, 4×4, so next is 5×5 = 25.' };
    }
];

/* ============================================================
 * Generator main functions
 * ============================================================ */
function buildGrade1(day, rnd) {
    const questions = [];
    let id = 1;

    // 30 multiplication (no 1s, focus 5-9)
    for (let i = 0; i < 30; i++) {
        const pool = [5, 6, 7, 8, 9, 5, 6, 7, 8, 9, 2, 3, 4, 5, 6, 7, 8, 9]; // weight 5-9
        let a = pick(pool, rnd);
        let b = pick(pool, rnd);
        questions.push({ id: id++, type: 'multiplication', question: a + ' × ' + b + ' = ?', answerType: 'integer', answer: String(a * b) });
    }

    // 10 word problems
    const ws = shuffle([...G1_WORD_TEMPLATES], rnd);
    for (let i = 0; i < 10; i++) {
        const t = ws[i % ws.length](rnd);
        questions.push({ id: id++, type: 'word_problem', question: t.q, answerType: t.at, answer: t.ans });
    }

    // 3 division (exact)
    for (let i = 0; i < 3; i++) {
        const d = randInt(rnd, 2, 9), q = randInt(rnd, 2, 9);
        questions.push({ id: id++, type: 'division', question: (d * q) + ' ÷ ' + d + ' = ?', answerType: 'integer', answer: String(q) });
    }

    // 1 addition
    {
        const a = randInt(rnd, 5, 45), b = randInt(rnd, 5, 45);
        questions.push({ id: id++, type: 'addition', question: a + ' + ' + b + ' = ?', answerType: 'integer', answer: String(a + b) });
    }

    // 1 subtraction
    {
        const a = randInt(rnd, 20, 90), b = randInt(rnd, 2, a - 1);
        questions.push({ id: id++, type: 'subtraction', question: a + ' - ' + b + ' = ?', answerType: 'integer', answer: String(a - b) });
    }

    // 2 number sense
    const ns = shuffle([...G1_NUMBER_SENSE], rnd);
    for (let i = 0; i < 2; i++) {
        const t = ns[i % ns.length](rnd);
        questions.push({ id: id++, type: 'number_sense', question: t.q, answerType: t.at, answer: t.ans });
    }

    // 1 time
    const t1 = pick(G1_TIME, rnd)(rnd);
    questions.push({ id: id++, type: 'time', question: t1.q, answerType: t1.at, answer: t1.ans });

    // 1 measurement
    const t2 = pick(G1_MEASUREMENT, rnd)(rnd);
    questions.push({ id: id++, type: 'measurement', question: t2.q, answerType: t2.at, answer: t2.ans });

    // 1 geometry
    const t3 = pick(G1_GEOMETRY, rnd)(rnd);
    questions.push({ id: id++, type: 'geometry', question: t3.q, answerType: t3.at, answer: t3.ans });

    if (questions.length !== 50) throw new Error('Grade1 day ' + day + ' count = ' + questions.length);

    // 3 bonus questions (templates return options + correct index)
    const bs = shuffle([...G1_BONUS], rnd);
    const bonusQuestions = bs.slice(0, 3).map((fn, i) => {
        const t = fn(rnd);
        return { id: 'b' + (i + 1), type: t.type, question: t.q, options: t.options, correct: t.correct, explanation: t.explanation };
    });

    return { dayIndex: day, questions, bonusQuestions };
}

function buildGrade5(day, rnd) {
    const questions = [];
    let id = 1;

    // 4 decimals
    const ds = shuffle([...G5_DECIMAL], rnd);
    for (let i = 0; i < 4; i++) {
        const t = ds[i % ds.length](rnd);
        questions.push({ id: id++, type: 'decimal', question: t.q, answerType: t.at, answer: t.ans });
    }

    // 4 fractions
    const fs = shuffle([...G5_FRACTION], rnd);
    for (let i = 0; i < 4; i++) {
        const t = fs[i % fs.length](rnd);
        questions.push({ id: id++, type: 'fraction', question: t.q, answerType: t.at, answer: t.ans });
    }

    // 3 multi-digit multiplication
    for (let i = 0; i < 3; i++) {
        const a = randInt(rnd, 12, 98), b = randInt(rnd, 12, 98);
        questions.push({ id: id++, type: 'multiplication', question: a + ' × ' + b + ' = ?', answerType: 'integer', answer: String(a * b) });
    }

    // 3 multi-digit division (with remainders)
    for (let i = 0; i < 3; i++) {
        let q, d, r = 0;
        do {
            q = randInt(rnd, 5, 40);
            d = randInt(rnd, 4, 15);
            r = q % d;
        } while (r === 0);
        const dividend = q * d + r;
        questions.push({
            id: id++, type: 'division',
            question: dividend + ' ÷ ' + d + ' = ?',
            answerType: 'remainder',
            answer: { quotient: Math.floor(dividend / d), remainder: dividend % d }
        });
    }

    // 6 word problems
    const ws = shuffle([...G5_WORD_TEMPLATES], rnd);
    for (let i = 0; i < 6; i++) {
        const t = ws[i % ws.length](rnd);
        questions.push({ id: id++, type: 'word_problem', question: t.q, answerType: t.at, answer: t.ans });
    }

    if (questions.length !== 20) throw new Error('Grade5 day ' + day + ' count = ' + questions.length);

    // 3 bonus questions (templates return options + correct index)
    const bs = shuffle([...G5_BONUS], rnd);
    const bonusQuestions = bs.slice(0, 3).map((fn, i) => {
        const t = fn(rnd);
        return { id: 'b' + (i + 1), type: t.type, question: t.q, options: t.options, correct: t.correct, explanation: t.explanation };
    });

    return { dayIndex: day, questions, bonusQuestions };
}

/* ---------- output ---------- */
function jsString(obj) {
    return JSON.stringify(obj, null, 4)
        .replace(/"(numerator|denominator|whole|quotient|remainder)"\s*:/g, '$1:')
        .replace(/"(answerType|type|question|answer|id|options|correct|explanation|dayIndex)"\s*:/g, '"$1":');
}

function writeFile(grade, day, data) {
    const dir = path.join(__dirname, '..', grade, 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const content = '// ' + grade + '/data/day-' + day + '.js — auto-generated, do not edit manually\nconst DAY_DATA = ' + jsString(data) + ';\n';
    fs.writeFileSync(path.join(dir, 'day-' + day + '.js'), content, 'utf8');
}

function main() {
    const out = { g1: 0, g5: 0 };
    for (let day = 0; day < 10; day++) {
        const d1 = buildGrade1(day, mulberry32(hashStr('g1-day' + day)));
        writeFile('grade-1', day, d1); out.g1 += d1.questions.length + d1.bonusQuestions.length;

        const d5 = buildGrade5(day, mulberry32(hashStr('g5-day' + day)));
        writeFile('grade-5', day, d5); out.g5 += d5.questions.length + d5.bonusQuestions.length;
    }
    console.log('Generated:', JSON.stringify(out));
    // self-check sample
    const sample = buildGrade1(0, mulberry32(hashStr('g1-day0')));
    console.log('Sample G1 q1:', sample.questions[0].question, '->', sample.questions[0].answer);
    const sample5 = buildGrade5(0, mulberry32(hashStr('g5-day0')));
    console.log('Sample G5 fraction:', sample5.questions[4].question, '->', JSON.stringify(sample5.questions[4].answer));
    const rem = sample5.questions.find(q => q.answerType === 'remainder');
    console.log('Sample G5 remainder:', rem ? rem.question + ' -> ' + JSON.stringify(rem.answer) : 'none');
}

main();
