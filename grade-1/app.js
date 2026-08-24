/**
 * grade-1/app.js — Daily math practice main logic (v1.2 multi-input scheme)
 */
(function () {
    'use strict';

    /* ===== Config ===== */
    const CONFIG = {
        GRADE: 'grade1',
        GRADE_LABEL: '📐 Grade 1',
        START_DATE: '2026-08-24',
        TOTAL_DAYS: 10,
        TOTAL_QUESTIONS: 50,
        BONUS_COUNT: 3,
        MAX_ERRORS_BEFORE_SKIP: 3,
        SOUND_PATH: '../sounds/'
    };
    window.CONFIG = CONFIG;

    /* ===== State ===== */
    let state = null;

    /* ===== DOM refs ===== */
    const $ = (id) => document.getElementById(id);
    const els = {
        gradeLabel: $('grade-label'),
        dayLabel: $('day-label'),
        progressText: $('progress-text'),
        progressFill: $('progress-fill'),
        questionArea: $('questionArea'),
        questionType: $('question-type'),
        questionText: $('question-text'),
        inputArea: $('input-area'),
        optionsArea: $('options-area'),
        optionsGrid: $('options-grid'),
        feedbackArea: $('feedback-area'),
        feedbackMessage: $('feedback-message'),
        feedbackExplanation: $('feedback-explanation'),
        skipBtn: $('skipBtn'),
        nextBtn: $('nextBtn'),
        transitionArea: $('transitionArea'),
        startBonusBtn: $('startBonusBtn'),
        resultArea: $('resultArea'),
        resultStats: $('result-stats'),
        reviewSection: $('review-section'),
        reviewToggle: $('reviewToggle'),
        reviewContent: $('review-content'),
        errorArea: $('errorArea'),
        errorMessage: $('errorMessage')
    };

    /* ===== Init ===== */
    function init() {
        els.gradeLabel.textContent = CONFIG.GRADE_LABEL;
        SoundManager.init();

        const dayIndex = getDayIndex(CONFIG.START_DATE);

        if (dayIndex < 0) {
            showError('⏳ Not Ready Yet', 'Practice starts on ' + CONFIG.START_DATE + '. Please come back then!');
            return;
        }
        if (dayIndex >= CONFIG.TOTAL_DAYS) {
            showError('🎉 All Days Completed!', 'All ' + CONFIG.TOTAL_DAYS + ' days are done. Great job! 🎉');
            return;
        }

        state = {
            dayIndex: dayIndex,
            questions: null,
            bonusQuestions: null,
            currentIndex: 0,
            answers: [],
            errors: [],
            skipped: [],
            skippedQueue: [],
            isBonusPhase: false,
            bonusIndex: 0,
            bonusResults: [],
            completed: false,
            startTime: Date.now(),
            isSkippedQuestion: false
        };

        els.dayLabel.textContent = 'Day ' + (dayIndex + 1);
        loadDayData(dayIndex);
    }

    function showError(title, msg) {
        els.questionArea.classList.remove('visible');
        els.errorArea.querySelector('h2').textContent = title;
        els.errorMessage.textContent = msg;
        els.errorArea.classList.add('visible');
    }

    /** Dynamically load data/day-N.js */
    function loadDayData(dayIndex) {
        const script = document.createElement('script');
        script.src = 'data/day-' + dayIndex + '.js';
        script.onload = function () {
            if (typeof window.DAY_DATA === 'undefined' || !window.DAY_DATA) {
                showError('⏳ Not Ready Yet', 'Question bank for Day ' + (dayIndex + 1) + ' is missing.');
                return;
            }
            state.questions = window.DAY_DATA.questions;
            state.bonusQuestions = window.DAY_DATA.bonusQuestions;
            state.answers = new Array(state.questions.length).fill(null);
            state.errors = new Array(state.questions.length).fill(0);
            state.skipped = new Array(state.questions.length).fill(false);
            window.DAY_DATA = undefined; // clear the global
            restoreProgress();
        };
        script.onerror = function () {
            showError('⏳ Not Ready Yet', 'Failed to load question bank for Day ' + (dayIndex + 1) + '.');
        };
        document.head.appendChild(script);
    }

    /** Restore saved progress */
    function restoreProgress() {
        const saved = loadProgress(CONFIG.GRADE, state.dayIndex);
        if (saved && !saved.completed) {
            if (Array.isArray(saved.answers)) state.answers = saved.answers.concat(new Array(state.questions.length - saved.answers.length).fill(null));
            if (Array.isArray(saved.errors)) state.errors = saved.errors.concat(new Array(state.questions.length - saved.errors.length).fill(0));
            if (Array.isArray(saved.skipped)) state.skipped = saved.skipped.concat(new Array(state.questions.length - saved.skipped.length).fill(false));
            if (Array.isArray(saved.skippedQueue)) state.skippedQueue = saved.skippedQueue;
            if (typeof saved.currentIndex === 'number') state.currentIndex = saved.currentIndex;
            state.isBonusPhase = !!saved.isBonusPhase;
            if (Array.isArray(saved.bonusResults)) state.bonusResults = saved.bonusResults;
            if (typeof saved.bonusIndex === 'number') state.bonusIndex = saved.bonusIndex;
            if (saved.startTime) state.startTime = saved.startTime;
            if (typeof saved.isSkippedQuestion === 'boolean') state.isSkippedQuestion = saved.isSkippedQuestion;
        }
        if (state.isBonusPhase) {
            startBonusPhase(false);
        } else {
            showQuestion();
        }
    }

    function saveState() {
        saveProgress(CONFIG.GRADE, state.dayIndex, {
            answers: state.answers,
            errors: state.errors,
            skipped: state.skipped,
            skippedQueue: state.skippedQueue,
            currentIndex: state.currentIndex,
            isBonusPhase: state.isBonusPhase,
            bonusResults: state.bonusResults,
            bonusIndex: state.bonusIndex,
            completed: state.completed,
            startTime: state.startTime,
            isSkippedQuestion: state.isSkippedQuestion
        });
    }

    /* ===== Show question ===== */
    function showQuestion() {
        // Check skipped queue first: redo queued questions before continuing
        if (!state.isBonusPhase && state.skippedQueue.length > 0) {
            state.isSkippedQuestion = true;
            const idx = state.skippedQueue[0];
            renderQuestion(idx, true);
            return;
        }
        state.isSkippedQuestion = false;
        if (state.currentIndex >= state.questions.length) {
            // All foundation questions completed
            if (state.skippedQueue.length > 0) {
                // Still has skipped questions to redo (normally handled above)
                const idx = state.skippedQueue[0];
                state.isSkippedQuestion = true;
                renderQuestion(idx, true);
            } else {
                startBonusPhase(true);
            }
            return;
        }
        renderQuestion(state.currentIndex, false);
    }

    /** Render a question (idx = question index; isSkipped = redo of a skipped question) */
    function renderQuestion(idx, isSkipped) {
        const q = state.questions[idx];
        state.currentIdx = idx;

        els.questionArea.classList.add('visible');
        els.transitionArea.classList.remove('visible');
        els.resultArea.classList.remove('visible');

        els.questionType.textContent = q.type.replace(/_/g, ' ');
        els.questionText.textContent = q.question;

        // Skipped-question marker
        els.questionText.classList.toggle('skipped-question', isSkipped);
        const badge = els.questionText.querySelector('.skipped-badge');
        if (badge) badge.remove();
        if (isSkipped) {
            const b = document.createElement('span');
            b.className = 'skipped-badge';
            b.textContent = '⏭️ Skipped · Must Answer';
            els.questionText.prepend(b);
        }

        // Render input area / options area
        els.optionsArea.classList.add('hidden');
        els.optionsGrid.innerHTML = '';
        els.feedbackMessage.className = 'feedback-message';
        els.feedbackMessage.textContent = '';
        els.feedbackExplanation.textContent = '';
        els.skipBtn.classList.add('hidden');
        els.nextBtn.classList.add('hidden');

        if (q.bonus) {
            renderBonusInput(q);
        } else {
            renderInputArea(q);
        }

        // Skip button: shown when errors >= 3 and not in skipped-redo phase
        if (!isSkipped && state.errors[idx] >= CONFIG.MAX_ERRORS_BEFORE_SKIP && !state.skipped[idx]) {
            els.skipBtn.classList.remove('hidden');
        }

        updateProgress();
        saveState();
    }

    /** Render answer input area (switches by answerType) */
    function renderInputArea(q) {
        els.inputArea.innerHTML = '';
        els.inputArea.classList.remove('hidden');

        const at = q.answerType;
        if (at === 'fraction') {
            els.inputArea.innerHTML =
                '<div class="field-row">' +
                '<div class="field"><label>numerator</label><input type="number" inputmode="numeric" class="answer-input" id="in-num" autocomplete="off"></div>' +
                '<span class="field-sep">/</span>' +
                '<div class="field"><label>denominator</label><input type="number" inputmode="numeric" class="answer-input" id="in-den" autocomplete="off"></div>' +
                '</div>';
        } else if (at === 'mixed') {
            els.inputArea.innerHTML =
                '<div class="field-row">' +
                '<div class="field"><label>whole</label><input type="number" inputmode="numeric" class="answer-input" id="in-whole" autocomplete="off"></div>' +
                '<span class="field-sep"></span>' +
                '<div class="field"><label>numerator</label><input type="number" inputmode="numeric" class="answer-input" id="in-num" autocomplete="off"></div>' +
                '<span class="field-sep">/</span>' +
                '<div class="field"><label>denominator</label><input type="number" inputmode="numeric" class="answer-input" id="in-den" autocomplete="off"></div>' +
                '</div>';
        } else if (at === 'remainder') {
            els.inputArea.innerHTML =
                '<div class="field-row">' +
                '<div class="field"><label>quotient</label><input type="number" inputmode="numeric" class="answer-input" id="in-quotient" autocomplete="off"></div>' +
                '<span class="field-sep">R</span>' +
                '<div class="field"><label>remainder</label><input type="number" inputmode="numeric" class="answer-input" id="in-remainder" autocomplete="off"></div>' +
                '</div>';
        } else {
            // integer / decimal
            els.inputArea.innerHTML =
                '<div class="field-row">' +
                '<div class="field"><input type="text" inputmode="decimal" class="answer-input wide" id="in-value" autocomplete="off" placeholder="Type answer"></div>' +
                '</div>';
        }

        // Auto-focus the first input
        const first = els.inputArea.querySelector('.answer-input');
        if (first) first.focus();

        // Enter submits (last field) or moves to the next field
        const inputs = els.inputArea.querySelectorAll('.answer-input');
        inputs.forEach((inp, i) => {
            inp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (i < inputs.length - 1) inputs[i + 1].focus();
                    else handleSubmit();
                }
            });
        });
    }

    /** Collect the answer from the inputs (by type) */
    function getAnswerFromInputs() {
        const q = state.questions[state.currentIdx];
        const at = q.answerType;
        const val = (id) => els.inputArea.querySelector('#' + id) ? els.inputArea.querySelector('#' + id).value : '';

        if (at === 'fraction') {
            return parseFractionInput(val('in-num'), val('in-den'));
        }
        if (at === 'mixed') {
            return parseMixedInput(val('in-whole'), val('in-num'), val('in-den'));
        }
        if (at === 'remainder') {
            return parseRemainderInput(val('in-quotient'), val('in-remainder'));
        }
        return val('in-value');
    }

    /* ===== Submit ===== */
    function handleSubmit() {
        if (!state || state.isBonusPhase) return;
        const q = state.questions[state.currentIdx];
        const userAnswer = getAnswerFromInputs();

        const valid = (typeof userAnswer === 'object') ? (userAnswer !== null) : (String(userAnswer).trim() !== '');
        if (!valid) {
            flashError();
            return;
        }

        const isCorrect = compareAnswers(userAnswer, q.answer);
        const idx = state.currentIdx;

        if (isCorrect) {
            SoundManager.play('correct');
            // First-try correct
            if (state.answers[idx] === null) state.answers[idx] = true;
            els.feedbackMessage.textContent = '✅ Correct!';
            els.feedbackMessage.className = 'feedback-message ok';
            markInputsCorrect();
            // Skipped-question redo done → remove from queue
            if (state.isSkippedQuestion && state.skippedQueue.length > 0) {
                state.skippedQueue.shift();
                state.isSkippedQuestion = false;
            }
            state.errors[idx] = 0; // reset error count for this question after success
            setTimeout(() => {
                if (!state.isBonusPhase) {
                    if (state.skippedQueue.length > 0) {
                        state.currentIndex = state.questions.length; // don't continue foundation loop
                        showQuestion();
                    } else {
                        state.currentIndex = idx + 1;
                        showQuestion();
                    }
                }
            }, 600);
        } else {
            SoundManager.play('wrong');
            state.errors[idx] += 1;
            if (state.answers[idx] === null) state.answers[idx] = false;
            els.feedbackMessage.textContent = '❌ Not quite. Try again!';
            els.feedbackMessage.className = 'feedback-message bad';
            flashError();
            // Third error (and not in skipped-redo phase) → show skip button + special sound
            if (!state.isSkippedQuestion && state.errors[idx] === CONFIG.MAX_ERRORS_BEFORE_SKIP) {
                SoundManager.play('third-wrong');
                els.skipBtn.classList.remove('hidden');
            }
        }
        saveState();
    }

    function flashError() {
        els.inputArea.querySelectorAll('.answer-input').forEach(inp => {
            inp.classList.remove('input-error');
            void inp.offsetWidth; // restart the animation
            inp.classList.add('input-error');
            setTimeout(() => inp.classList.remove('input-error'), 450);
        });
    }

    function markInputsCorrect() {
        els.inputArea.querySelectorAll('.answer-input').forEach(inp => {
            inp.classList.add('input-correct');
            setTimeout(() => inp.classList.remove('input-correct'), 500);
        });
    }

    /* ===== Skip ===== */
    function handleSkip() {
        const idx = state.currentIdx;
        if (state.skipped[idx]) return; // already skipped, cannot skip again
        state.skipped[idx] = true;
        if (state.answers[idx] === null) state.answers[idx] = false;
        state.skippedQueue.push(idx);
        state.currentIndex = idx + 1;
        state.isSkippedQuestion = false;
        els.skipBtn.classList.add('hidden');
        saveState();
        showQuestion();
    }

    /* ===== Bonus questions ===== */
    function startBonusPhase(showTransition) {
        state.isBonusPhase = true;
        if (showTransition) {
            els.questionArea.classList.remove('visible');
            els.transitionArea.classList.add('visible');
            saveState();
            return;
        }
        if (state.bonusIndex >= state.bonusQuestions.length) {
            completePractice();
            return;
        }
        showBonusQuestion();
    }

    function showBonusQuestion() {
        els.questionArea.classList.add('visible');
        els.transitionArea.classList.remove('visible');
        const bq = state.bonusQuestions[state.bonusIndex];

        els.questionType.textContent = 'Bonus · ' + bq.type;
        els.questionText.textContent = bq.question;
        els.questionText.classList.remove('skipped-question');
        els.inputArea.classList.add('hidden');
        els.optionsArea.classList.remove('hidden');
        els.optionsGrid.innerHTML = '';
        els.feedbackMessage.textContent = '';
        els.feedbackMessage.className = 'feedback-message';
        els.feedbackExplanation.textContent = '';
        els.skipBtn.classList.add('hidden');
        els.nextBtn.classList.add('hidden');

        bq.options.forEach((opt, i) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = opt;
            btn.addEventListener('click', () => handleBonusAnswer(i, btn));
            els.optionsGrid.appendChild(btn);
        });
        updateProgress();
        saveState();
    }

    function handleBonusAnswer(index, btnEl) {
        const bq = state.bonusQuestions[state.bonusIndex];
        const buttons = els.optionsGrid.querySelectorAll('.option-btn');
        const isCorrect = (index === bq.correct);

        state.bonusResults.push(isCorrect);
        if (isCorrect) {
            SoundManager.play('correct');
        } else {
            SoundManager.play('wrong');
        }

        // Disable all options and mark them
        buttons.forEach((b, i) => {
            b.disabled = true;
            if (i === bq.correct) b.classList.add('show-correct');
            if (i === index && !isCorrect) b.classList.add('selected-wrong');
            if (i === index && isCorrect) b.classList.add('selected-correct');
        });

        els.feedbackMessage.textContent = isCorrect ? '✅ Correct!' : '❌ Not quite.';
        els.feedbackMessage.className = 'feedback-message ' + (isCorrect ? 'ok' : 'bad');
        els.feedbackExplanation.textContent = bq.explanation;

        els.nextBtn.classList.remove('hidden');
        els.nextBtn.onclick = () => {
            state.bonusIndex += 1;
            if (state.bonusIndex >= state.bonusQuestions.length) {
                completePractice();
            } else {
                showBonusQuestion();
            }
        };
        saveState();
    }

    /* ===== Complete ===== */
    function completePractice() {
        state.completed = true;
        state.isBonusPhase = true;
        saveState();
        const timeSpent = Math.round((Date.now() - state.startTime) / 1000);
        showResultPage(timeSpent);
    }

    function showResultPage(timeSpent) {
        els.questionArea.classList.remove('visible');
        els.transitionArea.classList.remove('visible');
        els.resultArea.classList.add('visible');

        const total = state.questions.length;
        const firstCorrect = state.answers.filter(a => a === true).length;
        const rate = Math.round(firstCorrect / total * 100);
        const totalErrors = state.errors.reduce((s, e) => s + e, 0);
        const skipCount = state.skipped.filter(Boolean).length;
        const bonusCorrect = state.bonusResults.filter(Boolean).length;

        const mm = String(Math.floor(timeSpent / 60)).padStart(2, '0');
        const ss = String(timeSpent % 60).padStart(2, '0');

        els.resultStats.innerHTML =
            statCard(rate + '%', 'First-Try Accuracy') +
            statCard(firstCorrect + '/' + total, 'Correct') +
            statCard(totalErrors, 'Total Mistakes') +
            statCard(skipCount, 'Skipped') +
            statCard(mm + ':' + ss, 'Time') +
            statCard(bonusCorrect + '/' + state.bonusQuestions.length, 'Bonus');

        // Mistake review
        const wrong = state.questions
            .map((q, i) => ({ q, i }))
            .filter(({ i }) => state.answers[i] !== true);

        if (wrong.length > 0) {
            els.reviewSection.classList.remove('hidden');
            els.reviewContent.innerHTML = wrong.map(({ q, i }) =>
                '<div class="review-item"><span class="q">' + q.question + '</span> → ' +
                '<span class="a">' + formatAnswer(q) + '</span>' +
                (state.skipped[i] ? '<span class="badge-skip">(skipped)</span>' : '') +
                '</div>'
            ).join('');
        } else {
            els.reviewSection.classList.add('hidden');
        }
    }

    function statCard(value, label) {
        return '<div class="stat-card"><div class="stat-value">' + value + '</div><div class="stat-label">' + label + '</div></div>';
    }

    /* ===== Progress bar ===== */
    function updateProgress() {
        let done = 0, total = state.questions.length;
        if (state.isBonusPhase) {
            done = total + state.bonusIndex;
            total = total + state.bonusQuestions.length;
        } else {
            done = state.answers.filter(a => a !== null).length;
        }
        const pct = Math.round(done / total * 100);
        els.progressFill.style.width = pct + '%';
        if (state.isBonusPhase) {
            els.progressText.textContent = 'Bonus ' + (state.bonusIndex + 1) + ' of ' + state.bonusQuestions.length;
        } else {
            const shown = Math.min(state.currentIdx + 1, state.questions.length);
            els.progressText.textContent = 'Question ' + shown + ' of ' + state.questions.length;
        }
    }

    /* ===== Event binding ===== */
    els.skipBtn.addEventListener('click', handleSkip);
    els.startBonusBtn.addEventListener('click', () => {
        els.transitionArea.classList.remove('visible');
        state.bonusIndex = 0;
        showBonusQuestion();
    });
    els.reviewToggle.addEventListener('click', () => {
        const isHidden = els.reviewContent.classList.contains('hidden');
        els.reviewContent.classList.toggle('hidden', !isHidden);
        els.reviewToggle.textContent = isHidden ? '▲ Hide Mistakes' : '▼ Review Mistakes';
    });

    document.addEventListener('DOMContentLoaded', init);
    if (document.readyState !== 'loading') init();
})();
