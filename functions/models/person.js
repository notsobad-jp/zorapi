const Collection = require('./collection');

module.exports = class Person extends Collection {
  constructor (firestore, query) {
    super(firestore, query);
    this.collection = "persons";
    this.docRef = firestore.collection(this.collection);
    this.orderBy = [["人物ID", "asc"]];
    this.regexColumn = "姓名"; //全文検索対象カラム
  }

  startAfter(targetQuery) {
    [targetQuery];
  }

  pagingParam(doc) {
    return doc['人物ID'];
  }
}
