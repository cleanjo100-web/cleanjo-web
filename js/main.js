(function(){
  var root = document.documentElement;
  var body = document.body;
  var PAGE = body.dataset.page;
  var SITE = window.SITE || {};
  var motion = root.classList.contains('js');
  var $ = function(s, c){ return (c || document).querySelector(s); };
  var $$ = function(s, c){ return [].slice.call((c || document).querySelectorAll(s)); };
  var SVC = ['입주청소, 이사청소','거주청소','사무실청소','상가청소','준공청소','줄눈','탄성코트'];

  /* 연락처 링크: config.js 값으로 채움 */
  var telNum = (SITE.tel || '').replace(/[^\d+]/g, '');
  $$('[data-link="tel"]').forEach(function(a){ if (telNum) a.href = 'tel:' + telNum; });
  $$('[data-link="soomgo"]').forEach(function(a){ if (SITE.soomgo) { a.href = SITE.soomgo; a.target = '_blank'; } else a.hidden = true; });
  $$('[data-link="kakao"]').forEach(function(a){
    if (SITE.kakao) { a.href = SITE.kakao; a.target = '_blank'; a.rel = 'noopener'; }
    else a.hidden = true;
  });

  /* 현재 메뉴 표시 */
  $$('[data-nav]').forEach(function(a){ if (a.dataset.nav === PAGE) a.setAttribute('aria-current', 'page'); });

  /* 하단 버튼: 지금 보는 서비스로 견적 */
  var dockQuote = $('#dockQuote');
  function setDock(){ if (!dockQuote) return; var s = body.dataset.svc; dockQuote.href = s ? 'quote.html?svc=' + s : 'quote.html'; }
  setDock();

  /* 탭 */
  var tabSelect = {};
  $$('[role="tablist"]').forEach(function(list){
    var tabs = $$('[role="tab"]', list);
    function select(t, focus){
      tabs.forEach(function(x){
        var on = x === t, p = document.getElementById(x.getAttribute('aria-controls'));
        x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1;
        if (on) { p.hidden = false; if (motion) { p.classList.remove('enter'); void p.offsetWidth; p.classList.add('enter'); } }
        else p.hidden = true;
      });
      if (focus) t.focus();
      if (list.scrollWidth > list.clientWidth) list.scrollTo({left: Math.max(0, t.offsetLeft - list.offsetLeft - 20), behavior: motion ? 'smooth' : 'auto'});
      var sp = document.getElementById(t.getAttribute('aria-controls'));
      if (sp && sp.dataset.svc) { body.dataset.svc = sp.dataset.svc; setDock(); }
    }
    tabs.forEach(function(t, i){
      tabSelect[t.id] = function(){ select(t); };
      t.addEventListener('click', function(){ select(t); });
      t.addEventListener('keydown', function(e){
        var n = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (n) { e.preventDefault(); select(tabs[(i + n + tabs.length) % tabs.length], true); }
      });
    });
  });
  /* 청소 종류 탭을 고르면 '이 순서로 청소해요'도 같은 종류로 (입주·거주·사무실·상가·준공) */
  $$('#svc [role="tab"]').forEach(function(t, i){ t.addEventListener('click', function(){ if (tabSelect['cft' + (i + 1)]) tabSelect['cft' + (i + 1)](); }); });
  /* clean.html#s3 처럼 들어오면 해당 청소 종류를 엶 */
  function openFromHash(){
    var m = location.hash.match(/^#(s\d)$/);
    if (m && tabSelect[m[1]]) { tabSelect[m[1]](); if (tabSelect['cft' + m[1].slice(1)]) tabSelect['cft' + m[1].slice(1)](); var svc = $('#svc'); if (svc) setTimeout(function(){ svc.scrollIntoView(); }, 30); }
  }
  openFromHash(); window.addEventListener('hashchange', openFromHash);

  /* 줄눈 재료 도우미 */
  var ans = $('#ans');
  if (ans) {
    var ANS = {
      1: {pick:'폴리아스파틱 우레아', why:'약 7시간이면 굳어서 시공한 날 욕실을 쓸 수 있어요.', as:'A/S 2년'},
      2: {pick:'폴리아스파틱 우레아', why:'에폭시는 4~5일 굳혀야 해서 일정이 빠듯해요. 빨리 굳는 재료가 맞아요.', as:'A/S 2년'},
      3: {pick:'둘 다 괜찮아요', why:'은은하게 반짝이는 마감은 폴리아스파틱, 광 없는 차분한 마감은 에폭시.', as:'A/S 폴리아스파틱 2년, 에폭시 3년'}
    };
    var opts = $$('.opt');
    opts.forEach(function(o, i){
      function pick(){
        opts.forEach(function(x){ x.setAttribute('aria-checked', x === o); x.tabIndex = x === o ? 0 : -1; });
        var a = ANS[o.dataset.a];
        ans.innerHTML = '<p class="pick">' + a.pick + '</p><p class="why">' + a.why + '</p><span class="as2">' + a.as + '</span>';
        if (motion) { ans.classList.remove('enter'); void ans.offsetWidth; ans.classList.add('enter'); }
      }
      o.addEventListener('click', pick);
      o.addEventListener('keydown', function(e){
        var n = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 0;
        if (n) { e.preventDefault(); var t = opts[(i + n + opts.length) % opts.length]; t.focus(); t.click(); }
      });
    });
  }

  /* 메뉴 드로어 */
  var drawer = $('#drawer'), menuBtn = $('#menuBtn');
  if (drawer && menuBtn) {
    var sheet = $('.sheet', drawer);
    var openMenu = function(){
      drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false');
      menuBtn.setAttribute('aria-expanded', 'true'); body.classList.add('lock');
      setTimeout(function(){ $('.close', drawer).focus(); }, 30);
    };
    var closeMenu = function(back){
      drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true');
      menuBtn.setAttribute('aria-expanded', 'false'); body.classList.remove('lock');
      if (back) menuBtn.focus();
    };
    menuBtn.addEventListener('click', openMenu);
    $$('[data-close]', drawer).forEach(function(x){ x.addEventListener('click', function(){ closeMenu(true); }); });
    $$('a', drawer).forEach(function(a){ a.addEventListener('click', function(){ closeMenu(false); }); });
    $$('.tog', drawer).forEach(function(b){
      b.addEventListener('click', function(){
        var on = b.getAttribute('aria-expanded') !== 'true';
        b.setAttribute('aria-expanded', on); document.getElementById(b.getAttribute('aria-controls')).hidden = !on;
      });
    });
    document.addEventListener('keydown', function(e){
      if (!drawer.classList.contains('open')) return;
      if (e.key === 'Escape') closeMenu(true);
      if (e.key === 'Tab') {
        var f = $$('a,button', sheet).filter(function(x){ return x.offsetParent !== null; });
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
  }

  /* 머리 그림자 */
  var hd = $('#hd');
  window.addEventListener('scroll', function(){ hd.classList.toggle('scrolled', scrollY > 8); }, {passive:true});

  /* ---------------- 견적 신청 ---------------- */
  var form = $('#qform');
  if (form) initQuote();
  function initQuote(){
    var m = location.search.match(/svc=(\d)/);
    if (m) $$('input[name="svc"]').forEach(function(c){ if (c.value === SVC[m[1] - 1]) c.checked = true; });

    var msg = $('#formMsg');
    if (!SITE.quoteEndpoint) msg.textContent = '아직 접수 주소가 연결되지 않아 실제로 보내지지 않습니다. (js/config.js의 quoteEndpoint)';

    var step = 1;
    var reqs = {1:['svc','area','town'], 2:['kind','size'], 3:['name','tel','agree']};
    function valid(k){
      if (k === 'svc') return $$('input[name="svc"]:checked').length > 0;
      if (k === 'area') return !!$('input[name="area"]:checked');
      if (k === 'town') return $('#town').value.trim().length > 1;
      if (k === 'kind') return !!$('#kind').value;
      if (k === 'size') return /^\d{1,4}$/.test($('#size').value.trim());
      if (k === 'name') return $('#name').value.trim().length > 0;
      if (k === 'tel') return /^01\d-?\d{3,4}-?\d{4}$/.test($('#tel').value.trim());
      if (k === 'agree') return $('#agree').checked;
      return true;
    }
    function check(n){
      var first = null;
      reqs[n].forEach(function(k){ var f = $('[data-req="' + k + '"]'), ok = valid(k); f.classList.toggle('invalid', !ok); if (!ok && !first) first = f; });
      if (first) { var inp = $('input,select,textarea', first); if (inp) inp.focus(); }
      return !first;
    }
    ['change','input'].forEach(function(ev){
      form.addEventListener(ev, function(e){ var f = e.target.closest('[data-req]'); if (f && f.classList.contains('invalid') && valid(f.dataset.req)) f.classList.remove('invalid'); });
    });
    function stepTo(n){
      step = n;
      [1,2,3].forEach(function(i){
        $('#f' + i).hidden = i !== n;
        var s = $('#st' + i); s.classList.toggle('now', i === n); s.classList.toggle('done', i < n);
        if (i === n) s.setAttribute('aria-current', 'step'); else s.removeAttribute('aria-current');
      });
      $('#prev').hidden = n === 1; $('#next').hidden = n === 3; $('#send').hidden = n !== 3;
      $('.steps').scrollIntoView({behavior: motion ? 'smooth' : 'auto', block:'center'});
    }
    $('#next').addEventListener('click', function(){ if (check(step)) stepTo(step + 1); });
    $('#prev').addEventListener('click', function(){ stepTo(step - 1); });

    if (!SITE.quoteEndpoint) { form.hidden = true; var st = $('.steps'); if (st) st.hidden = true; var qo = $('#qoff'); if (qo) qo.hidden = false; }
    var photos = $('#photos'), max = SITE.maxPhotos || 6;
    if (photos) photos.addEventListener('change', function(){
      var n = this.files.length;
      $('#pcnt').textContent = !n ? '고른 사진 없음' : n > max ? '사진은 ' + max + '장까지 보낼 수 있어요. 앞의 ' + max + '장만 보낼게요.' : '사진 ' + n + '장 골랐어요';
    });

    /* 사진을 줄여서 base64로 */
    function shrink(file){
      return new Promise(function(res){
        var img = new Image(), url = URL.createObjectURL(file);
        img.onload = function(){
          var side = SITE.photoMaxSide || 1600, k = Math.min(1, side / Math.max(img.width, img.height));
          var c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
          res({name: file.name.replace(/\.\w+$/, '') + '.jpg', type: 'image/jpeg', data: c.toDataURL('image/jpeg', .82).split(',')[1]});
        };
        img.onerror = function(){ URL.revokeObjectURL(url); res(null); };
        img.src = url;
      });
    }

    function done(){ form.hidden = true; $('.steps').hidden = true; var d = $('#done'); d.hidden = false; d.focus(); }
    form.addEventListener('submit', function(e){
      e.preventDefault();
      if (!check(3)) return;
      var b = $('#send'), lbl = $('.lbl', b);
      b.classList.add('loading'); b.setAttribute('aria-busy', 'true'); lbl.textContent = '보내는 중';
      msg.classList.remove('err-msg');
      if (!SITE.quoteEndpoint) { setTimeout(done, 700); return; }
      var fd = new FormData(form), data = {};
      ['area','town','kind','size','date','name','tel','memo','website'].forEach(function(k){ data[k] = (fd.get(k) || '').toString().trim(); });
      data.svc = fd.getAll('svc').join(', ');
      data.page = location.href;
      var files = photos ? [].slice.call(photos.files, 0, max) : [];
      Promise.all(files.map(shrink)).then(function(list){
        data.photos = list.filter(Boolean);
        /* text/plain 으로 보내야 Apps Script가 사전 요청 없이 받음 */
        return fetch(SITE.quoteEndpoint, {method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body: JSON.stringify(data)});
      }).then(function(r){ return r.json(); }).then(function(j){
        if (!j || !j.ok) throw new Error(j && j.error || 'fail');
        done();
      }).catch(function(){
        b.classList.remove('loading'); b.removeAttribute('aria-busy'); lbl.textContent = '견적 요청 보내기';
        msg.classList.add('err-msg');
        msg.textContent = '보내지 못했어요. 잠시 뒤 다시 눌러 주시거나 전화, 카톡으로 연락 주세요.';
      });
    });
  }

  /* ---------------- 움직임 ---------------- */
  var pin = $('.page-in');
  if (pin && motion) requestAnimationFrame(function(){ requestAnimationFrame(function(){ pin.classList.add('is-in'); }); });

  /* 첫 화면: 제목이 아래에서 올라오고 사진이 차례로 */
  var hero = $('#hero');
  if (hero && motion) requestAnimationFrame(function(){ requestAnimationFrame(function(){ hero.classList.add('is-in'); }); });

  /* 벤토: 화면에 들어오면 한 번 */
  var bento = $('#bento');
  if (bento && motion) {
    if (!('IntersectionObserver' in window)) bento.classList.add('in');
    else { var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting) { bento.classList.add('in'); io.disconnect(); } }); }, {threshold:.15}); io.observe(bento); }
  }

  /* 메인의 #space, #way 로 들어오면 부드럽게 */
  if (location.hash && PAGE === 'main') { var t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(function(){ t.scrollIntoView(); }, 40); }

  if (!motion) return;
  /* 사진 시차, 문장 진해지기 */
  var par = $$('[data-speed]'), scr = $$('.scrub'), ticking = false;
  function frame(){
    ticking = false;
    var vh = innerHeight;
    par.forEach(function(img){
      var r = img.parentNode.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh || !r.height) return;
      var lim = r.height * 0.075;
      var y = -((r.top + r.height / 2 - vh / 2) / vh) * r.height * parseFloat(img.dataset.speed) * 2;
      img.style.transform = 'translate3d(0,' + Math.max(-lim, Math.min(lim, y)).toFixed(1) + 'px,0)';
    });
    scr.forEach(function(el){
      var r = el.getBoundingClientRect(); if (!r.height) return;
      var p = Math.max(0, Math.min(1, (vh * 0.92 - r.top) / (vh * 0.42)));
      el.style.opacity = (0.12 + 0.88 * p).toFixed(3);
      el.style.transform = p >= 1 ? 'none' : 'translate3d(0,' + ((1 - p) * 28).toFixed(1) + 'px,0)';
    });
  }
  function onScroll(){ if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', onScroll, {passive:true});
  window.addEventListener('resize', onScroll);
  frame();
})();

/* ===== 통합안 추가: 측정 · 전화번호/영업시간 표시 · 전후 슬라이더 · FAQ · 사례 거르기 ===== */
(function(){
  var $ = function(s, c){ return (c || document).querySelector(s); };
  var $$ = function(s, c){ return [].slice.call((c || document).querySelectorAll(s)); };
  var SITE = window.SITE || {}, PAGE = document.body.dataset.page;

  /* 측정: GA4(gtag)나 구글 태그 관리자(dataLayer)를 붙이면 그대로 쌓입니다 */
  window.dataLayer = window.dataLayer || [];
  function track(name, params){
    params = params || {}; params.page = PAGE;
    window.dataLayer.push(Object.assign({event: name}, params));
    if (typeof window.gtag === 'function') window.gtag('event', name, params);
  }
  window.cjTrack = track;
  document.addEventListener('click', function(e){
    var a = e.target.closest('[data-track]');
    if (a) track(a.dataset.track, {location: a.dataset.trackLoc || ''});
  });
  var qf = $('#qform');
  if (qf) {
    var started = false, sent = false;
    qf.addEventListener('input', function(){ if (!started) { started = true; track('form_start', {}); } });
    var nx = $('#next'); if (nx) nx.addEventListener('click', function(){ setTimeout(function(){ var n = $$('.steps li.now')[0]; if (n) track('form_step', {step: n.id.replace('st', '')}); }, 0); });
    var done = $('#done');
    if (done && 'MutationObserver' in window) new MutationObserver(function(){ if (!done.hidden && !sent) { sent = true; track('form_submit', {}); } }).observe(done, {attributes: true});
    window.addEventListener('pagehide', function(){ if (started && !sent) { var n = $$('.steps li.now')[0]; track('form_abandon', {step: n ? n.id.replace('st', '') : ''}); } });
  }

  /* 전화번호·영업시간 글자 */
  $$('[data-tel-text]').forEach(function(el){ if (SITE.tel) el.textContent = SITE.tel; });
  $$('[data-hours]').forEach(function(el){ if (SITE.hours) el.textContent = SITE.hours; });

  /* 시공 전·후 비교 슬라이더 (드래그 + 키보드 좌우) */
  $$('[data-cmp]').forEach(function(box){
    var r = $('input', box);
    var set = function(){ box.style.setProperty('--pos', r.value + '%'); };
    r.addEventListener('input', set); set();
    r.addEventListener('change', function(){ track('before_after_use', {}); }, {once: true});
  });

  /* FAQ: 한 번에 하나만 열림 */
  $$('.faq').forEach(function(box){
    var ds = $$('details', box);
    ds.forEach(function(d){
      d.addEventListener('toggle', function(){
        if (d.open) { ds.forEach(function(x){ if (x !== d) x.open = false; }); track('faq_open', {q: $('summary', d).textContent}); }
      });
    });
  });

  /* 시공 사례 거르기 */
  var f = $('[data-filter]');
  if (f) {
    var bs = $$('button', f), cs = $$('[data-cases] > [data-cat]');
    bs.forEach(function(b){
      b.addEventListener('click', function(){
        bs.forEach(function(x){ x.setAttribute('aria-pressed', x === b); });
        cs.forEach(function(c){ c.hidden = !(b.dataset.f === 'all' || c.dataset.cat === b.dataset.f); });
      });
    });
  }
})();

/* ===== 브랜드 영상: 화면 폭에 맞는 파일만 연결 (넓은 화면 16:9, 좁은 화면 1:1) ===== */
(function(){
  var narrow = window.matchMedia && matchMedia('(max-width: 639px)').matches;
  [].forEach.call(document.querySelectorAll('video[data-film]'), function(v){
    var b = v.getAttribute('data-film') + (narrow ? '-sq' : '-wide');
    v.poster = b + '.jpg';
    v.innerHTML = '<source src="' + b + '.mp4" type="video/mp4"><source src="' + b + '.webm" type="video/webm">';
  });
})();

/* ===== 작업 영상: 화면에 보이면 소리 없이 재생, 누르면 멈춤 · 사례 더 보기 ===== */
(function(){
  var $$ = function(s, c){ return [].slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var vids = $$('.vid');
  vids.forEach(function(f){
    var v = f.querySelector('video'), b = f.querySelector('.vplay');
    v.addEventListener('play', function(){ f.classList.add('playing'); });
    v.addEventListener('pause', function(){ f.classList.remove('playing'); });
    b.addEventListener('click', function(){
      f.dataset.user = '1';
      if (v.paused) { v.play(); if (window.cjTrack) window.cjTrack('video_play', {clip: (v.currentSrc || '').split('/').pop()}); } else v.pause();
    });
  });
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){
        var f = e.target, v = f.querySelector('video');
        if (e.isIntersecting && e.intersectionRatio > .6 && !f.dataset.user) { v.preload = 'auto'; var p = v.play(); if (p && p.catch) p.catch(function(){}); }
        else if (!e.isIntersecting || e.intersectionRatio < .3) v.pause();
      });
    }, {threshold: [0, .3, .6, 1]});
    vids.forEach(function(f){ io.observe(f); });
  }
  /* 시공 사례: 처음엔 9개만, 거르기를 쓰면 해당 사례 모두 */
  var more = document.querySelector('[data-more]'), cases = $$('[data-cases] > .case');
  if (more && cases.length > 9) {
    var LIMIT = 9;
    cases.forEach(function(c, i){ if (i >= LIMIT) { c.hidden = true; c.dataset.extra = '1'; } });
    more.hidden = false;
    more.addEventListener('click', function(){ cases.forEach(function(c){ if (c.dataset.extra) { c.hidden = false; delete c.dataset.extra; } }); more.hidden = true; });
    $$('[data-filter] button').forEach(function(b){ b.addEventListener('click', function(){ more.hidden = true; cases.forEach(function(c){ delete c.dataset.extra; }); }); });
  }
})();
