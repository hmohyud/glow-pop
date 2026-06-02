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
  const hero = document.getElementById('hero');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => {
    // Hero (and anything already in the viewport on load) reveals immediately —
    // never wait for a scroll that may not happen on short viewports.
    if ((hero && hero.contains(el)) || isInViewport(el)) {
      el.classList.add('visible');
    } else {
      observer.observe(el);
    }
  });

  initGSAP();
  initCounters();
  initStepsLine();
}

function isInViewport(el) {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  return r.top < vh && r.bottom > 0;
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

/* ─── SECTION FX: aurora background, lollipop grid, contrast-invert title ─── */
(function sectionFX(){
  const RND=(a,b)=>a+Math.random()*(b-a);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;   // CSS hides the canvases and restores a plain readable title

  function onScreen(el,cb){ if(!('IntersectionObserver'in window)){cb(true);return;}
    new IntersectionObserver(es=>cb(es[0].isIntersecting),{threshold:0.02}).observe(el); }

  function setup(canvas){
    const ctx=canvas.getContext('2d'); let w=0,h=0,dpr=Math.min(window.devicePixelRatio||1,2);
    const host=canvas.closest('.fxhost')||canvas.parentElement;
    let dirty=true, changed=false;
    // Assigning canvas.width/height CLEARS the canvas, so apply() is called ONLY from inside the
    // rAF loop (via sync()) — never from the ResizeObserver. That keeps the clear and the redraw
    // in the SAME frame. Doing it in the observer cleared the canvas AFTER the frame had drawn
    // but BEFORE paint, blanking/fading the grid on every one of the ~40 height ticks an
    // accordion fires as it animates open/closed.
    function apply(){ const r=host.getBoundingClientRect();
      const nw=Math.max(1,Math.round(r.width)), nh=Math.max(1,Math.round(r.height)); const bw=nw*dpr, bh=nh*dpr;
      changed = (canvas.width!==bw || canvas.height!==bh);
      if(changed){ canvas.width=bw; canvas.height=bh; }
      ctx.setTransform(dpr,0,0,dpr,0,0); w=nw; h=nh; }
    apply();
    new ResizeObserver(()=>{dirty=true;}).observe(host);
    window.addEventListener('load',()=>{dirty=true;}); window.addEventListener('resize',()=>{dirty=true;});
    const mouse={x:-999,y:-999,inside:false};
    host.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();mouse.x=e.clientX-r.left;mouse.y=e.clientY-r.top;mouse.inside=true;});
    host.addEventListener('mouseleave',()=>{mouse.inside=false;mouse.x=mouse.y=-999;});
    // sync(): called at the top of each frame; applies a pending resize and returns true only
    // when the backing store actually changed, so callers can rebuild size-dependent caches.
    return {ctx,get w(){return w},get h(){return h},mouse,
      sync(){ if(!dirty) return false; dirty=false; apply(); return changed; }};
  }

  document.querySelectorAll('canvas[data-fx]').forEach(canvas=>{
    const fx=canvas.dataset.fx; const S=setup(canvas); let vis=true; onScreen(canvas,v=>vis=v);

    if(fx==='aurora'){
      const cols=['#FF1493','#FF69B4','#FFB6D9','#E91E8C','#ff5fae','#ff9ccb'];
      const homes=[[.15,.30],[.5,.18],[.85,.32],[.28,.78],[.72,.74],[.5,.55]];
      const orbs=homes.map((hh,i)=>({hx:hh[0],hy:hh[1],a:Math.random()*7,sp:RND(.0014,.0033),rx:RND(70,140),ry:RND(60,120),col:cols[i%cols.length]}));
      let px=0,py=0;
      if(canvas.hasAttribute('data-title-src')) window.__auroraCanvas=canvas;
      (function loop(){ if(vis){ S.sync(); const{ctx,w,h,mouse}=S; ctx.clearRect(0,0,w,h); ctx.globalCompositeOperation='lighter';
        const tx=mouse.inside?(mouse.x/w-.5):0, ty=mouse.inside?(mouse.y/h-.5):0; px+=(tx-px)*0.06; py+=(ty-py)*0.06;
        orbs.forEach((o,i)=>{ o.a+=o.sp;
          const cx=o.hx*w+Math.cos(o.a)*o.rx+px*40*(i%3+1), cy=o.hy*h+Math.sin(o.a*1.2)*o.ry+py*40*(i%3+1);
          const R=Math.max(w,h)*.42, g=ctx.createRadialGradient(cx,cy,0,cx,cy,R);
          g.addColorStop(0,o.col); g.addColorStop(1,'rgba(255,255,255,0)'); ctx.globalAlpha=.4; ctx.fillStyle=g;
          ctx.beginPath(); ctx.arc(cx,cy,R,0,7); ctx.fill(); });
        ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over'; }
        requestAnimationFrame(loop); })();
    }

    if(fx==='grid'){
      let pts=[]; function build(){ pts=[]; const gap=50; for(let x=gap/2;x<S.w;x+=gap)for(let y=gap/2;y<S.h;y+=gap)pts.push({x,y}); }
      const host=canvas.closest('.fxhost');
      const lineEls=[host.querySelector('.section-label'), host.querySelector('.section-title')].filter(Boolean);
      const padX=9,padY=7,fade=11;
      let boxes=[];
      // The point grid depends only on canvas SIZE, so it's rebuilt only on a real resize.
      // The heading clear-zone, however, must follow the heading's LIVE position: the title
      // slides up + fades as its scroll-reveal plays, and shifts again when the web-font swaps
      // in — so a one-time measurement would leave the zone in the wrong spot until the next
      // resize, which is why a row of pops used to snap into place only after an accordion was
      // toggled. Re-measuring every frame is cheap (two getBoundingClientRect reads) and the
      // heading does NOT move when an accordion expands below it, so it stays steady on toggle.
      function measureMask(){ const cr=canvas.getBoundingClientRect();
        boxes=lineEls.map(el=>{const r=el.getBoundingClientRect();return{x0:r.left-cr.left-padX,y0:r.top-cr.top-padY,x1:r.right-cr.left+padX,y1:r.bottom-cr.top+padY};}); }
      build(); measureMask();
      function alphaAt(px,py){ let a=1;
        for(const b of boxes){ const dx=Math.max(b.x0-px,0,px-b.x1), dy=Math.max(b.y0-py,0,py-b.y1); a=Math.min(a,Math.min(1,Math.hypot(dx,dy)/fade)); } return a; }
      // Apply any pending resize at the TOP of the frame (atomic with the redraw below); rebuild
      // the point grid only on a real size change, but re-measure the heading mask every frame.
      (function loop(){ if(vis){ if(S.sync()) build(); measureMask(); const{ctx,w,h,mouse}=S; ctx.clearRect(0,0,w,h);
        pts.forEach(p=>{ const a=alphaAt(p.x,p.y); if(a<=0.01)return;
          let sc=1; if(mouse.inside){const d=Math.hypot(p.x-mouse.x,p.y-mouse.y); if(d<120)sc=1+(1-d/120)*1.9;}
          const x=p.x,y=p.y,r=3.4*sc; ctx.globalAlpha=a;
          ctx.strokeStyle='rgba(255,135,190,.5)';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(x,y+r);ctx.lineTo(x,y+r+r*1.8);ctx.stroke();
          ctx.fillStyle='#FF1493';ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();
          ctx.fillStyle='rgba(255,255,255,.85)';ctx.beginPath();ctx.arc(x-r*.3,y-r*.3,r*.32,0,7);ctx.fill(); });
        ctx.globalAlpha=1; }
        requestAnimationFrame(loop); })();
    }
  });

  /* contrast-invert title, flicker-free (cached glyph mask + slow-eased fill) */
  document.querySelectorAll('[data-title-fx]').forEach(h2=>{
    const text=h2.getAttribute('data-title-fx');
    const cv=h2.querySelector('.title-fx'); if(!cv) return; const ctx=cv.getContext('2d');
    const dpr=Math.min(window.devicePixelRatio||1,2);
    const SW=64; const buf=document.createElement('canvas'); buf.width=SW; const bctx=buf.getContext('2d',{willReadFrequently:true});
    const DEEP=[122,27,77];
    let maskCv=null, fillCv=null, fillCtx=null, smooth=null, W0=0,H0=0, vis=true;
    onScreen(h2,v=>vis=v);
    function buildMask(w,h){
      maskCv=document.createElement('canvas'); maskCv.width=w*dpr; maskCv.height=h*dpr;
      const m=maskCv.getContext('2d'); m.setTransform(dpr,0,0,dpr,0,0);
      const cs=getComputedStyle(h2); m.font=cs.fontWeight+' '+parseFloat(cs.fontSize)+'px '+cs.fontFamily;
      m.textAlign='center'; m.textBaseline='middle'; m.fillStyle='#000'; m.fillText(text,w/2,h/2);
      fillCv=document.createElement('canvas'); fillCv.width=SW; fillCtx=fillCv.getContext('2d'); W0=w; H0=h;
    }
    function draw(){
      const src=window.__auroraCanvas; if(!src){requestAnimationFrame(draw);return;}
      const hr=h2.getBoundingClientRect(); const w=Math.max(1,Math.round(hr.width)),h=Math.max(1,Math.round(hr.height));
      if(cv.width!==w*dpr){cv.width=w*dpr;cv.height=h*dpr;}
      if(!maskCv||W0!==w||H0!==h) buildMask(w,h);
      ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,cv.width,cv.height);
      if(vis){
        const SH=Math.max(1,Math.round(SW*h/w)); if(buf.height!==SH){buf.height=SH;fillCv.height=SH;}
        const ar=src.getBoundingClientRect();
        const sx=(hr.left-ar.left)/ar.width*src.width, sy=(hr.top-ar.top)/ar.height*src.height, sw=hr.width/ar.width*src.width, sh=hr.height/ar.height*src.height;
        bctx.clearRect(0,0,SW,SH); bctx.fillStyle='#fff0f5'; bctx.fillRect(0,0,SW,SH);
        try{ bctx.drawImage(src,sx,sy,sw,sh,0,0,SW,SH); }catch(e){}
        const px=bctx.getImageData(0,0,SW,SH).data; const N=px.length/4;
        if(!smooth||smooth.length!==N) smooth=null;
        const fill=fillCtx.createImageData(SW,SH); const fd=fill.data; const raw=new Float32Array(N);
        for(let i=0,j=0;i<px.length;i+=4,j++){ const r=px[i],g=px[i+1],b=px[i+2];
          const lum=(0.299*r+0.587*g+0.114*b)/255, sat=(Math.max(r,g,b)-Math.min(r,g,b))/255; raw[j]=sat*1.6+(1-lum)*1.1; }
        if(!smooth){smooth=Float32Array.from(raw);}
        for(let j=0;j<N;j++) smooth[j]+=(raw[j]-smooth[j])*0.02;
        const TH=0.56, BAND=0.16;
        for(let i=0,j=0;i<px.length;i+=4,j++){ let t=(smooth[j]-(TH-BAND))/(2*BAND); t=Math.max(0,Math.min(1,t)); t=t*t*(3-2*t);
          fd[i]=Math.round(DEEP[0]+(255-DEEP[0])*t); fd[i+1]=Math.round(DEEP[1]+(255-DEEP[1])*t); fd[i+2]=Math.round(DEEP[2]+(255-DEEP[2])*t); fd[i+3]=255; }
        fillCtx.putImageData(fill,0,0);
        ctx.globalCompositeOperation='source-over'; ctx.drawImage(maskCv,0,0);
        ctx.globalCompositeOperation='source-in'; ctx.imageSmoothingEnabled=true;
        ctx.drawImage(fillCv,0,0,SW,SH,0,0,cv.width,cv.height);
        ctx.globalCompositeOperation='source-over';
      }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  });
})();
