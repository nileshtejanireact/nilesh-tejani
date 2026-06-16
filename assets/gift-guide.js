/**
 * Gift Guide Section
 * Handles interactivity and animations for the gift guide section
 */

class GiftGuideSection extends HTMLElement {
  constructor() {
    super();
    this.section = this;
  }

  connectedCallback() {
    this.initializeButtons();
    this.observeScroll();
  }

  /**
   * Initialize button interactions
   */
  initializeButtons() {
    const buttons = this.querySelectorAll('.gift-guide__button');

    buttons.forEach((button) => {
      button.addEventListener('click', (e) => {
        this.handleButtonClick(e, button);
      });

      button.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          button.click();
        }
      });
    });
  }

  /**
   * Handle button click events
   */
  handleButtonClick(event, button) {
    const text = button.textContent.trim();
    const href = button.getAttribute('href');
    const style = button.classList.contains('gift-guide__button--primary')
      ? 'primary'
      : 'secondary';

    // Track button click event for analytics
    if (typeof window.gtag !== 'undefined') {
      gtag('event', 'gift_guide_button_click', {
        button_text: text,
        button_style: style,
        button_link: href,
      });
    }

    // Custom event dispatch for external tracking
    const customEvent = new CustomEvent('giftGuideButtonClick', {
      detail: {
        buttonText: text,
        buttonStyle: style,
        buttonLink: href,
        timestamp: new Date(),
      },
      bubbles: true,
      cancelable: true,
    });

    this.dispatchEvent(customEvent);
  }

  /**
   * Observe scroll for lazy loading and animations
   */
  observeScroll() {
    const images = this.querySelectorAll('.gift-guide__image');

    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            imageObserver.unobserve(entry.target);
          }
        });
      });

      images.forEach((image) => {
        imageObserver.observe(image);
      });
    } else {
      // Fallback for browsers without IntersectionObserver
      images.forEach((image) => {
        image.classList.add('is-visible');
      });
    }
  }

  /**
   * Optimize images for performance
   */
  optimizeImages() {
    const images = this.querySelectorAll('.gift-guide__img');

    images.forEach((img) => {
      // Set loading attribute for native lazy loading
      if (!img.hasAttribute('loading')) {
        img.setAttribute('loading', 'lazy');
      }

      // Add error handling
      img.addEventListener('error', () => {
        img.style.opacity = '0.5';
        console.warn(`Failed to load image: ${img.src}`);
      });

      // Add load event for fade-in animation
      img.addEventListener('load', () => {
        img.classList.add('is-loaded');
      });
    });
  }

  /**
   * Handle window resize for responsive adjustments
   */
  handleResize() {
    const container = this.querySelector('.gift-guide__container');
    if (!container) return;

    const width = window.innerWidth;
    const mediaContainer = this.querySelector('.gift-guide__media');

    if (width < 750) {
      mediaContainer.style.height = '250px';
    } else if (width < 1200) {
      mediaContainer.style.height = '400px';
    } else {
      mediaContainer.style.height = '500px';
    }
  }

  /**
   * Cleanup on disconnect
   */
  disconnectedCallback() {
    // Remove event listeners and cleanup
  }
}

// Register the custom element
customElements.define('gift-guide-section', GiftGuideSection);

/**
 * Initialize gift guide sections on page load
 */
document.addEventListener('DOMContentLoaded', () => {
  const giftGuideSections = document.querySelectorAll(
    '.gift-guide-section'
  );

  giftGuideSections.forEach((section) => {
    const giftGuide = new GiftGuideSection();
    giftGuide.initializeButtons();
    giftGuide.observeScroll();
    giftGuide.optimizeImages();
  });

  // Handle window resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      giftGuideSections.forEach((section) => {
        const giftGuide = new GiftGuideSection.prototype.constructor();
        giftGuide.handleResize.call(section);
      });
    }, 250);
  });
});

/**
 * Shopify Section API Integration
 */
if (typeof Shopify !== 'undefined' && Shopify.designMode) {
  document.addEventListener('shopify:section:load', (e) => {
    const section = e.detail.sectionId;
    const giftGuideSection = document.querySelector(
      `[data-section-id="${section}"]`
    );

    if (giftGuideSection) {
      const giftGuide = new GiftGuideSection();
      giftGuide.initializeButtons();
      giftGuide.observeScroll();
      giftGuide.optimizeImages();
    }
  });

  document.addEventListener('shopify:section:unload', (e) => {
    const section = e.detail.sectionId;
    const giftGuideSection = document.querySelector(
      `[data-section-id="${section}"]`
    );

    if (giftGuideSection) {
      giftGuideSection.disconnectedCallback();
    }
  });
}
