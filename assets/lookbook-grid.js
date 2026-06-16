/**
 * lookbook-grid.js
 * Shopify Dawn — Lookbook Grid Section
 * Pure Vanilla JS, no jQuery, no external libraries.
 */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /*  Constants                                                           */
  /* ------------------------------------------------------------------ */
  const SELECTORS = {
    section:        '.lookbook-grid',
    card:           '.lookbook-card',
    modal:          '#lookbook-modal',
    overlay:        '.lookbook-modal__overlay',
    closeBtn:       '.lookbook-modal__close',
    modalImage:     '.lookbook-modal__image',
    modalTitle:     '.lookbook-modal__title',
    modalPrice:     '.lookbook-modal__price',
    modalDesc:      '.lookbook-modal__description',
    variantsWrap:   '.lookbook-modal__variants',
    atcBtn:         '.lookbook-modal__atc',
    atcText:        '.lookbook-modal__atc-text',
    atcIcon:        '.lookbook-modal__atc-icon',
    notice:         '.lookbook-modal__notice',
    availability:   '.lookbook-modal__availability',
  };

  /* ------------------------------------------------------------------ */
  /*  State                                                               */
  /* ------------------------------------------------------------------ */
  let currentProduct   = null;
  let selectedOptions  = {};
  let previouslyFocused = null;

  /* ------------------------------------------------------------------ */
  /*  DOM references (populated after DOMContentLoaded)                  */
  /* ------------------------------------------------------------------ */
  let modal, overlay, closeBtn, modalImage, modalTitle, modalPrice,
      modalDesc, variantsWrap, atcBtn, atcText, atcIcon, noticeEl, availabilityEl;

  /* ------------------------------------------------------------------ */
  /*  Initialise                                                          */
  /* ------------------------------------------------------------------ */
  function init() {
    modal          = document.querySelector(SELECTORS.modal);
    overlay        = modal && modal.querySelector(SELECTORS.overlay);
    closeBtn       = modal && modal.querySelector(SELECTORS.closeBtn);
    modalImage     = modal && modal.querySelector(SELECTORS.modalImage);
    modalTitle     = modal && modal.querySelector(SELECTORS.modalTitle);
    modalPrice     = modal && modal.querySelector(SELECTORS.modalPrice);
    modalDesc      = modal && modal.querySelector(SELECTORS.modalDesc);
    variantsWrap   = modal && modal.querySelector(SELECTORS.variantsWrap);
    atcBtn         = modal && modal.querySelector(SELECTORS.atcBtn);
    atcText        = modal && modal.querySelector(SELECTORS.atcText);
    atcIcon        = modal && modal.querySelector(SELECTORS.atcIcon);
    noticeEl       = modal && modal.querySelector(SELECTORS.notice);
    availabilityEl = modal && modal.querySelector(SELECTORS.availability);

    if (!modal) return;

    // Card click listeners
    document.querySelectorAll(SELECTORS.card).forEach(function (card) {
      card.addEventListener('click', onCardClick);
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCardClick.call(card, e);
        }
      });
    });

    // Modal close
    if (overlay)  overlay.addEventListener('click',  closeModal);
    if (closeBtn) closeBtn.addEventListener('click',  closeModal);

    // ESC key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
        closeModal();
      }
    });

    // Trap focus inside modal
    modal.addEventListener('keydown', trapFocus);

    // ATC
    if (atcBtn) atcBtn.addEventListener('click', onAddToCart);
  }

  /* ------------------------------------------------------------------ */
  /*  Card click → open modal                                            */
  /* ------------------------------------------------------------------ */
  function onCardClick() {
    var rawData = this.dataset.product;
    if (!rawData) return;

    var product;
    try {
      product = JSON.parse(rawData);
    } catch (err) {
      console.error('Lookbook Grid: invalid product JSON', err);
      return;
    }

    if (!product || !product.id) return;

    previouslyFocused = document.activeElement;

    populateModal(product, this.dataset.image || '');
    openModal();
  }

  /* ------------------------------------------------------------------ */
  /*  Populate modal with product data                                   */
  /* ------------------------------------------------------------------ */
  function populateModal(product, cardImageUrl) {
    currentProduct  = product;
    selectedOptions = {};

    // Reset notice
    setNotice('', '');

    // Image — prefer card image, fallback to product featured image
    var imgSrc = cardImageUrl || product.featured_image || '';
    if (modalImage) {
      if (imgSrc) {
        modalImage.src        = imgSrc;
        modalImage.alt        = product.title || '';
        modalImage.style.display = '';
      } else {
        modalImage.style.display = 'none';
      }
    }

    // Title
    if (modalTitle) modalTitle.textContent = product.title || '';

    // Description
    if (modalDesc) {
      modalDesc.innerHTML = product.description || '';
    }

    // Variants
    buildVariantSelectors(product);

    // Set initial selected options from first available variant
    var firstAvailable = (product.variants || []).find(function (v) { return v.available; })
                         || (product.variants || [])[0];

    if (firstAvailable && product.options_with_values) {
      product.options_with_values.forEach(function (opt, idx) {
        var valKey = 'option' + (idx + 1);
        selectedOptions[opt.name] = firstAvailable[valKey];
      });
      highlightSelectedPills();
      updateVariantState();
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Build variant selectors dynamically                                */
  /* ------------------------------------------------------------------ */
  function buildVariantSelectors(product) {
    if (!variantsWrap) return;
    variantsWrap.innerHTML = '';

    var options = product.options_with_values || [];
    if (!options.length) return;

    options.forEach(function (option) {
      var group = document.createElement('div');
      group.className = 'lookbook-modal__option-group';

      var label = document.createElement('span');
      label.className = 'lookbook-modal__option-label';
      label.id        = 'lookbook-option-label-' + slugify(option.name);
      label.textContent = option.name;
      group.appendChild(label);

      var values = option.values || [];

      // Use pills for ≤ 8 values, dropdown for more
      if (values.length <= 8) {
        var list = document.createElement('ul');
        list.className          = 'lookbook-modal__option-pills';
        list.setAttribute('role', 'group');
        list.setAttribute('aria-labelledby', label.id);

        values.forEach(function (val) {
          var li  = document.createElement('li');
          var btn = document.createElement('button');
          btn.type      = 'button';
          btn.className = 'lookbook-modal__option-pill';
          btn.textContent = val;
          btn.dataset.option = option.name;
          btn.dataset.value  = val;
          btn.setAttribute('aria-label', option.name + ': ' + val);

          btn.addEventListener('click', function () {
            selectedOptions[option.name] = val;
            highlightSelectedPills();
            updateVariantState();
          });

          li.appendChild(btn);
          list.appendChild(li);
        });

        group.appendChild(list);
      } else {
        // Dropdown
        var select = document.createElement('select');
        select.className = 'lookbook-modal__option-select';
        select.setAttribute('aria-labelledby', label.id);
        select.dataset.option = option.name;

        var placeholder = document.createElement('option');
        placeholder.value    = '';
        placeholder.disabled = true;
        placeholder.selected = true;
        placeholder.textContent = 'Choose ' + option.name;
        select.appendChild(placeholder);

        values.forEach(function (val) {
          var opt = document.createElement('option');
          opt.value       = val;
          opt.textContent = val;
          select.appendChild(opt);
        });

        select.addEventListener('change', function () {
          selectedOptions[option.name] = this.value;
          updateVariantState();
        });

        group.appendChild(select);
      }

      variantsWrap.appendChild(group);
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Highlight selected pills & mark unavailable combos                 */
  /* ------------------------------------------------------------------ */
  function highlightSelectedPills() {
    if (!variantsWrap || !currentProduct) return;

    variantsWrap.querySelectorAll('.lookbook-modal__option-pill').forEach(function (pill) {
      var optName = pill.dataset.option;
      var optVal  = pill.dataset.value;
      var isSelected = selectedOptions[optName] === optVal;

      pill.classList.toggle('lookbook-modal__option-pill--selected', isSelected);
      pill.setAttribute('aria-pressed', isSelected ? 'true' : 'false');

      // Check availability for this pill value given other selected options
      var testOptions = Object.assign({}, selectedOptions, { [optName]: optVal });
      var variant = findVariant(currentProduct.variants || [], testOptions, currentProduct.options_with_values || []);
      var unavail = variant ? !variant.available : false;
      pill.classList.toggle('lookbook-modal__option-pill--unavailable', unavail);
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Find matching variant                                              */
  /* ------------------------------------------------------------------ */
  function findVariant(variants, options, optionsDefs) {
    return variants.find(function (variant) {
      return optionsDefs.every(function (opt, idx) {
        var key = 'option' + (idx + 1);
        return options[opt.name] === undefined || variant[key] === options[opt.name];
      });
    }) || null;
  }

  /* ------------------------------------------------------------------ */
  /*  Update price / availability when selection changes                 */
  /* ------------------------------------------------------------------ */
  function updateVariantState() {
    if (!currentProduct) return;

    var variant = findVariant(
      currentProduct.variants || [],
      selectedOptions,
      currentProduct.options_with_values || []
    );

    // Price
    if (modalPrice) {
      if (variant) {
        var formatted = variant.price_formatted || currentProduct.price_formatted || '';
        modalPrice.textContent = formatted;
        modalPrice.classList.toggle('lookbook-modal__price--unavailable', !variant.available);
      } else {
        modalPrice.textContent = currentProduct.price_formatted || '';
        modalPrice.classList.remove('lookbook-modal__price--unavailable');
      }
    }

    // Availability
    if (availabilityEl) {
      if (!variant) {
        availabilityEl.textContent = '';
        availabilityEl.className   = 'lookbook-modal__availability';
      } else if (variant.available) {
        availabilityEl.textContent = '';
        availabilityEl.className   = 'lookbook-modal__availability lookbook-modal__availability--in-stock';
      } else {
        availabilityEl.textContent = window.lookbookStrings && window.lookbookStrings.soldOut
          ? window.lookbookStrings.soldOut
          : 'Sold out';
        availabilityEl.className = 'lookbook-modal__availability';
      }
    }

    // ATC button
    if (atcBtn) {
      var allSelected = (currentProduct.options_with_values || []).every(function (opt) {
        return selectedOptions[opt.name] !== undefined;
      });
      var available = variant ? variant.available : false;
      atcBtn.disabled             = !allSelected || !available;
      atcBtn.dataset.variantId    = variant ? variant.id : '';
    }

    // Reset notice on selection change
    setNotice('', '');
  }

  /* ------------------------------------------------------------------ */
  /*  Add to Cart via Shopify Ajax API                                   */
  /* ------------------------------------------------------------------ */
  function onAddToCart() {
    if (!atcBtn || atcBtn.disabled) return;

    var variantId = parseInt(atcBtn.dataset.variantId, 10);
    if (!variantId) return;

    setLoadingState(true);
    setNotice('', '');

    fetch('/cart/add.js', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body:    JSON.stringify({ id: variantId, quantity: 1 }),
    })
      .then(function (res) {
        if (!res.ok) {
          return res.json().then(function (data) {
            throw new Error(data.description || 'Error adding to cart');
          });
        }
        return res.json();
      })
      .then(function () {
        setLoadingState(false);
        setNotice('Item added to cart!', 'success');
       // refreshDawnCart();
      })
      .catch(function (err) {
        setLoadingState(false);
        setNotice(err.message || 'Could not add to cart. Please try again.', 'error');
      });
  }

  /* ------------------------------------------------------------------ */
  /*  Refresh Dawn cart drawer                                           */
  /* ------------------------------------------------------------------ */
  function refreshDawnCart() {
    // Dawn theme exposes a custom element <cart-notification> or <cart-drawer>
    // Try multiple approaches for compatibility.

    // 1. Dawn cart-drawer custom element
    var cartDrawer = document.querySelector('cart-drawer');
    if (cartDrawer && typeof cartDrawer.open === 'function') {
      fetch('/cart.js').then(function (r) { return r.json(); }).then(function (cart) {
        document.dispatchEvent(new CustomEvent('cart:refresh', { detail: { cart: cart } }));
        cartDrawer.open();
      });
      return;
    }

    // 2. Dawn >= 9 uses cart-notification
    var cartNotification = document.querySelector('cart-notification');
    if (cartNotification && typeof cartNotification.renderContents === 'function') {
      cartNotification.renderContents({ items: [{ variant_id: parseInt(atcBtn.dataset.variantId, 10), quantity: 1 }] });
      return;
    }

    // 3. Fire global event some themes listen to
    document.dispatchEvent(new CustomEvent('cart:updated'));

    // 4. Fallback: fetch cart and update count badges
    fetch('/cart.js')
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        var countEls = document.querySelectorAll('[data-cart-count], .cart-count, #CartCount');
        countEls.forEach(function (el) {
          el.textContent = cart.item_count;
        });
      })
      .catch(function () {});
  }

  /* ------------------------------------------------------------------ */
  /*  Loading state                                                       */
  /* ------------------------------------------------------------------ */
  function setLoadingState(loading) {
    if (!atcBtn) return;
    atcBtn.classList.toggle('lookbook-modal__atc--loading', loading);

    if (loading) {
      if (atcIcon) atcIcon.style.display = 'none';
      // Insert spinner
      var existing = atcBtn.querySelector('.lookbook-modal__atc-spinner');
      if (!existing) {
        var spinner = document.createElement('span');
        spinner.className           = 'lookbook-modal__atc-spinner';
        spinner.setAttribute('aria-hidden', 'true');
        atcBtn.appendChild(spinner);
      }
      if (atcText) atcText.textContent = 'Adding…';
      atcBtn.disabled = true;
    } else {
      var spinner = atcBtn.querySelector('.lookbook-modal__atc-spinner');
      if (spinner) spinner.remove();
      if (atcIcon) atcIcon.style.display = '';
      if (atcText) atcText.textContent = 'Add to Cart';
      atcBtn.disabled = false;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Notice messages                                                     */
  /* ------------------------------------------------------------------ */
  function setNotice(message, type) {
    if (!noticeEl) return;
    noticeEl.textContent = message;
    noticeEl.className   = 'lookbook-modal__notice';
    if (type === 'error')   noticeEl.classList.add('lookbook-modal__notice--error');
    if (type === 'success') noticeEl.classList.add('lookbook-modal__notice--success');
  }

  /* ------------------------------------------------------------------ */
  /*  Modal open / close                                                  */
  /* ------------------------------------------------------------------ */
  function openModal() {
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Move focus to close button
    requestAnimationFrame(function () {
      if (closeBtn) closeBtn.focus();
    });
  }

  function closeModal() {
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    // Return focus
    if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
      previouslyFocused.focus();
    }

    currentProduct  = null;
    selectedOptions = {};
  }

  /* ------------------------------------------------------------------ */
  /*  Focus trap                                                          */
  /* ------------------------------------------------------------------ */
  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    if (!modal || modal.getAttribute('aria-hidden') !== 'false') return;

    var focusable = Array.from(
      modal.querySelectorAll(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
      )
    ).filter(function (el) { return !el.closest('[aria-hidden="true"]'); });

    if (!focusable.length) return;

    var first = focusable[0];
    var last  = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                             */
  /* ------------------------------------------------------------------ */
  function slugify(str) {
    return (str || '').toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
  }

  /* ------------------------------------------------------------------ */
  /*  Boot                                                                */
  /* ------------------------------------------------------------------ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
