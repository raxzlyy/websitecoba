const STORAGE_KEYS = {
  tasks: "studymate-tasks",
  schedules: "studymate-schedules",
  alarms: "studymate-alarms"
};

const state = {
  tasks: loadData(STORAGE_KEYS.tasks),
  schedules: loadData(STORAGE_KEYS.schedules),
  alarms: loadData(STORAGE_KEYS.alarms)
};

const navButtons = document.querySelectorAll("[data-screen]");
const screenPanels = document.querySelectorAll("[data-screen-panel]");
const screenTitle = document.getElementById("screenTitle");
const notifyButton = document.getElementById("notifyButton");
const liveClock = document.getElementById("liveClock");
const liveDate = document.getElementById("liveDate");

const taskForm = document.getElementById("taskForm");
const taskList = document.getElementById("taskList");
const taskEmptyState = document.getElementById("taskEmptyState");
const taskCount = document.getElementById("taskCount");
const taskTemplate = document.getElementById("taskTemplate");

const scheduleForm = document.getElementById("scheduleForm");
const scheduleBoard = document.getElementById("scheduleBoard");
const scheduleCount = document.getElementById("scheduleCount");
const scheduleEditId = document.getElementById("scheduleEditId");
const cancelScheduleEdit = document.getElementById("cancelScheduleEdit");

const alarmForm = document.getElementById("alarmForm");
const alarmList = document.getElementById("alarmList");
const alarmEmptyState = document.getElementById("alarmEmptyState");
const alarmCount = document.getElementById("alarmCount");
const alarmTemplate = document.getElementById("alarmTemplate");

initialize();

function initialize() {
  setDefaultTaskDateTime();
  setDefaultAlarmDateTime();
  bindEvents();
  updateClock();
  renderAll();
  updateNotificationButton();
  checkAlarms();
  window.setInterval(updateClock, 1000);
  window.setInterval(checkAlarms, 30000);
}

function bindEvents() {
  navButtons.forEach((button) => {
    button.addEventListener("click", () => activateScreen(button.dataset.screen));
  });

  document.querySelectorAll("[data-screen-jump]").forEach((button) => {
    button.addEventListener("click", () => activateScreen(button.dataset.screenJump));
  });

  document.querySelectorAll("[data-url]").forEach((button) => {
    button.addEventListener("click", () => window.open(button.dataset.url, "_blank", "noopener"));
  });

  taskForm.addEventListener("submit", handleTaskSubmit);
  scheduleForm.addEventListener("submit", handleScheduleSubmit);
  cancelScheduleEdit.addEventListener("click", resetScheduleForm);
  alarmForm.addEventListener("submit", handleAlarmSubmit);
  document.getElementById("searchForm").addEventListener("submit", handleGoogleSearch);
  document.getElementById("openChatGPT").addEventListener("click", () => {
    window.open("https://chat.openai.com", "_blank", "noopener");
  });
  notifyButton.addEventListener("click", requestNotifications);
}

function activateScreen(screen) {
  const titleMap = {
    home: "Home",
    tasks: "Tugas",
    schedule: "Jadwal",
    alarms: "Alarm",
    ai: "AI / Search"
  };

  navButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.screen === screen);
  });

  screenPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.screenPanel === screen);
  });

  screenTitle.textContent = titleMap[screen];
}

function handleTaskSubmit(event) {
  event.preventDefault();
  const formData = new FormData(taskForm);
  const title = String(formData.get("title")).trim();
  const description = String(formData.get("description")).trim();
  const date = String(formData.get("date"));
  const time = String(formData.get("time"));
  const remindAt = new Date(`${date}T${time}`);

  if (!title || Number.isNaN(remindAt.getTime())) {
    return;
  }

  state.tasks.unshift({
    id: crypto.randomUUID(),
    title,
    description,
    remindAt: remindAt.toISOString(),
    completed: false,
    notified: false
  });

  saveData(STORAGE_KEYS.tasks, state.tasks);
  taskForm.reset();
  setDefaultTaskDateTime();
  renderTasks();
  renderHomeMetrics();
}

function handleScheduleSubmit(event) {
  event.preventDefault();
  const formData = new FormData(scheduleForm);
  const entry = {
    id: scheduleEditId.value || crypto.randomUUID(),
    day: String(formData.get("day")).trim(),
    period: String(formData.get("period")).trim(),
    teacher: String(formData.get("teacher")).trim(),
    time: String(formData.get("time")).trim()
  };

  if (!entry.day || !entry.period || !entry.teacher || !entry.time) {
    return;
  }

  if (scheduleEditId.value) {
    state.schedules = state.schedules.map((item) => (item.id === entry.id ? entry : item));
  } else {
    state.schedules.push(entry);
  }

  saveData(STORAGE_KEYS.schedules, state.schedules);
  resetScheduleForm();
  renderSchedules();
  renderHomeMetrics();
}

function handleAlarmSubmit(event) {
  event.preventDefault();
  const formData = new FormData(alarmForm);
  const label = String(formData.get("label")).trim();
  const date = String(formData.get("date"));
  const time = String(formData.get("time"));
  const remindAt = new Date(`${date}T${time}`);

  if (!label || Number.isNaN(remindAt.getTime())) {
    return;
  }

  state.alarms.unshift({
    id: crypto.randomUUID(),
    label,
    remindAt: remindAt.toISOString(),
    fired: false
  });

  saveData(STORAGE_KEYS.alarms, state.alarms);
  alarmForm.reset();
  setDefaultAlarmDateTime();
  renderAlarms();
  renderHomeMetrics();
}

function handleGoogleSearch(event) {
  event.preventDefault();
  const query = document.getElementById("searchQuery").value.trim();
  const url = query
    ? `https://www.google.com/search?q=${encodeURIComponent(query)}`
    : "https://www.google.com";
  window.open(url, "_blank", "noopener");
}

function renderAll() {
  renderTasks();
  renderSchedules();
  renderAlarms();
  renderHomeMetrics();
}

function renderTasks() {
  taskList.innerHTML = "";
  const sortedTasks = [...state.tasks].sort((a, b) => new Date(a.remindAt) - new Date(b.remindAt));
  taskEmptyState.hidden = sortedTasks.length !== 0;
  taskCount.textContent = `${sortedTasks.length} tugas`;

  sortedTasks.forEach((task) => {
    const fragment = taskTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".list-card");
    const title = fragment.querySelector(".list-card-title");
    const copy = fragment.querySelector(".list-card-copy");
    const meta = fragment.querySelector(".list-card-meta");
    const status = fragment.querySelector(".badge-status");
    const completeButton = fragment.querySelector(".complete-action");
    const deleteButton = fragment.querySelector(".delete-action");
    const remindAt = new Date(task.remindAt);
    const overdue = remindAt < new Date() && !task.completed;

    title.textContent = task.title;
    copy.textContent = task.description || "Tanpa catatan tambahan.";
    meta.textContent = `Pengingat: ${formatDateTime(remindAt)}`;
    status.textContent = task.completed ? "Selesai" : overdue ? "Terlewat" : "Aktif";
    completeButton.textContent = task.completed ? "Aktifkan Lagi" : "Selesai";

    if (task.completed) {
      card.classList.add("is-completed");
    }

    completeButton.addEventListener("click", () => {
      state.tasks = state.tasks.map((item) =>
        item.id === task.id
          ? { ...item, completed: !item.completed, notified: item.completed ? item.notified : true }
          : item
      );
      saveData(STORAGE_KEYS.tasks, state.tasks);
      renderTasks();
      renderHomeMetrics();
    });

    deleteButton.addEventListener("click", () => {
      state.tasks = state.tasks.filter((item) => item.id !== task.id);
      saveData(STORAGE_KEYS.tasks, state.tasks);
      renderTasks();
      renderHomeMetrics();
    });

    taskList.appendChild(fragment);
  });
}

function renderSchedules() {
  scheduleBoard.innerHTML = "";
  const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];
  scheduleCount.textContent = `${state.schedules.length} item`;

  days.forEach((day) => {
    const column = document.createElement("section");
    column.className = "day-column";
    const heading = document.createElement("h4");
    heading.textContent = day;
    column.appendChild(heading);

    const items = state.schedules
      .filter((item) => item.day === day)
      .sort((a, b) => String(a.period).localeCompare(String(b.period), "id", { numeric: true }));

    if (items.length === 0) {
      const empty = document.createElement("p");
      empty.className = "list-card-meta";
      empty.textContent = "Belum ada jadwal.";
      column.appendChild(empty);
    } else {
      items.forEach((item) => {
        const card = document.createElement("article");
        card.className = "schedule-item";
        const title = document.createElement("strong");
        const teacher = document.createElement("span");
        const actions = document.createElement("div");
        const editButton = document.createElement("button");
        const deleteButton = document.createElement("button");

        title.textContent = `Jam ${item.period} • ${item.time}`;
        teacher.textContent = item.teacher;
        actions.className = "card-actions";

        editButton.type = "button";
        editButton.className = "ghost-button";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => fillScheduleForm(item));

        deleteButton.type = "button";
        deleteButton.className = "ghost-button";
        deleteButton.textContent = "Hapus";
        deleteButton.addEventListener("click", () => {
          state.schedules = state.schedules.filter((entry) => entry.id !== item.id);
          saveData(STORAGE_KEYS.schedules, state.schedules);
          renderSchedules();
          renderHomeMetrics();
          if (scheduleEditId.value === item.id) {
            resetScheduleForm();
          }
        });

        actions.append(editButton, deleteButton);
        card.append(title, teacher, actions);
        column.appendChild(card);
      });
    }

    scheduleBoard.appendChild(column);
  });
}

function renderAlarms() {
  alarmList.innerHTML = "";
  const sortedAlarms = [...state.alarms].sort((a, b) => new Date(a.remindAt) - new Date(b.remindAt));
  alarmEmptyState.hidden = sortedAlarms.length !== 0;
  alarmCount.textContent = `${sortedAlarms.length} alarm`;

  sortedAlarms.forEach((alarm) => {
    const fragment = alarmTemplate.content.cloneNode(true);
    const title = fragment.querySelector(".list-card-title");
    const meta = fragment.querySelector(".list-card-meta");
    const status = fragment.querySelector(".badge-status");
    const deleteButton = fragment.querySelector(".delete-action");

    title.textContent = alarm.label;
    meta.textContent = formatDateTime(new Date(alarm.remindAt));
    status.textContent = alarm.fired ? "Selesai" : "Aktif";

    deleteButton.addEventListener("click", () => {
      state.alarms = state.alarms.filter((item) => item.id !== alarm.id);
      saveData(STORAGE_KEYS.alarms, state.alarms);
      renderAlarms();
      renderHomeMetrics();
    });

    alarmList.appendChild(fragment);
  });
}

function renderHomeMetrics() {
  document.getElementById("homeTaskCount").textContent = state.tasks.length;
  document.getElementById("homeAlarmCount").textContent = state.alarms.filter((alarm) => !alarm.fired).length;
  document.getElementById("homeScheduleCount").textContent = state.schedules.length;
}

function fillScheduleForm(item) {
  scheduleEditId.value = item.id;
  document.getElementById("scheduleDay").value = item.day;
  document.getElementById("schedulePeriod").value = item.period;
  document.getElementById("scheduleTeacher").value = item.teacher;
  document.getElementById("scheduleTime").value = item.time;
  cancelScheduleEdit.hidden = false;
  activateScreen("schedule");
}

function resetScheduleForm() {
  scheduleForm.reset();
  scheduleEditId.value = "";
  cancelScheduleEdit.hidden = true;
}

function updateClock() {
  const now = new Date();
  liveClock.textContent = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(now);
  liveDate.textContent = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(now);
}

function setDefaultTaskDateTime() {
  const nextHour = new Date(Date.now() + 60 * 60 * 1000);
  document.getElementById("taskDate").value = formatDateInput(nextHour);
  document.getElementById("taskTime").value = formatTimeInput(nextHour);
}

function setDefaultAlarmDateTime() {
  const nextHour = new Date(Date.now() + 60 * 60 * 1000);
  document.getElementById("alarmDate").value = formatDateInput(nextHour);
  document.getElementById("alarmTime").value = formatTimeInput(nextHour);
}

function checkAlarms() {
  const now = new Date();
  let changed = false;

  state.alarms = state.alarms.map((alarm) => {
    if (!alarm.fired && new Date(alarm.remindAt) <= now) {
      changed = true;
      showNotification(alarm.label, "Alarm StudyMate AI sudah waktunya.");
      return { ...alarm, fired: true };
    }
    return alarm;
  });

  state.tasks = state.tasks.map((task) => {
    if (!task.completed && !task.notified && new Date(task.remindAt) <= now) {
      changed = true;
      showNotification(task.title, task.description || "Waktunya mengerjakan tugas ini.");
      return { ...task, notified: true };
    }
    return task;
  });

  if (changed) {
    saveData(STORAGE_KEYS.alarms, state.alarms);
    saveData(STORAGE_KEYS.tasks, state.tasks);
    renderTasks();
    renderAlarms();
    renderHomeMetrics();
  }
}

function loadData(key) {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function formatDateInput(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function formatTimeInput(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeStyle: "short"
  }).format(date);
}

async function requestNotifications() {
  if (!("Notification" in window)) {
    notifyButton.textContent = "Browser tidak mendukung";
    return;
  }
  const permission = await Notification.requestPermission();
  updateNotificationButton(permission);
}

function updateNotificationButton(permission = Notification.permission) {
  if (!("Notification" in window)) {
    notifyButton.textContent = "Browser tidak mendukung";
    return;
  }
  if (permission === "granted") {
    notifyButton.textContent = "Notifikasi Aktif";
  } else if (permission === "denied") {
    notifyButton.textContent = "Notifikasi Ditolak";
  } else {
    notifyButton.textContent = "Aktifkan Notifikasi";
  }
}

function showNotification(title, body) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body });
  } else {
    window.alert(`${title}\n${body}`);
  }
}
