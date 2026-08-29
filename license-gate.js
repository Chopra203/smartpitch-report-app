/**
 * SmartPitch Pro — License Gate
 * Blocks app access until a valid Lemon Squeezy license key is entered.
 * - Caches verified keys in localStorage for 7 days (no repeated prompts)
 * - Revalidates against the server after 7 days (revokes if subscription cancelled)
 * - On network failure during revalidation, fails open (doesn't lock out paying users)
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'sp_pro_license_v1';
  var EXPIRY_MS   = 7 * 24 * 60 * 60 * 1000; // 7 days
  var VERIFY_URL  = '/api/verify-license';
  var PRO_URL     = 'https://chopra203.github.io/portfolio/pro-tour.html';

  /* ── Storage helpers ─────────────────────────────────── */
  function getStored() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var d = JSON.parse(raw);
      if (!d || !d.key || !d.expires) return null;
      if (Date.now() > d.expires) return null; // expired — will revalidate below
      return d;
    } catch (e) { return null; }
  }

  function getExpired() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  function saveToStorage(key, instance_id) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        key: key,
        instance_id: instance_id || null,
        expires: Date.now() + EXPIRY_MS
      }));
    } catch (e) {}
  }

  function clearStorage() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  /* ── API call ────────────────────────────────────────── */
  function callAPI(license_key, instance_id, action) {
    return fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ license_key: license_key, instance_id: instance_id, action: action })
    }).then(function (r) { return r.json(); });
  }

  /* ── Gate UI ─────────────────────────────────────────── */
  function showGate(prefillKey) {
    var gate = document.createElement('div');
    gate.id = 'sp-gate';
    gate.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:2147483647',
      'background:#212722',
      'display:flex', 'align-items:center', 'justify-content:center',
      "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"
    ].join(';');

    gate.innerHTML = [
      '<div style="',
        'background:linear-gradient(135deg,#1a1e1a,#111312);',
        'border:1px solid rgba(217,119,6,0.40);',
        'border-radius:16px;padding:48px 40px;',
        'max-width:420px;width:90%;text-align:center;position:relative;',
      '">',
        '<div style="position:absolute;top:-60px;left:50%;transform:translateX(-50%);',
          'width:300px;height:300px;border-radius:50%;',
          'background:radial-gradient(circle,rgba(217,119,6,0.08) 0%,transparent 70%);',
          'pointer-events:none;"></div>',

        '<div style="color:#D97706;font-size:10px;font-weight:700;letter-spacing:3px;',
          'text-transform:uppercase;margin-bottom:16px;">SmartPitch Pro</div>',

        '<h2 style="color:#FEF6E6;font-size:24px;font-weight:600;',
          'margin:0 0 12px;">Pro Access Required</h2>',

        '<p style="color:rgba(254,246,230,0.55);font-size:14px;line-height:1.65;',
          'margin:0 0 28px;">Enter the license key from your SmartPitch Pro ',
          'purchase confirmation email to unlock this tool.</p>',

        '<input id="sp-key" type="text" ',
          'placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" ',
          'value="' + (prefillKey || '') + '" ',
          'autocomplete="off" spellcheck="false" ',
          'style="width:100%;box-sizing:border-box;',
            'background:rgba(255,255,255,0.05);',
            'border:1px solid rgba(254,246,230,0.18);',
            'border-radius:6px;color:#FEF6E6;',
            "font-family:ui-monospace,'Cascadia Code',monospace;",
            'font-size:13px;letter-spacing:0.5px;',
            'padding:12px 14px;margin-bottom:10px;outline:none;" />',

        '<div id="sp-err" style="color:#f87171;font-size:13px;',
          'min-height:20px;margin-bottom:10px;display:none;"></div>',

        '<button id="sp-btn" style="',
          'width:100%;padding:14px;cursor:pointer;',
          'background:transparent;color:#FEF6E6;',
          'border:2px solid rgba(254,246,230,0.28);border-radius:5px;',
          'font-size:11px;font-weight:700;letter-spacing:2.5px;',
          'text-transform:uppercase;',
          'transition:background 0.2s,border-color 0.2s,color 0.2s;',
          'margin-bottom:22px;">Unlock Access</button>',

        '<a href="' + PRO_URL + '" ',
          'style="color:rgba(254,246,230,0.30);font-size:12px;',
            'text-decoration:none;transition:color 0.2s;" ',
          'onmouseover="this.style.color=\'#D97706\'" ',
          'onmouseout="this.style.color=\'rgba(254,246,230,0.30)\'">',
          "Don't have a subscription? Get Pro Access →</a>",
      '</div>'
    ].join('');

    document.body.appendChild(gate);

    var input  = document.getElementById('sp-key');
    var btn    = document.getElementById('sp-btn');
    var errDiv = document.getElementById('sp-err');

    // Hover effect
    btn.addEventListener('mouseover', function () {
      btn.style.background = '#D97706';
      btn.style.borderColor = '#D97706';
      btn.style.color = '#111312';
    });
    btn.addEventListener('mouseout', function () {
      if (btn.disabled) return;
      btn.style.background = 'transparent';
      btn.style.borderColor = 'rgba(254,246,230,0.28)';
      btn.style.color = '#FEF6E6';
    });

    function showError(msg) {
      errDiv.textContent = msg;
      errDiv.style.display = 'block';
    }

    function setLoading(loading) {
      btn.disabled = loading;
      btn.textContent = loading ? 'Verifying…' : 'Unlock Access';
      if (loading) {
        btn.style.background = 'rgba(217,119,6,0.20)';
        btn.style.borderColor = 'rgba(217,119,6,0.30)';
        btn.style.color = 'rgba(254,246,230,0.50)';
      } else {
        btn.style.background = 'transparent';
        btn.style.borderColor = 'rgba(254,246,230,0.28)';
        btn.style.color = '#FEF6E6';
      }
    }

    function attempt() {
      var key = input.value.trim();
      if (!key) { showError('Please enter your license key.'); return; }
      errDiv.style.display = 'none';
      setLoading(true);

      callAPI(key, null, 'activate')
        .then(function (result) {
          if (result.valid) {
            saveToStorage(key, result.instance_id);
            gate.remove();
          } else {
            showError(result.error || 'Invalid license key. Please try again.');
            setLoading(false);
          }
        })
        .catch(function () {
          showError('Network error. Please check your connection and try again.');
          setLoading(false);
        });
    }

    btn.addEventListener('click', attempt);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') attempt(); });
    setTimeout(function () { input.focus(); }, 100);
  }

  /* ── Init ────────────────────────────────────────────── */
  function init() {
    // 1. Valid cached entry → unlock immediately, silently revalidate next visit
    var stored = getStored();
    if (stored) return; // cached — let the app load

    // 2. Expired cache → try silent revalidation, show gate only if subscription revoked
    var expired = getExpired();
    if (expired && expired.key) {
      var action = expired.instance_id ? 'validate' : 'activate';
      callAPI(expired.key, expired.instance_id, action)
        .then(function (result) {
          if (result.valid) {
            saveToStorage(expired.key, result.instance_id || expired.instance_id);
            // App already loaded — no gate needed
          } else {
            clearStorage();
            showGate(expired.key); // Show gate with key pre-filled
          }
        })
        .catch(function () {
          // Network error — fail open, extend cache by 1 day so paying users aren't locked out
          saveToStorage(expired.key, expired.instance_id);
        });
      return;
    }

    // 3. No cache at all → show gate
    showGate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
