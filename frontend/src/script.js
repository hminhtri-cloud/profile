// ==========================================================================
// CYBERSECURITY PORTFOLIO INTERACTIVE SCRIPT
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // 0. Theme Switcher (Dynamic Island Style)
  const themeToggleBtn = document.getElementById('theme-toggle');
  const currentTheme = localStorage.getItem('theme') || 'light';

  const updateThemeUI = (theme) => {
    if (!themeToggleBtn) return;
    const icon = themeToggleBtn.querySelector('.theme-icon') || themeToggleBtn.querySelector('i');
    const text = themeToggleBtn.querySelector('.theme-text');

    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      if (icon) icon.className = 'fa-solid fa-sun theme-icon';
      if (text) text.textContent = 'Light Mode';
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (icon) icon.className = 'fa-solid fa-moon theme-icon';
      if (text) text.textContent = 'Dark Mode';
    }
  };

  // Initialize Theme on load
  updateThemeUI(currentTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const newTheme = isDark ? 'light' : 'dark';
      localStorage.setItem('theme', newTheme);
      updateThemeUI(newTheme);
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
          if (link.dataset.site === sectionId) {
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
       submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';

      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;

        formAlert.classList.remove('hidden');
        formAlert.className = 'form-alert success';
         formAlert.innerHTML = '<i class="fa-solid fa-circle-check"></i> Thank you! Your message was sent successfully. I will get back to you soon.';

        contactForm.reset();

        setTimeout(() => {
          formAlert.classList.add('hidden');
        }, 6000);
      }, 1200);
    });
  }

  // 6. Load published posts from Strapi and keep Markdown rendering on the detail page.
  const blogContainer = document.getElementById('blog-container');
  const strapiUrl = 'http://localhost:1337/api/posts?sort=createdAt:desc&pagination[limit]=6';

  const getPostAttributes = (post) => post.attributes || post;
  const escapeHtml = (value) => String(value || '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));

  if (blogContainer) {
    fetch(strapiUrl)
      .then((response) => {
        if (!response.ok) throw new Error('Strapi request failed');
        return response.json();
      })
      .then((result) => {
        const posts = result.data || [];
        if (!posts.length) {
           blogContainer.innerHTML = '<div class="blog-state">No posts have been published yet.</div>';
          return;
        }
        blogContainer.innerHTML = posts.map((post) => {
          const data = getPostAttributes(post);
          const slug = data.slug || post.documentId || post.id;
           return `<a class="blog-card" href="https://blog.hminhtri.cloud/post.html?slug=${encodeURIComponent(slug)}">
            <div class="blog-card-top"><span class="blog-index">FIELD NOTE</span><i class="fa-solid fa-arrow-up-right-from-square"></i></div>
            <h3>${escapeHtml(data.title || 'Untitled post')}</h3>
             <p>${escapeHtml(data.meta_description || 'Technology and cybersecurity field notes.')}</p>
             <div class="blog-card-bottom"><span>Read article</span><span>${data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-US') : 'Recently published'}</span></div>
          </a>`;
        }).join('');
      })
      .catch(() => {
         blogContainer.innerHTML = '<div class="blog-state"><i class="fa-solid fa-triangle-exclamation"></i> Could not connect to Strapi. Check the API at localhost:1337.</div>';
      });
  }
});
