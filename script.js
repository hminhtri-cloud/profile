// ==========================================================================
// CYBERSECURITY PORTFOLIO INTERACTIVE SCRIPT
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // 0. Theme Switcher (Light / Dark Mode)
  const themeToggleBtn = document.getElementById('theme-toggle');
  const currentTheme = localStorage.getItem('theme') || 'light';

  if (currentTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    if (themeToggleBtn) {
      themeToggleBtn.querySelector('i').className = 'fa-solid fa-sun';
    }
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const icon = themeToggleBtn.querySelector('i');

      if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        icon.className = 'fa-solid fa-moon';
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        icon.className = 'fa-solid fa-sun';
      }
    });
  }

  // 1. Mobile Menu Toggle
  const mobileToggle = document.getElementById('mobile-toggle');
  const navLinks = document.getElementById('nav-links');

  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      const icon = mobileToggle.querySelector('i');
      if (navLinks.classList.contains('active')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-xmark');
      } else {
        icon.classList.remove('fa-xmark');
        icon.classList.add('fa-bars');
      }
    });

    // Close menu when a link is clicked
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        const icon = mobileToggle.querySelector('i');
        icon.classList.remove('fa-xmark');
        icon.classList.add('fa-bars');
      });
    });
  }

  // 2. Active Link Highlight on Scroll (ScrollSpy)
  const sections = document.querySelectorAll('section[id]');
  const navLinkList = document.querySelectorAll('.nav-link');

  const highlightNavOnScroll = () => {
    const scrollY = window.pageYOffset;

    sections.forEach(current => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop - 120;
      const sectionId = current.getAttribute('id');

      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        navLinkList.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
          }
        });
      }
    });
  };

  window.addEventListener('scroll', highlightNavOnScroll);

  // 3. Project Filter System
  const filterBtns = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.project-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active from all buttons
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterValue = btn.getAttribute('data-filter');

      projectCards.forEach(card => {
        const cardCategory = card.getAttribute('data-category');
        if (filterValue === 'all' || filterValue === cardCategory) {
          card.style.display = 'flex';
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }, 50);
        } else {
          card.style.opacity = '0';
          card.style.transform = 'translateY(20px)';
          setTimeout(() => {
            card.style.display = 'none';
          }, 300);
        }
      });
    });
  });

  // 4. Animated Statistics Counter
  const statNumbers = document.querySelectorAll('.stat-number');
  let animated = false;

  const animateCounters = () => {
    const statsSection = document.querySelector('.stats-grid');
    if (!statsSection) return;

    const sectionPos = statsSection.getBoundingClientRect().top;
    const screenPos = window.innerHeight;

    if (sectionPos < screenPos && !animated) {
      animated = true;
      statNumbers.forEach(stat => {
        const target = +stat.getAttribute('data-count');
        const duration = 1500; // 1.5s
        const step = target / (duration / 16);
        let current = 0;

        const updateCounter = () => {
          current += step;
          if (current < target) {
            stat.innerText = Math.ceil(current);
            requestAnimationFrame(updateCounter);
          } else {
            stat.innerText = target;
          }
        };

        updateCounter();
      });
    }
  };

  window.addEventListener('scroll', animateCounters);
  animateCounters(); // Trigger if already in view

  // 5. Contact Form Handler
  const contactForm = document.getElementById('contact-form');
  const formAlert = document.getElementById('form-alert');

  if (contactForm && formAlert) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi...';

      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;

        formAlert.classList.remove('hidden');
        formAlert.className = 'form-alert success';
        formAlert.innerHTML = '<i class="fa-solid fa-circle-check"></i> Cảm ơn bạn! Tin nhắn của bạn đã được gửi thành công. Tôi sẽ phản hồi sớm nhất có thể.';

        contactForm.reset();

        setTimeout(() => {
          formAlert.classList.add('hidden');
        }, 6000);
      }, 1200);
    });
  }
});
