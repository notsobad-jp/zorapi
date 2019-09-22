const Collection = require('./collection');

module.exports = class Book extends Collection {
  constructor (firestore, query) {
    super(firestore, query);
    this.collection = "books";
    this.docRef = firestore.collection(this.collection);
    this.orderBy = [["累計アクセス数", "desc"], ["作品ID", "asc"]];
    this.regexColumn = "作品名"; //全文検索対象カラム
  }

  startAfter(targetQuery) {
    const match = targetQuery.match(/(\d+),(\d+)/);
    return [Number(match[1]), match[2]];
  }

  pagingParam(doc) {
    return `${doc["累計アクセス数"]},${doc["作品ID"]}`;
  }
}
