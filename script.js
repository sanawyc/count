/* ==========================================================
   Y2K COUNTER - Interactive Logic
   Features: increment/decrement, step selection,
   custom set value, localStorage persistence, history log,
   keyboard shortcuts, sound feedback (optional beep).
   ========================================================== */

(function () {
  'use strict';

  const STORAGE_KEY = 'y2k_counter_state_v1';

  const el = {
    counter: document.getElementById('counter'),
    plusSign: document.getElementById('plusSign'),
    plusValue: document.getElementById('plusValue'),
    addBtn: document.getElementById('addBtn'),
    step: document.getElementById('step'),
    init: document.getElementById('init'),
    setBtn: document.getElementById('setBtn'),
    minusBtn: document.getElementById('minusBtn'),
    resetBtn: document.getElementById('resetBtn'),
    history: document.getElementById('history'),
    totalClicks: document.getElementById('totalClicks'),
  };

  // ---- state ----
  let state = loadState();

  function defaultState() {
    return {
      count: 0,
      step: 1,
      totalClicks: 0,
      history: [], // { t: timestamp, value: number, delta: number }
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return Object.assign(defaultState(), parsed);
    } catch (e) {
      return defaultState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* ignore quota errors */
    }
  }

  // ---- render ----
  function render() {
    el.counter.textContent = String(state.count);
    el.plusValue.textContent = String(state.step);
    el.step.value = String(state.step);
    el.totalClicks.textContent = String(state.totalClicks);
    renderHistory();
  }

  function renderHistory() {
    if (!state.history || state.history.length === 0) {
      el.history.innerHTML = '<div class="history-empty">~ no records yet ~</div>';
      return;
    }
    const items = state.history
      .slice()
      .reverse()
      .slice(0, 50)
      .map(function (h) {
        const time = formatTime(h.t);
        const deltaStr = (h.delta >= 0 ? '+' : '') + h.delta;
        const deltaClass = h.delta < 0 ? 'delta negative' : 'delta';
        return (
          '<div class="history-item">' +
          '<span class="time">' + time + '</span>' +
          '<span class="' + deltaClass + '">' + deltaStr + '</span>' +
          '<span class="value">' + h.value + '</span>' +
          '</div>'
        );
      })
      .join('');
    el.history.innerHTML = items;
  }

  function formatTime(ts) {
    const d = new Date(ts);
    const pad = function (n) { return n < 10 ? '0' + n : String(n); };
    return (
      pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
    );
  }

  function bump() {
    el.counter.classList.remove('bump');
    // force reflow
    void el.counter.offsetWidth;
    el.counter.classList.add('bump');
  }

  // ---- actions ----
  function add(delta) {
    state.count += delta;
    state.totalClicks += 1;
    state.history.push({ t: Date.now(), value: state.count, delta: delta });
    if (state.history.length > 200) {
      state.history = state.history.slice(-200);
    }
    bump();
    beep();
    saveState();
    render();
  }

  function setValue(val) {
    const delta = val - state.count;
    state.count = val;
    state.totalClicks += 1;
    state.history.push({ t: Date.now(), value: state.count, delta: delta });
    if (state.history.length > 200) {
      state.history = state.history.slice(-200);
    }
    bump();
    saveState();
    render();
  }

  function reset() {
    if (!confirm('reset everything to 0? ♡')) return;
    state = defaultState();
    saveState();
    render();
  }

  // ---- sound ----
  let audioCtx = null;
  function beep() {
    try {
      if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        audioCtx = new AC();
      }
      const ctx = audioCtx;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.15, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch (e) { /* ignore */ }
  }

  // ---- event wiring ----
  el.addBtn.addEventListener('click', function () {
    add(state.step);
  });

  el.minusBtn.addEventListener('click', function () {
    add(-state.step);
  });

  el.step.addEventListener('change', function () {
    state.step = Math.max(1, parseInt(el.step.value, 10) || 1);
    saveState();
    render();
  });

  el.setBtn.addEventListener('click', function () {
    const v = parseInt(el.init.value, 10);
    if (isNaN(v)) {
      el.init.focus();
      return;
    }
    setValue(v);
    el.init.value = '';
  });

  el.init.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      el.setBtn.click();
    }
  });

  el.resetBtn.addEventListener('click', reset);

  // keyboard shortcuts
  document.addEventListener('keydown', function (e) {
    // avoid hijacking when user is typing in input/select
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    const inField = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';

    if (inField) return;

    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      add(state.step);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      add(-state.step);
    } else if (e.key === 'r' || e.key === 'R') {
      reset();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      add(state.step);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      add(-state.step);
    }
  });

  // initial render
  render();
})();
