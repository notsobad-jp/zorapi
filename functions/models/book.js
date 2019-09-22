const Collection = require('./collection');

module.exports = class Book extends Collection {
  constructor (firestore, query) {
    super(firestore, query);
    this.path = "/books";
    this.results = { books: [], links: {} };
    this.docRef = firestore.collection("books");
    this.orderBy = [["累計アクセス数", "desc"], ["作品ID", "asc"]];
  }

  startAfter(targetQuery) {
    const match = targetQuery.match(/(\d+),(\d+)/);
    [Number(match[1]), match[2]];
  }

  afterParam(lastVisible) {
    return `${lastVisible["累計アクセス数"]},${lastVisible["作品ID"]}`;
  }

  beforeParam(firstVisible) {
    return `${firstVisible["累計アクセス数"]},${firstVisible["作品ID"]}`;
  }
}
