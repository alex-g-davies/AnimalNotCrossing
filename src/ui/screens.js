// Overlays: the end-of-game card and the hint banner.

const $ = (id) => document.getElementById(id);

export function showEnd({ status, title, message, timeText, statText, artSvg, onNext, onLook, nextLabel = 'Next puzzle' }) {
  $('overlay-title').textContent = title;
  $('overlay-message').textContent = message;
  $('overlay-time').textContent = timeText || '';
  $('overlay-stat').textContent = statText || '';
  $('overlay-art').innerHTML = artSvg;
  $('end-card').dataset.status = status;
  const next = $('btn-next');
  next.textContent = nextLabel;
  next.onclick = onNext;
  const look = $('btn-look');
  look.onclick = onLook;
  look.hidden = !onLook;
  $('overlay').hidden = false;
  next.focus();
}

export function hideEnd() {
  $('overlay').hidden = true;
}

export function showHint(text) {
  const banner = $('hint-banner');
  banner.textContent = text;
  banner.hidden = false;
}

export function hideHint() {
  $('hint-banner').hidden = true;
}

export function showLoading(visible) {
  $('loading').hidden = !visible;
  $('board').style.opacity = visible ? '0.4' : '';
}

export function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// A brief shower of confetti in the region colors. Skipped under reduced motion.
export function confetti(count = 60) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const layer = document.createElement('div');
  layer.className = 'confetti';
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('i');
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = `var(--region-${i % 12})`;
    piece.style.animationDelay = `${Math.random() * 0.6}s`;
    piece.style.animationDuration = `${1.4 + Math.random() * 0.9}s`;
    layer.appendChild(piece);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 3000);
}

// The "enjoying the app?" card: two questions, then a thank-you. Each step
// swaps the text and buttons; `onDone` runs when the player leaves the card.
export function showFeedback({ onAnswer, onDone }) {
  const card = $('feedback-card');
  const title = $('feedback-title');
  const text = $('feedback-text');
  const yes = $('btn-feedback-yes');
  const no = $('btn-feedback-no');
  let answers = {};
  function step(t, body, yesLabel, noLabel, onYes, onNo) {
    title.textContent = t;
    text.textContent = body;
    yes.textContent = yesLabel;
    no.textContent = noLabel;
    no.hidden = !noLabel;
    yes.onclick = onYes;
    no.onclick = onNo;
    yes.focus();
  }
  function finish(extra) {
    answers = { ...answers, ...extra };
    onAnswer(answers);
    step('Thank you!', answers.iou ? 'Logged. The developer will collect in person. Your running total is in Stats.' : 'Noted. The developer will ask again in a few games, hopefully with better luck.', 'Back to the puzzles', '', close, null);
  }
  function close() {
    $('feedback').hidden = true;
    onDone();
  }
  function askIou() {
    step('One more thing', 'Would you like to support the developer with that gawk gawk 9000?', 'Absolutely', 'Maybe later', () => finish({ iou: true }), () => finish({ iou: false }));
  }
  step('Enjoying Animal Not Crossing?', 'Quick check-in, no pressure. How is it going?', 'Love it', 'It is fine', () => {
    answers.rating = 'love';
    askIou();
  }, () => {
    answers.rating = 'fine';
    askIou();
  });
  card.dataset.step = 'ask';
  $('feedback').hidden = false;
}
