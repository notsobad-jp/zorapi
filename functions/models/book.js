const Collection = require('./collection');

module.exports = class Book extends Collection {
  constructor (firestore, query) {
    super(firestore, query);
    this.collection = "books";
    this.docRef = firestore.collection(this.collection);
    this.orderBy = [["累計アクセス数", "desc"], ["作品ID", "asc"]];
    this.regexColumn = "作品名"; //全文検索対象カラム
    this.allowedColumns = ["作品ID","作品名","文字遣い種別","作品著作権フラグ","人物ID","姓名","姓","名","人物著作権フラグ","入力者","校正者","カテゴリ"];
  }

  startAfter(targetQuery) {
    const match = targetQuery.match(/(\d+),(\d+)/);
    return [Number(match[1]), match[2]];
  }

  pagingParam(doc) {
    return `${doc["累計アクセス数"]},${doc["作品ID"]}`;
  }
}
