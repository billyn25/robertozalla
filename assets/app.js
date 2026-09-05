(() => {
  'use strict';

  const STORAGE = {
    companies: 'parte-digital.companies.v2',
    activeCompany: 'parte-digital.active-company.v1',
    documents: 'parte-digital.documents.v1',
    draft: 'parte-digital.draft.v1'
  };

  const MIN_INITIAL_LINES = 8;
  const MAX_A4_LINES = 10; // calculado para una sola A4 con márgenes de 4 mm y pie completo
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
      this.configure();
      this.bind();
    }

    configure() {
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.strokeStyle = '#18221c';
      this.ctx.lineWidth = 3;
    }

    bind() {
      this.canvas.addEventListener('pointerdown', event => this.start(event));
      this.canvas.addEventListener('pointermove', event => this.move(event));
      this.canvas.addEventListener('pointerup', event => this.end(event));
      this.canvas.addEventListener('pointercancel', event => this.end(event));
      this.canvas.addEventListener('pointerleave', event => {
        if (this.drawing && event.buttons === 0) this.end(event);
      });
    }

    point(event) {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) * (this.canvas.width / rect.width),
        y: (event.clientY - rect.top) * (this.canvas.height / rect.height)
      };
    }

    start(event) {
      event.preventDefault();
      this.canvas.setPointerCapture?.(event.pointerId);
      this.drawing = true;
      this.lastPoint = this.point(event);
      this.ctx.beginPath();
      this.ctx.arc(this.lastPoint.x, this.lastPoint.y, 1.5, 0, Math.PI * 2);
      this.ctx.fillStyle = '#18221c';
      this.ctx.fill();
      this.empty = false;
    }

    move(event) {
      if (!this.drawing) return;
      event.preventDefault();
      const point = this.point(event);
      this.ctx.beginPath();
      this.ctx.moveTo(this.lastPoint.x, this.lastPoint.y);
      this.ctx.lineTo(point.x, point.y);
      this.ctx.stroke();
      this.lastPoint = point;
      this.empty = false;
    }

    end(event) {
      if (!this.drawing) return;
      event.preventDefault();
      this.drawing = false;
      this.lastPoint = null;
      this.onChange?.();
    }

    clear(notify = true) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.configure();
      this.empty = true;
      if (notify) this.onChange?.();
    }

    toDataURL() {
      return this.empty ? '' : this.canvas.toDataURL('image/png');
    }

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

    bindEvents();
    // Limpia referencias a logos antiguos de fábrica y conserva únicamente logos personalizados.
    persistCompanies();
    renderCompanySelect();

    // Fase de pruebas: cada carga empieza con una hoja realmente vacía.
    // No recuperamos borradores ni documentos guardados.
    hydrateDocument(makeBlankDocument(state.activeCompanyId), null);

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

      state.activeCompanyId = nextCompanyId;
      setStorageItem(STORAGE.activeCompany, nextCompanyId);
      renderCompanyHeader();
      markDirty();
    });

    els.documentForm.addEventListener('input', event => {
      if (event.target.closest('#itemsBody')) return;
      if (event.target === els.subtotalAmount) {
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

      // La plantilla A4 está calculada para un máximo de 10 líneas sin invadir el pie.
      if (!row && rows.length >= MAX_A4_LINES) {
        showToast(`Máximo ${MAX_A4_LINES} líneas para mantener el PDF en una sola hoja A4.`, 'error');
        return;
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

    document.querySelectorAll('.clear-signature').forEach(button => {
      button.addEventListener('click', () => {
        state.signatures[button.dataset.signature]?.clear();
      });
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
        showToast('El guardado de documentos está desactivado durante esta fase.');
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
      address: company.address || '',
      legalLine: company.legalLine || '',
      terms: company.terms || '',
      // Solo se conserva el logo elegido por el usuario. Nunca hay logos de fábrica.
      logo: customLogo
    };
  }

  function makeBlankDocument(companyId) {
    return {
      version: 1,
      companyId,
      fields: {
        documentType: 'Presupuesto',
        documentNumber: '',
        documentDate: '',
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
        bankAccount: '',
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
      taxId: '', address: '', legalLine: '', terms: '', logo: ''
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
    const company = normalizeCompany({
      id,
      name,
      phone: formData.get('phone'),
      email: formData.get('email'),
      slogan: formData.get('slogan'),
      owner: formData.get('owner'),
      taxId: formData.get('taxId'),
      address: formData.get('address'),
      legalLine: formData.get('legalLine'),
      terms: formData.get('terms'),
      logo: state.logoDraft
    });

    const index = state.companies.findIndex(item => item.id === id);
    if (index >= 0) state.companies[index] = company;
    else state.companies.push(company);

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
    // Guardado/autoguardado desactivado temporalmente durante las pruebas.
  }

  function saveDraftNow() {
    // Desactivado temporalmente: no persistir datos del parte durante las pruebas.
    updateDraftStatus('Modo prueba · sin guardar');
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
    formatAllMoneyFields();
    calculateTotals();

    const label = els.pdfBtn.querySelector('span');
    const originalText = label.textContent;
    els.pdfBtn.disabled = true;
    label.textContent = 'Generando…';

    let overlay;
    try {
      if (typeof window.html2canvas !== 'function') throw new Error('No se cargó el motor de captura');
      if (!window.jspdf?.jsPDF) throw new Error('No se cargó el motor PDF');

      overlay = document.createElement('div');
      overlay.className = 'pdf-progress-overlay';
      overlay.innerHTML = '<div class="pdf-progress-card"><span class="pdf-spinner"></span><strong>Generando PDF</strong><small>Preparando una hoja A4…</small></div>';
      document.body.appendChild(overlay);

      const canvas = await renderDocumentCanvas();
      if (!canvas || canvas.width < 100 || canvas.height < 100) throw new Error('La captura de la hoja no es válida');

      // Detectar una captura realmente vacía antes de crear el PDF.
      const check = canvas.getContext('2d', { willReadFrequently: true });
      const sample = check.getImageData(0, 0, Math.min(canvas.width, 500), Math.min(canvas.height, 500)).data;
      let nonWhite = 0;
      for (let i = 0; i < sample.length; i += 40) {
        if (sample[i] < 245 || sample[i + 1] < 245 || sample[i + 2] < 245) { nonWhite++; if (nonWhite > 20) break; }
      }
      if (nonWhite <= 20) throw new Error('La hoja se capturó en blanco');

      const fields = serializeDocument().fields;
      const company = getActiveCompany();
      const filename = [
        fields.documentType || 'documento',
        company?.name || 'empresa',
        fields.documentNumber ? `n-${fields.documentNumber}` : '',
        fields.documentDate || new Date().toISOString().slice(0, 10)
      ].filter(Boolean).map(slugify).join('_') + '.pdf';

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const pageW = 210, pageH = 297, margin = 4;
      const maxW = pageW - margin * 2, maxH = pageH - margin * 2;
      const ratio = canvas.width / canvas.height;
      let outW = maxW, outH = outW / ratio;
      if (outH > maxH) { outH = maxH; outW = outH * ratio; }
      const x = (pageW - outW) / 2;
      // Alinear arriba: evita el gran margen superior que producía el centrado vertical.
      const y = margin;
      const imgData = canvas.toDataURL('image/jpeg', 0.94);
      pdf.addImage(imgData, 'JPEG', x, y, outW, outH, undefined, 'FAST');
      pdf.save(filename);
      showToast('PDF generado correctamente en una sola hoja A4.');
    } catch (error) {
      console.error('PDF:', error);
      showToast(`No se pudo generar el PDF${error?.message ? ': ' + error.message : ''}`, 'error');
    } finally {
      overlay?.remove();
      els.pdfBtn.disabled = false;
      label.textContent = originalText;
    }
  }

  async function renderDocumentCanvas() {
    const stage = document.createElement('div');
    stage.className = 'output-stage output-stage--capture';
    const clone = els.sheet.cloneNode(true);
    clone.id = 'outputSheetClone';
    clone.classList.add('output-clone');
    syncOutputControls(els.sheet, clone);
    clone.querySelectorAll('.screen-only').forEach(node => node.remove());
    clone.querySelectorAll('.company-logo-placeholder').forEach(node => node.remove());
    stage.appendChild(clone);
    document.body.appendChild(stage);

    try {
      if (document.fonts?.ready) await document.fonts.ready;
      await nextFrame();
      await nextFrame();

      // Limpiar controles de edición para que el PDF parezca un documento, no una web.
      clone.querySelectorAll('textarea').forEach(textarea => {
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.max(textarea.scrollHeight, textarea.id === 'generalObservations' ? 52 : 26)}px`;
        textarea.style.resize = 'none';
        textarea.style.overflow = 'hidden';
      });
      clone.querySelectorAll('img').forEach(img => {
        if (img.src && !img.src.startsWith('data:')) img.crossOrigin = 'anonymous';
      });
      await Promise.all([...clone.querySelectorAll('img')].filter(i => i.src).map(waitForImage));

      // PDF A4 PRO: nunca dejamos más de MAX_A4_LINES en la copia de salida.
      // Las líneas vacías sobrantes se recortan; si faltan, se completan hasta el mínimo visual.
      const outputRows = [...clone.querySelectorAll('#itemsBody tr')];
      while (outputRows.length > MAX_A4_LINES) {
        const candidate = outputRows.pop();
        const hasValue = [...candidate.querySelectorAll('input, textarea')].some(el => String(el.value || '').trim());
        if (hasValue) {
          outputRows.push(candidate);
          break;
        }
        candidate.remove();
      }

      // La salida A4 siempre reserva exactamente 10 líneas: así PC y móvil generan
      // la misma geometría y aprovechamos la página sin dejar media hoja vacía.
      const body = clone.querySelector('#itemsBody');
      let currentRows = [...body.querySelectorAll('tr')];
      const rowTemplate = currentRows[currentRows.length - 1]?.cloneNode(true);
      while (rowTemplate && currentRows.length < MAX_A4_LINES) {
        const emptyRow = rowTemplate.cloneNode(true);
        emptyRow.classList.remove('has-data', 'force-visible');
        emptyRow.querySelectorAll('input, textarea').forEach(el => {
          if (el.type === 'checkbox') el.checked = false;
          else el.value = '';
        });
        body.appendChild(emptyRow);
        currentRows.push(emptyRow);
      }

      // Safari/iOS y html2canvas no siempre pintan el valor de inputs en la última
      // columna. Para el PDF convertimos los valores visibles en texto real.
      staticizeOutputValues(clone);

      await nextFrame();

      // Render A4 virtual FIJO. Nunca usamos el alto/ancho calculado por el viewport del móvil.
      // 794 x 1136 mantiene exactamente la proporción del área útil A4 de 202 x 289 mm
      // (márgenes de 4 mm por cada lado), por lo que PC/iPhone/Android generan el mismo PDF.
      const width = 794;
      const height = 1136;
      stage.style.width = `${width}px`;
      stage.style.height = `${height}px`;
      clone.style.width = `${width}px`;
      clone.style.minWidth = `${width}px`;
      clone.style.maxWidth = `${width}px`;
      clone.style.height = `${height}px`;
      clone.style.minHeight = `${height}px`;
      clone.style.maxHeight = `${height}px`;

      await nextFrame();

      const canvas = await window.html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        width,
        height,
        windowWidth: Math.max(width, 1200),
        windowHeight: Math.max(height, 1600),
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
        removeContainer: true
      });
      return canvas;
    } finally {
      stage.remove();
    }
  }


  function staticizeOutputValues(clone) {
    // Líneas: la copia PDF deja de depender de cómo Safari pinte los inputs.
    clone.querySelectorAll('#itemsBody tr').forEach(row => {
      const fields = [
        ['qty', 'center'],
        ['concept', 'left'],
        ['price', 'right'],
        ['amount', 'right']
      ];
      fields.forEach(([name, align]) => {
        const control = row.querySelector(`[data-field="${name}"]`);
        if (!control) return;
        const value = String(control.value || '').trim();
        const node = document.createElement('div');
        node.className = `output-static-value output-static-value--${align}`;
        node.textContent = value;
        control.replaceWith(node);
      });
    });

    // Totales/desglose: texto estático y separador vertical de altura completa.
    clone.querySelectorAll('.totals-panel input.money-input, .totals-panel #grandTotalAmount').forEach(control => {
      const node = document.createElement('div');
      node.className = 'output-static-value output-static-value--right';
      node.textContent = String(control.value || '').trim();
      control.replaceWith(node);
    });
  }

  function waitForImage(img) {
    return new Promise(resolve => {
      if (!img || !img.src || img.complete) return resolve();
      const done = () => resolve();
      img.addEventListener('load', done, { once:true });
      img.addEventListener('error', done, { once:true });
      setTimeout(done, 1800);
    });
  }

  function syncOutputControls(source, clone) {
    const sourceControls = [...source.querySelectorAll('input, textarea, select, canvas')];
    const cloneControls = [...clone.querySelectorAll('input, textarea, select, canvas')];

    sourceControls.forEach((sourceControl, index) => {
      const cloneControl = cloneControls[index];
      if (!cloneControl) return;

      if (sourceControl instanceof HTMLInputElement) {
        if (sourceControl.type === 'date') {
          const shownDate = formatDateForDisplay(sourceControl.value);
          try { cloneControl.type = 'text'; } catch (_) {}
          cloneControl.value = shownDate;
          cloneControl.setAttribute('value', shownDate);
        } else {
          cloneControl.value = sourceControl.value;
          cloneControl.setAttribute('value', sourceControl.value);
        }
        if (sourceControl.type === 'checkbox' || sourceControl.type === 'radio') {
          cloneControl.checked = sourceControl.checked;
          if (sourceControl.checked) cloneControl.setAttribute('checked', 'checked');
          else cloneControl.removeAttribute('checked');
        }
      } else if (sourceControl instanceof HTMLTextAreaElement) {
        cloneControl.value = sourceControl.value;
        cloneControl.textContent = sourceControl.value;
      } else if (sourceControl instanceof HTMLSelectElement) {
        cloneControl.value = sourceControl.value;
        [...cloneControl.options].forEach(option => {
          if (option.value === sourceControl.value) option.setAttribute('selected', 'selected');
          else option.removeAttribute('selected');
        });
      } else if (sourceControl instanceof HTMLCanvasElement && cloneControl instanceof HTMLCanvasElement) {
        cloneControl.width = sourceControl.width;
        cloneControl.height = sourceControl.height;
        const context = cloneControl.getContext('2d');
        context?.drawImage(sourceControl, 0, 0);
      }
    });
  }

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
