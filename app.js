const STORAGE_KEY = 'hesabyar-transactions-v1';
const today = new Date().toISOString().slice(0, 10);
const state = { transactions: [], filter: 'all', selectedMonth: today.slice(0, 7), type: 'expense' };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const els = {
  list: $('#transactionsList'), month: $('#monthFilter'), balance: $('#balanceValue'), income: $('#incomeValue'), expense: $('#expenseValue'),
  balanceCaption: $('#balanceCaption'), dialog: $('#transactionDialog'), form: $('#transactionForm'), amount: $('#amountInput'), title: $('#titleInput'),
  category: $('#categoryInput'), date: $('#dateInput'), chat: $('#chatMessages'), chatInput: $('#chatInput'), toast: $('#toast')
};

function faNumber(value) { return new Intl.NumberFormat('fa-IR').format(Math.round(value || 0)); }
function money(value) { return `${faNumber(value)} تومان`; }
function normalizeDigits(value) {
  return String(value).replace(/[۰-۹]/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)).replace(/[٠-٩]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit));
}
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char])); }
function parseAmount(value) {
  const text = normalizeDigits(value).replace(/[٬،]/g, ',').replace(/٫/g, '.');
  const match = text.match(/(\d[\d,]*(?:\.\d+)?)\s*(میلیون|هزار|م|k|m)?/i);
  if (!match) return null;
  const number = Number(match[1].replace(/,/g, ''));
  const unit = (match[2] || '').toLowerCase();
  const multiplier = unit === 'هزار' || unit === 'k' ? 1000 : (unit === 'میلیون' || unit === 'م' || unit === 'm' ? 1000000 : 1);
  return Number.isFinite(number) ? Math.round(number * multiplier) : null;
}
function categoryFor(text, type) {
  const rules = [['خوراک', /غذا|خوراک|رستوران|قهوه|سوپر|خرید روزانه|نان/], ['حمل‌ونقل', /تاکسی|اسنپ|بنزین|اتوبوس|مترو|حمل/], ['قبض و خانه', /اجاره|قبض|برق|آب|گاز|خانه/], ['خرید', /خرید|لباس|کفش|دیجی|وسایل/], ['سلامت', /دکتر|دارو|سلامت|بیمارستان/], ['تفریح', /سینما|تفریح|بازی|سفر/], ['حقوق', /حقوق|دستمزد|قرارداد/], ['فروش', /فروش|فاکتور|مشتری/]];
  const found = rules.find((rule) => rule[1].test(text));
  return found ? found[0] : (type === 'income' ? 'سایر' : 'سایر');
}
function load() {
  try { state.transactions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { state.transactions = []; }
  if (!Array.isArray(state.transactions)) state.transactions = [];
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions)); }
function filteredTransactions() {
  return state.transactions.filter((item) => item.date.slice(0, 7) === state.selectedMonth && (state.filter === 'all' || item.type === state.filter)).sort((a, b) => `${b.date}${b.id}`.localeCompare(`${a.date}${a.id}`));
}
function render() {
  const period = state.transactions.filter((item) => item.date.slice(0, 7) === state.selectedMonth);
  const income = period.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
  const expense = period.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
  els.income.textContent = money(income); els.expense.textContent = money(expense); els.balance.textContent = money(income - expense);
  els.balanceCaption.textContent = period.length ? `${faNumber(period.length)} تراکنش در این دوره` : 'بعد از ثبت اولین تراکنش نمایش داده می‌شود';
  const items = filteredTransactions();
  els.list.innerHTML = items.length ? items.map(transactionHtml).join('') : '<div class="empty-state"><strong>هنوز تراکنشی ثبت نشده</strong><span>از «ثبت تراکنش» یا ایجنت سمت چپ استفاده کن.</span></div>';
}
function transactionHtml(item) {
  const sign = item.type === 'income' ? '+' : '−';
  const date = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'short' }).format(new Date(`${item.date}T12:00:00`));
  return `<article class="transaction"><div class="transaction-icon ${item.type}">${item.type === 'income' ? '↗' : '↘'}</div><div class="transaction-main"><div class="transaction-title">${escapeHtml(item.title)}</div><div class="transaction-meta">${escapeHtml(item.category)} · ${date}</div></div><div class="transaction-amount ${item.type}">${sign} ${money(item.amount)}</div><button class="delete-transaction" data-delete="${item.id}" aria-label="حذف ${escapeHtml(item.title)}">×</button></article>`;
}
function showToast(message) { els.toast.textContent = message; els.toast.classList.add('show'); setTimeout(() => els.toast.classList.remove('show'), 2400); }
function addTransaction(data) {
  state.transactions.push({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, type: data.type, amount: Math.max(0, Math.round(data.amount)), title: data.title || 'تراکنش بدون عنوان', category: data.category || 'سایر', date: data.date || today });
  save(); render();
}
function openDialog(type = 'expense', preset = {}) {
  state.type = type; $$('.type-button').forEach((button) => button.classList.toggle('active', button.dataset.type === type));
  els.amount.value = preset.amount || ''; els.title.value = preset.title || ''; els.category.value = preset.category || (type === 'income' ? 'سایر' : 'سایر'); els.date.value = preset.date || today; els.dialog.showModal();
}
function addChat(text, role) { const bubble = document.createElement('div'); bubble.className = `chat-bubble ${role === 'user' ? 'user-bubble' : 'agent-bubble'}`; bubble.textContent = text; els.chat.appendChild(bubble); els.chat.scrollTop = els.chat.scrollHeight; }
function report() {
  const period = state.transactions.filter((item) => item.date.slice(0, 7) === state.selectedMonth);
  const income = period.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
  const expense = period.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
  return period.length ? `گزارش ${state.selectedMonth}: درآمد ${money(income)}، هزینه ${money(expense)} و مانده ${money(income - expense)} است.` : 'برای این ماه هنوز تراکنشی نداریم. یک هزینه یا درآمد ثبت کن تا گزارش بسازم.';
}
function recent() {
  const items = [...state.transactions].sort((a, b) => `${b.date}${b.id}`.localeCompare(`${a.date}${a.id}`)).slice(0, 4);
  return items.length ? `آخرین موارد: ${items.map((item) => `${item.title} (${item.type === 'income' ? '+' : '−'}${money(item.amount)})`).join('، ')}.` : 'هنوز تراکنشی ثبت نشده است.';
}
function cleanTitle(text) {
  const cleaned = normalizeDigits(text).replace(/\d[\d,]*(?:\.\d+)?\s*(میلیون|هزار|م|k|m)?/gi, '').replace(/تومان|ریال|برای|از|به|ثبت کن|ثبت کردم|کردم|کرد|خرج|خریدم|گرفتم|واریز|دریافت|شد|شده|دارم|من|یک/gi, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.length > 1 ? cleaned.slice(0, 42) : 'تراکنش ثبت‌شده';
}
function handleAgent(text) {
  const normalized = normalizeDigits(text).toLowerCase();
  if (/گزارش|خلاصه|وضعیت مالی/.test(normalized)) return report();
  if (/آخرین|لیست تراکنش/.test(normalized)) return recent();
  if (/موجودی|مانده|چقدر دارم/.test(normalized)) {
    const income = state.transactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
    const expense = state.transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
    return `مانده کل حساب ${money(income - expense)} است؛ درآمد ${money(income)} و هزینه ${money(expense)}.`;
  }
  const amount = parseAmount(normalized);
  if (amount) {
    const type = /درآمد|حقوق|دریافت|فروش|واریز|گرفتم/.test(normalized) ? 'income' : 'expense';
    const title = cleanTitle(text);
    addTransaction({ type, amount, title, category: categoryFor(normalized, type) });
    return `${type === 'income' ? 'درآمد' : 'هزینه'} «${title}» به مبلغ ${money(amount)} ثبت شد.`;
  }
  return 'می‌توانی این‌طور بنویسی: «۸۰ هزار برای قهوه خرج کردم»، «حقوق ۱۵ میلیون گرفتم»، «گزارش این ماه» یا «موجودی». ';
}
function download(name, content, type) { const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([content], { type })); link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 500); }
function exportBackup() { download(`hesabyar-backup-${today}.json`, JSON.stringify({ exportedAt: new Date().toISOString(), transactions: state.transactions }, null, 2), 'application/json'); showToast('فایل پشتیبان آماده شد'); }
function exportCsv() {
  const rows = [['تاریخ', 'نوع', 'عنوان', 'دسته‌بندی', 'مبلغ'], ...state.transactions.map((item) => [item.date, item.type === 'income' ? 'درآمد' : 'هزینه', item.title, item.category, item.amount])];
  download(`hesabyar-transactions-${today}.csv`, rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv;charset=utf-8'); showToast('فایل اکسل‌خوان CSV آماده شد');
}

els.month.value = state.selectedMonth; els.date.value = today; load(); render();
$('#addButton').addEventListener('click', () => openDialog());
$$('.type-button').forEach((button) => button.addEventListener('click', () => { state.type = button.dataset.type; $$('.type-button').forEach((item) => item.classList.toggle('active', item === button)); }));
$$('.filter-button').forEach((button) => button.addEventListener('click', () => { state.filter = button.dataset.filter; $$('.filter-button').forEach((item) => item.classList.toggle('active', item === button)); render(); }));
els.month.addEventListener('change', () => { state.selectedMonth = els.month.value || today.slice(0, 7); render(); });
els.list.addEventListener('click', (event) => { const button = event.target.closest('[data-delete]'); if (!button) return; if (confirm('این تراکنش حذف شود؟')) { state.transactions = state.transactions.filter((item) => item.id !== button.dataset.delete); save(); render(); showToast('تراکنش حذف شد'); } });
els.form.addEventListener('submit', (event) => { event.preventDefault(); const amount = parseAmount(els.amount.value); if (!amount || amount <= 0) return showToast('مبلغ را درست وارد کن'); addTransaction({ type: state.type, amount, title: els.title.value.trim(), category: els.category.value, date: els.date.value || today }); els.dialog.close(); els.form.reset(); showToast('تراکنش ثبت شد'); });
$('#chatForm').addEventListener('submit', (event) => { event.preventDefault(); const text = els.chatInput.value.trim(); if (!text) return; addChat(text, 'user'); els.chatInput.value = ''; setTimeout(() => addChat(handleAgent(text), 'agent'), 120); });
$$('.suggestion').forEach((button) => button.addEventListener('click', () => { addChat(button.dataset.prompt, 'user'); setTimeout(() => addChat(handleAgent(button.dataset.prompt), 'agent'), 120); }));
$('#backupButton').addEventListener('click', exportBackup);
$('#restoreInput').addEventListener('change', async (event) => { const file = event.target.files[0]; if (!file) return; try { const data = JSON.parse(await file.text()); const items = Array.isArray(data) ? data : data.transactions; if (!Array.isArray(items)) throw new Error('invalid'); state.transactions = items; save(); render(); showToast('پشتیبان بازیابی شد'); } catch { showToast('فایل پشتیبان معتبر نیست'); } event.target.value = ''; });
const csvButton = $('#csvButton'); if (csvButton) csvButton.addEventListener('click', exportCsv);
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
let installPrompt; window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); installPrompt = event; $('#installButton').hidden = false; });
$('#installButton').addEventListener('click', async () => { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; $('#installButton').hidden = true; });
