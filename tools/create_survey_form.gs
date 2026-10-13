/**
 * 層雲峡ガイドのアンケート用Googleフォームを作るスクリプト（1回だけ実行する）
 *
 * 使い方
 * 1. https://script.google.com を開き「新しいプロジェクト」
 * 2. 最初からある中身を全部消して、このファイルの中身を貼り付ける
 * 3. 上の「実行」を押す（初回だけ「権限を確認」→ 自分のアカウントを選んで許可）
 * 4. 下の「実行ログ」に出た3行（フォーム・集計シート・事前入力URL）をClaudeに送る
 *
 * 質問はすべて「記述式」。答えはガイドのページでタップしてもらい、ページから自動で送られる。
 * フォームの質問名は変えないこと（ページ側とこの名前で対応している）。
 */
const FIELDS = ["回答ID", "場所", "言語", "音声", "見たもの", "満足度", "どこから", "国・地域",
                "誰と", "聞きたい話", "キャラ", "払える金額", "ひとこと"];

function createSurveyForm() {
  const form = FormApp.create("層雲峡ガイド アンケート（ページから自動送信）");
  form.setDescription("層雲峡の場所ガイドのページで答えた内容が、ここに自動で届きます。直接は答えないでください。");
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setLimitOneResponsePerUser(false);
  form.setShowLinkToRespondAgain(false);
  try { form.setRequireLogin(false); } catch (e) {}
  const items = FIELDS.map(t => form.addTextItem().setTitle(t));

  const sheet = SpreadsheetApp.create("層雲峡ガイド アンケート 回答");
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());
  try { form.setPublished(true); } catch (e) {}
  form.setAcceptingResponses(true);

  // 事前入力URLから、各質問の entry 番号がわかる
  const r = form.createResponse();
  items.forEach((it, i) => r.withItemResponse(it.createResponse("Q" + i)));
  Logger.log("フォーム: " + form.getPublishedUrl());
  Logger.log("集計シート: " + sheet.getUrl());
  Logger.log("事前入力URL: " + r.toPrefilledUrl());
}
