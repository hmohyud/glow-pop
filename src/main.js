/* ─── PRELOADER ─── */
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('preloader').classList.add('hidden');
    initAnimations();
  }, 1200);
});

/* ─── LOLLIPOP PARTICLE CANVAS ─── */
const canvas = document.getElementById('lollipopCanvas');
const ctx = canvas.getContext('2d');
const pinkShades = [
  'rgba(255,105,180,', 'rgba(255,20,147,', 'rgba(255,182,217,',
  'rgba(233,30,140,', 'rgba(199,21,133,', 'rgba(255,135,190,'
];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = document.documentElement.scrollHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

class Lollipop {
  constructor() { this.reset(true); }
  reset(initial) {
    this.x = Math.random() * canvas.width;
    this.y = initial ? Math.random() * canvas.height : canvas.height + 100;
    this.radius = Math.random() * 18 + 8;
    this.stickLen = this.radius * 1.8 + Math.random() * 20;
    this.angle = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.004;
    this.speedY = Math.random() * 0.25 + 0.08;
    this.speedX = (Math.random() - 0.5) * 0.15;
    this.opacity = Math.random() * 0.1 + 0.03;
    this.color = pinkShades[Math.floor(Math.random() * pinkShades.length)];
  }
  update() {
    this.y -= this.speedY;
    this.x += this.speedX;
    this.angle += this.rotSpeed;
    if (this.y < -this.radius * 2 - this.stickLen) this.reset(false);
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.globalAlpha = this.opacity;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color + '0.6)';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, this.radius);
    ctx.lineTo(0, this.radius + this.stickLen);
    ctx.strokeStyle = this.color + '0.3)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }
}

const particles = Array.from({ length: 35 }, () => new Lollipop());

function animateCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => { p.update(); p.draw(); });
  requestAnimationFrame(animateCanvas);
}
animateCanvas();

/* ─── NAVBAR SCROLL ─── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
});

/* ─── MOBILE MENU ─── */
const mobileToggle = document.getElementById('mobileToggle');
const navLinks = document.getElementById('navLinks');
mobileToggle.addEventListener('click', () => {
  mobileToggle.classList.toggle('active');
  navLinks.classList.toggle('open');
});
navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    mobileToggle.classList.remove('active');
    navLinks.classList.remove('open');
  });
});

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
