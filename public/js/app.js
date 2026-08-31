/**
 * Main Client Application Scripts
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Instant Table Quick Search Filter
  const tableSearchInputs = document.querySelectorAll('[data-table-search]');
  tableSearchInputs.forEach(input => {
    const targetTableId = input.dataset.tableSearch;
    const table = document.getElementById(targetTableId);
    if (!table) return;

    input.addEventListener('input', () => {
      const query = input.value.toLowerCase().trim();
      const rows = table.querySelectorAll('tbody tr');

      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(query)) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    });
  });

  // 2. Generic Delete Confirmations
  const deleteForms = document.querySelectorAll('.form-delete-confirm');
  deleteForms.forEach(form => {
    form.addEventListener('submit', (e) => {
      const message = form.dataset.confirmMessage || 'Are you sure you want to delete this record? This action cannot be undone.';
      if (!confirm(message)) {
        e.preventDefault();
      }
    });
  });

  // 3. Print helper
  const printButtons = document.querySelectorAll('.btn-trigger-print');
  printButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      window.print();
    });
  });

  // 4. Mobile Sidebar Toggle & Backdrop
  const sidebarToggleBtns = document.querySelectorAll('.btn-sidebar-toggle');
  const appSidebar = document.getElementById('appSidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');

  function openSidebar() {
    if (appSidebar) appSidebar.classList.add('sidebar-open');
    if (sidebarBackdrop) sidebarBackdrop.classList.add('show');
  }

  function closeSidebar() {
    if (appSidebar) appSidebar.classList.remove('sidebar-open');
    if (sidebarBackdrop) sidebarBackdrop.classList.remove('show');
  }

  sidebarToggleBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (appSidebar && appSidebar.classList.contains('sidebar-open')) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });
  });

  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', closeSidebar);
  }

  // 5. Interactive Settings & Form Radio Cards
  const radioCards = document.querySelectorAll('.setting-radio-card');
  radioCards.forEach(card => {
    const radio = card.querySelector('input[type="radio"]');
    if (!radio) return;

    // Click anywhere on card to select
    card.addEventListener('click', (e) => {
      if (e.target !== radio && e.target.tagName !== 'LABEL') {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    radio.addEventListener('change', () => {
      const groupName = radio.name;
      if (!groupName) return;

      const allInGroup = document.querySelectorAll(`input[type="radio"][name="${groupName}"]`);
      allInGroup.forEach(r => {
        const parentCard = r.closest('.setting-radio-card');
        if (parentCard) {
          if (r.checked) {
            parentCard.classList.add('active');
          } else {
            parentCard.classList.remove('active');
          }
        }
      });
    });
  });

  // 6. Interactive Settings Toggle Box (Click anywhere on the box to toggle checked/unchecked)
  const toggleBoxes = document.querySelectorAll('.setting-toggle-box');
  toggleBoxes.forEach(box => {
    const checkbox = box.querySelector('input[type="checkbox"]');
    if (!checkbox) return;

    box.addEventListener('click', (e) => {
      // If click was directly on the checkbox/label, let browser handle the flip
      if (e.target !== checkbox && e.target.tagName !== 'LABEL') {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        box.classList.add('active');
      } else {
        box.classList.remove('active');
      }
    });
  });
});
