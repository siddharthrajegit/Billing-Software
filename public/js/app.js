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
});
