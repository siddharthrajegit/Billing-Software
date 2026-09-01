/**
 * Invoice Dynamic Calculation & Real-Time GST Engine with Multi-Mode Settings Support
 */

document.addEventListener('DOMContentLoaded', () => {
  const itemsTableBody = document.getElementById('invoiceItemsBody');
  const btnAddItem = document.getElementById('btnAddItem');
  const isGstToggle = document.getElementById('isGstToggle');
  const isInterstateToggle = document.getElementById('isInterstateToggle');
  const partySelect = document.getElementById('partySelect');

  // Form Configuration & Settings
  const invoiceForm = document.getElementById('invoiceForm');
  const firmStateCode = invoiceForm ? invoiceForm.dataset.firmStateCode || '' : '';
  const defaultGstMode = invoiceForm ? invoiceForm.dataset.defaultGst || 'gst' : 'gst';
  const gstCalcMode = invoiceForm ? invoiceForm.dataset.gstCalcMode || 'separate' : 'separate';
  const enableDiscount = invoiceForm ? invoiceForm.dataset.enableDiscount !== '0' : true;
  const isSeparateGst = (gstCalcMode !== 'final_amount');

  // Summary Inputs
  const subtotalInput = document.getElementById('subtotalInput');
  const discountTypeSelect = document.getElementById('discountTypeSelect');
  const discountValueInput = document.getElementById('discountValueInput');
  const discountAmountInput = document.getElementById('discountAmountInput');
  const taxableAmountInput = document.getElementById('taxableAmountInput');
  const finalTaxRateSelect = document.getElementById('finalTaxRateSelect');
  const cgstAmountInput = document.getElementById('cgstAmountInput');
  const sgstAmountInput = document.getElementById('sgstAmountInput');
  const igstAmountInput = document.getElementById('igstAmountInput');
  const taxAmountInput = document.getElementById('taxAmountInput');
  const roundOffInput = document.getElementById('roundOffInput');
  const grandTotalInput = document.getElementById('grandTotalInput');
  const paidAmountInput = document.getElementById('paidAmountInput');
  const balanceDueInput = document.getElementById('balanceDueInput');

  // Party Live Search & Autocomplete Engine
  const partySearchInput = document.getElementById('partySearchInput');
  const partySearchResults = document.getElementById('partySearchResults');
  const btnClearPartySearch = document.getElementById('btnClearPartySearch');

  // Cache parties from partySelect options
  const partiesList = [];
  if (partySelect) {
    Array.from(partySelect.options).forEach(opt => {
      if (opt.value) {
        partiesList.push({
          id: opt.value,
          name: opt.dataset.name || '',
          phone: opt.dataset.phone || '',
          gstin: opt.dataset.gstin || '',
          address: opt.dataset.address || '',
          state: opt.dataset.state || '',
          stateCode: opt.dataset.stateCode || ''
        });
      }
    });
  }

  // Strict Form Inputs
  const invoiceNumberInput = document.getElementById('invoiceNumberInput');
  const partyNameInput = document.getElementById('partyNameInput');
  const partyPhoneInput = document.getElementById('partyPhoneInput');
  const partyGstinInput = document.getElementById('partyGstinInput');
  const partyAddressInput = document.getElementById('partyAddressInput');
  const partyStateSelect = document.getElementById('partyStateSelect');
  const partyStateCodeInput = document.getElementById('partyStateCodeInput');
  const phoneValidationStatus = document.getElementById('phoneValidationStatus');
  const gstinValidationStatus = document.getElementById('gstinValidationStatus');

  // 1. Strict Live Validation Helpers
  function validatePhoneField() {
    if (!partyPhoneInput || !phoneValidationStatus) return true;
    const val = partyPhoneInput.value.trim();
    if (val.length === 0) {
      phoneValidationStatus.textContent = 'Exact 10 digits required';
      phoneValidationStatus.className = 'form-text small text-muted';
      partyPhoneInput.classList.remove('is-invalid', 'is-valid');
      return true;
    }
    if (val.length === 10 && /^[0-9]{10}$/.test(val)) {
      phoneValidationStatus.textContent = '✓ Valid 10-digit mobile number';
      phoneValidationStatus.className = 'form-text small text-success fw-semibold';
      partyPhoneInput.classList.remove('is-invalid');
      partyPhoneInput.classList.add('is-valid');
      return true;
    } else {
      phoneValidationStatus.textContent = `❌ Must be exactly 10 digits (currently ${val.length}/10)`;
      phoneValidationStatus.className = 'form-text small text-danger fw-semibold';
      partyPhoneInput.classList.add('is-invalid');
      partyPhoneInput.classList.remove('is-valid');
      return false;
    }
  }

  function validateGstinField() {
    if (!partyGstinInput || !gstinValidationStatus) return true;
    const val = partyGstinInput.value.trim().toUpperCase();
    if (val.length === 0) {
      gstinValidationStatus.textContent = 'Exact 15 letters & numbers';
      gstinValidationStatus.className = 'form-text small text-muted';
      partyGstinInput.classList.remove('is-invalid', 'is-valid');
      return true;
    }
    if (val.length === 15 && /^[0-9A-Z]{15}$/.test(val)) {
      gstinValidationStatus.textContent = '✓ Valid 15-character GSTIN';
      gstinValidationStatus.className = 'form-text small text-success fw-semibold';
      partyGstinInput.classList.remove('is-invalid');
      partyGstinInput.classList.add('is-valid');
      return true;
    } else {
      gstinValidationStatus.textContent = `❌ Must be exactly 15 characters (currently ${val.length}/15)`;
      gstinValidationStatus.className = 'form-text small text-danger fw-semibold';
      partyGstinInput.classList.add('is-invalid');
      partyGstinInput.classList.remove('is-valid');
      return false;
    }
  }

  // 2. Strict Input Listeners
  if (invoiceNumberInput) {
    invoiceNumberInput.addEventListener('input', () => {
      invoiceNumberInput.value = invoiceNumberInput.value.replace(/[^0-9]/g, '');
    });
  }

  if (partyPhoneInput) {
    partyPhoneInput.addEventListener('input', () => {
      partyPhoneInput.value = partyPhoneInput.value.replace(/[^0-9]/g, '');
      validatePhoneField();
    });
    partyPhoneInput.addEventListener('blur', validatePhoneField);
  }

  if (partyGstinInput) {
    partyGstinInput.addEventListener('input', () => {
      partyGstinInput.value = partyGstinInput.value.toUpperCase().replace(/[^0-9A-Z]/g, '');
      validateGstinField();

      // Auto-detect and select state from 2-digit GSTIN prefix
      if (partyGstinInput.value.length >= 2 && partyStateSelect) {
        const stateCodePrefix = partyGstinInput.value.slice(0, 2);
        const matchedOption = Array.from(partyStateSelect.options).find(opt => opt.dataset.code === stateCodePrefix);
        if (matchedOption) {
          partyStateSelect.value = matchedOption.value;
          if (partyStateCodeInput) partyStateCodeInput.value = stateCodePrefix;
          if (isInterstateToggle && firmStateCode) {
            isInterstateToggle.checked = (firmStateCode !== stateCodePrefix);
          }
        }
      }
    });
    partyGstinInput.addEventListener('blur', validateGstinField);
  }

  // 3. State Dropdown Auto-Sync Code & Interstate
  if (partyStateSelect) {
    partyStateSelect.addEventListener('change', () => {
      const selectedOption = partyStateSelect.options[partyStateSelect.selectedIndex];
      const stateCode = selectedOption ? (selectedOption.dataset.code || '') : '';
      if (partyStateCodeInput) {
        partyStateCodeInput.value = stateCode;
      }
      if (isInterstateToggle && firmStateCode && stateCode) {
        isInterstateToggle.checked = (firmStateCode !== stateCode);
        isInterstateToggle.dispatchEvent(new Event('change'));
      }
    });
  }

  function selectParty(p) {
    if (partyNameInput) partyNameInput.value = p.name || '';
    if (partyPhoneInput) partyPhoneInput.value = p.phone || '';
    if (partyGstinInput) partyGstinInput.value = p.gstin || '';
    if (partyAddressInput) partyAddressInput.value = p.address || '';

    if (partyStateSelect) {
      if (p.state) {
        partyStateSelect.value = p.state;
      } else if (p.stateCode) {
        const opt = Array.from(partyStateSelect.options).find(o => o.dataset.code === p.stateCode);
        if (opt) partyStateSelect.value = opt.value;
      }
    }

    if (partyStateCodeInput) {
      const selectedOption = partyStateSelect ? partyStateSelect.options[partyStateSelect.selectedIndex] : null;
      partyStateCodeInput.value = p.stateCode || (selectedOption ? selectedOption.dataset.code : '');
    }

    if (partySelect) partySelect.value = p.id;
    if (partySearchInput) {
      partySearchInput.value = p.name + (p.phone ? ` (${p.phone})` : '');
    }

    if (btnClearPartySearch) btnClearPartySearch.style.display = 'block';
    if (partySearchResults) partySearchResults.classList.add('d-none');

    validatePhoneField();
    validateGstinField();

    // Auto check Interstate if state codes differ
    const currentCustStateCode = partyStateCodeInput ? partyStateCodeInput.value : p.stateCode;
    if (isInterstateToggle && firmStateCode && currentCustStateCode) {
      isInterstateToggle.checked = (firmStateCode !== currentCustStateCode);
    }

    updateAllCalculations();
  }

  function renderPartyResults(matches) {
    if (!partySearchResults) return;
    partySearchResults.innerHTML = '';
    const currentQuery = partySearchInput ? partySearchInput.value.trim() : '';

    if (matches.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'list-group-item text-muted small p-2 text-center';
      emptyDiv.textContent = 'No matching registered parties found.';
      partySearchResults.appendChild(emptyDiv);

      if (currentQuery) {
        const createBtn = document.createElement('button');
        createBtn.type = 'button';
        createBtn.className = 'list-group-item list-group-item-action p-2 text-start text-primary fw-bold bg-primary-subtle border-top';
        createBtn.innerHTML = `<i class="bi bi-person-plus-fill me-1"></i> + Create "${currentQuery}" as New Party`;
        createBtn.addEventListener('click', () => {
          partySearchResults.classList.add('d-none');
          const modalEl = document.getElementById('modalQuickAddParty');
          const quickNameInput = document.getElementById('quickPartyName');
          if (quickNameInput) quickNameInput.value = currentQuery;
          if (modalEl) {
            const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modalInstance.show();
          }
        });
        partySearchResults.appendChild(createBtn);
      }
      partySearchResults.classList.remove('d-none');
      return;
    }

    matches.forEach(p => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'list-group-item list-group-item-action p-2 text-start';
      btn.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
          <strong class="text-dark">${p.name}</strong>
          ${p.phone ? `<span class="badge bg-light text-secondary border"><i class="bi bi-telephone me-1"></i>${p.phone}</span>` : ''}
        </div>
        <div class="small text-muted d-flex justify-content-between mt-1">
          <span>${p.gstin ? `<span class="text-primary fw-medium">GSTIN: ${p.gstin}</span>` : (p.address || p.state || 'Manual Entry')}</span>
          ${p.state ? `<span class="text-secondary">${p.state}</span>` : ''}
        </div>
      `;

      btn.addEventListener('click', () => {
        selectParty(p);
      });

      partySearchResults.appendChild(btn);
    });

    if (currentQuery) {
      const createBtn = document.createElement('button');
      createBtn.type = 'button';
      createBtn.className = 'list-group-item list-group-item-action p-2 text-start text-primary small fw-semibold border-top bg-light';
      createBtn.innerHTML = `<i class="bi bi-plus-circle me-1"></i> + Create "${currentQuery}" as New Party`;
      createBtn.addEventListener('click', () => {
        partySearchResults.classList.add('d-none');
        const modalEl = document.getElementById('modalQuickAddParty');
        const quickNameInput = document.getElementById('quickPartyName');
        if (quickNameInput) quickNameInput.value = currentQuery;
        if (modalEl) {
          const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
          modalInstance.show();
        }
      });
      partySearchResults.appendChild(createBtn);
    }

    partySearchResults.classList.remove('d-none');
  }

  if (partySearchInput) {
    partySearchInput.addEventListener('focus', () => {
      const query = partySearchInput.value.trim().toLowerCase();
      const matches = partiesList.filter(p => 
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.phone.toLowerCase().includes(query) ||
        p.gstin.toLowerCase().includes(query)
      );
      renderPartyResults(matches);
    });

    partySearchInput.addEventListener('input', () => {
      const query = partySearchInput.value.trim().toLowerCase();
      const matches = partiesList.filter(p => 
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.phone.toLowerCase().includes(query) ||
        p.gstin.toLowerCase().includes(query)
      );
      renderPartyResults(matches);
      if (btnClearPartySearch) {
        btnClearPartySearch.style.display = query.length > 0 ? 'block' : 'none';
      }
    });

    partySearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && partySearchResults) {
        partySearchResults.classList.add('d-none');
      }
    });
  }

  if (btnClearPartySearch) {
    btnClearPartySearch.addEventListener('click', () => {
      if (partySearchInput) partySearchInput.value = '';
      if (partySelect) partySelect.value = '';
      btnClearPartySearch.style.display = 'none';
      if (partySearchResults) partySearchResults.classList.add('d-none');

      if (partyNameInput) partyNameInput.value = '';
      if (partyPhoneInput) partyPhoneInput.value = '';
      if (partyGstinInput) partyGstinInput.value = '';
      if (partyAddressInput) partyAddressInput.value = '';
      if (partyStateSelect) partyStateSelect.value = '';
      if (partyStateCodeInput) partyStateCodeInput.value = '';

      validatePhoneField();
      validateGstinField();

      if (partySearchInput) partySearchInput.focus();
    });
  }

  // Close dropdown on click outside
  document.addEventListener('click', (e) => {
    if (partySearchResults && !partySearchResults.contains(e.target) && partySearchInput && !partySearchInput.contains(e.target)) {
      partySearchResults.classList.add('d-none');
    }
  });

  // Fallback for direct select change
  if (partySelect) {
    partySelect.addEventListener('change', (e) => {
      const selectedOption = partySelect.options[partySelect.selectedIndex];
      if (!selectedOption || !selectedOption.value) return;
      selectParty({
        id: selectedOption.value,
        name: selectedOption.dataset.name || '',
        phone: selectedOption.dataset.phone || '',
        gstin: selectedOption.dataset.gstin || '',
        address: selectedOption.dataset.address || '',
        state: selectedOption.dataset.state || '',
        stateCode: selectedOption.dataset.stateCode || ''
      });
    });
  }

  // Add Item Row
  if (btnAddItem && itemsTableBody) {
    btnAddItem.addEventListener('click', () => {
      addNewRow();
    });
  }

  function addNewRow(itemData = {}) {
    const rowCount = itemsTableBody.querySelectorAll('tr').length;
    const tr = document.createElement('tr');
    tr.className = 'invoice-item-row align-middle';

    const isGst = isGstToggle ? isGstToggle.checked : true;
    const showRowTaxRate = isGst && isSeparateGst;

    const itemId = itemData.item_id || itemData.id || '';
    const itemName = itemData.item_name || itemData.name || '';
    const itemRate = (itemData.rate !== undefined && itemData.rate !== null && itemData.rate !== '') ? itemData.rate : (itemData.sale_price || '');
    const itemTaxRate = itemData.tax_rate !== undefined && itemData.tax_rate !== null ? parseFloat(itemData.tax_rate) : 18;

    tr.innerHTML = `
      <td class="text-center row-num text-muted small p-1">${rowCount + 1}</td>
      <td>
        <input type="hidden" name="item_id" class="row-item-id" value="${itemId}">
        <input type="text" name="item_name" class="form-control form-control-sm row-item-name" placeholder="Item name / Description" value="${itemName}" list="itemsDataList" required>
      </td>
      <td style="width: 85px;">
        <input type="text" name="hsn_code" class="form-control form-control-sm row-hsn" placeholder="HSN/SAC" value="${itemData.hsn_code || ''}">
      </td>
      <td style="width: 82px;">
        <input type="number" name="quantity" class="form-control form-control-sm row-qty text-end" min="0.01" step="any" value="${itemData.quantity !== undefined ? itemData.quantity : '1'}" required>
      </td>
      <td style="width: 78px;">
        <select name="unit" class="form-select form-select-sm row-unit">
          <option value="PCS" ${itemData.unit === 'PCS' ? 'selected' : ''}>PCS</option>
          <option value="KG" ${itemData.unit === 'KG' ? 'selected' : ''}>KG</option>
          <option value="BOX" ${itemData.unit === 'BOX' ? 'selected' : ''}>BOX</option>
          <option value="MTR" ${itemData.unit === 'MTR' ? 'selected' : ''}>MTR</option>
          <option value="LTR" ${itemData.unit === 'LTR' ? 'selected' : ''}>LTR</option>
          <option value="NOS" ${itemData.unit === 'NOS' ? 'selected' : ''}>NOS</option>
          <option value="BAG" ${itemData.unit === 'BAG' ? 'selected' : ''}>BAG</option>
          <option value="PKT" ${itemData.unit === 'PKT' ? 'selected' : ''}>PKT</option>
        </select>
      </td>
      <td style="width: 95px;">
        <input type="number" name="rate" class="form-control form-control-sm row-rate text-end" min="0" step="any" placeholder="0.00" value="${itemRate}" required>
      </td>
      <td style="width: 72px;" class="discount-col ${!enableDiscount ? 'd-none' : ''}">
        <input type="number" name="item_discount_percent" class="form-control form-control-sm row-discount-pct text-end" min="0" max="100" step="any" placeholder="0%" value="${itemData.discount_percent !== undefined ? itemData.discount_percent : '0'}">
        <input type="hidden" name="item_discount_amount" class="row-discount-amt" value="0">
      </td>
      <td style="width: 85px;" class="gst-col ${!showRowTaxRate ? 'd-none' : ''}">
        <select name="item_tax_rate" class="form-select form-select-sm row-tax-rate">
          <option value="0" ${itemTaxRate === 0 ? 'selected' : ''}>0%</option>
          <option value="5" ${itemTaxRate === 5 ? 'selected' : ''}>5%</option>
          <option value="12" ${itemTaxRate === 12 ? 'selected' : ''}>12%</option>
          <option value="18" ${itemTaxRate === 18 ? 'selected' : ''}>18%</option>
          <option value="28" ${itemTaxRate === 28 ? 'selected' : ''}>28%</option>
        </select>
        <input type="hidden" name="item_taxable" class="row-taxable" value="0">
        <input type="hidden" name="item_cgst_rate" class="row-cgst-rate" value="0">
        <input type="hidden" name="item_cgst_amount" class="row-cgst-amt" value="0">
        <input type="hidden" name="item_sgst_rate" class="row-sgst-rate" value="0">
        <input type="hidden" name="item_sgst_amount" class="row-sgst-amt" value="0">
        <input type="hidden" name="item_igst_rate" class="row-igst-rate" value="0">
        <input type="hidden" name="item_igst_amount" class="row-igst-amt" value="0">
      </td>
      <td style="width: 105px;" class="text-end fw-bold">
        <span class="row-total-display">0.00</span>
        <input type="hidden" name="item_total" class="row-total" value="0">
      </td>
      <td class="text-center p-1" style="width: 32px;">
        <button type="button" class="btn btn-outline-danger btn-sm border-0 btn-remove-row p-1" title="Remove item">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;

    itemsTableBody.appendChild(tr);
    bindRowEvents(tr);
    updateAllCalculations();
  }

  function bindRowEvents(row) {
    const itemNameInput = row.querySelector('.row-item-name');
    const qtyInput = row.querySelector('.row-qty');
    const rateInput = row.querySelector('.row-rate');
    const discInput = row.querySelector('.row-discount-pct');
    const taxRateSelect = row.querySelector('.row-tax-rate');
    const btnRemove = row.querySelector('.btn-remove-row');

    // Autocomplete on name input
    if (itemNameInput) {
      itemNameInput.addEventListener('input', () => {
        const option = document.querySelector(`#itemsDataList option[value="${itemNameInput.value}"]`);
        if (option) {
          row.querySelector('.row-item-id').value = option.dataset.id || '';
          row.querySelector('.row-hsn').value = option.dataset.hsn || '';
          row.querySelector('.row-unit').value = option.dataset.unit || 'PCS';
          row.querySelector('.row-rate').value = option.dataset.price || '0';
          if (row.querySelector('.row-tax-rate')) {
            row.querySelector('.row-tax-rate').value = option.dataset.tax || '0';
          }
        }
        updateRowCalculation(row);
        updateAllCalculations();
      });
    }

    [qtyInput, rateInput, discInput, taxRateSelect].forEach(input => {
      if (input) {
        input.addEventListener('input', () => {
          updateRowCalculation(row);
          updateAllCalculations();
        });
        input.addEventListener('change', () => {
          updateRowCalculation(row);
          updateAllCalculations();
        });
      }
    });

    if (btnRemove) {
      btnRemove.addEventListener('click', () => {
        const rows = itemsTableBody.querySelectorAll('.invoice-item-row');
        if (rows.length > 1) {
          row.remove();
          renumberRows();
          updateAllCalculations();
        } else {
          alert('A bill must contain at least one item row.');
        }
      });
    }
  }

  function renumberRows() {
    const rows = itemsTableBody.querySelectorAll('.invoice-item-row');
    rows.forEach((r, idx) => {
      const numCell = r.querySelector('.row-num');
      if (numCell) numCell.textContent = idx + 1;
    });
  }

  function updateRowCalculation(row) {
    const qty = parseFloat(row.querySelector('.row-qty').value) || 0;
    const rate = parseFloat(row.querySelector('.row-rate').value) || 0;
    const discPct = enableDiscount ? (parseFloat(row.querySelector('.row-discount-pct').value) || 0) : 0;
    const taxRate = parseFloat(row.querySelector('.row-tax-rate').value) || 0;

    const isGst = isGstToggle ? isGstToggle.checked : true;
    const isInterstate = isInterstateToggle ? isInterstateToggle.checked : false;

    // 1. Gross = qty * rate
    const gross = qty * rate;

    // 2. Discount amount
    const discAmt = gross * (discPct / 100);
    const taxable = Math.max(0, gross - discAmt);

    // 3. Tax calculation (only if Separate GST mode is active)
    let cgstRate = 0, cgstAmt = 0;
    let sgstRate = 0, sgstAmt = 0;
    let igstRate = 0, igstAmt = 0;
    let totalTax = 0;

    if (isGst && isSeparateGst && taxRate > 0) {
      if (isInterstate) {
        igstRate = taxRate;
        igstAmt = taxable * (igstRate / 100);
        totalTax = igstAmt;
      } else {
        cgstRate = taxRate / 2;
        sgstRate = taxRate / 2;
        cgstAmt = taxable * (cgstRate / 100);
        sgstAmt = taxable * (sgstRate / 100);
        totalTax = cgstAmt + sgstAmt;
      }
    }

    const rowTotal = taxable + totalTax;

    // Write back to inputs
    row.querySelector('.row-discount-amt').value = discAmt.toFixed(2);
    row.querySelector('.row-taxable').value = taxable.toFixed(2);
    row.querySelector('.row-cgst-rate').value = cgstRate.toFixed(2);
    row.querySelector('.row-cgst-amt').value = cgstAmt.toFixed(2);
    row.querySelector('.row-sgst-rate').value = sgstRate.toFixed(2);
    row.querySelector('.row-sgst-amt').value = sgstAmt.toFixed(2);
    row.querySelector('.row-igst-rate').value = igstRate.toFixed(2);
    row.querySelector('.row-igst-amt').value = igstAmt.toFixed(2);
    row.querySelector('.row-total').value = rowTotal.toFixed(2);
    row.querySelector('.row-total-display').textContent = rowTotal.toFixed(2);

    return {
      gross,
      discAmt,
      taxable,
      cgstAmt,
      sgstAmt,
      igstAmt,
      totalTax,
      rowTotal
    };
  }

  function updateAllCalculations() {
    const rows = itemsTableBody ? itemsTableBody.querySelectorAll('.invoice-item-row') : [];
    let totalSubtotal = 0;
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalTax = 0;

    const isGst = isGstToggle ? isGstToggle.checked : true;
    const isInterstate = isInterstateToggle ? isInterstateToggle.checked : false;

    rows.forEach(r => {
      const calc = updateRowCalculation(r);
      totalTaxable += calc.taxable;
      if (isSeparateGst) {
        totalCgst += calc.cgstAmt;
        totalSgst += calc.sgstAmt;
        totalIgst += calc.igstAmt;
        totalTax += calc.totalTax;
      }
    });

    totalSubtotal = totalTaxable;

    // Overall Invoice Discount
    const discType = discountTypeSelect ? discountTypeSelect.value : 'percentage';
    const discVal = discountValueInput ? parseFloat(discountValueInput.value) || 0 : 0;
    let overallDiscAmt = 0;

    if (discType === 'percentage') {
      overallDiscAmt = totalSubtotal * (discVal / 100);
    } else {
      overallDiscAmt = discVal;
    }

    if (discountAmountInput) discountAmountInput.value = overallDiscAmt.toFixed(2);

    const netBeforeTax = Math.max(0, totalSubtotal - overallDiscAmt);

    // If GST on Final Amount Mode is active, compute composite tax on netBeforeTax
    if (isGst && !isSeparateGst) {
      const finalTaxRate = finalTaxRateSelect ? parseFloat(finalTaxRateSelect.value) || 0 : 0;
      if (isInterstate) {
        totalIgst = netBeforeTax * (finalTaxRate / 100);
        totalCgst = 0;
        totalSgst = 0;
        totalTax = totalIgst;
      } else {
        totalCgst = netBeforeTax * ((finalTaxRate / 2) / 100);
        totalSgst = netBeforeTax * ((finalTaxRate / 2) / 100);
        totalIgst = 0;
        totalTax = totalCgst + totalSgst;
      }
    } else if (!isGst) {
      totalTax = 0;
      totalCgst = 0;
      totalSgst = 0;
      totalIgst = 0;
    }

    const unroundedGrand = netBeforeTax + totalTax;

    // Round off
    const roundedGrand = Math.round(unroundedGrand);
    const roundOff = roundedGrand - unroundedGrand;

    // Update form inputs & UI
    if (subtotalInput) subtotalInput.value = totalSubtotal.toFixed(2);
    if (taxableAmountInput) taxableAmountInput.value = netBeforeTax.toFixed(2);
    if (cgstAmountInput) cgstAmountInput.value = totalCgst.toFixed(2);
    if (sgstAmountInput) sgstAmountInput.value = totalSgst.toFixed(2);
    if (igstAmountInput) igstAmountInput.value = totalIgst.toFixed(2);
    if (taxAmountInput) taxAmountInput.value = totalTax.toFixed(2);
    if (roundOffInput) roundOffInput.value = roundOff.toFixed(2);
    if (grandTotalInput) grandTotalInput.value = roundedGrand.toFixed(2);

    // Balance Due
    const paidAmt = paidAmountInput ? parseFloat(paidAmountInput.value) || 0 : 0;
    const balanceDue = Math.max(0, roundedGrand - paidAmt);
    if (balanceDueInput) balanceDueInput.value = balanceDue.toFixed(2);

    // Update text labels
    const displaySubtotal = document.getElementById('displaySubtotal');
    const displayTax = document.getElementById('displayTax');
    const displayGrandTotal = document.getElementById('displayGrandTotal');
    const displayBalanceDue = document.getElementById('displayBalanceDue');

    if (displaySubtotal) displaySubtotal.textContent = '₹ ' + totalSubtotal.toFixed(2);
    if (displayTax) displayTax.textContent = '₹ ' + totalTax.toFixed(2);
    if (displayGrandTotal) displayGrandTotal.textContent = '₹ ' + roundedGrand.toFixed(2);
    if (displayBalanceDue) displayBalanceDue.textContent = '₹ ' + balanceDue.toFixed(2);
  }

  // Toggle GST Mode Event
  if (isGstToggle) {
    isGstToggle.addEventListener('change', () => {
      const isGst = isGstToggle.checked;
      const gstCols = document.querySelectorAll('.gst-col');
      const gstSummarySection = document.getElementById('gstSummarySection');
      const gstBadge = document.getElementById('gstModeBadge');
      const finalGstRateRow = document.getElementById('finalGstRateRow');

      gstCols.forEach(col => {
        if (isGst && isSeparateGst) {
          col.classList.remove('d-none');
        } else {
          col.classList.add('d-none');
        }
      });

      if (finalGstRateRow) {
        if (isGst && !isSeparateGst) finalGstRateRow.classList.remove('d-none');
        else finalGstRateRow.classList.add('d-none');
      }

      if (gstSummarySection) {
        if (isGst) gstSummarySection.classList.remove('d-none');
        else gstSummarySection.classList.add('d-none');
      }

      if (gstBadge) {
        if (isGst) {
          gstBadge.textContent = isSeparateGst ? 'GST Tax Invoice (Separate Item GST)' : 'GST Tax Invoice (Final Amount GST)';
          gstBadge.className = 'badge bg-primary';
        } else {
          gstBadge.textContent = 'Non-GST Retail Bill';
          gstBadge.className = 'badge bg-secondary';
        }
      }

      updateAllCalculations();
    });
  }

  // Toggle Interstate Event
  if (isInterstateToggle) {
    isInterstateToggle.addEventListener('change', () => {
      const isInter = isInterstateToggle.checked;
      const cgstSgstRow = document.getElementById('cgstSgstSummaryRow');
      const igstRow = document.getElementById('igstSummaryRow');

      if (cgstSgstRow && igstRow) {
        if (isInter) {
          cgstSgstRow.classList.add('d-none');
          igstRow.classList.remove('d-none');
        } else {
          cgstSgstRow.classList.remove('d-none');
          igstRow.classList.add('d-none');
        }
      }

      updateAllCalculations();
    });
  }

  // Overall Discount, Final Tax Rate and Payment Input listeners
  if (discountTypeSelect) discountTypeSelect.addEventListener('change', updateAllCalculations);
  if (discountValueInput) discountValueInput.addEventListener('input', updateAllCalculations);
  if (finalTaxRateSelect) finalTaxRateSelect.addEventListener('change', updateAllCalculations);
  if (paidAmountInput) paidAmountInput.addEventListener('input', updateAllCalculations);

  // Quick action: Paid in full button
  const btnPayFull = document.getElementById('btnPayFull');
  if (btnPayFull) {
    btnPayFull.addEventListener('click', () => {
      const grandTotal = grandTotalInput ? parseFloat(grandTotalInput.value) || 0 : 0;
      if (paidAmountInput) {
        paidAmountInput.value = grandTotal.toFixed(2);
        updateAllCalculations();
      }
    });
  }

  // Quick action: Unpaid button
  const btnPayZero = document.getElementById('btnPayZero');
  if (btnPayZero) {
    btnPayZero.addEventListener('click', () => {
      if (paidAmountInput) {
        paidAmountInput.value = '0.00';
        updateAllCalculations();
      }
    });
  }

  // Form submission safety hook & strict field validation
  if (invoiceForm) {
    invoiceForm.addEventListener('submit', (e) => {
      updateAllCalculations();

      // 1. Validate Bill / Invoice Number (digits only)
      const invNum = invoiceNumberInput ? invoiceNumberInput.value.trim() : '';
      if (!invNum || !/^[0-9]+$/.test(invNum)) {
        e.preventDefault();
        alert('Invalid Bill Number: Bill / Invoice number must contain only numbers (no letters allowed).');
        if (invoiceNumberInput) invoiceNumberInput.focus();
        return false;
      }

      // 2. Validate Phone Number (must be exactly 10 digits if provided)
      if (partyPhoneInput && partyPhoneInput.value.trim().length > 0) {
        const phone = partyPhoneInput.value.trim();
        if (phone.length !== 10 || !/^[0-9]{10}$/.test(phone)) {
          e.preventDefault();
          alert(`Invalid Phone Number: Phone number must contain exactly 10 digits (currently ${phone.length} digits). Neither more nor less.`);
          partyPhoneInput.focus();
          return false;
        }
      }

      // 3. Validate GSTIN (must be exactly 15 alphanumeric characters if provided)
      if (partyGstinInput && partyGstinInput.value.trim().length > 0) {
        const gstin = partyGstinInput.value.trim().toUpperCase();
        if (gstin.length !== 15 || !/^[0-9A-Z]{15}$/.test(gstin)) {
          e.preventDefault();
          alert(`Invalid GSTIN Number: GST number must contain exactly 15 characters (currently ${gstin.length} characters). Neither more nor less.`);
          partyGstinInput.focus();
          return false;
        }
      }

      // 4. Validate State Selection
      if (partyStateSelect && !partyStateSelect.value) {
        e.preventDefault();
        alert('Invalid State: Please select a valid Indian State / Union Territory from the dropdown.');
        partyStateSelect.focus();
        return false;
      }

      // 5. Validate at least one item
      const itemRows = itemsTableBody.querySelectorAll('.invoice-item-row');
      let validRowCount = 0;
      itemRows.forEach(r => {
        const nameInput = r.querySelector('.row-item-name');
        if (nameInput && nameInput.value.trim().length > 0) {
          validRowCount++;
        }
      });

      if (validRowCount === 0) {
        e.preventDefault();
        alert('Please enter at least one product / item name in the bill.');
        return false;
      }

      // Clear draft on successful submission
      clearDraft();
    });
  }

  // ----------------------------------------------------
  // 💾 Auto-Save Draft & Crash Recovery Engine
  // ----------------------------------------------------
  const firmId = invoiceForm ? (invoiceForm.dataset.firmId || 'default') : 'default';
  const isEditMode = invoiceForm ? (invoiceForm.dataset.isEdit === '1') : false;
  const billType = invoiceForm && invoiceForm.querySelector('input[name="type"]')
    ? invoiceForm.querySelector('input[name="type"]').value
    : 'sale';
  const draftKey = `race_draft_${billType}_${firmId}`;

  const draftRecoveryBanner = document.getElementById('draftRecoveryBanner');
  const draftDetailsText = document.getElementById('draftDetailsText');
  const btnRestoreDraft = document.getElementById('btnRestoreDraft');
  const btnDiscardDraft = document.getElementById('btnDiscardDraft');
  const draftSaveIndicator = document.getElementById('draftSaveIndicator');
  const draftSaveTime = document.getElementById('draftSaveTime');

  let autoSaveTimeout = null;

  function getDraftData() {
    if (!invoiceForm || isEditMode) return null;

    const partyNameInput = document.getElementById('partyNameInput');
    const partyPhoneInput = document.getElementById('partyPhoneInput');
    const partyGstinInput = document.getElementById('partyGstinInput');
    const partyAddressInput = document.getElementById('partyAddressInput');
    const partyStateInput = document.getElementById('partyStateInput');
    const partyStateCodeInput = document.getElementById('partyStateCodeInput');
    const invoiceDateInput = invoiceForm.querySelector('input[name="invoice_date"]');
    const dueDateInput = invoiceForm.querySelector('input[name="due_date"]');
    const notesInput = document.getElementById('notes');
    const termsInput = document.getElementById('terms');
    const selectedMode = invoiceForm.querySelector('input[name="payment_mode"]:checked');

    const itemRows = itemsTableBody ? itemsTableBody.querySelectorAll('.invoice-item-row') : [];
    const items = [];

    itemRows.forEach(r => {
      const name = r.querySelector('.row-item-name')?.value || '';
      const id = r.querySelector('.row-item-id')?.value || '';
      const hsn = r.querySelector('.row-hsn')?.value || '';
      const qty = r.querySelector('.row-qty')?.value || '1';
      const unit = r.querySelector('.row-unit')?.value || 'PCS';
      const rate = r.querySelector('.row-rate')?.value || '';
      const disc = r.querySelector('.row-discount-pct')?.value || '0';
      const tax = r.querySelector('.row-tax-rate')?.value || '18';

      if (name.trim().length > 0 || (rate && parseFloat(rate) > 0)) {
        items.push({
          item_id: id,
          item_name: name,
          hsn_code: hsn,
          quantity: qty,
          unit: unit,
          rate: rate,
          discount_percent: disc,
          tax_rate: tax
        });
      }
    });

    const partyName = partyNameInput ? partyNameInput.value.trim() : '';
    const hasData = partyName.length > 0 || items.length > 0 || (notesInput && notesInput.value.trim().length > 0);

    if (!hasData) return null;

    return {
      party_id: partySelect ? partySelect.value : '',
      party_search_text: partySearchInput ? partySearchInput.value : '',
      party_name: partyName,
      party_phone: partyPhoneInput ? partyPhoneInput.value : '',
      party_gstin: partyGstinInput ? partyGstinInput.value : '',
      party_address: partyAddressInput ? partyAddressInput.value : '',
      party_state: partyStateInput ? partyStateInput.value : '',
      party_state_code: partyStateCodeInput ? partyStateCodeInput.value : '',
      invoice_date: invoiceDateInput ? invoiceDateInput.value : '',
      due_date: dueDateInput ? dueDateInput.value : '',
      is_gst_bill: isGstToggle ? isGstToggle.checked : true,
      is_interstate: isInterstateToggle ? isInterstateToggle.checked : false,
      payment_mode: selectedMode ? selectedMode.value : 'cash',
      discount_type: discountTypeSelect ? discountTypeSelect.value : 'percentage',
      discount_value: discountValueInput ? discountValueInput.value : '0',
      paid_amount: paidAmountInput ? paidAmountInput.value : '0',
      notes: notesInput ? notesInput.value : '',
      terms: termsInput ? termsInput.value : '',
      items: items,
      timestamp: new Date().toISOString(),
      timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }

  function saveDraft() {
    if (isEditMode) return;
    try {
      const data = getDraftData();
      if (data) {
        localStorage.setItem(draftKey, JSON.stringify(data));
        if (draftSaveIndicator && draftSaveTime) {
          draftSaveTime.textContent = `Draft saved ${data.timeFormatted}`;
          draftSaveIndicator.classList.remove('d-none');
        }
      } else {
        localStorage.removeItem(draftKey);
        if (draftSaveIndicator) draftSaveIndicator.classList.add('d-none');
      }
    } catch (e) {
      console.warn('Draft auto-save error:', e);
    }
  }

  function triggerDebouncedAutoSave() {
    if (isEditMode) return;
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(saveDraft, 1200);
  }

  function clearDraft() {
    try {
      localStorage.removeItem(draftKey);
      if (draftRecoveryBanner) draftRecoveryBanner.classList.add('d-none');
      if (draftSaveIndicator) draftSaveIndicator.classList.add('d-none');
    } catch (e) {}
  }

  function restoreDraftData(draft) {
    if (!draft) return;

    if (draft.party_name) {
      const nameInput = document.getElementById('partyNameInput');
      const phoneInput = document.getElementById('partyPhoneInput');
      const gstinInput = document.getElementById('partyGstinInput');
      const addressInput = document.getElementById('partyAddressInput');
      const stateInput = document.getElementById('partyStateInput');
      const stateCodeInput = document.getElementById('partyStateCodeInput');

      if (nameInput) nameInput.value = draft.party_name;
      if (phoneInput) phoneInput.value = draft.party_phone || '';
      if (gstinInput) gstinInput.value = draft.party_gstin || '';
      if (addressInput) addressInput.value = draft.party_address || '';
      if (stateInput) stateInput.value = draft.party_state || '';
      if (stateCodeInput) stateCodeInput.value = draft.party_state_code || '';

      if (partySelect && draft.party_id) partySelect.value = draft.party_id;
      if (partySearchInput) partySearchInput.value = draft.party_search_text || draft.party_name;
      if (btnClearPartySearch) btnClearPartySearch.style.display = draft.party_name ? 'block' : 'none';
    }

    if (isGstToggle && draft.is_gst_bill !== undefined) {
      isGstToggle.checked = draft.is_gst_bill;
      isGstToggle.dispatchEvent(new Event('change'));
    }

    if (isInterstateToggle && draft.is_interstate !== undefined) {
      isInterstateToggle.checked = draft.is_interstate;
    }

    if (draft.payment_mode) {
      const modeRadio = invoiceForm.querySelector(`input[name="payment_mode"][value="${draft.payment_mode}"]`);
      if (modeRadio) modeRadio.checked = true;
    }

    if (draft.discount_type && discountTypeSelect) discountTypeSelect.value = draft.discount_type;
    if (draft.discount_value && discountValueInput) discountValueInput.value = draft.discount_value;
    if (draft.paid_amount && paidAmountInput) paidAmountInput.value = draft.paid_amount;
    if (draft.notes) {
      const notesEl = document.getElementById('notes');
      if (notesEl) notesEl.value = draft.notes;
    }
    if (draft.terms) {
      const termsEl = document.getElementById('terms');
      if (termsEl) termsEl.value = draft.terms;
    }

    // Populate Items
    if (draft.items && draft.items.length > 0 && itemsTableBody) {
      itemsTableBody.innerHTML = '';
      draft.items.forEach(item => {
        addNewRow(item);
      });
    }

    updateAllCalculations();
    if (draftRecoveryBanner) draftRecoveryBanner.classList.add('d-none');
    if (draftSaveIndicator && draftSaveTime) {
      draftSaveTime.textContent = `Draft restored (${draft.timeFormatted || 'Saved'})`;
      draftSaveIndicator.classList.remove('d-none');
    }
  }

  function checkForSavedDraft() {
    if (isEditMode) return;
    try {
      const rawDraft = localStorage.getItem(draftKey);
      if (!rawDraft) return;

      const draft = JSON.parse(rawDraft);
      if (!draft || (!draft.party_name && (!draft.items || draft.items.length === 0))) {
        return;
      }

      if (draftRecoveryBanner && draftDetailsText) {
        const itemCount = draft.items ? draft.items.length : 0;
        const partyInfo = draft.party_name ? ` for "${draft.party_name}"` : '';
        draftDetailsText.textContent = `Saved on ${draft.timeFormatted || 'previous session'} with ${itemCount} item(s)${partyInfo}.`;
        draftRecoveryBanner.classList.remove('d-none');
      }

      if (btnRestoreDraft) {
        btnRestoreDraft.onclick = () => {
          restoreDraftData(draft);
        };
      }

      if (btnDiscardDraft) {
        btnDiscardDraft.onclick = () => {
          clearDraft();
        };
      }
    } catch (e) {
      console.warn('Failed to check draft recovery:', e);
    }
  }

  // Listen to form input changes for auto-save
  if (invoiceForm && !isEditMode) {
    invoiceForm.addEventListener('input', triggerDebouncedAutoSave);
    invoiceForm.addEventListener('change', triggerDebouncedAutoSave);
  }

  // Initialize existing rows, preloaded invoice items, or add one empty row
  if (itemsTableBody) {
    const preloadedEl = document.getElementById('preloadedInvoiceItems');
    let preloadedItems = [];
    if (preloadedEl && preloadedEl.dataset.items) {
      try {
        preloadedItems = JSON.parse(preloadedEl.dataset.items);
      } catch (err) {
        console.warn('Failed to parse preloaded items:', err);
      }
    }

    if (preloadedItems && preloadedItems.length > 0) {
      preloadedItems.forEach(item => {
        addNewRow(item);
      });
      updateAllCalculations();
    } else {
      const existingRows = itemsTableBody.querySelectorAll('.invoice-item-row');
      if (existingRows.length === 0) {
        addNewRow();
      } else {
        existingRows.forEach(r => bindRowEvents(r));
        updateAllCalculations();
      }
    }
  }

  // Toast Notification Helper
  function showToastNotification(message, type = 'success') {
    let toastContainer = document.getElementById('appToastContainer');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'appToastContainer';
      toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
      toastContainer.style.zIndex = '9999';
      document.body.appendChild(toastContainer);
    }

    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : 'danger'} border-0 shadow-lg`;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    toastEl.innerHTML = `
      <div class="d-flex">
        <div class="toast-body fw-medium">
          ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    `;

    toastContainer.appendChild(toastEl);
    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
  }

  // 1. Quick Party Modal Handlers
  const quickPartyForm = document.getElementById('quickPartyForm');
  const quickPartyAlert = document.getElementById('quickPartyAlert');
  const quickPartySpinner = document.getElementById('quickPartySpinner');
  const btnSubmitQuickParty = document.getElementById('btnSubmitQuickParty');
  const quickPartyState = document.getElementById('quickPartyState');
  const quickPartyStateCode = document.getElementById('quickPartyStateCode');

  if (quickPartyState && quickPartyStateCode) {
    quickPartyState.addEventListener('change', () => {
      const opt = quickPartyState.options[quickPartyState.selectedIndex];
      quickPartyStateCode.value = opt ? (opt.dataset.code || '') : '';
    });
  }

  if (quickPartyForm) {
    quickPartyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (quickPartyAlert) quickPartyAlert.classList.add('d-none');
      if (quickPartySpinner) quickPartySpinner.classList.remove('d-none');
      if (btnSubmitQuickParty) btnSubmitQuickParty.disabled = true;

      const formData = new FormData(quickPartyForm);
      const data = Object.fromEntries(formData.entries());

      try {
        const response = await fetch('/parties/quick-create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success && result.party) {
          const p = result.party;
          const newPartyObj = {
            id: p.id,
            name: p.name,
            phone: p.phone || '',
            gstin: p.gstin || '',
            address: p.billing_address || '',
            state: p.state || '',
            stateCode: p.state_code || ''
          };
          partiesList.push(newPartyObj);

          if (partySelect) {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.dataset.name = p.name;
            opt.dataset.phone = p.phone || '';
            opt.dataset.gstin = p.gstin || '';
            opt.dataset.address = p.billing_address || '';
            opt.dataset.state = p.state || '';
            opt.dataset.stateCode = p.state_code || '';
            opt.textContent = `${p.name} ${p.phone ? '(' + p.phone + ')' : ''}`;
            partySelect.appendChild(opt);
          }

          // Select the new party directly into the invoice form
          selectParty(newPartyObj);

          // Close modal and reset form
          const modalEl = document.getElementById('modalQuickAddParty');
          if (modalEl) {
            const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modalInstance.hide();
          }
          quickPartyForm.reset();

          showToastNotification(`✓ Party "${p.name}" created and selected!`, 'success');
        } else {
          if (quickPartyAlert) {
            quickPartyAlert.textContent = result.error || 'Failed to create party.';
            quickPartyAlert.classList.remove('d-none');
          }
        }
      } catch (err) {
        console.error('Error creating party:', err);
        if (quickPartyAlert) {
          quickPartyAlert.textContent = 'Server communication error: ' + err.message;
          quickPartyAlert.classList.remove('d-none');
        }
      } finally {
        if (quickPartySpinner) quickPartySpinner.classList.add('d-none');
        if (btnSubmitQuickParty) btnSubmitQuickParty.disabled = false;
      }
    });
  }

  // 2. Quick Item Modal Handlers
  const quickItemForm = document.getElementById('quickItemForm');
  const quickItemAlert = document.getElementById('quickItemAlert');
  const quickItemSpinner = document.getElementById('quickItemSpinner');
  const btnSubmitQuickItem = document.getElementById('btnSubmitQuickItem');

  if (quickItemForm) {
    quickItemForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (quickItemAlert) quickItemAlert.classList.add('d-none');
      if (quickItemSpinner) quickItemSpinner.classList.remove('d-none');
      if (btnSubmitQuickItem) btnSubmitQuickItem.disabled = true;

      const formData = new FormData(quickItemForm);
      const data = Object.fromEntries(formData.entries());

      try {
        const response = await fetch('/items/quick-create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success && result.item) {
          const item = result.item;
          
          // Add to itemsDataList
          const itemsDataList = document.getElementById('itemsDataList');
          if (itemsDataList) {
            const opt = document.createElement('option');
            opt.value = item.name;
            opt.dataset.id = item.id;
            opt.dataset.hsn = item.hsn_code || '';
            opt.dataset.unit = item.unit || 'PCS';
            opt.dataset.price = item.sale_price || 0;
            opt.dataset.tax = item.tax_rate || 0;
            opt.textContent = `${item.name} (Stock: ${item.current_stock || 0} ${item.unit || 'PCS'} | ₹${item.sale_price || 0})`;
            itemsDataList.appendChild(opt);
          }

          // Look for empty row or add a new row
          const rows = itemsTableBody ? itemsTableBody.querySelectorAll('.invoice-item-row') : [];
          let targetRow = null;
          for (let i = 0; i < rows.length; i++) {
            const nameInput = rows[i].querySelector('.row-item-name');
            if (nameInput && (!nameInput.value || !nameInput.value.trim())) {
              targetRow = rows[i];
              break;
            }
          }

          if (targetRow) {
            targetRow.querySelector('.row-item-id').value = item.id;
            targetRow.querySelector('.row-item-name').value = item.name;
            targetRow.querySelector('.row-hsn').value = item.hsn_code || '';
            targetRow.querySelector('.row-unit').value = item.unit || 'PCS';
            targetRow.querySelector('.row-rate').value = item.sale_price || item.purchase_price || 0;
            if (targetRow.querySelector('.row-tax-rate')) {
              targetRow.querySelector('.row-tax-rate').value = item.tax_rate || 0;
            }
            updateRowCalculation(targetRow);
            updateAllCalculations();
          } else {
            addNewRow({
              id: item.id,
              name: item.name,
              hsn_code: item.hsn_code || '',
              unit: item.unit || 'PCS',
              rate: item.sale_price || item.purchase_price || 0,
              tax_rate: item.tax_rate || 0,
              quantity: 1
            });
          }

          // Close modal and reset form
          const modalEl = document.getElementById('modalQuickAddItem');
          if (modalEl) {
            const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modalInstance.hide();
          }
          quickItemForm.reset();

          showToastNotification(`✓ Item "${item.name}" created and added to record!`, 'success');
        } else {
          if (quickItemAlert) {
            quickItemAlert.textContent = result.error || 'Failed to create item.';
            quickItemAlert.classList.remove('d-none');
          }
        }
      } catch (err) {
        console.error('Error creating item:', err);
        if (quickItemAlert) {
          quickItemAlert.textContent = 'Server communication error: ' + err.message;
          quickItemAlert.classList.remove('d-none');
        }
      } finally {
        if (quickItemSpinner) quickItemSpinner.classList.add('d-none');
        if (btnSubmitQuickItem) btnSubmitQuickItem.disabled = false;
      }
    });
  }

  // Check for unsaved draft recovery on initial page load
  checkForSavedDraft();
});
