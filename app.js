/**
 * EduAttend - Application Core Logic & Routing
 */

document.addEventListener('DOMContentLoaded', () => {
  // Navigation & Router Elements
  const navLinks = document.querySelectorAll('.nav-link[data-page]');
  const pageViews = document.querySelectorAll('.page-view');
  const mainAppShell = document.getElementById('main-app-shell');
  const authView = document.getElementById('auth-view');
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const appSidebar = document.querySelector('.app-sidebar');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');

  // Roll call local state for Mark Attendance view
  let currentRollStudents = [];
  let currentSelectedClass = 'CS101';

  // Pagination state for Student Management
  let currentStudentPage = 1;
  const STUDENT_PAGE_SIZE = 8;

  // Helper for HTML escaping
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Helper for resilient avatar rendering
  function getAvatarHtml(avatarUrl, initials, name) {
    const safeInitials = escapeHtml(initials || 'ST');
    const safeName = escapeHtml(name || 'Student');
    if (avatarUrl) {
      return `
        <img src="${escapeHtml(avatarUrl)}" class="student-avatar" alt="${safeName}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"/>
        <div class="student-avatar avatar-fallback" style="display:none;">${safeInitials}</div>
      `;
    }
    return `<div class="student-avatar">${safeInitials}</div>`;
  }

  // --- Router ---
  function navigateTo(pageId, queryParams = {}) {
    if (pageId === 'auth') {
      mainAppShell.style.display = 'none';
      authView.style.display = 'flex';
      window.location.hash = 'auth';
      return;
    }

    // Check if user is logged in
    const user = window.appState.getUser();
    if (!user || !user.isLoggedIn) {
      mainAppShell.style.display = 'none';
      authView.style.display = 'flex';
      window.location.hash = 'auth';
      return;
    }

    mainAppShell.style.display = 'flex';
    authView.style.display = 'none';

    // Highlight active nav
    navLinks.forEach(link => {
      if (link.dataset.page === pageId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Show active page view
    pageViews.forEach(view => {
      if (view.id === `page-${pageId}`) {
        view.classList.add('active');
      } else {
        view.classList.remove('active');
      }
    });

    // Close mobile sidebar if open
    if (appSidebar) {
      appSidebar.classList.remove('open');
    }
    if (sidebarBackdrop) {
      sidebarBackdrop.classList.remove('active');
    }

    window.location.hash = pageId;

    // View-specific initialization
    switch (pageId) {
      case 'dashboard':
        renderDashboard();
        break;
      case 'attendance':
        if (queryParams.classId) {
          currentSelectedClass = queryParams.classId;
        }
        initAttendanceView();
        break;
      case 'students':
        renderStudentsTable();
        break;
      case 'reports':
        renderReportsView();
        break;
      case 'schedule':
        renderScheduleView();
        break;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Handle hash change
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    navigateTo(hash);
  });

  // Nav click handlers
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      navigateTo(page);
    });
  });

  // Mobile menu toggle
  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
      appSidebar.classList.toggle('open');
      if (sidebarBackdrop) {
        sidebarBackdrop.classList.toggle('active');
      }
    });
  }

  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', () => {
      appSidebar.classList.remove('open');
      sidebarBackdrop.classList.remove('active');
    });
  }

  // Close modals on backdrop click
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.classList.remove('active');
      }
    });
  });

  // --- Toast Notifications ---
  window.showToast = function(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'info';
    if (type === 'success') icon = 'check_circle';
    if (type === 'error') icon = 'warning';

    toast.innerHTML = `
      <span class="material-symbols-outlined">${icon}</span>
      <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  };

  // --- Dynamic Current Date ---
  function updateDisplayDates() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = new Date().toLocaleDateString('en-US', options);
    
    document.querySelectorAll('.js-current-date').forEach(el => {
      el.textContent = dateStr;
    });

    const shortOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    const shortDateStr = new Date().toLocaleDateString('en-US', shortOptions);
    document.querySelectorAll('.js-short-date').forEach(el => {
      el.textContent = shortDateStr;
    });
  }
  updateDisplayDates();

  // =========================================================================
  // 1. DASHBOARD VIEW
  // =========================================================================
  function renderDashboard() {
    const stats = window.appState.getOverallStats();
    
    // Update KPI Card Numbers
    const totalEl = document.getElementById('dash-total-enrolled');
    const presentEl = document.getElementById('dash-present-today');
    const absentEl = document.getElementById('dash-absent-today');
    const avgEl = document.getElementById('dash-avg-attendance');

    if (totalEl) totalEl.textContent = stats.totalEnrolled.toLocaleString();
    if (presentEl) presentEl.textContent = stats.presentToday.toLocaleString();
    if (absentEl) absentEl.textContent = stats.absentToday.toLocaleString();
    if (avgEl) avgEl.textContent = stats.ytdAverage;

    // Render Alerts Feed
    renderDashboardAlerts();
  }

  function renderDashboardAlerts() {
    const container = document.getElementById('dashboard-alerts-feed');
    if (!container) return;

    const alerts = window.appState.getAlerts();
    container.innerHTML = '';

    if (alerts.length === 0) {
      container.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--color-on-surface-variant);">
          <span class="material-symbols-outlined" style="font-size: 36px; color: var(--color-secondary);">check_circle</span>
          <p style="margin-top: 8px; font-weight: 500;">No pending alerts. All clear!</p>
        </div>
      `;
      return;
    }

    alerts.forEach(alert => {
      const item = document.createElement('div');
      item.className = `alert-item ${alert.type === 'high' ? 'priority-high' : alert.type === 'medium' ? 'priority-medium' : ''}`;
      
      let iconColorClass = 'alert-icon-blue';
      let iconName = 'notifications';
      if (alert.type === 'high') {
        iconColorClass = 'alert-icon-coral';
        iconName = 'warning';
      } else if (alert.type === 'medium') {
        iconColorClass = 'alert-icon-amber';
        iconName = 'info';
      } else {
        iconColorClass = 'alert-icon-blue';
        iconName = 'check_circle';
      }

      item.innerHTML = `
        <div class="alert-icon-box ${iconColorClass}">
          <span class="material-symbols-outlined">${iconName}</span>
        </div>
        <div class="alert-content">
          <div class="alert-header">
            <h4 class="alert-heading">${escapeHtml(alert.title)}</h4>
            <span class="alert-time">${escapeHtml(alert.time)}</span>
          </div>
          <p class="alert-desc">${escapeHtml(alert.description)}</p>
          <button class="alert-action-btn" data-alert-id="${alert.id}">
            ${escapeHtml(alert.actionText)} <span class="material-symbols-outlined" style="font-size: 14px;">arrow_forward</span>
          </button>
        </div>
      `;

      const actionBtn = item.querySelector('.alert-action-btn');
      actionBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleAlertAction(alert);
      });

      container.appendChild(item);
    });
  }

  function handleAlertAction(alert) {
    if (alert.studentId) {
      const student = window.appState.getStudentById(alert.studentId);
      if (student) {
        openStudentProfileModal(student);
        return;
      }
    }
    if (alert.classId) {
      navigateTo('attendance', { classId: alert.classId });
      return;
    }
    window.showToast(`Action: ${alert.actionText}`, 'info');
  }

  // Dashboard quick actions
  const takeAttendanceBtn = document.getElementById('dash-take-attendance-btn');
  if (takeAttendanceBtn) {
    takeAttendanceBtn.addEventListener('click', () => {
      navigateTo('attendance');
    });
  }

  // Dashboard interactive bar chart columns
  document.querySelectorAll('.bar-group[data-class]').forEach(bar => {
    bar.addEventListener('click', () => {
      const classId = bar.dataset.class;
      navigateTo('attendance', { classId });
    });
  });

  // =========================================================================
  // 2. MARK ATTENDANCE VIEW
  // =========================================================================
  function initAttendanceView() {
    const classSelect = document.getElementById('attendance-class-select');
    if (classSelect) {
      classSelect.value = currentSelectedClass;
      classSelect.onchange = (e) => {
        currentSelectedClass = e.target.value;
        loadClassStudentsForAttendance();
      };
    }
    loadClassStudentsForAttendance();
  }

  function loadClassStudentsForAttendance() {
    const classes = window.appState.getClasses();
    const activeClass = classes.find(c => c.id === currentSelectedClass) || classes[0];

    const titleEl = document.getElementById('attendance-session-title');
    const timeEl = document.getElementById('attendance-session-time');
    if (titleEl) titleEl.textContent = `${activeClass.id}: ${activeClass.name}`;
    if (timeEl) timeEl.textContent = `${activeClass.time} (${activeClass.room})`;

    // Get students of this class
    const allStudents = window.appState.getStudents();
    let classStudents = allStudents.filter(s => s.classId === currentSelectedClass);
    
    // If fewer than 5 students for demo, show relevant subset
    if (classStudents.length < 5) {
      classStudents = allStudents.slice(0, 16);
    }

    currentRollStudents = classStudents.map(s => ({
      id: s.id,
      studentId: s.studentId,
      name: s.name,
      avatarInitials: s.avatarInitials,
      avatarUrl: s.avatarUrl,
      status: null // 'present' | 'absent' | null
    }));

    renderRollCallRoster();
    updateAttendanceCounters();
  }

  function renderRollCallRoster() {
    const listContainer = document.getElementById('roll-call-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    currentRollStudents.forEach(student => {
      const row = document.createElement('div');
      row.className = `roll-row ${student.status === 'present' ? 'marked-present' : student.status === 'absent' ? 'marked-absent' : ''}`;
      
      const avatarHtml = getAvatarHtml(student.avatarUrl, student.avatarInitials, student.name);

      row.innerHTML = `
        <div class="student-info-cell">
          ${avatarHtml}
          <div>
            <p class="student-name">${escapeHtml(student.name)}</p>
            <p class="student-subtext">ID: ${escapeHtml(student.studentId)}</p>
          </div>
        </div>
        <div class="attendance-toggle-group">
          <button type="button" class="toggle-btn present ${student.status === 'present' ? 'active' : ''}" data-id="${student.id}" data-action="present">
            Present
          </button>
          <button type="button" class="toggle-btn absent ${student.status === 'absent' ? 'active' : ''}" data-id="${student.id}" data-action="absent">
            Absent
          </button>
        </div>
      `;

      // Button clicks
      const presentBtn = row.querySelector('.toggle-btn.present');
      const absentBtn = row.querySelector('.toggle-btn.absent');

      presentBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setStudentStatus(student.id, student.status === 'present' ? null : 'present');
      });

      absentBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setStudentStatus(student.id, student.status === 'absent' ? null : 'absent');
      });

      // Clicking row toggles between present and absent
      row.addEventListener('click', (e) => {
        if (!e.target.closest('.toggle-btn')) {
          const nextStatus = student.status === 'present' ? 'absent' : 'present';
          setStudentStatus(student.id, nextStatus);
        }
      });

      listContainer.appendChild(row);
    });
  }

  function setStudentStatus(id, status) {
    const student = currentRollStudents.find(s => s.id === id);
    if (student) {
      student.status = status;
      renderRollCallRoster();
      updateAttendanceCounters();
    }
  }

  function updateAttendanceCounters() {
    const totalCountEl = document.getElementById('att-total-count');
    const presentCountEl = document.getElementById('att-present-count');
    const absentCountEl = document.getElementById('att-absent-count');
    const submitBtn = document.getElementById('submit-attendance-btn');

    const total = currentRollStudents.length;
    const present = currentRollStudents.filter(s => s.status === 'present').length;
    const absent = currentRollStudents.filter(s => s.status === 'absent').length;

    if (totalCountEl) totalCountEl.textContent = total;
    if (presentCountEl) presentCountEl.textContent = present;
    if (absentCountEl) absentCountEl.textContent = absent;

    if (submitBtn) {
      const anyMarked = (present + absent) > 0;
      submitBtn.disabled = !anyMarked;
    }
  }

  // Mark all present button
  const markAllPresentBtn = document.getElementById('mark-all-present-btn');
  if (markAllPresentBtn) {
    markAllPresentBtn.addEventListener('click', () => {
      currentRollStudents.forEach(s => s.status = 'present');
      renderRollCallRoster();
      updateAttendanceCounters();
      window.showToast('All students marked as Present', 'info');
    });
  }

  // Reset all button
  const resetAttendanceBtn = document.getElementById('reset-attendance-btn');
  if (resetAttendanceBtn) {
    resetAttendanceBtn.addEventListener('click', () => {
      currentRollStudents.forEach(s => s.status = null);
      renderRollCallRoster();
      updateAttendanceCounters();
      window.showToast('Attendance marks cleared', 'info');
    });
  }

  // Submit attendance button
  const submitAttendanceBtn = document.getElementById('submit-attendance-btn');
  if (submitAttendanceBtn) {
    submitAttendanceBtn.addEventListener('click', () => {
      const present = currentRollStudents.filter(s => s.status === 'present').length;
      const absent = currentRollStudents.filter(s => s.status === 'absent').length;

      submitAttendanceBtn.disabled = true;
      submitAttendanceBtn.innerHTML = `<span class="material-symbols-outlined animate-spin" style="animation: spin 1s linear infinite;">refresh</span> Saving...`;

      setTimeout(() => {
        window.appState.saveAttendance(currentSelectedClass, new Date().toISOString().split('T')[0], currentRollStudents);

        submitAttendanceBtn.innerHTML = `<span class="material-symbols-outlined">check_circle</span> Saved Successfully`;
        submitAttendanceBtn.classList.replace('btn-primary', 'btn-success');

        window.showToast(`Attendance recorded! ${present} Present, ${absent} Absent`, 'success');

        setTimeout(() => {
          submitAttendanceBtn.innerHTML = `Submit Attendance <span class="material-symbols-outlined" style="font-size: 16px;">send</span>`;
          submitAttendanceBtn.classList.replace('btn-success', 'btn-primary');
          submitAttendanceBtn.disabled = false;
        }, 2000);
      }, 800);
    });
  }

  // =========================================================================
  // 3. STUDENT MANAGEMENT & ROSTER
  // =========================================================================
  const studentSearchInput = document.getElementById('student-search-input');
  const studentClassFilter = document.getElementById('student-class-filter');
  const studentStatusFilter = document.getElementById('student-status-filter');
  const studentFilterResetBtn = document.getElementById('student-filter-reset-btn');

  function getStudentFilterValues() {
    return {
      search: studentSearchInput ? studentSearchInput.value : '',
      classId: studentClassFilter ? studentClassFilter.value : 'all',
      status: studentStatusFilter ? studentStatusFilter.value : 'all'
    };
  }

  function renderStudentsTable() {
    const filters = getStudentFilterValues();
    const allFilteredStudents = window.appState.getStudents(filters);
    const tableBody = document.getElementById('students-table-body');
    const tableCountInfo = document.getElementById('students-count-info');
    const paginationControls = document.getElementById('students-pagination-controls');

    // Update KPI metrics on top
    const allStudents = window.appState.getStudents();
    const enrolledEl = document.getElementById('students-kpi-enrolled');
    const inactiveEl = document.getElementById('students-kpi-inactive');
    if (enrolledEl) enrolledEl.textContent = allStudents.length.toLocaleString();
    if (inactiveEl) inactiveEl.textContent = allStudents.filter(s => s.status === 'inactive').length;

    // Pagination calculations
    const totalPages = Math.ceil(allFilteredStudents.length / STUDENT_PAGE_SIZE) || 1;
    if (currentStudentPage > totalPages) currentStudentPage = totalPages;
    if (currentStudentPage < 1) currentStudentPage = 1;

    const startIndex = (currentStudentPage - 1) * STUDENT_PAGE_SIZE;
    const paginatedStudents = allFilteredStudents.slice(startIndex, startIndex + STUDENT_PAGE_SIZE);

    if (tableCountInfo) {
      if (allFilteredStudents.length === 0) {
        tableCountInfo.textContent = 'Showing 0 of 0 students';
      } else {
        tableCountInfo.textContent = `Showing ${startIndex + 1} to ${Math.min(startIndex + STUDENT_PAGE_SIZE, allFilteredStudents.length)} of ${allFilteredStudents.length} students`;
      }
    }

    // Render pagination buttons
    if (paginationControls) {
      paginationControls.innerHTML = '';

      // Prev Button
      const prevBtn = document.createElement('button');
      prevBtn.className = 'page-num-btn';
      prevBtn.title = 'Previous Page';
      prevBtn.disabled = currentStudentPage === 1;
      prevBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 16px;">chevron_left</span>`;
      prevBtn.addEventListener('click', () => {
        if (currentStudentPage > 1) {
          currentStudentPage--;
          renderStudentsTable();
        }
      });
      paginationControls.appendChild(prevBtn);

      // Page numbers
      for (let p = 1; p <= totalPages; p++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `page-num-btn ${p === currentStudentPage ? 'active' : ''}`;
        pageBtn.textContent = p;
        pageBtn.addEventListener('click', () => {
          currentStudentPage = p;
          renderStudentsTable();
        });
        paginationControls.appendChild(pageBtn);
      }

      // Next Button
      const nextBtn = document.createElement('button');
      nextBtn.className = 'page-num-btn';
      nextBtn.title = 'Next Page';
      nextBtn.disabled = currentStudentPage === totalPages;
      nextBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 16px;">chevron_right</span>`;
      nextBtn.addEventListener('click', () => {
        if (currentStudentPage < totalPages) {
          currentStudentPage++;
          renderStudentsTable();
        }
      });
      paginationControls.appendChild(nextBtn);
    }

    if (!tableBody) return;
    tableBody.innerHTML = '';

    if (paginatedStudents.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 36px; color: var(--color-on-surface-variant);">
            <span class="material-symbols-outlined" style="font-size: 36px; opacity: 0.5;">person_search</span>
            <p style="margin-top: 8px; font-weight: 500;">No students match your filter criteria.</p>
          </td>
        </tr>
      `;
      return;
    }

    paginatedStudents.forEach(student => {
      const tr = document.createElement('tr');
      const avatarHtml = getAvatarHtml(student.avatarUrl, student.avatarInitials, student.name);

      tr.innerHTML = `
        <td style="font-family: monospace; font-weight: 600; color: var(--color-on-surface-variant);">${escapeHtml(student.studentId)}</td>
        <td>
          <div class="student-info-cell">
            ${avatarHtml}
            <div>
              <p class="student-name">${escapeHtml(student.name)}</p>
              <p class="student-subtext">${escapeHtml(student.className)}</p>
            </div>
          </div>
        </td>
        <td>
          <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: var(--radius-md); background: var(--color-surface-container); font-size: 12px; font-weight: 600;">
            <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--color-primary);"></span>
            ${escapeHtml(student.classId)}
          </span>
        </td>
        <td>
          <p style="font-size: 12px; color: var(--color-on-surface); font-weight: 500;">${escapeHtml(student.email)}</p>
          <p style="font-size: 11px; color: var(--color-on-surface-variant);">${escapeHtml(student.phone)}</p>
        </td>
        <td>
          <span class="status-pill ${student.status === 'active' ? 'status-active' : 'status-inactive'}">
            ${escapeHtml(student.status)}
          </span>
        </td>
        <td style="text-align: right;">
          <div class="action-btn-group">
            <button type="button" class="icon-btn js-view-student" title="View Profile" data-id="${student.id}" aria-label="View profile of ${escapeHtml(student.name)}">
              <span class="material-symbols-outlined">visibility</span>
            </button>
            <button type="button" class="icon-btn js-edit-student" title="Edit Student" data-id="${student.id}" aria-label="Edit ${escapeHtml(student.name)}">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button type="button" class="icon-btn danger js-delete-student" title="Delete Student" data-id="${student.id}" aria-label="Delete ${escapeHtml(student.name)}">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </td>
      `;

      // Event listeners on actions
      tr.querySelector('.js-view-student').addEventListener('click', () => openStudentProfileModal(student));
      tr.querySelector('.js-edit-student').addEventListener('click', () => openEditStudentModal(student));
      tr.querySelector('.js-delete-student').addEventListener('click', () => confirmDeleteStudent(student));

      tableBody.appendChild(tr);
    });
  }

  // Filter event listeners (reset to page 1)
  if (studentSearchInput) {
    studentSearchInput.addEventListener('input', () => {
      currentStudentPage = 1;
      renderStudentsTable();
    });
  }
  if (studentClassFilter) {
    studentClassFilter.addEventListener('change', () => {
      currentStudentPage = 1;
      renderStudentsTable();
    });
  }
  if (studentStatusFilter) {
    studentStatusFilter.addEventListener('change', () => {
      currentStudentPage = 1;
      renderStudentsTable();
    });
  }
  if (studentFilterResetBtn) {
    studentFilterResetBtn.addEventListener('click', () => {
      if (studentSearchInput) studentSearchInput.value = '';
      if (studentClassFilter) studentClassFilter.value = 'all';
      if (studentStatusFilter) studentStatusFilter.value = 'all';
      currentStudentPage = 1;
      renderStudentsTable();
      window.showToast('Filters reset', 'info');
    });
  }

  // Add Student Modal Logic
  const addStudentBtn = document.getElementById('add-student-btn');
  const addStudentModal = document.getElementById('add-student-modal');
  const addStudentForm = document.getElementById('add-student-form');
  const addStudentCloseBtn = document.getElementById('add-student-close-btn');
  const addStudentCancelBtn = document.getElementById('add-student-cancel-btn');

  if (addStudentBtn) {
    addStudentBtn.addEventListener('click', () => {
      addStudentForm.reset();
      addStudentModal.classList.add('active');
    });
  }

  function closeAddStudentModal() {
    if (addStudentModal) addStudentModal.classList.remove('active');
  }

  if (addStudentCloseBtn) addStudentCloseBtn.addEventListener('click', closeAddStudentModal);
  if (addStudentCancelBtn) addStudentCancelBtn.addEventListener('click', closeAddStudentModal);

  if (addStudentForm) {
    addStudentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('modal-student-name').value.trim();
      const email = document.getElementById('modal-student-email').value.trim();
      const phone = document.getElementById('modal-student-phone').value.trim();
      const classId = document.getElementById('modal-student-class').value;
      const status = document.getElementById('modal-student-status').value;

      if (!name || !email) {
        window.showToast('Please fill all required fields', 'error');
        return;
      }

      const classes = window.appState.getClasses();
      const cls = classes.find(c => c.id === classId) || { name: classId };

      window.appState.addStudent({
        name,
        email,
        phone,
        classId,
        className: `${classId} - ${cls.name}`,
        status
      });

      closeAddStudentModal();
      currentStudentPage = 1;
      renderStudentsTable();
      window.showToast(`Student ${name} successfully enrolled!`, 'success');
    });
  }

  // Edit Student Modal Logic
  const editStudentModal = document.getElementById('edit-student-modal');
  const editStudentForm = document.getElementById('edit-student-form');
  const editStudentCloseBtn = document.getElementById('edit-student-close-btn');
  const editStudentCancelBtn = document.getElementById('edit-student-cancel-btn');

  let editingStudentId = null;

  function openEditStudentModal(student) {
    editingStudentId = student.id;
    document.getElementById('edit-student-id').value = student.id;
    document.getElementById('edit-modal-name').value = student.name;
    document.getElementById('edit-modal-email').value = student.email;
    document.getElementById('edit-modal-phone').value = student.phone || '';
    document.getElementById('edit-modal-class').value = student.classId;
    document.getElementById('edit-modal-status').value = student.status;

    editStudentModal.classList.add('active');
  }

  function closeEditStudentModal() {
    if (editStudentModal) editStudentModal.classList.remove('active');
    editingStudentId = null;
  }

  if (editStudentCloseBtn) editStudentCloseBtn.addEventListener('click', closeEditStudentModal);
  if (editStudentCancelBtn) editStudentCancelBtn.addEventListener('click', closeEditStudentModal);

  if (editStudentForm) {
    editStudentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!editingStudentId) return;

      const name = document.getElementById('edit-modal-name').value.trim();
      const email = document.getElementById('edit-modal-email').value.trim();
      const phone = document.getElementById('edit-modal-phone').value.trim();
      const classId = document.getElementById('edit-modal-class').value;
      const status = document.getElementById('edit-modal-status').value;

      const classes = window.appState.getClasses();
      const cls = classes.find(c => c.id === classId) || { name: classId };

      window.appState.updateStudent(editingStudentId, {
        name,
        email,
        phone,
        classId,
        className: `${classId} - ${cls.name}`,
        status
      });

      closeEditStudentModal();
      renderStudentsTable();
      window.showToast(`Student details updated successfully!`, 'success');
    });
  }

  // Delete Student confirmation
  function confirmDeleteStudent(student) {
    if (confirm(`Are you sure you want to remove ${student.name} (${student.studentId}) from the roster?`)) {
      window.appState.deleteStudent(student.id);
      renderStudentsTable();
      window.showToast(`Student ${student.name} removed.`, 'info');
    }
  }

  // Student Profile / Details Modal
  const profileModal = document.getElementById('student-profile-modal');
  const profileModalCloseBtn = document.getElementById('student-profile-close-btn');

  function openStudentProfileModal(student) {
    if (!profileModal) return;

    const nameEl = document.getElementById('profile-modal-name');
    const idEl = document.getElementById('profile-modal-id');
    const classEl = document.getElementById('profile-modal-class');
    const emailEl = document.getElementById('profile-modal-email');
    const phoneEl = document.getElementById('profile-modal-phone');
    const rateEl = document.getElementById('profile-modal-rate');
    const attendedEl = document.getElementById('profile-modal-attended');
    const avatarBox = document.getElementById('profile-modal-avatar');

    if (nameEl) nameEl.textContent = student.name;
    if (idEl) idEl.textContent = student.studentId;
    if (classEl) classEl.textContent = student.className;
    if (emailEl) emailEl.textContent = student.email;
    if (phoneEl) phoneEl.textContent = student.phone || 'N/A';
    if (rateEl) rateEl.textContent = `${student.attendanceRate}%`;
    if (attendedEl) attendedEl.textContent = `${student.attendedClasses || 14} / ${student.totalClasses || 15} Classes`;

    if (avatarBox) {
      avatarBox.innerHTML = '';
      if (student.avatarUrl) {
        const img = document.createElement('img');
        img.src = student.avatarUrl;
        img.alt = student.name;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.borderRadius = '50%';
        img.style.objectFit = 'cover';
        img.onerror = () => {
          avatarBox.textContent = student.avatarInitials || 'ST';
        };
        avatarBox.appendChild(img);
      } else {
        avatarBox.textContent = student.avatarInitials || 'ST';
      }
    }

    profileModal.classList.add('active');
  }

  if (profileModalCloseBtn) {
    profileModalCloseBtn.addEventListener('click', () => {
      profileModal.classList.remove('active');
    });
  }

  // =========================================================================
  // 4. ATTENDANCE REPORTS VIEW
  // =========================================================================
  const reportsClassSelect = document.getElementById('reports-class-select');
  const reportsTypeSelect = document.getElementById('reports-type-select');

  function renderReportsView() {
    let students = window.appState.getStudents();
    const classFilter = reportsClassSelect ? reportsClassSelect.value : 'all';

    if (classFilter && classFilter !== 'all') {
      students = students.filter(s => s.classId.toLowerCase() === classFilter.toLowerCase());
    }

    // Update Report Summary KPIs
    const avgKpi = document.getElementById('reports-kpi-avg');
    const absKpi = document.getElementById('reports-kpi-absences');
    const perfKpi = document.getElementById('reports-kpi-perfect');

    if (students.length > 0) {
      const avg = (students.reduce((acc, s) => acc + (s.attendanceRate || 92), 0) / students.length).toFixed(1);
      const perfect = students.filter(s => (s.attendanceRate || 0) >= 100).length;
      if (avgKpi) avgKpi.textContent = `${avg}%`;
      if (perfKpi) perfKpi.textContent = perfect;
    }

    const tableBody = document.getElementById('reports-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (students.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 36px; color: var(--color-on-surface-variant);">
            <p style="font-weight: 500;">No records found for the selected filter.</p>
          </td>
        </tr>
      `;
      return;
    }

    students.forEach(student => {
      const tr = document.createElement('tr');
      const avatarHtml = getAvatarHtml(student.avatarUrl, student.avatarInitials, student.name);

      const rate = student.attendanceRate || 92;
      let barColor = 'var(--color-secondary)';
      let textClass = 'color: var(--color-secondary)';
      if (rate < 75) {
        barColor = 'var(--color-error)';
        textClass = 'color: var(--color-error)';
      } else if (rate < 90) {
        barColor = 'var(--color-primary)';
        textClass = 'color: var(--color-primary)';
      }

      tr.innerHTML = `
        <td>
          <div class="student-info-cell">
            ${avatarHtml}
            <span class="student-name">${escapeHtml(student.name)}</span>
          </div>
        </td>
        <td style="font-family: monospace; font-size: 12px; color: var(--color-on-surface-variant);">${escapeHtml(student.studentId)}</td>
        <td style="font-weight: 500;">${student.attendedClasses || 14} / ${student.totalClasses || 15}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 12px; max-width: 220px;">
            <span style="font-size: 13px; font-weight: 700; width: 45px; ${textClass}">${rate}%</span>
            <div style="flex: 1; height: 8px; background: var(--color-surface-container-high); border-radius: var(--radius-full); overflow: hidden;">
              <div style="height: 100%; width: ${rate}%; background: ${barColor}; border-radius: var(--radius-full); transition: width 0.5s ease;"></div>
            </div>
          </div>
        </td>
        <td style="text-align: right;">
          <button type="button" class="icon-btn js-view-student" title="View Full Log" data-id="${student.id}" aria-label="View report for ${escapeHtml(student.name)}">
            <span class="material-symbols-outlined">visibility</span>
          </button>
        </td>
      `;

      tr.querySelector('.js-view-student').addEventListener('click', () => openStudentProfileModal(student));
      tableBody.appendChild(tr);
    });
  }

  if (reportsClassSelect) {
    reportsClassSelect.addEventListener('change', renderReportsView);
  }
  if (reportsTypeSelect) {
    reportsTypeSelect.addEventListener('change', () => {
      window.showToast(`Report timeframe updated to ${reportsTypeSelect.value}`, 'info');
      renderReportsView();
    });
  }

  // Export CSV Action
  const exportCsvBtn = document.getElementById('reports-export-csv-btn');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      const students = window.appState.getStudents();
      let csv = 'Student ID,Name,Class,Email,Attended,Total,Rate\n';
      students.forEach(s => {
        csv += `"${s.studentId}","${s.name}","${s.classId}","${s.email}",${s.attendedClasses || 14},${s.totalClasses || 15},${s.attendanceRate || 92}%\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      window.showToast('Attendance report exported as CSV', 'success');
    });
  }

  // Export PDF / Print Action
  const exportPdfBtn = document.getElementById('reports-export-pdf-btn');
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => {
      window.print();
    });
  }

  // =========================================================================
  // 5. CLASS SCHEDULE VIEW
  // =========================================================================
  function renderScheduleView() {
    const schedule = window.appState.getSchedule();
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const timeSlots = [
      '09:00 AM - 10:30 AM',
      '11:00 AM - 12:30 PM',
      '01:30 PM - 03:00 PM',
      '03:30 PM - 05:00 PM'
    ];

    const container = document.getElementById('schedule-grid-body');
    if (!container) return;

    container.innerHTML = '';

    timeSlots.forEach(timeSlot => {
      // Time label column
      const timeCell = document.createElement('div');
      timeCell.className = 'schedule-time-cell';
      timeCell.textContent = timeSlot.split(' - ')[0];
      container.appendChild(timeCell);

      // Day slots
      days.forEach(day => {
        const slot = document.createElement('div');
        slot.className = 'schedule-slot';

        const match = schedule.find(s => s.day === day && s.time === timeSlot);
        if (match) {
          slot.innerHTML = `
            <div class="schedule-card ${match.color || 'primary'}">
              <div>
                <p class="schedule-card-title">${escapeHtml(match.className)}</p>
                <p class="schedule-card-room">${escapeHtml(match.room)}</p>
              </div>
              <button type="button" class="schedule-card-btn" data-class="${match.classId}">
                <span class="material-symbols-outlined" style="font-size: 13px;">fact_check</span>
                Take Roll
              </button>
            </div>
          `;

          const takeRollBtn = slot.querySelector('.schedule-card-btn');
          takeRollBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navigateTo('attendance', { classId: match.classId });
          });
        }

        container.appendChild(slot);
      });
    });
  }

  // =========================================================================
  // 6. AUTH VIEW (LOGIN & REGISTRATION)
  // =========================================================================
  const authTabLogin = document.getElementById('auth-tab-login');
  const authTabRegister = document.getElementById('auth-tab-register');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const demoLoginBtn = document.getElementById('demo-login-btn');
  const logoutBtn = document.getElementById('sidebar-logout-btn');

  if (authTabLogin && authTabRegister) {
    authTabLogin.addEventListener('click', () => {
      authTabLogin.classList.add('active');
      authTabRegister.classList.remove('active');
      loginForm.style.display = 'block';
      registerForm.style.display = 'none';
    });

    authTabRegister.addEventListener('click', () => {
      authTabRegister.classList.add('active');
      authTabLogin.classList.remove('active');
      loginForm.style.display = 'none';
      registerForm.style.display = 'block';
    });
  }

  if (demoLoginBtn) {
    demoLoginBtn.addEventListener('click', () => {
      document.getElementById('login-email').value = 'sarah.jenkins@university.edu';
      document.getElementById('login-password').value = 'professor123';
      loginForm.dispatchEvent(new Event('submit'));
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      
      window.appState.setUser({
        name: 'Prof. Sarah Jenkins',
        email: email || 'sarah.jenkins@university.edu',
        role: 'Lead Teacher',
        avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDBJqRGGFiWE0RP63d7BveyJaNxFyvafcUsuHpI5ORSmEgvlc0LdlNzPbhgiWINTV5m6q0DO2QAIHxad8UtmzrUJQq9kTzKJdfACPDclXBjM6BTCYLeaxlKs60xs4LqUa6hRtyGh6MGccaibIBu46Jhkj3jUS8lTuFYPKQqoTJ6TSbPwaVoOREkxsXoar62rA-_DIhhJRVPBnbVc125w0KOzBr5Ktiz7eubx9r0eNxkXMvJo521Yw3Xtw',
        isLoggedIn: true
      });

      window.showToast('Welcome back, Professor Jenkins!', 'success');
      navigateTo('dashboard');
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const role = document.getElementById('reg-role').value;

      window.appState.setUser({
        name: name || 'Faculty Member',
        email: email || 'faculty@university.edu',
        role: role || 'Teacher',
        avatarUrl: '',
        isLoggedIn: true
      });

      window.showToast('Account created successfully!', 'success');
      navigateTo('dashboard');
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      window.appState.logout();
      window.showToast('You have been logged out.', 'info');
      navigateTo('auth');
    });
  }

  // Initial load
  const initialHash = window.location.hash.replace('#', '') || 'dashboard';
  navigateTo(initialHash);
});
