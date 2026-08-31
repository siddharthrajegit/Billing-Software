(function () {
  let currentTemplate = 'detailed';
  let currentH = 24;
  let currentS = 68;
  let currentV = 35;

  const config = window.RACE_INVOICE_DOWNLOAD || {};
  const themeHsv = {
    brown: [24, 68, 35],
    leather: [22, 88, 47],
    blue: [224, 78, 54],
    emerald: [165, 89, 37],
    slate: [222, 47, 16],
    crimson: [335, 82, 51],
    purple: [263, 72, 58]
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function setVisible(id, shouldShow) {
    const element = byId(id);
    if (element) element.style.display = shouldShow ? 'block' : 'none';
  }

  function switchInvoiceTemplate(templateKey) {
    currentTemplate = templateKey;
    localStorage.setItem('race_active_invoice_template', templateKey);

    const templates = {
      detailed: ['tabDetailed', 'detailedInvoiceArea'],
      simple: ['tabSimple', 'simpleInvoiceArea'],
      horizontal: ['tabHorizontal', 'simpleHorizontalInvoiceArea']
    };

    Object.entries(templates).forEach(([key, [tabId, areaId]]) => {
      const tab = byId(tabId);
      if (tab) tab.classList.toggle('active', key === templateKey);
      setVisible(areaId, key === templateKey);
    });

    document.body.classList.remove('print-mode-detailed', 'print-mode-simple', 'print-mode-horizontal');
    document.body.classList.add('print-mode-' + templateKey);
  }

  function triggerPrintMode(templateKey) {
    switchInvoiceTemplate(templateKey);
    setTimeout(() => window.print(), 100);
  }

  function hsvToRgb(h, s, v) {
    s /= 100;
    v /= 100;
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0;
    let g = 0;
    let b = 0;

    if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
    else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
    else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
    else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
    else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
    else if (h >= 300 && h <= 360) { r = c; g = 0; b = x; }

    return [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255)
    ];
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  function hexToRgb(hex) {
    const cleanHex = hex.replace('#', '');
    const expandedHex = cleanHex.length === 3 ? cleanHex.split('').map(c => c + c).join('') : cleanHex;
    const num = parseInt(expandedHex, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  function rgbToHsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    const s = max === 0 ? 0 : d / max;

    if (max !== min) {
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return [Math.round(h * 360), Math.round(s * 100), Math.round(max * 100)];
  }

  function computeThemePalette(h, s, v) {
    const [r, g, b] = hsvToRgb(h, s, v);
    const [ar, ag, ab] = hsvToRgb(h, Math.min(100, Math.max(30, Math.round(s * 1.1))), Math.min(100, Math.max(20, Math.round(v * 1.35))));
    const [bgr, bgg, bgb] = hsvToRgb(h, Math.min(12, Math.max(4, Math.round(s * 0.1))), 98);
    const [br, bg2, bb] = hsvToRgb(h, Math.min(35, Math.max(15, Math.round(s * 0.35))), 88);

    return {
      primaryHex: rgbToHex(r, g, b),
      accentHex: rgbToHex(ar, ag, ab),
      bgHex: rgbToHex(bgr, bgg, bgb),
      borderHex: rgbToHex(br, bg2, bb)
    };
  }

  function applyLiveTheme(primary, accent, bg, border) {
    document.documentElement.setAttribute('data-theme', 'custom');
    document.documentElement.style.setProperty('--theme-primary', primary);
    document.documentElement.style.setProperty('--theme-accent', accent);
    document.documentElement.style.setProperty('--theme-light', bg);
    document.documentElement.style.setProperty('--theme-border', border);
    document.documentElement.style.setProperty('--theme-header-text', '#ffffff');
  }

  function updateHsvUi() {
    const [r, g, b] = hsvToRgb(currentH, currentS, currentV);
    const hex = rgbToHex(r, g, b);
    const { primaryHex, accentHex, bgHex, borderHex } = computeThemePalette(currentH, currentS, currentV);

    const pad = byId('hsvColorPad');
    if (pad) pad.style.backgroundColor = `hsl(${currentH}, 100%, 50%)`;

    const cursor = byId('hsvCursor');
    if (cursor) {
      cursor.style.left = `${currentS}%`;
      cursor.style.top = `${100 - currentV}%`;
    }

    [
      ['hsvHSlider', currentH],
      ['hsvSSlider', currentS],
      ['hsvVSlider', currentV],
      ['hsvHNum', currentH],
      ['hsvSNum', currentS],
      ['hsvVNum', currentV]
    ].forEach(([id, value]) => {
      const element = byId(id);
      if (element) element.value = value;
    });

    const sSlider = byId('hsvSSlider');
    if (sSlider) sSlider.style.background = `linear-gradient(to right, #808080, hsl(${currentH}, 100%, ${currentV / 2}%))`;
    const vSlider = byId('hsvVSlider');
    if (vSlider) vSlider.style.background = `linear-gradient(to right, #000000, hsl(${currentH}, ${currentS}%, 50%))`;

    const box = byId('hsvCurrentColorBox');
    if (box) box.style.backgroundColor = primaryHex;
    const hexDisp = byId('hsvHexDisplay');
    if (hexDisp) hexDisp.textContent = primaryHex;
    const rgbDisp = byId('hsvRgbDisplay');
    if (rgbDisp) rgbDisp.textContent = `rgb(${r}, ${g}, ${b})`;
    const valDisp = byId('hsvValDisplay');
    if (valDisp) valDisp.textContent = `H:${currentH}° S:${currentS}% V:${currentV}%`;
    const hexInput = byId('hsvHexInput');
    if (hexInput && document.activeElement !== hexInput) hexInput.value = hex.replace('#', '');

    applyLiveTheme(primaryHex, accentHex, bgHex, borderHex);
  }

  function setHsvValues(h, s, v) {
    currentH = Math.max(0, Math.min(360, parseInt(h) || 0));
    currentS = Math.max(0, Math.min(100, parseInt(s) || 0));
    currentV = Math.max(0, Math.min(100, parseInt(v) || 0));
    updateHsvUi();
  }

  function stepHsv(param, amount) {
    if (param === 'h') setHsvValues((currentH + amount + 360) % 360, currentS, currentV);
    if (param === 's') setHsvValues(currentH, currentS + amount, currentV);
    if (param === 'v') setHsvValues(currentH, currentS, currentV + amount);
  }

  function setInvoiceTheme(themeName) {
    document.documentElement.removeAttribute('style');
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('race_invoice_theme', themeName);
    localStorage.removeItem('race_hsv_theme');

    if (themeHsv[themeName]) {
      setHsvValues(...themeHsv[themeName]);
    }
  }

  function applyHexInputVal() {
    const hexInput = byId('hsvHexInput');
    if (!hexInput) return;
    const val = hexInput.value.trim().replace('#', '');
    if (/^[0-9A-Fa-f]{6}$/.test(val)) {
      setHsvValues(...rgbToHsv(...hexToRgb(val)));
    }
  }

  function bindHsvControls() {
    const padEl = byId('hsvColorPad');
    let isDraggingPad = false;

    function handlePadEvent(e) {
      if (!padEl) return;
      const rect = padEl.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, clientY - rect.top));

      currentS = Math.round((x / rect.width) * 100);
      currentV = Math.round(100 - (y / rect.height) * 100);
      updateHsvUi();
    }

    if (padEl) {
      padEl.addEventListener('mousedown', e => {
        isDraggingPad = true;
        handlePadEvent(e);
      });
      padEl.addEventListener('touchstart', e => {
        isDraggingPad = true;
        handlePadEvent(e);
      }, { passive: true });
    }

    window.addEventListener('mousemove', e => {
      if (isDraggingPad) handlePadEvent(e);
    });
    window.addEventListener('mouseup', () => {
      isDraggingPad = false;
    });
    window.addEventListener('touchmove', e => {
      if (isDraggingPad) handlePadEvent(e);
    }, { passive: true });
    window.addEventListener('touchend', () => {
      isDraggingPad = false;
    });

    [
      ['hsvHSlider', 'h'],
      ['hsvHNum', 'h'],
      ['hsvSSlider', 's'],
      ['hsvSNum', 's'],
      ['hsvVSlider', 'v'],
      ['hsvVNum', 'v']
    ].forEach(([id, param]) => {
      const control = byId(id);
      if (!control) return;
      control.addEventListener('input', e => {
        const value = parseInt(e.target.value) || 0;
        if (param === 'h') setHsvValues(value, currentS, currentV);
        if (param === 's') setHsvValues(currentH, value, currentV);
        if (param === 'v') setHsvValues(currentH, currentS, value);
      });
    });

    const applyHexButton = byId('btnApplyHexInput');
    if (applyHexButton) applyHexButton.addEventListener('click', applyHexInputVal);
    const hexInput = byId('hsvHexInput');
    if (hexInput) {
      hexInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') applyHexInputVal();
      });
    }

    const saveThemeButton = byId('btnSaveHsvTheme');
    if (saveThemeButton) {
      saveThemeButton.addEventListener('click', () => {
        localStorage.setItem('race_hsv_theme', JSON.stringify({ h: currentH, s: currentS, v: currentV }));
        localStorage.setItem('race_invoice_theme', 'custom_hsv');

        const modalEl = byId('hsvCustomThemeModal');
        const bsModal = modalEl && window.bootstrap ? bootstrap.Modal.getInstance(modalEl) : null;
        if (bsModal) bsModal.hide();
      });
    }
  }

  function restoreThemeAndTemplate() {
    switchInvoiceTemplate(localStorage.getItem('race_active_invoice_template') || 'detailed');

    const savedTheme = localStorage.getItem('race_invoice_theme');
    const savedHsv = localStorage.getItem('race_hsv_theme');

    if (savedTheme === 'custom_hsv' && savedHsv) {
      try {
        const parsed = JSON.parse(savedHsv);
        setHsvValues(parsed.h, parsed.s, parsed.v);
      } catch (e) {
        setHsvValues(24, 68, 35);
      }
    } else if (savedTheme && savedTheme !== 'custom_hsv') {
      setInvoiceTheme(savedTheme);
    } else {
      setHsvValues(24, 68, 35);
    }
  }

  function bindPdfDownload() {
    const button = byId('btnDownloadPdf');
    if (!button) return;

    button.addEventListener('click', function () {
      const options = {
        simple: ['simplePaperArea', false, '_Simple'],
        horizontal: ['horizontalPaperArea', true, '_Simple_Horizontal_3in1'],
        detailed: ['detailedPaperArea', false, '_Detailed']
      };
      const [elementId, isLandscape, filenameSuffix] = options[currentTemplate] || options.detailed;
      const element = byId(elementId);
      const originalText = this.innerHTML;

      this.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Generating PDF...';
      this.disabled = true;

      const opt = {
        margin: isLandscape ? [4, 4, 4, 4] : [5, 5, 5, 5],
        filename: `Invoice_${config.invoiceNumber || 'Bill'}${filenameSuffix}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: isLandscape ? 'landscape' : 'portrait'
        }
      };

      html2pdf().set(opt).from(element).save().then(() => {
        this.innerHTML = originalText;
        this.disabled = false;

        const modalEl = byId('postDownloadModal');
        if (modalEl && window.bootstrap) {
          new bootstrap.Modal(modalEl).show();
        }
      }).catch(err => {
        console.error('PDF generation error:', err);
        this.innerHTML = originalText;
        this.disabled = false;
        window.print();
      });
    });
  }

  function sendToWhatsAppNumber(rawPhone, rawText) {
    const cleanPhone = (rawPhone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }
    const finalPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
    const encodedMsg = encodeURIComponent(rawText || config.whatsAppMessage || '');
    const url = `whatsapp://send?phone=${finalPhone}&text=${encodedMsg}`;
    const webUrl = `https://wa.me/${finalPhone}?text=${encodedMsg}`;
    const win = window.open(url, '_blank');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      window.open(webUrl, '_blank');
    }
  }

  function setRecipientPhone(phone) {
    const input = byId('waCustomPhoneInput');
    if (input) input.value = (phone || '').replace(/[^0-9]/g, '').slice(-10);

    const chipParty = byId('chipPartyPhone');
    const chipCustom = byId('chipCustomPhone');
    if (chipParty) chipParty.classList.add('active');
    if (chipCustom) chipCustom.classList.remove('active');
  }

  function focusCustomPhone() {
    const input = byId('waCustomPhoneInput');
    if (input) {
      input.value = '';
      input.focus();
    }

    const chipParty = byId('chipPartyPhone');
    const chipCustom = byId('chipCustomPhone');
    if (chipParty) chipParty.classList.remove('active');
    if (chipCustom) chipCustom.classList.add('active');
  }

  function bindWhatsApp() {
    const waMsgTextarea = byId('waMessageText');
    if (waMsgTextarea) waMsgTextarea.value = config.whatsAppMessage || '';

    const btnLaunchWa = byId('btnLaunchWhatsApp');
    if (btnLaunchWa) {
      btnLaunchWa.addEventListener('click', () => {
        sendToWhatsAppNumber(byId('waCustomPhoneInput')?.value, byId('waMessageText')?.value);
      });
    }

    const btnSendPostWa = byId('btnSendPostDownloadWa');
    if (btnSendPostWa) {
      btnSendPostWa.addEventListener('click', () => {
        sendToWhatsAppNumber(byId('postWaPhoneInput')?.value, config.whatsAppMessage || '');
      });
    }

    const btnCopyWa = byId('btnCopyWaText');
    if (btnCopyWa) {
      btnCopyWa.addEventListener('click', () => {
        navigator.clipboard.writeText(byId('waMessageText')?.value || '').then(() => {
          const span = byId('copyBtnText');
          if (span) {
            span.textContent = 'Copied to Clipboard!';
            setTimeout(() => { span.textContent = 'Copy Text'; }, 2000);
          }
        });
      });
    }
  }

  window.switchInvoiceTemplate = switchInvoiceTemplate;
  window.triggerPrintMode = triggerPrintMode;
  window.stepHsv = stepHsv;
  window.setInvoiceTheme = setInvoiceTheme;
  window.setRecipientPhone = setRecipientPhone;
  window.focusCustomPhone = focusCustomPhone;

  document.addEventListener('DOMContentLoaded', () => {
    bindHsvControls();
    restoreThemeAndTemplate();
    bindPdfDownload();
    bindWhatsApp();
  });
})();
