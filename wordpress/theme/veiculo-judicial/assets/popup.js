// popup-intro.js — exibe o tutorial na primeira visita de um usuário logado
(function () {
  var overlay = document.getElementById('vj-popup-intro');
  if (!overlay) return;

  // Só exibe para usuários logados que ainda não viram
  if (!window.VJ || !VJ.logado) return;
  if (localStorage.getItem('vj_intro_visto')) return;

  overlay.removeAttribute('hidden');

  // ── Animação dos frames ──────────────────────────────────────────────
  var frames = Array.from(overlay.querySelectorAll('.vj-pp-frame'));
  var N = frames.length;
  var fills = [];
  var prog = overlay.querySelector('.vj-pp-prog');
  var ctr = overlay.querySelector('.vj-pp-n');

  for (var i = 0; i < N; i++) {
    var seg = document.createElement('div');
    seg.className = 'vj-pp-seg';
    var fill = document.createElement('div');
    fill.className = 'vj-pp-fill';
    seg.appendChild(fill);
    prog.appendChild(seg);
    fills.push(fill);
  }

  var DUR = [3400, 3200, 3600, 3600, 4000, 3800, 0];
  var cur = 0, timer = null;

  function goTo(idx) {
    if (idx < 0 || idx >= N) return;
    frames[cur].classList.remove('is-active');
    frames[cur].classList.add('is-exit');
    var exitIdx = cur;
    setTimeout(function () { frames[exitIdx].classList.remove('is-exit'); }, 350);

    fills.forEach(function (f, i) {
      f.style.transition = 'none';
      f.style.width = i < idx ? '100%' : '0%';
    });

    cur = idx;
    frames[cur].classList.add('is-active');
    if (ctr) ctr.textContent = (cur + 1) + ' / ' + N;

    clearTimeout(timer);
    var d = DUR[cur];
    if (d > 0) {
      requestAnimationFrame(function () {
        fills[cur].style.transition = 'width ' + d + 'ms linear';
        fills[cur].style.width = '100%';
      });
      timer = setTimeout(function () { goTo(cur + 1); }, d);
    } else {
      requestAnimationFrame(function () {
        fills[cur].style.transition = 'width 0.4s ease';
        fills[cur].style.width = '100%';
      });
    }
  }

  overlay.querySelector('.vj-pp-reel').addEventListener('click', function (e) {
    var x = e.clientX - this.getBoundingClientRect().left;
    x < this.offsetWidth * 0.3 ? goTo(cur - 1) : goTo(cur + 1);
  });

  goTo(0);

  // ── Fechar ────────────────────────────────────────────────────────────
  function fechar() {
    clearTimeout(timer);
    var cb = document.getElementById('vj-popup-entendi');
    if (cb && cb.checked) {
      try { localStorage.setItem('vj_intro_visto', '1'); } catch (_) {}
    }
    overlay.hidden = true;
  }

  document.getElementById('vj-popup-fechar').addEventListener('click', fechar);

  // Fechar ao clicar fora do reel
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) fechar();
  });

  // Fechar com Esc
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') fechar();
  }, { once: true });
})();
