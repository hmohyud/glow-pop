/* ─── LINE ICONS (Lucide) ─── */
if (window.lucide) lucide.createIcons();

/* ─── PRELOADER ─── */
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('preloader').classList.add('hidden');
    initAnimations();
  }, 1200);
});

/* ─── HERO LOLLIPOP CONSTELLATION (interactive) ─── */
const canvas = document.getElementById('lollipopCanvas');
const ctx = canvas.getContext('2d');
const hostEl = document.querySelector('.stats-section');
const nodeColors = ['#FF1493', '#FF69B4', '#FF87BE', '#E91E8C', '#FFB6D9'];
let cW = 0, cH = 0;

function resizeCanvas() {
  const host = hostEl || document.body;
  cW = host.clientWidth || window.innerWidth;
  cH = host.clientHeight || window.innerHeight;
  if (cW < 120) cW = window.innerWidth || 1200;
  if (cH < 120) cH = 360;
  canvas.width = cW;
  canvas.height = cH;
}

const nodes = [];
function makeNodes() {
  const count = window.innerWidth < 640 ? 9 : 16;
  nodes.length = 0;
  for (let i = 0; i < count; i++) {
    const dir = Math.random() * Math.PI * 2;
    const speed = 0.05 + Math.random() * 0.036;
    nodes.push({
      x: Math.random() * cW, y: Math.random() * cH,
      vx: Math.cos(dir) * speed, vy: Math.sin(dir) * speed,
      speed: speed,
      r: Math.random() * 5 + 4,
      color: nodeColors[Math.floor(Math.random() * nodeColors.length)],
      ang: Math.random() * Math.PI * 2
    });
  }
}

const mouse = { x: -999, y: -999, active: false };
if (hostEl) {
  hostEl.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.active = true;
  });
  hostEl.addEventListener('mouseleave', () => { mouse.active = false; mouse.x = mouse.y = -999; });
}

const FRICTION = 0.99; // added speed bleeds off so pops coast back to the slow drift

function animateCanvas() {
  ctx.clearRect(0, 0, cW, cH);
  ctx.globalAlpha = 1;
  nodes.forEach(n => {
    // cursor push accelerates the pops (repel) above their resting speed
    if (mouse.active) {
      const dx = n.x - mouse.x, dy = n.y - mouse.y, d = Math.hypot(dx, dy);
      if (d < 140 && d > 0.1) { const f = (1 - d / 140) * 0.8; n.vx += (dx / d) * f; n.vy += (dy / d) * f; }
    }
    n.vx *= FRICTION; n.vy *= FRICTION;
    // clamp to a sane maximum
    let sp = Math.hypot(n.vx, n.vy) || 1;
    if (sp > 16) { n.vx = (n.vx / sp) * 16; n.vy = (n.vy / sp) * 16; sp = 16; }
    // floor: never drop below the slow resting glide speed (keeps them drifting, never stalls)
    const minSp = n.speed;
    if (sp < minSp) { n.vx = (n.vx / sp) * minSp; n.vy = (n.vy / sp) * minSp; }
    // glide
    n.x += n.vx; n.y += n.vy; n.ang += 0.003;
    // bounce off edges
    if (n.x < n.r) { n.x = n.r; n.vx = Math.abs(n.vx); }
    if (n.x > cW - n.r) { n.x = cW - n.r; n.vx = -Math.abs(n.vx); }
    if (n.y < n.r) { n.y = n.r; n.vy = Math.abs(n.vy); }
    if (n.y > cH - n.r) { n.y = cH - n.r; n.vy = -Math.abs(n.vy); }
    ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(n.ang);
    ctx.strokeStyle = 'rgba(255,150,200,0.45)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, n.r); ctx.lineTo(0, n.r + n.r * 1.7); ctx.stroke();
    ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(0, 0, n.r, 0, Math.PI * 2); ctx.fillStyle = n.color; ctx.fill();
    ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(-n.r * 0.3, -n.r * 0.3, n.r * 0.28, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.restore(); ctx.globalAlpha = 1;
  });
  requestAnimationFrame(animateCanvas);
}
resizeCanvas();
makeNodes();
animateCanvas();
window.addEventListener('resize', () => { resizeCanvas(); });
window.addEventListener('load', () => { resizeCanvas(); makeNodes(); });

/* ─── NAVBAR SCROLL ─── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
});

/* ─── MOBILE MENU (radial fan-out) ─── */
const mobileToggle = document.getElementById('mobileToggle');
const navLinks = document.getElementById('navLinks');
const navBackdrop = document.getElementById('navBackdrop');
const navItems = navLinks ? [...navLinks.querySelectorAll('li a')] : [];

// Vertical menu: circles stacked down the right wall, labels to their left.
// Each item slides in from the right with a staggered cascade (pure CSS transforms).
function setStagger(reverse) {
  const n = navItems.length;
  navItems.forEach((a, i) => {
    const k = reverse ? (n - 1 - i) : i;
    a.style.setProperty('--d', (k * 55) + 'ms');
  });
}

function closeMenu() {
  navLinks.classList.remove('open');
  mobileToggle.classList.remove('active');
  document.body.classList.remove('menu-open');
  if (navBackdrop) navBackdrop.classList.remove('show');
  setStagger(true); // reverse cascade on the way out
}

if (mobileToggle && navLinks) {
  mobileToggle.addEventListener('click', () => {
    const opening = !navLinks.classList.contains('open');
    if (opening) setStagger(false);
    navLinks.classList.toggle('open', opening);
    mobileToggle.classList.toggle('active', opening);
    document.body.classList.toggle('menu-open', opening);
    if (navBackdrop) navBackdrop.classList.toggle('show', opening);
    if (!opening) setStagger(true);
  });
  navItems.forEach(a => a.addEventListener('click', closeMenu));
  if (navBackdrop) navBackdrop.addEventListener('click', closeMenu);
}

/* ─── SCROLL REVEAL (IntersectionObserver) ─── */
function initAnimations() {
  const reveals = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  reveals.forEach(el => observer.observe(el));

  initGSAP();
  initCounters();
  initStepsLine();
}

/* ─── GSAP ANIMATIONS ─── */
function initGSAP() {
  if (typeof gsap === 'undefined') {
    document.querySelectorAll('.gsap-hidden').forEach(el => el.classList.remove('gsap-hidden'));
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  gsap.utils.toArray('.ingredient-card').forEach((card, i) => {
    gsap.fromTo(card,
      { y: 60, opacity: 0 },
      { scrollTrigger: { trigger: card, start: 'top 85%', toggleActions: 'play none none none' },
        y: 0, opacity: 1, duration: 0.8, delay: i * 0.1,
        ease: 'back.out(1.5)' }
    );
  });

  gsap.utils.toArray('.step').forEach((step, i) => {
    gsap.from(step.querySelector('.step-circle'), {
      scrollTrigger: { trigger: step, start: 'top 80%', toggleActions: 'play none none none' },
      scale: 0, duration: 0.6, delay: i * 0.2,
      ease: 'back.out(2)',
      onComplete: () => step.classList.add('active')
    });
  });

  gsap.fromTo('.product-image-frame',
    { scale: 0.85, opacity: 0 },
    { scrollTrigger: { trigger: '.product-image-frame', start: 'top 80%' },
      scale: 1, opacity: 1, duration: 1, ease: 'power3.out' }
  );

  gsap.utils.toArray('.comparison-row').forEach((row, i) => {
    gsap.from(row, {
      scrollTrigger: { trigger: row, start: 'top 90%' },
      x: -30, opacity: 0, duration: 0.5, delay: i * 0.08,
      ease: 'power2.out'
    });
  });

  const floats = document.querySelectorAll('.hero-float-circle');
  floats.forEach((el, i) => {
    gsap.from(el, { scale: 0, opacity: 0, duration: 0.8, delay: 1.5 + i * 0.2, ease: 'back.out(2)' });
  });

  gsap.utils.toArray('.cta-circle').forEach((circle, i) => {
    gsap.to(circle, {
      scrollTrigger: { trigger: '.cta-section', start: 'top bottom', scrub: 1 },
      scale: 1.3, rotation: 30 * (i % 2 ? 1 : -1), duration: 1
    });
  });
}

/* ─── COUNTER ANIMATION ─── */
function initCounters() {
  const counters = document.querySelectorAll('.stat-number');
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.target);
        const suffix = el.dataset.suffix || '';
        const duration = 2000;
        const start = performance.now();
        function tick(now) {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 4);
          el.textContent = Math.floor(target * eased).toLocaleString() + suffix;
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        counterObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(c => counterObserver.observe(c));
}

/* ─── STEPS LINE FILL ─── */
function initStepsLine() {
  const lineFill = document.getElementById('stepsLineFill');
  if (!lineFill || typeof ScrollTrigger === 'undefined') return;
  ScrollTrigger.create({
    trigger: '.steps-container',
    start: 'top 70%',
    end: 'bottom 50%',
    onUpdate: (self) => { lineFill.style.width = (self.progress * 100) + '%'; }
  });
}

/* ─── FAQ ACCORDION ─── */
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.parentElement;
    const answer = item.querySelector('.faq-answer');
    const isActive = item.classList.contains('active');
    document.querySelectorAll('.faq-item.active').forEach(active => {
      active.classList.remove('active');
      active.querySelector('.faq-answer').style.maxHeight = '0';
    });
    if (!isActive) {
      item.classList.add('active');
      answer.style.maxHeight = answer.scrollHeight + 'px';
    }
  });
});

/* ─── MAGNETIC BUTTONS ─── */
document.querySelectorAll('.btn-primary, .btn-white').forEach(btn => {
  btn.addEventListener('mousemove', (e) => {
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = '';
  });
});

/* ─── RESIZE CANVAS ON CONTENT CHANGE ─── */
let resizeTimer;
new ResizeObserver(() => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(resizeCanvas, 200);
}).observe(document.body);

/* ─── SCROLL PROGRESS BAR ─── */
(function scrollProgress() {
  const bar = document.getElementById('scrollProgress');
  if (!bar) return;
  const onScroll = () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ─── BUTTON RIPPLE (on real clickable buttons only) ─── */
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement('span');
    ripple.className = 'btn-ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
});

/* ─── CONFETTI BURST on shop / CTA clicks ─── */
(function confetti() {
  const c = document.createElement('canvas');
  Object.assign(c.style, { position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '10050' });
  document.body.appendChild(c);
  const cx = c.getContext('2d');
  function size() { c.width = window.innerWidth; c.height = window.innerHeight; }
  size(); window.addEventListener('resize', size);
  const colors = ['#FF1493', '#FF69B4', '#19C3D0', '#FF8A3D', '#FFC400', '#34C77E', '#A855F7', '#ffffff'];
  let parts = [], running = false;
  function burst(x, y) {
    for (let i = 0; i < 48; i++) {
      const a = Math.random() * Math.PI * 2, sp = Math.random() * 7 + 3;
      parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 4, g: 0.16 + Math.random() * 0.1,
        s: Math.random() * 7 + 4, color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3, life: 1, rect: Math.random() < 0.5 });
    }
    if (!running) { running = true; requestAnimationFrame(loop); }
  }
  function loop() {
    cx.clearRect(0, 0, c.width, c.height);
    parts.forEach(p => {
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 0.012;
      cx.save(); cx.globalAlpha = Math.max(0, p.life); cx.translate(p.x, p.y); cx.rotate(p.rot); cx.fillStyle = p.color;
      if (p.rect) cx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
      else { cx.beginPath(); cx.arc(0, 0, p.s / 2, 0, Math.PI * 2); cx.fill(); }
      cx.restore();
    });
    parts = parts.filter(p => p.life > 0 && p.y < c.height + 40);
    if (parts.length) requestAnimationFrame(loop);
    else { running = false; cx.clearRect(0, 0, c.width, c.height); }
  }
  document.querySelectorAll('.btn-primary, .btn-white, .nav-cta').forEach(btn => {
    btn.addEventListener('click', (e) => burst(e.clientX, e.clientY));
  });
})();

/* ─── SCROLL PARALLAX (decorative hero circles) ─── */
(function parallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const items = [...document.querySelectorAll('.hero-bg-circle')].map((el, i) => ({ el, speed: (i + 1) * 0.05 }));
  if (!items.length) return;
  let ticking = false;
  function update() {
    const y = window.scrollY;
    items.forEach(it => { it.el.style.transform = `translateY(${(y * it.speed).toFixed(1)}px)`; });
    ticking = false;
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
})();
