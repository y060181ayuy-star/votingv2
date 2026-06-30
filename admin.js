/**
 * admin.js - 管理画面のスクリプト
 *
 * 機能：
 *   - 簡易パスワード認証
 *   - イベント設定（タイトル・カテゴリ）の保存
 *   - グループの一括作成
 *   - 現在発表中グループの切替
 *   - 採点受付の開始・停止
 *   - 採点データのリセット
 *   - CSV出力
 */

// ── 管理者パスワード ─────────────────────
// 本番利用前にここを変更してください
const ADMIN_PASSWORD = 'admin1234';

// ── DOM取得 ───────────────────────────────
const $ = id => document.getElementById(id);

// ── ログイン処理 ─────────────────────────
$('login-btn').addEventListener('click', () => {
  const input = $('admin-password').value;
  if (input === ADMIN_PASSWORD) {
    $('auth-area').style.display = 'none';
    $('admin-content').style.display = 'block';
    initAdmin();
  } else {
    $('auth-error').style.display = 'block';
    setTimeout(() => { $('auth-error').style.display = 'none'; }, 3000);
  }
});

// Enterキーでもログイン可能
$('admin-password').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('login-btn').click();
});

// ── アラート表示 ──────────────────────────
function showAdminAlert(message, type = 'success') {
  $('admin-alert').innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  setTimeout(() => { $('admin-alert').innerHTML = ''; }, 3500);
}

// ── 管理画面の初期化 ─────────────────────
let eventData = null;
let groupsData = [];
let currentGroupId = null;

function initAdmin() {
  // イベント設定をリアルタイム監視
  db.collection(COLLECTIONS.EVENT).doc(EVENT_DOC_ID)
    .onSnapshot(docSnap => {
      if (!docSnap.exists) {
        // 初期データを作成
        createInitialEvent();
        return;
      }
      eventData = docSnap.data();
      currentGroupId = eventData.currentGroupId || null;
      renderEventSettings();
      renderStatusBar();
      renderCurrentGroupDisplay();
    });

  // グループ一覧をリアルタイム監視
  db.collection(COLLECTIONS.GROUPS)
    .orderBy('order')
    .onSnapshot(snapshot => {
      groupsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      renderGroupsList();
      renderGroupSwitchButtons();
    });
}

// ── 初期イベントデータを作成 ─────────────
async function createInitialEvent() {
  try {
    await db.collection(COLLECTIONS.EVENT).doc(EVENT_DOC_ID).set({
      title: 'グループ発表 表彰採点',
      isOpen: false,
      currentGroupId: null,
      categories: [
        { name: 'A部門', description: '企画力・着眼点・独自性' },
        { name: 'B部門', description: '発表力・わかりやすさ・説得力' },
        { name: 'C部門', description: '実現可能性・完成度・チームワーク' }
      ],
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    console.error('初期データ作成エラー:', e);
  }
}

// ── イベント設定フォームを反映 ───────────
function renderEventSettings() {
  if (!eventData) return;
  $('event-title-input').value = eventData.title || '';

  const cats = eventData.categories || [];
  if (cats[0]) {
    $('cat-a-name-input').value = cats[0].name || '';
    $('cat-a-desc-input').value = cats[0].description || '';
  }
  if (cats[1]) {
    $('cat-b-name-input').value = cats[1].name || '';
    $('cat-b-desc-input').value = cats[1].description || '';
  }
  if (cats[2]) {
    $('cat-c-name-input').value = cats[2].name || '';
    $('cat-c-desc-input').value = cats[2].description || '';
  }
}

// ── 状態バーを更新 ───────────────────────
function renderStatusBar() {
  if (!eventData) return;
  const isOpen = eventData.isOpen;
  const dot    = $('status-dot');
  const text   = $('status-text');
  const btn    = $('toggle-open-btn');

  dot.className  = `status-dot ${isOpen ? 'open' : 'closed'}`;
  text.textContent = isOpen ? '採点受付中' : '採点受付停止中';
  text.style.color = isOpen ? 'var(--color-success)' : 'var(--color-danger)';

  btn.textContent = isOpen ? '⏹ 受付を停止する' : '▶️ 受付を開始する';
  btn.className = `btn ${isOpen ? 'btn-danger' : 'btn-primary'}`;
  btn.style.padding = '8px 20px';
}

// ── 現在グループ表示を更新 ───────────────
function renderCurrentGroupDisplay() {
  const group = groupsData.find(g => g.id === currentGroupId);
  $('admin-current-group').textContent = group
    ? `現在の評価グループ：${group.groupName}`
    : '現在のグループ：未設定';
}

// ── グループ一覧を表示 ────────────────────
function renderGroupsList() {
  const container = $('groups-list');
  if (groupsData.length === 0) {
    container.innerHTML = '<div style="color:var(--color-muted); font-size:0.9rem;">グループが登録されていません。</div>';
    return;
  }

  container.innerHTML = `
    <div style="font-size:0.85rem; color:var(--color-muted); margin-bottom:8px;">
      登録済み：${groupsData.length}グループ
    </div>
    <div style="display:flex; flex-wrap:wrap; gap:8px;">
      ${groupsData.map(g => `
        <div style="
          padding:6px 12px;
          background:var(--color-surface2);
          border:1px solid var(--color-border);
          border-radius:6px;
          font-size:0.85rem;
          color:var(--color-text);
        ">${escapeHtml(g.groupName)}</div>
      `).join('')}
    </div>
  `;
}

// ── グループ切替ボタンを表示 ─────────────
function renderGroupSwitchButtons() {
  const container = $('group-switch-buttons');
  container.innerHTML = '';
  groupsData.forEach(group => {
    const btn = document.createElement('button');
    btn.className = `group-select-btn${group.id === currentGroupId ? ' active' : ''}`;
    btn.textContent = group.groupName;
    btn.addEventListener('click', () => switchGroup(group.id));
    container.appendChild(btn);
  });
}

// ── 現在グループを切替 ────────────────────
async function switchGroup(groupId) {
  try {
    await db.collection(COLLECTIONS.EVENT).doc(EVENT_DOC_ID).update({
      currentGroupId: groupId,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    currentGroupId = groupId;
    renderGroupSwitchButtons();
    renderCurrentGroupDisplay();
    const group = groupsData.find(g => g.id === groupId);
    showAdminAlert(`✅ 現在のグループを「${group.groupName}」に切り替えました。`);
  } catch (e) {
    console.error('グループ切替エラー:', e);
    showAdminAlert('切替に失敗しました。', 'error');
  }
}

// ── 受付開始・停止トグル ─────────────────
$('toggle-open-btn').addEventListener('click', async () => {
  if (!eventData) return;
  const newState = !eventData.isOpen;
  try {
    await db.collection(COLLECTIONS.EVENT).doc(EVENT_DOC_ID).update({
      isOpen: newState,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showAdminAlert(newState ? '▶️ 採点受付を開始しました。' : '⏹ 採点受付を停止しました。');
  } catch (e) {
    console.error('受付状態変更エラー:', e);
    showAdminAlert('変更に失敗しました。', 'error');
  }
});

// ── イベント設定保存 ─────────────────────
$('save-event-btn').addEventListener('click', async () => {
  const title = $('event-title-input').value.trim();
  if (!title) {
    showAdminAlert('イベント名を入力してください。', 'error');
    return;
  }

  const categories = [
    { name: $('cat-a-name-input').value.trim() || 'A部門', description: $('cat-a-desc-input').value.trim() },
    { name: $('cat-b-name-input').value.trim() || 'B部門', description: $('cat-b-desc-input').value.trim() },
    { name: $('cat-c-name-input').value.trim() || 'C部門', description: $('cat-c-desc-input').value.trim() }
  ];

  try {
    await db.collection(COLLECTIONS.EVENT).doc(EVENT_DOC_ID).update({
      title,
      categories,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showAdminAlert('✅ イベント設定を保存しました。');
  } catch (e) {
    console.error('設定保存エラー:', e);
    showAdminAlert('保存に失敗しました。', 'error');
  }
});

// ── グループ一括作成 ─────────────────────
$('create-groups-btn').addEventListener('click', async () => {
  const count = parseInt($('group-count-input').value, 10);
  if (isNaN(count) || count < 1 || count > 50) {
    showAdminAlert('グループ数は1〜50で入力してください。', 'error');
    return;
  }

  if (!confirm(`${count}グループを作成します。既存のグループは上書きされます。よろしいですか？`)) return;

  try {
    // Firestoreのバッチ書き込みを使って一括作成
    const batch = db.batch();

    // 既存グループを削除
    const existing = await db.collection(COLLECTIONS.GROUPS).get();
    existing.docs.forEach(doc => batch.delete(doc.ref));

    // 新グループを追加
    for (let i = 1; i <= count; i++) {
      const ref = db.collection(COLLECTIONS.GROUPS).doc(`group_${String(i).padStart(2, '0')}`);
      batch.set(ref, {
        groupName: `${i}グループ`,
        order: i
      });
    }

    await batch.commit();
    showAdminAlert(`✅ ${count}グループを作成しました。`);
  } catch (e) {
    console.error('グループ作成エラー:', e);
    showAdminAlert('作成に失敗しました。', 'error');
  }
});

// ── 採点データリセット ────────────────────
$('reset-scores-btn').addEventListener('click', async () => {
  // 二重確認ダイアログ
  if (!confirm('⚠️ 採点データをすべて削除します。この操作は取り消せません。\n\n本当に実行しますか？')) return;
  if (!confirm('最終確認：採点データを削除します。よろしいですか？')) return;

  try {
    // scoresコレクションの全ドキュメントを削除
    const snapshot = await db.collection(COLLECTIONS.SCORES).get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    showAdminAlert(`✅ ${snapshot.size}件の採点データを削除しました。`);
  } catch (e) {
    console.error('リセットエラー:', e);
    showAdminAlert('リセットに失敗しました。', 'error');
  }
});

// ── CSV出力 ──────────────────────────────
$('csv-export-btn').addEventListener('click', async () => {
  try {
    const snapshot = await db.collection(COLLECTIONS.SCORES).orderBy('scoredAt').get();
    if (snapshot.empty) {
      showAdminAlert('採点データがありません。', 'warning');
      return;
    }

    // CSVヘッダー
    const header = ['グループID', 'グループ名', 'A部門', 'B部門', 'C部門', '合計', 'コメント', '採点日時'];

    // CSVデータ行
    const rows = snapshot.docs.map(doc => {
      const d = doc.data();
      const ts = d.scoredAt ? d.scoredAt.toDate().toLocaleString('ja-JP') : '';
      return [
        d.groupId,
        d.groupName,
        d.categoryA,
        d.categoryB,
        d.categoryC,
        d.totalScore,
        `"${(d.comment || '').replace(/"/g, '""')}"`,  // コメントのダブルクォートをエスケープ
        ts
      ].join(',');
    });

    // BOM付きUTF-8でExcelで文字化けしないようにする
    const bom = '\uFEFF';
    const csvContent = bom + [header.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // ダウンロードリンクを動的に作成してクリック
    const link = document.createElement('a');
    link.href = url;
    link.download = `採点データ_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    showAdminAlert(`✅ ${snapshot.size}件のデータをダウンロードしました。`);
  } catch (e) {
    console.error('CSV出力エラー:', e);
    showAdminAlert('CSV出力に失敗しました。', 'error');
  }
});

// ── HTMLエスケープ（XSS防止） ─────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
