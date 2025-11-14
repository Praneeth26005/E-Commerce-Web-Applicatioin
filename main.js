// static/main.js
// Simple frontend enhancements for the simple-ecommerce Flask app.
// - AJAX add/remove cart
// - cart count update
// - quantity helpers & validation
// - simple client-side form validation
// - confirmation for checkout
// - small toast messages

document.addEventListener('DOMContentLoaded', () => {
  initAjaxCart();
  initQuantityControls();
  initFormValidation();
  initCheckoutConfirm();
});

/* -------------------------
   Helpers
   ------------------------- */
function showToast(message, type = 'info', timeout = 3000) {
  // small non-blocking message at top
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.position = 'fixed';
    container.style.top = '1rem';
    container.style.right = '1rem';
    container.style.zIndex = 9999;
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerText = message;
  Object.assign(el.style, {
    marginBottom: '8px',
    padding: '10px 14px',
    borderRadius: '8px',
    color: '#fff',
    background: type === 'success' ? '#059669' : type === 'danger' ? '#dc2626' : '#2563eb',
    boxShadow: '0 6px 20px rgba(2,6,23,0.08)',
    fontSize: '0.95rem'
  });
  container.appendChild(el);
  setTimeout(() => el.remove(), timeout);
}

function getCartCountFromHeader() {
  // Header shows: Cart (N)
  const cartLink = document.querySelector('a[href*="/cart"]');
  if (!cartLink) return 0;
  const txt = cartLink.textContent || '';
  const m = txt.match(/\((\d+)\)/);
  return m ? parseInt(m[1], 10) : 0;
}

function setCartCountInHeader(count) {
  const cartLink = document.querySelector('a[href*="/cart"]');
  if (!cartLink) return;
  // replace existing parentheses or append
  if (/\(\d+\)/.test(cartLink.textContent)) {
    cartLink.textContent = cartLink.textContent.replace(/\(\d+\)/, `(${count})`);
  } else {
    cartLink.textContent = `${cartLink.textContent} (${count})`;
  }
}

/* -------------------------
   AJAX cart (add/remove)
   ------------------------- */
function initAjaxCart() {
  // transform "Add to cart" forms to AJAX if they exist
  // Add button forms: <form action="/cart/add/<id>" method="post">...
  document.querySelectorAll('form[action^="/cart/add"]').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const action = form.getAttribute('action');
      const formData = new FormData(form);
      try {
        const res = await fetch(action, {
          method: 'POST',
          body: formData,
          headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        if (!res.ok) throw new Error('Network error');
        // success - update cart count locally
        const prev = getCartCountFromHeader();
        const qty = Number(formData.get('quantity')) || 1;
        setCartCountInHeader(prev + qty);
        showToast('Added to cart', 'success');
      } catch (err) {
        console.error('Add to cart failed', err);
        showToast('Failed to add to cart', 'danger');
      }
    });
  });

  // Remove buttons are forms action="/cart/remove/<id>" method="post"
  document.querySelectorAll('form[action^="/cart/remove"]').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const action = form.getAttribute('action');
      try {
        const res = await fetch(action, {
          method: 'POST',
          body: new FormData(form),
          headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        if (!res.ok) throw new Error('Network error');
        // On remove we don't know exact qty removed; subtract 1 if cart count >0
        let prev = getCartCountFromHeader();
        prev = Math.max(0, prev - 1);
        setCartCountInHeader(prev);
        // Optionally remove the row from the cart table
        const row = form.closest('tr');
        if (row) row.remove();
        showToast('Removed from cart', 'info');
      } catch (err) {
        console.error('Remove from cart failed', err);
        showToast('Failed to remove from cart', 'danger');
      }
    });
  });
}

/* -------------------------
   Quantity helpers
   ------------------------- */
function initQuantityControls() {
  // Add +/- controls next to numeric quantity inputs on product page if not present
  document.querySelectorAll('input[type="number"][name="quantity"]').forEach(input => {
    const parent = input.parentElement;
    if (!parent) return;
    // don't add twice
    if (parent.querySelector('.qty-control')) return;
    const wrap = document.createElement('div');
    wrap.className = 'qty-control';
    wrap.style.display = 'flex';
    wrap.style.alignItems = 'center';
    wrap.style.gap = '8px';
    const minus = document.createElement('button');
    minus.type = 'button';
    minus.innerText = '−';
    minus.className = 'qty-btn';
    minus.style.width = '36px';
    minus.style.height = '36px';
    minus.style.borderRadius = '6px';
    const plus = document.createElement('button');
    plus.type = 'button';
    plus.innerText = '+';
    plus.className = 'qty-btn';
    plus.style.width = '36px';
    plus.style.height = '36px';
    plus.style.borderRadius = '6px';
    input.style.width = '72px';
    wrap.appendChild(minus);
    wrap.appendChild(input);
    wrap.appendChild(plus);
    parent.appendChild(wrap);

    minus.addEventListener('click', () => {
      const min = Number(input.min) || 1;
      const cur = Number(input.value) || min;
      input.value = Math.max(min, cur - 1);
    });
    plus.addEventListener('click', () => {
      const max = Number(input.max) || 9999;
      const cur = Number(input.value) || 1;
      input.value = Math.min(max, cur + 1);
    });

    // ensure input respects bounds
    input.addEventListener('change', () => {
      const min = Number(input.min) || 1;
      const max = Number(input.max) || 9999;
      let v = Number(input.value) || min;
      if (v < min) v = min;
      if (v > max) v = max;
      input.value = v;
    });
  });
}

/* -------------------------
   Simple client-side form validation
   ------------------------- */
function initFormValidation() {
  // Register form
  const reg = document.querySelector('form[method="post"][action$="/register"], form[action="/register"]');
  if (reg) {
    reg.addEventListener('submit', (e) => {
      const name = reg.querySelector('input[name="name"]')?.value.trim();
      const email = reg.querySelector('input[name="email"]')?.value.trim();
      const pw = reg.querySelector('input[name="password"]')?.value || '';
      if (!name || !email || pw.length < 6) {
        e.preventDefault();
        showToast('Please fill all fields — password must be at least 6 characters.', 'danger');
      }
    });
  }

  // Login form
  const login = document.querySelector('form[method="post"][action$="/login"], form[action="/login"]');
  if (login) {
    login.addEventListener('submit', (e) => {
      const email = login.querySelector('input[name="email"]')?.value.trim();
      const pw = login.querySelector('input[name="password"]')?.value || '';
      if (!email || !pw) {
        e.preventDefault();
        showToast('Please enter email and password.', 'danger');
      }
    });
  }
}

/* -------------------------
   Checkout confirmation
   ------------------------- */
function initCheckoutConfirm() {
  const checkoutForm = document.querySelector('form[action$="/checkout"], form[action="/checkout/"]');
  if (!checkoutForm) return;
  checkoutForm.addEventListener('submit', (e) => {
    const ok = confirm('Place order? This demo does not process payments.');
    if (!ok) e.preventDefault();
  });
}

/* -------------------------
   Small CSS for toast (added dynamically)
   ------------------------- */
(function injectToastStyles() {
  if (document.getElementById('toast-styles')) return;
  const css = `
  /* toast container styles (fallback for small screens) */
  #toast-container { max-width: 320px; }
  @media (max-width: 480px) {
    #toast-container { left: 8px; right: 8px; top: 8px; }
  }
  `;
  const s = document.createElement('style');
  s.id = 'toast-styles';
  s.appendChild(document.createTextNode(css));
  document.head.appendChild(s);
})();
