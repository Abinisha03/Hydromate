/* ─── HydroMate Landing — script.js ─── */

/* ════════════════════════
   NAVBAR scroll behaviour
════════════════════════ */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
  backToTop.classList.toggle('visible', window.scrollY > 300);
});

/* ════════════════════════
   HAMBURGER
════════════════════════ */
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('nav-links');
hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});
// Close on nav link click
navLinks.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});

/* ════════════════════════
   ACTIVE NAV LINK
════════════════════════ */
const sections = document.querySelectorAll('section[id]');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const id = e.target.getAttribute('id');
      document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.toggle('active', l.getAttribute('href') === `#${id}`);
      });
    }
  });
}, { rootMargin: '-40% 0px -50% 0px' });
sections.forEach(s => observer.observe(s));

/* ════════════════════════
   SCROLL FADE-IN
════════════════════════ */
const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      // Trigger stat bars
      if (e.target.classList.contains('stat-band-item')) {
        const bar = e.target.querySelector('.stat-bar');
        if (bar) bar.style.width = bar.getAttribute('data-width') || bar.style.width;
      }
      fadeObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });
document.querySelectorAll('.fade-up').forEach(el => fadeObserver.observe(el));

/* ════════════════════════
   COUNT-UP NUMBERS
════════════════════════ */
function countUp(el, target, duration = 1600) {
  let start = 0;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    start += step;
    if (start >= target) { el.textContent = target; clearInterval(timer); return; }
    el.textContent = Math.floor(start);
  }, 16);
}

const countObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('[data-target]').forEach(el => {
        countUp(el, parseInt(el.getAttribute('data-target'), 10));
      });
      countObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.2 });

// Observe sections that contain counters
['hero', 'stats', 'app-section'].forEach(id => {
  const el = document.getElementById(id);
  if (el) countObserver.observe(el);
});

/* ════════════════════════
   STAT BARS (animate in)
════════════════════════ */
const barObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('.stat-bar').forEach(bar => {
        const w = bar.style.width;
        bar.style.width = '0';
        setTimeout(() => { bar.style.width = w; }, 200);
      });
      barObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.2 });
const statsBand = document.getElementById('stats');
if (statsBand) barObserver.observe(statsBand);

/* ════════════════════════
   BACK TO TOP
════════════════════════ */
const backToTop = document.getElementById('back-to-top');
backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ════════════════════════
   CONTACT FORM
════════════════════════ */
const form = document.getElementById('contact-form');
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name  = document.getElementById('contact-name').value.trim();
    const phone = document.getElementById('contact-phone').value.trim();
    const email = document.getElementById('contact-email').value.trim();
    const msg   = document.getElementById('contact-msg').value.trim();
    if (!name || !phone) { alert('Please fill in your name and phone number.'); return; }
    const mailto = `mailto:admin@hydromate.in?subject=Contact from ${encodeURIComponent(name)}&body=${encodeURIComponent(`Name: ${name}\nPhone: ${phone}\nEmail: ${email}\nMessage: ${msg}`)}`;
    window.location.href = mailto;
  });
}

/* ════════════════════════
   RIPPLE EFFECT on buttons
════════════════════════ */
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', function(e) {
    const ripple = document.createElement('span');
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.cssText = `
      position:absolute; border-radius:50%; pointer-events:none;
      width:${size}px; height:${size}px;
      left:${e.clientX - rect.left - size/2}px;
      top:${e.clientY - rect.top - size/2}px;
      background:rgba(255,255,255,0.3);
      transform:scale(0); animation:ripple 0.5s linear;
    `;
    btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
});

/* inject ripple keyframe */
const style = document.createElement('style');
style.textContent = `@keyframes ripple { to { transform:scale(2.5); opacity:0; } }`;
document.head.appendChild(style);

/* ════════════════════════
   HERO entrance animation
════════════════════════ */
window.addEventListener('load', () => {
  const heroContent = document.getElementById('hero-content');
  const heroVisual  = document.getElementById('hero-visual');
  if (heroContent) {
    heroContent.style.opacity = '0';
    heroContent.style.transform = 'translateY(30px)';
    heroContent.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
    setTimeout(() => {
      heroContent.style.opacity = '1';
      heroContent.style.transform = 'translateY(0)';
    }, 200);
  }
  if (heroVisual) {
    heroVisual.style.opacity = '0';
    heroVisual.style.transform = 'translateY(30px)';
    heroVisual.style.transition = 'opacity 0.8s ease 0.3s, transform 0.8s ease 0.3s';
    setTimeout(() => {
      heroVisual.style.opacity = '1';
      heroVisual.style.transform = 'translateY(0)';
    }, 200);
  }
  // Run hero counters immediately
  document.querySelectorAll('#hero [data-target]').forEach(el => {
    countUp(el, parseInt(el.getAttribute('data-target'), 10), 1400);
  });
});
