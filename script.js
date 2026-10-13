// ================= 数据与状态 =================
const STORAGE_KEY = 'countdown-app:v1';
let countdowns = [];          // 倒计时数组
let editingId = null;         // 当前编辑的 id，null 表示新增
let selectedTag = 'none';     // 弹窗中选中的标记
let currentQuote = 0;         // 当前鼓励语索引

// 10 句鼓励性话语
const quotes = [
  '每一个不曾起舞的日子，都是对生命的辜负。',
  '你现在的努力，是在为未来的自己铺路。',
  '不要怕慢，只怕停。坚持就是胜利。',
  '星光不问赶路人，时光不负有心人。',
  '今天多一分努力，明天少一分遗憾。',
  '所有的伟大，都源于一个勇敢的开始。',
  '乾坤未定，你我皆是黑马。',
  '只有自己强大，才能不被世界改变。',
  '把每一次困难，都当成成长的阶梯。',
  '愿你眼中有光，心中有梦，脚下有路。'
];

// 标记配置
const tagConfig = {
  star:   { emoji: '⭐', text: '重要', color: '#ffd700' },
  heart:  { emoji: '❤️', text: '期待', color: '#ff6b9d' },
  rocket: { emoji: '🚀', text: '冲刺', color: '#7c5cff' },
  check:  { emoji: '✅', text: '必达', color: '#4ade80' },
  fire:   { emoji: '🔥', text: '奋斗', color: '#fb923c' },
  none:   { emoji: '📌', text: '无标记', color: '#888' }
};

// ================= 工具函数 =================
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) countdowns = JSON.parse(raw);
    else {
      // 首次访问：给两条示例
      const now = new Date();
      const in7days = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
      const in30days = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
      countdowns = [
        { id: Date.now() + 1, title: '期末考试', target: toLocalISO(in7days), tag: 'rocket' },
        { id: Date.now() + 2, title: '生日', target: toLocalISO(in30days), tag: 'heart' }
      ];
      saveData();
    }
  } catch (e) { countdowns = []; }
}

function saveData() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(countdowns)); } catch (e) {}
}

function toLocalISO(date) {
  const pad = n => String(n).padStart(2, '0');
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
    + 'T' + pad(date.getHours()) + ':' + pad(date.getMinutes());
}

function pad(n) { return String(n).padStart(2, '0'); }

// ================= 翻页倒计时渲染 =================
function getTimeLeft(targetISO) {
  const target = new Date(targetISO).getTime();
  const now = Date.now();
  let diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86400000); diff %= 86400000;
  const hours = Math.floor(diff / 3600000); diff %= 3600000;
  const mins = Math.floor(diff / 60000); diff %= 60000;
  const secs = Math.floor(diff / 1000);
  return { days, hours, mins, secs, expired: target <= now };
}

// 构建单个翻页数字单元
function buildFlipUnit(value, label) {
  const v = pad(value);
  // days 可能超过 99，特殊处理
  const display = value >= 100 ? String(value) : v;
  return `
    <div class="flip-unit">
      <div class="flip-card" data-value="${display}">
        <div class="num-top">${display}</div>
        <div class="num-bottom">${display}</div>
      </div>
      <div class="flip-label">${label}</div>
    </div>`;
}

// 执行翻页动画：把旧值翻到新值
function flipTo(card, newVal) {
  const display = newVal >= 100 ? String(newVal) : pad(newVal);
  const oldDisplay = card.getAttribute('data-value');
  if (oldDisplay === display) return;

  // 顶部显示旧值、底部显示新值
  card.innerHTML = `
    <div class="flip-top">${oldDisplay}</div>
    <div class="flip-bottom">${display}</div>
    <div class="num-top" style="opacity:0">${display}</div>
    <div class="num-bottom">${oldDisplay}</div>
  `;
  card.setAttribute('data-value', display);

  // 动画结束后恢复静态结构
  setTimeout(() => {
    card.innerHTML = `
      <div class="num-top">${display}</div>
      <div class="num-bottom">${display}</div>
    `;
  }, 620);
}

// ================= 渲染倒计时列表 =================
function renderCountdowns() {
  const list = document.getElementById('countdownList');
  if (countdowns.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="icon">⏳</div>
        <p>还没有倒计时，点击上方按钮添加第一个吧～</p>
      </div>`;
    return;
  }

  // 按目标时间排序
  const sorted = [...countdowns].sort((a, b) =>
    new Date(a.target) - new Date(b.target)
  );

  list.innerHTML = sorted.map(c => {
    const t = getTimeLeft(c.target);
    const tag = tagConfig[c.tag] || tagConfig.none;
    const targetDate = new Date(c.target).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
    const statusText = t.expired
      ? '已到期 · 时光已至'
      : '正在倒计时中 · 加油！';
    const statusClass = t.expired ? 'expired' : '';

    return `
      <div class="countdown-card" data-id="${c.id}">
        <div class="card-header">
          <div class="card-title">${escapeHtml(c.title)}</div>
          <div class="card-actions">
            <button class="icon-btn edit" title="编辑" onclick="editCountdown(${c.id})">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="icon-btn delete" title="删除" onclick="deleteCountdown(${c.id})">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="card-tag" style="background:${tag.color}33;color:${tag.color};border:1px solid ${tag.color}55">
          ${tag.emoji} ${tag.text}
        </div>
        <div class="flip-clock">
          ${buildFlipUnit(t.days, '天')}
          ${buildFlipUnit(t.hours, '时')}
          ${buildFlipUnit(t.mins, '分')}
          ${buildFlipUnit(t.secs, '秒')}
        </div>
        <div class="card-footer">
          <div>目标：<span class="target-date">${targetDate}</span></div>
          <div class="status ${statusClass}">${statusText}</div>
        </div>
      </div>`;
  }).join('');
}

// 更新翻页（每秒调用）
function updateFlipClocks() {
  document.querySelectorAll('.countdown-card').forEach(card => {
    const id = Number(card.dataset.id);
    const item = countdowns.find(c => c.id === id);
    if (!item) return;
    const t = getTimeLeft(item.target);
    const units = card.querySelectorAll('.flip-card');
    const values = [t.days, t.hours, t.mins, t.secs];
    units.forEach((u, i) => flipTo(u, values[i]));

    // 更新状态文字
    const statusEl = card.querySelector('.status');
    if (statusEl) {
      statusEl.textContent = t.expired ? '已到期 · 时光已至' : '正在倒计时中 · 加油！';
      statusEl.classList.toggle('expired', t.expired);
    }
  });
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

// ================= 增删改操作 =================
function openModal(id = null) {
  editingId = id;
  const modal = document.getElementById('modalOverlay');
  const title = document.getElementById('modalTitle');
  const inputTitle = document.getElementById('inputTitle');
  const inputDate = document.getElementById('inputDate');

  if (id) {
    const item = countdowns.find(c => c.id === id);
    if (!item) return;
    title.textContent = '编辑倒计时';
    inputTitle.value = item.title;
    inputDate.value = item.target;
    selectedTag = item.tag;
  } else {
    title.textContent = '添加倒计时';
    inputTitle.value = '';
    // 默认目标：明天此刻
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    inputDate.value = toLocalISO(tomorrow);
    selectedTag = 'none';
  }
  refreshTagSelection();
  modal.classList.add('show');
  setTimeout(() => inputTitle.focus(), 100);
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
  editingId = null;
}

function refreshTagSelection() {
  document.querySelectorAll('.tag-option').forEach(el => {
    el.classList.toggle('selected', el.dataset.tag === selectedTag);
  });
}

function saveCountdown() {
  const title = document.getElementById('inputTitle').value.trim();
  const target = document.getElementById('inputDate').value;
  if (!title) { alert('请输入倒计时名称'); return; }
  if (!target) { alert('请选择目标日期'); return; }

  if (editingId) {
    const item = countdowns.find(c => c.id === editingId);
    if (item) { item.title = title; item.target = target; item.tag = selectedTag; }
  } else {
    countdowns.push({
      id: Date.now(),
      title, target, tag: selectedTag
    });
  }
  saveData();
  renderCountdowns();
  closeModal();
}

function deleteCountdown(id) {
  if (!confirm('确定要删除这个倒计时吗？')) return;
  countdowns = countdowns.filter(c => c.id !== id);
  saveData();
  renderCountdowns();
}

function editCountdown(id) { openModal(id); }

// 暴露给 HTML onclick
window.editCountdown = editCountdown;
window.deleteCountdown = deleteCountdown;

// ================= 鼓励语滚动 =================
function renderQuote(animate = true) {
  const track = document.getElementById('quoteTrack');
  const text = quotes[currentQuote];
  track.innerHTML = `<div class="quote-item">${text}</div>`;
  // 触发动画
  requestAnimationFrame(() => {
    track.querySelector('.quote-item').classList.add('active');
  });
}

function nextQuote() {
  // 随机选一条与当前不同的
  let next;
  do { next = Math.floor(Math.random() * quotes.length); }
  while (quotes.length > 1 && next === currentQuote);
  currentQuote = next;
  renderQuote();
}

// ================= 初始化 =================
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  renderCountdowns();
  renderQuote();

  // 每秒更新翻页
  setInterval(updateFlipClocks, 1000);

  // 每 8 秒自动切换鼓励语
  setInterval(nextQuote, 8000);

  // 按钮事件
  document.getElementById('addBtn').addEventListener('click', () => openModal());
  document.getElementById('quoteShuffle').addEventListener('click', nextQuote);
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  document.getElementById('saveBtn').addEventListener('click', saveCountdown);
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target.id === 'modalOverlay') closeModal();
  });

  // 标记选择
  document.querySelectorAll('.tag-option').forEach(el => {
    el.addEventListener('click', () => {
      selectedTag = el.dataset.tag;
      refreshTagSelection();
    });
  });

  // 回车保存
  document.getElementById('inputTitle').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveCountdown();
  });
});
