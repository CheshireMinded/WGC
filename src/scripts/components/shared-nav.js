/**
 * Shared Navigation Component
 * Provides consistent navigation across all pages
 */

class SharedNavigation {
  constructor() {
    this.currentPage = this.getCurrentPage();
    this.init();
  }

  getCurrentPage() {
    const path = window.location.pathname;
    if (path === '/' || path.endsWith('index.html')) return 'home';
    if (path.includes('pages/troop_swap_calculator')) return 'troop-swap';
    if (path.includes('pages/battle_results')) return 'battle-results';
    if (path.includes('pages/control_point')) return 'control-point';
    if (path.includes('pages/known_enemies')) return 'known-enemies';
    return 'home';
  }

  init() {
    this.createNavigation();
    this.addKeyboardSupport();
    this.addFocusManagement();
  }

  createNavigation() {
    const nav = document.createElement('nav');
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Main navigation');
    nav.className = 'shared-nav';

    const navList = document.createElement('ul');
    navList.className = 'nav-list';

    // Determine base path based on current location
    const isInPagesDir = window.location.pathname.includes('/pages/');
    const basePath = isInPagesDir ? '../' : './';

    const navItems = [
      { id: 'home', href: `${basePath}`, label: '🏠 Home', text: 'Home' },
      { id: 'troop-swap', href: `${basePath}pages/troop_swap_calculator.html`, label: '⚔️ Troop Swap', text: 'Troop Swap Calculator' },
      { id: 'battle-results', href: `${basePath}pages/battle_results.html`, label: '📊 Battle Results', text: 'Battle Results' },
      { id: 'control-point', href: `${basePath}pages/control_point.html`, label: '🎯 Control Point', text: 'Control Point' },
      { id: 'known-enemies', href: `${basePath}pages/known_enemies.html`, label: '👁️ Known Enemies', text: 'Known Enemies' }
    ];

    navItems.forEach(item => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      
      a.href = item.href;
      a.textContent = item.label;
      a.setAttribute('aria-label', item.text);
      a.className = 'nav-link';
      
      if (item.id === this.currentPage) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
      }

      li.appendChild(a);
      navList.appendChild(li);
    });

    nav.appendChild(navList);

    // Insert navigation at the beginning of body
    const body = document.body;
    const skipLink = body.querySelector('.skip-link');
    if (skipLink) {
      body.insertBefore(nav, skipLink.nextSibling);
    } else {
      body.insertBefore(nav, body.firstChild);
    }

    this.addStyles();
  }

  addStyles() {
    if (document.getElementById('shared-nav-styles')) return;

    const style = document.createElement('style');
    style.id = 'shared-nav-styles';
    style.textContent = `
      .shared-nav {
        background: #1a1a2e;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 20px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }

      .nav-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        justify-content: center;
        gap: 20px;
        flex-wrap: wrap;
      }

      .nav-link {
        color: #64b5f6;
        text-decoration: none;
        padding: 8px 16px;
        border-radius: 4px;
        transition: all 0.3s ease;
        display: block;
        font-weight: 500;
        border: 2px solid transparent;
      }

      .nav-link:hover {
        background: #0f3460;
        color: #fff;
        transform: translateY(-1px);
      }

      .nav-link:focus {
        outline: 2px solid #64b5f6;
        outline-offset: 2px;
        background: #0f3460;
        color: #fff;
      }

      .nav-link.active {
        background: #0f3460;
        color: #fff;
        border-color: #64b5f6;
      }

      .nav-link.active:focus {
        outline-color: #fff;
      }

      @media (max-width: 768px) {
        .nav-list {
          flex-direction: column;
          gap: 10px;
        }
        
        .nav-link {
          text-align: center;
          padding: 12px 16px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .nav-link {
          transition: none;
        }
        
        .nav-link:hover {
          transform: none;
        }
      }
    `;

    document.head.appendChild(style);
  }

  addKeyboardSupport() {
    document.addEventListener('keydown', (e) => {
      // Alt + number keys for quick navigation
      if (e.altKey && e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        const navLinks = document.querySelectorAll('.nav-link');
        const index = parseInt(e.key) - 1;
        if (navLinks[index]) {
          navLinks[index].focus();
          navLinks[index].click();
        }
      }

      // Escape key to close any open menus
      if (e.key === 'Escape') {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.classList.contains('nav-link')) {
          activeElement.blur();
        }
      }
    });
  }

  addFocusManagement() {
    // Add focus indicators for keyboard navigation
    const style = document.createElement('style');
    style.textContent = `
      .nav-link:focus-visible {
        outline: 2px solid #64b5f6;
        outline-offset: 2px;
      }
    `;
    document.head.appendChild(style);
  }
}

// Initialize navigation when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new SharedNavigation();
  });
} else {
  new SharedNavigation();
}
