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
  apiKey: "AIzaSyBAS4yzNFGx0hhRDHgCjg26efGpAUoaVhg",
  authDomain: "votingv2-43230.firebaseapp.com",
  projectId: "votingv2-43230",
  storageBucket: "votingv2-43230.firebasestorage.app",
  messagingSenderId: "628259110731",
  appId: "1:628259110731:web:1a419de776c0dd273af2ce"
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
