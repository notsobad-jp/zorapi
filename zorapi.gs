function doGet(e) {
  var sheetId = "1n04e6POI04TBt-3HJUH10-T5cxhPZHcBWmFA4tSHjqE";
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = e["parameter"]["type"] || "books";
  var sheet = ss.getSheetByName(sheetName);
  var limit = 30;  // デフォルトの検索表示件数

  if(sheetName == "books") {
    var titles = ["作品ID","作品名","作品名読み","ソート用読み","副題","副題読み","原題","初出","分類番号","文字遣い種別","作品著作権フラグ","公開日","最終更新日","図書カードURL","人物ID","姓","名","姓読み","名読み","姓読みソート用","名読みソート用","姓ローマ字","名ローマ字","役割フラグ","生年月日","没年月日","人物著作権フラグ","底本名1","底本出版社名1","底本初版発行年1","入力に使用した版1","校正に使用した版1","底本の親本名1","底本の親本出版社名1","底本の親本初版発行年1","底本名2","底本出版社名2","底本初版発行年2","入力に使用した版2","校正に使用した版2","底本の親本名2","底本の親本出版社名2","底本の親本初版発行年2","入力者","校正者","テキストファイルURL","テキストファイル最終更新日","テキストファイル符号化方式","テキストファイル文字集合","テキストファイル修正回数","XHTML/HTMLファイルURL","XHTML/HTMLファイル最終更新日","XHTML/HTMLファイル符号化方式","XHTML/HTMLファイル文字集合","XHTML/HTMLファイル修正回数","文字数","書き出し","累計アクセス数","カテゴリ"];
    var numRows = 16600;
  } else {
    var titles = ["人物ID","姓名","姓","名","姓読み","名読み","姓読みソート用","名読みソート用","姓ローマ字","名ローマ字","生年月日","没年月日","人物著作権フラグ"];
    var numRows = 1105;
  }
  // カラム数から最終カラムのA1Notationを計算
  var numColumns = titles.length;
  var digitTwo = (quotient = Math.floor(numColumns/26) ) ? String.fromCharCode(96 + quotient) : "";
  var numColumnsChar = digitTwo + String.fromCharCode(96 + numColumns%26);

  // parseしたクエリを順番に実行して、検索結果をmergeする
  var noQueryFlg = true;
  var matchRowNums = [];
  for(key in e["parameter"]) {
    var query = e["parameter"][key];
    var searchColumnNum = titles.indexOf(key) + 1; // 検索対象列の列番号取得
    if(searchColumnNum==0) { continue }; // 見出し行に含まれないクエリは無視

    // [正規表現] 検索条件が//で囲まれてる場合は正規表現検索
    var regexMatch = e["parameter"][key].match(/\/(.*)\//);
    if(regexMatch) { query = regexMatch[1]; }

    // [完全一致] 検索条件が""で囲まれてる場合は完全一致検索
    var entireMatch = e["parameter"][key].match(/"(.*)"/);
    if(entireMatch) { query = entireMatch[1]; }

    // 検索実行: マッチしたセルが返ってくるので、row番号を配列に格納しておく
    var textFinder = sheet.getRange(2,searchColumnNum,numRows,1).createTextFinder(query).useRegularExpression(Boolean(regexMatch)).matchEntireCell(Boolean(entireMatch));
    var rowNums = textFinder.findAll().map(function(v){ return v.getRowIndex(); });

    // 前回までの条件でヒットしてるrowNumsとの積集合を取得（AND検索）
    matchRowNums = (noQueryFlg) ? rowNums : matchRowNums.filter(function(m){ return rowNums.indexOf(m) >= 0 });
    noQueryFlg = false;
  }

  // ページング
  if(!isNaN(e["parameter"]["limit"])) { limit = Math.min(limit, e["parameter"]["limit"]); }
  var offset = (isNaN(e["parameter"]["offset"])) ? 0 : Number(e["parameter"]["offset"]);
  var totalCount = noQueryFlg ? numRows : matchRowNums.length;  // 検索の総ヒット件数
  matchRowNums = matchRowNums.slice(offset, offset + limit);
  if(noQueryFlg) {
    var startRow = offset + 2; //offsetが0スタートなので+1, 見出し行をスキップでさらに+1
    for(var i=startRow; i<(startRow+limit); i++) { matchRowNums.push(i); }  // 検索クエリがないときは、[0..50]みたいにそのまま上から順番に取得
  }

  // rangeListからまとめてデータ取得
  var ranges = matchRowNums.map(function(m){ return sheetName + "!A" + m + ":" + numColumnsChar + m; });
  var valueRanges = (ranges.length > 0) ? Sheets.Spreadsheets.Values.batchGet(sheetId, {ranges: ranges})["valueRanges"] : [];

  // 検索結果を整形してレスポンス作成
  var responseData = { items: [], totalCount: totalCount };
  for(var i=0; i<valueRanges.length; i++) {
    // 行データを見出し付きhashに整形
    var row = valueRanges[i]["values"][0];
    var json = {}
    for(var j=0; j<numColumns; j++) {
      json[titles[j]] = row[j];
    }
    responseData["items"].push(json);
  };
  return ContentService.createTextOutput(JSON.stringify(responseData));
}
