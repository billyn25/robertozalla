(() => {
  'use strict';

  const STORAGE = {
    companies: 'parte-digital.companies.v2',
    activeCompany: 'parte-digital.active-company.v1',
    documents: 'parte-digital.documents.v1',
    draft: 'parte-digital.draft.v1',
    counters: 'parte-digital.counters.v1'
  };

  const MIN_INITIAL_LINES = 8;
  const memoryStorage = new Map();
  const moneyFormatter = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const currencyFormatter = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const defaultCompanies = [
    {
      id: 'company-antena-city',
      name: 'ANTENA CITY',
      phone: '641 58 93 94 (24h)',
      email: 'antenascity@gmail.com',
      slogan: 'Antenas TV · Satélite · Porteros automáticos · Videoporteros',
      owner: 'Roberto Fuentes González',
      taxId: '',
      iban: '',
      address: '',
      legalLine: '',
      terms: '',
      logo: ''
    },
    {
      id: 'company-antenas-abaso',
      name: 'ANTENAS ABASO',
      phone: '670 042 626 (24h)',
      email: 'antenasabaso@gmail.com',
      slogan: 'Instalación, reparación y mantenimiento',
      owner: 'Roberto Fuentes González',
      taxId: '',
      iban: '',
      address: '',
      legalLine: '',
      terms: '',
      logo: ''
    }
  ];

  const els = {
    documentForm: document.getElementById('documentForm'),
    sheet: document.getElementById('documentSheet'),
    companySelect: document.getElementById('companySelect'),
    manageCompaniesBtn: document.getElementById('manageCompaniesBtn'),
    newDocumentBtn: document.getElementById('newDocumentBtn'),
    documentsBtn: document.getElementById('documentsBtn'),
    saveDocumentBtn: document.getElementById('saveDocumentBtn'),
    pdfBtn: document.getElementById('pdfBtn'),
    draftStatus: document.getElementById('draftStatus'),
    companyName: document.getElementById('companyName'),
    companySlogan: document.getElementById('companySlogan'),
    companyContact: document.getElementById('companyContact'),
    companyOwner: document.getElementById('companyOwner'),
    companyLegal: document.getElementById('companyLegal'),
    companyTerms: document.getElementById('companyTerms'),
    companyLogo: document.getElementById('companyLogo'),
    companyLogoPlaceholder: document.getElementById('companyLogoPlaceholder'),
    itemsBody: document.getElementById('itemsBody'),
    addLineBtn: document.getElementById('addLineBtn'),
    subtotalAmount: document.getElementById('subtotalAmount'),
    vatPercent: document.getElementById('vatPercent'),
    vatAmount: document.getElementById('vatAmount'),
    grandTotalAmount: document.getElementById('grandTotalAmount'),
    subtotalMode: document.getElementById('subtotalMode'),
    grandTotalMode: document.getElementById('grandTotalMode'),
    totalFromLinesBtn: document.getElementById('totalFromLinesBtn'),
    totalFromBreakdownBtn: document.getElementById('totalFromBreakdownBtn'),
    resetSubtotalBtn: document.getElementById('resetSubtotalBtn'),
    resetGrandTotalBtn: document.getElementById('resetGrandTotalBtn'),
    companyModal: document.getElementById('companyModal'),
    companyList: document.getElementById('companyList'),
    companyForm: document.getElementById('companyForm'),
    newCompanyBtn: document.getElementById('newCompanyBtn'),
    deleteCompanyBtn: document.getElementById('deleteCompanyBtn'),
    duplicateCompanyBtn: document.getElementById('duplicateCompanyBtn'),
    companyLogoInput: document.getElementById('companyLogoInput'),
    removeLogoBtn: document.getElementById('removeLogoBtn'),
    logoPreview: document.getElementById('logoPreview'),
    documentsModal: document.getElementById('documentsModal'),
    documentSearch: document.getElementById('documentSearch'),
    documentsList: document.getElementById('documentsList'),
    documentsCount: document.getElementById('documentsCount'),
    toastRegion: document.getElementById('toastRegion')
  };

  const state = {
    companies: loadJSON(STORAGE.companies, defaultCompanies).map(normalizeCompany),
    activeCompanyId: '',
    documents: loadJSON(STORAGE.documents, []),
    counters: loadJSON(STORAGE.counters, {}),
    currentDocumentId: null,
    subtotalMode: 'lines',
    grandTotalMode: 'auto',
    editingCompanyId: null,
    logoDraft: '',
    draftTimer: null,
    dirty: false,
    signatures: {},
    outputTextareaHeights: null
  };

  if (!state.companies.length) state.companies = defaultCompanies.map(normalizeCompany);
  state.activeCompanyId = getStorageItem(STORAGE.activeCompany) || state.companies[0].id;
  if (!state.companies.some(company => company.id === state.activeCompanyId)) {
    state.activeCompanyId = state.companies[0].id;
  }

  class SignaturePad {
    constructor(canvas, onChange) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: true });
      this.onChange = onChange;
      this.drawing = false;
      this.empty = true;
      this.lastPoint = null;
      this.activePointerId = null;
      this.enabled = false;
      this.configure();
      this.bind();
    }

    configure() {
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.strokeStyle = '#18221c';
      this.ctx.fillStyle = '#18221c';
      this.ctx.lineWidth = 3;
    }

    bind() {
      // Pointer Events funcionan bien en escritorio/Android. En iOS Safari
      // usamos touch explícito: evita el fallo en el que sólo quedaban puntos.
      if (window.PointerEvent && !(/iP(ad|hone|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))) {
        this.canvas.addEventListener('pointerdown', e => this.pointerStart(e));
        this.canvas.addEventListener('pointermove', e => this.pointerMove(e));
        this.canvas.addEventListener('pointerup', e => this.pointerEnd(e));
        this.canvas.addEventListener('pointercancel', e => this.pointerEnd(e));
      } else {
        this.canvas.addEventListener('touchstart', e => this.touchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', e => this.touchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', e => this.touchEnd(e), { passive: false });
        this.canvas.addEventListener('touchcancel', e => this.touchEnd(e), { passive: false });
        this.canvas.addEventListener('mousedown', e => this.mouseStart(e));
        window.addEventListener('mousemove', e => this.mouseMove(e));
        window.addEventListener('mouseup', e => this.mouseEnd(e));
      }
    }

    pointFromClient(clientX, clientY) {
      const rect = this.canvas.getBoundingClientRect();
      const sx = this.canvas.width / Math.max(rect.width, 1);
      const sy = this.canvas.height / Math.max(rect.height, 1);
      return { x: (clientX - rect.left) * sx, y: (clientY - rect.top) * sy };
    }

    beginAt(point) {
      this.drawing = true;
      this.lastPoint = point;
      this.ctx.beginPath();
      this.ctx.moveTo(point.x, point.y);
      this.empty = false;
    }

    drawTo(point) {
      if (!this.drawing || !this.lastPoint) return;
      this.ctx.lineTo(point.x, point.y);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.moveTo(point.x, point.y);
      this.lastPoint = point;
      this.empty = false;
    }

    finish() {
      if (!this.drawing) return;
      this.drawing = false;
      this.lastPoint = null;
      this.activePointerId = null;
      this.onChange?.();
    }

    pointerStart(event) {
      if (!this.enabled) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      this.activePointerId = event.pointerId;
      try { this.canvas.setPointerCapture(event.pointerId); } catch (_) {}
      this.beginAt(this.pointFromClient(event.clientX, event.clientY));
    }

    pointerMove(event) {
      if (!this.drawing || (this.activePointerId !== null && event.pointerId !== this.activePointerId)) return;
      event.preventDefault();
      const events = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [event];
      for (const e of events) this.drawTo(this.pointFromClient(e.clientX, e.clientY));
    }

    pointerEnd(event) {
      if (this.activePointerId !== null && event.pointerId !== this.activePointerId) return;
      event.preventDefault();
      this.finish();
    }

    touchStart(event) {
      if (!this.enabled) return;
      if (!event.touches.length) return;
      event.preventDefault();
      const t = event.touches[0];
      this.beginAt(this.pointFromClient(t.clientX, t.clientY));
    }

    touchMove(event) {
      if (!this.drawing || !event.touches.length) return;
      event.preventDefault();
      const t = event.touches[0];
      this.drawTo(this.pointFromClient(t.clientX, t.clientY));
    }

    touchEnd(event) {
      if (this.drawing) event.preventDefault();
      this.finish();
    }

    mouseStart(event) {
      if (!this.enabled) return;
      if (event.button !== 0) return;
      event.preventDefault();
      this.beginAt(this.pointFromClient(event.clientX, event.clientY));
    }
    mouseMove(event) { if (this.drawing) this.drawTo(this.pointFromClient(event.clientX, event.clientY)); }
    mouseEnd(event) { if (this.drawing) { event.preventDefault(); this.finish(); } }

    setEnabled(enabled) {
      this.enabled = Boolean(enabled);
      this.canvas.classList.toggle('is-signing', this.enabled);
      this.canvas.setAttribute('aria-disabled', this.enabled ? 'false' : 'true');
      if (!this.enabled) this.finish();
    }

    clear(notify = true) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.configure();
      this.empty = true;
      if (notify) this.onChange?.();
    }

    toDataURL() { return this.empty ? '' : this.canvas.toDataURL('image/png'); }

    load(dataUrl) {
      this.clear(false);
      if (!dataUrl) return;
      const image = new Image();
      image.onload = () => {
        this.ctx.drawImage(image, 0, 0, this.canvas.width, this.canvas.height);
        this.empty = false;
      };
      image.src = dataUrl;
    }
  }

  function init() {
    state.signatures.clientSignature = new SignaturePad(
      document.getElementById('clientSignature'),
      () => markDirty()
    );
    state.signatures.technicianSignature = new SignaturePad(
      document.getElementById('technicianSignature'),
      () => markDirty()
    );
    Object.values(state.signatures).forEach(pad => pad.setEnabled(false));

    bindEvents();
    // Limpia referencias a logos antiguos de fábrica y conserva únicamente logos personalizados.
    persistCompanies();
    renderCompanySelect();

    // Producción: recupera el último borrador local si existe; si no, crea uno nuevo.
    const savedDraft = loadJSON(STORAGE.draft, null);
    if (savedDraft && savedDraft.companyId && state.companies.some(c => c.id === savedDraft.companyId)) {
      hydrateDocument(savedDraft, null);
      updateDraftStatus('Borrador recuperado automáticamente');
    } else {
      hydrateDocument(makeBlankDocument(state.activeCompanyId), null);
    }

    renderCompanyHeader();
    calculateTotals();
  }

  function bindEvents() {
    els.companySelect.addEventListener('change', () => {
      const previousCompanyId = state.activeCompanyId;
      const nextCompanyId = els.companySelect.value;
      if (!nextCompanyId || nextCompanyId === previousCompanyId) return;

      if (state.currentDocumentId) {
        state.currentDocumentId = null;
        showToast('La hoja queda como copia nueva al cambiar de empresa.');
      }

      const bankField = els.documentForm.elements.namedItem('bankAccount');
      const previousCompany = state.companies.find(company => company.id === previousCompanyId);
      const nextCompany = state.companies.find(company => company.id === nextCompanyId);
      const currentBank = String(bankField?.value || '').trim();
      const previousDefaultBank = String(previousCompany?.iban || '').trim();

      state.activeCompanyId = nextCompanyId;
      setStorageItem(STORAGE.activeCompany, nextCompanyId);
      renderCompanyHeader();
      if (bankField && (!currentBank || currentBank === previousDefaultBank)) bankField.value = nextCompany?.iban || '';
      const numberField = els.documentForm.elements.namedItem('documentNumber');
      if (numberField && /^\d{4}-\d{4,}$/.test(String(numberField.value || '').trim())) {
        numberField.value = nextDocumentNumber(nextCompanyId);
      }
      markDirty();
    });

    els.documentForm.addEventListener('input', event => {
      if (event.target.closest('#itemsBody')) return;
      const breakdownIds = new Set(['materialsAmount', 'laborAmount', 'travelAmount', 'extraAmount']);
      if (breakdownIds.has(event.target.id)) {
        // Al escribir en el desglose, ese bloque pasa a ser la fuente del total.
        state.subtotalMode = 'breakdown';
        state.grandTotalMode = 'auto';
      } else if (event.target === els.subtotalAmount) {
        state.subtotalMode = 'manual';
        state.grandTotalMode = 'auto';
      } else if (event.target === els.grandTotalAmount) {
        state.grandTotalMode = 'manual';
      }

      if (event.target.matches('textarea')) autoGrow(event.target);
      calculateTotals();
      markDirty();
    });

    els.documentForm.addEventListener('change', event => {
      if (event.target.closest('#itemsBody')) return;
      calculateTotals();
      markDirty();
    });

    els.documentForm.addEventListener('focusout', event => {
      if (event.target.matches('.money-input')) {
        formatMoneyField(event.target);
        calculateTotals();
      }
      // Los input type=date deben conservar YYYY-MM-DD. iOS muestra el formato local
      // y vacía el control si intentamos escribir DD/MM/AAAA dentro del input nativo.
      if (event.target.name === 'arrivalTime' || event.target.name === 'departureTime') {
        normalizeTimeField(event.target);
      }
    });

    els.itemsBody.addEventListener('input', event => {
      const row = event.target.closest('tr');
      if (!row) return;
      const field = event.target.dataset.field;
      if (field === 'amount') {
        row.dataset.amountManual = 'true';
        event.target.classList.add('line-amount-manual');
      } else if (field === 'qty' || field === 'price') {
        recalculateLine(row);
      }
      toggleRowDataClass(row);
      if (event.target.matches('textarea')) autoGrow(event.target);
      calculateTotals();
      markDirty();
    });

    els.itemsBody.addEventListener('focusout', event => {
      if (event.target.dataset.field === 'price' || event.target.dataset.field === 'amount') {
        formatMoneyField(event.target);
        calculateTotals();
      }
    });

    els.itemsBody.addEventListener('click', event => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const row = button.closest('tr');
      if (!row) return;

      if (button.dataset.action === 'recalculate') {
        row.dataset.amountManual = 'false';
        row.querySelector('[data-field="amount"]').classList.remove('line-amount-manual');
        recalculateLine(row, true);
        calculateTotals();
        markDirty();
      }

      if (button.dataset.action === 'delete') {
        const rows = [...els.itemsBody.querySelectorAll('tr')];
        if (rows.length === 1) {
          clearLineRow(row);
        } else {
          row.remove();
        }
        calculateTotals();
        markDirty();
      }
    });

    els.addLineBtn.addEventListener('click', () => {
      let row = null;
      const rows = [...els.itemsBody.querySelectorAll('tr')];

      // En móvil primero reutilizamos líneas vacías que ya existen.
      if (window.matchMedia('(max-width: 760px)').matches) {
        row = rows.find((candidate, index) => {
          return index >= 4 && !candidate.classList.contains('has-data') && !candidate.classList.contains('force-visible');
        }) || null;
        if (row) row.classList.add('force-visible');
      }

      if (!row) {
        row = createLineRow(blankLine());
        row.classList.add('force-visible');
        els.itemsBody.appendChild(row);
      }
      row.querySelector('[data-field="concept"]').focus();
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      markDirty();
    });

    els.totalFromLinesBtn.addEventListener('click', () => {
      state.subtotalMode = 'lines';
      state.grandTotalMode = 'auto';
      calculateTotals();
      markDirty();
    });

    els.totalFromBreakdownBtn.addEventListener('click', () => {
      state.subtotalMode = 'breakdown';
      state.grandTotalMode = 'auto';
      calculateTotals();
      markDirty();
    });

    els.resetSubtotalBtn.addEventListener('click', () => {
      state.subtotalMode = 'lines';
      state.grandTotalMode = 'auto';
      calculateTotals();
      markDirty();
    });

    els.resetGrandTotalBtn.addEventListener('click', () => {
      state.grandTotalMode = 'auto';
      calculateTotals();
      markDirty();
    });

    document.querySelectorAll('.signature-toggle').forEach(button => {
      button.addEventListener('click', () => {
        const key = button.dataset.signature;
        const pad = state.signatures[key];
        if (!pad) return;
        const next = !pad.enabled;
        Object.entries(state.signatures).forEach(([name, otherPad]) => {
          otherPad.setEnabled(name === key ? next : false);
          const otherButton = document.querySelector(`.signature-toggle[data-signature="${name}"]`);
          if (otherButton) {
            otherButton.textContent = name === key && next ? 'Hecho' : 'Firmar';
            otherButton.classList.toggle('is-active', name === key && next);
          }
        });
      });
    });
    document.querySelectorAll('.clear-signature').forEach(button => {
      button.addEventListener('click', () => state.signatures[button.dataset.signature]?.clear());
    });

    els.manageCompaniesBtn.addEventListener('click', () => openCompanyManager(state.activeCompanyId));
    els.newCompanyBtn.addEventListener('click', () => editCompany(null));
    els.companyForm.addEventListener('submit', saveCompanyFromEditor);
    els.deleteCompanyBtn.addEventListener('click', deleteEditingCompany);
    els.duplicateCompanyBtn.addEventListener('click', duplicateEditingCompany);
    els.companyLogoInput.addEventListener('change', handleLogoFile);
    els.removeLogoBtn.addEventListener('click', () => {
      state.logoDraft = '';
      renderLogoPreview('');
    });

    els.companyList.addEventListener('click', event => {
      const button = event.target.closest('[data-company-id]');
      if (button) editCompany(button.dataset.companyId);
    });

    els.newDocumentBtn.addEventListener('click', newDocument);
    els.saveDocumentBtn.addEventListener('click', saveCurrentDocument);
    els.documentsBtn.addEventListener('click', () => {
      els.documentSearch.value = '';
      renderDocumentsList();
      openModal(els.documentsModal);
    });
    els.documentSearch.addEventListener('input', renderDocumentsList);
    els.documentsList.addEventListener('click', handleDocumentListAction);

    els.pdfBtn.addEventListener('click', exportPdf);

    document.addEventListener('click', event => {
      const closeTarget = event.target.closest('[data-close-modal]');
      if (closeTarget) closeModal(document.getElementById(closeTarget.dataset.closeModal));
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        document.querySelectorAll('.modal.is-open').forEach(closeModal);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveCurrentDocument();
      }
    });
  }

  function normalizeCompany(company) {
    const legacyDefaultLogos = new Set([
      'assets/logo-antena-city.png',
      'assets/logo-abaso.png'
    ]);
    const rawLogo = String(company?.logo || '');
    const customLogo = legacyDefaultLogos.has(rawLogo) ? '' : rawLogo;
    return {
      id: company.id || makeId('company'),
      name: company.name || 'EMPRESA',
      phone: company.phone || '',
      email: company.email || '',
      slogan: company.slogan || '',
      owner: company.owner || '',
      taxId: company.taxId || '',
      iban: company.iban || '',
      address: company.address || '',
      legalLine: company.legalLine || '',
      terms: company.terms || '',
      // Solo se conserva el logo elegido por el usuario. Nunca hay logos de fábrica.
      logo: customLogo
    };
  }

  function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function companyNumberKey(companyId, year = new Date().getFullYear()) {
    return `${companyId}:${year}`;
  }

  function nextDocumentNumber(companyId) {
    const year = new Date().getFullYear();
    const key = companyNumberKey(companyId, year);
    const stored = Number(state.counters[key] || 0);
    let highest = stored;
    for (const documentData of state.documents) {
      if (documentData.companyId !== companyId) continue;
      const n = String(documentData.fields?.documentNumber || '').match(new RegExp(`^${year}-(\\d{4,})$`));
      if (n) highest = Math.max(highest, Number(n[1]) || 0);
    }
    return `${year}-${String(highest + 1).padStart(4, '0')}`;
  }

  function commitDocumentNumber(companyId, documentNumber) {
    const match = String(documentNumber || '').trim().match(/^(\d{4})-(\d{4,})$/);
    if (!match) return; // los números manuales se respetan sin alterar el contador
    const key = companyNumberKey(companyId, Number(match[1]));
    state.counters[key] = Math.max(Number(state.counters[key] || 0), Number(match[2]) || 0);
    saveJSON(STORAGE.counters, state.counters);
  }

  function makeBlankDocument(companyId) {
    const company = state.companies.find(item => item.id === companyId) || null;
    return {
      version: 1,
      companyId,
      fields: {
        documentType: 'Presupuesto',
        documentNumber: nextDocumentNumber(companyId),
        documentDate: todayISO(),
        clientCompany: '',
        clientName: '',
        clientPhone: '',
        clientAddress: '',
        clientCity: '',
        clientProvince: '',
        clientTaxId: '',
        clientEmail: '',
        requestInstallation: false,
        requestRepair: false,
        requestMaintenance: false,
        requestInformation: false,
        requestEstimate: false,
        requestSupply: false,
        workAntennaIndividual: false,
        workAntennaCollective: false,
        workSatelliteIndividual: false,
        workSatelliteCollective: false,
        workIntercom: false,
        workVideoIntercom: false,
        serviceDescription: '',
        collectionNotes: '',
        paymentMethod: '',
        receivedBy: '',
        bankAccount: company?.iban || '',
        serviceDate: '',
        arrivalTime: '',
        departureTime: '',
        generalObservations: '',
        materialsAmount: '',
        laborAmount: '',
        travelAmount: '',
        extraAmount: '',
        subtotalAmount: '',
        vatPercent: '21',
        grandTotalAmount: '',
        waivesEstimate: false,
        repairAccepted: false,
        acceptedEstimateNumber: ''
      },
      items: Array.from({ length: MIN_INITIAL_LINES }, blankLine),
      subtotalMode: 'lines',
      grandTotalMode: 'auto',
      signatures: {
        clientSignature: '',
        technicianSignature: ''
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function blankLine() {
    return { qty: '', concept: '', price: '', amount: '', amountManual: false };
  }

  function createLineRow(item = blankLine()) {
    const row = document.createElement('tr');
    row.dataset.amountManual = item.amountManual ? 'true' : 'false';
    if (lineHasData(item)) row.classList.add('has-data');
    row.innerHTML = `
      <td data-label="CANTIDAD">
        <input data-field="qty" type="text" inputmode="decimal" aria-label="Cantidad" value="${escapeAttribute(item.qty)}">
      </td>
      <td data-label="CONCEPTO">
        <textarea data-field="concept" rows="1" aria-label="Concepto">${escapeHtml(item.concept)}</textarea>
      </td>
      <td data-label="PRECIO">
        <input data-field="price" class="money-input" type="text" inputmode="decimal" aria-label="Precio" value="${escapeAttribute(item.price)}">
      </td>
      <td data-label="IMPORTE">
        <input data-field="amount" class="money-input${item.amountManual ? ' line-amount-manual' : ''}" type="text" inputmode="decimal" aria-label="Importe" value="${escapeAttribute(item.amount)}">
      </td>
      <td data-label="ACCIONES" class="screen-only">
        <div class="line-actions">
          <button class="line-action" type="button" data-action="recalculate" title="Calcular cantidad por precio" aria-label="Recalcular importe">↺</button>
          <button class="line-action line-action--delete" type="button" data-action="delete" title="Eliminar línea" aria-label="Eliminar línea">×</button>
        </div>
      </td>
    `;
    requestAnimationFrame(() => autoGrow(row.querySelector('textarea')));
    return row;
  }

  function renderItems(items) {
    els.itemsBody.replaceChildren();
    const rows = items?.length ? items : [blankLine()];
    rows.forEach(item => els.itemsBody.appendChild(createLineRow(item)));
  }

  function clearLineRow(row) {
    row.querySelectorAll('input, textarea').forEach(field => { field.value = ''; });
    row.dataset.amountManual = 'false';
    row.querySelector('[data-field="amount"]').classList.remove('line-amount-manual');
    toggleRowDataClass(row);
  }

  function lineHasData(item) {
    return [item.qty, item.concept, item.price, item.amount].some(value => String(value || '').trim() !== '');
  }

  function toggleRowDataClass(row) {
    const hasData = [...row.querySelectorAll('input, textarea')].some(field => String(field.value || '').trim() !== '');
    row.classList.toggle('has-data', hasData);
  }

  function recalculateLine(row, force = false) {
    if (!force && row.dataset.amountManual === 'true') return;
    const qtyField = row.querySelector('[data-field="qty"]');
    const priceField = row.querySelector('[data-field="price"]');
    const amountField = row.querySelector('[data-field="amount"]');
    const rawPrice = priceField.value.trim();

    if (!rawPrice) {
      amountField.value = '';
      return;
    }

    const price = parseNumber(rawPrice);
    const rawQty = qtyField.value.trim();
    const qty = rawQty ? parseNumber(rawQty) : 1;
    amountField.value = formatMoney(qty * price);
    amountField.classList.remove('line-amount-manual');
    row.dataset.amountManual = 'false';
    toggleRowDataClass(row);
  }

  function calculateTotals() {
    const lineTotal = [...els.itemsBody.querySelectorAll('tr')].reduce((sum, row) => {
      return sum + parseNumber(row.querySelector('[data-field="amount"]')?.value || '');
    }, 0);

    const breakdownTotal = ['materialsAmount', 'laborAmount', 'travelAmount', 'extraAmount']
      .reduce((sum, id) => sum + parseNumber(document.getElementById(id).value), 0);

    if (state.subtotalMode === 'lines') {
      els.subtotalAmount.value = lineTotal ? formatMoney(lineTotal) : '';
    } else if (state.subtotalMode === 'breakdown') {
      els.subtotalAmount.value = breakdownTotal ? formatMoney(breakdownTotal) : '';
    }

    const subtotal = parseNumber(els.subtotalAmount.value);
    const vatPercent = parseNumber(els.vatPercent.value);
    const vat = subtotal * vatPercent / 100;
    els.vatAmount.textContent = formatCurrency(vat);

    if (state.grandTotalMode === 'auto') {
      const grandTotal = subtotal + vat;
      els.grandTotalAmount.value = grandTotal ? formatMoney(grandTotal) : '';
    }

    els.subtotalMode.textContent = state.subtotalMode === 'manual'
      ? 'Total escrito manualmente'
      : state.subtotalMode === 'breakdown'
        ? 'Automático desde materiales, mano de obra, desplazamiento y plus'
        : 'Automático desde las líneas';

    els.grandTotalMode.textContent = state.grandTotalMode === 'manual'
      ? 'Total final escrito manualmente'
      : 'Automático con IVA';
  }

  function serializeDocument() {
    const fields = {};
    els.documentForm.querySelectorAll('[name]').forEach(field => {
      if (field.closest('#itemsBody')) return;
      fields[field.name] = field.type === 'checkbox' ? field.checked : field.value;
    });

    const items = [...els.itemsBody.querySelectorAll('tr')].map(row => ({
      qty: row.querySelector('[data-field="qty"]').value,
      concept: row.querySelector('[data-field="concept"]').value,
      price: row.querySelector('[data-field="price"]').value,
      amount: row.querySelector('[data-field="amount"]').value,
      amountManual: row.dataset.amountManual === 'true'
    }));

    return {
      version: 1,
      companyId: state.activeCompanyId,
      fields,
      items,
      subtotalMode: state.subtotalMode,
      grandTotalMode: state.grandTotalMode,
      signatures: {
        clientSignature: state.signatures.clientSignature.toDataURL(),
        technicianSignature: state.signatures.technicianSignature.toDataURL()
      },
      updatedAt: new Date().toISOString()
    };
  }

  function hydrateDocument(documentData, documentId = null) {
    const fallback = makeBlankDocument(documentData?.companyId || state.activeCompanyId);
    const data = {
      ...fallback,
      ...documentData,
      fields: { ...fallback.fields, ...(documentData?.fields || {}) },
      items: documentData?.items?.length ? documentData.items : fallback.items,
      signatures: { ...fallback.signatures, ...(documentData?.signatures || {}) }
    };

    if (state.companies.some(company => company.id === data.companyId)) {
      state.activeCompanyId = data.companyId;
      setStorageItem(STORAGE.activeCompany, state.activeCompanyId);
    }

    state.currentDocumentId = documentId;
    state.subtotalMode = data.subtotalMode || 'lines';
    state.grandTotalMode = data.grandTotalMode || 'auto';

    renderCompanySelect();
    renderCompanyHeader();

    els.documentForm.querySelectorAll('[name]').forEach(field => {
      if (field.closest('#itemsBody')) return;
      const value = data.fields[field.name];
      if (field.type === 'checkbox') {
        field.checked = Boolean(value);
      } else {
        field.value = value ?? '';
      }
      if (field.matches('textarea')) requestAnimationFrame(() => autoGrow(field));
    });

    renderItems(data.items);
    state.signatures.clientSignature.load(data.signatures.clientSignature);
    state.signatures.technicianSignature.load(data.signatures.technicianSignature);
    Object.entries(state.signatures).forEach(([name, pad]) => {
      pad.setEnabled(false);
      const button = document.querySelector(`.signature-toggle[data-signature="${name}"]`);
      if (button) { button.textContent = 'Firmar'; button.classList.remove('is-active'); }
    });
    calculateTotals();
    state.dirty = false;
    updateDraftStatus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderCompanySelect() {
    const current = state.activeCompanyId;
    els.companySelect.replaceChildren();
    state.companies.forEach(company => {
      const option = document.createElement('option');
      option.value = company.id;
      option.textContent = company.name;
      option.selected = company.id === current;
      els.companySelect.appendChild(option);
    });
  }

  function renderCompanyHeader() {
    const company = getActiveCompany();
    if (!company) return;

    els.companyName.textContent = company.name || 'EMPRESA';
    els.companySlogan.textContent = company.slogan || '';
    els.companySlogan.hidden = !company.slogan;

    els.companyContact.replaceChildren();
    if (company.phone) appendContact(company.phone);
    if (company.email) appendContact(company.email);
    els.companyContact.hidden = !company.phone && !company.email;

    els.companyOwner.textContent = company.owner || '';
    els.companyOwner.hidden = !company.owner;

    const legalText = company.legalLine || [
      company.taxId ? `NIF/CIF: ${company.taxId}` : '',
      company.address
    ].filter(Boolean).join(' · ');
    els.companyLegal.textContent = legalText;
    els.companyLegal.hidden = !legalText;

    els.companyTerms.textContent = company.terms || '';
    els.companyTerms.hidden = !company.terms;

    const logoWrap = document.getElementById('companyLogoWrap');
    const brand = document.getElementById('companyBrand');
    if (company.logo) {
      els.companyLogo.src = company.logo;
      els.companyLogo.alt = `Logo de ${company.name}`;
      els.companyLogo.hidden = false;
      els.companyLogoPlaceholder.hidden = true;
      logoWrap.hidden = false;
      brand.classList.add('company-brand--has-logo');
      brand.classList.remove('company-brand--no-logo');
    } else {
      els.companyLogo.removeAttribute('src');
      els.companyLogo.alt = '';
      els.companyLogo.hidden = true;
      els.companyLogoPlaceholder.hidden = true;
      logoWrap.hidden = true;
      brand.classList.add('company-brand--no-logo');
      brand.classList.remove('company-brand--has-logo');
    }
  }

  function appendContact(text) {
    const span = document.createElement('span');
    span.textContent = text;
    els.companyContact.appendChild(span);
  }

  function getActiveCompany() {
    return state.companies.find(company => company.id === state.activeCompanyId) || state.companies[0];
  }

  function openCompanyManager(companyId) {
    renderCompanyList();
    editCompany(companyId || state.activeCompanyId);
    openModal(els.companyModal);
  }

  function renderCompanyList() {
    els.companyList.replaceChildren();
    state.companies.forEach(company => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `company-list-item${company.id === state.editingCompanyId ? ' is-active' : ''}`;
      button.dataset.companyId = company.id;
      const strong = document.createElement('strong');
      strong.textContent = company.name;
      const small = document.createElement('small');
      small.textContent = company.phone || company.email || 'Sin datos de contacto';
      button.append(strong, small);
      els.companyList.appendChild(button);
    });
  }

  function editCompany(companyId) {
    const company = state.companies.find(item => item.id === companyId) || null;
    state.editingCompanyId = company?.id || null;
    state.logoDraft = company?.logo || '';

    els.companyForm.reset();
    const values = company || {
      id: '', name: '', phone: '', email: '', slogan: '', owner: '',
      taxId: '', iban: '', address: '', legalLine: '', terms: '', logo: ''
    };
    Object.entries(values).forEach(([key, value]) => {
      const field = els.companyForm.elements.namedItem(key === 'id' ? 'companyId' : key);
      if (field) field.value = value || '';
    });
    renderLogoPreview(state.logoDraft);
    els.deleteCompanyBtn.disabled = !company || state.companies.length <= 1;
    els.duplicateCompanyBtn.disabled = !company;
    renderCompanyList();

    if (!company) {
      requestAnimationFrame(() => els.companyForm.elements.name.focus());
    }
  }

  function saveCompanyFromEditor(event) {
    event.preventDefault();
    const formData = new FormData(els.companyForm);
    const name = String(formData.get('name') || '').trim();
    if (!name) {
      showToast('Escribe el nombre de la empresa.', 'error');
      els.companyForm.elements.name.focus();
      return;
    }

    const id = String(formData.get('companyId') || '') || makeId('company');
    const previousCompany = state.companies.find(item => item.id === id) || null;
    const company = normalizeCompany({
      id,
      name,
      phone: formData.get('phone'),
      email: formData.get('email'),
      slogan: formData.get('slogan'),
      owner: formData.get('owner'),
      taxId: formData.get('taxId'),
      iban: formData.get('iban'),
      address: formData.get('address'),
      legalLine: formData.get('legalLine'),
      terms: formData.get('terms'),
      logo: state.logoDraft
    });

    const index = state.companies.findIndex(item => item.id === id);
    if (index >= 0) state.companies[index] = company;
    else state.companies.push(company);

    // Si la hoja actual usaba el IBAN por defecto anterior (o estaba vacío),
    // actualiza al nuevo. Un IBAN escrito manualmente en el documento nunca se pisa.
    const bankField = els.documentForm.elements.namedItem('bankAccount');
    if (bankField && state.activeCompanyId === id) {
      const currentBank = String(bankField.value || '').trim();
      const previousDefault = String(previousCompany?.iban || '').trim();
      if (!currentBank || currentBank === previousDefault) bankField.value = company.iban || '';
    }

    state.editingCompanyId = id;
    state.activeCompanyId = id;
    persistCompanies();
    renderCompanySelect();
    renderCompanyHeader();
    renderCompanyList();
    editCompany(id);
    markDirty();
    showToast('Empresa guardada.');
  }

  function deleteEditingCompany() {
    const id = state.editingCompanyId;
    const company = state.companies.find(item => item.id === id);
    if (!company || state.companies.length <= 1) return;
    if (!confirm(`¿Eliminar la empresa “${company.name}”? Los documentos guardados conservarán la referencia, pero ya no podrán mostrar esta cabecera.`)) return;

    state.companies = state.companies.filter(item => item.id !== id);
    if (state.activeCompanyId === id) state.activeCompanyId = state.companies[0].id;
    persistCompanies();
    renderCompanySelect();
    renderCompanyHeader();
    editCompany(state.activeCompanyId);
    markDirty();
    showToast('Empresa eliminada.');
  }

  function duplicateEditingCompany() {
    const company = state.companies.find(item => item.id === state.editingCompanyId);
    if (!company) return;
    const copy = {
      ...company,
      id: makeId('company'),
      name: `${company.name} · copia`
    };
    state.companies.push(copy);
    state.activeCompanyId = copy.id;
    persistCompanies();
    renderCompanySelect();
    renderCompanyHeader();
    editCompany(copy.id);
    markDirty();
    showToast('Empresa duplicada.');
  }

  function persistCompanies() {
    saveJSON(STORAGE.companies, state.companies);
    setStorageItem(STORAGE.activeCompany, state.activeCompanyId);
  }

  async function handleLogoFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('El archivo elegido no es una imagen.', 'error');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showToast('El logo es demasiado grande. Máximo 8 MB.', 'error');
      return;
    }

    try {
      state.logoDraft = await imageFileToDataUrl(file, 800, 300);
      renderLogoPreview(state.logoDraft);
      showToast('Logo preparado. Pulsa Guardar empresa.');
    } catch (error) {
      console.error(error);
      showToast('No se pudo leer el logo.', 'error');
    }
  }

  function imageFileToDataUrl(file, maxWidth, maxHeight) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const original = String(reader.result || '');
        if (file.type === 'image/svg+xml') {
          resolve(original);
          return;
        }
        const image = new Image();
        image.onerror = reject;
        image.onload = () => {
          const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
          const width = Math.max(1, Math.round(image.width * scale));
          const height = Math.max(1, Math.round(image.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext('2d');
          context.clearRect(0, 0, width, height);
          context.drawImage(image, 0, 0, width, height);
          const webp = canvas.toDataURL('image/webp', .88);
          resolve(webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png'));
        };
        image.src = original;
      };
      reader.readAsDataURL(file);
    });
  }

  function renderLogoPreview(dataUrl) {
    els.logoPreview.replaceChildren();
    if (!dataUrl) {
      const span = document.createElement('span');
      span.textContent = 'Sin logo';
      els.logoPreview.appendChild(span);
      return;
    }
    const image = document.createElement('img');
    image.src = dataUrl;
    image.alt = 'Vista previa del logo';
    els.logoPreview.appendChild(image);
  }

  function newDocument() {
    if (hasMeaningfulData() && !confirm('¿Crear una hoja nueva? El borrador actual se reemplazará, aunque los documentos guardados no se borran.')) return;
    hydrateDocument(makeBlankDocument(state.activeCompanyId), null);
    saveDraftNow();
    showToast('Hoja nueva preparada.');
  }

  function saveCurrentDocument() {
    formatAllMoneyFields();
    calculateTotals();
    const data = serializeDocument();
    const now = new Date().toISOString();

    if (state.currentDocumentId) {
      const index = state.documents.findIndex(document => document.id === state.currentDocumentId);
      if (index >= 0) {
        state.documents[index] = {
          ...state.documents[index],
          ...data,
          id: state.currentDocumentId,
          updatedAt: now
        };
      } else {
        state.currentDocumentId = null;
      }
    }

    if (!state.currentDocumentId) {
      state.currentDocumentId = makeId('document');
      state.documents.unshift({
        ...data,
        id: state.currentDocumentId,
        createdAt: now,
        updatedAt: now
      });
    }

    commitDocumentNumber(data.companyId, data.fields.documentNumber);
    state.documents.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    saveJSON(STORAGE.documents, state.documents);
    state.dirty = false;
    saveDraftNow();
    updateDraftStatus('Documento guardado');
    showToast('Documento guardado en este dispositivo.');
  }

  function renderDocumentsList() {
    const query = normalizeSearch(els.documentSearch.value);
    const filtered = state.documents.filter(documentData => {
      const company = state.companies.find(item => item.id === documentData.companyId);
      const fields = documentData.fields || {};
      const searchable = [
        company?.name,
        fields.documentType,
        fields.documentNumber,
        fields.documentDate,
        fields.clientCompany,
        fields.clientName,
        fields.clientAddress,
        fields.clientCity,
        fields.clientPhone
      ].filter(Boolean).join(' ');
      return normalizeSearch(searchable).includes(query);
    });

    els.documentsCount.textContent = `${filtered.length} de ${state.documents.length}`;
    els.documentsList.replaceChildren();

    if (!filtered.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = '<strong>No hay documentos que mostrar</strong><span>Guarda una hoja o cambia la búsqueda.</span>';
      els.documentsList.appendChild(empty);
      return;
    }

    filtered.forEach(documentData => {
      const fields = documentData.fields || {};
      const company = state.companies.find(item => item.id === documentData.companyId);
      const card = document.createElement('article');
      card.className = 'document-card';
      card.dataset.documentId = documentData.id;

      const info = document.createElement('div');
      const title = document.createElement('div');
      title.className = 'document-card__title';
      const strong = document.createElement('strong');
      strong.textContent = `${fields.documentType || 'Documento'}${fields.documentNumber ? ` n.º ${fields.documentNumber}` : ''}`;
      const client = document.createElement('span');
      client.textContent = fields.clientName || fields.clientCompany || 'Sin cliente';
      title.append(strong, client);

      const meta = document.createElement('div');
      meta.className = 'document-card__meta';
      [
        company?.name || 'Empresa eliminada',
        formatDateForDisplay(fields.documentDate),
        formatCurrency(parseNumber(fields.grandTotalAmount)),
        `Modificado ${formatDateTime(documentData.updatedAt)}`
      ].filter(Boolean).forEach(text => {
        const span = document.createElement('span');
        span.textContent = text;
        meta.appendChild(span);
      });
      info.append(title, meta);

      const actions = document.createElement('div');
      actions.className = 'document-card__actions';
      actions.innerHTML = `
        <button type="button" data-doc-action="open">Recuperar</button>
        <button type="button" data-doc-action="duplicate">Duplicar</button>
        <button type="button" class="delete-doc" data-doc-action="delete">Eliminar</button>
      `;
      card.append(info, actions);
      els.documentsList.appendChild(card);
    });
  }

  function handleDocumentListAction(event) {
    const button = event.target.closest('[data-doc-action]');
    const card = event.target.closest('[data-document-id]');
    if (!button || !card) return;
    const id = card.dataset.documentId;
    const documentData = state.documents.find(item => item.id === id);
    if (!documentData) return;

    if (button.dataset.docAction === 'open') {
      if (!state.companies.some(company => company.id === documentData.companyId)) {
        showToast('La empresa de este documento fue eliminada. Crea de nuevo esa empresa antes de recuperarlo.', 'error');
        return;
      }
      hydrateDocument(documentData, documentData.id);
      closeModal(els.documentsModal);
      saveDraftNow();
      showToast('Documento recuperado.');
    }

    if (button.dataset.docAction === 'duplicate') {
      if (!state.companies.some(company => company.id === documentData.companyId)) {
        showToast('No se puede duplicar: falta la empresa de la cabecera.', 'error');
        return;
      }
      const copy = structuredClone(documentData);
      copy.fields.documentNumber = '';
      copy.updatedAt = new Date().toISOString();
      hydrateDocument(copy, null);
      closeModal(els.documentsModal);
      markDirty();
      showToast('Copia preparada. Cambia el número y pulsa Guardar.');
    }

    if (button.dataset.docAction === 'delete') {
      const label = `${documentData.fields?.documentType || 'documento'} ${documentData.fields?.documentNumber || ''}`.trim();
      if (!confirm(`¿Eliminar ${label}?`)) return;
      state.documents = state.documents.filter(item => item.id !== id);
      saveJSON(STORAGE.documents, state.documents);
      if (state.currentDocumentId === id) state.currentDocumentId = null;
      renderDocumentsList();
      showToast('Documento eliminado.');
    }
  }

  function hasMeaningfulData() {
    const data = serializeDocument();
    const ignored = new Set(['documentType', 'vatPercent', 'subtotalAmount', 'grandTotalAmount']);
    const fieldsHaveData = Object.entries(data.fields).some(([key, value]) => {
      if (ignored.has(key)) return false;
      return typeof value === 'boolean' ? value : String(value || '').trim() !== '';
    });
    const itemsHaveData = data.items.some(item => [item.qty, item.concept, item.price, item.amount].some(value => String(value || '').trim()));
    return fieldsHaveData || itemsHaveData || Boolean(data.signatures.clientSignature || data.signatures.technicianSignature);
  }

  function markDirty() {
    state.dirty = true;
    updateDraftStatus();
    clearTimeout(state.draftTimer);
    state.draftTimer = setTimeout(saveDraftNow, 450);
  }

  function saveDraftNow() {
    clearTimeout(state.draftTimer);
    state.draftTimer = null;
    const data = serializeDocument();
    saveJSON(STORAGE.draft, data);
    updateDraftStatus(state.currentDocumentId ? undefined : 'Borrador guardado automáticamente');
  }

  function updateDraftStatus(message) {
    if (message) {
      els.draftStatus.textContent = message;
      return;
    }
    if (state.currentDocumentId) {
      els.draftStatus.textContent = state.dirty ? 'Documento modificado · pendiente de Guardar' : 'Documento guardado';
    } else {
      els.draftStatus.textContent = state.dirty ? 'Borrador sin guardar como documento' : 'Borrador nuevo';
    }
  }

  async function exportPdf() {
    [...els.itemsBody.querySelectorAll('tr')].forEach(row => {
      const price = row.querySelector('[data-field="price"]')?.value?.trim() || '';
      const amount = row.querySelector('[data-field="amount"]')?.value?.trim() || '';
      if (price && !amount) recalculateLine(row, true);
    });
    formatAllMoneyFields();
    calculateTotals();

    const label = els.pdfBtn.querySelector('span');
    const originalText = label?.textContent || 'PDF';
    els.pdfBtn.disabled = true;
    if (label) label.textContent = 'Generando…';
    try {
      if (!window.jspdf?.jsPDF) throw new Error('No se cargó jsPDF');
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4', compress:true });
      if (typeof doc.autoTable !== 'function') throw new Error('No se cargó AutoTable');
      const data = serializeDocument();
      const company = getActiveCompany();
      await buildVectorPdf(doc, data, company);
      const filename = [data.fields.documentType || 'documento', company?.name || 'empresa', data.fields.documentNumber ? `n-${data.fields.documentNumber}` : '', data.fields.documentDate || new Date().toISOString().slice(0,10)].filter(Boolean).map(slugify).join('_') + '.pdf';
      doc.save(filename);
      showToast('PDF generado correctamente.');
    } catch (error) {
      console.error(error);
      showToast(`No se pudo generar el PDF${error?.message ? ': ' + error.message : ''}`, 'error');
    } finally {
      els.pdfBtn.disabled = false;
      if (label) label.textContent = originalText;
    }
  }

  const VPDF = {
    w:210, h:297, m:7,
    ink:[28,36,31], muted:[92,105,97], line:[187,199,191],
    green:[39,132,78], greenSoft:[237,247,241], head:[246,248,246]
  };
  const vContentW = () => VPDF.w - 2 * VPDF.m;

  function vBox(doc,x,y,w,h,fill=null){
    doc.setDrawColor(...VPDF.line); doc.setLineWidth(.22);
    if(fill){doc.setFillColor(...fill);doc.rect(x,y,w,h,'FD');} else doc.rect(x,y,w,h);
  }
  function vLabel(doc,text,x,y){doc.setFont('helvetica','bold');doc.setFontSize(6.2);doc.setTextColor(...VPDF.muted);doc.text(String(text).toUpperCase(),x,y);}
  function vText(doc,text,x,y,size=8.4,style='normal',opts={}){doc.setFont('helvetica',style);doc.setFontSize(size);doc.setTextColor(...VPDF.ink);doc.text(String(text ?? ''),x,y,opts);}
  function vMoney(value){return `${formatMoney(parseNumber(value))} €`;}
  function vImageSize(dataUrl){return new Promise(resolve=>{const img=new Image();img.onload=()=>resolve({w:img.naturalWidth||1,h:img.naturalHeight||1});img.onerror=()=>resolve(null);img.src=dataUrl;});}
  function vImageFormat(dataUrl){if(/^data:image\/png/i.test(dataUrl))return'PNG';if(/^data:image\/webp/i.test(dataUrl))return'WEBP';return'JPEG';}

  async function buildVectorPdf(doc,data,company){
    const f=data.fields||{};
    let y=VPDF.m;
    y=await vHeader(doc,y,f,company); y+=2.4;
    y=vClient(doc,y,f); y+=2.4;
    y=vServiceGroups(doc,y,f); y+=2.4;
    y=vDescription(doc,y,f); y+=2.6;

    const rows=(data.items||[]).filter(i=>[i.qty,i.concept,i.price,i.amount].some(v=>String(v||'').trim()));
    y=vItems(doc,y,rows);

    // Para un parte normal (hasta 10 conceptos) todo cabe en una sola A4.
    // Sólo se permite otra página cuando la tabla de conceptos realmente lo necesita.
    const bottomNeed=92;
    if(y+bottomNeed>VPDF.h-VPDF.m){doc.addPage();y=VPDF.m;}
    else y+=3;

    y=vBottom(doc,y,f); y+=2.8;
    y=await vConsentSignatures(doc,y,f,data.signatures||{}); y+=2;
    vFooter(doc,y,company);
  }

  async function vHeader(doc,y,f,company){
    const h=26, metaW=51, logoW=28;
    let tx=VPDF.m;
    if(company?.logo){
      try{const sz=await vImageSize(company.logo);if(sz){const scale=Math.min(logoW/sz.w,h/sz.h);const w=sz.w*scale,hh=sz.h*scale;doc.addImage(company.logo,vImageFormat(company.logo),VPDF.m+(logoW-w)/2,y+(h-hh)/2,w,hh,undefined,'FAST');tx=VPDF.m+logoW+3.5;}}catch(_){}}
    const metaX=VPDF.w-VPDF.m-metaW;
    const textW=metaX-tx-4;
    vText(doc,(company?.name||'EMPRESA').toUpperCase(),tx,y+6.8,13,'bold',{maxWidth:textW});
    let ly=y+12.2;
    if(company?.slogan){vText(doc,company.slogan,tx,ly,7.5,'normal',{maxWidth:textW});ly+=3.8;}
    const contact=[company?.phone,company?.email].filter(Boolean).join('  ·  '); if(contact){vText(doc,contact,tx,ly,7.3,'normal',{maxWidth:textW});ly+=3.5;}
    if(company?.owner)vText(doc,company.owner,tx,ly,7.5,'bold',{maxWidth:textW});
    vBox(doc,metaX,y,metaW,h);
    const rh=h/3; const meta=[['DOCUMENTO',f.documentType||'Presupuesto'],['N.º',f.documentNumber||''],['FECHA',formatDateForDisplay(f.documentDate)||'']];
    meta.forEach((r,i)=>{const ry=y+i*rh;if(i){doc.setDrawColor(...VPDF.line);doc.line(metaX,ry,metaX+metaW,ry);}vLabel(doc,r[0],metaX+2.5,ry+3.3);vText(doc,r[1],metaX+2.5,ry+rh-1.8,8.4,'bold',{maxWidth:metaW-5});});
    const legal=company?.legalLine||[company?.taxId?`NIF/CIF: ${company.taxId}`:'',company?.address].filter(Boolean).join(' · ');
    let end=y+h; if(legal){vText(doc,legal,VPDF.m,end+2.6,6.3,'normal',{maxWidth:vContentW()});end+=2.6;}
    doc.setDrawColor(...VPDF.green);doc.setLineWidth(.55);doc.line(VPDF.m,end+1,VPDF.w-VPDF.m,end+1);return end+1;
  }

  function vClient(doc,y,f){
    const h=32;vBox(doc,VPDF.m,y,vContentW(),h);vLabel(doc,'Datos del cliente',VPDF.m+2.8,y+5.0);
    const vals=[['CLIENTE / EMPRESA',f.clientCompany],['NOMBRE',f.clientName],['TELÉFONO',f.clientPhone],['CORREO',f.clientEmail],['DIRECCIÓN',f.clientAddress],['POBLACIÓN',f.clientCity],['PROVINCIA',f.clientProvince],['NIF / DNI',f.clientTaxId]];
    const cw=(vContentW()-6)/2; vals.forEach((r,i)=>{const c=i%2,rr=Math.floor(i/2),x=VPDF.m+3+c*cw,yy=y+9.2+rr*5.2;vLabel(doc,r[0],x,yy);vText(doc,r[1]||'',x+30,yy,7.7,'normal',{maxWidth:cw-32});}); return y+h;
  }
  function vCheck(doc,x,y,checked){doc.setDrawColor(...VPDF.muted);doc.setLineWidth(.25);if(checked){doc.setFillColor(...VPDF.green);doc.rect(x,y,3,3,'FD');doc.setDrawColor(255,255,255);doc.setLineWidth(.35);doc.line(x+.6,y+1.6,x+1.3,y+2.3);doc.line(x+1.3,y+2.3,x+2.5,y+.7);}else doc.rect(x,y,3,3);}
  function vGroup(doc,x,y,w,title,items,f){const h=20;vBox(doc,x,y,w,h);vLabel(doc,title,x+2.5,y+4);items.forEach((it,i)=>{const col=i%2,row=Math.floor(i/2),cx=x+2.5+col*(w/2),cy=y+7+row*4.1;vCheck(doc,cx,cy-2.4,!!f[it[0]]);vText(doc,it[1],cx+5,cy,7.1);});return h;}
  function vServiceGroups(doc,y,f){const gap=3,w=(vContentW()-gap)/2;const req=[['requestInstallation','Instalación'],['requestRepair','Reparación'],['requestMaintenance','Mantenimiento'],['requestInformation','Información'],['requestEstimate','Presupuesto'],['requestSupply','Suministro']];const work=[['workAntennaIndividual','Antena individual'],['workAntennaCollective','Antena colectiva'],['workSatelliteIndividual','Satélite individual'],['workSatelliteCollective','Satélite colectiva'],['workIntercom','Portero automático'],['workVideoIntercom','Videoportero']];vGroup(doc,VPDF.m,y,w,'Solicitud de',req,f);vGroup(doc,VPDF.m+w+gap,y,w,'Tipo de trabajo',work,f);return y+20;}
  function vDescription(doc,y,f){const h=12;vBox(doc,VPDF.m,y,vContentW(),h);vLabel(doc,'Descripción del servicio solicitado',VPDF.m+2.5,y+4);const t=String(f.serviceDescription||'').trim();if(t){const lines=doc.splitTextToSize(t,vContentW()-5).slice(0,2);vText(doc,lines,VPDF.m+2.5,y+7.5,7.4);}return y+h;}

  function vItems(doc,y,items){
    const source=(items.length?items:[{qty:'',concept:'',price:'',amount:''}]).map(i=>[String(i.qty||''),String(i.concept||''),i.price?vMoney(i.price):'',i.amount?vMoney(i.amount):'']);
    const body=source.slice();
    if(body.length<10){while(body.length<10)body.push(['','','','']);}
    doc.autoTable({startY:y,margin:{left:VPDF.m,right:VPDF.m,top:VPDF.m,bottom:VPDF.m},head:[['CANTIDAD','CONCEPTO','PRECIO','IMPORTE']],body,theme:'grid',showHead:'everyPage',styles:{font:'helvetica',fontSize:7.7,textColor:VPDF.ink,lineColor:VPDF.line,lineWidth:.18,cellPadding:1.45,valign:'middle',minCellHeight:5.0},headStyles:{fillColor:VPDF.head,textColor:VPDF.muted,fontStyle:'bold',fontSize:6.6,halign:'center',minCellHeight:5.8},columnStyles:{0:{cellWidth:17,halign:'center'},1:{cellWidth:'auto',halign:'left'},2:{cellWidth:25,halign:'right'},3:{cellWidth:27,halign:'right'}},rowPageBreak:'avoid'});
    return doc.lastAutoTable.finalY;
  }

  function vBottom(doc,y,f){
    const gap=3,rightW=60,leftW=vContentW()-rightW-gap;
    let ly=y;
    const payH=13;vBox(doc,VPDF.m,ly,leftW,payH);const third=leftW/3;
    [['Anotaciones para cobro',f.collectionNotes],['Forma de pago',f.paymentMethod],['Recibí',f.receivedBy]].forEach((r,i)=>{if(i){doc.setDrawColor(...VPDF.line);doc.line(VPDF.m+i*third,ly,VPDF.m+i*third,ly+payH);}vLabel(doc,r[0],VPDF.m+i*third+2,ly+3.5);vText(doc,r[1]||'',VPDF.m+i*third+2,ly+8,7.3,'normal',{maxWidth:third-4});});ly+=payH+2;
    const ibanH=10;vBox(doc,VPDF.m,ly,leftW,ibanH);vLabel(doc,'Cuenta / IBAN',VPDF.m+2,ly+3.3);vText(doc,f.bankAccount||'',VPDF.m+2,ly+7.3,7.6,'normal',{maxWidth:leftW-4});ly+=ibanH+2;
    const timeH=10;vBox(doc,VPDF.m,ly,leftW,timeH);const t3=leftW/3;[['Fecha',formatDateForDisplay(f.serviceDate)],['Llegada',f.arrivalTime],['Salida',f.departureTime]].forEach((r,i)=>{if(i){doc.setDrawColor(...VPDF.line);doc.line(VPDF.m+i*t3,ly,VPDF.m+i*t3,ly+timeH);}vLabel(doc,r[0],VPDF.m+i*t3+2,ly+3.3);vText(doc,r[1]||'',VPDF.m+i*t3+2,ly+7.2,7.4);});ly+=timeH+2;
    const obsH=17;vBox(doc,VPDF.m,ly,leftW,obsH);vLabel(doc,'Observaciones generales',VPDF.m+2,ly+3.5);const obs=String(f.generalObservations||'').trim();if(obs){const lines=doc.splitTextToSize(obs,leftW-4).slice(0,3);vText(doc,lines,VPDF.m+2,ly+7.3,7.2);}ly+=obsH;

    const rx=VPDF.m+leftW+gap;vTotals(doc,rx,y,rightW,f);
    return Math.max(ly,y+52);
  }
  function vTotals(doc,x,y,w,f){
    let cy=y;const split=x+w-24;
    const detail=[['Materiales',f.materialsAmount],['Mano de obra',f.laborAmount],['Desplazamiento',f.travelAmount],['Plus extra',f.extraAmount]];
    detail.forEach(r=>{const h=7;vBox(doc,x,cy,w,h);doc.setDrawColor(...VPDF.line);doc.line(split,cy,split,cy+h);vText(doc,r[0],x+2.5,cy+4.6,7.1);vText(doc,r[1]?vMoney(r[1]):'',x+w-2.5,cy+4.6,7.6,'bold',{align:'right'});cy+=h;});
    const totalRows=[['TOTAL IMPORTE',vMoney(f.subtotalAmount||0),9,VPDF.greenSoft,VPDF.green],['I.V.A. '+(f.vatPercent||0)+' %',vMoney(parseNumber(f.subtotalAmount)*parseNumber(f.vatPercent)/100),8.5,null,VPDF.ink],['TOTAL FACTURA',vMoney(f.grandTotalAmount||0),10,VPDF.green,null]];
    totalRows.forEach((r,idx)=>{const [lab,val,h,fill,textColor]=r;vBox(doc,x,cy,w,h,fill);doc.setDrawColor(...(idx===2?[255,255,255]:VPDF.line));doc.line(split,cy,split,cy+h);doc.setFont('helvetica','bold');doc.setFontSize(idx===2?8:7.4);doc.setTextColor(...(idx===2?[255,255,255]:(textColor||VPDF.ink)));doc.text(lab,x+2.5,cy+h/2+1.2);doc.setFontSize(idx===2?10.5:8.6);doc.text(val,x+w-2.5,cy+h/2+1.2,{align:'right'});cy+=h;});
    doc.setTextColor(...VPDF.ink);return cy;
  }

  async function vConsentSignatures(doc,y,f,sigs){
    const consentH=11;vBox(doc,VPDF.m,y,vContentW(),consentH);vCheck(doc,VPDF.m+2.5,y+2.2,!!f.waivesEstimate);vText(doc,'Renuncia a presupuesto previo y autoriza la reparación',VPDF.m+7,y+4.5,6.8);vCheck(doc,VPDF.m+2.5,y+6.3,!!f.repairAccepted);vText(doc,'Conforme con la reparación / presupuesto',VPDF.m+7,y+8.6,6.8);vLabel(doc,'Presupuesto n.º',VPDF.m+125,y+3.8);vText(doc,f.acceptedEstimateNumber||'',VPDF.m+125,y+8.2,7.5);
    y+=consentH+2;const gap=3,w=(vContentW()-gap)/2,h=23;await vSignature(doc,VPDF.m,y,w,h,'Firma del cliente',sigs.clientSignature);await vSignature(doc,VPDF.m+w+gap,y,w,h,'Recibí / firma del técnico',sigs.technicianSignature);return y+h;
  }
  async function vSignature(doc,x,y,w,h,title,dataUrl){vBox(doc,x,y,w,h);vLabel(doc,title,x+2.5,y+3.8);if(dataUrl){try{const sz=await vImageSize(dataUrl);if(sz){const aw=w-5,ah=h-7,sc=Math.min(aw/sz.w,ah/sz.h);const iw=sz.w*sc,ih=sz.h*sc;doc.addImage(dataUrl,'PNG',x+(w-iw)/2,y+5+(ah-ih)/2,iw,ih,undefined,'FAST');}}catch(_){}}}
  function vFooter(doc,y,company){const terms=String(company?.terms||'').trim();doc.setFont('helvetica','normal');doc.setFontSize(5.8);doc.setTextColor(...VPDF.muted);if(terms){const lines=doc.splitTextToSize(terms,vContentW()-55).slice(0,2);doc.text(lines,VPDF.m,y+2);}doc.setFont('helvetica','bold');doc.setTextColor(...VPDF.ink);doc.text('EL EJEMPLAR TIENE EFECTOS DE RECIBO',VPDF.w-VPDF.m,y+2,{align:'right'});}

  function formatAllMoneyFields() {
    document.querySelectorAll('.money-input').forEach(formatMoneyField);
  }

  function formatMoneyField(field) {
    const raw = field.value.trim();
    if (!raw) return;
    field.value = formatMoney(parseNumber(raw));
  }

  function parseNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    let text = String(value ?? '').trim().replace(/\s/g, '').replace(/€/g, '');
    if (!text) return 0;

    const comma = text.lastIndexOf(',');
    const dot = text.lastIndexOf('.');
    if (comma >= 0 && dot >= 0) {
      if (comma > dot) text = text.replace(/\./g, '').replace(',', '.');
      else text = text.replace(/,/g, '');
    } else if (comma >= 0) {
      text = text.replace(/\./g, '').replace(',', '.');
    } else if ((text.match(/\./g) || []).length > 1) {
      const parts = text.split('.');
      const decimal = parts.pop();
      text = `${parts.join('')}.${decimal}`;
    }

    text = text.replace(/[^0-9+\-.]/g, '');
    const number = Number.parseFloat(text);
    return Number.isFinite(number) ? number : 0;
  }

  function formatMoney(number) {
    return moneyFormatter.format(Number.isFinite(number) ? number : 0);
  }

  function formatCurrency(number) {
    return currencyFormatter.format(Number.isFinite(number) ? number : 0);
  }

  function normalizeDateField(field) {
    const text = String(field.value || '').trim();
    if (!text) return;
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) {
      field.value = `${iso[3]}/${iso[2]}/${iso[1]}`;
      return;
    }
    const digits = text.replace(/\D/g, '');
    if (digits.length === 8) {
      field.value = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    }
  }

  function normalizeTimeField(field) {
    const text = String(field.value || '').trim();
    if (!text) return;
    const digits = text.replace(/\D/g, '');
    if (digits.length === 4) {
      field.value = `${digits.slice(0, 2)}:${digits.slice(2)}`;
    }
  }

  function formatDateForDisplay(value) {
    if (!value) return '';
    const text = String(value).trim();
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    return text;
  }

  function formatDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(date);
  }

  function autoGrow(textarea) {
    if (!textarea) return;
    textarea.style.height = 'auto';
    const minimum = textarea.closest('.items-table') ? 28 : 0;
    textarea.style.height = `${Math.max(textarea.scrollHeight, minimum)}px`;
  }

  function openModal(modal) {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    requestAnimationFrame(() => modal.querySelector('button, input, select, textarea')?.focus());
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.modal.is-open')) document.body.classList.remove('modal-open');
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast${type === 'error' ? ' toast--error' : ''}`;
    toast.textContent = message;
    els.toastRegion.appendChild(toast);
    setTimeout(() => toast.remove(), 3600);
  }

  function getStorageItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return memoryStorage.get(key) ?? null;
    }
  }

  function setStorageItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (error) {
      memoryStorage.set(key, String(value));
      return false;
    }
  }

  function saveJSON(key, value) {
    const serialized = JSON.stringify(value);
    const stored = setStorageItem(key, serialized);
    if (!stored && document.body) {
      console.warn(`No se pudo guardar ${key} en localStorage; se usará memoria temporal.`);
    }
    return stored;
  }

  function loadJSON(key, fallback) {
    try {
      const value = getStorageItem(key);
      return value ? JSON.parse(value) : structuredClone(fallback);
    } catch (error) {
      console.warn(`No se pudo leer ${key}`, error);
      return structuredClone(fallback);
    }
  }

  function makeId(prefix) {
    if (crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function slugify(value) {
    return String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'documento';
  }

  function normalizeSearch(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/\n/g, '&#10;');
  }

  function nextFrame() {
    return new Promise(resolve => requestAnimationFrame(resolve));
  }

  init();
})();
