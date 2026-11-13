// ConnectSphere — Social Media Platform & DBMS Engine
// Frontend Application Logic v2.2 — Modern Design System & Perspective Engine
// ====================================================================

// ---- State ----
let activeUserId = null;
let activeUser = null;
let isAdmin = false;
let showQueries = false;
let users = [];
let currentFeedFilter = 'all';
let currentTableTab = 'users';
let currentLayout = 'split';
let sqlLogEntries = [];
let attachedFile = null; // { name, type, size, data, isImage }

// Helper to trigger Lucide icon replacement after DOM mutations
function refreshIcons() {
  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    try {
      lucide.createIcons();
    } catch (e) {
      console.warn('Lucide icon refresh:', e);
    }
  }
}

// ---- API Helper ----
async function api(method, path, body = null, silent = false) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(`/api${path}`, opts);
    const json = await res.json();
    if (!res.ok) {
      const errMsg = json.error || json.message || `HTTP ${res.status}`;
      if (!silent) showToast(errMsg, 'error');
      if (json.query) logSql(json.query, json.params);
      throw new Error(errMsg);
    }
    // Real-time SQL query logging from backend response
    if (json.query) logSql(json.query, json.params);
    return json;
  } catch (err) {
    if (!silent && err.message && !err.message.startsWith('HTTP')) {
      if (err instanceof TypeError) {
        showToast('Network error — is the server running?', 'error');
      }
    }
    throw err;
  }
}

// ---- SQL Logger Engine ----
function detectQueryType(sql) {
  const s = sql.trimStart().toUpperCase();
  if (s.startsWith('INSERT')) return 'INSERT';
  if (s.startsWith('DELETE')) return 'DELETE';
  if (s.startsWith('UPDATE')) return 'UPDATE';
  if (s.startsWith('SELECT')) return 'SELECT';
  if (s.startsWith('CREATE')) return 'CREATE';
  if (s.startsWith('DROP')) return 'DROP';
  if (s.startsWith('TRUNCATE')) return 'TRUNCATE';
  return 'SQL';
}

function badgeClass(type) {
  const map = {
    SELECT: 'cs-badge cs-badge-select',
    INSERT: 'cs-badge cs-badge-insert',
    DELETE: 'cs-badge cs-badge-delete',
    UPDATE: 'cs-badge cs-badge-update',
  };
  return map[type] || 'cs-badge cs-badge-select';
}

function logSql(query, params) {
  const type = detectQueryType(query);
  const time = new Date().toLocaleTimeString();
  const entry = { type, query, params: params || [], time };
  sqlLogEntries.push(entry);

  const terminal = document.getElementById('sqlLogTerminal');
  if (!terminal) return;

  const placeholder = terminal.querySelector('.text-\\[var\\(--cs-terminal-muted\\)\\]') || terminal.querySelector('.text-slate-500');
  if (placeholder && placeholder.textContent.includes('Initialized')) {
    placeholder.remove();
  }

  const div = document.createElement('div');
  div.className = 'cs-sql-entry cs-sql-entry-new mb-2';
  div.innerHTML = `
    <div class="flex items-center justify-between text-[10px] font-mono mb-1.5">
      <div class="flex items-center gap-1.5">
        <span class="${badgeClass(type)}">${type}</span>
        <span class="text-[var(--cs-accent)] font-semibold">Engine Intercept</span>
      </div>
      <span class="text-[var(--cs-terminal-muted)]">${time}</span>
    </div>
    <div class="text-emerald-400 text-xs font-mono leading-relaxed whitespace-pre-wrap break-all">${escapeHtml(query)}</div>
    ${params && params.length ? `<div class="text-[var(--cs-terminal-muted)] text-[10px] font-mono mt-1.5 pt-1 border-t border-[var(--cs-terminal-border)]">Bound Parameters: [${params.map(p => typeof p === 'string' ? `'${escapeHtml(p)}'` : p).join(', ')}]</div>` : ''}
  `;
  terminal.prepend(div);

  const countBadge = document.getElementById('queryCount');
  if (countBadge) countBadge.textContent = `${sqlLogEntries.length} queries`;
  refreshIcons();
}

function clearSqlLogs() {
  sqlLogEntries = [];
  const terminal = document.getElementById('sqlLogTerminal');
  if (terminal) {
    terminal.innerHTML = `
      <div class="text-[var(--cs-terminal-muted)] flex items-center gap-2 text-xs font-mono">
        <span class="cs-terminal-cursor text-emerald-400">▋</span>
        <span>Query logs cleared. Ready for next DDL/DML operation...</span>
      </div>
    `;
  }
  const countBadge = document.getElementById('queryCount');
  if (countBadge) countBadge.textContent = '0 queries';
  showToast('SQL log cleared', 'info');
}

// ---- Toast Notifications ----
const recentToasts = new Map();

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  // Deduplicate identical toasts within a 3-second window
  const key = `${type}:${message}`;
  const now = Date.now();
  if (recentToasts.has(key) && (now - recentToasts.get(key)) < 3000) {
    return;
  }
  recentToasts.set(key, now);

  const icons = {
    success: 'check-circle',
    error: 'alert-circle',
    info: 'info',
    warning: 'alert-triangle',
  };

  const toast = document.createElement('div');
  toast.className = `cs-toast cs-toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <i data-lucide="${icons[type] || 'info'}" class="cs-toast-icon"></i>
    <span class="flex-1">${escapeHtml(message)}</span>
    <button onclick="this.parentElement.remove()" class="cs-btn-ghost cs-btn-icon text-[var(--cs-text-tertiary)] hover:text-[var(--cs-text-primary)]" style="padding:4px" aria-label="Dismiss notification">
      <i data-lucide="x" class="w-3.5 h-3.5"></i>
    </button>
  `;
  container.appendChild(toast);
  refreshIcons();

  setTimeout(() => {
    toast.classList.add('cs-toast-exit');
    setTimeout(() => {
      toast.remove();
      recentToasts.delete(key);
    }, 250);
  }, 4000);
}

// ---- Utilities ----
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileIconName(fileType, fileName) {
  const type = (fileType || '').toLowerCase();
  const ext = (fileName || '').split('.').pop().toLowerCase();
  if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (type.includes('pdf') || ext === 'pdf') return 'file-text';
  if (['doc', 'docx'].includes(ext) || type.includes('word')) return 'file-text';
  if (['xls', 'xlsx', 'csv'].includes(ext) || type.includes('excel') || type.includes('spreadsheet')) return 'table';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  if (['js', 'ts', 'py', 'java', 'c', 'cpp', 'html', 'css', 'json', 'sql'].includes(ext)) return 'file-code';
  return 'file';
}

function handleFileSelected(event, mode) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const MAX_SIZE = 15 * 1024 * 1024; // 15MB
  if (file.size > MAX_SIZE) {
    showToast('File size must be under 15MB', 'warning');
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name);
    attachedFile = {
      name: file.name,
      type: file.type || (isImage ? 'image/jpeg' : 'application/octet-stream'),
      size: file.size,
      data: e.target.result,
      isImage
    };
    renderAttachmentPreview();
    showToast(`Attached ${isImage ? 'photo' : 'file'}: ${file.name}`, 'info');
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function renderAttachmentPreview() {
  const container = document.getElementById('attachmentPreviewContainer');
  if (!container) return;

  if (!attachedFile) {
    container.innerHTML = '';
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');

  if (attachedFile.isImage) {
    container.innerHTML = `
      <div class="relative inline-block rounded-xl overflow-hidden border border-[var(--cs-border-secondary)] bg-[var(--cs-surface-secondary)] mt-1 max-w-sm shadow-sm">
        <img src="${attachedFile.data}" alt="Attachment Preview" class="max-h-48 w-full object-cover rounded-lg" />
        <button type="button" onclick="removeAttachedFile()" class="absolute top-2 right-2 w-7 h-7 rounded-full bg-[var(--cs-bg-overlay)] hover:bg-black/80 text-white flex items-center justify-center transition shadow-sm" title="Remove image">
          <i data-lucide="x" class="w-3.5 h-3.5"></i>
        </button>
        <div class="px-2.5 py-1 text-[11px] text-[var(--cs-text-secondary)] font-mono flex items-center justify-between bg-[var(--cs-surface-primary)] border-t border-[var(--cs-border-secondary)]">
          <span class="truncate max-w-[200px]">${escapeHtml(attachedFile.name)}</span>
          <span class="text-[var(--cs-text-tertiary)]">${formatBytes(attachedFile.size)}</span>
        </div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="flex items-center gap-3 p-3 rounded-xl bg-[var(--cs-surface-secondary)] border border-[var(--cs-border-secondary)] mt-1 max-w-md shadow-sm">
        <div class="w-10 h-10 rounded-lg bg-[var(--cs-surface-primary)] border border-[var(--cs-border-secondary)] flex items-center justify-center text-[var(--cs-accent)]">
          <i data-lucide="${getFileIconName(attachedFile.type, attachedFile.name)}" class="w-5 h-5"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-xs font-semibold text-[var(--cs-text-primary)] truncate">${escapeHtml(attachedFile.name)}</div>
          <div class="text-[10px] text-[var(--cs-text-tertiary)] font-mono">${formatBytes(attachedFile.size)}</div>
        </div>
        <button type="button" onclick="removeAttachedFile()" class="cs-btn-ghost cs-btn-icon text-[var(--cs-text-tertiary)] hover:text-[var(--cs-error)]" title="Remove file">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>
    `;
  }
  refreshIcons();
}

function removeAttachedFile() {
  attachedFile = null;
  renderAttachmentPreview();
  showToast('Attachment removed', 'info');
}

function openMediaLightbox(url, title = 'Image Preview') {
  const modal = document.getElementById('mediaModal');
  const img = document.getElementById('mediaModalImg');
  const titleEl = document.getElementById('mediaModalTitle');
  if (!modal || !img) return;

  img.src = url;
  if (titleEl) titleEl.textContent = title;

  if (typeof modal.showModal === 'function') {
    modal.showModal();
  } else {
    modal.setAttribute('open', '');
  }
  refreshIcons();
}

function closeMediaModal() {
  const modal = document.getElementById('mediaModal');
  if (modal) {
    if (typeof modal.close === 'function') {
      modal.close();
    } else {
      modal.removeAttribute('open');
    }
    const img = document.getElementById('mediaModalImg');
    if (img) img.src = '';
  }
}

const mediaModalEl = document.getElementById('mediaModal');
if (mediaModalEl) {
  mediaModalEl.addEventListener('click', (e) => {
    const rect = mediaModalEl.getBoundingClientRect();
    const isInDialog = (
      rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX && e.clientX <= rect.left + rect.width
    );
    if (!isInDialog) {
      closeMediaModal();
    }
  });
}

function formatPostContent(text) {
  if (!text) return '';
  const escaped = escapeHtml(text);
  return escaped.replace(/#([a-zA-Z0-9_]+)/g, '<span class="cs-hashtag font-medium">#$1</span>');
}

function insertTag(tag) {
  const input = document.getElementById('postInput');
  if (!input) return;
  const val = input.value.trim();
  input.value = val ? `${val} ${tag} ` : `${tag} `;
  input.focus();
  updatePostSqlPreview();
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const isoStr = String(dateStr).replace(' ', 'T');
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return String(dateStr);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function getInitial(name) {
  return name ? name.charAt(0).toUpperCase() : '?';
}

const avatarColorClasses = [
  'cs-avatar-1',
  'cs-avatar-2',
  'cs-avatar-3',
  'cs-avatar-4',
  'cs-avatar-5',
  'cs-avatar-6',
];

function avatarColor(id) {
  return avatarColorClasses[(id - 1) % avatarColorClasses.length];
}

// ---- NAVIGATION & VIEW SWITCHING ----

function showLandingPage() {
  activeUserId = null;
  activeUser = null;
  isAdmin = false;
  showQueries = false;
  document.body.classList.remove('show-queries', 'is-admin');
  sessionStorage.removeItem('connectsphere_active_user');

  const landing = document.getElementById('landingPage');
  const login = document.getElementById('loginScreen');
  const header = document.getElementById('appHeader');
  const app = document.getElementById('appScreen');

  if (landing) landing.classList.remove('hidden');
  if (login) login.classList.add('hidden');
  if (header) header.classList.add('hidden');
  if (app) app.classList.add('hidden');

  window.scrollTo({ top: 0, behavior: 'smooth' });
  refreshIcons();
}

function showLoginFromLanding() {
  const landing = document.getElementById('landingPage');
  const login = document.getElementById('loginScreen');
  if (landing) landing.classList.add('hidden');
  if (login) login.classList.remove('hidden');

  renderLoginAccounts();
  updateLoginSqlPreview();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  refreshIcons();
}

function showLandingFromLogin() {
  showLandingPage();
}

function showLoginScreen() {
  showLoginFromLanding();
}

async function enterAppSession(userId) {
  activeUserId = userId;
  sessionStorage.setItem('connectsphere_active_user', userId);

  activeUser = users.find(u => u.user_id === userId);
  isAdmin = activeUser ? (activeUser.username.toLowerCase() === 'admin' || Boolean(activeUser.is_admin)) : false;

  // By default: query details are ON for admin, and OFF for regular users
  showQueries = isAdmin;

  if (showQueries) {
    document.body.classList.add('show-queries');
  } else {
    document.body.classList.remove('show-queries');
  }

  if (isAdmin) {
    document.body.classList.add('is-admin');
  } else {
    document.body.classList.remove('is-admin');
  }

  const landing = document.getElementById('landingPage');
  const loginScreen = document.getElementById('loginScreen');
  const appScreen = document.getElementById('appScreen');
  const appHeader = document.getElementById('appHeader');
  const navSession = document.getElementById('navSessionContainer');
  const adminControls = document.getElementById('adminHeaderControls');

  if (landing) landing.classList.add('hidden');
  if (loginScreen) loginScreen.classList.add('hidden');
  if (appHeader) appHeader.classList.remove('hidden');
  if (appScreen) appScreen.classList.remove('hidden');
  if (navSession) navSession.classList.remove('hidden');

  // Admin-only header controls (INSERT User, Layout Switcher, Reset DB)
  if (adminControls) {
    if (isAdmin) {
      adminControls.classList.remove('hidden');
    } else {
      adminControls.classList.add('hidden');
    }
  }

  // Update navbar active user pill
  const handleEl = document.getElementById('navUserHandle');
  const roleEl = document.getElementById('navUserRole');
  if (handleEl && activeUser) {
    handleEl.textContent = `@${activeUser.username}`;
  }
  if (roleEl) {
    if (isAdmin) {
      roleEl.textContent = 'Admin / DBA';
      roleEl.className = 'text-[10px] px-2 py-0.5 rounded font-mono font-bold cs-badge cs-badge-error';
    } else {
      roleEl.textContent = 'Member';
      roleEl.className = 'text-[10px] text-[var(--cs-text-tertiary)] font-mono hidden md:inline';
    }
  }

  const avatarEl = document.getElementById('navUserAvatar');
  if (avatarEl && activeUser) {
    avatarEl.className = `w-5 h-5 rounded-full ${isAdmin ? 'bg-[var(--cs-error)]' : avatarColor(activeUser.user_id)} flex items-center justify-center text-[10px] font-bold text-white shrink-0`;
    avatarEl.textContent = getInitial(activeUser.username);
  }

  // Immediately hydrate active user sidebar card & composer avatar to prevent unstyled flash
  if (activeUser) {
    const cardAvatar = document.getElementById('activeUserAvatar');
    if (cardAvatar) {
      cardAvatar.className = `cs-avatar cs-avatar-xl ${avatarColor(activeUser.user_id)} ring-4 ring-[var(--cs-surface-primary)] cursor-pointer hover:scale-105 transition-transform`;
      cardAvatar.textContent = getInitial(activeUser.username);
    }
    const cardUsername = document.getElementById('activeUserName') || document.getElementById('activeUserUsername');
    if (cardUsername) cardUsername.textContent = `@${activeUser.username}`;
    const cardEmail = document.getElementById('activeUserEmail');
    if (cardEmail) cardEmail.textContent = activeUser.email || '';
    const postFormAvatar = document.getElementById('postFormAvatar');
    if (postFormAvatar) {
      postFormAvatar.className = `cs-avatar cs-avatar-md ${avatarColor(activeUser.user_id)}`;
      postFormAvatar.textContent = getInitial(activeUser.username);
    }
  }

  updateQueryToggleButton();

  // Layout mode: Admin defaults to split, normal users to feed focus
  if (isAdmin) {
    setLayout('split');
  } else {
    setLayout('feed');
  }

  renderFeedSkeleton(3);
  await renderActiveUserCard();
  await loadPosts();
  if (isAdmin || showQueries) {
    await loadTableData(currentTableTab, true);
  }
  updatePostSqlPreview();
  refreshIcons();
}

function toggleQueryView() {
  showQueries = !showQueries;
  if (showQueries) {
    document.body.classList.add('show-queries');
    showToast('SQL Query Inspection Mode enabled', 'info');
    setLayout('split');
    loadTableData(currentTableTab, true);
  } else {
    document.body.classList.remove('show-queries');
    showToast('Social View active (SQL queries tucked)', 'info');
    if (!isAdmin) {
      setLayout('feed');
    }
  }
  updateQueryToggleButton();
  refreshIcons();
}

function updateQueryToggleButton() {
  const btn = document.getElementById('btnToggleQueryView');
  const icon = document.getElementById('queryViewIcon');
  const label = document.getElementById('queryViewLabel');
  if (!btn || !label) return;

  if (showQueries) {
    btn.className = 'cs-btn cs-btn-secondary cs-btn-sm border-[var(--cs-accent)] text-[var(--cs-accent)] shadow-sm';
    label.textContent = 'Hide Queries';
    if (icon) icon.setAttribute('data-lucide', 'code-2');
  } else {
    btn.className = 'cs-btn cs-btn-secondary cs-btn-sm';
    label.textContent = 'Show Queries';
    if (icon) icon.setAttribute('data-lucide', 'code-2');
  }
  refreshIcons();
}

function renderLoginAccounts() {
  const grid = document.getElementById('loginAccountsGrid');
  if (!grid) return;

  // Filter out admin so admin must be entered manually with password
  const regularUsers = users.filter(u => u.username.toLowerCase() !== 'admin');

  grid.innerHTML = regularUsers.map(u => `
    <button type="button" onclick="selectLoginAccount('${escapeHtml(u.username)}')" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--cs-surface-secondary)] hover:bg-[var(--cs-surface-hover)] border border-[var(--cs-border-secondary)] hover:border-[var(--cs-accent)] text-xs text-[var(--cs-text-primary)] transition shadow-sm group">
      <span class="w-5 h-5 rounded-full ${avatarColor(u.user_id)} text-white flex items-center justify-center text-[10px] font-bold group-hover:scale-105 transition-transform">${getInitial(u.username)}</span>
      <span class="font-medium">@${escapeHtml(u.username)}</span>
    </button>
  `).join('');
  refreshIcons();
}

function selectLoginAccount(username) {
  const uInput = document.getElementById('loginUsername');
  const pInput = document.getElementById('loginPassword');
  if (uInput) uInput.value = username;
  if (pInput) {
    pInput.value = ''; // Do NOT autofill password
    pInput.focus();
  }
  showToast(`Selected @${username}. Enter password to sign in.`, 'info');
}

function updateLoginSqlPreview() {
  // Clean minimal form
}

function togglePasswordVisibility() {
  const pInput = document.getElementById('loginPassword');
  const icon = document.getElementById('passwordToggleIcon');
  if (!pInput || !icon) return;
  if (pInput.type === 'password') {
    pInput.type = 'text';
    icon.setAttribute('data-lucide', 'eye-off');
  } else {
    pInput.type = 'password';
    icon.setAttribute('data-lucide', 'eye');
  }
  refreshIcons();
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  if (!username) { showToast('Please enter a username', 'warning'); return; }
  if (!password) { showToast('Please enter a password', 'warning'); return; }

  try {
    const res = await api('POST', '/login', { username, password });
    const user = res.data;
    if (user.is_admin || user.username.toLowerCase() === 'admin') {
      showToast('Signed in as Administrator (DBA Privileges Unlocked)', 'success');
    } else {
      showToast(`Welcome back, @${user.username}`, 'success');
    }
    await loadUsers();
    await enterAppSession(user.user_id);
  } catch (err) {
    // Handled by api()
  }
}

function handleLogout() {
  showLandingPage();
  showToast('Logged out of session', 'info');
}

// ---- Active User Profile Card ----
async function renderActiveUserCard() {
  if (!activeUserId) return;
  try {
    const res = await api('GET', `/users/${activeUserId}`);
    const u = res.data;

    const cardAvatar = document.getElementById('activeUserAvatar');
    if (cardAvatar) {
      cardAvatar.className = `cs-avatar cs-avatar-xl ${avatarColor(u.user_id)} ring-4 ring-[var(--cs-surface-primary)] cursor-pointer hover:scale-105 transition-transform`;
      cardAvatar.textContent = getInitial(u.username);
    }

    const nameEl = document.getElementById('activeUserName');
    if (nameEl) nameEl.textContent = `@${u.username}`;

    const emailEl = document.getElementById('activeUserEmail');
    if (emailEl) emailEl.textContent = `${u.email} • user_id: ${u.user_id}`;

    const bioEl = document.getElementById('activeUserBio');
    if (bioEl) bioEl.textContent = u.bio || 'Database Systems Explorer & Architect';

    const postsEl = document.getElementById('activeUserPosts');
    if (postsEl) postsEl.textContent = u.post_count ?? u.posts_count ?? 0;

    const followersEl = document.getElementById('activeUserFollowers');
    if (followersEl) followersEl.textContent = u.follower_count ?? u.followers_count ?? 0;

    const followingEl = document.getElementById('activeUserFollowing');
    if (followingEl) followingEl.textContent = u.following_count ?? 0;

    // Composer avatar
    const formAvatar = document.getElementById('postFormAvatar');
    if (formAvatar) {
      formAvatar.className = `cs-avatar cs-avatar-md ${avatarColor(u.user_id)} shrink-0 mt-0.5`;
      formAvatar.textContent = getInitial(u.username);
    }
    refreshIcons();
  } catch (e) { /* handled */ }
}

// ---- Skeleton Loaders ----
function renderFeedSkeleton(count = 3) {
  const container = document.getElementById('postsStream');
  if (!container) return;
  container.innerHTML = Array(count).fill(`
    <div class="cs-card p-5 space-y-3">
      <div class="flex items-center gap-3">
        <div class="cs-skeleton w-9 h-9 rounded-lg"></div>
        <div class="space-y-1.5 flex-1">
          <div class="cs-skeleton h-3 w-28 rounded"></div>
          <div class="cs-skeleton h-2.5 w-16 rounded"></div>
        </div>
      </div>
      <div class="space-y-2 py-1">
        <div class="cs-skeleton h-3 w-full rounded"></div>
        <div class="cs-skeleton h-3 w-4/5 rounded"></div>
      </div>
      <div class="flex gap-4 pt-2 border-t border-[var(--cs-border-secondary)]">
        <div class="cs-skeleton h-6 w-20 rounded-md"></div>
        <div class="cs-skeleton h-6 w-24 rounded-md"></div>
      </div>
    </div>
  `).join('');
}

// ---- Posts & Feed Stream ----
async function loadPosts() {
  if (!activeUserId) return;
  try {
    const res = await api('GET', `/posts?filter=${currentFeedFilter}&user_id=${activeUserId}`);
    renderPostsStream(res.data);
  } catch (e) {
    const stream = document.getElementById('postsStream');
    if (stream) {
      stream.innerHTML = `
        <div class="text-center py-10 text-[var(--cs-text-tertiary)] font-mono text-xs cs-card p-6">
          <i data-lucide="alert-triangle" class="w-6 h-6 mx-auto mb-2 text-amber-500"></i>
          <p>Failed to query posts from database.</p>
        </div>`;
      refreshIcons();
    }
  }
}

function renderPostsStream(posts) {
  const container = document.getElementById('postsStream');
  const countBadge = document.getElementById('feedCountBadge');
  if (countBadge) countBadge.textContent = `${posts ? posts.length : 0} posts`;
  if (!container) return;

  if (!posts || posts.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-[var(--cs-text-tertiary)] cs-card p-8 shadow-sm">
        <i data-lucide="file-text" class="w-8 h-8 mx-auto mb-3 opacity-40"></i>
        <p class="text-sm font-semibold text-[var(--cs-text-primary)]">No posts in this feed yet</p>
        <p class="text-xs text-[var(--cs-text-tertiary)] mt-1">Publish a post above to execute an INSERT INTO Posts query!</p>
      </div>`;
    refreshIcons();
    return;
  }

  container.innerHTML = posts.map(p => {
    const isOwn = p.user_id === activeUserId;
    const liked = Boolean(p.user_liked || p.liked_by_user);
    const isFollowing = Boolean(p.is_following);

    return `
    <article class="cs-card p-4 sm:p-5 transition-all space-y-3 relative" data-post-id="${p.post_id}">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div onclick="openUserProfile(${p.user_id})" class="cs-avatar cs-avatar-md ${avatarColor(p.user_id)} cursor-pointer hover:scale-105 transition-transform" title="Click to view @${escapeHtml(p.username)}'s profile">
            ${getInitial(p.username)}
          </div>
          <div>
            <div class="flex items-center gap-1.5 flex-wrap">
              <span onclick="openUserProfile(${p.user_id})" class="font-bold text-sm text-[var(--cs-text-primary)] hover:underline cursor-pointer hover:text-[var(--cs-accent)] transition-colors" title="Click to view @${escapeHtml(p.username)}'s profile">@${escapeHtml(p.username)}</span>
              <span class="query-detail cs-badge cs-badge-accent font-mono">user_id: ${p.user_id}</span>
            </div>
            <div class="flex items-center gap-2 text-[11px] text-[var(--cs-text-tertiary)] font-mono mt-0.5">
              <span>${timeAgo(p.created_at)}</span>
              <span class="query-detail">•</span>
              <span class="query-detail">PK post_id: #${p.post_id}</span>
            </div>
          </div>
        </div>

        <!-- Follow / Delete Controls -->
        <div class="flex items-center gap-2">
          ${!isOwn ? `
            <button onclick="toggleFollow(${p.user_id})" class="cs-btn cs-btn-sm ${isFollowing ? 'cs-btn-secondary' : 'cs-btn-primary'}" title="${isFollowing ? 'Click to Unfollow (DELETE FROM Followers)' : 'Click to Follow (INSERT INTO Followers)'}">
              <i data-lucide="${isFollowing ? 'user-check' : 'user-plus'}" class="w-3.5 h-3.5"></i>
              <span>${isFollowing ? 'Following' : 'Follow'}</span>
            </button>
          ` : `
            <button onclick="handleDeletePost(${p.post_id})" class="cs-btn-ghost cs-btn-icon text-[var(--cs-text-tertiary)] hover:text-[var(--cs-error)]" title="Delete Post (Demonstrates ON DELETE CASCADE to Comments & Likes)">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          `}
        </div>
      </div>

      <!-- Post Body -->
      <p class="text-[14px] text-[var(--cs-text-primary)] leading-relaxed font-sans">${formatPostContent(p.content)}</p>

      <!-- Media / File Attachment -->
      ${p.media_url ? `
        <div class="mt-2.5">
          ${(p.file_type && p.file_type.startsWith('image/')) || /\.(png|jpe?g|gif|webp|svg)$/i.test(p.media_url) ? `
            <div class="rounded-xl overflow-hidden border border-[var(--cs-border-secondary)] bg-[var(--cs-surface-secondary)] max-h-96 flex items-center justify-center cursor-pointer group" onclick="openMediaLightbox('${escapeHtml(p.media_url)}', '${escapeHtml(p.file_name || 'Post Image')}')" title="Click to view full size">
              <img src="${escapeHtml(p.media_url)}" alt="Post image" class="max-h-96 w-full object-contain rounded-xl group-hover:scale-[1.01] transition-transform duration-200" loading="lazy" />
            </div>
          ` : `
            <a href="${escapeHtml(p.media_url)}" download="${escapeHtml(p.file_name || 'attachment')}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-3 p-3 rounded-xl bg-[var(--cs-surface-secondary)] hover:bg-[var(--cs-surface-hover)] border border-[var(--cs-border-secondary)] transition group text-left">
              <div class="w-10 h-10 rounded-lg bg-[var(--cs-surface-primary)] border border-[var(--cs-border-secondary)] flex items-center justify-center text-lg text-[var(--cs-accent)]">
                <i data-lucide="${getFileIconName(p.file_type, p.file_name)}" class="w-5 h-5"></i>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-xs font-semibold text-[var(--cs-text-primary)] group-hover:text-[var(--cs-accent)] transition truncate">${escapeHtml(p.file_name || 'Attached File')}</div>
                <div class="text-[10px] text-[var(--cs-text-tertiary)] font-mono flex items-center gap-1.5"><i data-lucide="download" class="w-3 h-3"></i> Download attachment</div>
              </div>
              <i data-lucide="external-link" class="w-3.5 h-3.5 text-[var(--cs-text-tertiary)] group-hover:text-[var(--cs-text-primary)] transition pr-1"></i>
            </a>
          `}
        </div>
      ` : ''}

      <!-- DBMS Relational Architecture Meta Chip (Query Inspection Mode) -->
      <div class="query-detail bg-[var(--cs-surface-secondary)] rounded-lg px-3 py-1.5 border border-[var(--cs-border-secondary)] font-mono text-[10px] text-[var(--cs-text-secondary)] flex items-center justify-between flex-wrap gap-1">
        <span class="text-[var(--cs-accent)] flex items-center gap-1">
          <i data-lucide="git-branch" class="w-3 h-3"></i>
          Relational Link: <code class="text-[var(--cs-warning)] font-semibold">Posts.user_id (${p.user_id})</code> ➔ <code class="text-[var(--cs-info)] font-semibold">Users.user_id (${p.user_id})</code>
        </span>
        <span class="cs-badge cs-badge-accent">ON DELETE CASCADE</span>
      </div>

      <!-- Interaction Bar -->
      <div class="flex items-center justify-between pt-2 border-t border-[var(--cs-border-secondary)] text-xs">
        <div class="flex items-center gap-2">
          <!-- Like Button -->
          <button onclick="toggleLike(${p.post_id})" class="cs-btn cs-btn-sm ${liked ? 'text-[var(--cs-error)] bg-[var(--cs-error-light)]' : 'cs-btn-ghost text-[var(--cs-text-secondary)]'}" title="${liked ? 'DELETE FROM Likes' : 'INSERT INTO Likes'}">
            <i data-lucide="heart" class="w-4 h-4 ${liked ? 'fill-current cs-like-pop' : ''}"></i>
            <span>${p.like_count || 0}</span>
          </button>

          <!-- Comment Button -->
          <button onclick="toggleComments(${p.post_id})" class="cs-btn cs-btn-ghost cs-btn-sm text-[var(--cs-text-secondary)]" title="Toggle comments drawer">
            <i data-lucide="message-circle" class="w-4 h-4"></i>
            <span>${p.comment_count || 0}</span>
          </button>
        </div>

        <button onclick="inspectPostComments(${p.post_id})" class="query-detail cs-btn cs-btn-ghost cs-btn-sm text-[var(--cs-text-tertiary)] hover:text-[var(--cs-accent)] font-mono text-xs" title="Inspect comments join query">
          <i data-lucide="code-2" class="w-3.5 h-3.5"></i>
          <span class="hidden sm:inline">Q4 Query</span>
        </button>
      </div>

      <!-- Threaded Comments Drawer -->
      <div id="comments-${p.post_id}" class="hidden pt-3 border-t border-[var(--cs-border-secondary)] space-y-3">
        <!-- New Comment Input -->
        <div class="flex items-center gap-2">
          <input id="commentInput-${p.post_id}" type="text" maxlength="300" class="cs-input flex-1 text-xs" placeholder="Write a comment (executes INSERT INTO Comments)..." onkeydown="if(event.key==='Enter')handleAddComment(${p.post_id})" />
          <button onclick="handleAddComment(${p.post_id})" class="cs-btn cs-btn-primary cs-btn-sm shrink-0">
            <i data-lucide="send" class="w-3 h-3"></i>
            <span class="hidden sm:inline">Comment</span>
          </button>
        </div>

        <!-- Comments List -->
        <div id="commentsList-${p.post_id}" class="space-y-2 pt-1">
          <div class="text-[var(--cs-text-tertiary)] text-xs font-mono py-1">Loading comments...</div>
        </div>
      </div>
    </article>`;
  }).join('');
  refreshIcons();
}

// Live composer SQL preview
function updatePostSqlPreview() {
  const input = document.getElementById('postInput');
  const codeEl = document.getElementById('postSqlCode');
  const counterEl = document.getElementById('postCharCount');
  if (!input || !codeEl) return;
  const content = input.value;
  if (counterEl) counterEl.textContent = `${content.length}/500`;
  const sanitized = content.replace(/'/g, "''");
  if (attachedFile) {
    codeEl.textContent = `INSERT INTO Posts (user_id, content, media_url, file_name, file_type)\nVALUES (${activeUserId || 1}, '${sanitized || '...'}', '/uploads/...', '${attachedFile.name.replace(/'/g, "''")}', '${attachedFile.type}');`;
  } else {
    codeEl.textContent = `INSERT INTO Posts (user_id, content)\nVALUES (${activeUserId || 1}, '${sanitized || '...'}');`;
  }
}

// ---- Create Post ----
async function handleCreatePost() {
  const input = document.getElementById('postInput');
  const content = input ? input.value.trim() : '';
  if (!content && !attachedFile) {
    showToast('Post content or file attachment required', 'warning');
    return;
  }
  if (!activeUserId) { showToast('Please log in first', 'warning'); return; }

  let media_url = null;
  let file_name = null;
  let file_type = null;

  try {
    if (attachedFile) {
      showToast('Uploading attachment...', 'info');
      const uploadRes = await api('POST', '/upload', {
        fileName: attachedFile.name,
        fileType: attachedFile.type,
        fileData: attachedFile.data
      });
      media_url = uploadRes.data.media_url;
      file_name = uploadRes.data.file_name;
      file_type = uploadRes.data.file_type;
    }

    await api('POST', '/posts', {
      user_id: activeUserId,
      content,
      media_url,
      file_name,
      file_type
    });

    if (input) input.value = '';
    attachedFile = null;
    renderAttachmentPreview();
    updatePostSqlPreview();
    showToast('Post published! (INSERT INTO Posts)', 'success');
    await loadPosts();
    await renderActiveUserCard();
    await loadTableData(currentTableTab, true);
  } catch (e) { /* handled */ }
}

// ---- Like / Unlike ----
async function toggleLike(postId) {
  if (!activeUserId) return;
  try {
    const res = await api('POST', `/posts/${postId}/like`, { user_id: activeUserId });
    const isLiked = res.data?.action === 'liked';
    showToast(isLiked ? 'Liked post (INSERT INTO Likes)' : 'Unliked post (DELETE FROM Likes)', 'success');
    await loadPosts();
    await loadTableData(currentTableTab, true);
  } catch (e) { /* handled */ }
}

// ---- Comments Drawer & Posting ----
async function toggleComments(postId) {
  const section = document.getElementById(`comments-${postId}`);
  if (!section) return;
  if (section.classList.contains('hidden')) {
    section.classList.remove('hidden');
    section.classList.add('cs-drawer-enter');
    await loadComments(postId);
  } else {
    section.classList.add('hidden');
    section.classList.remove('cs-drawer-enter');
  }
}

async function loadComments(postId) {
  try {
    const res = await api('GET', `/posts/${postId}/comments`);
    const list = document.getElementById(`commentsList-${postId}`);
    if (!list) return;
    const comments = res.data;
    if (!comments || comments.length === 0) {
      list.innerHTML = '<div class="text-[var(--cs-text-tertiary)] font-mono text-[11px] py-2 text-center bg-[var(--cs-surface-secondary)] rounded-lg">No comments on this post yet.</div>';
      return;
    }
    list.innerHTML = comments.map(c => `
      <div class="flex items-start gap-2.5 bg-[var(--cs-surface-secondary)] rounded-lg p-2.5 border border-[var(--cs-border-secondary)]">
        <div onclick="openUserProfile(${c.user_id})" class="cs-avatar cs-avatar-sm ${avatarColor(c.user_id)} cursor-pointer hover:scale-105 transition-transform" title="Click to view @${escapeHtml(c.username)}'s profile">${getInitial(c.username)}</div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span onclick="openUserProfile(${c.user_id})" class="font-bold text-xs text-[var(--cs-accent)] hover:underline cursor-pointer" title="Click to view @${escapeHtml(c.username)}'s profile">@${escapeHtml(c.username)}</span>
            <span class="text-[10px] text-[var(--cs-text-tertiary)] font-mono">${timeAgo(c.created_at)}</span>
            <span class="query-detail text-[9px] text-[var(--cs-text-tertiary)] font-mono ml-auto">c_id: ${c.comment_id}</span>
          </div>
          <p class="text-[var(--cs-text-primary)] text-xs mt-1 leading-relaxed">${escapeHtml(c.comment_text)}</p>
        </div>
      </div>
    `).join('');
    refreshIcons();
  } catch (e) { /* handled */ }
}

async function handleAddComment(postId) {
  const input = document.getElementById(`commentInput-${postId}`);
  const text = input ? input.value.trim() : '';
  if (!text) return;
  if (!activeUserId) { showToast('Please sign in first', 'warning'); return; }

  try {
    await api('POST', `/posts/${postId}/comments`, { user_id: activeUserId, comment_text: text });
    if (input) input.value = '';
    showToast('Comment added! (INSERT INTO Comments)', 'success');
    await loadComments(postId);
    await loadPosts();
    await renderActiveUserCard();
    await loadTableData(currentTableTab, true);
  } catch (e) { /* handled */ }
}

function inspectPostComments(postId) {
  runAnalyticalQuery(4, postId);
}

// ---- Follow / Unfollow ----
async function toggleFollow(targetUserId) {
  if (!activeUserId) return;
  if (targetUserId === activeUserId) { showToast("Can't follow yourself (CHECK constraint)", 'warning'); return; }

  try {
    const res = await api('POST', '/followers', { follower_id: activeUserId, following_id: targetUserId });
    const action = res.data?.action;
    showToast(action === 'followed' ? 'Now following! (INSERT INTO Followers)' : 'Unfollowed (DELETE FROM Followers)', 'success');
    await loadPosts();
    await renderActiveUserCard();
    await loadTableData(currentTableTab, true);
  } catch (e) { /* handled */ }
}

// ---- Delete Post ----
async function handleDeletePost(postId) {
  if (!confirm('DELETE this post? This will trigger DBMS ON DELETE CASCADE and remove associated likes and comments.')) return;
  try {
    await api('DELETE', `/posts/${postId}`);
    showToast('Post deleted (ON DELETE CASCADE executed)', 'success');
    await loadPosts();
    await renderActiveUserCard();
    await loadTableData(currentTableTab, true);
  } catch (e) { /* handled */ }
}

// ---- Modal: INSERT User ----
function openModal() {
  const modal = document.getElementById('userModal');
  if (modal) {
    if (typeof modal.showModal === 'function') {
      modal.showModal();
    } else {
      modal.setAttribute('open', '');
    }
    const input = document.getElementById('newUsername');
    if (input) input.focus();
    updateSqlPreview();
    refreshIcons();
  }
}

function closeModal() {
  const modal = document.getElementById('userModal');
  if (modal) {
    if (typeof modal.close === 'function') {
      modal.close();
    } else {
      modal.removeAttribute('open');
    }
    const form = document.getElementById('newUserForm');
    if (form) form.reset();
    updateSqlPreview();
  }
}

const userModalEl = document.getElementById('userModal');
if (userModalEl) {
  userModalEl.addEventListener('click', (e) => {
    const rect = userModalEl.getBoundingClientRect();
    const isInDialog = (
      rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX && e.clientX <= rect.left + rect.width
    );
    if (!isInDialog) {
      closeModal();
    }
  });
}

// ---- User Profile Modal Engine ----
async function openUserProfile(targetUserId) {
  if (!targetUserId) return;
  const modal = document.getElementById('profileModal');
  if (!modal) return;

  const currentViewerId = activeUserId || 0;

  // Initial loading state in modal
  const streamEl = document.getElementById('modalProfilePostsStream');
  if (streamEl) {
    streamEl.innerHTML = '<div class="py-6 text-center text-[var(--cs-text-tertiary)] font-mono text-xs"><i data-lucide="loader-2" class="w-4 h-4 mx-auto animate-spin mb-1"></i> Querying user profile and posts...</div>';
  }

  // Open modal natively
  if (typeof modal.showModal === 'function') {
    modal.showModal();
  } else {
    modal.setAttribute('open', '');
  }
  refreshIcons();

  try {
    // 1. Fetch user data with follower stats & follow status relative to viewer
    const userRes = await api('GET', `/users/${targetUserId}?viewer_id=${currentViewerId}`);
    const u = userRes.data;

    // 2. Fetch user's posts
    const postsRes = await api('GET', `/posts?author_id=${targetUserId}&user_id=${currentViewerId}`);
    const posts = postsRes.data || [];

    // Populate Modal Header & Identity
    const avatarEl = document.getElementById('modalProfileAvatar');
    if (avatarEl) {
      avatarEl.className = `cs-avatar cs-avatar-xl ${avatarColor(u.user_id)} ring-4 ring-[var(--cs-surface-primary)] shrink-0`;
      avatarEl.textContent = getInitial(u.username);
    }

    const titleEl = document.getElementById('modalProfileTitle');
    if (titleEl) titleEl.textContent = `@${u.username}`;

    const roleBadge = document.getElementById('modalProfileRoleBadge');
    if (roleBadge) {
      if (u.username.toLowerCase() === 'admin') {
        roleBadge.textContent = 'Administrator / DBA';
        roleBadge.className = 'cs-badge cs-badge-error font-bold';
      } else {
        roleBadge.textContent = 'Member';
        roleBadge.className = 'cs-badge cs-badge-accent';
      }
    }

    const pkBadge = document.getElementById('modalProfilePkBadge');
    if (pkBadge) pkBadge.textContent = `PK user_id: ${u.user_id}`;

    const emailEl = document.getElementById('modalProfileEmail');
    if (emailEl) emailEl.textContent = `${u.email} • user_id: ${u.user_id}`;

    const bioEl = document.getElementById('modalProfileBio');
    if (bioEl) bioEl.textContent = u.bio || 'ConnectSphere explorer and community member.';

    const joinedEl = document.getElementById('modalProfileJoined');
    if (joinedEl) joinedEl.textContent = `Member since ${timeAgo(u.created_at)}`;

    const postsCountEl = document.getElementById('modalProfilePostsCount');
    if (postsCountEl) postsCountEl.textContent = u.post_count ?? u.posts_count ?? posts.length;

    const followersCountEl = document.getElementById('modalProfileFollowersCount');
    if (followersCountEl) followersCountEl.textContent = u.follower_count ?? u.followers_count ?? 0;

    const followingCountEl = document.getElementById('modalProfileFollowingCount');
    if (followingCountEl) followingCountEl.textContent = u.following_count ?? 0;

    // Profile SQL query preview
    const sqlCodeEl = document.getElementById('modalProfileSqlCode');
    if (sqlCodeEl) {
      sqlCodeEl.textContent = `${userRes.query || `SELECT * FROM Users WHERE user_id = ${u.user_id};`}\n\n${postsRes.query || `SELECT * FROM Posts WHERE user_id = ${u.user_id};`}`;
    }

    // Follow / Action Button
    const actionContainer = document.getElementById('modalProfileActionContainer');
    if (actionContainer) {
      const isOwnProfile = Number(u.user_id) === Number(activeUserId);
      if (isOwnProfile) {
        actionContainer.innerHTML = `
          <span class="cs-badge cs-badge-muted py-1.5 px-3 flex items-center gap-1.5">
            <i data-lucide="user-check" class="w-3.5 h-3.5 text-[var(--cs-accent)]"></i>
            <span>Your Profile</span>
          </span>`;
      } else {
        const isFollowing = Boolean(u.is_following);
        actionContainer.innerHTML = `
          <button onclick="handleProfileFollowToggle(${u.user_id})" class="cs-btn cs-btn-sm ${isFollowing ? 'cs-btn-secondary' : 'cs-btn-primary'}">
            <i data-lucide="${isFollowing ? 'user-check' : 'user-plus'}" class="w-3.5 h-3.5"></i>
            <span>${isFollowing ? 'Following' : 'Follow'}</span>
          </button>`;
      }
    }

    // Render User Posts Stream inside Modal
    const totalBadge = document.getElementById('modalProfilePostsTotalBadge');
    if (totalBadge) totalBadge.textContent = `${posts.length} post${posts.length !== 1 ? 's' : ''}`;

    if (streamEl) {
      if (posts.length === 0) {
        streamEl.innerHTML = '<div class="text-[var(--cs-text-tertiary)] font-mono text-xs py-6 text-center bg-[var(--cs-surface-secondary)] rounded-lg">No posts published yet.</div>';
      } else {
        streamEl.innerHTML = posts.map(p => {
          const liked = Boolean(p.user_liked || p.liked_by_user);
          return `
            <div class="p-3 bg-[var(--cs-surface-secondary)] border border-[var(--cs-border-secondary)] rounded-lg space-y-1.5">
              <div class="flex items-center justify-between text-xs text-[var(--cs-text-tertiary)] font-mono">
                <span>${timeAgo(p.created_at)}</span>
                <span class="query-detail text-[10px]">PK post_id: #${p.post_id}</span>
              </div>
              <p class="text-xs text-[var(--cs-text-primary)] font-sans leading-relaxed">${formatPostContent(p.content)}</p>
              ${p.media_url ? `
                <div class="mt-2">
                  ${(p.file_type && p.file_type.startsWith('image/')) || /\.(png|jpe?g|gif|webp|svg)$/i.test(p.media_url) ? `
                    <div class="rounded-lg overflow-hidden border border-[var(--cs-border-secondary)] bg-[var(--cs-surface-primary)] max-h-48 flex items-center justify-center cursor-pointer group" onclick="openMediaLightbox('${escapeHtml(p.media_url)}', '${escapeHtml(p.file_name || 'Post Image')}')">
                      <img src="${escapeHtml(p.media_url)}" alt="Post image" class="max-h-48 w-full object-cover rounded-lg group-hover:scale-[1.01] transition-transform duration-200" loading="lazy" />
                    </div>
                  ` : `
                    <a href="${escapeHtml(p.media_url)}" download="${escapeHtml(p.file_name || 'attachment')}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2.5 p-2 rounded-lg bg-[var(--cs-surface-primary)] border border-[var(--cs-border-secondary)] hover:border-[var(--cs-border-primary)] transition group text-left">
                      <div class="w-8 h-8 rounded-lg bg-[var(--cs-surface-secondary)] flex items-center justify-center text-[var(--cs-accent)]">
                        <i data-lucide="${getFileIconName(p.file_type, p.file_name)}" class="w-4 h-4"></i>
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="text-[11px] font-semibold text-[var(--cs-text-primary)] group-hover:text-[var(--cs-accent)] transition truncate">${escapeHtml(p.file_name || 'Attached File')}</div>
                        <div class="text-[9px] text-[var(--cs-text-tertiary)] font-mono">Download</div>
                      </div>
                    </a>
                  `}
                </div>
              ` : ''}
              <div class="flex items-center gap-4 text-xs pt-1 border-t border-[var(--cs-border-secondary)] font-mono text-[var(--cs-text-tertiary)]">
                <span class="flex items-center gap-1 ${liked ? 'text-[var(--cs-error)]' : ''}">
                  <i data-lucide="heart" class="w-3.5 h-3.5 ${liked ? 'fill-current' : ''}"></i>
                  <span>${p.like_count || 0}</span>
                </span>
                <span class="flex items-center gap-1">
                  <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
                  <span>${p.comment_count || 0}</span>
                </span>
              </div>
            </div>`;
        }).join('');
      }
    }
    refreshIcons();
  } catch (err) {
    if (streamEl) {
      streamEl.innerHTML = '<div class="text-[var(--cs-error)] font-mono text-xs py-4 text-center">Failed to load user profile.</div>';
    }
  }
}

async function handleProfileFollowToggle(targetUserId) {
  if (!activeUserId) {
    showToast('Please log in first', 'warning');
    return;
  }
  await toggleFollow(targetUserId);
  await openUserProfile(targetUserId);
}

function closeProfileModal() {
  const modal = document.getElementById('profileModal');
  if (modal) {
    if (typeof modal.close === 'function') {
      modal.close();
    } else {
      modal.removeAttribute('open');
    }
  }
}

const profileModalEl = document.getElementById('profileModal');
if (profileModalEl) {
  profileModalEl.addEventListener('click', (e) => {
    const rect = profileModalEl.getBoundingClientRect();
    const isInDialog = (
      rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX && e.clientX <= rect.left + rect.width
    );
    if (!isInDialog) {
      closeProfileModal();
    }
  });
}

function updateSqlPreview() {
  const u = document.getElementById('newUsername');
  const e = document.getElementById('newEmail');
  const b = document.getElementById('newBio');
  const preview = document.getElementById('sqlPreview');
  if (!preview) return;

  const username = u ? u.value.trim() : 'username';
  const email = e ? e.value.trim() : 'email@example.com';
  const bio = b ? b.value.trim() : 'bio';

  preview.textContent = `INSERT INTO Users (username, email, bio)\nVALUES ('${username}', '${email}', '${bio}');`;
}

async function handleCreateUser(e) {
  e.preventDefault();
  const username = document.getElementById('newUsername').value.trim();
  const email = document.getElementById('newEmail').value.trim();
  const bio = document.getElementById('newBio').value.trim();

  if (!username || !email) { showToast('Username and email are required', 'warning'); return; }

  try {
    const res = await api('POST', '/users', { username, email, bio });
    showToast(`User @${username} registered! (INSERT INTO Users)`, 'success');
    closeModal();
    await loadUsers();
    renderLoginAccounts();
    // Auto-enter as this new user
    if (res.data?.user_id) {
      await enterAppSession(res.data.user_id);
    }
  } catch (e) { /* handled */ }
}

// ---- Feed Filter Tabs ----
function setFeedFilter(filter) {
  currentFeedFilter = filter;
  ['all', 'following', 'my'].forEach(f => {
    const btn = document.getElementById(`filter${f.charAt(0).toUpperCase() + f.slice(1)}`);
    if (btn) {
      if (f === filter) {
        btn.className = 'px-3 py-1.5 rounded text-xs font-semibold transition bg-[var(--cs-surface-primary)] text-[var(--cs-text-primary)] shadow-sm';
      } else {
        btn.className = 'px-3 py-1.5 rounded text-xs font-medium transition text-[var(--cs-text-tertiary)] hover:text-[var(--cs-text-primary)]';
      }
    }
  });
  renderFeedSkeleton(2);
  loadPosts();
}

// ---- Layout Switcher ----
function setLayout(layout) {
  currentLayout = layout;
  const main = document.getElementById('appScreen');
  const feed = document.getElementById('colFeed');
  const inspector = document.getElementById('colInspector');

  ['Split', 'Feed', 'Inspector'].forEach(l => {
    const btn = document.getElementById(`layout${l}`);
    if (btn) btn.className = 'w-7 h-7 flex items-center justify-center rounded text-xs transition text-[var(--cs-text-tertiary)] hover:text-[var(--cs-text-primary)]';
  });

  if (layout === 'split') {
    const splitBtn = document.getElementById('layoutSplit');
    if (splitBtn) splitBtn.className = 'w-7 h-7 flex items-center justify-center rounded text-xs transition bg-[var(--cs-surface-primary)] text-[var(--cs-text-primary)] shadow-sm';
    if (main) main.className = 'max-w-7xl mx-auto p-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-6 cs-layout-transition';
    if (feed) feed.className = 'lg:col-span-7 space-y-5';
    if (inspector) inspector.className = 'lg:col-span-5 space-y-5';
    if (feed) feed.classList.remove('hidden');
    if (inspector) inspector.classList.remove('hidden');
  } else if (layout === 'feed') {
    const feedBtn = document.getElementById('layoutFeed');
    if (feedBtn) feedBtn.className = 'w-7 h-7 flex items-center justify-center rounded text-xs transition bg-[var(--cs-surface-primary)] text-[var(--cs-text-primary)] shadow-sm';
    if (main) main.className = 'max-w-4xl mx-auto p-4 sm:px-6 grid grid-cols-1 gap-6 cs-layout-transition';
    if (feed) feed.className = 'col-span-1 space-y-5';
    if (feed) feed.classList.remove('hidden');
    if (inspector) inspector.classList.add('hidden');
  } else {
    const insBtn = document.getElementById('layoutInspector');
    if (insBtn) insBtn.className = 'w-7 h-7 flex items-center justify-center rounded text-xs transition bg-[var(--cs-surface-primary)] text-[var(--cs-text-primary)] shadow-sm';
    if (main) main.className = 'max-w-5xl mx-auto p-4 sm:px-6 grid grid-cols-1 gap-6 cs-layout-transition';
    if (inspector) inspector.className = 'col-span-1 space-y-5';
    if (feed) feed.classList.add('hidden');
    if (inspector) inspector.classList.remove('hidden');
  }
  refreshIcons();
}

// ---- Database Tables Explorer ----
function setTableTab(tab) {
  currentTableTab = tab;
  const tabs = ['users', 'posts', 'comments', 'likes', 'followers'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (btn) {
      if (t === tab) {
        btn.className = 'cs-tab cs-tab-active';
      } else {
        btn.className = 'cs-tab';
      }
    }
  });
  loadTableData(tab);
}

async function loadTableData(table = currentTableTab, silent = false) {
  const container = document.getElementById('tableContent');
  if (!silent && container) {
    container.innerHTML = '<div class="p-6 text-center text-[var(--cs-text-tertiary)] text-xs font-mono"><i data-lucide="loader-2" class="w-4 h-4 mx-auto animate-spin mb-1"></i> Querying table data...</div>';
    refreshIcons();
  }

  try {
    const res = await api('GET', `/tables/${table}`, null, silent);
    renderTable(res.data || [], table);
  } catch (e) {
    if (!silent && container) {
      container.innerHTML = '<div class="p-6 text-center text-[var(--cs-error)] text-xs font-mono">Failed to load table data</div>';
    }
  }
}

function refreshCurrentTable() {
  loadTableData(currentTableTab);
  showToast('Table synchronized with database', 'info');
}

function renderTable(data, tableName) {
  const container = document.getElementById('tableContent');
  if (!container) return;
  if (!data || data.length === 0) {
    container.innerHTML = `<div class="p-6 text-center text-[var(--cs-text-tertiary)] font-mono text-xs">Table '${tableName}' is empty (0 rows).</div>`;
    return;
  }

  const columns = Object.keys(data[0]);

  // Primary and Foreign Key badge helper
  const getColBadge = (c, tbl) => {
    const t = (tbl || '').toLowerCase();
    if (c === 'user_id' && t === 'users') return '<span class="text-[9px] bg-amber-500/20 text-amber-500 px-1 py-0.2 rounded ml-1 font-mono font-bold">PK</span>';
    if (c === 'post_id' && t === 'posts') return '<span class="text-[9px] bg-amber-500/20 text-amber-500 px-1 py-0.2 rounded ml-1 font-mono font-bold">PK</span>';
    if (c === 'comment_id' && t === 'comments') return '<span class="text-[9px] bg-amber-500/20 text-amber-500 px-1 py-0.2 rounded ml-1 font-mono font-bold">PK</span>';
    if (c === 'like_id' && t === 'likes') return '<span class="text-[9px] bg-amber-500/20 text-amber-500 px-1 py-0.2 rounded ml-1 font-mono font-bold">PK</span>';
    if (c === 'id' && t === 'followers') return '<span class="text-[9px] bg-amber-500/20 text-amber-500 px-1 py-0.2 rounded ml-1 font-mono font-bold">PK</span>';

    if (c === 'user_id' || c === 'post_id' || c === 'follower_id' || c === 'following_id') {
      return '<span class="text-[9px] bg-blue-500/20 text-blue-500 px-1 py-0.2 rounded ml-1 font-mono font-bold">FK</span>';
    }
    return '';
  };

  const headerRow = columns.map(c =>
    `<th class="px-3 py-2 text-left text-[11px] font-semibold text-[var(--cs-text-secondary)] uppercase tracking-wider bg-[var(--cs-surface-secondary)] border-b border-[var(--cs-border-primary)]">${escapeHtml(c)}${getColBadge(c, tableName)}</th>`
  ).join('');

  const bodyRows = data.map((row) =>
    `<tr class="border-b border-[var(--cs-border-secondary)] hover:bg-[var(--cs-surface-hover)] transition">${columns.map(c => {
      let val = row[c];
      if (val === null || val === undefined) {
        val = '<span class="text-[var(--cs-text-tertiary)] font-mono italic">NULL</span>';
      } else {
        const isDateCol = c.endsWith('_at') || c.endsWith('_date');
        if (isDateCol && typeof val === 'string' && val.length >= 10) {
          const d = new Date(val.replace(' ', 'T'));
          if (!isNaN(d.getTime())) {
            val = `<span class="text-[var(--cs-text-secondary)] font-mono text-[11px]">${d.toLocaleString()}</span>`;
          } else {
            val = escapeHtml(String(val));
          }
        } else if (c === 'username' && row.user_id) {
          val = `<span onclick="openUserProfile(${row.user_id})" class="text-[var(--cs-accent)] font-semibold cursor-pointer hover:underline" title="View profile">@${escapeHtml(String(val))}</span>`;
        } else {
          val = escapeHtml(String(val));
        }
      }
      return `<td class="px-3 py-2 text-xs text-[var(--cs-text-primary)] font-mono max-w-[240px] truncate">${val}</td>`;
    }).join('')}</tr>`
  ).join('');

  container.innerHTML = `
    <table class="cs-table w-full text-left font-mono text-xs border-collapse">
      <thead class="sticky top-0 z-10"><tr>${headerRow}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
    <div class="px-3 py-2 text-[10px] text-[var(--cs-text-tertiary)] border-t border-[var(--cs-border-secondary)] bg-[var(--cs-surface-secondary)] flex items-center justify-between font-mono">
      <span>${data.length} row${data.length !== 1 ? 's' : ''} in table</span>
      <span><span class="text-amber-500 font-bold">PK</span> = Primary Key, <span class="text-blue-500 font-bold">FK</span> = Foreign Key</span>
    </div>
  `;
  refreshIcons();
}

// ---- Analytical Queries (DBMS Lab) ----
const analyticsEndpoints = {
  1: { path: '/analytics/newsfeed', title: 'Q1: Newsfeed — Multi-table JOIN' },
  2: { path: '/analytics/top-liked', title: 'Q2: Top Liked Posts — LEFT JOIN + GROUP BY' },
  3: { path: '/analytics/most-followed', title: 'Q3: Most Followed Users — Subquery' },
  4: { path: `/analytics/post-comments/1`, title: 'Q4: Post Comments — JOIN with Users' },
  5: { path: '/analytics/engagement', title: 'Q5: User Engagement — Aggregate View' },
};

async function runAnalyticalQuery(num, dynamicId = null) {
  let info = analyticsEndpoints[num];
  if (!info) return;

  let requestPath = info.path;
  if (num === 4 && dynamicId) {
    requestPath = `/analytics/post-comments/${dynamicId}`;
  }

  const resultPanel = document.getElementById('analyticsResult');
  const resultTitle = document.getElementById('analyticsResultTitle');
  const resultBody = document.getElementById('analyticsResultBody');
  if (!resultPanel) return;

  resultPanel.classList.remove('hidden');
  resultTitle.textContent = info.title;
  resultBody.innerHTML = '<div class="text-[var(--cs-text-tertiary)] font-mono text-xs py-3 text-center"><i data-lucide="loader-2" class="w-4 h-4 mx-auto animate-spin mb-1"></i> Executing query...</div>';
  refreshIcons();

  try {
    const res = await api('GET', requestPath);
    const data = res.data;

    if (!data || data.length === 0) {
      resultBody.innerHTML = '<div class="text-[var(--cs-text-tertiary)] font-mono text-xs py-2 text-center">0 rows returned.</div>';
      return;
    }

    const columns = Object.keys(data[0]);
    const headerRow = columns.map(c =>
      `<th class="px-2.5 py-1.5 text-left text-[10px] font-semibold text-[var(--cs-accent)] uppercase tracking-wider border-b border-[var(--cs-border-secondary)] bg-[var(--cs-surface-secondary)]">${escapeHtml(c)}</th>`
    ).join('');

    const bodyRows = data.map((row) =>
      `<tr class="border-b border-[var(--cs-border-secondary)] hover:bg-[var(--cs-surface-hover)]">${columns.map(c => {
        let val = row[c];
        if (val === null || val === undefined) val = '<span class="text-[var(--cs-text-tertiary)]">NULL</span>';
        else val = escapeHtml(String(val));
        return `<td class="px-2.5 py-1.5 text-xs text-[var(--cs-text-primary)] font-mono">${val}</td>`;
      }).join('')}</tr>`
    ).join('');

    resultBody.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-left font-mono text-xs border-collapse">
          <thead><tr>${headerRow}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>
      <div class="mt-2 text-[10px] text-[var(--cs-text-tertiary)] font-mono text-right">${data.length} row${data.length !== 1 ? 's' : ''} returned</div>
    `;

    showToast(`${info.title} executed`, 'success');
    refreshIcons();
  } catch (e) {
    resultBody.innerHTML = '<div class="text-[var(--cs-error)] font-mono text-xs py-2 text-center">Query execution failed.</div>';
  }
}

function closeAnalyticsResult() {
  const panel = document.getElementById('analyticsResult');
  if (panel) panel.classList.add('hidden');
}

// ---- Reset Database ----
async function handleResetDB() {
  if (!confirm('Reset the database to initial seeds? Custom data will be wiped.')) return;
  try {
    await api('POST', '/reset');
    showToast('Database reset to initial state!', 'success');
    await loadUsers();
    renderLoginAccounts();
    showLoginScreen();
  } catch (e) { /* handled */ }
}

// ---- Load Users ----
async function loadUsers() {
  try {
    const res = await api('GET', '/users', null, true);
    users = res.data || [];
  } catch (e) {
    users = [];
  }
}

// ---- THEME ENGINE (Modern Web Guidance Compliant) ----

function getCurrentTheme() {
  try {
    const saved = localStorage.getItem('connectsphere_theme');
    if (saved) return saved;
  } catch (_) {}
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme) {
  const isLight = theme === 'light';
  const meta = document.querySelector('meta[name="color-scheme"]');
  if (meta) meta.content = theme;

  if (isLight) {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  }

  updateThemeToggleButton(theme);
  syncSplineTheme(theme);
  refreshIcons();
}

function updateThemeToggleButton(theme) {
  const btn = document.getElementById('themeToggleBtn');
  const icon = document.getElementById('themeToggleIcon');
  const label = document.getElementById('themeToggleLabel');
  if (!btn || !icon) return;

  const isLight = theme === 'light';
  if (isLight) {
    icon.setAttribute('data-lucide', 'moon');
    btn.title = 'Switch to Dark Theme';
    btn.setAttribute('aria-label', 'Switch to Dark Theme');
    if (label) label.textContent = 'Light';
  } else {
    icon.setAttribute('data-lucide', 'sun');
    btn.title = 'Switch to Light Theme';
    btn.setAttribute('aria-label', 'Switch to Light Theme');
    if (label) label.textContent = 'Dark';
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  const next = isDark ? 'light' : 'dark';
  try {
    localStorage.setItem('connectsphere_theme', next);
  } catch (_) {}
  applyTheme(next);
  showToast(next === 'light' ? 'Switched to Light Theme' : 'Switched to Dark Theme', 'info');
}

// ---- Spline 3D Interactive Mascot ----
let splineApp = null;
let splineLoaded = false;
let speechTimeout = null;
let greetingIdx = 0;

const splineGreetings = [
  "🤖 ConnectSphere DBMS Mascot ready!",
  "⚡ Relational indexing active!",
  "🔍 Tracking cursor coordinates in real time!",
  "🚀 Normalized to Boyce-Codd Normal Form!",
  "✨ Click me anytime to say hello!"
];

function debounce(fn, ms) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

async function initSpline3D() {
  const container = document.getElementById('splineContainer');
  const canvas = document.getElementById('splineCanvas');
  const loader = document.getElementById('splineLoader');
  const fallback = document.getElementById('splineFallback');
  if (!canvas) return;

  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  try {
    const { Application } = await import('https://unpkg.com/@splinetool/runtime@2.0.183/build/runtime.js');
    splineApp = new Application(canvas);
    window.splineApp = splineApp;

    await splineApp.load('./assets/scene.splinecode');
    splineLoaded = true;
    window.splineLoaded = true;

    // Set transparent background for seamless integration with light and dark mode
    splineApp.setBackgroundColor('transparent');

    // Global cursor tracking so the robot head actively follows pointer across the entire landing page
    if (!prefersReducedMotion && typeof splineApp.setGlobalEvents === 'function') {
      splineApp.setGlobalEvents(true);
    }

    // Synchronize initial theme
    const isDark = document.documentElement.classList.contains('dark');
    syncSplineTheme(isDark ? 'dark' : 'light');

    // Reveal canvas smoothly
    canvas.style.opacity = '1';
    canvas.classList.remove('opacity-0');
    canvas.classList.add('opacity-100');
    if (loader) {
      loader.classList.add('opacity-0', 'pointer-events-none');
      setTimeout(() => loader.remove(), 400);
    }

    // Touch & Click Interactions
    canvas.addEventListener('click', handleSplineClick);
    canvas.addEventListener('touchend', handleSplineClick);

    // Responsive Canvas Resize
    window.addEventListener('resize', debounce(() => {
      if (splineApp && typeof splineApp.setSize === 'function' && container) {
        const rect = container.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          splineApp.setSize(rect.width, rect.height);
        }
      }
    }, 150));

  } catch (err) {
    console.warn('Spline 3D initialization failed, activating graceful fallback:', err);
    if (loader) loader.classList.add('hidden');
    if (fallback) fallback.classList.remove('hidden');
  }
}

function syncSplineTheme(theme) {
  if (!splineApp) return;
  const isDark = theme === 'dark';
  try {
    splineApp.setBackgroundColor('transparent');
    if (splineApp._scene) {
      splineApp._scene.traverse(obj => {
        if (obj.isLight && obj.type === 'HemisphereLight') {
          obj.intensity = isDark ? 2.35 : 3.1;
        }
      });
    }
  } catch (_) {}
}

function handleSplineClick() {
  const bubble = document.getElementById('splineSpeechBubble');
  const textEl = document.getElementById('splineSpeechText');
  if (!bubble || !textEl) return;

  textEl.textContent = splineGreetings[greetingIdx % splineGreetings.length];
  greetingIdx++;

  bubble.classList.remove('opacity-0', 'scale-95');
  bubble.classList.add('opacity-100', 'scale-100');

  clearTimeout(speechTimeout);
  speechTimeout = setTimeout(() => {
    bubble.classList.remove('opacity-100', 'scale-100');
    bubble.classList.add('opacity-0', 'scale-95');
  }, 2600);
}

// Sync across multiple browser tabs
window.addEventListener('storage', (e) => {
  if (e.key === 'connectsphere_theme' && e.newValue) {
    applyTheme(e.newValue);
  }
});

// ---- Initialize App ----
async function init() {
  try {
    // Apply initial theme
    applyTheme(getCurrentTheme());

    // Immediately initialize 3D interactive mascot on landing page
    initSpline3D();

    const postInput = document.getElementById('postInput');
    if (postInput) {
      postInput.addEventListener('input', updatePostSqlPreview);
    }

    // Initialize Scroll Reveal IntersectionObserver for Landing Page
    if ('IntersectionObserver' in window) {
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.02, rootMargin: '0px 0px 100px 0px' });

      document.querySelectorAll('.landing-reveal').forEach(el => revealObserver.observe(el));
    } else {
      document.querySelectorAll('.landing-reveal').forEach(el => el.classList.add('visible'));
    }

    try {
      await loadUsers();
      renderLoginAccounts();
      updateLoginSqlPreview();
    } catch (_) {}

    // Check if user session already exists in sessionStorage
    const savedUserId = sessionStorage.getItem('connectsphere_active_user');
    if (savedUserId && users.some(u => String(u.user_id) === String(savedUserId))) {
      await enterAppSession(Number(savedUserId));
    } else {
      showLandingPage();
    }

    // Background Auto-Sync: keep active table live every 3.5s (only if admin or queries are open)
    setInterval(async () => {
      if (document.hidden || !activeUserId) return;
      if (!isAdmin && !showQueries) return;
      try {
        const res = await fetch(`/api/tables/${currentTableTab}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            renderTable(json.data, currentTableTab);
          }
        }
      } catch (_) {}
    }, 3500);

    refreshIcons();
  } catch (e) {
    showToast('Failed to initialize app. Is the server running?', 'error');
  }
}

// Start
init();
