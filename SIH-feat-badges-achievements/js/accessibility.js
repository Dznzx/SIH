// WCAG 2.1 Compliant Accessibility Suite Engine
const A11Y_STORAGE_KEY = 'civic_a11y';

let a11yState = {
  fontScale: 1.0,       // 1.0, 1.15, 1.30, 1.45
  highContrast: false,
  dyslexicFont: false,
  ttsSpeaking: false
};

// Initialize Accessibility Engine
function initAccessibility() {
  const saved = localStorage.getItem(A11Y_STORAGE_KEY);
  if (saved) {
    try {
      a11yState = { ...a11yState, ...JSON.parse(saved) };
    } catch (e) {
      console.warn('Failed to parse saved accessibility state:', e);
    }
  }

  applyFontScale(a11yState.fontScale);
  applyHighContrast(a11yState.highContrast);
  applyDyslexicFont(a11yState.dyslexicFont);
}

// Save Accessibility State
function saveA11yState() {
  localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({
    fontScale: a11yState.fontScale,
    highContrast: a11yState.highContrast,
    dyslexicFont: a11yState.dyslexicFont
  }));
}

// Font Scaling (1.0 = 100%, 1.15 = 115%, 1.30 = 130%, 1.45 = 145%)
function setFontScale(scale) {
  a11yState.fontScale = scale;
  applyFontScale(scale);
  saveA11yState();
  announceToScreenReader(`Font size set to ${Math.round(scale * 100)} percent`);
}

function applyFontScale(scale) {
  // Use zoom on .app — scales everything proportionally regardless of px/em/rem units
  // This defeats specificity wars with hardcoded font-size values in the stylesheet
  const app = document.querySelector('.app');
  if (app) app.style.zoom = scale;

  // Also set --font-scale on root for any future rem-based additions
  document.documentElement.style.setProperty('--font-scale', scale);

  // Update active button state
  document.querySelectorAll('.a11y-scale-btn').forEach(btn => {
    btn.classList.toggle('active', parseFloat(btn.dataset.scale) === scale);
  });
}

// High Contrast Mode (WCAG AAA Compliance)
function toggleHighContrast() {
  a11yState.highContrast = !a11yState.highContrast;
  applyHighContrast(a11yState.highContrast);
  saveA11yState();
  announceToScreenReader(a11yState.highContrast ? 'High Contrast Mode Enabled' : 'High Contrast Mode Disabled');
}

function applyHighContrast(enable) {
  document.body.classList.toggle('theme-high-contrast', enable);
  const btn = document.getElementById('a11yContrastToggleBtn');
  if (btn) btn.classList.toggle('active', enable);
}

// Dyslexic-Friendly Font Toggle
function toggleDyslexicFont() {
  a11yState.dyslexicFont = !a11yState.dyslexicFont;
  applyDyslexicFont(a11yState.dyslexicFont);
  saveA11yState();
  announceToScreenReader(a11yState.dyslexicFont ? 'Dyslexic Friendly Font Enabled' : 'Standard Font Enabled');
}

function applyDyslexicFont(enable) {
  document.body.classList.toggle('font-dyslexic', enable);
  const btn = document.getElementById('a11yDyslexicToggleBtn');
  if (btn) btn.classList.toggle('active', enable);
}

// Screen Reader ARIA Live Region Announcer
function announceToScreenReader(message) {
  const announcer = document.getElementById('a11yLiveAnnouncer');
  if (!announcer) return;

  // Clear and update to re-trigger ARIA live region readers
  announcer.textContent = '';
  setTimeout(() => {
    announcer.textContent = message;
  }, 50);
}

// Web SpeechSynthesis Text-to-Speech (TTS) Voice Assist
function speakActivePage() {
  if (!('speechSynthesis' in window)) {
    alert('Text-to-Speech Voice Assist is not supported in this browser.');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const activeView = document.querySelector('.view.active');
  if (!activeView) return;

  // Extract readable text from headings and paragraphs
  const title = activeView.querySelector('h1, h2')?.innerText || 'Active Page';
  const paragraphText = Array.from(activeView.querySelectorAll('p, .pol-summary-box, .inv-sol-summary'))
    .slice(0, 4)
    .map(p => p.innerText)
    .join('. ');

  const fullSpeechText = `${title}. ${paragraphText}`;

  const utterance = new SpeechSynthesisUtterance(fullSpeechText);

  // Set language code based on current selection
  const langMap = {
    'en': 'en-IN',
    'hi': 'hi-IN',
    'bn': 'bn-IN',
    'ta': 'ta-IN',
    'te': 'te-IN',
    'mr': 'mr-IN',
    'gu': 'gu-IN',
    'kn': 'kn-IN',
    'ml': 'ml-IN',
    'pa': 'pa-IN',
    'ur': 'ur-IN'
  };
  utterance.lang = langMap[(typeof currentLang !== 'undefined' ? currentLang : 'en')] || 'en-IN';
  utterance.rate = 0.95; // Slightly slower for crisp clarity

  utterance.onstart = () => {
    a11yState.ttsSpeaking = true;
    updateTtsBtnState(true);
    announceToScreenReader('Reading page content aloud...');
  };

  utterance.onend = () => {
    a11yState.ttsSpeaking = false;
    updateTtsBtnState(false);
  };

  utterance.onerror = () => {
    a11yState.ttsSpeaking = false;
    updateTtsBtnState(false);
  };

  window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    a11yState.ttsSpeaking = false;
    updateTtsBtnState(false);
    announceToScreenReader('Voice readout stopped');
  }
}

function updateTtsBtnState(isSpeaking) {
  const btn = document.getElementById('a11yTtsToggleBtn');
  if (btn) {
    btn.classList.toggle('active', isSpeaking);
    btn.innerHTML = isSpeaking ? '⏹️ Stop Reading Voice' : '🔊 Read Page Aloud';
  }
}

// Toggle Accessibility Drawer
function toggleA11yDrawer() {
  const drawer = document.getElementById('a11yDrawer');
  if (!drawer) return;
  const isOpening = drawer.style.display === 'none' || !drawer.style.display;
  drawer.style.display = isOpening ? 'flex' : 'none';
  if (isOpening) announceToScreenReader('Accessibility options menu opened');
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initAccessibility();
});
