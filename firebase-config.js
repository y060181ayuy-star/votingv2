/**
 * firebase-config.js
 * Firebase設定ファイル
 *
 * 【使い方】
 * 1. Firebase Console (https://console.firebase.google.com/) でプロジェクトを作成
 * 2. Firestoreデータベースを作成（テストモードで開始）
 * 3. プロジェクトの設定 > マイアプリ > ウェブアプリを追加
 * 4. 表示された設定値をこのファイルの firebaseConfig に貼り付ける
 */

// ====================================================
// ここにFirebaseの設定値を貼り付けてください
// ====================================================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Firebase初期化
firebase.initializeApp(firebaseConfig);

// Firestoreインスタンスをグローバルに公開
const db = firebase.firestore();

// コレクション名の定数（変更する場合はここを修正）
const COLLECTIONS = {
  EVENT: "event",       // イベント設定
  GROUPS: "groups",     // グループ情報
  SCORES: "scores"      // 採点データ
};

// イベント設定のドキュメントID
const EVENT_DOC_ID = "current";
