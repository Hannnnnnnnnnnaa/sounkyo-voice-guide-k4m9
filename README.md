# 層雲峡 音声ガイド 試作

近づくと台本の音声が流れる、現地テスト用のページです（GitHub Pagesで公開）。

## 中身の出どころ
- 台本：Notion「SAKB」の台本DB（MVP採用 にチェック、かつ SKM照合 ＝ 整合済 のものだけ）
- 読み方の修正：Notion「読み上げ辞書」（表記・よみ・アクセント型）
- 事実の裏取り：Notion「SKM_層雲峡ナレッジマップ」

## 台本を直したいとき
1. Notionの台本DBか読み上げ辞書を直す
2. 次のどちらかで音声を作り直す
   - Claudeに「Notionを直したので音声を作り直して」と頼む
   - GitHubの Actions タブ →「Notionから音声を作り直す」→ Run workflow（初回だけ Secrets に NOTION_TOKEN の登録が必要）

## 音声
- 日本語：VOICEVOX（VOICEVOX:冥鳴ひまり／VOICEVOX:九州そら／VOICEVOX:雀松朱司）。ページ上のクレジット表記が利用条件です
- 英語：Kokoro TTS（Apache-2.0）

## 地図
- 地理院タイル（国土地理院）：淡色地図・航空写真・陰影起伏図
- 産総研地質調査総合センター「20万分の1日本シームレス地質図V2」（利用条件は公開前に要確認）
- 場所の座標は観光協会の地図のピンを仮に使用。現地で実測したらNotionの場所DBを更新する

## ページ
- `guide.html` … 場所ページの試作（四季の写真・音声ガイド・解説・他の場所・マップ）
- `index.html` … 現地テスト用（位置で自動再生、記録）

## ファイル
- `guide.json` … 台本と音声ファイルの一覧（ビルドで自動生成）
- `audio/` … 音声（ビルドで自動生成）
- `photos/` … 季節の写真（置き方は photos/README.md）
- `tools/build.py` … Notion → 音声・guide.json を作るスクリプト
