/**
 * Shared Footer Component
 * Provides consistent footer across all pages
 */

class SharedFooter {
  constructor() {
    this.init();
  }

  init() {
    this.createFooter();
  }

  createFooter() {
    const footer = document.createElement('footer');
    footer.setAttribute('role', 'contentinfo');
    footer.className = 'shared-footer';

    const currentYear = new Date().getFullYear();

    footer.innerHTML = `
      <div class="footer-content">
        <div class="footer-section">
          <h3>Troop Tools</h3>
          <p>Military Calculator Suite for strategic planning and battle analysis.</p>
        </div>
        
        <div class="footer-section">
          <h4>Quick Links</h4>
          <ul class="footer-links">
            <li><a href="./" aria-label="Go to home page">Home</a></li>
            <li><a href="./troop_swap_calculator.html" aria-label="Troop Swap Calculator">Troop Swap</a></li>
            <li><a href="./battle_results.html" aria-label="Battle Results">Battle Results</a></li>
            <li><a href="./control_point.html" aria-label="Control Point">Control Point</a></li>
            <li><a href="./known_enemies.html" aria-label="Known Enemies">Known Enemies</a></li>
          </ul>
        </div>
        
        <div class="footer-section">
          <h4>Resources</h4>
          <ul class="footer-links">
            <li><a href="https://github.com/CheshireMinded/WGC" target="_blank" rel="noopener noreferrer" aria-label="View source code on GitHub">GitHub</a></li>
            <li><a href="https://cheshireminded.github.io/WGC" target="_blank" rel="noopener noreferrer" aria-label="View live demo">Live Demo</a></li>
            <li><a href="https://github.com/CheshireMinded/WGC/issues" target="_blank" rel="noopener noreferrer" aria-label="Report issues">Report Issues</a></li>
          </ul>
        </div>
        
        <div class="footer-section">
          <h4>Features</h4>
          <ul class="footer-links">
            <li>📱 PWA Support</li>
            <li>🔒 Secure & Private</li>
            <li>♿ Accessible</li>
            <li>⚡ Offline Ready</li>
          </ul>
        </div>
      </div>
      
      <div class="footer-bottom">
        <p>&copy; ${currentYear} Troop Tools. Built with ❤️ for the military gaming community.</p>
        <p class="footer-version">Version: <span id="app-version">1.0.0</span></p>
      </div>
    `;

    // Insert footer before closing body tag
    document.body.appendChild(footer);
    this.addStyles();
    this.updateVersion();
  }

  addStyles() {
    if (document.getElementById('shared-footer-styles')) return;

    const style = document.createElement('style');
    style.id = 'shared-footer-styles';
    style.textContent = `
      .shared-footer {
        margin-top: 40px;
        padding: 30px 20px 20px;
        background: #0f1419;
        border-top: 1px solid #333;
        color: #ccc;
        font-size: 14px;
      }

      .footer-content {
        max-width: 1200px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 30px;
        margin-bottom: 20px;
      }

      .footer-section h3 {
        color: #64b5f6;
        margin: 0 0 15px 0;
        font-size: 18px;
      }

      .footer-section h4 {
        color: #64b5f6;
        margin: 0 0 15px 0;
        font-size: 16px;
      }

      .footer-section p {
        margin: 0 0 15px 0;
        line-height: 1.5;
        color: #aaa;
      }

      .footer-links {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .footer-links li {
        margin-bottom: 8px;
      }

      .footer-links a {
        color: #64b5f6;
        text-decoration: none;
        transition: color 0.3s ease;
      }

      .footer-links a:hover,
      .footer-links a:focus {
        color: #fff;
        text-decoration: underline;
      }

      .footer-links a:focus {
        outline: 2px solid #64b5f6;
        outline-offset: 2px;
        border-radius: 2px;
      }

      .footer-bottom {
        max-width: 1200px;
        margin: 0 auto;
        padding-top: 20px;
        border-top: 1px solid #333;
        text-align: center;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
      }

      .footer-bottom p {
        margin: 0;
        color: #666;
      }

      .footer-version {
        font-size: 12px;
        color: #888;
      }

      @media (max-width: 768px) {
        .footer-content {
          grid-template-columns: 1fr;
          gap: 20px;
        }
        
        .footer-bottom {
          flex-direction: column;
          text-align: center;
        }
        
        .shared-footer {
          padding: 20px 15px 15px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .footer-links a {
          transition: none;
        }
      }
    `;

    document.head.appendChild(style);
  }

  updateVersion() {
    // Try to get version from package.json or service worker
    const versionElement = document.getElementById('app-version');
    if (versionElement) {
      // Check if we can get version from service worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          if (registration.active) {
            registration.active.postMessage({ type: 'GET_VERSION' });
          }
        });
      }
      
      // Listen for version response
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', event => {
          if (event.data && event.data.version) {
            versionElement.textContent = event.data.version;
          }
        });
      }
    }
  }
}

// Initialize footer when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new SharedFooter();
  });
} else {
  new SharedFooter();
}
