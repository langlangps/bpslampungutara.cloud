const icons = {"moon": "<svg aria-hidden=\"true\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M21 13a9 9 0 0 1-10-10A9 9 0 1 0 21 13Z\"/></svg>", "sun": "<svg aria-hidden=\"true\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2\"/></svg>", "sound": "<svg aria-hidden=\"true\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3 9h4l5-4v14l-5-4H3zM16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14\"/></svg>", "mute": "<svg aria-hidden=\"true\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3 9h4l5-4v14l-5-4H3zM16 9l5 6m0-6-5 6\"/></svg>"};
const read = (key, fallback) => { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } };
const save = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
const themeButton = document.querySelector('#theme');
const soundButton = document.querySelector('#sound');
let theme = read('spkrt-theme', 'light') === 'dark' ? 'dark' : 'light';
let sound = read('spkrt-sound', 'on') === 'on';
let audio;
function render() {
  document.documentElement.dataset.theme = theme;
  themeButton.innerHTML = icons[theme === 'dark' ? 'sun' : 'moon'];
  themeButton.setAttribute('aria-label', theme === 'dark' ? 'Aktifkan tema terang' : 'Aktifkan tema gelap');
  soundButton.innerHTML = icons[sound ? 'sound' : 'mute'];
  soundButton.setAttribute('aria-label', sound ? 'Matikan suara' : 'Aktifkan suara');
  soundButton.setAttribute('aria-pressed', String(sound));
}
function clickSound() {
  if (!sound) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    audio ||= new Audio();
    const play = () => {
      const now = audio.currentTime, oscillator = audio.createOscillator(), gain = audio.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(630, now);
      oscillator.frequency.exponentialRampToValueAtTime(420, now + .09);
      gain.gain.setValueAtTime(.001, now);
      gain.gain.exponentialRampToValueAtTime(.065, now + .012);
      gain.gain.exponentialRampToValueAtTime(.001, now + .12);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(now); oscillator.stop(now + .13);
    };
    if (audio.state === 'suspended') audio.resume().then(play).catch(() => {}); else play();
  } catch {}
}
render();
themeButton.addEventListener('click', () => { theme = theme === 'light' ? 'dark' : 'light'; save('spkrt-theme', theme); render(); });
soundButton.addEventListener('click', () => { sound = !sound; save('spkrt-sound', sound ? 'on' : 'off'); render(); });
document.addEventListener('click', event => {
  const control = event.target.closest('button, a');
  if (!control) return;
  clickSound();
  if (control.dataset.dialog) document.getElementById(control.dataset.dialog).showModal();
  if (control.hasAttribute('data-close')) control.closest('dialog').close();
});
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.addEventListener('click', event => { if (event.target === dialog) { clickSound(); dialog.close(); } });
  dialog.addEventListener('cancel', clickSound);
  dialog.addEventListener('close', () => { document.body.style.overflow = ''; });
  document.querySelector(`[data-dialog="${dialog.id}"]`).addEventListener('click', () => { document.body.style.overflow = 'hidden'; });
});
window.addEventListener('storage', () => { theme = read('spkrt-theme','light') === 'dark' ? 'dark' : 'light'; sound = read('spkrt-sound','on') === 'on'; render(); });

const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const mouse = window.matchMedia('(hover: hover) and (pointer: fine)');
const root = document.documentElement;
window.addEventListener('pointermove', event => {
  if (!mouse.matches || motion.matches || event.pointerType !== 'mouse') return;
  root.style.setProperty('--mx', `${(event.clientX / window.innerWidth - .5) * 58}px`);
  root.style.setProperty('--my', `${(event.clientY / window.innerHeight - .5) * 58}px`);
}, { passive: true });
root.addEventListener('pointerleave', () => {
  root.style.setProperty('--mx', '0px');
  root.style.setProperty('--my', '0px');
});
document.addEventListener('pointerdown', event => {
  const control = event.target.closest('.menu, .icon-button');
  if (!control || motion.matches || event.button !== 0) return;
  const rect = control.getBoundingClientRect();
  const ripple = document.createElement('span');
  const size = Math.max(rect.width, rect.height) * 1.65;
  ripple.className = 'ripple';
  ripple.setAttribute('aria-hidden', 'true');
  Object.assign(ripple.style, {
    width: `${size}px`, height: `${size}px`,
    left: `${event.clientX - rect.left}px`, top: `${event.clientY - rect.top}px`
  });
  control.append(ripple);
  setTimeout(() => ripple.remove(), 650);
}, { passive: true });

document.querySelectorAll('.brand img').forEach(img => {
  const show = () => { img.hidden = false; img.nextElementSibling.hidden = true; };
  const hide = () => { img.hidden = true; img.nextElementSibling.hidden = false; };
  img.addEventListener('load', show);
  img.addEventListener('error', hide);
  if (img.complete) img.naturalWidth ? show() : hide();
});
