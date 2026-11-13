// ConnectSphere — Social Media Platform & DBMS Engine
// Frontend Application Logic v2.1 — Authentication & Perspective Mode
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

// ---- API Helper ----
async function api(method, path, body = null) {
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
      showToast(errMsg, 'error');
      if (json.query) logSql(json.query, json.params);
      throw new Error(errMsg);
    }
    // Real-time SQL query logging from backend response
    if (json.query) logSql(json.query, json.params);
    return json;
  } catch (err) {
    if (err.message && !err.message.startsWith('HTTP')) {
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
    SELECT: 'badge-select',
    INSERT: 'badge-insert',
    DELETE: 'badge-delete',
    UPDATE: 'badge-update',
  };
  return map[type] || 'badge-select';
}

function logSql(query, params) {
  const type = detectQueryType(query);
  const time = new Date().toLocaleTimeString();
  const entry = { type, query, params: params || [], time };
  sqlLogEntries.push(entry);

  const terminal = document.getElementById('sqlLogTerminal');
  if (!terminal) return;

  const placeholder = terminal.querySelector('.text-slate-500');
  if (placeholder && placeholder.textContent.includes('Initialized')) {
    placeholder.remove();
  }

  const div = document.createElement('div');
  div.className = 'sql-entry sql-entry-new rounded-xl p-2.5 bg-slate-900/80 border border-slate-800/80';
  div.innerHTML = `
    <div class="flex items-center justify-between text-[10px] font-mono mb-1.5">
      <div class="flex items-center gap-1.5">
        <span class="${badgeClass(type)} px-2 py-0.5 rounded-md font-bold">${type}</span>
        <span class="text-indigo-300 font-semibold">Engine Result</span>
      </div>
      <span class="text-slate-500">${time}</span>
    </div>
    <div class="text-emerald-400 text-xs font-mono leading-relaxed whitespace-pre-wrap break-all">${escapeHtml(query)}</div>
    ${params && params.length ? `<div class="text-slate-400 text-[10px] font-mono mt-1.5 pt-1 border-t border-slate-800/60">Bound Parameters: [${params.map(p => typeof p === 'string' ? `'${escapeHtml(p)}'` : p).join(', ')}]</div>` : ''}
  `;
  terminal.prepend(div);

  const countBadge = document.getElementById('queryCount');
  if (countBadge) countBadge.textContent = `${sqlLogEntries.length} queries`;
}

function clearSqlLogs() {
  sqlLogEntries = [];
  const terminal = document.getElementById('sqlLogTerminal');
  if (terminal) {
    terminal.innerHTML = `
      <div class="text-slate-500 flex items-center gap-2 text-xs font-mono">
        <span class="terminal-cursor text-emerald-400">▋</span>
        <span>Query logs cleared. Ready for next DDL/DML operation...</span>
      </div>
    `;
  }
  const countBadge = document.getElementById('queryCount');
  if (countBadge) countBadge.textContent = '0 queries';
  showToast('SQL log cleared', 'info');
}

// ---- Toast Notifications ----
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const colors = {
    success: 'bg-emerald-600/90 border-emerald-500 text-white',
    error: 'bg-rose-600/90 border-rose-500 text-white',
    info: 'bg-indigo-600/90 border-indigo-500 text-white',
    warning: 'bg-amber-600/90 border-amber-500 text-white',
  };
  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-exclamation',
    info: 'fa-circle-info',
    warning: 'fa-triangle-exclamation',
  };

  const toast = document.createElement('div');
  toast.className = `pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl text-xs font-medium ${colors[type] || colors.info} toast-enter`;
  toast.innerHTML = `
    <i class="fa-solid ${icons[type] || icons.info} text-sm"></i>
    <span class="flex-1">${escapeHtml(message)}</span>
    <button onclick="this.parentElement.remove()" class="text-white/60 hover:text-white ml-1">
      <i class="fa-solid fa-xmark text-xs"></i>
    </button>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove('toast-enter');
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 250);
  }, 3200);
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

function getFileIconClass(fileType, fileName) {
  const type = (fileType || '').toLowerCase();
  const ext = (fileName || '').split('.').pop().toLowerCase();
  if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'fa-solid fa-file-image text-emerald-400';
  if (type.includes('pdf') || ext === 'pdf') return 'fa-solid fa-file-pdf text-rose-400';
  if (['doc', 'docx'].includes(ext) || type.includes('word')) return 'fa-solid fa-file-word text-blue-400';
  if (['xls', 'xlsx', 'csv'].includes(ext) || type.includes('excel') || type.includes('spreadsheet')) return 'fa-solid fa-file-excel text-emerald-400';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'fa-solid fa-file-zipper text-amber-400';
  if (['js', 'ts', 'py', 'java', 'c', 'cpp', 'html', 'css', 'json', 'sql'].includes(ext)) return 'fa-solid fa-file-code text-indigo-400';
  return 'fa-solid fa-file-lines text-slate-400';
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
      <div class="relative inline-block rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 mt-1 max-w-sm shadow-md">
        <img src="${attachedFile.data}" alt="Preview" class="max-h-48 w-full object-cover rounded-lg" />
        <button type="button" onclick="removeAttachedFile()" class="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white flex items-center justify-center transition shadow-md" title="Remove image">
          <i class="fa-solid fa-xmark text-xs"></i>
        </button>
        <div class="px-2.5 py-1 text-[11px] text-slate-300 font-mono flex items-center justify-between bg-slate-900/90 border-t border-slate-800">
          <span class="truncate max-w-[200px]">${escapeHtml(attachedFile.name)}</span>
          <span class="text-slate-500">${formatBytes(attachedFile.size)}</span>
        </div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 mt-1 max-w-md shadow-md">
        <div class="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-lg">
          <i class="${getFileIconClass(attachedFile.type, attachedFile.name)}"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-xs font-semibold text-slate-200 truncate">${escapeHtml(attachedFile.name)}</div>
          <div class="text-[10px] text-slate-500 font-mono">${formatBytes(attachedFile.size)}</div>
        </div>
        <button type="button" onclick="removeAttachedFile()" class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-rose-600/30 text-slate-400 hover:text-rose-300 flex items-center justify-center transition" title="Remove file">
          <i class="fa-solid fa-xmark text-xs"></i>
        </button>
      </div>
    `;
  }
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
  return escaped.replace(/#([a-zA-Z0-9_]+)/g, '<span class="hashtag-pill">#$1</span>');
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

const avatarColors = [
  'bg-gradient-to-tr from-blue-600 to-indigo-600',
  'bg-gradient-to-tr from-emerald-600 to-teal-600',
  'bg-gradient-to-tr from-purple-600 to-pink-600',
  'bg-gradient-to-tr from-amber-600 to-orange-600',
  'bg-gradient-to-tr from-cyan-600 to-blue-600',
  'bg-gradient-to-tr from-rose-600 to-red-600',
];

function avatarColor(id) {
  return avatarColors[(id - 1) % avatarColors.length];
}

// ---- AUTHENTICATION & LOGIN WORKFLOW ----

function showLoginScreen() {
  activeUserId = null;
  activeUser = null;
  isAdmin = false;
  showQueries = false;
  document.body.classList.remove('show-queries', 'is-admin');
  sessionStorage.removeItem('connectsphere_active_user');

  const loginScreen = document.getElementById('loginScreen');
  const appScreen = document.getElementById('appScreen');
  const navSession = document.getElementById('navSessionContainer');
  const adminControls = document.getElementById('adminHeaderControls');

  if (loginScreen) loginScreen.classList.remove('hidden');
  if (appScreen) appScreen.classList.add('hidden');
  if (navSession) navSession.classList.add('hidden');
  if (adminControls) adminControls.classList.add('hidden');

  renderLoginAccounts();
  updateLoginSqlPreview();
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

  const loginScreen = document.getElementById('loginScreen');
  const appScreen = document.getElementById('appScreen');
  const navSession = document.getElementById('navSessionContainer');
  const adminControls = document.getElementById('adminHeaderControls');

  if (loginScreen) loginScreen.classList.add('hidden');
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
      roleEl.className = 'text-[9px] px-1.5 py-0.5 rounded font-mono font-bold admin-pill';
    } else {
      roleEl.textContent = 'User View';
      roleEl.className = 'text-[9px] text-slate-400 font-mono hidden md:inline';
    }
  }

  const avatarEl = document.getElementById('navUserAvatar');
  if (avatarEl && activeUser) {
    avatarEl.className = `w-5 h-5 rounded-full ${isAdmin ? 'bg-rose-600' : avatarColor(activeUser.user_id)} flex items-center justify-center text-[10px] font-bold text-white shrink-0`;
    avatarEl.textContent = isAdmin ? '🛡️' : getInitial(activeUser.username);
  }

  updateQueryToggleButton();

  // Layout mode:
  // Admin opens in Split View by default (Social feed + DB Inspector side by side)
  // Regular users open in Feed View by default (Clean social media feed centered)
  if (isAdmin) {
    setLayout('split');
  } else {
    setLayout('feed');
  }

  await renderActiveUserCard();
  await loadPosts();
  if (isAdmin || showQueries) {
    await loadTableData(currentTableTab, true);
  }
  updatePostSqlPreview();
}

function toggleQueryView() {
  showQueries = !showQueries;
  if (showQueries) {
    document.body.classList.add('show-queries');
    showToast('Query Inspection Mode Enabled (SQL details revealed)', 'info');
    setLayout('split');
    loadTableData(currentTableTab, true);
  } else {
    document.body.classList.remove('show-queries');
    showToast('Social Media Mode Enabled (Query details hidden)', 'info');
    if (!isAdmin) {
      setLayout('feed');
    }
  }
  updateQueryToggleButton();
}

function updateQueryToggleButton() {
  const btn = document.getElementById('btnToggleQueryView');
  const icon = document.getElementById('queryViewIcon');
  const label = document.getElementById('queryViewLabel');
  if (!btn || !label) return;

  if (showQueries) {
    btn.className = 'flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition';
    label.textContent = 'Hide Queries';
    if (icon) icon.className = 'fa-solid fa-code text-white';
  } else {
    btn.className = 'flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700/90 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold transition';
    label.textContent = 'Show Queries';
    if (icon) icon.className = 'fa-solid fa-code text-indigo-400';
  }
}

function renderLoginAccounts() {
  const grid = document.getElementById('loginAccountsGrid');
  if (!grid) return;

  // Filter out admin so admin must be typed manually
  const regularUsers = users.filter(u => u.username.toLowerCase() !== 'admin');

  grid.innerHTML = regularUsers.map(u => `
    <button type="button" onclick="selectLoginAccount('${escapeHtml(u.username)}')" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 text-xs text-slate-300 hover:text-white transition shadow-sm group">
      <span class="w-5 h-5 rounded-full ${avatarColor(u.user_id)} text-white flex items-center justify-center text-[10px] font-bold group-hover:scale-105 transition-transform">${getInitial(u.username)}</span>
      <span class="font-medium">@${escapeHtml(u.username)}</span>
    </button>
  `).join('');
}

function selectLoginAccount(username) {
  const uInput = document.getElementById('loginUsername');
  const pInput = document.getElementById('loginPassword');
  if (uInput) uInput.value = username;
  if (pInput) {
    pInput.value = ''; // Do NOT autofill password
    pInput.focus();
  }
  showToast(`Selected @${username}. Enter your password to sign in.`, 'info');
}

function updateLoginSqlPreview() {
  // Kept clean without hints
}

function togglePasswordVisibility() {
  const pInput = document.getElementById('loginPassword');
  const icon = document.getElementById('passwordToggleIcon');
  if (!pInput || !icon) return;
  if (pInput.type === 'password') {
    pInput.type = 'text';
    icon.className = 'fa-solid fa-eye-slash';
  } else {
    pInput.type = 'password';
    icon.className = 'fa-solid fa-eye';
  }
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
      showToast(`Signed in as @${user.username}`, 'success');
    }
    await loadUsers();
    await enterAppSession(user.user_id);
  } catch (err) {
    // Handled by api()
  }
}

function handleLogout() {
  showLoginScreen();
  showToast('Logged out of account session', 'info');
}

// ---- Active User Profile Card ----
async function renderActiveUserCard() {
  if (!activeUserId) return;
  try {
    const res = await api('GET', `/users/${activeUserId}`);
    const u = res.data;

    const cardAvatar = document.getElementById('activeUserAvatar');
    if (cardAvatar) {
      cardAvatar.className = `w-20 h-20 rounded-2xl ring-4 ring-slate-900 ${avatarColor(u.user_id)} flex items-center justify-center text-3xl font-bold shadow-xl shrink-0 text-white`;
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
      formAvatar.className = `w-10 h-10 rounded-xl ${avatarColor(u.user_id)} flex items-center justify-center text-sm font-bold shrink-0 text-white shadow-md`;
      formAvatar.textContent = getInitial(u.username);
    }
  } catch (e) { /* handled */ }
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
        <div class="text-center py-10 text-slate-500 font-mono text-xs">
          <i class="fa-solid fa-triangle-exclamation text-xl text-amber-500 mb-2"></i>
          <p>Failed to query posts from database.</p>
        </div>`;
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
      <div class="text-center py-12 text-slate-500 bg-slate-900/60 rounded-2xl border border-slate-800 p-8 shadow-sm">
        <i class="fa-solid fa-newspaper text-3xl mb-3 text-slate-600"></i>
        <p class="text-sm font-semibold text-slate-300">No posts in this feed yet</p>
        <p class="text-xs text-slate-500 mt-1">Publish a new post above to execute an INSERT INTO Posts query!</p>
      </div>`;
    return;
  }

  container.innerHTML = posts.map(p => {
    const isOwn = p.user_id === activeUserId;
    const liked = Boolean(p.user_liked || p.liked_by_user);
    const isFollowing = Boolean(p.is_following);

    return `
    <article class="glass-card rounded-2xl p-4 sm:p-5 transition-all space-y-3.5 relative" data-post-id="${p.post_id}">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div onclick="openUserProfile(${p.user_id})" class="w-10 h-10 rounded-xl ${avatarColor(p.user_id)} flex items-center justify-center text-sm font-bold text-white shadow-md shrink-0 cursor-pointer hover:scale-105 transition-transform" title="Click to view @${escapeHtml(p.username)}'s profile">
            ${getInitial(p.username)}
          </div>
          <div>
            <div class="flex items-center gap-1.5 flex-wrap">
              <span onclick="openUserProfile(${p.user_id})" class="font-bold text-sm text-white hover:underline cursor-pointer hover:text-indigo-300 transition-colors" title="Click to view @${escapeHtml(p.username)}'s profile">@${escapeHtml(p.username)}</span>
              <i class="fa-solid fa-circle-check text-blue-400 text-[11px]" title="Verified User"></i>
              <span class="query-detail text-[10px] text-indigo-300 font-mono bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20">user_id: ${p.user_id}</span>
            </div>
            <div class="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
              <span>${timeAgo(p.created_at)}</span>
              <span class="query-detail">•</span>
              <span class="query-detail text-slate-500">PK post_id: #${p.post_id}</span>
            </div>
          </div>
        </div>

        <!-- Follow / Delete Controls -->
        <div class="flex items-center gap-2">
          ${!isOwn ? `
            <button onclick="toggleFollow(${p.user_id})" class="text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 shadow-sm ${isFollowing ? 'border-slate-700 bg-slate-800 text-emerald-400 hover:bg-rose-500/15 hover:border-rose-500/40 hover:text-rose-300' : 'border-indigo-500/50 bg-indigo-600/15 text-indigo-300 hover:bg-indigo-600/30'}" title="${isFollowing ? 'Click to Unfollow (DELETE FROM Followers)' : 'Click to Follow (INSERT INTO Followers)'}">
              <i class="fa-solid ${isFollowing ? 'fa-user-check text-emerald-400' : 'fa-user-plus text-indigo-400'} text-[11px]"></i>
              <span>${isFollowing ? 'Following' : 'Follow'}</span>
            </button>
          ` : `
            <button onclick="handleDeletePost(${p.post_id})" class="text-xs text-rose-400 hover:text-rose-300 p-2 rounded-lg hover:bg-rose-500/10 transition-colors" title="Delete Post (Demonstrates ON DELETE CASCADE to Comments & Likes)">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          `}
        </div>
      </div>

      <!-- Post Body -->
      <p class="text-[13.5px] text-slate-100 leading-relaxed font-sans">${formatPostContent(p.content)}</p>

      <!-- Media / File Attachment -->
      ${p.media_url ? `
        <div class="mt-2.5">
          ${(p.file_type && p.file_type.startsWith('image/')) || /\.(png|jpe?g|gif|webp|svg)$/i.test(p.media_url) ? `
            <div class="rounded-xl overflow-hidden border border-slate-800 bg-slate-950/60 max-h-96 flex items-center justify-center cursor-pointer group" onclick="openMediaLightbox('${escapeHtml(p.media_url)}', '${escapeHtml(p.file_name || 'Post Image')}')" title="Click to view full size">
              <img src="${escapeHtml(p.media_url)}" alt="Post image" class="max-h-96 w-full object-contain rounded-xl group-hover:scale-[1.01] transition-transform duration-200" loading="lazy" />
            </div>
          ` : `
            <a href="${escapeHtml(p.media_url)}" download="${escapeHtml(p.file_name || 'attachment')}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-3 p-3 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition group text-left">
              <div class="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-lg">
                <i class="${getFileIconClass(p.file_type, p.file_name)}"></i>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-xs font-semibold text-slate-200 group-hover:text-indigo-300 transition truncate">${escapeHtml(p.file_name || 'Attached File')}</div>
                <div class="text-[10px] text-slate-500 font-mono flex items-center gap-1.5"><i class="fa-solid fa-download text-[9px]"></i> Click to download attachment</div>
              </div>
              <i class="fa-solid fa-arrow-up-right-from-square text-xs text-slate-500 group-hover:text-slate-300 transition pr-1"></i>
            </a>
          `}
        </div>
      ` : ''}

      <!-- DBMS Relational Architecture Meta Chip -->
      <div class="query-detail bg-slate-950/70 rounded-xl px-3 py-1.5 border border-slate-800/80 font-mono text-[10px] text-slate-400 flex items-center justify-between flex-wrap gap-1">
        <span class="text-indigo-300 flex items-center gap-1">
          <i class="fa-solid fa-network-wired text-[9px] text-indigo-400"></i>
          Relational Link: <code class="text-amber-400">Posts.user_id (${p.user_id})</code> ➔ <code class="text-blue-400">Users.user_id (${p.user_id})</code>
        </span>
        <span class="text-slate-500">ON DELETE CASCADE</span>
      </div>

      <!-- Interaction Bar -->
      <div class="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
        <div class="flex items-center gap-3">
          <!-- Like Button -->
          <button onclick="toggleLike(${p.post_id})" class="flex items-center gap-1.5 font-semibold px-3 py-1.5 rounded-xl transition-all ${liked ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20 shadow-sm shadow-rose-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}" title="${liked ? 'DELETE FROM Likes' : 'INSERT INTO Likes'}">
            <i class="fa-${liked ? 'solid' : 'regular'} fa-heart ${liked ? 'like-pop text-rose-500' : ''}"></i>
            <span>${p.like_count || 0} Likes</span>
          </button>

          <!-- Comment Button -->
          <button onclick="toggleComments(${p.post_id})" class="flex items-center gap-1.5 font-medium px-3 py-1.5 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-slate-800/60 transition">
            <i class="fa-regular fa-comment text-slate-400"></i>
            <span>${p.comment_count || 0} Comments</span>
          </button>
        </div>

        <button onclick="inspectPostComments(${p.post_id})" class="query-detail text-slate-500 hover:text-indigo-300 text-xs font-mono transition flex items-center gap-1 px-2 py-1 rounded" title="Inspect comments join query">
          <i class="fa-solid fa-code text-[10px]"></i>
          <span class="hidden sm:inline">Q4 Query</span>
        </button>
      </div>

      <!-- Threaded Comments Drawer -->
      <div id="comments-${p.post_id}" class="hidden pt-3 border-t border-slate-800 space-y-3">
        <!-- New Comment Input -->
        <div class="flex items-center gap-2">
          <input id="commentInput-${p.post_id}" type="text" maxlength="300" class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-sans" placeholder="Write a comment (executes INSERT INTO Comments)..." onkeydown="if(event.key==='Enter')handleAddComment(${p.post_id})" />
          <button onclick="handleAddComment(${p.post_id})" class="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition flex items-center gap-1 shrink-0">
            <i class="fa-solid fa-paper-plane text-[10px]"></i>
            <span class="hidden sm:inline">Comment</span>
          </button>
        </div>

        <!-- Comments List -->
        <div id="commentsList-${p.post_id}" class="space-y-2 pt-1">
          <div class="text-slate-500 text-xs font-mono py-1">Loading comments...</div>
        </div>
      </div>
    </article>`;
  }).join('');
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
    showToast(isLiked ? 'Post liked! (INSERT INTO Likes)' : 'Post unliked (DELETE FROM Likes)', 'success');
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
    await loadComments(postId);
  } else {
    section.classList.add('hidden');
  }
}

async function loadComments(postId) {
  try {
    const res = await api('GET', `/posts/${postId}/comments`);
    const list = document.getElementById(`commentsList-${postId}`);
    if (!list) return;
    const comments = res.data;
    if (!comments || comments.length === 0) {
      list.innerHTML = '<div class="text-slate-500 font-mono text-[11px] py-2 text-center bg-slate-950/60 rounded-xl">No comments on this post yet.</div>';
      return;
    }
    list.innerHTML = comments.map(c => `
      <div class="flex items-start gap-2.5 bg-slate-950/80 rounded-xl p-2.5 border border-slate-800/60">
        <div onclick="openUserProfile(${c.user_id})" class="w-7 h-7 rounded-lg ${avatarColor(c.user_id)} flex items-center justify-center text-[10px] font-bold shrink-0 text-white shadow-sm cursor-pointer hover:scale-105 transition-transform" title="Click to view @${escapeHtml(c.username)}'s profile">${getInitial(c.username)}</div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span onclick="openUserProfile(${c.user_id})" class="font-bold text-xs text-indigo-300 hover:underline cursor-pointer" title="Click to view @${escapeHtml(c.username)}'s profile">@${escapeHtml(c.username)}</span>
            <span class="text-[10px] text-slate-500 font-mono">${timeAgo(c.created_at)}</span>
            <span class="query-detail text-[9px] text-slate-600 font-mono ml-auto">c_id: ${c.comment_id}</span>
          </div>
          <p class="text-slate-200 text-xs mt-1 leading-relaxed">${escapeHtml(c.comment_text)}</p>
        </div>
      </div>
    `).join('');
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
    streamEl.innerHTML = '<div class="py-6 text-center text-slate-500 font-mono text-xs"><i class="fa-solid fa-spinner spinner mr-1"></i> Querying user profile and posts...</div>';
  }

  // Open modal natively
  if (typeof modal.showModal === 'function') {
    modal.showModal();
  } else {
    modal.setAttribute('open', '');
  }

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
      avatarEl.className = `w-16 h-16 rounded-2xl ring-4 ring-slate-900 ${avatarColor(u.user_id)} flex items-center justify-center text-2xl font-bold text-white shadow-xl shrink-0`;
      avatarEl.textContent = u.username.toLowerCase() === 'admin' ? '🛡️' : getInitial(u.username);
    }

    const titleEl = document.getElementById('modalProfileTitle');
    if (titleEl) titleEl.textContent = `@${u.username}`;

    const roleBadge = document.getElementById('modalProfileRoleBadge');
    if (roleBadge) {
      if (u.username.toLowerCase() === 'admin') {
        roleBadge.textContent = 'Administrator / DBA';
        roleBadge.className = 'text-[10px] font-mono px-2 py-0.5 rounded font-bold admin-pill';
      } else {
        roleBadge.textContent = 'ConnectSphere Member';
        roleBadge.className = 'text-[10px] font-mono px-2 py-0.5 rounded border border-indigo-500/20 text-indigo-300 bg-indigo-500/10';
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
          <span class="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
            <i class="fa-solid fa-user-check text-indigo-400 text-xs"></i>
            <span>Your Profile</span>
          </span>`;
      } else {
        const isFollowing = Boolean(u.is_following);
        actionContainer.innerHTML = `
          <button onclick="handleProfileFollowToggle(${u.user_id})" class="text-xs font-semibold px-4 py-2 rounded-xl border transition-all flex items-center gap-1.5 shadow-sm ${isFollowing ? 'border-slate-700 bg-slate-800 text-emerald-400 hover:bg-rose-500/15 hover:border-rose-500/40 hover:text-rose-300' : 'border-indigo-500/50 bg-indigo-600 text-white hover:bg-indigo-500'}">
            <i class="fa-solid ${isFollowing ? 'fa-user-check text-emerald-400' : 'fa-user-plus text-white'} text-[11px]"></i>
            <span>${isFollowing ? 'Following' : 'Follow'}</span>
          </button>`;
      }
    }

    // Render User Posts Stream inside Modal
    const totalBadge = document.getElementById('modalProfilePostsTotalBadge');
    if (totalBadge) totalBadge.textContent = `${posts.length} post${posts.length !== 1 ? 's' : ''}`;

    if (streamEl) {
      if (posts.length === 0) {
        streamEl.innerHTML = '<div class="text-slate-500 font-mono text-xs py-6 text-center bg-slate-950/50 rounded-xl">No posts published yet.</div>';
      } else {
        streamEl.innerHTML = posts.map(p => {
          const liked = Boolean(p.user_liked || p.liked_by_user);
          return `
            <div class="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1.5">
              <div class="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span class="text-slate-400">${timeAgo(p.created_at)}</span>
                <span class="query-detail text-[10px] text-slate-500">PK post_id: #${p.post_id}</span>
              </div>
              <p class="text-xs text-slate-100 font-sans leading-relaxed">${formatPostContent(p.content)}</p>
              ${p.media_url ? `
                <div class="mt-2">
                  ${(p.file_type && p.file_type.startsWith('image/')) || /\.(png|jpe?g|gif|webp|svg)$/i.test(p.media_url) ? `
                    <div class="rounded-lg overflow-hidden border border-slate-800 bg-slate-950/60 max-h-48 flex items-center justify-center cursor-pointer group" onclick="openMediaLightbox('${escapeHtml(p.media_url)}', '${escapeHtml(p.file_name || 'Post Image')}')">
                      <img src="${escapeHtml(p.media_url)}" alt="Post image" class="max-h-48 w-full object-cover rounded-lg group-hover:scale-[1.01] transition-transform duration-200" loading="lazy" />
                    </div>
                  ` : `
                    <a href="${escapeHtml(p.media_url)}" download="${escapeHtml(p.file_name || 'attachment')}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2.5 p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition group text-left">
                      <div class="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-sm">
                        <i class="${getFileIconClass(p.file_type, p.file_name)}"></i>
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="text-[11px] font-semibold text-slate-200 group-hover:text-indigo-300 transition truncate">${escapeHtml(p.file_name || 'Attached File')}</div>
                        <div class="text-[9px] text-slate-500 font-mono">Download</div>
                      </div>
                    </a>
                  `}
                </div>
              ` : ''}
              <div class="flex items-center gap-4 text-xs pt-1 border-t border-slate-800/60 font-mono text-slate-400">
                <span class="flex items-center gap-1 ${liked ? 'text-rose-400' : ''}">
                  <i class="fa-${liked ? 'solid' : 'regular'} fa-heart text-[11px] ${liked ? 'text-rose-500' : ''}"></i>
                  ${p.like_count || 0}
                </span>
                <span class="flex items-center gap-1">
                  <i class="fa-regular fa-comment text-[11px]"></i>
                  ${p.comment_count || 0}
                </span>
              </div>
            </div>`;
        }).join('');
      }
    }

  } catch (err) {
    if (streamEl) {
      streamEl.innerHTML = '<div class="text-rose-400 font-mono text-xs py-4 text-center">Failed to load user profile.</div>';
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
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold transition bg-indigo-600 text-white shadow';
      } else {
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-medium transition text-slate-400 hover:text-white hover:bg-slate-800';
      }
    }
  });
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
    if (btn) btn.className = 'px-2.5 py-1.5 rounded-lg text-xs font-medium transition text-slate-400 hover:text-white';
  });

  if (layout === 'split') {
    document.getElementById('layoutSplit').className = 'px-2.5 py-1.5 rounded-lg text-xs font-medium transition bg-indigo-600 text-white shadow';
    if (main) main.className = 'max-w-7xl mx-auto p-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-6 layout-transition';
    if (feed) feed.className = 'lg:col-span-7 space-y-5';
    if (inspector) inspector.className = 'lg:col-span-5 space-y-5';
    if (feed) feed.classList.remove('hidden');
    if (inspector) inspector.classList.remove('hidden');
  } else if (layout === 'feed') {
    document.getElementById('layoutFeed').className = 'px-2.5 py-1.5 rounded-lg text-xs font-medium transition bg-indigo-600 text-white shadow';
    if (main) main.className = 'max-w-4xl mx-auto p-4 sm:px-6 grid grid-cols-1 gap-6 layout-transition';
    if (feed) feed.className = 'col-span-1 space-y-5';
    if (feed) feed.classList.remove('hidden');
    if (inspector) inspector.classList.add('hidden');
  } else {
    document.getElementById('layoutInspector').className = 'px-2.5 py-1.5 rounded-lg text-xs font-medium transition bg-indigo-600 text-white shadow';
    if (main) main.className = 'max-w-5xl mx-auto p-4 sm:px-6 grid grid-cols-1 gap-6 layout-transition';
    if (inspector) inspector.className = 'col-span-1 space-y-5';
    if (feed) feed.classList.add('hidden');
    if (inspector) inspector.classList.remove('hidden');
  }
}

// ---- Database Tables Explorer ----
function setTableTab(tab) {
  currentTableTab = tab;
  const tabs = ['users', 'posts', 'comments', 'likes', 'followers'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (btn) {
      if (t === tab) {
        btn.className = 'px-3.5 py-2 text-xs font-semibold transition text-indigo-400 border-b-2 border-indigo-400 shrink-0';
      } else {
        btn.className = 'px-3.5 py-2 text-xs font-medium transition text-slate-400 hover:text-slate-200 border-b-2 border-transparent shrink-0';
      }
    }
  });
  loadTableData(tab);
}

async function loadTableData(table = currentTableTab, silent = false) {
  const container = document.getElementById('tableContent');
  if (!silent && container) {
    container.innerHTML = '<div class="p-6 text-center text-slate-500 text-xs font-mono"><i class="fa-solid fa-spinner spinner mr-1"></i> Querying table data...</div>';
  }

  try {
    const res = await api('GET', `/tables/${table}`);
    renderTable(res.data || [], table);
  } catch (e) {
    if (!silent && container) {
      container.innerHTML = '<div class="p-6 text-center text-rose-400 text-xs font-mono">Failed to load table data</div>';
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
    container.innerHTML = `<div class="p-6 text-center text-slate-500 font-mono text-xs">Table '${tableName}' is empty (0 rows).</div>`;
    return;
  }

  const columns = Object.keys(data[0]);

  // Primary and Foreign Key badge helper
  const getColBadge = (c, tbl) => {
    const t = (tbl || '').toLowerCase();
    if (c === 'user_id' && t === 'users') return '<span class="text-[9px] bg-amber-500/20 text-amber-400 px-1 py-0.2 rounded ml-1 font-mono font-bold">PK</span>';
    if (c === 'post_id' && t === 'posts') return '<span class="text-[9px] bg-amber-500/20 text-amber-400 px-1 py-0.2 rounded ml-1 font-mono font-bold">PK</span>';
    if (c === 'comment_id' && t === 'comments') return '<span class="text-[9px] bg-amber-500/20 text-amber-400 px-1 py-0.2 rounded ml-1 font-mono font-bold">PK</span>';
    if (c === 'like_id' && t === 'likes') return '<span class="text-[9px] bg-amber-500/20 text-amber-400 px-1 py-0.2 rounded ml-1 font-mono font-bold">PK</span>';
    if (c === 'id' && t === 'followers') return '<span class="text-[9px] bg-amber-500/20 text-amber-400 px-1 py-0.2 rounded ml-1 font-mono font-bold">PK</span>';

    if (c === 'user_id' || c === 'post_id' || c === 'follower_id' || c === 'following_id') {
      return '<span class="text-[9px] bg-blue-500/20 text-blue-400 px-1 py-0.2 rounded ml-1 font-mono font-bold">FK</span>';
    }
    return '';
  };

  const headerRow = columns.map(c =>
    `<th class="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-300 uppercase tracking-wider bg-slate-900 border-b border-r border-slate-800">${escapeHtml(c)}${getColBadge(c, tableName)}</th>`
  ).join('');

  const bodyRows = data.map((row, idx) =>
    `<tr class="border-b border-slate-800/60 ${idx % 2 === 0 ? 'bg-slate-950' : 'bg-slate-900/40'} hover:bg-slate-800/40 transition">${columns.map(c => {
      let val = row[c];
      if (val === null || val === undefined) {
        val = '<span class="text-slate-600 font-mono italic">NULL</span>';
      } else {
        const isDateCol = c.endsWith('_at') || c.endsWith('_date');
        if (isDateCol && typeof val === 'string' && val.length >= 10) {
          const d = new Date(val.replace(' ', 'T'));
          if (!isNaN(d.getTime())) {
            val = `<span class="text-slate-300 font-mono text-[11px]">${d.toLocaleString()}</span>`;
          } else {
            val = escapeHtml(String(val));
          }
        } else if (c === 'username' && row.user_id) {
          val = `<span onclick="openUserProfile(${row.user_id})" class="text-indigo-300 font-semibold cursor-pointer hover:underline" title="View profile">@${escapeHtml(String(val))}</span>`;
        } else {
          val = escapeHtml(String(val));
        }
      }
      return `<td class="px-3 py-2 text-xs text-slate-300 font-mono border-r border-slate-800/60 max-w-[240px] truncate">${val}</td>`;
    }).join('')}</tr>`
  ).join('');

  container.innerHTML = `
    <table class="w-full text-left font-mono text-xs border-collapse">
      <thead class="sticky top-0 bg-slate-900 z-10"><tr>${headerRow}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
    <div class="px-3 py-2 text-[10px] text-slate-500 border-t border-slate-800 bg-slate-950 flex items-center justify-between font-mono">
      <span>${data.length} row${data.length !== 1 ? 's' : ''} in table</span>
      <span><span class="text-amber-400 font-bold">PK</span> = Primary Key, <span class="text-blue-400 font-bold">FK</span> = Foreign Key</span>
    </div>
  `;
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
  resultBody.innerHTML = '<div class="text-slate-500 font-mono text-xs py-3 text-center"><i class="fa-solid fa-spinner spinner mr-1.5"></i> Executing query...</div>';

  try {
    const res = await api('GET', requestPath);
    const data = res.data;

    if (!data || data.length === 0) {
      resultBody.innerHTML = '<div class="text-slate-500 font-mono text-xs py-2 text-center">0 rows returned.</div>';
      return;
    }

    const columns = Object.keys(data[0]);
    const headerRow = columns.map(c =>
      `<th class="px-2.5 py-1.5 text-left text-[10px] font-semibold text-purple-400 uppercase tracking-wider border-b border-slate-800 bg-slate-900">${escapeHtml(c)}</th>`
    ).join('');

    const bodyRows = data.map((row, idx) =>
      `<tr class="border-b border-slate-800/60 ${idx % 2 === 0 ? 'bg-slate-950' : 'bg-slate-900/50'}">${columns.map(c => {
        let val = row[c];
        if (val === null || val === undefined) val = '<span class="text-slate-600">NULL</span>';
        else val = escapeHtml(String(val));
        return `<td class="px-2.5 py-1.5 text-xs text-slate-300 font-mono">${val}</td>`;
      }).join('')}</tr>`
    ).join('');

    resultBody.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-left font-mono text-xs border-collapse">
          <thead><tr>${headerRow}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>
      <div class="mt-2 text-[10px] text-slate-500 font-mono text-right">${data.length} row${data.length !== 1 ? 's' : ''} returned</div>
    `;

    showToast(`${info.title} executed`, 'success');
  } catch (e) {
    resultBody.innerHTML = '<div class="text-rose-400 font-mono text-xs py-2 text-center">Query execution failed.</div>';
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
    const res = await api('GET', '/users');
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
}

function updateThemeToggleButton(theme) {
  const btn = document.getElementById('themeToggleBtn');
  const icon = document.getElementById('themeToggleIcon');
  const label = document.getElementById('themeToggleLabel');
  if (!btn || !icon) return;

  const isLight = theme === 'light';
  if (isLight) {
    icon.className = 'fa-solid fa-moon text-indigo-600 text-xs';
    btn.title = 'Switch to Dark Theme';
    btn.setAttribute('aria-label', 'Switch to Dark Theme');
    if (label) label.textContent = 'Light';
  } else {
    icon.className = 'fa-solid fa-sun text-amber-400 text-xs';
    btn.title = 'Switch to Light Theme';
    btn.setAttribute('aria-label', 'Switch to Light Theme');
    if (label) label.textContent = 'Dark';
  }
}

function toggleTheme() {
  const current = getCurrentTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  try {
    localStorage.setItem('connectsphere_theme', next);
  } catch (_) {}
  applyTheme(next);
  showToast(next === 'light' ? 'Switched to Light Theme ☀️' : 'Switched to Dark Theme 🌙', 'info');
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

    const postInput = document.getElementById('postInput');
    if (postInput) {
      postInput.addEventListener('input', updatePostSqlPreview);
    }

    await loadUsers();
    renderLoginAccounts();
    updateLoginSqlPreview();

    // Check if user session already exists in sessionStorage
    const savedUserId = sessionStorage.getItem('connectsphere_active_user');
    if (savedUserId && users.some(u => String(u.user_id) === String(savedUserId))) {
      await enterAppSession(Number(savedUserId));
    } else {
      showLoginScreen();
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

  } catch (e) {
    showToast('Failed to initialize app. Is the server running?', 'error');
  }
}

// Start
init();
