# グループ発表 表彰・採点システム

研修・社内イベントで複数グループの発表を3観点でリアルタイム採点・集計するWebシステムです。

---

## 機能概要

| 画面 | ファイル | 用途 |
|------|---------|------|
| 採点ページ | `index.html` | 参加者が各グループを1〜5点で採点 |
| 集計結果ページ | `results.html` | リアルタイム集計・各賞TOP3表示 |
| 管理画面 | `admin.html` | グループ設定・受付開始停止・リセット |

---

## セットアップ手順

### 1. Firebaseプロジェクトを作成する

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力して作成

### 2. Firestoreデータベースを作成する

1. 左メニューの「Firestore Database」をクリック
2. 「データベースを作成」をクリック
3. **「テストモードで開始」** を選択（初期設定）
4. ロケーションは `asia-northeast1`（東京）を推奨

### 3. ウェブアプリを追加する

1. プロジェクトの設定（歯車アイコン）→「プロジェクトの設定」
2. 「マイアプリ」セクションで `</>` アイコンをクリック
3. アプリのニックネームを入力して「アプリを登録」
4. 表示される `firebaseConfig` の値をコピーする

### 4. `firebase-config.js` を編集する

```javascript
const firebaseConfig = {
  apiKey: "ここにAPIキーを貼り付け",
  authDomain: "ここにauthDomainを貼り付け",
  projectId: "ここにprojectIdを貼り付け",
  storageBucket: "ここにstorageBucketを貼り付け",
  messagingSenderId: "ここにmessagingSenderIdを貼り付け",
  appId: "ここにappIdを貼り付け"
};
```

### 5. Firestoreセキュリティルールを設定する

Firebase ConsoleのFirestoreルールタブに以下を貼り付けてください。

**テスト・学習用（簡易ルール）：**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

> ⚠️ 上記はデモ用です。本番利用では後述の推奨ルールを使用してください。

### 6. ファイルをホスティングする

**Firebase Hostingを使う場合：**

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

**GitHub Pagesを使う場合：**
- リポジトリにファイルをプッシュ
- Settings → Pages → ブランチを選択して公開

**ローカルで確認する場合：**
- `index.html` をブラウザで直接開く（CORSエラーになる場合はローカルサーバーを使用）
- VSCode の「Live Server」拡張機能が便利です

---

## 使い方

### イベント前の準備

1. `admin.html` にアクセス（デフォルトパスワード：`admin1234`）
2. イベント名と3つの評価カテゴリを設定して保存
3. グループ数を入力して「グループを一括作成」
4. 「受付を開始する」ボタンを押す

### 発表中

1. 管理者が「現在の評価グループ」を切り替える
2. 参加者・審査員が `index.html` にアクセスして採点

### 発表後

1. `results.html` で各賞TOP3を確認
2. A部門賞・B部門賞・C部門賞・総合賞を発表
3. 必要に応じてCSVをダウンロード

---

## 管理者パスワードの変更

`admin.js` の先頭にある以下の行を変更してください：

```javascript
const ADMIN_PASSWORD = 'admin1234'; // ← ここを変更
```

---

## 二重採点防止の仕組みと限界

### 現在の実装

`localStorage` を使って、同一ブラウザ・同一グループへの二重採点を防止しています。

```javascript
// 採点済みとしてlocalStorageに記録
localStorage.setItem(`scored_group_${groupId}`, 'true');
```

### ⚠️ 限界と注意点

| 状況 | 対策 |
|------|------|
| 同じブラウザのシークレットモード | **防止できません** |
| 別のブラウザを使用 | **防止できません** |
| 別の端末・スマートフォン | **防止できません** |
| localStorageを手動削除 | **防止できません** |

### 本番環境向け推奨対策

- **Firebase Authentication** を導入して参加者を識別する
- **ワンタイムURL** を発行して1人1票を保証する
- **参加者ID・審査員ID** を入力させる
- Firestoreのセキュリティルールで `evaluatorId + groupId` の組み合わせを一意にする

---

## Firestoreデータ構造

### `event/current`
```
{
  title: "グループ発表 表彰採点",
  isOpen: true,
  currentGroupId: "group_01",
  categories: [
    { name: "A部門", description: "企画力・着眼点・独自性" },
    { name: "B部門", description: "発表力・わかりやすさ・説得力" },
    { name: "C部門", description: "実現可能性・完成度・チームワーク" }
  ],
  updatedAt: Timestamp
}
```

### `groups/{groupId}`
```
{
  groupName: "1グループ",
  order: 1
}
```

### `scores/{autoId}`
```
{
  groupId: "group_01",
  groupName: "1グループ",
  evaluatorId: "eval_xxx",
  categoryA: 4,
  categoryB: 3,
  categoryC: 5,
  totalScore: 12,
  comment: "発表がわかりやすかった",
  scoredAt: Timestamp
}
```

---

## 採点ロジック

| 指標 | 計算方法 | 最大値 |
|------|---------|--------|
| 各部門平均点 | 部門別合計 ÷ 採点数 | 5.00 |
| 総合点 | A平均 + B平均 + C平均 | 15.00 |
| 各賞 | 該当指標の高い順TOP3 | - |

---

## 本番向けセキュリティルール（参考）

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 全員がscoresを書き込み可能、読み込みは不可
    match /scores/{scoreId} {
      allow create: if true;
      allow read, update, delete: if false;
    }
    // 全員がevent・groupsを読み込み可能
    match /event/{docId} {
      allow read: if true;
      allow write: if false; // 管理者のみ（要Firebase Auth実装）
    }
    match /groups/{groupId} {
      allow read: if true;
      allow write: if false; // 管理者のみ
    }
  }
}
```

---

## ファイル構成

```
scoring-system/
├── index.html        # 採点ページ
├── results.html      # 集計・表彰結果ページ
├── admin.html        # 管理画面
├── style.css         # 共通スタイル
├── firebase-config.js # Firebase設定（要変更）
├── app.js            # 採点ページのJavaScript
├── results.js        # 集計ページのJavaScript
├── admin.js          # 管理画面のJavaScript
└── README.md         # このファイル
```

---

## トラブルシューティング

**Q. 「接続エラー」が表示される**
→ `firebase-config.js` の設定値が正しいか確認してください。

**Q. localStorageを削除して再採点したい（テスト目的）**
→ ブラウザの開発者ツール → Application → Local Storage → サイトを選択 → データを削除

**Q. results.html がリアルタイムで更新されない**
→ Firestoreのセキュリティルールで読み取りが許可されているか確認してください。

**Q. グループ数を変更したい**
→ admin.html → グループ管理 → グループ数を変更して「グループを一括作成」を押してください。
