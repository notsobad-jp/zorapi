module.exports = class Collection {
  constructor (firestore, query) {
    this.baseUrl = 'https://api.bungomail.com/v0';
    this.firestore = firestore;
    this.query = query;
    this.limit = Math.min(query['limit'] || 50, 50);
    this.hasNext = false;
  }

  setQueries(docRef) {
    for(let [key, val] of Object.entries(this.query)) {
      if(["limit", "after", "before"].includes(key)) { continue; }
      docRef = docRef.where(key, "==", val);
    }
    return docRef;
  }

  getDocs(querySnapshot) {
    let docs = (this.hasNext) ? querySnapshot.docs.slice(0, querySnapshot.size - 1) : querySnapshot.docs;
    if(this.query["before"]) { docs = docs.reverse(); } // beforeのときは逆順で取ってるで戻す
    return docs;
  }

  // [Next] limit+1取れてるか、beforeが存在すれば next linkつける
  nextLink(docs) {
    if(!this.hasNext && !this.query["before"]) { return; }

    const lastVisible = docs.slice(-1)[0].data();
    let query = JSON.parse(JSON.stringify(this.query));
    query["after"] = this.afterParam(lastVisible);

    let arr = [];
    for(const key in query) {
      if(key == 'before') { continue; }
      arr.push(key + '=' + query[key]);
    }
    let queryString = arr.join('&');
    return this.baseUrl + this.path + "?" + queryString;
  }

  // [Prev] before/afterの有無と、limit+1の組み合わせで判断
  prevLink(docs) {
    if(!this.query["after"] && (!this.query["before"] || !this.hasNext)) { return; }

    const firstVisible = docs[0].data();
    let query = JSON.parse(JSON.stringify(this.query));
    query["before"] = this.beforeParam(firstVisible);

    let arr = [];
    for(let key in query) {
      if(key == 'after') { continue; }
      arr.push(key + '=' + query[key]);
    }
    let queryString = arr.join('&');
    return this.baseUrl + this.path + "?" + queryString;
  }

  orderParam() {
    // beforeがなければ通常のorder
    if(!this.query['before']) { return this.orderBy; }

    // beforeがあるときはorder逆順
    return this.orderBy.map((param) => {
      param[1] = (param[1]=='asc') ? 'desc' : 'asc';  // asc↔desc
      return param;
    })
  }

  setOrder(docRef) {
    for(const param of this.orderParam()) {
      docRef = docRef.orderBy(...param);  // ["作品ID", "asc"] → orderBy("作品ID", "asc")
    }
    return docRef;
  }

  setPaging(docRef) {
    const targetQuery = this.query['after'] || this.query['before'];
    if(!targetQuery) { return docRef; }
    return docRef.startAfter(...this.startAfter(targetQuery));
  }

  async search() {
    this.docRef = this.setQueries(this.docRef);
    this.docRef = this.setOrder(this.docRef);
    this.docRef = this.setPaging(this.docRef);
    const querySnapshot = await this.docRef.limit(this.limit + 1).get();

    // +1件取れてるときは、元の件数に戻す
    this.hasNext = querySnapshot.size == this.limit + 1;
    const docs = this.getDocs(querySnapshot);

    if(this.nextLink(docs)) {
      this.results["links"]["next"] = this.nextLink(docs);
    }

    if(this.prevLink(docs)) {
      this.results["links"]["prev"] = this.prevLink(docs);
    }

    this.results["books"] = docs.map((doc) => { return doc.data(); })
    return this.results;
  }
}
