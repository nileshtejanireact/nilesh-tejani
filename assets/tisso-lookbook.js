 /**
 * tisso-lookbook.js
 * Lookbook grid + modal with variant selection + Shopify ATC
 * Pure Vanilla JS — zero dependencies
 */
(function () {
  'use strict';

  /* ── State ─────────────────────────────────────────────────── */
  var currentProduct   = null;
  var selectedOptions  = {};
  var prevFocused      = null;

  /* ── DOM refs ───────────────────────────────────────────────── */
  var modal, overlay, closeBtn,
      modalImg, modalTitle, modalPrice, modalDesc,
      optionsWrap, atcBtn, atcLabel, atcArrow,
      availEl, noticeEl;

  /* ── Boot ───────────────────────────────────────────────────── */
  function init() {
    modal      = document.getElementById('tlb-modal');
    if (!modal) return;

    overlay    = modal.querySelector('.tlb-modal__overlay');
    closeBtn   = modal.querySelector('.tlb-modal__close');
    modalImg   = modal.querySelector('.tlb-modal__img');
    modalTitle = modal.querySelector('.tlb-modal__title');
    modalPrice = modal.querySelector('.tlb-modal__price');
    modalDesc  = modal.querySelector('.tlb-modal__desc');
    optionsWrap = modal.querySelector('.tlb-modal__options');
    atcBtn     = modal.querySelector('.tlb-modal__atc');
    atcLabel   = modal.querySelector('.tlb-modal__atc-label');
    atcArrow   = modal.querySelector('.tlb-modal__atc-arrow');
    availEl    = modal.querySelector('.tlb-modal__availability');
    noticeEl   = modal.querySelector('.tlb-modal__notice');

    /* Hotspot click listeners */
    document.querySelectorAll('.tlb__hotspot').forEach(function (btn) {
      btn.addEventListener('click', onHotspotClick);
      btn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onHotspotClick.call(btn); }
      });
    });

    if (overlay)  overlay.addEventListener('click', closeModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') closeModal();
    });
    modal.addEventListener('keydown', trapFocus);

    if (atcBtn) atcBtn.addEventListener('click', onATC);
  }

  /* ── Hotspot click ──────────────────────────────────────────── */
  function onHotspotClick() {
    var raw = this.dataset.product;
    if (!raw) return;
    var product;
    try { product = JSON.parse(raw); } catch (e) { return; }
    if (!product || !product.id) return;

    prevFocused = document.activeElement;
    populate(product, this.dataset.image || '');
    openModal();
  }

  /* ── Populate modal ─────────────────────────────────────────── */
  function populate(product, cardImg) {
    currentProduct  = product;
    selectedOptions = {};
    clearNotice();

    /* Image */
    var src = cardImg || product.featured_image || '';
    if (modalImg) {
      modalImg.src = src;
      modalImg.alt = product.title || '';
      modalImg.style.display = src ? '' : 'none';
    }

    /* Title / Price / Desc */
    if (modalTitle) modalTitle.textContent = product.title || '';
    if (modalDesc)  modalDesc.innerHTML    = product.description || '';
    if (modalPrice) modalPrice.textContent = product.price_formatted || '';

    /* Build option selectors */
    buildOptions(product);

    /* Pre-select first available variant */
    var opts = product.options_with_values || [];
    var firstAvail = (product.variants || []).find(function (v) { return v.available; }) || (product.variants || [])[0];
    if (firstAvail && opts.length) {
      opts.forEach(function (opt, idx) {
        selectedOptions[opt.name] = firstAvail['option' + (idx + 1)];
      });
      refreshPills();
      refreshVariantState();
    }
  }

  /* ── Build option rows ──────────────────────────────────────── */
  function buildOptions(product) {
    /* 
      The Figma modal shows options BELOW the image+body header row,
      then an ATC button. We inject into .tlb-modal__options which
      is inside .tlb-modal__panel but outside .tlb-modal__inner.
    */
    if (!optionsWrap) return;
    optionsWrap.innerHTML = '';

    /* Wrap to hold the styled option groups */
    var wrap = document.createElement('div');
    wrap.className = 'tlb-modal__options-wrap';

    var opts = product.options_with_values || [];
    opts.forEach(function (opt) {
      var group = document.createElement('div');
      group.className = 'tlb-modal__option-group';

      var label = document.createElement('span');
      label.className = 'tlb-modal__option-label';
      label.textContent = opt.name;
      group.appendChild(label);

      var vals = opt.values || [];

      /* Use pills for ≤6 values, select for more */
      if (vals.length <= 6) {
        var ul = document.createElement('ul');
        ul.className = 'tlb-modal__pills';
        ul.setAttribute('role', 'group');
        ul.setAttribute('aria-label', opt.name);

        vals.forEach(function (val) {
          var li  = document.createElement('li');
          li.className = 'tlb-modal__pill-li';
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'tlb-modal__pill';
          btn.textContent = val;
          btn.dataset.option = opt.name;
          btn.dataset.value  = val;
          btn.setAttribute('aria-label', opt.name + ': ' + val);

          btn.addEventListener('click', function () {
            selectedOptions[opt.name] = val;
            refreshPills();
            refreshVariantState();
          });

          li.appendChild(btn);
          ul.appendChild(li);
        });

        group.appendChild(ul);
      } else {
        var selWrap = document.createElement('div');
        selWrap.className = 'tlb-modal__select-wrap';

        var sel = document.createElement('select');
        sel.className = 'tlb-modal__select';
        sel.setAttribute('aria-label', opt.name);
        sel.dataset.option = opt.name;

        var ph = document.createElement('option');
        ph.value = ''; ph.disabled = true; ph.selected = true;
        ph.textContent = 'Choose ' + opt.name;
        sel.appendChild(ph);

        vals.forEach(function (val) {
          var o = document.createElement('option');
          o.value = val; o.textContent = val;
          sel.appendChild(o);
        });

        sel.addEventListener('change', function () {
          selectedOptions[opt.name] = this.value;
          refreshVariantState();
        });

        selWrap.appendChild(sel);
        group.appendChild(selWrap);
      }

      wrap.appendChild(group);
    });

    /* ATC wrap */
    var atcWrap = document.createElement('div');
    atcWrap.className = 'tlb-modal__atc-wrap';
    if (atcBtn) atcWrap.appendChild(atcBtn);
    wrap.appendChild(atcWrap);

    optionsWrap.appendChild(wrap);
  }

  /* ── Refresh pill selected / unavailable states ─────────────── */
  function refreshPills() {
    if (!optionsWrap || !currentProduct) return;
    optionsWrap.querySelectorAll('.tlb-modal__pill').forEach(function (pill) {
      var opt = pill.dataset.option;
      var val = pill.dataset.value;
      var isSelected = selectedOptions[opt] === val;
      pill.classList.toggle('tlb-modal__pill--selected', isSelected);
      pill.setAttribute('aria-pressed', isSelected ? 'true' : 'false');

      /* Check if this combination would be unavailable */
      var testOpts = Object.assign({}, selectedOptions);
      testOpts[opt] = val;
      var variant = findVariant(testOpts);
      pill.classList.toggle('tlb-modal__pill--unavailable', variant ? !variant.available : false);
    });
  }

  /* ── Find matching variant ──────────────────────────────────── */
  function findVariant(opts) {
    if (!currentProduct) return null;
    var optDefs = currentProduct.options_with_values || [];
    return (currentProduct.variants || []).find(function (v) {
      return optDefs.every(function (def, idx) {
        return opts[def.name] === undefined || v['option' + (idx + 1)] === opts[def.name];
      });
    }) || null;
  }

  /* ── Update price / availability / ATC state ────────────────── */
  function refreshVariantState() {
    if (!currentProduct) return;
    clearNotice();

    var variant = findVariant(selectedOptions);
    var allSelected = (currentProduct.options_with_values || []).every(function (o) {
      return selectedOptions[o.name] !== undefined;
    });

    /* Price */
    if (modalPrice) {
      modalPrice.textContent = variant
        ? (variant.price_formatted || currentProduct.price_formatted || '')
        : (currentProduct.price_formatted || '');
    }

    /* Availability */
    if (availEl) {
      if (variant && !variant.available) {
        availEl.textContent = 'Sold out';
      } else {
        availEl.textContent = '';
      }
    }

    /* ATC button */
    if (atcBtn) {
      var canAdd = allSelected && variant && variant.available;
      atcBtn.disabled = !canAdd;
      atcBtn.dataset.variantId = variant ? variant.id : '';
    }
  }

  /* ── Add to cart ─────────────────────────────────────────────── */
  function onATC() {
    if (!atcBtn || atcBtn.disabled) return;
    var variantId = parseInt(atcBtn.dataset.variantId, 10);
    if (!variantId) return;

    setLoading(true);
    clearNotice();

    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ id: variantId, quantity: 1 })
    })
      .then(function (res) {
        if (!res.ok) return res.json().then(function (d) { throw new Error(d.description || 'Error'); });
        return res.json();
      })
      .then(function () {
        setLoading(false);
        showNotice('Item added to cart! <a href="/cart" class="tlb-modal__notice-link">View cart</a>', 'success');
       // refreshDawnCart();
      })
      .catch(function (err) {
        setLoading(false);
        showNotice(err.message || 'Could not add to cart.', 'error');
      });
  }

  /* ── Dawn cart refresh ──────────────────────────────────────── */
  function refreshDawnCart() {
    var sectionsToFetch = ['cart-drawer', 'cart-icon-bubble'];

    fetch(window.Shopify.routes.root + '?sections=' + sectionsToFetch.join(','), {
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
      .then(function (res) { return res.json(); })
      .then(function (sections) {

        /* ── Update cart-icon-bubble (header cart count badge) ── */
        var bubbleHtml = sections['cart-icon-bubble'];
        if (bubbleHtml) {
          var bubbleEl = document.getElementById('cart-icon-bubble');
          if (bubbleEl) {
            var tmp = document.createElement('div');
            tmp.innerHTML = bubbleHtml;
            var newBubble = tmp.querySelector('#cart-icon-bubble');
            if (newBubble) bubbleEl.innerHTML = newBubble.innerHTML;
          }
        }

        /* ── Update cart-drawer and open it ─────────────────── */
        var drawerHtml = sections['cart-drawer'];
        if (drawerHtml) {
          var drawerEl = document.getElementById('cart-drawer');
          if (drawerEl) {
            var tmp2 = document.createElement('div');
            tmp2.innerHTML = drawerHtml;
            var newDrawer = tmp2.querySelector('#cart-drawer');
            if (newDrawer) drawerEl.innerHTML = newDrawer.innerHTML;
          }
        }

        /* ── Open the Dawn cart-drawer custom element ─────────── */
        var cartDrawer = document.querySelector('cart-drawer');
        if (cartDrawer) {
          /* Dawn's CartDrawer custom element exposes open() */
          if (typeof cartDrawer.open === 'function') {
            cartDrawer.open();
          } else {
            /* Fallback: dispatch the event Dawn listens for */
            cartDrawer.dispatchEvent(new CustomEvent('cart-drawer:open'));
          }
        }
      })
      .catch(function (err) {
        /* Soft fail — item was added, drawer just won't open */
        console.warn('Tisso Lookbook: could not refresh Dawn cart drawer.', err);
      });
  }


  /* ── Loading state ──────────────────────────────────────────── */
  function setLoading(on) {
    if (!atcBtn) return;
    atcBtn.disabled = on;
    var spinner = atcBtn.querySelector('.tlb-modal__atc-spinner');
    if (on) {
      if (atcLabel) atcLabel.textContent = 'Adding…';
      if (atcArrow) atcArrow.style.display = 'none';
      if (!spinner) {
        var sp = document.createElement('span');
        sp.className = 'tlb-modal__atc-spinner';
        sp.setAttribute('aria-hidden', 'true');
        atcBtn.appendChild(sp);
      }
    } else {
      if (atcLabel) atcLabel.textContent = 'ADD TO CART';
      if (atcArrow) atcArrow.style.display = '';
      if (spinner) spinner.remove();
    }
  }

  /* ── Notice ─────────────────────────────────────────────────── */
  function showNotice(msg, type) {
    if (!noticeEl) return;
    noticeEl.innerHTML = msg;
    noticeEl.className = 'tlb-modal__notice tlb-modal__notice--' + type;
    
    /* Handle click on dynamically added links */
    var link = noticeEl.querySelector('a');
    if (link) {
      link.addEventListener('click', function (e) {
        if (this.href) {
          window.location.href = this.href;
        }
      });
    }
  }
  function clearNotice() {
    if (!noticeEl) return;
    noticeEl.textContent = '';
    noticeEl.className = 'tlb-modal__notice';
  }

  /* ── Open / close ───────────────────────────────────────────── */
  function openModal() {
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { if (closeBtn) closeBtn.focus(); });
  }

  function closeModal() {
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    currentProduct = null; selectedOptions = {};
    if (prevFocused && prevFocused.focus) prevFocused.focus();
  }

  /* ── Focus trap ─────────────────────────────────────────────── */
  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    if (!modal || modal.getAttribute('aria-hidden') !== 'false') return;
    var focusable = Array.from(modal.querySelectorAll(
      'button:not(:disabled),[href],input:not(:disabled),select:not(:disabled),[tabindex]:not([tabindex="-1"])'
    ));
    if (!focusable.length) return;
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
    else            { if (document.activeElement === last)  { e.preventDefault(); first.focus(); } }
  }

  /* ── Start ──────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();