/* GameUnlock – free part + "full game" unlocked with a Gumroad licence key (shared by Tilejo and Passatempos PT).
   Settings: config.js (window.GAME_CONFIG). Same pattern as LivroAL: the key is checked once with
   POST https://api.gumroad.com/v2/licenses/verify (product_id + license_key) straight from the browser,
   then the unlock is kept in localStorage. Nothing else is sent anywhere.
   Godot talks to this through res://web/web_bridge.gd: isFull(), hasPaywall(), open(reason, lang), setListener(cb). */
(function () {
  "use strict";
  var CFG = window.GAME_CONFIG || {};
  var STORE = (CFG.GAME || "game") + ".unlock.v1";
  var KEY_RE = /^[A-Z0-9]{8}-[A-Z0-9]{8}-[A-Z0-9]{8}-[A-Z0-9]{8}$/;
  var configured = CFG.MODE === "gumroad" && !!CFG.GUMROAD_PRODUCT_ID && !!CFG.BUY_URL && !/PLACEHOLDER/.test(CFG.BUY_URL);
  if (CFG.MODE === "gumroad" && !configured) console.info("[unlock] Gumroad product not configured yet: the whole game is open.");
  var listener = null;

  var T = {
    pt: { unlock: "Desbloquear", buy: "Comprar no Gumroad", have: "Já comprou? Introduza a chave de licença:",
          ph: "XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX", activate: "Ativar", later: "Agora não",
          checking: "A verificar a chave…", ok: "Jogo completo desbloqueado. Obrigado!",
          bad_format: "A chave tem o formato XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX.",
          invalid: "Chave inválida. Confirme que copiou a chave completa do email da Gumroad.",
          refunded: "Esta compra foi reembolsada, por isso a chave já não é válida.",
          disputed: "Esta compra está em disputa e a chave está suspensa.",
          too_many: "Esta chave já foi ativada em mais de {n} dispositivos.",
          offline: "Sem ligação à internet. A ativação precisa de internet só uma vez.",
          where: "A chave chega no email de compra da Gumroad e fica na sua biblioteca Gumroad.",
          privacy: "Ao ativar, a chave é enviada uma vez à Gumroad para confirmar a compra. Mais nada é recolhido.",
          done: "Jogo completo ativo", close: "Fechar" },
    en: { unlock: "Unlock", buy: "Buy on Gumroad", have: "Already bought it? Enter your licence key:",
          ph: "XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX", activate: "Activate", later: "Not now",
          checking: "Checking the key…", ok: "Full game unlocked. Thank you!",
          bad_format: "The key looks like XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX.",
          invalid: "Invalid key. Check you copied the whole key from the Gumroad e-mail.",
          refunded: "This purchase was refunded, so the key is no longer valid.",
          disputed: "This purchase is disputed and the key is suspended.",
          too_many: "This key has already been activated on more than {n} devices.",
          offline: "No internet connection. Activation needs the internet only once.",
          where: "The key is in your Gumroad purchase e-mail and in your Gumroad library.",
          privacy: "When you activate, the key is sent once to Gumroad to confirm the purchase. Nothing else is collected.",
          done: "Full game active", close: "Close" }
  };

  function lic() { try { return JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) { return null; } }
  function setLic(v) { try { v ? localStorage.setItem(STORE, JSON.stringify(v)) : localStorage.removeItem(STORE); } catch (e) {} notify(); }
  function isFull() { return !configured || !!lic(); }
  function notify() { if (listener) { try { listener(isFull()); } catch (e) { console.warn(e); } } }

  function verify(key, increment) {
    var body = new URLSearchParams({ product_id: CFG.GUMROAD_PRODUCT_ID, license_key: key, increment_uses_count: increment ? "true" : "false" });
    return fetch(CFG.API_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, j: j }; }); });
  }
  function problem(j) {
    if (!j || !j.success) return "invalid";
    var p = j.purchase || {};
    if (p.refunded || p.chargebacked) return "refunded";
    if (p.disputed && !p.dispute_won) return "disputed";
    return null;
  }
  function activate(key) {
    key = String(key || "").trim().toUpperCase();
    if (!KEY_RE.test(key)) return Promise.resolve({ ok: false, code: "bad_format" });
    return verify(key, true).then(function (res) {
      var pr = problem(res.j);
      if (pr) return { ok: false, code: pr };
      if (CFG.MAX_USES && res.j.uses > CFG.MAX_USES) return { ok: false, code: "too_many" };
      setLic({ key: key, at: Date.now(), checkedAt: Date.now() });
      return { ok: true };
    }, function () { return { ok: false, code: "offline" }; });
  }
  function recheck() {
    var l = lic();
    if (!configured || !l || !navigator.onLine) return;
    if (Date.now() - (l.checkedAt || 0) < (CFG.RECHECK_DAYS || 14) * 864e5) return;
    verify(l.key, false).then(function (res) {
      if (res.status >= 500) return;            // Gumroad down: keep access
      if (problem(res.j)) { setLic(null); return; }
      l.checkedAt = Date.now(); setLic(l);
    }, function () { /* offline: keep access */ });
  }

  /* ---------- overlay ---------- */
  var css = "#gu-ov{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;background:rgba(10,20,40,.55);font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;padding:16px;box-sizing:border-box}" +
    "#gu-card{background:#fffdf8;color:#1d2533;border-radius:22px;max-width:440px;width:100%;max-height:100%;overflow:auto;padding:22px 22px 18px;box-shadow:0 12px 40px rgba(0,0,0,.35);border:4px solid var(--gu-ink,#1d4e89);box-sizing:border-box}" +
    "#gu-card h2{margin:0 0 6px;font-size:22px;color:var(--gu-ink,#1d4e89)}#gu-card .gu-free{margin:0 0 10px;font-size:14px;color:#555}" +
    "#gu-card ul{margin:0 0 14px;padding-left:20px;font-size:15px;line-height:1.4}#gu-card li{margin:4px 0}" +
    "#gu-buy{display:block;text-align:center;text-decoration:none;background:var(--gu-ink,#1d4e89);color:#fff;font-weight:700;font-size:18px;border-radius:14px;padding:14px;margin:0 0 14px}" +
    "#gu-card label{display:block;font-size:14px;margin:0 0 6px}#gu-row{display:flex;gap:8px}" +
    "#gu-key{flex:1;min-width:0;font:15px ui-monospace,Menlo,monospace;padding:11px 10px;border:2px solid #c9c3b5;border-radius:10px;text-transform:uppercase;background:#fff;color:#111}" +
    "#gu-act{border:0;border-radius:10px;padding:0 14px;font-weight:700;font-size:15px;background:#2f6f4f;color:#fff;cursor:pointer}#gu-act:disabled{opacity:.6}" +
    "#gu-msg{min-height:20px;font-size:14px;margin:8px 0 2px}#gu-msg.err{color:#b3261e}#gu-msg.ok{color:#2f6f4f;font-weight:700}" +
    "#gu-card small{display:block;color:#666;font-size:12px;margin-top:6px;line-height:1.35}" +
    "#gu-later{display:block;margin:12px auto 0;background:none;border:0;color:#444;font-size:15px;text-decoration:underline;cursor:pointer}";
  function el(tag, attrs, text) { var e = document.createElement(tag); for (var k in (attrs || {})) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; return e; }

  function close() { var o = document.getElementById("gu-ov"); if (o) o.remove(); var c = document.getElementById("canvas"); if (c) try { c.focus(); } catch (e) {} }
  function open(reason, lang) {
    if (!configured) return;
    lang = (lang === "pt" || lang === "en") ? lang : ((navigator.language || "").toLowerCase().indexOf("pt") === 0 ? "pt" : "en");
    var t = T[lang], tx = (CFG.TEXT && CFG.TEXT[lang]) || {};
    close();
    if (!document.getElementById("gu-css")) { var s = el("style", { id: "gu-css" }); s.textContent = css; document.head.appendChild(s); }
    var ov = el("div", { id: "gu-ov", role: "dialog", "aria-modal": "true", "aria-labelledby": "gu-title", "data-reason": reason || "" });
    if (CFG.INK) ov.style.setProperty("--gu-ink", CFG.INK);
    var card = el("div", { id: "gu-card" });
    card.appendChild(el("h2", { id: "gu-title" }, tx.title || t.unlock));
    if (isFull()) {
      card.appendChild(el("p", { id: "gu-msg", class: "ok" }, t.done));
    } else {
      if (tx.free) card.appendChild(el("p", { class: "gu-free" }, tx.free));
      var ul = el("ul"); (tx.gets || []).forEach(function (g) { ul.appendChild(el("li", null, g)); }); card.appendChild(ul);
      var buy = el("a", { id: "gu-buy", href: CFG.BUY_URL, target: "_blank", rel: "noopener" }, t.buy + " · " + (CFG.PRICE_LABEL || ""));
      card.appendChild(buy);
      card.appendChild(el("label", { for: "gu-key" }, t.have));
      var row = el("div", { id: "gu-row" });
      var inp = el("input", { id: "gu-key", type: "text", inputmode: "text", autocomplete: "off", autocapitalize: "characters", spellcheck: "false", placeholder: t.ph, maxlength: "60" });
      var act = el("button", { id: "gu-act", type: "button" }, t.activate);
      row.appendChild(inp); row.appendChild(act); card.appendChild(row);
      var msg = el("div", { id: "gu-msg", "aria-live": "polite" }); card.appendChild(msg);
      card.appendChild(el("small", null, t.where));
      card.appendChild(el("small", null, t.privacy));
      var go = function () {
        act.disabled = true; msg.className = ""; msg.textContent = t.checking;
        activate(inp.value).then(function (r) {
          act.disabled = false;
          if (r.ok) { msg.className = "ok"; msg.textContent = t.ok; setTimeout(close, 1400); }
          else { msg.className = "err"; msg.textContent = (t[r.code] || t.invalid).replace("{n}", CFG.MAX_USES); }
        });
      };
      act.addEventListener("click", go);
      inp.addEventListener("keydown", function (e) { e.stopPropagation(); if (e.key === "Enter") go(); });
      inp.addEventListener("keyup", function (e) { e.stopPropagation(); });
    }
    var later = el("button", { id: "gu-later", type: "button" }, isFull() ? t.close : t.later);
    later.addEventListener("click", close); card.appendChild(later);
    ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
    ["pointerdown", "pointerup", "touchstart", "touchend", "mousedown", "mouseup", "wheel"].forEach(function (ev) { ov.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true }); });
    ov.appendChild(card); document.body.appendChild(ov);
    if (!isFull()) setTimeout(function () { var k = document.getElementById("gu-key"); if (k && !matchMedia("(pointer: coarse)").matches) k.focus(); }, 50);
  }

  window.GameUnlock = {
    isFull: isFull,
    hasPaywall: function () { return configured; },
    open: open, close: close,
    activate: activate,
    setListener: function (cb) { listener = cb; },
    _reset: function () { setLic(null); }   // for tests / support
  };
  window.addEventListener("online", recheck);
  setTimeout(recheck, 4000);
}());
