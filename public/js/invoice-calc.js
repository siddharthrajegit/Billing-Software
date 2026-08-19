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

  function selectParty(p) {
    const nameInput = document.getElementById('partyNameInput');
    const phoneInput = document.getElementById('partyPhoneInput');
    const gstinInput = document.getElementById('partyGstinInput');
    const addressInput = document.getElementById('partyAddressInput');
    const stateInput = document.getElementById('partyStateInput');
    const stateCodeInput = document.getElementById('partyStateCodeInput');

    if (nameInput) nameInput.value = p.name;
    if (phoneInput) phoneInput.value = p.phone;
    if (gstinInput) gstinInput.value = p.gstin;
    if (addressInput) addressInput.value = p.address;
    if (stateInput) stateInput.value = p.state;
    if (stateCodeInput) stateCodeInput.value = p.stateCode;

    if (partySelect) partySelect.value = p.id;
    if (partySearchInput) {
      partySearchInput.value = p.name + (p.phone ? ` (${p.phone})` : '');
    }

    if (btnClearPartySearch) btnClearPartySearch.style.display = 'block';
    if (partySearchResults) partySearchResults.classList.add('d-none');

    // Auto check Interstate if state codes differ
    if (isInterstateToggle && firmStateCode && p.stateCode) {
      isInterstateToggle.checked = (firmStateCode !== p.stateCode);
    }

    updateAllCalculations();
  }

  function renderPartyResults(matches) {
    if (!partySearchResults) return;
    partySearchResults.innerHTML = '';

    if (matches.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'list-group-item text-muted small p-2 text-center';
      emptyDiv.textContent = 'No matching parties found. You can enter details manually.';
      partySearchResults.appendChild(emptyDiv);
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

      const nameInput = document.getElementById('partyNameInput');
      const phoneInput = document.getElementById('partyPhoneInput');
      const gstinInput = document.getElementById('partyGstinInput');
      const addressInput = document.getElementById('partyAddressInput');
      const stateInput = document.getElementById('partyStateInput');
      const stateCodeInput = document.getElementById('partyStateCodeInput');

      if (nameInput) nameInput.value = '';
      if (phoneInput) phoneInput.value = '';
      if (gstinInput) gstinInput.value = '';
      if (addressInput) addressInput.value = '';
      if (stateInput) stateInput.value = '';
      if (stateCodeInput) stateCodeInput.value = '';
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

    tr.innerHTML = `
      <td class="text-center row-num text-muted small">${rowCount + 1}</td>
      <td style="min-width: 200px;">
        <input type="hidden" name="item_id" class="row-item-id" value="${itemData.id || ''}">
        <input type="text" name="item_name" class="form-control form-control-sm row-item-name" placeholder="Item name / Description" value="${itemData.name || ''}" list="itemsDataList" required>
      </td>
      <td style="width: 100px;">
        <input type="text" name="hsn_code" class="form-control form-control-sm row-hsn" placeholder="HSN/SAC" value="${itemData.hsn_code || ''}">
      </td>
      <td style="width: 80px;">
        <input type="number" name="quantity" class="form-control form-control-sm row-qty text-end" min="0.01" step="any" value="${itemData.quantity || '1'}" required>
      </td>
      <td style="width: 90px;">
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
      <td style="width: 110px;">
        <input type="number" name="rate" class="form-control form-control-sm row-rate text-end" min="0" step="any" placeholder="0.00" value="${itemData.rate || itemData.sale_price || ''}" required>
      </td>
      <td style="width: 80px;" class="discount-col ${!enableDiscount ? 'd-none' : ''}">
        <input type="number" name="item_discount_percent" class="form-control form-control-sm row-discount-pct text-end" min="0" max="100" step="any" placeholder="0%" value="${itemData.discount_percent || '0'}">
        <input type="hidden" name="item_discount_amount" class="row-discount-amt" value="0">
      </td>
      <td style="width: 110px;" class="gst-col ${!showRowTaxRate ? 'd-none' : ''}">
        <select name="item_tax_rate" class="form-select form-select-sm row-tax-rate">
          <option value="0" ${parseFloat(itemData.tax_rate) === 0 ? 'selected' : ''}>0%</option>
          <option value="5" ${parseFloat(itemData.tax_rate) === 5 ? 'selected' : ''}>5%</option>
          <option value="12" ${parseFloat(itemData.tax_rate) === 12 ? 'selected' : ''}>12%</option>
          <option value="18" ${parseFloat(itemData.tax_rate) === 18 || !itemData.tax_rate ? 'selected' : ''}>18%</option>
          <option value="28" ${parseFloat(itemData.tax_rate) === 28 ? 'selected' : ''}>28%</option>
        </select>
        <input type="hidden" name="item_taxable" class="row-taxable" value="0">
        <input type="hidden" name="item_cgst_rate" class="row-cgst-rate" value="0">
        <input type="hidden" name="item_cgst_amount" class="row-cgst-amt" value="0">
        <input type="hidden" name="item_sgst_rate" class="row-sgst-rate" value="0">
        <input type="hidden" name="item_sgst_amount" class="row-sgst-amt" value="0">
        <input type="hidden" name="item_igst_rate" class="row-igst-rate" value="0">
        <input type="hidden" name="item_igst_amount" class="row-igst-amt" value="0">
      </td>
      <td style="width: 120px;" class="text-end fw-bold">
        <span class="row-total-display">0.00</span>
        <input type="hidden" name="item_total" class="row-total" value="0">
      </td>
      <td class="text-center" style="width: 40px;">
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

  // Form submission safety hook
  if (invoiceForm) {
    invoiceForm.addEventListener('submit', (e) => {
      updateAllCalculations();

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
    });
  }

  // Initialize existing rows or add one empty row
  if (itemsTableBody) {
    const existingRows = itemsTableBody.querySelectorAll('.invoice-item-row');
    if (existingRows.length === 0) {
      addNewRow();
    } else {
      existingRows.forEach(r => bindRowEvents(r));
      updateAllCalculations();
    }
  }
});
