/**
 * EduAttend - Local Storage & State Management
 */

class AppState {
  constructor() {
    this.STORAGE_KEYS = {
      STUDENTS: 'eduattend_students',
      CLASSES: 'eduattend_classes',
      ATTENDANCE: 'eduattend_attendance_records',
      ALERTS: 'eduattend_alerts',
      SCHEDULE: 'eduattend_schedule',
      USER: 'eduattend_auth_user'
    };

    this.init();
  }

  init() {
    if (!localStorage.getItem(this.STORAGE_KEYS.STUDENTS)) {
      localStorage.setItem(this.STORAGE_KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.CLASSES)) {
      localStorage.setItem(this.STORAGE_KEYS.CLASSES, JSON.stringify(INITIAL_CLASSES));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.ALERTS)) {
      localStorage.setItem(this.STORAGE_KEYS.ALERTS, JSON.stringify(INITIAL_ALERTS));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.SCHEDULE)) {
      localStorage.setItem(this.STORAGE_KEYS.SCHEDULE, JSON.stringify(INITIAL_SCHEDULE));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.ATTENDANCE)) {
      const initialAttendance = [
        {
          id: 'att-101',
          classId: 'CS101',
          date: '2023-10-24',
          presentCount: 22,
          absentCount: 2,
          timestamp: new Date().toISOString()
        }
      ];
      localStorage.setItem(this.STORAGE_KEYS.ATTENDANCE, JSON.stringify(initialAttendance));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.USER)) {
      localStorage.setItem(this.STORAGE_KEYS.USER, JSON.stringify({
        name: 'Prof. Sarah Jenkins',
        email: 'sarah.jenkins@university.edu',
        role: 'Lead Teacher',
        avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDBJqRGGFiWE0RP63d7BveyJaNxFyvafcUsuHpI5ORSmEgvlc0LdlNzPbhgiWINTV5m6q0DO2QAIHxad8UtmzrUJQq9kTzKJdfACPDclXBjM6BTCYLeaxlKs60xs4LqUa6hRtyGh6MGccaibIBu46Jhkj3jUS8lTuFYPKQqoTJ6TSbPwaVoOREkxsXoar62rA-_DIhhJRVPBnbVc125w0KOzBr5Ktiz7eubx9r0eNxkXMvJo521Yw3Xtw',
        isLoggedIn: true
      }));
    }
  }

  // --- Students CRUD ---
  getStudents(filters = {}) {
    const raw = localStorage.getItem(this.STORAGE_KEYS.STUDENTS);
    let students = raw ? JSON.parse(raw) : [];

    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      students = students.filter(s => 
        (s.name && s.name.toLowerCase().includes(q)) || 
        (s.studentId && s.studentId.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q))
      );
    }

    if (filters.classId && filters.classId !== 'all') {
      students = students.filter(s => s.classId && s.classId.toLowerCase() === filters.classId.toLowerCase());
    }

    if (filters.status && filters.status !== 'all') {
      students = students.filter(s => s.status && s.status.toLowerCase() === filters.status.toLowerCase());
    }

    return students;
  }

  getStudentById(id) {
    const students = this.getStudents();
    return students.find(s => s.id === Number(id) || s.studentId === id || s.id === id);
  }

  addStudent(data) {
    const students = this.getStudents();
    const newId = Date.now();
    const initials = (data.name || 'Student')
      .split(' ')
      .filter(n => n.length > 0)
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'ST';
    
    const newStudent = {
      id: newId,
      studentId: data.studentId || `STU-${Math.floor(1000 + Math.random() * 9000)}`,
      name: data.name,
      avatarInitials: initials,
      avatarUrl: data.avatarUrl || '',
      classId: data.classId || 'CS101',
      className: data.className || 'CS101 - Intro to CS',
      email: data.email || `${data.name.toLowerCase().replace(/\s+/g, '.')}@student.edu`,
      phone: data.phone || '+1 (555) 019-0000',
      status: data.status || 'active',
      attendedClasses: 15,
      totalClasses: 15,
      attendanceRate: 100
    };

    students.unshift(newStudent);
    localStorage.setItem(this.STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    return newStudent;
  }

  updateStudent(id, data) {
    let students = this.getStudents();
    const index = students.findIndex(s => s.id === Number(id) || s.studentId === id || s.id === id);
    if (index !== -1) {
      students[index] = { ...students[index], ...data };
      localStorage.setItem(this.STORAGE_KEYS.STUDENTS, JSON.stringify(students));
      return students[index];
    }
    return null;
  }

  deleteStudent(id) {
    let students = this.getStudents();
    students = students.filter(s => s.id !== Number(id) && s.studentId !== id && s.id !== id);
    localStorage.setItem(this.STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    return true;
  }

  // --- Classes & Schedule ---
  getClasses() {
    const raw = localStorage.getItem(this.STORAGE_KEYS.CLASSES);
    return raw ? JSON.parse(raw) : INITIAL_CLASSES;
  }

  getSchedule() {
    const raw = localStorage.getItem(this.STORAGE_KEYS.SCHEDULE);
    return raw ? JSON.parse(raw) : INITIAL_SCHEDULE;
  }

  addScheduleItem(item) {
    const schedule = this.getSchedule();
    schedule.push(item);
    localStorage.setItem(this.STORAGE_KEYS.SCHEDULE, JSON.stringify(schedule));
    return item;
  }

  // --- Alerts ---
  getAlerts() {
    const raw = localStorage.getItem(this.STORAGE_KEYS.ALERTS);
    return raw ? JSON.parse(raw) : INITIAL_ALERTS;
  }

  dismissAlert(alertId) {
    let alerts = this.getAlerts();
    alerts = alerts.filter(a => a.id !== alertId);
    localStorage.setItem(this.STORAGE_KEYS.ALERTS, JSON.stringify(alerts));
    return alerts;
  }

  // --- Attendance Records ---
  getAttendanceRecords() {
    const raw = localStorage.getItem(this.STORAGE_KEYS.ATTENDANCE);
    return raw ? JSON.parse(raw) : [];
  }

  saveAttendance(classId, date, records) {
    const all = this.getAttendanceRecords();
    const presentCount = records.filter(r => r.status === 'present').length;
    const absentCount = records.filter(r => r.status === 'absent').length;

    const session = {
      id: `att-${Date.now()}`,
      classId,
      date,
      presentCount,
      absentCount,
      totalCount: records.length,
      records,
      timestamp: new Date().toISOString()
    };

    all.unshift(session);
    localStorage.setItem(this.STORAGE_KEYS.ATTENDANCE, JSON.stringify(all));

    // Update student attended stats
    const students = this.getStudents();
    records.forEach(r => {
      const student = students.find(s => s.id === r.id || s.studentId === r.studentId);
      if (student) {
        student.totalClasses = (student.totalClasses || 15) + 1;
        if (r.status === 'present') {
          student.attendedClasses = (student.attendedClasses || 15) + 1;
        }
        student.attendanceRate = Math.round((student.attendedClasses / student.totalClasses) * 1000) / 10;
      }
    });
    localStorage.setItem(this.STORAGE_KEYS.STUDENTS, JSON.stringify(students));

    return session;
  }

  // --- Global Stats ---
  getOverallStats() {
    const students = this.getStudents();
    const totalEnrolled = students.length || 1248;
    const activeCount = students.filter(s => s.status === 'active').length;
    const inactiveCount = students.filter(s => s.status === 'inactive').length;
    
    // Average attendance
    const sumRate = students.reduce((acc, curr) => acc + (curr.attendanceRate || 92), 0);
    const avgRate = students.length ? (sumRate / students.length).toFixed(1) : '94.2';
    
    return {
      totalEnrolled,
      activeCount,
      inactiveCount,
      presentToday: Math.round(totalEnrolled * 0.92),
      absentToday: Math.round(totalEnrolled * 0.08),
      attendanceRateToday: '92%',
      ytdAverage: `${avgRate}%`
    };
  }

  // --- Auth & User ---
  getUser() {
    const raw = localStorage.getItem(this.STORAGE_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  }

  setUser(user) {
    localStorage.setItem(this.STORAGE_KEYS.USER, JSON.stringify(user));
  }

  logout() {
    const user = this.getUser();
    if (user) {
      user.isLoggedIn = false;
      this.setUser(user);
    }
  }
}

window.appState = new AppState();
