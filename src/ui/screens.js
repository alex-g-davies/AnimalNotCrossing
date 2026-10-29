// Overlays: the end-of-game card and the hint banner.

const $ = (id) => document.getElementById(id);

export function showEnd({ status, title, message, timeText, artSvg, onNext, onLook }) {
  $('overlay-title').textContent = title;
  $('overlay-message').textContent = message;
  $('overlay-time').textContent = timeText || '';
  $('overlay-art').innerHTML = artSvg;
  $('end-card').dataset.status = status;
  const next = $('btn-next');
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
