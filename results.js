/**
 * results.js - 集計・表彰結果ページのスクリプト
 *
 * 機能：
 *   - Firestoreのscoresコレクションをリアルタイム監視
 *   - 各観点の平均点を算出
 *   - 総合点を算出（A平均 + B平均 + C平均）
 *   - 各賞ごとのTOP3を表示
 *   - 全グループ一覧を表示
 */

// ── DOM取得 ───────────────────────────────
const $ = id => document.getElementById(id);

let categoryNames = {
  a: 'A部門',
  b: 'B部門',
  c: 'C部門'
};

// ── プロジェクターモード ──────────────────
let isProjectorMode = false;
$('projector-btn').addEventListener('click', () => {
  isProjectorMode = !isProjectorMode;
  document.body.classList.toggle('projector-mode', isProjectorMode);
  $('projector-btn').textContent = isProjectorMode ? '📺 通常モード' : '📽 投影モード';
});

// ── スコア集計関数 ────────────────────────
/**
 * 生の採点データ配列からグループ別集計を作成する
 * @param {Array} scores - Firestoreから取得した採点ドキュメントの配列
 * @returns {Object} グループIDをキーとした集計オブジェクト
 */
function aggregateScores(scores) {
  const grouped = {}; // { groupId: { groupName, scoresA:[], scoresB:[], scoresC:[], count } }

  scores.forEach(doc => {
    const d = doc.data();
    if (!grouped[d.groupId]) {
      grouped[d.groupId] = {
        groupId:   d.groupId,
        groupName: d.groupName,
        scoresA:   [],
        scoresB:   [],
        scoresC:   [],
        count:     0
      };
    }
    grouped[d.groupId].scoresA.push(d.categoryA);
    grouped[d.groupId].scoresB.push(d.categoryB);
    grouped[d.groupId].scoresC.push(d.categoryC);
    grouped[d.groupId].count++;
  });

  // 平均点と総合点を計算
  return Object.values(grouped).map(g => {
    const avgA = average(g.scoresA);
    const avgB = average(g.scoresB);
    const avgC = average(g.scoresC);
    return {
      groupId:   g.groupId,
      groupName: g.groupName,
      avgA,
      avgB,
      avgC,
      total: avgA + avgB + avgC,  // 総合点 = 3観点の平均の合計（最大15点）
      count: g.count
    };
  });
}

// ── 平均値計算ユーティリティ ─────────────
function average(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((sum, v) => sum + v, 0) / arr.length;
}

// ── 小数点1桁でフォーマット ───────────────
function fmt(num) {
  return num.toFixed(2);
}

// ── ランキングカードを生成 ────────────────
/**
 * TOP3ランキングカードをコンテナに表示する
 * @param {string} containerId - 表示先コンテナID
 * @param {Array}  sorted      - ソート済みグループ配列
 * @param {string} scoreKey    - 表示するスコアキー ('avgA' | 'avgB' | 'avgC' | 'total')
 * @param {string} unit        - スコアの単位（例：'/ 5', '/ 15'）
 */
function renderRankCards(containerId, sorted, scoreKey, unit) {
  const container = $(containerId);
  container.innerHTML = '';

  if (sorted.length === 0) {
    container.innerHTML = '<div style="color:var(--color-muted); font-size:0.9rem; padding:12px;">データなし</div>';
    return;
  }

  const top3 = sorted.slice(0, 3);
  const rankLabels = ['🥇', '🥈', '🥉'];

  top3.forEach((group, i) => {
    const rank = i + 1;
    const score = group[scoreKey];

    const card = document.createElement('div');
    card.className = `rank-card rank-${rank}`;
    card.innerHTML = `
      <div class="rank-number">${rankLabels[i]}</div>
      <div class="rank-info">
        <div class="rank-group-name">${escapeHtml(group.groupName)}</div>
        <div class="rank-score-detail">採点数：${group.count}</div>
      </div>
      <div class="rank-score">${fmt(score)}<small> ${unit}</small></div>
    `;
    container.appendChild(card);
  });
}

// ── 全グループ一覧テーブルを生成 ──────────
function renderTable(groups) {
  const tbody = $('results-table-body');
  tbody.innerHTML = '';

  // 総合点でソート（降順）
  const sorted = [...groups].sort((a, b) => b.total - a.total);

  sorted.forEach((group, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color:var(--color-muted); font-family:var(--font-data);">${i + 1}</td>
      <td class="group-name">${escapeHtml(group.groupName)}</td>
      <td class="score-a">${fmt(group.avgA)}</td>
      <td class="score-b">${fmt(group.avgB)}</td>
      <td class="score-c">${fmt(group.avgC)}</td>
      <td class="score-total">${fmt(group.total)}</td>
      <td style="color:var(--color-muted);">${group.count}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ── HTMLエスケープ（XSS防止） ─────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── カテゴリ名の更新 ─────────────────────
function updateCategoryLabels(categories) {
  if (!categories || categories.length < 3) return;
  categoryNames.a = categories[0].name || 'A部門';
  categoryNames.b = categories[1].name || 'B部門';
  categoryNames.c = categories[2].name || 'C部門';

  $('award-label-a').innerHTML = `🔵 ${categoryNames.a}賞`;
  $('award-label-b').innerHTML = `🟢 ${categoryNames.b}賞`;
  $('award-label-c').innerHTML = `🩷 ${categoryNames.c}賞`;
  $('th-a').innerHTML = `${categoryNames.a}<br>平均`;
  $('th-b').innerHTML = `${categoryNames.b}<br>平均`;
  $('th-c').innerHTML = `${categoryNames.c}<br>平均`;
}

// ── イベント設定の監視 ────────────────────
db.collection(COLLECTIONS.EVENT).doc(EVENT_DOC_ID)
  .onSnapshot(docSnap => {
    if (!docSnap.exists) return;
    const data = docSnap.data();
    if (data.title) {
      $('event-title-badge').textContent = data.title;
      document.title = `集計結果 - ${data.title}`;
    }
    if (data.categories) {
      updateCategoryLabels(data.categories);
    }
  });

// ── scoresコレクションのリアルタイム監視 ──
/**
 * Firestore onSnapshot で採点データを監視する
 * 新しい採点が追加・変更されるたびにUIを自動更新
 */
db.collection(COLLECTIONS.SCORES)
  .orderBy('scoredAt', 'desc')
  .onSnapshot(snapshot => {

    $('loading').style.display = 'none';

    // データなしの場合
    if (snapshot.empty) {
      $('no-data-msg').style.display = 'block';
      $('results-area').style.display = 'none';
      return;
    }

    $('no-data-msg').style.display = 'none';
    $('results-area').style.display = 'block';

    // 総採点数を更新
    $('total-votes').textContent = snapshot.size;

    // 採点データを集計
    const groups = aggregateScores(snapshot.docs);

    // === 各部門賞ランキング ===
    // A部門賞：A部門平均の高い順
    const sortedByA = [...groups].sort((a, b) => b.avgA - a.avgA);
    renderRankCards('ranking-a', sortedByA, 'avgA', '/ 5');

    // B部門賞：B部門平均の高い順
    const sortedByB = [...groups].sort((a, b) => b.avgB - a.avgB);
    renderRankCards('ranking-b', sortedByB, 'avgB', '/ 5');

    // C部門賞：C部門平均の高い順
    const sortedByC = [...groups].sort((a, b) => b.avgC - a.avgC);
    renderRankCards('ranking-c', sortedByC, 'avgC', '/ 5');

    // 総合賞：総合点の高い順
    const sortedByTotal = [...groups].sort((a, b) => b.total - a.total);
    renderRankCards('ranking-overall', sortedByTotal, 'total', '/ 15');

    // 全グループ一覧テーブル
    renderTable(groups);

  }, error => {
    console.error('Firestoreエラー:', error);
    $('loading').innerHTML = `<span style="color:var(--color-danger);">接続エラー：firebase-config.js の設定を確認してください。</span>`;
  });
