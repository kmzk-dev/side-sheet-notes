// 拡張機能アイコンがクリックされた時の処理
chrome.action.onClicked.addListener((tab) => {
  // クリックされたタブが属するウィンドウでサイドバーを開く
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// オプション: インストール時に「アイコンクリックでサイドバーを開く」デフォルト挙動を確実にセットする設定
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));
});