# ✏️ Daily Math Practice

A pure front-end daily math practice app using localStorage — no backend required.
One exercise set unlocks every day based on **Pacific Time**, optimized for iPad portrait.

## ✨ Features

- 📐 **Grade 1**: 50 questions/day (multiplication focus, plus word problems, division, addition/subtraction, number sense, time, measurement, geometry)
- 🧮 **Grade 5**: 20 questions/day (decimals, fractions, mixed numbers, multi-digit multiplication & division with remainders, multi-step word problems)
- ⭐ **3 bonus reasoning questions** per set (4 choices each, not counted in the main score)
- 🔁 **Auto-saved progress**: refresh and resume from the current question
- ⏭️ **Mistake mechanism**: skip after 3 errors on one question; skipped questions reappear at the end and must be answered correctly
- 🎯 **First-try accuracy**: only the first submission of each question counts
- 📊 **Parent Report**: password-protected (`math123`), 10-day trend chart, per-day analysis, study suggestions
- 🔊 Three sound effects (correct / wrong / 3rd error); Web Audio fallback when files are missing

## 📁 Project Structure

```
math-practice/
├── index.html            ← Home (grade selection)
├── grade-1/              ← Grade 1 (index.html, style.css, app.js, data/day-0~9.js)
├── grade-5/              ← Grade 5 (same layout, 20 questions/day)
├── parent-report/        ← Parent report (password protected)
├── shared/utils.js       ← Shared utilities (dates, progress, answer parsing, sounds)
├── sounds/               ← Sound effects (correct/wrong/third-wrong, mp3 or wav)
├── tools/                ← Question bank generator & sound generator
└── README.md
```

## 🚀 Run Locally

No dependencies needed:

```bash
# Option 1: Python built-in server (recommended)
python3 -m http.server 8000
# Open http://localhost:8000

# Option 2: double-click index.html (localStorage may be limited under file:// — prefer option 1)
```

## 🌍 Deploy to GitHub Pages

1. Create a repository named `math-practice` on GitHub
2. Push the project files to the `main` branch
3. Repository Settings → Pages → Source `Deploy from a branch` → branch `main` / root
4. Visit `https://{username}.github.io/math-practice/`

> ⚠️ **Path rule**: all resource references use relative paths for sub-path deployment. Do not change them to root-absolute paths (e.g. `/sounds/`), or they will 404.

## 📝 Usage

- One set unlocks per day (Pacific Time; 2026-08-24 is Day 1, 10 days total)
- Answer input:
  - Integer/decimal: single input box
  - Fraction: numerator + denominator (two boxes)
  - Mixed number: whole + numerator + denominator (three boxes)
  - Remainder: quotient + remainder (two boxes, R shown between them)
- Keyboard: `Enter` submits, `Tab` moves between input boxes
- Parent report password: `math123` (front-end form protection only, not real security)

## 🛠️ Customizing the Question Bank

Question banks live in `grade-1/data/day-0.js` ~ `day-9.js` (50 questions/day) and `grade-5/data/` (20 questions/day):

```javascript
const DAY_DATA = {
    dayIndex: 0,
    questions: [
        { id: 1, type: 'multiplication', question: '3 × 7 = ?', answerType: 'integer', answer: '21' },
        { id: 5, type: 'fraction', question: '3/4 + 1/2 = ?', answerType: 'fraction', answer: { numerator: 5, denominator: 4 } },
        { id: 6, type: 'fraction', question: '2 1/3 + 1 1/2 = ?', answerType: 'mixed', answer: { whole: 3, numerator: 5, denominator: 6 } },
        { id: 12, type: 'division', question: '157 ÷ 12 = ?', answerType: 'remainder', answer: { quotient: 13, remainder: 1 } }
    ],
    bonusQuestions: [
        { id: 'b1', type: 'pattern', question: 'Which shape comes next? ▲ ● ▲ ● ?',
          options: ['▲', '●', '■', '★'], correct: 1, explanation: 'The pattern alternates between ▲ and ●.' }
    ]
};
```

Regenerate the question bank: `node tools/generate-data.js` (deterministic seed, reproducible).
Regenerate sounds: `node tools/generate-sounds.js` (WAV; for MP3, drop same-named files into `sounds/`).

## 🔐 Parent Report

- Password: `math123`
- Reads `grade1_day0` ~ `grade1_day9` and `grade5_day0` ~ `grade5_day9` from localStorage
- Only completed days (`completed: true`) are counted
- Trend chart colors by first-try accuracy: ≥85% green / 60-84% orange / <60% red

---

**Doc version**: 1.2 ｜ **Environment**: DeepSeek Harness (DSH)
