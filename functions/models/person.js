const Collection = require('./collection');

module.exports = class Person extends Collection {
  constructor (firestore, query) {
    super(firestore, query);
    this.path = "/persons";
    this.results = { persons: [], links: {} };
    this.docRef = firestore.collection("persons");
    this.orderBy = [["人物ID", "asc"]];
  }

  startAfter(targetQuery) {
    [targetQuery];
  }

  afterParam(lastVisible) {
    return lastVisible['人物ID'];
  }

  beforeParam(firstVisible) {
    return firstVisible['人物ID'];
  }
}
