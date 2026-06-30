/**
 * app.js - 採点ページのメインスクリプト
 *
 * 機能：
 *   - Firestoreからイベント設定・グループ情報をリアルタイム取得
 *   - 1〜5点のスコアボタンを動的生成
 *   - localStorageで同一グループへの二重採点を防止
 *   - 採点データをFirestoreへ保存
 */

// ── 状態管理 ──────────────────────────────
let eventData = null;         // イベント設定
let currentGroupData = null;  // 現在のグループ情報
let selectedScores = {        // 選択されたスコア
  categoryA: null,
  categoryB: null,
  categoryC: null
};

// ── DOM取得 ───────────────────────────────
const $ = id => document.getElementById(id);

const loadingEl        = $('loading');
const scoreFormEl      = $('score-form');
const closedMsgEl      = $('closed-msg');
const alreadyScoredEl  = $('already-scored-msg');
const successMsgEl     = $('success-msg');
const alertAreaEl      = $('alert-area');
const submitBtn        = $('submit-btn');
const currentGroupName = $('current-group-name');
const eventTitleSub    = $('event-title-sub');
const statusBadge      = $('status-badge');

// ── localStorageキー ─────────────────────
// 同一ブラウザで同じグループに1回だけ採点可能にするためのキー
function getScoredKey(groupId) {
  return `scored_group_${groupId}`;
}

// このグループをすでに採点済みか確認
function hasAlreadyScored(groupId) {
  return localStorage.getItem(getScoredKey(groupId)) === 'true';
}

// 採点済みとしてマーク
function markAsScored(groupId) {
  localStorage.setItem(getScoredKey(groupId), 'true');
}

// ── スコアボタン生成 ──────────────────────
/**
 * 1〜5点のスコアボタンを指定コンテナに生成する
 * @param {string} containerId - ボタンを追加するコンテナのID
 * @param {string} category    - 'categoryA' | 'categoryB' | 'categoryC'
 */
function buildScoreButtons(containerId, category) {
  const container = $(containerId);
  container.innerHTML = ''; // 既存ボタンをクリア

  for (let score = 1; score <= 5; score++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'score-btn';
    btn.textContent = score;
    btn.dataset.score = score;
    btn.dataset.category = category;

    // ボタンクリック時の処理
    btn.addEventListener('click', () => {
      // 同じカテゴリの全ボタンから選択状態を解除
      container.querySelectorAll('.score-btn').forEach(b => b.classList.remove('selected'));
      // クリックしたボタンを選択状態に
      btn.classList.add('selected');
      // スコアを記録
      selectedScores[category] = score;
      // 送信ボタンの有効/無効を更新
      updateSubmitButton();
    });

    container.appendChild(btn);
  }
}

// ── 送信ボタンの状態更新 ──────────────────
function updateSubmitButton() {
  // 3つ全てのカテゴリが選択されていれば送信可能
  const allSelected = selectedScores.categoryA !== null
    && selectedScores.categoryB !== null
    && selectedScores.categoryC !== null;
  submitBtn.disabled = !allSelected;
}

// ── アラート表示 ──────────────────────────
function showAlert(message, type = 'error') {
  alertAreaEl.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  setTimeout(() => { alertAreaEl.innerHTML = ''; }, 4000);
}

// ── 評価カテゴリ名の表示更新 ─────────────
/**
 * Firestoreから取得したカテゴリ設定でラベルを更新
 * @param {Array} categories - [{name, description}, ...]
 */
function updateCategoryLabels(categories) {
  if (!categories || categories.length < 3) return;

  $('cat-a-name').textContent = categories[0].name || 'A部門';
  $('cat-a-desc').textContent = categories[0].description ? `（${categories[0].description}）` : '';
  $('cat-b-name').textContent = categories[1].name || 'B部門';
  $('cat-b-desc').textContent = categories[1].description ? `（${categories[1].description}）` : '';
  $('cat-c-name').textContent = categories[2].name || 'C部門';
  $('cat-c-desc').textContent = categories[2].description ? `（${categories[2].description}）` : '';
}

// ── 採点フォームの初期化 ─────────────────
function initForm(groupId, groupName, alreadyScored) {
  // スコアをリセット
  selectedScores = { categoryA: null, categoryB: null, categoryC: null };
  updateSubmitButton();

  // 全スコアボタンの選択状態をリセット
  document.querySelectorAll('.score-btn').forEach(b => b.classList.remove('selected'));

  // 採点済みかどうかでUIを切り替え
  if (alreadyScored) {
    alreadyScoredEl.style.display = 'block';
    submitBtn.disabled = true;
    document.querySelectorAll('.score-btn').forEach(b => { b.disabled = true; b.style.opacity = '0.4'; });
  } else {
    alreadyScoredEl.style.display = 'none';
    document.querySelectorAll('.score-btn').forEach(b => { b.disabled = false; b.style.opacity = ''; });
  }

  successMsgEl.style.display = 'none';
}

// ── Firestoreリアルタイム監視 ─────────────
/**
 * eventコレクションのcurrentドキュメントを監視し、
 * グループ変更・受付開始/停止をリアルタイムで反映する
 */
db.collection(COLLECTIONS.EVENT).doc(EVENT_DOC_ID)
  .onSnapshot(async (docSnap) => {

    loadingEl.style.display = 'none';

    if (!docSnap.exists) {
      // イベント未設定
      closedMsgEl.style.display = 'block';
      scoreFormEl.style.display = 'none';
      return;
    }

    eventData = docSnap.data();

    // イベントタイトルを更新
    if (eventData.title) {
      eventTitleSub.textContent = eventData.title;
      document.title = `採点ページ - ${eventData.title}`;
    }

    // 受付状態バッジを更新
    if (eventData.isOpen) {
      statusBadge.textContent = '受付中';
      statusBadge.className = 'badge badge-open';
    } else {
      statusBadge.textContent = '停止中';
      statusBadge.className = 'badge badge-closed';
    }

    // 採点受付停止中
    if (!eventData.isOpen) {
      closedMsgEl.style.display = 'block';
      scoreFormEl.style.display = 'none';
      return;
    }

    // 採点受付中
    closedMsgEl.style.display = 'none';
    scoreFormEl.style.display = 'block';

    // カテゴリ設定を反映
    if (eventData.categories) {
      updateCategoryLabels(eventData.categories);
    }

    // 現在発表中のグループ情報を取得
    const groupId = eventData.currentGroupId;
    if (!groupId) {
      currentGroupName.textContent = '（グループ未設定）';
      return;
    }

    // グループ情報をFirestoreから取得
    try {
      const groupDoc = await db.collection(COLLECTIONS.GROUPS).doc(groupId).get();
      if (groupDoc.exists) {
        currentGroupData = { id: groupId, ...groupDoc.data() };
        currentGroupName.textContent = currentGroupData.groupName;

        // 採点済みチェック
        const alreadyScored = hasAlreadyScored(groupId);
        initForm(groupId, currentGroupData.groupName, alreadyScored);
      }
    } catch (e) {
      console.error('グループ取得エラー:', e);
    }
  },
  (error) => {
    console.error('Firestore接続エラー:', error);
    loadingEl.innerHTML = `<span style="color:var(--color-danger);">接続エラーが発生しました。<br>firebase-config.js の設定を確認してください。</span>`;
  });

// ── スコアボタン生成（ページ読み込み時） ──
buildScoreButtons('score-buttons-a', 'categoryA');
buildScoreButtons('score-buttons-b', 'categoryB');
buildScoreButtons('score-buttons-c', 'categoryC');

// ── 採点送信処理 ─────────────────────────
submitBtn.addEventListener('click', async () => {
  // バリデーション
  if (!currentGroupData) {
    showAlert('グループ情報が取得できません。ページを再読み込みしてください。');
    return;
  }
  if (selectedScores.categoryA === null || selectedScores.categoryB === null || selectedScores.categoryC === null) {
    showAlert('すべての評価項目を選択してください。');
    return;
  }
  if (hasAlreadyScored(currentGroupData.id)) {
    showAlert('このグループはすでに採点済みです。');
    return;
  }

  // ボタンを無効化してダブルクリックを防止
  submitBtn.disabled = true;
  submitBtn.textContent = '送信中...';

  // 評価者IDを生成（localStorageに保存して同一端末を識別）
  let evaluatorId = localStorage.getItem('evaluator_id');
  if (!evaluatorId) {
    evaluatorId = 'eval_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('evaluator_id', evaluatorId);
  }

  // 合計スコアを計算
  const totalScore = selectedScores.categoryA + selectedScores.categoryB + selectedScores.categoryC;

  // Firestoreに保存するデータ
  const scoreData = {
    groupId:     currentGroupData.id,
    groupName:   currentGroupData.groupName,
    evaluatorId: evaluatorId,
    categoryA:   selectedScores.categoryA,
    categoryB:   selectedScores.categoryB,
    categoryC:   selectedScores.categoryC,
    totalScore:  totalScore,
    comment:     $('comment-input').value.trim(),
    scoredAt:    firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    // Firestoreのscoresコレクションに追加（IDは自動生成）
    await db.collection(COLLECTIONS.SCORES).add(scoreData);

    // 採点済みとしてlocalStorageに記録
    markAsScored(currentGroupData.id);

    // 成功UIを表示
    scoreFormEl.querySelector('.card').style.display = 'none';
    successMsgEl.style.display = 'block';

  } catch (error) {
    console.error('送信エラー:', error);
    showAlert('送信に失敗しました。通信状況を確認して再度お試しください。');
    submitBtn.disabled = false;
    submitBtn.textContent = '採点を送信する';
  }
});
