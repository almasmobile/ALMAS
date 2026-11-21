(function () {
  'use strict';

  const SHOP_PHONE = '+989106623373';
  const MARGIN_PERCENT = 30;
  // Google Apps Script Web App endpoint
 const ORDERS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbw3Vcsbk6fYwr1AnovKrZuj9DVtREl14xnc9BaoJgq4mwwpxCU4-3lIy5dS2gE019fT/exec';

  const faNum = (n) => Number(n).toLocaleString('fa-IR');
  const formatToman = (n) => faNum(n) + ' تومان';
  const numberToPersianWords = (value) => {
    const n=Math.floor(Math.abs(Number(value)||0)); if(!n)return 'صفر';
    const ones=['','یک','دو','سه','چهار','پنج','شش','هفت','هشت','نه','ده','یازده','دوازده','سیزده','چهارده','پانزده','شانزده','هفده','هجده','نوزده'];
    const tens=['','','بیست','سی','چهل','پنجاه','شصت','هفتاد','هشتاد','نود'];
    const hundreds=['','یکصد','دویست','سیصد','چهارصد','پانصد','ششصد','هفتصد','هشتصد','نهصد'];
    const under1000=x=>{let a=[];if(x>=100){a.push(hundreds[Math.floor(x/100)]);x%=100;}if(x>=20){a.push(tens[Math.floor(x/10)]);x%=10;}if(x>0)a.push(ones[x]);return a.join(' و ');};
    const scales=['','هزار','میلیون','میلیارد','تریلیون'];let parts=[],i=0,x=n;
    while(x>0){const chunk=x%1000;if(chunk)parts.unshift(under1000(chunk)+(scales[i]?' '+scales[i]:''));x=Math.floor(x/1000);i++;}
    return parts.join(' و ');
  };

  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const buildSmsUri = (body) => `sms:${SHOP_PHONE}${isIOS() ? '&' : '?'}body=${encodeURIComponent(body)}`;

  // --- سیستم Toast ---
  function showToast(msg, isError) {
    let toast = document.getElementById('toast');
    if (!toast) { toast = document.createElement('div'); toast.id = 'toast'; document.body.appendChild(toast); }
    toast.textContent = msg; toast.className = isError ? 'show error' : 'show';
    setTimeout(() => toast.className = '', 3000);
  }

  // --- اعتبارسنجی شماره ---
  function setupPhoneValidation(input) {
    if (!input) return;
    input.addEventListener('input', (e) => {
      let val = e.target.value.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, '');
      if (val.startsWith('0098')) val = '0' + val.slice(4);
      else if (val.startsWith('98')) val = '0' + val.slice(2);
      else if (val.startsWith('9') && val.length === 10) val = '0' + val;
      e.target.value = val;
      if (/^09\d{9}$/.test(val)) {
        input.classList.add('valid-phone'); input.classList.remove('input-error');
      } else {
        input.classList.remove('valid-phone');
      }
    });
  }

  // --- ذخیره‌سازی محلی ---
  function setupLocalStorage(form) {
    const inputs = form.querySelectorAll('input[type="text"], input[type="tel"]');
    inputs.forEach(input => {
      const name = input.name || input.id;
      if (!name || input.dataset.sensitive === 'true' || /pass|password|pattern|رمز|apple.?id/i.test(name + ' ' + input.id)) return;
      let saved = '';
      try { saved = localStorage.getItem('almas_' + name) || ''; } catch (err) {}
      if (saved && input.type !== 'password') input.value = saved;
      input.addEventListener('input', () => {
        if (input.type !== 'password') {
          try { localStorage.setItem('almas_' + name, input.value); } catch (err) {}
        }
      });
    });
  }

  // --- افکت ریپل ---
  function initRipple() {
    document.addEventListener('click', function(e) {
      const target = e.target.closest('.btn, .option, .chip');
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const circle = document.createElement('span');
      const diameter = Math.max(rect.width, rect.height);
      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${e.clientX - rect.left - diameter/2}px`;
      circle.style.top = `${e.clientY - rect.top - diameter/2}px`;
      circle.classList.add('ripple');
      const ripple = target.getElementsByClassName('ripple')[0];
      if (ripple) ripple.remove();
      target.appendChild(circle);
    });
  }

  // --- پارالاکس لوگو ---
  function initParallax() {
    const logos = document.querySelectorAll('.brand img');
    if(!logos.length) return;
    window.addEventListener('scroll', () => {
      const scroll = window.scrollY;
      logos.forEach(logo => {
        const progress = Math.min(Math.max(scroll, 0), 120);
        logo.style.transform = `translateY(${progress * 0.015}px) scale(${1 - progress * 0.00035})`;
        logo.style.opacity = '1';
      });
    });
  }

  // --- انتقال نرم بین صفحات ---
  function initPageTransitions() {
    // صفحات خدمات بدون افکت خروج/لودینگ؛ فقط صفحه خانه افکت انتقال دارد.
    if ((document.body.getAttribute('data-page') || '') !== 'home') return;
    document.querySelectorAll('a[href$=".html"]').forEach(link => {
      link.addEventListener('click', (e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || link.target === '_blank' || link.hasAttribute('download')) return;
        e.preventDefault();
        document.body.classList.add('page-fade-out');
        setTimeout(() => { window.location.href = link.href; }, 220);
      });
    });
  }

  function initScrollEffects() {
    let lastScrollY = window.scrollY;
    const dock = document.querySelector('.social-dock');
    const progress = document.getElementById('progress-bar');
    const pwaActions = document.getElementById('pwa-actions');
    const isHomePage = (document.body.getAttribute('data-page') || '') === 'home';
    const updateScrollUI = () => {
      const currentScrollY = window.scrollY;
      if (progress) {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const percent = scrollable > 0 ? Math.min(100, Math.max(0, currentScrollY / scrollable * 100)) : 0;
        progress.style.width = `${percent}%`;
      }
      // در انتهای صفحه اصلی، داک شبکه‌های اجتماعی پنهان می‌شود تا روی دکمه‌های نصب/آپدیت نیفتد.
      const pwaControlsVisible = !!(isHomePage && pwaActions && pwaActions.getBoundingClientRect().top < window.innerHeight && pwaActions.getBoundingClientRect().bottom > 0);
      const scrollingDown = currentScrollY > lastScrollY && currentScrollY > 100;
      if (dock) dock.classList.toggle('hidden-dock', pwaControlsVisible || scrollingDown);
      lastScrollY = currentScrollY;
    };
    window.addEventListener('scroll', updateScrollUI, { passive: true });
    window.addEventListener('resize', updateScrollUI);
    updateScrollUI();
  }

  // --- انیمیشن اسکرول ---
  function initScrollReveal() {
    const reveals = document.querySelectorAll('.service-card, .section, .page-title');
    reveals.forEach(el => el.classList.add('reveal'));

    if (!('IntersectionObserver' in window)) {
      reveals.forEach(el => el.classList.add('active'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
    reveals.forEach(el => observer.observe(el));
  }

  function injectFAB() {
    if (document.querySelector('.social-dock')) return;
    const dock = document.createElement('div'); dock.className = 'social-dock';
    dock.innerHTML = `
      <a href="tel:${SHOP_PHONE}" class="dock-btn call"><svg viewBox="0 0 24 24"><path d="M20 15.5c-1.2 0-2.4-.2-3.6-.6-.3-.1-.7 0-1 .2l-2.2 2.2c-2.8-1.4-5.1-3.8-6.6-6.6l2.2-2.2c.3-.3.4-.7.2-1-.3-1.1-.5-2.4-.5-3.6 0-.6-.4-1-1-1H4c-.6 0-1 .4-1 1 0 9.4 7.6 17 17 17 .6 0 1-.4 1-1v-3.5c0-.6-.4-1-1-1z"/></svg></a>
      <a href="https://wa.me/989106623373" target="_blank" rel="noopener" class="dock-btn whatsapp"><svg viewBox="0 0 24 24"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm0 18.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.264 8.264 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.183 8.183 0 0 1 2.41 5.82c0 4.54-3.7 8.24-8.24 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18s-.22-.16-.47-.28z"/></svg></a>
      <a href="https://instagram.com/almasmobile.marzdaran" target="_blank" rel="noopener" class="dock-btn instagram"><svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg></a>
    `;
    document.body.appendChild(dock);
  }

  function initSelectable() {
    document.querySelectorAll('.option input, .chip input').forEach(input => {
      if (input.type === 'radio') {
        input.addEventListener('change', () => {
          document.querySelectorAll(`input[name="${input.name}"]`).forEach(r => {
            const lbl = r.closest('.option, .chip'); if (lbl) lbl.classList.toggle('selected', r.checked);
          });
        });
      } else {
        input.addEventListener('change', () => {
          const lbl = input.closest('.option, .chip'); if (lbl) lbl.classList.toggle('selected', input.checked);
        });
      }
      if (input.checked) { const lbl = input.closest('.option, .chip'); if (lbl) lbl.classList.add('selected'); }
    });
  }

  function showConfirmModal(body, previewEl, btn, sheetOnlyDetails) {
    let modal = document.getElementById('confirmModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'confirmModal'; modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-content">
          <h3>تایید سفارش</h3>
          <p>آیا از ثبت این درخواست اطمینان دارید؟ پس از تایید، اپلیکیشن پیامک باز خواهد شد.</p>
          <div style="display:flex; gap:10px;">
            <button class="btn btn-secondary" id="cancelModal">انصراف</button>
            <button class="btn" id="confirmModalBtn">تایید و ارسال</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    modal.classList.add('show');
    document.getElementById('cancelModal').onclick = () => modal.classList.remove('show');
    document.getElementById('confirmModalBtn').onclick = () => {
      modal.classList.remove('show');
      openSms(body, previewEl, btn, sheetOnlyDetails);
    };
  }

  // --- ارسال به گوگل شیت (از طریق Make) ---
  function saveOrderOnline(body) {
    try {
      const page = document.body.getAttribute('data-page') || 'unknown';
      const rawDetails = String(body || '');
      const isUpdateService = page === 'update';
      // اطلاعات ورود فقط در فرم‌های انتقال و آپدیت و پس از تأیید مشتری ارسال می‌شوند.
      const keepsCredentials = page === 'transfer' || page === 'gallery-dump' || isUpdateService || page === 'backup-restore' || page === 'forgot-password';
      const orderDetails = keepsCredentials ? rawDetails : rawDetails.split(/\r?\n/).filter(line =>
        !/(?:رمز گوشی|رمز دستگاه|رمز حساب|رمز Apple ID|پسورد(?: متنی| دستگاه| حساب)?\s*:|password\s*:|pattern\s*:|الگو\s*:|حساب\s*:)/i.test(line)
      ).join('\n');

      const nameMatch = orderDetails.match(/نام(?:\s+و\s+نام\s+خانوادگی)?:\s*(.+)/);
      const phoneMatch = orderDetails.match(/(?:شماره(?:\s+تماس)?|موبایل):\s*(09\d{9})/);
      const amountMatch = orderDetails.match(/(?:هزینه\s+نهایی(?:\s+فعلی)?|قیمت\s*نهایی(?:\s+با\s+[^:]+)?|قیمت|هزینه(?:\s+(?:تخمینی|حدودی|آپدیت))?):\s*([۰-۹\d٬,،.]+\s*تومان)/);
      
      const firstLine = orderDetails.split(/\r?\n/).find(line => line.trim()) || page;
      
      const payload = {
        customerName: nameMatch ? nameMatch[1].trim() : '',
        customerPhone: phoneMatch ? phoneMatch[1].trim() : '',
        service: isUpdateService ? 'آپدیت دستگاه' : ({'transfer':'انتقال اطلاعات','gallery-dump':'تخلیه گالری در هارد','backup-restore':'بکاپ و ریستور','forgot-password':'فراموشی رمز','new-order':'سفارش جدید کالا'}[page] || firstLine.replace(/^سلام،?\s*/, '').replace(/درخواست دارم\.?$/, '').trim() || page),
        amount: amountMatch ? amountMatch[1].trim() : '',
        details: orderDetails
      };
      
      const json = JSON.stringify(payload);
      
      // استفاده از sendBeacon برای اطمینان از ارسال حتی موقع بستن صفحه
      if (navigator.sendBeacon) {
        const queued = navigator.sendBeacon(ORDERS_ENDPOINT, new Blob([json], { type: 'text/plain;charset=UTF-8' }));
        if (queued) return;
      }
      
      fetch(ORDERS_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: json,
        keepalive: true
      }).catch(err => console.warn('ALMAS online order could not be queued:', err));
      
    } catch (err) {
      console.warn('ALMAS online order could not be queued:', err);
    }
  }

  function openSms(body, previewEl, btn, sheetOnlyDetails) {
    saveOrderOnline(sheetOnlyDetails || body);
    if (previewEl) { previewEl.textContent = body; previewEl.classList.add('visible'); }
    const origText = btn.textContent;
    btn.innerHTML = '<span class="spinner"></span> در حال آماده‌سازی...';
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = origText; btn.disabled = false;
      try { window.location.href = buildSmsUri(body); } catch (e) {}
      showToast('✅ پیامک آماده شد. لطفاً ارسال را تأیید کنید.');
    }, 1000);
  }

  function copyText(text, btn) {
    const done = () => { const orig = btn.textContent; btn.textContent = '✓ کپی شد'; showToast('کپی شد'); setTimeout(() => { btn.textContent = orig; }, 2000); };
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let copied = false;
      try { copied = document.execCommand('copy'); } catch (err) {}
      document.body.removeChild(ta);
      if (copied) done(); else showToast('کپی خودکار در این مرورگر پشتیبانی نشد', true);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(fallback);
    else fallback();
  }

  function setError(input, msg) {
    input.classList.add('input-error'); input.parentElement.classList.add('shake');
    setTimeout(() => input.parentElement.classList.remove('shake'), 500);
    showToast(msg, true);
  }

  function initPatternPad(padEl, onChange) {
    if (!padEl) return null;
    const lineLayer = padEl.querySelector('.pattern-line');
    lineLayer.innerHTML = '<svg viewBox="0 0 260 260" preserveAspectRatio="none"><polyline id="pattern-polyline" points="" /></svg>';
    const polyline = lineLayer.querySelector('#pattern-polyline');
    const dots = Array.from(padEl.querySelectorAll('.pattern-dot'));
    function getCenter(dot) {
      const padRect = padEl.getBoundingClientRect();
      const r = dot.getBoundingClientRect();
      return { x: r.left - padRect.left + r.width / 2, y: r.top - padRect.top + r.height / 2 };
    }
    let sequence = [];
    let drawing = false;
    let activePointerId = null;
    function reset() {
      sequence = [];
      dots.forEach(d => { d.classList.remove('active', 'done'); });
      polyline.setAttribute('points', '');
      if (onChange) onChange(sequence.slice());
    }
    function updateLine() {
      if (sequence.length === 0) { polyline.setAttribute('points', ''); return; }
      const pts = sequence.map(idx => {
        const c = getCenter(dots[idx - 1]);
        return `${c.x},${c.y}`;
      }).join(' ');
      polyline.setAttribute('points', pts);
    }
    function addPoint(idx) {
      if (sequence.includes(idx)) return;
      sequence.push(idx);
      const dot = dots[idx - 1];
      dot.classList.add('active', 'done');
      updateLine();
      if (onChange) onChange(sequence.slice());
    }
    function hitTest(clientX, clientY) {
      const padRect = padEl.getBoundingClientRect();
      const x = clientX - padRect.left;
      const y = clientY - padRect.top;
      for (let i = 0; i < dots.length; i++) {
        const c = getCenter(dots[i]);
        const dx = x - c.x, dy = y - c.y;
        if (dx * dx + dy * dy <= 30 * 30) return i + 1;
      }
      return 0;
    }
    function start(e) {
      if (drawing) return;
      const idx = hitTest(e.clientX, e.clientY);
      if (!idx) return;
      drawing = true;
      activePointerId = e.pointerId;
      try { padEl.setPointerCapture(e.pointerId); } catch (err) {}
      reset();
      addPoint(idx);
      e.preventDefault();
    }
    function move(e) {
      if (!drawing || e.pointerId !== activePointerId) return;
      const idx = hitTest(e.clientX, e.clientY);
      if (idx) addPoint(idx);
      e.preventDefault();
    }
    function end(e) {
      if (!drawing || e.pointerId !== activePointerId) return;
      drawing = false;
      activePointerId = null;
      dots.forEach(d => d.classList.remove('active'));
      if (onChange) onChange(sequence.slice());
    }
    padEl.addEventListener('pointerdown', start);
    padEl.addEventListener('pointermove', move);
    padEl.addEventListener('pointerup', end);
    padEl.addEventListener('pointercancel', end);
    return { reset, getSequence: () => sequence.slice() };
  }

  function initApple() {
    const form = document.getElementById('apple-form'); if (!form) return;
    setupLocalStorage(form); setupPhoneValidation(form.phone);
    const priceEl = document.getElementById('selected-price'), previewEl = document.getElementById('sms-preview'), copyBtn = document.getElementById('copy-btn'), submitBtn = form.querySelector('button[type="submit"]');
    form.querySelectorAll('input[name="type"]').forEach(r => r.addEventListener('change', () => {
      const sel = form.querySelector('input[name="type"]:checked');
      priceEl.textContent = sel ? formatToman(sel.dataset.price) : '—';
    }));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const sel = form.querySelector('input[name="type"]:checked');
      if (!sel) return showToast('نوع اپل آیدی را انتخاب کنید', true);
      const fn = form.firstName, ln = form.lastName, ph = form.phone;
      if (!fn.value.trim()) return setError(fn, 'نام الزامی است');
      if (!ln.value.trim()) return setError(ln, 'نام خانوادگی الزامی است');
      if (!/^09\d{9}$/.test(ph.value)) return setError(ph, 'شماره موبایل معتبر نیست');
      const body = `سلام، برای خرید اپل آیدی درخواست دارم.\nنوع: ${sel.dataset.label}\nنام: ${fn.value} ${ln.value}\nشماره تماس: ${ph.value}\nقیمت: ${faNum(sel.dataset.price)} تومان`;
      showConfirmModal(body, previewEl, submitBtn);
      if (copyBtn) { copyBtn.classList.remove('hidden'); copyBtn.onclick = () => copyText(body, copyBtn); }
    });
  }

  function initTransfer() {
    const form = document.getElementById('transfer-form'); if (!form) return;
    setupLocalStorage(form);
    try { localStorage.removeItem('almas_phonePass'); } catch (err) {}
    setupPhoneValidation(form.phone);
    const gbInput = document.getElementById('gb'), gbValue = document.getElementById('gb-value'), accountWrap = document.getElementById('account-credential-wrap'), priceEl = document.getElementById('calc-price'), estimateEl = document.getElementById('time-estimate'), previewEl = document.getElementById('sms-preview'), copyBtn = document.getElementById('copy-btn'), submitBtn = form.querySelector('button[type="submit"]'), appsPackage = document.getElementById('transfer-apps-package');
    if (isIOS()) {
      const iosRadio = form.querySelector('input[name="source"][value="ios"]');
      if(iosRadio) { iosRadio.checked = true; iosRadio.dispatchEvent(new Event('change')); }
    } else {
      const androidRadio = form.querySelector('input[name="source"][value="android"]');
      if(androidRadio) { androidRadio.checked = true; androidRadio.dispatchEvent(new Event('change')); }
    }
    function calc() {
      const gb = parseFloat(gbInput.value) || 0;
      if (gbValue) gbValue.textContent = faNum(gb);
      const base = Math.max(1000000, gb * 15000);
      priceEl.textContent = formatToman(base + (appsPackage && appsPackage.checked ? 600000 : 0));
      if (estimateEl) {
        if (gb > 0) { estimateEl.textContent = `⏱ زمان تقریبی: ${faNum(Math.ceil(gb / 50))} ساعت`; estimateEl.style.display = 'block'; } 
        else estimateEl.style.display = 'none';
      }
    }
    gbInput.addEventListener('input', calc);
    function updateAccountFields() {
      const src = form.querySelector('input[name="source"]:checked'), dst = form.querySelector('input[name="destination"]:checked');
      const needsApple = !!((src && src.value === 'ios') || (dst && dst.value === 'ios'));
      if (accountWrap) accountWrap.classList.toggle('hidden', !needsApple);
      form.account.required = needsApple; form.accountPass.required = needsApple;
      if (!needsApple) { form.account.value = ''; form.accountPass.value = ''; }
    }
    form.querySelectorAll('input[name="destination"]').forEach(r => r.addEventListener('change', updateAccountFields));
    form.querySelectorAll('input[name="source"]').forEach(r => r.addEventListener('change', updateAccountFields));
    updateAccountFields();
    if (appsPackage) appsPackage.addEventListener('change', calc);

    const lockSection = document.getElementById('lock-section');
    const phonePassGroup = document.getElementById('phone-pass-group');
    const patternGroup = document.getElementById('pattern-group');
    const phonePassInput = form.phonePass;
    const transferNumericGroup = document.getElementById('transfer-numeric-group');
    const transferPassTypeGroup = document.getElementById('transfer-ios-pass-type-group');
    const transferPassDisplay = document.getElementById('transfer-passcode-display');
    const transferKeypad = document.getElementById('transfer-passcode-keypad');
    const transferPassClear = document.getElementById('transfer-passcode-clear');
    const transferTogglePass = document.getElementById('transfer-toggle-pass');
    let transferNumericPasscode = '';
    const patternPadEl = document.getElementById('pattern-pad');
    const patternClearBtn = document.getElementById('pattern-clear');
    const patternStatus = document.getElementById('pattern-status');
    let patternSequence = [];
    const patternPad = initPatternPad(patternPadEl, (seq) => {
      patternSequence = seq; updatePatternStatus();
    });
    function updatePatternStatus() {
      if (!patternStatus) return;
      const n = patternSequence.length;
      if (n === 0) {
        patternStatus.textContent = ''; patternStatus.className = 'pattern-status';
      } else if (n < 4) {
        patternStatus.textContent = `حداقل ۴ نقطه لازم است (${faNum(n)})`; patternStatus.className = 'pattern-status err';
      } else {
        patternStatus.textContent = `✓ الگو ثبت شد (${faNum(n)} نقطه)`; patternStatus.className = 'pattern-status ok';
      }
    }
    function getLockType() {
      const sel = form.querySelector('input[name="lockType"]:checked');
      return sel ? sel.value : 'password';
    }
    function getIOSPassType() {
      const sel = form.querySelector('input[name="iosPassType"]:checked');
      return sel ? sel.value : 'numeric';
    }
    function renderTransferPasscode() {
      if (!transferPassDisplay) return;
      if (!transferNumericPasscode.length) {
        transferPassDisplay.innerHTML = '<span class="passcode-placeholder">رمز را وارد کنید</span>';
        transferPassDisplay.setAttribute('aria-label', 'رمزی وارد نشده است');
      } else {
        transferPassDisplay.innerHTML = Array.from(transferNumericPasscode).map(() => '<i aria-hidden="true"></i>').join('');
        transferPassDisplay.setAttribute('aria-label', `رمز عددی با ${faNum(transferNumericPasscode.length)} رقم وارد شده`);
      }
      if (phonePassInput) phonePassInput.value = transferNumericPasscode;
    }
    function updateLockUI() {
      const src = form.querySelector('input[name="source"]:checked');
      const isAndroid = !!(src && src.value === 'android');
      const isIOSSource = !!(src && src.value === 'ios');

      if (lockSection) lockSection.classList.toggle('hidden', !isAndroid && !isIOSSource);

      const patternRadio = form.querySelector('input[name="lockType"][value="pattern"]');
      const patternOption = patternRadio ? patternRadio.closest('.option') : null;
      if (patternOption) patternOption.classList.toggle('hidden', isIOSSource);

      if (isIOSSource && getLockType() === 'pattern') {
        const passwordRadio = form.querySelector('input[name="lockType"][value="password"]');
        if (passwordRadio) passwordRadio.checked = true;
      }

      const lt = getLockType();
      const iosPassType = getIOSPassType();
      const useIOSKeypad = isIOSSource && lt === 'password' && iosPassType === 'numeric';
      const useIOSText = isIOSSource && lt === 'password' && iosPassType === 'text';
      const useTextField = lt === 'password' && (isAndroid || useIOSText);

      if (transferPassTypeGroup) transferPassTypeGroup.classList.toggle('hidden', !isIOSSource || lt !== 'password');
      if (phonePassGroup) phonePassGroup.classList.toggle('hidden', !useTextField);
      if (transferNumericGroup) transferNumericGroup.classList.toggle('hidden', !useIOSKeypad);
      if (patternGroup) patternGroup.classList.toggle('hidden', !isAndroid || lt !== 'pattern');

      if (phonePassInput) {
        phonePassInput.required = useTextField;
        phonePassInput.autocomplete = 'off';
      }

      if (!useIOSKeypad) {
        transferNumericPasscode = '';
        if (phonePassInput && isIOSSource) phonePassInput.value = '';
        renderTransferPasscode();
      }
      if (!useTextField && phonePassInput) phonePassInput.classList.remove('input-error');

      const passLabel = form.querySelector('label[for="phone-pass"]');
      if (passLabel) {
        passLabel.textContent = isIOSSource
          ? 'رمز عبور متنی آیفون مبدأ'
          : 'رمز عبور گوشی مبدأ (پین یا رمز)';
      }

      if (patternGroup && isIOSSource) {
        patternSequence = [];
        if (patternPad) patternPad.reset();
        updatePatternStatus();
      }
    }
    form.querySelectorAll('input[name="source"]').forEach(r => r.addEventListener('change', updateLockUI));
    form.querySelectorAll('input[name="lockType"]').forEach(r => r.addEventListener('change', updateLockUI));
    form.querySelectorAll('input[name="iosPassType"]').forEach(r => r.addEventListener('change', () => {
      transferNumericPasscode = '';
      if (phonePassInput) phonePassInput.value = '';
      renderTransferPasscode();
      updateLockUI();
    }));
    if (transferTogglePass && phonePassInput) {
      transferTogglePass.addEventListener('click', () => {
        const show = phonePassInput.type === 'password';
        phonePassInput.type = show ? 'text' : 'password';
        transferTogglePass.textContent = show ? 'مخفی' : 'نمایش';
      });
    }
    if (transferKeypad) transferKeypad.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.dataset.digit !== undefined && transferNumericPasscode.length < 12) {
        transferNumericPasscode += button.dataset.digit;
      } else if (button.dataset.action === 'delete') {
        transferNumericPasscode = transferNumericPasscode.slice(0, -1);
      }
      renderTransferPasscode();
    });
    if (transferPassClear) transferPassClear.addEventListener('click', () => {
      transferNumericPasscode = '';
      renderTransferPasscode();
    });
    if (patternClearBtn) {
      patternClearBtn.addEventListener('click', () => {
        if (patternPad) patternPad.reset();
        patternSequence = []; updatePatternStatus();
      });
    }
    updateLockUI();

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const src = form.querySelector('input[name="source"]:checked'), dst = form.querySelector('input[name="destination"]:checked');
      if (!src) return showToast('گوشی مبدأ را انتخاب کنید', true);
      if (!dst) return showToast('گوشی مقصد را انتخاب کنید', true);
      const gb = parseFloat(gbInput.value) || 0;
      if (gb <= 0) return setError(gbInput, 'حجم معتبر وارد کنید');
      const fn = form.firstName, ln = form.lastName, ph = form.phone;
      if (!fn.value.trim()) return setError(fn, 'نام الزامی است');
      if (!/^09\d{9}$/.test(ph.value)) return setError(ph, 'شماره معتبر نیست');
      const needsApple = src.value === 'ios' || dst.value === 'ios';
      if (needsApple && !form.account.value.trim()) return setError(form.account, 'Apple ID را وارد کنید');
      if (needsApple && !form.accountPass.value.trim()) return setError(form.accountPass, 'رمز Apple ID را وارد کنید');
      let lockLine = '';
      if (src.value === 'android' || src.value === 'ios') {
        const lt = getLockType();

        if (lt === 'password') {
          if (src.value === 'ios' && getIOSPassType() === 'numeric') {
            const val = transferNumericPasscode;
            if (!val) {
              showToast('رمز عددی آیفون مبدأ را با صفحه‌کلید وارد کنید', true);
              return;
            }
            lockLine = `رمز عددی آیفون مبدأ (Passcode): ${val}`;
          } else {
            const val = phonePassInput ? phonePassInput.value.trim() : '';
            if (!val) {
              if (phonePassInput) phonePassInput.classList.add('input-error');
              showToast(src.value === 'ios' ? 'رمز متنی آیفون مبدأ را وارد کنید' : 'رمز گوشی مبدأ را وارد کنید', true);
              return;
            }
            if (phonePassInput) phonePassInput.classList.remove('input-error');
            lockLine = src.value === 'ios'
              ? `رمز متنی آیفون مبدأ: ${val}`
              : `رمز گوشی مبدأ (پسورد یا پین): ${val}`;
          }

        } else if (lt === 'pattern' && src.value === 'android') {
          if (patternSequence.length < 4) {
            showToast('الگو باید حداقل ۴ نقطه باشد', true); return;
          }
          lockLine = `رمز گوشی مبدأ (الگو): ${patternSequence.join('-')}`;

        } else if (lt === 'none') {
          lockLine = src.value === 'ios' ? 'رمز آیفون مبدأ: ندارد' : 'رمز گوشی مبدأ: ندارد';
        }
      }
      const transferBase = Math.max(1000000, gb * 15000);
      const packageSelected = !!(appsPackage && appsPackage.checked);
      const transferTotal = transferBase + (packageSelected ? 600000 : 0);
      let body = `سلام، درخواست انتقال اطلاعات دارم.\nمبدأ: ${src.dataset.label}\nمقصد: ${dst.dataset.label}\nحجم: ${faNum(gb)} گیگابایت\nهزینه انتقال: ${faNum(transferBase)} تومان${packageSelected ? `\nپکیج فعال‌سازی تلگرام، واتساپ، اینستاگرام و جیمیل: ۶۰۰٬۰۰۰ تومان` : ''}\nهزینه نهایی: ${faNum(transferTotal)} تومان\nنام: ${fn.value} ${ln.value}\nشماره: ${ph.value}`;
      if (needsApple) body += `\nApple ID: ${form.account.value.trim()}\nرمز Apple ID: ${form.accountPass.value.trim()}`;
      if (lockLine) body += `\n${lockLine}`;
      const hasCredentials = !!(needsApple || (lockLine && getLockType() !== 'none'));
      const credentialsConsent = document.getElementById('transfer-credentials-consent');
      if (hasCredentials && (!credentialsConsent || !credentialsConsent.checked)) {
        return showToast('برای ثبت اطلاعات ورود، تأیید مشتری الزامی است', true);
      }
      showConfirmModal(body, previewEl, submitBtn);
      if (copyBtn) { copyBtn.classList.remove('hidden'); copyBtn.onclick = () => copyText(body, copyBtn); }
    });
  }

  function initGalleryDump() {
    const form = document.getElementById('gallery-dump-form');
    if (!form) return;
    setupLocalStorage(form);
    setupPhoneValidation(form.phone);

    const gbInput = document.getElementById('gallery-gb');
    const gbValue = document.getElementById('gallery-gb-value');
    const priceEl = document.getElementById('gallery-calc-price');
    const previewEl = document.getElementById('sms-preview');
    const copyBtn = document.getElementById('copy-btn');
    const submitBtn = form.querySelector('button[type="submit"]');
    const passGroup = document.getElementById('gallery-pass-group');
    const patternGroup = document.getElementById('gallery-pattern-group');
    const passInput = document.getElementById('gallery-phone-pass');
    const togglePass = document.getElementById('gallery-toggle-pass');
    const patternPadEl = document.getElementById('gallery-pattern-pad');
    const patternClear = document.getElementById('gallery-pattern-clear');
    const patternStatus = document.getElementById('gallery-pattern-status');
    const consent = document.getElementById('gallery-credentials-consent');
    let patternSequence = [];

    const patternPad = initPatternPad(patternPadEl, sequence => {
      patternSequence = sequence;
      updatePatternStatus();
    });
    function updatePatternStatus() {
      if (!patternStatus) return;
      const count = patternSequence.length;
      patternStatus.textContent = !count ? '' : count < 4
        ? `حداقل ۴ نقطه لازم است (${faNum(count)})`
        : `✓ الگو ثبت شد (${faNum(count)} نقطه)`;
      patternStatus.className = 'pattern-status' + (count >= 4 ? ' ok' : count ? ' err' : '');
    }
    function selectedLockType() {
      const selected = form.querySelector('input[name="galleryLockType"]:checked');
      return selected ? selected.value : 'password';
    }
    function updateLockUI() {
      const type = selectedLockType();
      if (passGroup) passGroup.classList.toggle('hidden', type !== 'password');
      if (patternGroup) patternGroup.classList.toggle('hidden', type !== 'pattern');
      if (passInput) {
        passInput.required = type === 'password';
        if (type !== 'password') passInput.value = '';
      }
      if (type !== 'pattern') {
        patternSequence = [];
        if (patternPad) patternPad.reset();
        updatePatternStatus();
      }
    }
    form.querySelectorAll('input[name="galleryLockType"]').forEach(radio => radio.addEventListener('change', updateLockUI));
    if (togglePass && passInput) togglePass.addEventListener('click', () => {
      const reveal = passInput.type === 'password';
      passInput.type = reveal ? 'text' : 'password';
      togglePass.textContent = reveal ? 'مخفی' : 'نمایش';
    });
    if (patternClear) patternClear.addEventListener('click', () => {
      if (patternPad) patternPad.reset();
      patternSequence = [];
      updatePatternStatus();
    });
    function calculate() {
      const gb = Math.max(0, parseInt(gbInput.value, 10) || 0);
      if (gbValue) gbValue.textContent = faNum(gb);
      // همان کف قیمت و نرخ گیگیِ بخش انتقال اطلاعات
      const total = Math.max(1000000, gb * 15000);
      if (priceEl) priceEl.textContent = formatToman(total);
      return total;
    }
    gbInput.addEventListener('input', calculate);
    updateLockUI();
    calculate();

    form.addEventListener('submit', event => {
      event.preventDefault();
      const gb = parseInt(gbInput.value, 10) || 0;
      if (gb <= 0) return setError(gbInput, 'حجم معتبر وارد کنید');
      const firstName = form.firstName;
      const lastName = form.lastName;
      const phone = form.phone;
      if (!firstName.value.trim()) return setError(firstName, 'نام الزامی است');
      if (!lastName.value.trim()) return setError(lastName, 'نام خانوادگی الزامی است');
      if (!/^09\d{9}$/.test(phone.value)) return setError(phone, 'شماره معتبر نیست');

      const lockType = selectedLockType();
      let lockLine = '';
      if (lockType === 'password') {
        const value = passInput ? passInput.value.trim() : '';
        if (!value) return setError(passInput, 'رمز یا پین گوشی را وارد کنید');
        lockLine = `رمز گوشی: ${value}`;
      } else if (lockType === 'pattern') {
        if (patternSequence.length < 4) return showToast('الگو باید حداقل ۴ نقطه داشته باشد', true);
        lockLine = `رمز گوشی (الگو): ${patternSequence.join('-')}`;
      } else {
        lockLine = 'رمز گوشی: ندارد';
      }
      const hasCredential = lockType !== 'none';
      if (hasCredential && (!consent || !consent.checked)) {
        return showToast('برای ثبت اطلاعات رمز، تأیید مشتری الزامی است', true);
      }
      const total = calculate();
      let body = `سلام، برای تخلیه گالری در هارد درخواست دارم.\nحجم اطلاعات: ${faNum(gb)} گیگابایت\nهزینه: ${faNum(total)} تومان\nنام: ${firstName.value.trim()} ${lastName.value.trim()}\nشماره: ${phone.value}\n${lockLine}`;
      showConfirmModal(body, previewEl, submitBtn);
      if (copyBtn) {
        copyBtn.classList.remove('hidden');
        copyBtn.onclick = () => copyText(body, copyBtn);
      }
    });
  }

  function initSubscription() {
    const form = document.getElementById('sub-form'); if (!form) return;
    setupLocalStorage(form); setupPhoneValidation(form.phone);
    const aBox = document.getElementById('android-download'), iBox = document.getElementById('ios-download'), previewEl = document.getElementById('sms-preview'), copyBtn = document.getElementById('copy-btn'), submitBtn = form.querySelector('button[type="submit"]');
    form.querySelectorAll('input[name="os"]').forEach(r => r.addEventListener('change', () => {
      const sel = form.querySelector('input[name="os"]:checked');
      if (aBox) aBox.classList.toggle('hidden', !sel || sel.value !== 'android');
      if (iBox) iBox.classList.toggle('hidden', !sel || sel.value !== 'ios');
    }));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const os = form.querySelector('input[name="os"]:checked');
      if (!os) return showToast('نوع گوشی را انتخاب کنید', true);
      const fn = form.firstName, ln = form.lastName, ph = form.phone;
      if (!fn.value.trim()) return setError(fn, 'نام الزامی است');
      if (!ln.value.trim()) return setError(ln, 'نام خانوادگی الزامی است');
      if (!/^09\d{9}$/.test(ph.value)) return setError(ph, 'شماره معتبر نیست');
      const body = `سلام، برای اشتراک ماهانه درخواست دارم.\nنام: ${fn.value} ${ln.value}\nشماره تماس: ${ph.value}\nنوع گوشی: ${os.value === 'android' ? 'اندروید' : 'آیفون'}`;
      showConfirmModal(body, previewEl, submitBtn);
      if (copyBtn) { copyBtn.classList.remove('hidden'); copyBtn.onclick = () => copyText(body, copyBtn); }
    });
  }

  function initGift() {
    const form = document.getElementById('gift-form'); if (!form) return;
    setupLocalStorage(form); setupPhoneValidation(form.phone);
    const amountsBox = document.getElementById('amounts');
    const priceEl = document.getElementById('final-price');
    const previewEl = document.getElementById('sms-preview');
    const copyBtn = document.getElementById('copy-btn');
    const submitBtn = form.querySelector('button[type="submit"]');
    let rates = { USD: null, EUR: null, TRY: null };
    let ratesLoaded = false, ratesError = false, selectedAmount = null, currentCurrency = 'USD';
    const RATE_URL = 'https://almas-api.sherwinisltn.workers.dev/';
    const AMOUNTS = {
      USD: [2,3,4,5,6,7,8,9,10,15,20,25,50,100],
      EUR: [2,3,4,5,6,7,8,9,10,15,20,25,50,100],
      TRY: [5,10,15,20,30,40,50,100,150,200,300,400,500]
    };

    function validRate(value) {
      const normalized = String(value ?? '').replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٬,،\s]/g, '');
      const n = Number(normalized);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    function getFinalPrice() {
      const rate = rates[currentCurrency];
      if (selectedAmount === null || !rate || ratesError) return null;
      // قیمت پایه × ۱٫۳۰؛ سود ۳۰ درصد بدون گرد کردن کاهشی
      return Math.round(selectedAmount * rate * (1 + MARGIN_PERCENT / 100));
    }
    function updatePriceDisplay() {
      if (!priceEl) return;
      if (ratesError || (ratesLoaded && !rates[currentCurrency])) {
        priceEl.textContent = 'نرخ ارز در دسترس نمی‌باشد';
        priceEl.classList.add('rate-unavailable');
        return;
      }
      priceEl.classList.remove('rate-unavailable');
      if (!ratesLoaded) {
        priceEl.textContent = 'در حال دریافت نرخ ارز…';
        return;
      }
      const price = getFinalPrice();
      priceEl.textContent = selectedAmount === null ? 'مبلغ را انتخاب کنید' : (price ? formatToman(price) : 'نرخ ارز در دسترس نمی‌باشد');
    }
    async function fetchRates() {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch(RATE_URL, { method: 'GET', cache: 'no-store', signal: controller.signal, headers: { 'Accept': 'application/json' } });
        if (!res.ok) throw new Error('Worker HTTP ' + res.status);
        const data = await res.json();
        const source = data && data.rates ? data.rates : data;
        const nextRates = {
          USD: validRate(source && (source.dollar ?? source.usd ?? source.USD)),
          EUR: validRate(source && (source.euro ?? source.eur ?? source.EUR)),
          TRY: validRate(source && (source.lira ?? source.try ?? source.tl ?? source.TRY))
        };
        if (!nextRates.USD && !nextRates.EUR && !nextRates.TRY) throw new Error('Worker returned no valid rates');
        rates = nextRates;
        ratesError = false;
      } catch (err) {
        rates = { USD: null, EUR: null, TRY: null };
        ratesError = true;
        console.warn('ALMAS gift rates unavailable:', err && err.message ? err.message : err);
      } finally {
        window.clearTimeout(timeout);
        ratesLoaded = true;
        updatePriceDisplay();
      }
    }
    function renderAmounts() {
      if (!amountsBox) return;
      amountsBox.innerHTML = '';
      selectedAmount = null;
      (AMOUNTS[currentCurrency] || AMOUNTS.USD).forEach(amount => {
        const label = document.createElement('label');
        label.className = 'chip';
        const input = document.createElement('input');
        input.type = 'radio'; input.name = 'amount'; input.value = String(amount);
        const span = document.createElement('span'); span.textContent = faNum(amount);
        label.append(input, span);
        input.addEventListener('change', () => {
          selectedAmount = amount;
          amountsBox.querySelectorAll('.chip').forEach(chip => chip.classList.remove('selected'));
          label.classList.add('selected');
          updatePriceDisplay();
        });
        amountsBox.appendChild(label);
      });
      updatePriceDisplay();
    }
    form.querySelectorAll('input[name="currency"]').forEach(radio => radio.addEventListener('change', () => {
      const selected = form.querySelector('input[name="currency"]:checked');
      currentCurrency = selected ? selected.value : 'USD';
      renderAmounts();
    }));
    renderAmounts();
    fetchRates();
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (selectedAmount === null) return showToast('مبلغ گیفت کارت را انتخاب کنید', true);
      const finalPrice = getFinalPrice();
      if (!ratesLoaded || !finalPrice) return showToast('نرخ ارز در دسترس نمی‌باشد؛ ثبت سفارش ممکن نیست', true);
      const name = form.fullName, phone = form.phone;
      if (!name.value.trim()) return setError(name, 'نام الزامی است');
      if (!/^09\d{9}$/.test(phone.value)) return setError(phone, 'شماره معتبر نیست');
      let body = `سلام، برای خرید گیفت کارت درخواست دارم.\nارز: ${currentCurrency}\nمبلغ: ${faNum(selectedAmount)} ${currentCurrency}\nقیمت نهایی: ${faNum(finalPrice)} تومان\nنام: ${name.value.trim()}\nشماره: ${phone.value}`;
      showConfirmModal(body, previewEl, submitBtn);
      if (copyBtn) { copyBtn.classList.remove('hidden'); copyBtn.onclick = () => copyText(body, copyBtn); }
    });
  }

  function initRepair() {
    const form = document.getElementById('repair-form'); if (!form) return;
    setupLocalStorage(form);
    try { localStorage.removeItem('almas_devicePass'); } catch (err) {}
    setupPhoneValidation(form.phone);
    const previewEl = document.getElementById('sms-preview');
    const copyBtn = document.getElementById('copy-btn');
    const submitBtn = form.querySelector('button[type="submit"]');
    const passGroup = document.getElementById('repair-pass-group');
    const patternGroup = document.getElementById('repair-pattern-group');
    const passInput = document.getElementById('repair-device-pass');
    const patternPadEl = document.getElementById('repair-pattern-pad');
    const clearBtn = document.getElementById('repair-pattern-clear');
    const statusEl = document.getElementById('repair-pattern-status');
    const consentWrap = document.getElementById('repair-consent-wrap');
    const consent = document.getElementById('repair-consent');
    let patternSequence = [];
    const patternPad = initPatternPad(patternPadEl, sequence => {
      patternSequence = sequence;
      updateLockUI();
      if (!statusEl) return;
      if (!sequence.length) { statusEl.textContent = ''; statusEl.className = 'pattern-status'; }
      else if (sequence.length < 4) { statusEl.textContent = `حداقل ۴ نقطه لازم است (${faNum(sequence.length)})`; statusEl.className = 'pattern-status err'; }
      else { statusEl.textContent = `✓ الگو ثبت شد (${faNum(sequence.length)} نقطه)`; statusEl.className = 'pattern-status ok'; }
    });
    function lockType() {
      const selected = form.querySelector('input[name="repairLockType"]:checked');
      return selected ? selected.value : 'none';
    }
    function updateLockUI() {
      const type = lockType();
      if (passGroup) passGroup.classList.toggle('hidden', type !== 'password');
      if (patternGroup) patternGroup.classList.toggle('hidden', type !== 'pattern');
      const needsConsent = type === 'pattern' ? patternSequence.length > 0 : type === 'password' ? !!(passInput && passInput.value.trim()) : false;
      if (consentWrap) consentWrap.classList.toggle('hidden', !needsConsent);
      if (!needsConsent && consent) consent.checked = false;
    }
    form.querySelectorAll('input[name="repairLockType"]').forEach(radio => radio.addEventListener('change', updateLockUI));
    if (passInput) passInput.addEventListener('input', updateLockUI);
    if (clearBtn) clearBtn.addEventListener('click', () => {
      if (patternPad) patternPad.reset();
      patternSequence = [];
      updateLockUI();
    });
    updateLockUI();

    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = form.fullName, phone = form.phone;
      const model = form.phoneModel, color = form.deviceColor, issue = form.issue;
      if (!name.value.trim()) return setError(name, 'نام و نام خانوادگی الزامی است');
      if (!/^09\d{9}$/.test(phone.value)) return setError(phone, 'شماره تماس معتبر نیست');
      if (!model.value.trim()) return setError(model, 'مدل دستگاه را وارد کنید');
      if (!color.value.trim()) return setError(color, 'رنگ دستگاه را وارد کنید');
      if (!issue.value.trim()) return setError(issue, 'شرح ایراد دستگاه را وارد کنید');
      const type = lockType();
      let credentialLine = '';
      let hasCredential = false;
      if (type === 'password' && passInput && passInput.value.trim()) {
        hasCredential = true;
        credentialLine = `رمز دستگاه (پسورد/پین): ${passInput.value.trim()}`;
      } else if (type === 'pattern') {
        if (patternSequence.length < 4) return showToast('الگو باید حداقل ۴ نقطه داشته باشد', true);
        hasCredential = true;
        credentialLine = `رمز دستگاه (الگو): ${patternSequence.join('-')}`;
      }
      if (hasCredential && consent && !consent.checked) return showToast('برای ثبت رمز، تأیید اجازه مشتری الزامی است', true);
      const costValue = form.cost.value.trim();
      const costLine = costValue && Number(costValue) >= 0 ? `${faNum(Number(costValue))} تومان` : 'تعیین نشده';
      let body = `سلام، پذیرش تعمیرات جدید در الماس موبایل:\nنام و نام خانوادگی: ${name.value.trim()}\nشماره تماس: ${phone.value}\nمدل دستگاه: ${model.value.trim()}\nرنگ دستگاه: ${color.value.trim()}\nایراد دستگاه: ${issue.value.trim()}\nهزینه حدودی: ${costLine}\n`;
      if (credentialLine) body += `${credentialLine}\n`;
      body += `تاریخ پذیرش: ${new Date().toLocaleString('fa-IR')}`;
      showConfirmModal(body, previewEl, submitBtn);
      if (copyBtn) { copyBtn.classList.remove('hidden'); copyBtn.onclick = () => copyText(body, copyBtn); }
    });
  }

  function initLaptop() {
    const form = document.getElementById('laptop-form'); if (!form) return;
    setupLocalStorage(form); setupPhoneValidation(form.phone);
    const totalEl = document.getElementById('total-price'), previewEl = document.getElementById('sms-preview'), copyBtn = document.getElementById('copy-btn'), submitBtn = form.querySelector('button[type="submit"]');
    const otherCheck = null, otherField = null;
    const full = form.querySelector('input[name="service"][value="full"]'), win = form.querySelector('input[name="service"][value="win"]'), general = form.querySelector('input[name="service"][value="general"]');
    const singleContainer = document.getElementById('single-app-container'), singleInput = document.getElementById('singleAppInput'), singleTagsBox = document.getElementById('single-app-tags');
    let singleApps = [], currentTotal = 0;
    function updateConstraints() {
      if (!win || !general) return;
      const winLbl = win.closest('.option'), genLbl = general.closest('.option');
      if (full && full.checked) {
        win.checked = false; general.checked = false; win.disabled = true; general.disabled = true;
        if (winLbl) { winLbl.classList.remove('selected'); winLbl.classList.add('disabled'); }
        if (genLbl) { genLbl.classList.remove('selected'); genLbl.classList.add('disabled'); }
      } else {
        win.disabled = false; general.disabled = false;
        if (winLbl) winLbl.classList.remove('disabled'); if (genLbl) genLbl.classList.remove('disabled');
      }
    }
    if (full) full.addEventListener('change', () => {
      if(full.checked) {
        ['drivers', 'video', 'pdf', 'zip', 'fonts'].forEach(val => {
          const cb = form.querySelector(`input[name="apps"][value="${val}"]`);
          if(cb) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
        });
      }
    });
    function renderSingleApps() {
      singleTagsBox.innerHTML = '';
      singleApps.forEach((app, index) => {
        const tag = document.createElement('div'); tag.className = 'tag';
        const label = document.createElement('span'); label.textContent = app;
        const remove = document.createElement('button');
        remove.type = 'button'; remove.className = 'tag-remove'; remove.textContent = '×';
        remove.setAttribute('aria-label', `حذف ${app}`);
        remove.addEventListener('click', () => { singleApps.splice(index, 1); renderSingleApps(); calcTotal(); });
        tag.append(label, remove);
        singleTagsBox.appendChild(tag);
      });
    }
    function calcTotal(animate = true) {
      let total = 0; const selected = [];
      form.querySelectorAll('input[name="service"]:checked').forEach(inp => {
        if (inp.disabled) return;
        if (inp.value === 'single') {
          const count = singleApps.length === 0 ? 1 : singleApps.length;
          const price = count * 350000; total += price;
          selected.push({ label: `نصب برنامه‌های سبک (${count} عدد)`, price: price });
        } else {
          total += parseInt(inp.dataset.price, 10) || 0;
          selected.push({ label: inp.dataset.label, price: inp.dataset.price });
        }
      });
      if (animate && totalEl) animateValue(totalEl, currentTotal, total, 500); else if (totalEl) totalEl.textContent = formatToman(total);
      currentTotal = total; return { total, selected };
    }
    function animateValue(obj, start, end, duration) {
      let startTimestamp = null;
      const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.textContent = formatToman(Math.floor(progress * (end - start) + start));
        if (progress < 1) window.requestAnimationFrame(step);
      };
      window.requestAnimationFrame(step);
    }
    form.querySelectorAll('input[name="service"]').forEach(inp => inp.addEventListener('change', () => {
      updateConstraints();
      if (singleContainer) singleContainer.classList.toggle('hidden', !(inp.value === 'single' && inp.checked));
      calcTotal();
    }));
    if (singleInput) singleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = singleInput.value.trim();
        if (val && !singleApps.includes(val)) { singleApps.push(val); singleInput.value = ''; renderSingleApps(); calcTotal(); }
      }
    });
    if (otherCheck) otherCheck.addEventListener('change', () => { if (otherField) otherField.classList.toggle('hidden', !otherCheck.checked); });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.fullName, ph = form.phone;
      if (!name.value.trim()) return setError(name, 'نام الزامی است');
      if (!/^09\d{9}$/.test(ph.value)) return setError(ph, 'شماره معتبر نیست');
      const res = calcTotal(false);
      if (res.selected.length === 0) return showToast('حداقل یک خدمت را انتخاب کنید', true);
      let apps = [];
      form.querySelectorAll('input[name="apps"]:checked').forEach(inp => apps.push(inp.dataset.label));
      let body = `سلام، برای خدمات لپ‌تاپ درخواست دارم.\nخدمات:\n`;
      res.selected.forEach(s => body += `• ${s.label} — ${faNum(s.price)} تومان\n`);
      if (singleApps.length > 0) body += `برنامه‌های سبک درخواستی: ${singleApps.join('، ')}\n`;
      if (apps.length) body += `برنامه‌های عمومی: ${apps.join('، ')}\n`;
      body += `قیمت نهایی: ${faNum(res.total)} تومان\nتوضیحات: ${(form.laptopNotes && form.laptopNotes.value.trim()) || '—'}\nنام: ${name.value}\nشماره: ${ph.value}`;
      showConfirmModal(body, previewEl, submitBtn);
      if (copyBtn) { copyBtn.classList.remove('hidden'); copyBtn.onclick = () => copyText(body, copyBtn); }
    });
  }

  function initUpdate() {
    const form = document.getElementById('update-form');
    if (!form) return;
    setupLocalStorage(form);
    setupPhoneValidation(form.phone);

    const typeInputs = Array.from(form.querySelectorAll('input[name="deviceType"]'));
    const iphoneSection = document.getElementById('iphone-model-section');
    const ipadSection = document.getElementById('ipad-model-section');
    const watchSection = document.getElementById('watch-model-section');
    const samsungSection = document.getElementById('update-samsung-model-section-wrap');
    const samsungSelect = document.getElementById('update-samsung-model');
    const appleFindMySection = document.getElementById('apple-findmy-section');
    const appleCredentialsWrap = document.getElementById('apple-credentials-wrap');
    const volumeSection = document.getElementById('volume-section');
    const iphoneSelect = document.getElementById('iphone-model');
    const ipadSelect = document.getElementById('ipad-model');
    const volumeInput = document.getElementById('update-volume');
    const volumeValueEl = document.getElementById('update-volume-value');
    const estimateEl = document.getElementById('update-estimate');
    const priceEl = document.getElementById('update-price');
    const numericGroup = document.getElementById('numeric-pass-group');
    const textGroup = document.getElementById('text-pass-group');
    const textPass = document.getElementById('update-text-pass');
    const passDisplay = document.getElementById('passcode-display');
    const keypad = document.getElementById('passcode-keypad');
    const consent = document.getElementById('update-consent');
    const findMyStatus = document.getElementById('find-my-status');
    const appleIdInput = document.getElementById('update-apple-id');
    const applePasswordInput = document.getElementById('update-apple-password');
    const appleConsent = document.getElementById('update-apple-consent');
    const toggleApplePassword = document.getElementById('toggle-apple-password');
    const togglePass = document.getElementById('toggle-pass-visibility');
    const previewEl = document.getElementById('sms-preview');
    const copyBtn = document.getElementById('copy-btn');
    const submitBtn = form.querySelector('button[type="submit"]');
    let numericPasscode = '';

    const selectedType = () => (form.querySelector('input[name="deviceType"]:checked') || {}).value || 'iphone';
    const selectedCredentialType = () => (form.querySelector('input[name="credentialType"]:checked') || {}).value || 'numeric';
    const priceForIphoneSeries = series => {
      const n = Number(series);
      if (n <= 10) return 1000000;
      if (n <= 12) return 1200000;
      if (n <= 15) return 1500000;
      if (n === 16) return 1800000;
      return 2000000;
    };
    const priceForIPadYear = year => {
      const y = Number(year);
      if (y <= 2018) return 1000000;
      if (y <= 2020) return 1200000;
      if (y <= 2023) return 1500000;
      if (y === 2024) return 1800000;
      return 2000000;
    };
    function currentPrice() {
      const type = selectedType();
      if (type === 'watch') return /Ultra/i.test(form.watchModel.value) ? 2000000 : 1500000;
      if (type === 'samsung') { const op=samsungSelect.options[samsungSelect.selectedIndex]; const v=Number(op && op.dataset.marketPrice || 0); if(!v)return null; if(v<60000000)return 750000; if(v<100000000)return 900000; if(v<200000000)return 1200000; if(v<300000000)return 1800000; return 3500000; }
      if (type === 'iphone') {
        const option = iphoneSelect.options[iphoneSelect.selectedIndex];
        return option && option.dataset.series ? priceForIphoneSeries(option.dataset.series) : null;
      }
      const option = ipadSelect.options[ipadSelect.selectedIndex];
      return option && option.dataset.year ? priceForIPadYear(option.dataset.year) : null;
    }
    function updatePrice() {
      const price = currentPrice();
      priceEl.textContent = price ? formatToman(price) : '—';
    }
    function updateEstimate() {
      if (selectedType() === 'watch') {
        estimateEl.textContent = 'زمان تقریبی پس از بررسی وضعیت اپل واچ اعلام می‌شود.';
        return;
      }
      const gb = Number(volumeInput.value);
      if (volumeValueEl) volumeValueEl.textContent = faNum(gb);
      if (!Number.isFinite(gb) || gb <= 0) {
        estimateEl.textContent = 'زمان تقریبی: —';
        return;
      }
      const hours = gb <= 100 ? 1.5 : 1.5 + ((gb - 100) / 100);
      const rounded = Math.ceil(hours * 2) / 2;
      const label = Number.isInteger(rounded) ? faNum(rounded) : faNum(Math.floor(rounded)) + '٫۵';
      estimateEl.textContent = `⏱ زمان تقریبی: حدود ${label} ساعت`;
    }
    function updateFindMyRequirements() {
      if (!findMyStatus || !appleIdInput || !applePasswordInput || !appleConsent) return;
      const findMyOn = selectedType() !== 'samsung' && findMyStatus.value === 'yes';
      const hasAnyAppleCredential = !!(appleIdInput.value.trim() || applePasswordInput.value.trim());
      if (appleCredentialsWrap) appleCredentialsWrap.classList.toggle('hidden', selectedType() === 'samsung' || findMyStatus.value !== 'yes');
      appleIdInput.required = findMyOn;
      applePasswordInput.required = findMyOn;
      appleConsent.required = findMyOn;
      if (!findMyOn) { appleConsent.checked = false; if (selectedType() === 'samsung') { appleIdInput.value=''; applePasswordInput.value=''; } }
    }
    function updateDeviceUI() {
      const type = selectedType();
      iphoneSection.classList.toggle('hidden', type !== 'iphone');
      if (samsungSection) samsungSection.classList.toggle('hidden', type !== 'samsung');
      if (appleFindMySection) appleFindMySection.classList.toggle('hidden', type === 'samsung');
      if (samsungSelect) samsungSelect.required = type === 'samsung';
      ipadSection.classList.toggle('hidden', type !== 'ipad');
      watchSection.classList.toggle('hidden', type !== 'watch');
      volumeSection.classList.toggle('hidden', type === 'watch');
      iphoneSelect.required = type === 'iphone';
      ipadSelect.required = type === 'ipad';
      volumeInput.required = type !== 'watch';
      if (findMyStatus) findMyStatus.required = type !== 'samsung';
      updateFindMyRequirements();
      updateCredentialUI();
      updatePrice();
      updateEstimate();
    }
    function renderPasscode() {
      if (!passDisplay) return;
      if (!numericPasscode.length) {
        passDisplay.innerHTML = '<span class="passcode-placeholder">رمز را وارد کنید</span>';
        return;
      }
      passDisplay.innerHTML = Array.from(numericPasscode).map(() => '<i aria-hidden="true"></i>').join('');
      passDisplay.setAttribute('aria-label', `رمز عددی با ${faNum(numericPasscode.length)} رقم وارد شده`);
    }
    typeInputs.forEach(input => input.addEventListener('change', updateDeviceUI));
    [iphoneSelect, ipadSelect, samsungSelect].filter(Boolean).forEach(select => select.addEventListener('change', updatePrice));
    const watchModelSelect = document.getElementById('watch-model'); if (watchModelSelect) watchModelSelect.addEventListener('change', updatePrice);
    volumeInput.addEventListener('input', () => { updateEstimate(); updatePrice(); });
    volumeInput.addEventListener('change', () => { updateEstimate(); updatePrice(); });
    const patternGroup = document.getElementById('update-pattern-group');
    const patternPadEl = document.getElementById('update-pattern-pad');
    const patternStatus = document.getElementById('update-pattern-status');
    const patternClear = document.getElementById('update-pattern-clear');
    let patternSequence = [];
    const patternPad = initPatternPad(patternPadEl, seq => {
      patternSequence = seq;
      if (patternStatus) {
        patternStatus.textContent = !seq.length ? '' : seq.length < 4 ? `حداقل ۴ نقطه لازم است (${faNum(seq.length)})` : `الگو ثبت شد (${faNum(seq.length)} نقطه)`;
        patternStatus.className = 'pattern-status' + (seq.length >= 4 ? ' ok' : seq.length ? ' err' : '');
      }
    });
    function updateCredentialUI() {
      const type = selectedType();
      const isSamsung = type === 'samsung';
      const patternOption = document.getElementById('update-pattern-option');
      const numericOption = document.getElementById('update-numeric-option');
      const textOption = document.getElementById('update-text-option');
      const isWatch = type === 'watch';
      if (patternOption) patternOption.classList.toggle('hidden', !isSamsung);
      if (numericOption) numericOption.classList.toggle('hidden', isSamsung);
      if (textOption) textOption.classList.toggle('hidden', isWatch);
      if (isSamsung && !['pattern','text','none'].includes(selectedCredentialType())) form.querySelector('input[name="credentialType"][value="text"]').checked = true;
      if (isWatch && selectedCredentialType() === 'text') form.querySelector('input[name="credentialType"][value="numeric"]').checked = true;
      if (!isSamsung && selectedCredentialType() === 'pattern') form.querySelector('input[name="credentialType"][value="numeric"]').checked = true;
      const ct = selectedCredentialType();
      if (numericGroup) numericGroup.classList.toggle('hidden', ct !== 'numeric');
      if (textGroup) textGroup.classList.toggle('hidden', ct !== 'text');
      if (patternGroup) patternGroup.classList.toggle('hidden', ct !== 'pattern' || !isSamsung);
      const consentWrap = document.getElementById('update-consent-wrap');
      if (consentWrap) consentWrap.classList.toggle('hidden', ct === 'none');
      if (consent) consent.checked = false;
      if (textPass) textPass.placeholder = isSamsung ? 'رمز عبور سامسونگ را وارد کنید' : 'رمز عبور متنی دستگاه';
    }
    form.querySelectorAll('input[name="credentialType"]').forEach(input => input.addEventListener('change', updateCredentialUI));
    if (patternClear) patternClear.addEventListener('click', () => { if (patternPad) patternPad.reset(); patternSequence = []; });
    updateCredentialUI();
    if (keypad) keypad.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.dataset.digit !== undefined && numericPasscode.length < 12) numericPasscode += button.dataset.digit;
      else if (button.dataset.action === 'delete') numericPasscode = numericPasscode.slice(0, -1);
      renderPasscode();
    });
    const clearPass = document.getElementById('passcode-clear');
    if (clearPass) clearPass.addEventListener('click', () => { numericPasscode = ''; renderPasscode(); });
    if (togglePass && textPass) togglePass.addEventListener('click', () => {
      const reveal = textPass.type === 'password';
      textPass.type = reveal ? 'text' : 'password';
      togglePass.textContent = reveal ? 'مخفی کردن' : 'نمایش';
      togglePass.setAttribute('aria-label', reveal ? 'مخفی کردن رمز' : 'نمایش رمز');
    });
    if (findMyStatus) findMyStatus.addEventListener('change', updateFindMyRequirements);
    if (appleIdInput) appleIdInput.addEventListener('input', updateFindMyRequirements);
    if (applePasswordInput) applePasswordInput.addEventListener('input', updateFindMyRequirements);
    if (toggleApplePassword && applePasswordInput) toggleApplePassword.addEventListener('click', () => {
      const reveal = applePasswordInput.type === 'password';
      applePasswordInput.type = reveal ? 'text' : 'password';
      toggleApplePassword.textContent = reveal ? 'مخفی کردن' : 'نمایش';
      toggleApplePassword.setAttribute('aria-label', reveal ? 'مخفی کردن رمز اپل آیدی' : 'نمایش رمز اپل آیدی');
    });

    updateFindMyRequirements();
    updateDeviceUI();
    renderPasscode();

    form.addEventListener('submit', event => {
      event.preventDefault();
      const type = selectedType();
      const firstName = form.firstName.value.trim();
      const lastName = form.lastName.value.trim();
      const phone = form.phone.value.trim();
      if (type === 'iphone' && !iphoneSelect.value) return showToast('مدل آیفون را انتخاب کنید', true);
      if (type === 'ipad' && !ipadSelect.value) return showToast('مدل آیپد را انتخاب کنید', true);
      if (type === 'samsung' && (!samsungSelect || !samsungSelect.value)) return showToast('مدل سامسونگ را انتخاب کنید', true);
      if (type === 'watch' && !form.watchModel.value) return showToast('مدل اپل واچ را انتخاب کنید', true);
      if (type !== 'watch' && (!volumeInput.value || Number(volumeInput.value) <= 0 || Number(volumeInput.value) > 2048)) return setError(volumeInput, 'حجم معتبر بین ۱ تا ۲۰۴۸ گیگابایت وارد کنید');
      if (!firstName) return setError(form.firstName, 'نام الزامی است');
      if (!lastName) return setError(form.lastName, 'نام خانوادگی الزامی است');
      if (!/^09\d{9}$/.test(phone)) return setError(form.phone, 'شماره تماس معتبر نیست');
      const credentialType = selectedCredentialType();
      const credential = credentialType === 'none' ? '' : credentialType === 'numeric' ? numericPasscode : credentialType === 'pattern' ? patternSequence.join('-') : textPass.value.trim();
      if (credentialType === 'pattern' && patternSequence.length < 4) return showToast('الگو باید حداقل ۴ نقطه داشته باشد', true);
      if (credentialType !== 'none' && !credential) return showToast('رمز دستگاه را وارد کنید', true);
      if (credentialType !== 'none' && (!consent || !consent.checked)) return showToast('تأیید اجازه مشتری برای استفاده از رمز الزامی است', true);
      if (type !== 'samsung' && (!findMyStatus || !findMyStatus.value)) return showToast('وضعیت Find My دستگاه را مشخص کنید', true);
      const appleId = appleIdInput ? appleIdInput.value.trim() : '';
      const applePassword = applePasswordInput ? applePasswordInput.value : '';
      const findMyOn = type !== 'samsung' && findMyStatus.value === 'yes';
      if (findMyOn && (!appleId || !applePassword)) return showToast('با روشن بودن Find My، اپل آیدی و رمز آن الزامی است', true);
      if (type !== 'samsung' && (appleId || applePassword) && (!appleId || !applePassword)) return showToast('برای ثبت اطلاعات اپل آیدی، هر دو فیلد را کامل کنید', true);
      if (type !== 'samsung' && (findMyOn || appleId || applePassword) && !appleConsent.checked) return showToast('تأیید مشتری برای ثبت اطلاعات اپل آیدی الزامی است', true);

      let deviceLabel = '';
      let amount = currentPrice();
      if (type === 'samsung') deviceLabel = samsungSelect.value;
      else if (type === 'iphone') deviceLabel = iphoneSelect.value;
      else if (type === 'ipad') deviceLabel = ipadSelect.value;
      else deviceLabel = 'Apple Watch' + (form.watchModel.value.trim() ? ' — ' + form.watchModel.value.trim() : '');
      const volumeLine = type === 'watch' ? '' : `حجم اطلاعات: ${faNum(Number(volumeInput.value))} گیگابایت\n`;
      let timeLine = '';
      if (type !== 'watch') {
        const gb = Number(volumeInput.value);
        const hours = gb <= 100 ? 1.5 : Math.ceil((1.5 + ((gb - 100) / 100)) * 2) / 2;
        const hoursText = Number.isInteger(hours) ? faNum(hours) : faNum(Math.floor(hours)) + '٫۵';
        timeLine = `زمان تقریبی: حدود ${hoursText} ساعت\n`;
      } else timeLine = 'زمان تقریبی: پس از بررسی وضعیت دستگاه اعلام می‌شود\n';
      const typeLabel = type === 'samsung' ? 'سامسونگ' : type === 'iphone' ? 'آیفون' : type === 'ipad' ? 'آیپد' : 'اپل واچ';
      const credentialLabel = credentialType === 'numeric' ? 'رمز عددی' : credentialType === 'pattern' ? 'الگو (Pattern)' : credentialType === 'text' ? 'رمز عبور متنی' : '';
      const findMyLabel = type === 'samsung' ? 'ندارد' : findMyOn ? 'روشن' : 'خاموش';
      const credentialLine = credentialType === 'none'
        ? 'رمز دستگاه: ندارد'
        : `رمز دستگاه (${credentialLabel}): ${credential}`;
      // تمام اطلاعات واردشده، از جمله رمزها، در یک متن واحد برای پیامک و شیت استفاده می‌شود.
      const fullOrderDetails = `سلام، برای آپدیت دستگاه درخواست دارم.\nنوع دستگاه: ${typeLabel}\nمدل دستگاه: ${deviceLabel}\n${volumeLine}${timeLine}هزینه آپدیت: ${faNum(amount)} تومان\nنام: ${firstName} ${lastName}\nشماره تماس: ${phone}\nوضعیت Find My: ${findMyLabel}\n${credentialLine}${appleId ? `\nApple ID: ${appleId}` : ''}${applePassword ? `\nرمز Apple ID: ${applePassword}` : ''}`;
      showConfirmModal(fullOrderDetails, previewEl, submitBtn, fullOrderDetails);
      if (copyBtn) { copyBtn.classList.remove('hidden'); copyBtn.onclick = () => copyText(fullOrderDetails, copyBtn); }
    });
  }


  function initDeviceServicePage(pageType) {
    const isBackup = pageType === 'backup-restore';
    const form = document.getElementById(isBackup ? 'backup-restore-form' : 'forgot-password-form');
    if (!form) return;
    setupLocalStorage(form); setupPhoneValidation(form.phone);
    const brandInputs = [...form.querySelectorAll('input[name="brand"]')];
    const samsungWrap = document.getElementById('samsung-model-wrap'), iphoneWrap = document.getElementById('iphone-model-wrap');
    const samsungSelect = document.getElementById('samsung-model'), iphoneSelect = document.getElementById('iphone-model');
    const priceEl = document.getElementById(isBackup ? 'backup-restore-price' : 'forgot-price');
    const noteEl = document.getElementById(isBackup ? 'backup-restore-breakdown' : 'forgot-price-note');
    const volumeInput = document.getElementById('backup-volume'), volumeValue = document.getElementById('backup-volume-value');
    const packageInput = document.getElementById('apps-package');
    const appleWrap = document.getElementById('apple-account-wrap'), googleWrap = document.getElementById('google-account-wrap');
    const appleInput = document.getElementById('apple-account'), googleInput = document.getElementById('google-account'), passwordInput = document.getElementById('account-password');
    const consent = document.getElementById('forgot-consent');
    const previewEl = document.getElementById('sms-preview'), copyBtn = document.getElementById('copy-btn'), submitBtn = form.querySelector('button[type="submit"]');
    let brCredentialType = 'numeric', brNumericPasscode = '', brPatternSequence = [];
    const brLock = isBackup ? document.getElementById('br-lock-section') : null;
    if (brLock) {
      const radios = [...brLock.querySelectorAll('input[name="brCredentialType"]')];
      const numGroup = document.getElementById('br-numeric-group'), textGroup = document.getElementById('br-text-group'), patternGroup = document.getElementById('br-pattern-group');
      const textPass = document.getElementById('br-text-pass'), passDisplay = document.getElementById('br-passcode-display');
      const keypad = document.getElementById('br-passcode-keypad');
      const patternStatus = document.getElementById('br-pattern-status');
      const pad = initPatternPad(document.getElementById('br-pattern-pad'), seq => { brPatternSequence = seq; if(patternStatus) patternStatus.textContent = !seq.length ? '' : seq.length < 4 ? `حداقل ۴ نقطه لازم است (${faNum(seq.length)})` : `الگو ثبت شد (${faNum(seq.length)} نقطه)`; });
      const updateBrLock = () => { brCredentialType=(brLock.querySelector('input[name="brCredentialType"]:checked')||{}).value||'numeric'; numGroup.classList.toggle('hidden',brCredentialType!=='numeric'); textGroup.classList.toggle('hidden',brCredentialType!=='text'); patternGroup.classList.toggle('hidden',brCredentialType!=='pattern'); };
      radios.forEach(r=>r.addEventListener('change',updateBrLock)); updateBrLock();
      if(keypad) keypad.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.digit!==undefined&&brNumericPasscode.length<12)brNumericPasscode+=b.dataset.digit;else if(b.dataset.action==='delete')brNumericPasscode=brNumericPasscode.slice(0,-1);passDisplay.innerHTML=brNumericPasscode?Array.from(brNumericPasscode).map(()=>'<i></i>').join(''):'<span class="passcode-placeholder">رمز را وارد کنید</span>';});
      const clear=document.getElementById('br-passcode-clear'); if(clear)clear.addEventListener('click',()=>{brNumericPasscode='';passDisplay.innerHTML='<span class="passcode-placeholder">رمز را وارد کنید</span>';});
      const clearPattern=document.getElementById('br-pattern-clear');if(clearPattern)clearPattern.addEventListener('click',()=>{if(pad)pad.reset();brPatternSequence=[];});
      const toggle=document.getElementById('br-toggle-pass');if(toggle&&textPass)toggle.addEventListener('click',()=>{textPass.type=textPass.type==='password'?'text':'password';toggle.textContent=textPass.type==='password'?'نمایش':'مخفی کردن';});
    }
    const selectedBrand = () => (form.querySelector('input[name="brand"]:checked') || {}).value || 'Samsung';
    const modelSelect = () => selectedBrand() === 'Samsung' ? samsungSelect : iphoneSelect;
    const samsungFee = () => {
      const opt = samsungSelect.options[samsungSelect.selectedIndex];
      const marketPrice = Number(opt && opt.dataset.marketPrice || 0);
      if (!marketPrice) return null;
      if (marketPrice < 60000000) return 750000;
      if (marketPrice < 100000000) return 900000;
      if (marketPrice < 200000000) return 1200000;
      if (marketPrice < 300000000) return 1800000;
      return 3500000;
    };
    const iphoneFee = () => {
      const opt = iphoneSelect.options[iphoneSelect.selectedIndex];
      const series = Number(opt && opt.dataset.series || 0);
      if (!series) return null;
      if (series <= 10) return 1000000;
      if (series <= 12) return 1200000;
      if (series <= 15) return 1500000;
      if (series === 16) return 1800000;
      return 2000000;
    };
    const baseFee = () => selectedBrand() === 'Samsung' ? samsungFee() : iphoneFee();
    function updateBrandUI() {
      const samsung = selectedBrand() === 'Samsung';
      samsungWrap.classList.toggle('hidden', !samsung); iphoneWrap.classList.toggle('hidden', samsung);
      samsungSelect.required = samsung; iphoneSelect.required = !samsung;
      if (appleWrap) appleWrap.classList.toggle('hidden', samsung);
      if (googleWrap) googleWrap.classList.toggle('hidden', !samsung);
      if (appleInput) appleInput.required = !samsung;
      if (googleInput) googleInput.required = samsung;
      if (passwordInput) passwordInput.required = true;
      if (brLock) {
        const patternOption = document.getElementById('br-pattern-option');
        const textOption = document.getElementById('br-text-option');
        if (patternOption) patternOption.classList.toggle('hidden', !samsung);
        if (!samsung && brCredentialType === 'pattern') { const numeric = brLock.querySelector('input[name="brCredentialType"][value="numeric"]'); if(numeric) numeric.checked = true; }
        if (samsung && brCredentialType === 'numeric') { const text = brLock.querySelector('input[name="brCredentialType"][value="text"]'); if(text) text.checked = true; }
        if (textOption) textOption.classList.remove('hidden');
        const selected = (brLock.querySelector('input[name="brCredentialType"]:checked')||{}).value || 'numeric';
        brCredentialType = selected;
        document.getElementById('br-numeric-group').classList.toggle('hidden',selected!=='numeric');
        document.getElementById('br-text-group').classList.toggle('hidden',selected!=='text');
        document.getElementById('br-pattern-group').classList.toggle('hidden',selected!=='pattern' || !samsung);
      }
      updatePrice();
    }
    function updatePrice() {
      if (volumeValue && volumeInput) volumeValue.textContent = faNum(Number(volumeInput.value));
      const fee = baseFee();
      if (fee === null) { priceEl.textContent = '—'; if (noteEl) noteEl.textContent = 'مدل دستگاه را انتخاب کنید.'; return; }
      const backupCost = isBackup ? Math.round((Number(volumeInput.value) || 0) * 10000) : 0;
      const pkg = packageInput && packageInput.checked ? 600000 : 0;
      const total = fee + backupCost + pkg;
      priceEl.textContent = formatToman(total);
      if (noteEl) noteEl.textContent = `اجرت ${isBackup ? 'ریستور' : 'فلش'}: ${formatToman(fee)}${isBackup ? ` | هزینه بکاپ: ${formatToman(backupCost)}` : ''}${pkg ? ' | پکیج فعال‌سازی: ۶۰۰٬۰۰۰ تومان' : ''}`;
      if (volumeValue && volumeInput) volumeValue.textContent = faNum(Number(volumeInput.value));
    }
    brandInputs.forEach(x => x.addEventListener('change', updateBrandUI));
    [samsungSelect, iphoneSelect, packageInput, volumeInput].filter(Boolean).forEach(x => x.addEventListener('input', updatePrice));
    [samsungSelect, iphoneSelect, packageInput].filter(Boolean).forEach(x => x.addEventListener('change', updatePrice));
    updateBrandUI();
    form.addEventListener('submit', event => {
      event.preventDefault();
      const brand = selectedBrand(), model = modelSelect().value, fee = baseFee();
      if (!model || fee === null) return showToast('مدل دستگاه را انتخاب کنید', true);
      if (isBackup && (!volumeInput.value || Number(volumeInput.value) < 1)) return showToast('حجم بکاپ را انتخاب کنید', true);
      const fn=form.firstName, ln=form.lastName, ph=form.phone;
      if (!fn.value.trim()) return setError(fn,'نام الزامی است');
      if (!ln.value.trim()) return setError(ln,'نام خانوادگی الزامی است');
      if (!/^09\d{9}$/.test(ph.value)) return setError(ph,'شماره موبایل معتبر نیست');
      if (!isBackup && consent && !consent.checked) return showToast('تأیید شرایط الزامی است',true);
      const account = brand === 'Samsung' ? (googleInput?.value.trim() || '') : (appleInput?.value.trim() || '');
      const password = passwordInput?.value || '';
      if (!account) return setError(brand === 'Samsung' ? googleInput : appleInput, brand === 'Samsung' ? 'جیمیل را وارد کنید' : 'Apple ID را وارد کنید');
      if (!password) return setError(passwordInput,'رمز حساب را وارد کنید');
      if (isBackup) {
        if (brCredentialType === 'numeric' && !brNumericPasscode) return showToast('رمز عددی دستگاه را وارد کنید', true);
        if (brCredentialType === 'text' && !document.getElementById('br-text-pass').value.trim()) return showToast('رمز متنی دستگاه را وارد کنید', true);
        if (brCredentialType === 'pattern' && brPatternSequence.length < 4) return showToast('الگوی قفل را حداقل با ۴ نقطه رسم کنید', true);
      }
      const backupCost = isBackup ? Math.round(Number(volumeInput.value)*10000) : 0;
      const pkg = packageInput && packageInput.checked ? 600000 : 0;
      const total = fee + backupCost + pkg;
      let body = `سلام، درخواست ${isBackup ? 'بکاپ و ریستور' : 'فراموشی رمز و فلش'} دارم.\nبرند: ${brand === 'Samsung' ? 'سامسونگ' : 'آیفون'}\nمدل دستگاه: ${model}\nاجرت ${isBackup ? 'ریستور' : 'فلش'}: ${faNum(fee)} تومان\n`;
      if (isBackup) body += `حجم بکاپ: ${faNum(Number(volumeInput.value))} گیگابایت\nهزینه بکاپ: ${faNum(backupCost)} تومان\n`;
      if (pkg) body += 'پکیج فعال‌سازی برنامه‌ها: ۶۰۰٬۰۰۰ تومان\n';
      body += `${brand === 'Samsung' ? 'جیمیل' : 'Apple ID'}: ${account}\nرمز حساب: ${password}\n`;
      if (isBackup) {
        const credentialText = brCredentialType === 'none' ? 'بدون رمز' : brCredentialType === 'pattern' ? `الگوی قفل: ${brPatternSequence.join('-')}` : brCredentialType === 'numeric' ? `رمز عددی دستگاه: ${brNumericPasscode}` : `رمز متنی دستگاه: ${document.getElementById('br-text-pass').value}`;
        body += `اطلاعات قفل دستگاه: ${credentialText}\n`;
      }
      if (!isBackup) body += 'تأیید شرایط حذف اطلاعات و انصراف: ثبت شد\n';
      body += `هزینه نهایی: ${faNum(total)} تومان\nنام: ${fn.value.trim()} ${ln.value.trim()}\nشماره تماس: ${ph.value.trim()}`;
      showConfirmModal(body, previewEl, submitBtn, body);
      if (copyBtn) { copyBtn.classList.remove('hidden'); copyBtn.onclick = () => copyText(body, copyBtn); }
    });
  }

  function initBackupRestore() { initDeviceServicePage('backup-restore'); }
  function initForgotPassword() { initDeviceServicePage('forgot-password'); }


  function initNewOrder() {
    const form = document.getElementById('new-order-form'); if (!form) return;
    setupLocalStorage(form); setupPhoneValidation(form.phone);
    const priceInput=document.getElementById('agreed-price'), balanceEl=document.getElementById('new-order-balance'), wordsEl=document.getElementById('agreed-price-words');
    const previewEl=document.getElementById('sms-preview'), copyBtn=document.getElementById('copy-btn'), submitBtn=form.querySelector('button[type="submit"]');
    function updatePrice(){ const price=Math.max(0,Number(priceInput.value)||0); balanceEl.textContent=formatToman(price); if(wordsEl) wordsEl.textContent=price?numberToPersianWords(price)+' تومان':''; }
    priceInput.addEventListener('input',updatePrice); updatePrice();

    // تقویم شمسی انتخابی با ماه‌گردانی و انتخاب روز؛ بدون ورود دستی تاریخ
    const dateInput = document.getElementById('expected-date');
    const calendar = document.getElementById('jalali-calendar');
    const calendarToggle = document.getElementById('jalali-calendar-toggle');
    if (dateInput && calendar && calendarToggle) {
      const monthNames = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
      const weekdays = ['ش','ی','د','س','چ','پ','ج'];
      const fmt = new Intl.DateTimeFormat('en-u-ca-persian',{year:'numeric',month:'numeric',day:'numeric'});
      const parts = date => { const o={}; fmt.formatToParts(date).forEach(p=>{if(p.type!=='literal')o[p.type]=Number(p.value)}); return {y:o.year,m:o.month,d:o.day}; };
      const todayJ = parts(new Date());
      let viewY=todayJ.y, viewM=todayJ.m, selected='';
      const fa = n => String(n).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
      function firstGregorianOfMonth(y,m){
        const begin=new Date(y+621,2,1);
        for(let i=0;i<370;i++){const d=new Date(begin);d.setDate(begin.getDate()+i);const p=parts(d);if(p.y===y&&p.m===m&&p.d===1)return d;}
        return new Date(y+621,m<7?2:8,1);
      }
      function render(){
        const first=firstGregorianOfMonth(viewY,viewM);
        const offset=(first.getDay()+1)%7;
        const days=[]; let d=new Date(first);
        while(true){const p=parts(d);if(p.y!==viewY||p.m!==viewM)break;days.push({day:p.d,date:d.toISOString().slice(0,10)});d.setDate(d.getDate()+1);if(days.length>31)break;}
        calendar.innerHTML='';
        const head=document.createElement('div');head.className='jalali-calendar-head';
        const prev=document.createElement('button');prev.type='button';prev.textContent='ماه قبل';prev.addEventListener('click',()=>{viewM--;if(viewM<1){viewM=12;viewY--;}render();});
        const title=document.createElement('strong');title.className='jalali-calendar-title';title.textContent=monthNames[viewM-1]+' '+fa(viewY);
        const next=document.createElement('button');next.type='button';next.textContent='ماه بعد';next.addEventListener('click',()=>{viewM++;if(viewM>12){viewM=1;viewY++;}render();});
        head.append(prev,title,next);calendar.append(head);
        const grid=document.createElement('div');grid.className='jalali-calendar-grid';
        weekdays.forEach(w=>{const el=document.createElement('div');el.className='jalali-calendar-weekday';el.textContent=w;grid.append(el);});
        for(let i=0;i<offset;i++){const blank=document.createElement('span');blank.className='jalali-calendar-day empty';grid.append(blank);}
        days.forEach(item=>{const btn=document.createElement('button');btn.type='button';btn.className='jalali-calendar-day';btn.textContent=fa(item.day);if(item.day===todayJ.d&&viewY===todayJ.y&&viewM===todayJ.m)btn.classList.add('today');if(selected===item.date)btn.classList.add('selected');btn.addEventListener('click',()=>{dateInput.value=fa(viewY)+'/'+fa(viewM).padStart(2,'۰')+'/'+fa(item.day).padStart(2,'۰');selected=item.date;dateInput.dispatchEvent(new Event('input',{bubbles:true}));calendar.classList.add('hidden');});grid.append(btn);});
        calendar.append(grid);
      }
      calendar.addEventListener('click', e => e.stopPropagation());
      calendarToggle.addEventListener('click',e=>{e.stopPropagation();calendar.classList.toggle('hidden');if(!calendar.classList.contains('hidden'))render();});
      dateInput.addEventListener('click',()=>{calendar.classList.remove('hidden');render();});
      document.addEventListener('click',e=>{if(!calendar.contains(e.target)&&!calendarToggle.contains(e.target)&&e.target!==dateInput)calendar.classList.add('hidden');});
    }
    form.addEventListener('submit',event=>{
      event.preventDefault(); const item=form.itemName.value.trim(), price=Number(priceInput.value), qty=1;
      const fn=form.firstName.value.trim(),ln=form.lastName.value.trim(),phone=form.phone.value.trim();
      if(!item)return setError(form.itemName,'نام کالا الزامی است'); if(!Number.isFinite(price)||price<=0)return setError(priceInput,'قیمت معتبر وارد کنید');
      if(!fn||!ln)return showToast('نام و نام خانوادگی مشتری را وارد کنید',true); if(!/^09\d{9}$/.test(phone))return setError(form.phone,'شماره موبایل معتبر نیست');
      const date=form.expectedDate.value.trim()||'تعیین نشده'; const total=price*qty;
      const body=`سلام، سفارش تهیه کالای ناموجود ثبت می‌کنم.\nکالا: ${item}\nتوضیحات کالا: ${form.itemDetails.value.trim()||'—'}\nتعداد: ${faNum(qty)}\nقیمت واحد: ${faNum(price)} تومان\nقیمت نهایی قابل پرداخت: ${faNum(total)} تومان\nزمان تقریبی تحویل: ${date}\nتوضیحات سفارش: ${form.orderNotes.value.trim()||'—'}\nنام مشتری: ${fn} ${ln}\nشماره تماس: ${phone}`;
      showConfirmModal(body,previewEl,submitBtn,body); if(copyBtn){copyBtn.classList.remove('hidden');copyBtn.onclick=()=>copyText(body,copyBtn);}
    });
  }

  // ================= STARTUP & PWA =================
  // بازگشت مرورگر ممکن است صفحه خانه را از حافظه (BFCache) برگرداند؛ کلاس خروج نباید باقی بماند.
  window.addEventListener('pageshow', () => {
    document.body.classList.remove('page-fade-out');
  });

  document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.remove('page-fade-out');
    ['assets/logo-black.png'].forEach(src => {
      const img = new Image(); img.src = src;
    });

    const isHomePage = (document.body.getAttribute('data-page') || '') === 'home';
    let preloader = document.getElementById('preloader');

    if (isHomePage) {
      if (!preloader) {
        preloader = document.createElement('div');
        preloader.id = 'preloader';
        document.body.prepend(preloader);
      }
      preloader.classList.remove('simple-preloader');
      preloader.innerHTML = `
        <div class="almas-loader-scene" role="status" aria-label="در حال آماده‌سازی">
          <div class="almas-loader-grid" aria-hidden="true"></div>
          <svg class="almas-circuit-diamond" viewBox="0 0 220 190" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <linearGradient id="almasDiamondStroke" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#b8fff4"/><stop offset="52%" stop-color="#16c7b1"/><stop offset="100%" stop-color="#ffffff"/></linearGradient>
              <radialGradient id="almasDiamondGlow"><stop offset="0%" stop-color="#20e0ca" stop-opacity=".32"/><stop offset="100%" stop-color="#20e0ca" stop-opacity="0"/></radialGradient>
            </defs>
            <circle class="almas-diamond-halo" cx="110" cy="88" r="74" fill="url(#almasDiamondGlow)"/>
            <g class="almas-circuit-lines"><path d="M12 47 H48 L67 65"/><path d="M18 126 H53 L72 108"/><path d="M208 47 H172 L153 65"/><path d="M202 126 H167 L148 108"/><path d="M110 7 V34"/><path d="M110 183 V151"/><path d="M43 17 L65 39"/><path d="M177 17 L155 39"/><path d="M43 159 L66 137"/><path d="M177 159 L154 137"/></g>
            <g class="almas-diamond-facets"><path class="almas-diamond-main" d="M69 39 H151 L188 79 L110 157 L32 79 Z"/><path d="M69 39 L87 79 L110 157"/><path d="M151 39 L133 79 L110 157"/><path d="M32 79 H188"/><path d="M69 39 L110 79 L151 39"/><path d="M87 79 H133"/></g>
            <g class="almas-circuit-pads"><circle cx="12" cy="47" r="3.2"/><circle cx="18" cy="126" r="3.2"/><circle cx="208" cy="47" r="3.2"/><circle cx="202" cy="126" r="3.2"/><circle cx="110" cy="7" r="3.2"/><circle cx="110" cy="183" r="3.2"/></g>
            <path class="almas-diamond-spark" d="M110 27 V19 M106 23 H114"/>
          </svg>
          <img class="almas-loader-logo" src="assets/logo-black.png" alt="Almas Mobile">
          <span class="almas-loader-caption">PREMIUM MOBILE</span>
        </div>`;

      let loaderHidden = false;
      const hidePreloader = () => {
        if (loaderHidden) return;
        loaderHidden = true;
        preloader.classList.add('hidden-loader');
        window.setTimeout(() => { if (preloader && preloader.parentNode) preloader.remove(); }, 380);
      };
      // صفحه پس از بارگذاری منابع و پایان رسم الماس نمایش داده می‌شود؛ مکث ثابت اضافی نداریم.
      let pageLoaded = document.readyState === 'complete';
      let diamondDrawn = false;
      let didHide = false;
      const tryHidePreloader = () => {
        if (!didHide && pageLoaded && diamondDrawn) {
          didHide = true;
          hidePreloader();
        }
      };
      const lastDiamondFacet = preloader.querySelector('.almas-diamond-facets path:last-child');
      if (lastDiamondFacet) {
        lastDiamondFacet.addEventListener('animationend', () => {
          diamondDrawn = true;
          tryHidePreloader();
        }, { once: true });
      } else {
        diamondDrawn = true;
      }
      window.addEventListener('load', () => {
        pageLoaded = true;
        tryHidePreloader();
      }, { once: true });
      // پشتیبان برای مرورگرهایی که animationend را اجرا نمی‌کنند یا انیمیشن غیرفعال است.
      window.setTimeout(() => {
        diamondDrawn = true;
        tryHidePreloader();
      }, 1250);
      // پشتیبان نهایی برای جلوگیری از گیرکردن لودینگ در شرایط شبکه‌ای غیرعادی.
      window.setTimeout(hidePreloader, 3000);
    } else {
      // در صفحات خدمات هیچ لودینگی ساخته یا نمایش داده نمی‌شود؛ نمونه قدیمی هم حذف می‌شود.
      document.querySelectorAll('#preloader, .simple-preloader, [data-page-loader]').forEach(node => node.remove());
      document.body.classList.remove('page-fade-out');
    }

    document.querySelectorAll('.amount').forEach(el => {
      const words = document.createElement('div'); words.className = 'price-in-words'; el.insertAdjacentElement('afterend', words);
      const refresh = () => { const raw=(el.textContent||'').replace(/[^0-9۰-۹]/g,'').replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))); const amount=Number(raw); words.textContent=amount>0?numberToPersianWords(amount)+' تومان':''; };
      new MutationObserver(refresh).observe(el,{childList:true,characterData:true,subtree:true}); refresh();
    });
    document.querySelectorAll('input[type="number"]').forEach(input => {
      const label = input.closest('.form-group')?.querySelector('.field-label');
      if (!label || !/تومان/.test(label.textContent)) return;
      const words=document.createElement('div'); words.className='price-in-words'; input.insertAdjacentElement('afterend',words);
      const refresh=()=>{const n=Number(input.value);words.textContent=n>0?numberToPersianWords(n)+' تومان':'';}; input.addEventListener('input',refresh); refresh();
    });
    if (!document.getElementById('progress-bar')) { const pb = document.createElement('div'); pb.id = 'progress-bar'; document.body.prepend(pb); }
    injectFAB(); initScrollEffects(); initSelectable(); initRipple(); initParallax(); initPageTransitions(); initScrollReveal();
    
    const page = document.body.getAttribute('data-page');
    if (page === 'apple') initApple();
    else if (page === 'transfer') initTransfer();
    else if (page === 'gallery-dump') initGalleryDump();
    else if (page === 'subscription') initSubscription();
    else if (page === 'gift') initGift();
    else if (page === 'laptop') initLaptop();
    else if (page === 'repair') initRepair();
    else if (page === 'update') initUpdate();
    else if (page === 'backup-restore') initBackupRestore();
    else if (page === 'forgot-password') initForgotPassword();
    else if (page === 'new-order') initNewOrder();

    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});

    let deferredPrompt;
    const installBtn = document.createElement('button');
    installBtn.className = 'btn btn-secondary hidden';
    installBtn.style.cssText = 'position: fixed; bottom: 90px; right: 20px; width: auto; padding: 10px 16px; font-size: 13px; z-index: 998; display: flex; align-items: center; gap: 6px; border-radius: 999px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);';
    installBtn.innerHTML = '<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg> نصب اپلیکیشن';
    document.body.appendChild(installBtn);

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault(); deferredPrompt = e; installBtn.classList.remove('hidden');
    });

    installBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') installBtn.classList.add('hidden');
        deferredPrompt = null;
      }
    });
  });
})();
