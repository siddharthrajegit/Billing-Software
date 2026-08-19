/**
 * Invoice Dynamic Calculation & Real-Time GST Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  const itemsTableBody = document.getElementById('invoiceItemsBody');
  const btnAddItem = document.getElementById('btnAddItem');
  const isGstToggle = document.getElementById('isGstToggle');
  const isInterstateToggle = document.getElementById('isInterstateToggle');
  const partySelect = document.getElementById('partySelect');

  // Firm State Code (attached via data attribute on form)
  const invoiceForm = document.getElementById('invoiceForm');
  const firmStateCode = invoiceForm ? invoiceForm.dataset.firmStateCode || '' : '';

  // Summary Inputs
  const subtotalInput = document.getElementById('subtotalInput');
  const discountTypeSelect = document.getElementById('discountTypeSelect');
  const discountValueInput = document.getElementById('discountValueInput');
  const discountAmountInput = document.getElementById('discountAmountInput');
  const taxableAmountInput = document.getElementById('taxableAmountInput');
  const cgstAmountInput = document.getElementById('cgstAmountInput');
  const sgstAmountInput = document.getElementById('sgstAmountInput');
  const igstAmountInput = document.getElementById('igstAmountInput');
  const taxAmountInput = document.getElementById('taxAmountInput');
  const roundOffInput = document.getElementById('roundOffInput');
  const grandTotalInput = document.getElementById('grandTotalInput');
  const paidAmountInput = document.getElementById('paidAmountInput');
  const balanceDueInput = document.getElementById('balanceDueInput');

  // Party Selection Auto-fill
  if (partySelect) {
    partySelect.addEventListener('change', (e) => {
      const selectedOption = partySelect.options[partySelect.selectedIndex];
      if (!selectedOption || !selectedOption.value) return;

      const name = selectedOption.dataset.name || '';
      const phone = selectedOption.dataset.phone || '';
      const gstin = selectedOption.dataset.gstin || '';
      const address = selectedOption.dataset.address || '';
      const state = selectedOption.dataset.state || '';
      const stateCode = selectedOption.dataset.stateCode || '';

      const nameInput = document.getElementById('partyNameInput');
      const phoneInput = document.getElementById('partyPhoneInput');
      const gstinInput = document.getElementById('partyGstinInput');
      const addressInput = document.getElementById('partyAddressInput');
      const stateInput = document.getElementById('partyStateInput');
      const stateCodeInput = document.getElementById('partyStateCodeInput');

      if (nameInput) nameInput.value = name;
      if (phoneInput) phoneInput.value = phone;
      if (gstinInput) gstinInput.value = gstin;
      if (addressInput) addressInput.value = address;
      if (stateInput) stateInput.value = state;
      if (stateCodeInput) stateCodeInput.value = stateCode;

      // Auto check Interstate if state codes differ and both are present
      if (isInterstateToggle && firmStateCode && stateCode) {
        isInterstateToggle.checked = (firmStateCode !== stateCode);
      }

      updateAllCalculations();
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
    const isInterstate = isInterstateToggle ? isInterstateToggle.checked : false;

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
      <td style="width: 80px;">
        <input type="number" name="item_discount_percent" class="form-control form-control-sm row-discount-pct text-end" min="0" max="100" step="any" placeholder="0%" value="${itemData.discount_percent || '0'}">
        <input type="hidden" name="item_discount_amount" class="row-discount-amt" value="0">
      </td>
      <td style="width: 110px;" class="gst-col ${!isGst ? 'd-none' : ''}">
        <select name="item_tax_rate" class="form-select form-select-sm row-tax-rate">
          <option value="0" ${parseFloat(itemData.tax_rate) === 0 ? 'selected' : ''}>0%</option>
          <option value="5" ${parseFloat(itemData.tax_rate) === 5 ? 'selected' : ''}>5%</option>
          <option value="12" ${parseFloat(itemData.tax_rate) === 12 ? 'selected' : ''}>12%</option>
          <option value="18" ${parseFloat(itemData.tax_rate) === 18 ? 'selected' : ''}>18%</option>
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
        const val = itemNameInput.value.trim().toLowerCase();
        const option = document.querySelector(`#itemsDataList option[value="${itemNameInput.value}"]`);
        if (option) {
          row.querySelector('.row-item-id').value = option.dataset.id || '';
          row.querySelector('.row-hsn').value = option.dataset.hsn || '';
          row.querySelector('.row-unit').value = option.dataset.unit || 'PCS';
          row.querySelector('.row-rate').value = option.dataset.price || '0';
          row.querySelector('.row-tax-rate').value = option.dataset.tax || '0';
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
    const discPct = parseFloat(row.querySelector('.row-discount-pct').value) || 0;
    const taxRate = parseFloat(row.querySelector('.row-tax-rate').value) || 0;

    const isGst = isGstToggle ? isGstToggle.checked : true;
    const isInterstate = isInterstateToggle ? isInterstateToggle.checked : false;

    // 1. Gross = qty * rate
    const gross = qty * rate;

    // 2. Discount amount
    const discAmt = gross * (discPct / 100);
    const taxable = Math.max(0, gross - discAmt);

    // 3. Tax calculation
    let cgstRate = 0, cgstAmt = 0;
    let sgstRate = 0, sgstAmt = 0;
    let igstRate = 0, igstAmt = 0;
    let totalTax = 0;

    if (isGst && taxRate > 0) {
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
    let totalGrossRows = 0;

    rows.forEach(r => {
      const calc = updateRowCalculation(r);
      totalGrossRows += calc.gross;
      totalTaxable += calc.taxable;
      totalCgst += calc.cgstAmt;
      totalSgst += calc.sgstAmt;
      totalIgst += calc.igstAmt;
      totalTax += calc.totalTax;
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

      gstCols.forEach(col => {
        if (isGst) {
          col.classList.remove('d-none');
        } else {
          col.classList.add('d-none');
        }
      });

      if (gstSummarySection) {
        if (isGst) gstSummarySection.classList.remove('d-none');
        else gstSummarySection.classList.add('d-none');
      }

      if (gstBadge) {
        gstBadge.textContent = isGst ? 'GST Tax Invoice' : 'Non-GST / Bill of Supply';
        gstBadge.className = isGst ? 'badge bg-primary' : 'badge bg-secondary';
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

  // Overall Discount and Payment Input listeners
  if (discountTypeSelect) discountTypeSelect.addEventListener('change', updateAllCalculations);
  if (discountValueInput) discountValueInput.addEventListener('input', updateAllCalculations);
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
