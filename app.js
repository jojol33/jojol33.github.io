/* 咪峰生日網頁 — 主程式（一般不需要修改，內容請改 config.js） */
(function () {
  "use strict";
  var C = window.BIRTHDAY_CONFIG || {};
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var params = new URLSearchParams(location.search);
  var PREVIEW = params.get("preview") === "1";
  var DAY = 86400000;

  function parseTW(s) {
    if (!s) return NaN;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s += "T00:00:00+08:00";
    return new Date(s).getTime();
  }
  // ?now=2026-12-05 可模擬某一天（測試用）
  var timeOffset = 0;
  if (params.get("now")) { var sim = parseTW(params.get("now")); if (!isNaN(sim)) timeOffset = sim - Date.now(); }
  function now() { return Date.now() + timeOffset; }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0; var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function mdText(t) { var d = new Date(t + 8 * 3600000); return (d.getUTCMonth() + 1) + "/" + d.getUTCDate(); }

  var NICK = C.nickname || "咪峰";
  document.title = NICK + "生日快樂 💝";
  $$(".js-nick").forEach(function (el) { el.textContent = NICK; });

  /* ---------- game registry & schedule ---------- */
  var META = {
    quiz:    { icon: "💭", name: "關於我們的問答題" },
    hearts:  { icon: "💗", name: "接愛心" },
    memory:  { icon: "📸", name: "照片翻牌配對" },
    scratch: { icon: "🎟️", name: "愛的刮刮樂" },
    puzzle:  { icon: "🧩", name: "回憶拼圖" },
    words:   { icon: "💬", name: "情話拼字" },
    cake:    { icon: "🎂", name: "吹蠟燭許願" }
  };
  var sched = C.schedule || {};
  var startT = parseTW(sched.start || "2026-10-24");
  var interval = (sched.intervalDays || 10) * DAY;
  var GAMES = (C.games || Object.keys(META).map(function (id) { return { id: id }; }))
    .filter(function (g) { return META[g.id]; })
    .map(function (g, i) { return { id: g.id, n: i + 1, unlock: g.unlock ? parseTW(g.unlock) : startT + i * interval }; });
  var birthdayT = parseTW(C.birthday || "2027-01-02T00:00:00+08:00");
  function gameById(id) { for (var i = 0; i < GAMES.length; i++) if (GAMES[i].id === id) return GAMES[i]; }
  function isOpen(t) { return PREVIEW || now() >= t; }

  var DONE_KEY = "mifeng-done";
  var done = {};
  try { done = JSON.parse(localStorage.getItem(DONE_KEY) || "{}"); } catch (e) {}
  function markDone(id) { done[id] = 1; try { localStorage.setItem(DONE_KEY, JSON.stringify(done)); } catch (e) {} renderCalendar(); }

  /* ---------- home photo ---------- */
  (function () {
    var H = C.home || {}, fig = $("#home-photo"), img = $("#home-photo-img");
    if (!H.photo) return;
    img.onload = function () { fig.classList.remove("hidden"); };
    img.onerror = function () { fig.classList.add("hidden"); };
    img.style.objectPosition = H.focus || "50% 46%";
    img.style.transformOrigin = H.focus || "50% 46%";
    if (H.zoom && H.zoom !== 1) img.style.transform = "scale(" + H.zoom + ")";
    img.alt = NICK;
    $("#home-photo-cap").textContent = H.caption || "";
    img.src = encodeURI(H.photo);
  })();

  /* ---------- floating hearts ---------- */
  (function () {
    var box = $(".bg-hearts"), icons = ["💗", "💕", "🤍", "✨", "💖"];
    for (var i = 0; i < 14; i++) {
      var s = document.createElement("span");
      s.textContent = icons[i % icons.length];
      s.style.left = Math.random() * 100 + "%";
      s.style.fontSize = 12 + Math.random() * 16 + "px";
      s.style.animationDuration = 9 + Math.random() * 10 + "s";
      s.style.animationDelay = -Math.random() * 18 + "s";
      box.appendChild(s);
    }
  })();

  /* ---------- toast & modal ---------- */
  var toastTimer;
  function toast(msg) {
    var t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }
  var modalCb = null;
  function modal(o) {
    $("#modal-emoji").textContent = o.emoji || "🎉";
    $("#modal-title").textContent = o.title || "";
    $("#modal-text").textContent = o.text || "";
    $("#modal-ok").textContent = o.ok || "好 💕";
    $("#modal-alt").classList.toggle("hidden", !o.alt);
    modalCb = o.onOk || null;
    $("#modal").classList.remove("hidden");
  }
  function closeModal() { $("#modal").classList.add("hidden"); }
  $("#modal-ok").addEventListener("click", function () { closeModal(); if (modalCb) modalCb(); });
  $("#modal-alt").addEventListener("click", function () { closeModal(); go("home"); });

  /* ---------- confetti ---------- */
  var confetti = (function () {
    var cv = $("#confetti"), ctx = cv.getContext("2d"), parts = [], running = false;
    var colors = ["#ff8fab", "#fb6f92", "#ffc35c", "#8fd3fe", "#b8e0d2", "#ffffff", "#ffb3c6"];
    function resize() { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; }
    addEventListener("resize", resize); resize();
    function burst(n) {
      n = n || 160;
      for (var i = 0; i < n; i++) parts.push({
        x: innerWidth * (0.2 + Math.random() * 0.6), y: innerHeight * 0.35,
        vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 12 - 4,
        s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
        c: colors[(Math.random() * colors.length) | 0], heart: Math.random() < 0.25, life: 0
      });
      if (!running) { running = true; requestAnimationFrame(tick); }
    }
    function tick() {
      var d = devicePixelRatio;
      ctx.setTransform(d, 0, 0, d, 0, 0);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      parts = parts.filter(function (p) { return p.y < innerHeight + 30 && p.life < 400; });
      parts.forEach(function (p) {
        p.vy += 0.25; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life++;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
        if (p.heart) { ctx.font = p.s * 2.4 + "px sans-serif"; ctx.fillText("💖", 0, 0); }
        else ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        ctx.restore();
      });
      if (parts.length) requestAnimationFrame(tick);
      else { running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
    }
    return burst;
  })();

  /* ---------- calendar ---------- */
  function remainText(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600);
    if (d > 0) return "還有 " + d + " 天 " + h + " 時";
    return "還有 " + pad(h) + ":" + pad(Math.floor(s % 3600 / 60)) + ":" + pad(s % 60);
  }
  function buildCalendar() {
    var cal = $("#calendar"); cal.innerHTML = "";
    GAMES.forEach(function (g) {
      var b = document.createElement("button");
      b.className = "gift"; b.dataset.id = g.id;
      b.innerHTML = '<span class="gift-no">第 ' + g.n + ' 份</span><span class="gift-icon"></span>' +
        '<span class="gift-name"></span><span class="gift-date"></span><span class="gift-cd"></span><span class="gift-badge"></span>';
      b.addEventListener("click", function () { go(g.id); });
      cal.appendChild(b);
    });
    var L = document.createElement("button");
    L.className = "gift gift-letter"; L.dataset.id = "letter";
    L.innerHTML = '<span class="gift-no">生日當天</span><span class="gift-icon"></span>' +
      '<span class="gift-name"></span><span class="gift-date"></span><span class="gift-cd"></span><span class="gift-badge"></span>';
    L.addEventListener("click", function () { go("letter"); });
    cal.appendChild(L);
  }
  function renderCalendar() {
    $$(".gift").forEach(function (b) {
      var id = b.dataset.id, isLetter = id === "letter";
      var t = isLetter ? birthdayT : gameById(id).unlock, open = isOpen(t);
      b.classList.toggle("locked", !open); b.classList.toggle("open", open);
      b.classList.toggle("done", !!done[id]);
      b.querySelector(".gift-icon").textContent = open ? (isLetter ? "💌" : META[id].icon) : (isLetter ? "✉️" : "🎁");
      b.querySelector(".gift-name").textContent = open ? (isLetter ? "給" + NICK + "的信" : META[id].name) : (isLetter ? "最後的告白信" : "神秘禮物");
      b.querySelector(".gift-date").textContent = open
        ? (done[id] ? "✔ 已完成" : (isLetter ? "打開來看 💗" : "點我開始玩"))
        : mdText(t) + " 解鎖";
      b.querySelector(".gift-cd").textContent = open ? "" : remainText(t - now());
      b.querySelector(".gift-badge").textContent = open ? (done[id] ? "✔" : "NEW") : "🔒";
    });
  }

  /* ---------- navigation ---------- */
  var PAGES = ["home", "letter"].concat(GAMES.map(function (g) { return g.id; }));
  var inits = {};
  function go(name, push) {
    if (PAGES.indexOf(name) < 0) name = "home";
    if (name !== "home" && name !== "letter") {
      var g = gameById(name);
      if (!isOpen(g.unlock)) { toast("這份禮物 " + mdText(g.unlock) + " 才能打開喔 🎁"); name = "home"; }
    }
    $$(".page").forEach(function (p) { p.classList.toggle("active", p.id === "page-" + name); });
    $("#back-btn").classList.toggle("hidden", name === "home");
    if (push !== false || location.hash.slice(1) !== (name === "home" ? "" : name))
      history.replaceState(null, "", location.pathname + location.search + (name === "home" ? "" : "#" + name));
    window.scrollTo(0, 0);
    if (name !== "hearts") hearts.stop();
    if (name !== "cake") stopMic();
    if (inits[name]) { var f = inits[name]; delete inits[name]; requestAnimationFrame(f); }
  }
  $("#back-btn").addEventListener("click", function () { go("home"); });
  window.addEventListener("hashchange", function () { go(location.hash.slice(1), false); });

  /* ---------- countdown & letter ---------- */
  var env = $("#envelope"), unlocked = false, opened = false;
  function renderLetter() {
    var L = C.letter || {};
    $("#letter-title").textContent = L.title || "";
    var body = $("#letter-body"); body.innerHTML = "";
    (L.paragraphs || []).forEach(function (t) { var p = document.createElement("p"); p.textContent = t; body.appendChild(p); });
    $("#letter-sign").textContent = L.signature || "";
  }
  function unlockLetter() {
    if (unlocked) return;
    unlocked = true;
    env.classList.remove("locked"); env.classList.add("unlocked");
    $("#env-seal").textContent = "💗";
    $("#letter-sub").textContent = now() < birthdayT ? "（預覽模式）信已經解鎖囉 💝" : "生日快樂！🎉 時間到了～";
    $("#env-hint").textContent = "信已經解鎖了，點一下打開 💌";
  }
  function openLetter() {
    if (!unlocked) {
      env.classList.remove("shake"); void env.offsetWidth; env.classList.add("shake");
      setTimeout(function () { env.classList.remove("shake"); }, 500);
      toast("生日那天才能打開喔 🔒"); return;
    }
    if (opened) return;
    opened = true; env.classList.add("open"); $("#env-hint").textContent = "";
    setTimeout(function () {
      renderLetter(); $("#letter").classList.remove("hidden"); confetti(180); markDone("letter");
      setTimeout(function () { $("#letter").scrollIntoView({ behavior: "smooth", block: "start" }); }, 200);
    }, 1300);
  }
  env.addEventListener("click", openLetter);
  env.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") openLetter(); });

  function tick() {
    var diff = Math.max(0, birthdayT - now()), s = Math.floor(diff / 1000);
    $("#cd-d").textContent = pad(Math.floor(s / 86400));
    $("#cd-h").textContent = pad(Math.floor(s % 86400 / 3600));
    $("#cd-m").textContent = pad(Math.floor(s % 3600 / 60));
    $("#cd-s").textContent = pad(s % 60);
    if (diff <= 0) { $("#countdown").classList.add("done"); $("#cd-note").textContent = "生日快樂！🎉 所有禮物都打開了，快去讀信吧 💌"; }
    else {
      var next = GAMES.filter(function (g) { return now() < g.unlock; })[0];
      $("#cd-note").textContent = next ? "下一份禮物：" + mdText(next.unlock) + "（" + remainText(next.unlock - now()) + "）🎁" : "所有小遊戲都打開了，生日那天就能讀信 💌";
    }
    if (isOpen(birthdayT)) unlockLetter();
    renderCalendar();
  }
  buildCalendar();
  if (PREVIEW || timeOffset) {
    $("#preview-badge").textContent = PREVIEW ? "🔧 預覽模式：全部解鎖（只給自己測試用）" : "🔧 模擬日期：" + params.get("now");
    $("#preview-badge").classList.remove("hidden");
  }

  /* ========== 1. 問答題 ========== */
  var Q = C.quiz || [], qi = 0, score = 0;
  var cheers = ["答對了！你最懂我 💕", "完全正確！好棒 🥰", "沒錯沒錯～ 😘", "哇！滿分男友 ✨"];
  var oops = ["哼～答錯了啦 😤", "欸！這個你要記住 🥺", "扣一個親親 💋", "再想想嘛～ 🙈"];
  function showQ() {
    var q = Q[qi];
    $("#quiz-result").classList.add("hidden"); $("#quiz-card").classList.remove("hidden");
    $("#quiz-count").textContent = "第 " + (qi + 1) + " 題 / 共 " + Q.length + " 題";
    $("#quiz-bar").style.width = (qi / Q.length * 100) + "%";
    $("#quiz-q").textContent = q.question;
    $("#quiz-feedback").textContent = "";
    $("#quiz-next").classList.add("hidden");
    var box = $("#quiz-options"); box.innerHTML = "";
    q.options.forEach(function (o, i) {
      var b = document.createElement("button");
      b.className = "quiz-opt"; b.textContent = "ABCDEF"[i] + ". " + o;
      b.addEventListener("click", function () { answer(i); });
      box.appendChild(b);
    });
  }
  function answer(i) {
    var q = Q[qi], btns = $$(".quiz-opt");
    btns.forEach(function (b) { b.disabled = true; });
    if (btns[q.answer]) btns[q.answer].classList.add("correct");
    if (i === q.answer) { score++; $("#quiz-feedback").textContent = pick(cheers); }
    else { btns[i].classList.add("wrong"); $("#quiz-feedback").textContent = pick(oops); }
    var n = $("#quiz-next");
    n.textContent = qi === Q.length - 1 ? "看結果 🎁" : "下一題 ➜";
    n.classList.remove("hidden");
  }
  $("#quiz-next").addEventListener("click", function () {
    qi++;
    if (qi < Q.length) return showQ();
    $("#quiz-bar").style.width = "100%";
    $("#quiz-card").classList.add("hidden"); $("#quiz-result").classList.remove("hidden");
    $("#quiz-score").textContent = "你答對了 " + score + " / " + Q.length + " 題";
    var r = score / Q.length, emoji, txt;
    if (r === 1) { emoji = "🏆"; txt = "全對！你果然是最懂我的人，獎勵一個大大的抱抱 🤗"; confetti(200); }
    else if (r >= 0.6) { emoji = "🥰"; txt = "很不錯喔～差一點點就滿分了，繼續加油！"; confetti(80); }
    else { emoji = "🥺"; txt = "嗚嗚… 看來要多花點時間了解我囉！罰你再玩一次 😝"; }
    $("#quiz-emoji").textContent = emoji; $("#quiz-comment").textContent = txt;
    markDone("quiz");
  });
  $("#quiz-retry").addEventListener("click", function () { qi = 0; score = 0; showQ(); });
  if (Q.length) showQ(); else $("#quiz-q").textContent = "（還沒有題目，請到 config.js 新增）";

  /* ========== 2. 接愛心 ========== */
  var hearts = (function () {
    var H = C.hearts || {}, DUR = (H.seconds || 30) * 1000, TARGET = H.target || 30;
    var field = $("#hearts-field"), basket = $("#hearts-basket");
    var items = [], playing = false, t0 = 0, lastSpawn = 0, sc = 0, bx = 0.5, raf = 0, W = 0, Hh = 0;
    $("#hearts-target").textContent = TARGET; $("#hearts-time").textContent = H.seconds || 30;
    function setBasket(clientX) {
      var r = field.getBoundingClientRect();
      bx = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      basket.style.left = bx * 100 + "%";
    }
    field.addEventListener("pointerdown", function (e) { if (playing) setBasket(e.clientX); });
    field.addEventListener("pointermove", function (e) { if (playing) setBasket(e.clientX); });
    function spawn() {
      var r = Math.random(), type = r < 0.14 ? "bad" : r < 0.3 ? "big" : "small";
      var el = document.createElement("span");
      el.className = "fall"; el.textContent = type === "bad" ? "💔" : type === "big" ? "💖" : "💗";
      field.appendChild(el);
      items.push({ el: el, x: 0.06 + Math.random() * 0.88, y: -30, v: 2.2 + Math.random() * 1.8 + (Date.now() - t0) / DUR * 2, type: type });
    }
    function pop(txt, x, y, good) {
      var p = document.createElement("span");
      p.className = "pop-score " + (good ? "good" : "bad"); p.textContent = txt;
      p.style.left = x + "px"; p.style.top = y + "px"; field.appendChild(p);
      setTimeout(function () { p.remove(); }, 700);
    }
    function loop(ts) {
      if (!playing) return;
      var el = Date.now() - t0, left = Math.max(0, DUR - el);
      $("#hearts-time").textContent = Math.ceil(left / 1000);
      if (Date.now() - lastSpawn > Math.max(260, 560 - el / DUR * 300)) { lastSpawn = Date.now(); spawn(); }
      var catchY = Hh - 70;
      items = items.filter(function (it) {
        it.y += it.v;
        var px = it.x * W;
        it.el.style.transform = "translate(" + (px - 16) + "px," + it.y + "px)";
        if (it.y > catchY - 10 && it.y < catchY + 30 && Math.abs(px - bx * W) < 46) {
          var d = it.type === "bad" ? -2 : it.type === "big" ? 3 : 1;
          sc = Math.max(0, sc + d); $("#hearts-score").textContent = sc;
          pop((d > 0 ? "+" : "") + d, px, catchY - 20, d > 0);
          basket.classList.remove("bump"); void basket.offsetWidth; basket.classList.add("bump");
          it.el.remove(); return false;
        }
        if (it.y > Hh) { it.el.remove(); return false; }
        return true;
      });
      if (left <= 0) return end();
      raf = requestAnimationFrame(loop);
    }
    function start() {
      W = field.clientWidth; Hh = field.clientHeight;
      items.forEach(function (it) { it.el.remove(); }); items = [];
      sc = 0; $("#hearts-score").textContent = 0; bx = 0.5; basket.style.left = "50%";
      $("#hearts-start").classList.add("hidden");
      playing = true; t0 = Date.now(); lastSpawn = 0; raf = requestAnimationFrame(loop);
    }
    function stop() {
      if (!playing) return;
      playing = false; cancelAnimationFrame(raf);
      items.forEach(function (it) { it.el.remove(); }); items = [];
      $("#hearts-start").classList.remove("hidden");
    }
    function end() {
      stop();
      var win = sc >= TARGET;
      if (win) { confetti(200); markDone("hearts"); }
      $("#hearts-go").textContent = "再玩一次";
      modal({ emoji: win ? "💘" : "🥺", title: "得到 " + sc + " 分" + (win ? "！過關 🎉" : ""), text: win ? H.winMessage : H.loseMessage, ok: win ? "好 💕" : "再試一次", onOk: win ? null : start, alt: true });
    }
    $("#hearts-go").addEventListener("click", start);
    return { stop: stop };
  })();

  /* ========== 3. 翻牌配對 ========== */
  var EMOJIS = ["🐱", "🍰", "💌", "🌸", "🧸", "🍓", "🎈", "🌙"];
  var first = null, lock = false, moves = 0, pairs = 0;
  function buildMemory() {
    first = null; lock = false; moves = 0; pairs = 0;
    $("#mem-moves").textContent = 0; $("#mem-pairs").textContent = 0;
    var photos = (C.photos || []).filter(Boolean), faces = [];
    for (var i = 0; i < 6; i++) faces.push(photos[i] ? { img: photos[i] } : { emoji: EMOJIS[i] });
    var deck = shuffle(faces.concat(faces).map(function (f) { return { f: f, key: faces.indexOf(f) }; }));
    var grid = $("#memory-grid"); grid.innerHTML = "";
    deck.forEach(function (c) {
      var b = document.createElement("button");
      b.className = "mcard"; b.dataset.key = c.key; b.setAttribute("aria-label", "卡片");
      var front = c.f.img ? '<img alt="" src="' + encodeURI(c.f.img) + '">' : c.f.emoji;
      b.innerHTML = '<div class="mcard-inner"><div class="mface back">💗</div><div class="mface front">' + front + "</div></div>";
      if (c.f.img) { var im = b.querySelector("img"); im.onerror = function () { im.parentNode.textContent = EMOJIS[c.key]; }; }
      b.addEventListener("click", function () { flip(b); });
      grid.appendChild(b);
    });
  }
  function flip(b) {
    if (lock || b === first || b.classList.contains("matched") || b.classList.contains("flipped")) return;
    b.classList.add("flipped");
    if (!first) { first = b; return; }
    moves++; $("#mem-moves").textContent = moves;
    var a = first; first = null;
    if (a.dataset.key === b.dataset.key) {
      a.classList.add("matched"); b.classList.add("matched");
      pairs++; $("#mem-pairs").textContent = pairs;
      if (pairs === 6) setTimeout(function () {
        confetti(160); markDone("memory");
        modal({ emoji: "🎉", title: "全部配對成功！", text: "只用了 " + moves + " 步就全部找到了！每一張都是我們的回憶 💕", ok: "再玩一次", onOk: buildMemory, alt: true });
      }, 700);
    } else {
      lock = true;
      setTimeout(function () { a.classList.remove("flipped"); b.classList.remove("flipped"); lock = false; }, 850);
    }
  }
  $("#mem-restart").addEventListener("click", buildMemory);
  inits.memory = buildMemory;

  /* ========== 4. 刮刮樂 ========== */
  function buildScratch() {
    var S = C.scratch || {}, list = $("#scratch-list"), coupons = S.coupons || [], revealed = 0;
    list.innerHTML = "";
    coupons.forEach(function (cp, idx) {
      var card = document.createElement("div");
      card.className = "scratch-card";
      card.innerHTML = '<div class="coupon"><span class="coupon-icon"></span><div><small>應許券 No.' + (idx + 1) +
        '</small><p></p></div></div><canvas></canvas>';
      card.querySelector(".coupon-icon").textContent = cp.icon || "🎟️";
      card.querySelector("p").textContent = cp.text || "";
      list.appendChild(card);
      var cv = card.querySelector("canvas"), ctx = cv.getContext("2d"), dpr = devicePixelRatio || 1;
      var w = card.clientWidth, h = card.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr; ctx.scale(dpr, dpr);
      var g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#f7c6d4"); g.addColorStop(0.5, "#fde2e8"); g.addColorStop(1, "#f4b3c6");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(255,255,255,.55)";
      for (var k = 0; k < 40; k++) { ctx.beginPath(); ctx.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 0, 7); ctx.fill(); }
      ctx.fillStyle = "#d94673"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = "700 20px 'Zen Maru Gothic', sans-serif"; ctx.fillText("✨ 刮刮看 ✨", w / 2, h / 2 - 8);
      ctx.font = "13px 'Zen Maru Gothic', sans-serif"; ctx.fillText("用手指刮開這裡", w / 2, h / 2 + 16);
      ctx.globalCompositeOperation = "destination-out"; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = 34;
      var down = false, last = null, strokes = 0, finished = false;
      function pos(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
      function check() {
        var d = ctx.getImageData(0, 0, cv.width, cv.height).data, clear = 0, tot = 0;
        for (var i = 3; i < d.length; i += 64) { tot++; if (d[i] < 50) clear++; }
        if (clear / tot > 0.5) finish();
      }
      function finish() {
        if (finished) return; finished = true;
        cv.classList.add("gone"); card.classList.add("revealed"); revealed++;
        confetti(60);
        if (revealed === coupons.length) setTimeout(function () {
          markDone("scratch"); confetti(180);
          modal({ emoji: "🎟️", title: "全部刮開了！", text: S.finishMessage, alt: true });
        }, 700);
      }
      cv.addEventListener("pointerdown", function (e) { down = true; last = pos(e); cv.setPointerCapture && cv.setPointerCapture(e.pointerId); });
      cv.addEventListener("pointermove", function (e) {
        if (!down || finished) return;
        var p = pos(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p;
        if (++strokes % 8 === 0) check();
      });
      ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) { cv.addEventListener(ev, function () { if (down) { down = false; check(); } }); });
    });
  }
  inits.scratch = buildScratch;

  /* ========== 5. 拼圖 ========== */
  var puzzle = (function () {
    var P = C.puzzle || {}, N = 3, board = $("#puzzle"), state = [], pmoves = 0, solvedFlag = false, tiles = [];
    var img = P.image || "";
    var FALLBACK = ["💗", "🐱", "🌸", "🍓", "🧸", "🎈", "🍰", "🌙", ""];
    function render() {
      state.forEach(function (n, pos) {
        var t = tiles[n]; t.style.transform = "translate(" + (pos % N) * 100 + "%," + Math.floor(pos / N) * 100 + "%)";
      });
    }
    function build() {
      board.innerHTML = ""; tiles = [];
      board.classList.toggle("has-img", !!img);
      if (img) board.style.setProperty("--puz-img", "url('" + encodeURI(img) + "')");
      for (var n = 0; n < N * N; n++) {
        var t = document.createElement("button");
        t.className = "ptile" + (n === N * N - 1 ? " empty" : ""); t.dataset.n = n;
        var bgpos = (n % N) * 50 + "% " + Math.floor(n / N) * 50 + "%";
        if (img) { t.style.backgroundImage = "url('" + encodeURI(img) + "')"; t.style.backgroundPosition = bgpos; }
        else { t.style.backgroundPosition = bgpos; t.innerHTML = "<span>" + FALLBACK[n] + "</span><i>" + (n + 1) + "</i>"; }
        (function (n) { t.addEventListener("click", function () { tap(n); }); })(n);
        board.appendChild(t); tiles.push(t);
      }
    }
    function neighbors(e) {
      var r = Math.floor(e / N), c = e % N, out = [];
      if (r > 0) out.push(e - N); if (r < N - 1) out.push(e + N); if (c > 0) out.push(e - 1); if (c < N - 1) out.push(e + 1);
      return out;
    }
    function isSolved() { for (var i = 0; i < state.length; i++) if (state[i] !== i) return false; return true; }
    function scramble() {
      state = []; for (var i = 0; i < N * N; i++) state.push(i);
      var e = N * N - 1, prev = -1;
      for (var k = 0; k < 80 || isSolved(); k++) {
        var nb = neighbors(e).filter(function (x) { return x !== prev; }), m = pick(nb);
        state[e] = state[m]; state[m] = N * N - 1; prev = e; e = m;
      }
      pmoves = 0; solvedFlag = false; $("#puz-moves").textContent = 0;
      board.classList.remove("solved"); render();
    }
    function tap(n) {
      if (solvedFlag) return;
      var pos = state.indexOf(n), e = state.indexOf(N * N - 1);
      if (neighbors(e).indexOf(pos) < 0) { tiles[n].classList.remove("nope"); void tiles[n].offsetWidth; tiles[n].classList.add("nope"); return; }
      state[e] = n; state[pos] = N * N - 1; pmoves++; $("#puz-moves").textContent = pmoves; render();
      if (isSolved()) {
        solvedFlag = true; board.classList.add("solved");
        setTimeout(function () {
          confetti(200); markDone("puzzle");
          modal({ emoji: "🧩", title: "拼好了！只用 " + pmoves + " 步", text: P.finishMessage, ok: "再玩一次", onOk: scramble, alt: true });
        }, 700);
      }
    }
    $("#puz-restart").addEventListener("click", scramble);
    $("#puz-peek").addEventListener("click", function () {
      board.classList.add("peek"); setTimeout(function () { board.classList.remove("peek"); }, 1500);
    });
    inits.puzzle = function () { build(); scramble(); };
    return { state: function () { return state.slice(); }, tap: tap };
  })();
  window.__puzzle = puzzle; // 測試用

  /* ========== 6. 情話拼字 ========== */
  (function () {
    var Wc = C.words || {}, rounds = Wc.rounds || [], ri = 0, filled = 0, chars = [];
    var DECOY = "愛心甜蜜寶貝喜歡永遠抱抱親吻星月花糖笑暖";
    function showRound() {
      var r = rounds[ri]; chars = Array.from(r.phrase || ""); filled = 0;
      $("#words-count").textContent = "第 " + (ri + 1) + " 句 / 共 " + rounds.length + " 句";
      $("#words-hint").textContent = "💡 " + (r.hint || "");
      var slots = $("#words-slots"); slots.innerHTML = ""; slots.classList.remove("complete");
      chars.forEach(function () { var s = document.createElement("span"); s.className = "slot"; slots.appendChild(s); });
      var decoys = shuffle(Array.from(DECOY).filter(function (c) { return chars.indexOf(c) < 0; })).slice(0, Math.min(4, Math.max(2, 8 - chars.length)));
      var pool = $("#words-pool"); pool.innerHTML = "";
      shuffle(chars.concat(decoys)).forEach(function (c) {
        var b = document.createElement("button"); b.className = "wtile"; b.textContent = c;
        b.addEventListener("click", function () { tapChar(b); });
        pool.appendChild(b);
      });
    }
    function tapChar(b) {
      if (b.disabled || filled >= chars.length) return;
      if (b.textContent !== chars[filled]) {
        b.classList.remove("nope"); void b.offsetWidth; b.classList.add("nope");
        toast(pick(["不是這個字喔 🙈", "再想想～ 🤔", "差一點點！"])); return;
      }
      b.disabled = true; b.classList.add("used");
      var slot = $$("#words-slots .slot")[filled]; slot.textContent = b.textContent; slot.classList.add("filled");
      filled++;
      if (filled === chars.length) {
        $("#words-slots").classList.add("complete"); confetti(50);
        setTimeout(function () {
          ri++;
          if (ri < rounds.length) return showRound();
          markDone("words"); confetti(200);
          modal({ emoji: "💬", title: "全部拼出來了！", text: Wc.finishMessage, ok: "再玩一次", onOk: function () { ri = 0; showRound(); }, alt: true });
        }, 1000);
      }
    }
    $("#words-undo").addEventListener("click", function () {
      if (filled === 0 || filled === chars.length) return;
      filled--; var slot = $$("#words-slots .slot")[filled], ch = slot.textContent;
      slot.textContent = ""; slot.classList.remove("filled");
      var used = $$("#words-pool .wtile.used").filter(function (t) { return t.textContent === ch; });
      if (used.length) { var t = used[used.length - 1]; t.disabled = false; t.classList.remove("used"); }
    });
    if (rounds.length) showRound();
  })();

  /* ========== 7. 吹蠟燭 ========== */
  var nCandles = Math.min(10, Math.max(1, C.candles || 5)), litCount = 0, wished = false;
  var micOn = false, stream = null, actx = null, micRaf = 0;
  function buildCandles() {
    var box = $("#candles"); box.innerHTML = ""; litCount = nCandles; wished = false;
    for (var i = 0; i < nCandles; i++) {
      var c = document.createElement("button");
      c.className = "candle"; c.setAttribute("aria-label", "蠟燭");
      c.style.height = (40 + (i % 2) * 8) + "px";
      c.innerHTML = '<span class="flame"></span><span class="candle-hit"></span>';
      c.addEventListener("click", function () { blowOut(this); });
      box.appendChild(c);
    }
    $("#cake-hint").textContent = micOn ? "對著手機用力吹氣 🌬️" : "點一下蠟燭就能吹熄 🕯️";
  }
  function blowOut(c) {
    if (!c || c.classList.contains("out")) return;
    c.classList.add("out"); litCount--;
    var s = document.createElement("span"); s.className = "smoke"; c.appendChild(s);
    setTimeout(function () { s.remove(); }, 1300);
    if (litCount === 0 && !wished) {
      wished = true; stopMic();
      $("#cake-hint").textContent = "願望一定會實現的 ✨";
      setTimeout(function () {
        markDone("cake");
        modal({ emoji: "✨", title: (C.wish && C.wish.title) || "生日快樂！", text: (C.wish && C.wish.message) || "", alt: true });
        confetti(220); setTimeout(function () { confetti(120); }, 700);
      }, 600);
    }
  }
  $("#cake-reset").addEventListener("click", buildCandles);
  function stopMic() {
    micOn = false; cancelAnimationFrame(micRaf);
    if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
    if (actx) actx.close().catch(function () {});
    stream = null; actx = null;
    $("#mic-btn").classList.remove("listening"); $("#mic-btn").textContent = "🎤 用麥克風吹蠟燭";
  }
  $("#mic-btn").addEventListener("click", function () {
    if (micOn) { stopMic(); $("#cake-hint").textContent = "點一下蠟燭就能吹熄 🕯️"; return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      $("#cake-hint").textContent = "這個瀏覽器不支援麥克風，用手指點蠟燭吧 👆"; return;
    }
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } }).then(function (s) {
      stream = s; micOn = true;
      var AC = window.AudioContext || window.webkitAudioContext;
      actx = new AC();
      var src = actx.createMediaStreamSource(s), an = actx.createAnalyser();
      an.fftSize = 1024; src.connect(an);
      var data = new Uint8Array(an.frequencyBinCount), loud = 0, last = 0;
      $("#mic-btn").classList.add("listening"); $("#mic-btn").textContent = "🌬️ 聆聽中…（點我停止）";
      $("#cake-hint").textContent = "對著手機麥克風用力吹氣 🌬️";
      (function loop(t) {
        if (!micOn) return;
        an.getByteFrequencyData(data);
        var sum = 0, n = Math.floor(data.length * 0.25);
        for (var i = 1; i < n; i++) sum += data[i];
        loud = sum / n > 110 ? loud + 1 : Math.max(0, loud - 1);
        if (loud > 6 && t - last > 220) {
          last = t;
          var lit = $$(".candle:not(.out)");
          if (lit.length) blowOut(lit[(Math.random() * lit.length) | 0]);
        }
        micRaf = requestAnimationFrame(loop);
      })(0);
    }).catch(function () {
      stopMic();
      $("#cake-hint").textContent = "沒有麥克風權限也沒關係，用手指點蠟燭吹熄吧 👆";
    });
  });
  buildCandles();

  /* ---------- start ---------- */
  tick(); setInterval(tick, 1000);
  go(location.hash.slice(1) || "home", false);
})();
