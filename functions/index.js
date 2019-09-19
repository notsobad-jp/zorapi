const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parse');
admin.initializeApp();

const baseUrl = 'https://api.bungomail.com';
const version = "v0";

/**********************************************************************
* Books
***********************************************************************/
exports.books = functions.https.onRequest((request, response) => {
  // response.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');

  let results = { books: [], links: {} };
  let docRef = admin.firestore().collection('books');

  // 正規表現があるとき（他のクエリは無視）
  let regex = (request.query['作品名'] || "").match(/\/(.*)\//);
  if(regex) {
    search("books", regex[1], request.query['人物ID']).then(function(matchedIDs){
      let docRefs = setDocRefs(docRef, matchedIDs, request.query);
      if(docRefs.length==0) { response.status(200).send(results); } // 検索結果がゼロ件のとき
      admin.firestore().getAll(...docRefs).then(function(querySnapshot) {
        querySnapshot.forEach(function(doc) {
          results["books"].push(doc.data());
        });
        response.status(200).send(results);
      })
      .catch(function(error) {
        response.status(500).send({ error: { message: error } });
      });
    });
  // それ以外はrequestから検索クエリ組み立て
  } else {
    let limit = Math.min(request.query['limit'] || 50, 50);
    docRef = setDocRef(docRef, request.query);
    docRef.limit(limit + 1).get().then(function(querySnapshot) {
      let docLength = querySnapshot.docs.length;
      let hasNext = docLength == limit + 1;

      // +1件取れてるときは、元の件数に戻す
      if(hasNext) {
        let sliceIndex = request.query["before"] ? [1, docLength] : [0, docLength - 1];
        querySnapshot.docs = querySnapshot.docs.slice(...sliceIndex);
      }
      // [Next] limit+1取れてるかどうかだけで判断
      if(hasNext) {
        results["links"]["next"] = nextLink(request, querySnapshot.docs.slice(-1)[0]);
      }
      // [Prev] before/afterの有無と、limit+1の組み合わせで判断
      if(request.query["after"] || (request.query["before"] && hasNext)) {
        results["links"]["prev"] = prevLink(request, querySnapshot.docs[0]);
      }

      querySnapshot.forEach(function(doc) {
        results["books"].push(doc.data());
      });
      response.status(200).send(results);
    })
    .catch(function(error) {
      response.status(500).send({ error: { message: error } });
    });
  }
});


/**********************************************************************
* Book
***********************************************************************/
exports.book = functions.https.onRequest((request, response) => {
  let results = { book: {} };
  const id = request.path.match(/\/books\/(\d*)/)[1]
  let docRef = admin.firestore().collection('books').doc(id);

  docRef.get().then(function(doc) {
    results["book"] = doc.data();
    response.status(200).send(results);
  })
  .catch(function(error) {
    response.status(500).send({ error: { message: error } });
  });
});


/**********************************************************************
* Persons
***********************************************************************/
exports.persons = functions.https.onRequest((request, response) => {
  let results = { persons: [], links: {} };
  let docRef = admin.firestore().collection('persons');

  // 正規表現があるとき（他のクエリは無視）
  let regex = (request.query['姓名'] || "").match(/\/(.*)\//);
  if(regex) {
    search("persons", regex[1]).then(function(matchedIDs){
      let docRefs = setDocRefs(docRef, matchedIDs, request.query);
      if(docRefs.length==0) { response.status(200).send(results); } // 検索結果がゼロ件のとき
      admin.firestore().getAll(...docRefs).then(function(querySnapshot) {
        querySnapshot.forEach(function(doc) {
          results["persons"].push(doc.data());
        });
        response.status(200).send(results);
      })
      .catch(function(error) {
        response.status(500).send({ error: { message: error } });
      });
    });
  // それ以外はrequestから検索クエリ組み立て
  } else {
    let limit = Math.min(request.query['limit'] || 50, 50);
    docRef = setDocRef(docRef, request.query)
    docRef.limit(limit + 1).get().then(function(querySnapshot) {
      querySnapshot.forEach(function(doc) {
        results["persons"].push(doc.data());
      });
      response.status(200).send(results);
    })
    .catch(function(error) {
      response.status(500).send({ error: { message: error } });
    });
  }
});


/**********************************************************************
* Person
***********************************************************************/
exports.person = functions.https.onRequest((request, response) => {
  let results = { person: {} };
  const id = request.path.match(/\/persons\/(\d*)/)[1]
  let docRef = admin.firestore().collection('persons').doc(id);

  docRef.get().then(function(doc) {
    results["person"] = doc.data();
    response.status(200).send(results);
  })
  .catch(function(error) {
    response.status(500).send({ error: { message: error } });
  });
});




/**********************************************************************
* Functions
***********************************************************************/
async function search(type, keyword, personId) {
  let searchResults = "";
  if(type=="books") {
    searchResults = await searchBooks(keyword, personId);
  }else {
    searchResults = await searchPersons(keyword);
  }
  return searchResults;
}

function searchBooks(bookTitle, personId) {
  return new Promise((resolve, reject) => {
    const results = [];
    let bookRegex = new RegExp(bookTitle);
    let personRegex = (personId) ? new RegExp(`^${personId}$`) : new RegExp(".*"); // ID指定があれば完全一致、なければ何でもヒットするように
    rs = fs.createReadStream('csv/books.csv');
    rs.pipe(csv({columns: true}))
      .on('data', (data) => {
        if(data["作品名"].match(bookRegex) && data["人物ID"].match(personRegex)){
          results.push(data["作品ID"])
        }
    });
    rs.on('end', () => {
      resolve(results);
    });
  })
}

function searchPersons(personName) {
  return new Promise((resolve, reject) => {
    const results = [];
    let personRegex = new RegExp(personName);
    rs = fs.createReadStream('csv/persons.csv');
    rs.pipe(csv({columns: true}))
      .on('data', (data) => {
        if(data["姓名"].match(personRegex)){
          results.push(data["人物ID"])
        }
    });
    rs.on('end', () => {
      resolve(results);
    });
  })
}

// 通常のクエリ検索のときのページング処理
function setDocRef(docRef, query) {
  let collection = docRef.path; // books OR persons

  for(let [key, val] of Object.entries(query)) {
    if(["limit", "after", "before"].includes(key)) { continue; }
    docRef = docRef.where(key, "==", val);
  }

  // order, after/before, limit
  if(collection == 'books') {
    docRef = docRef.orderBy("累計アクセス数", "desc").orderBy("作品ID");
    if(query['after']) {
      after = query['after'].match(/(\d)+,(\d)+/);
      docRef = docRef.startAfter(Number(after[1]), after[2]);
    }
    if(query['before']) {
      before = query['before'].match(/(\d)+,(\d)+/);
      docRef = docRef.startAfter(Number(before[1]), before[2]);
    }
  } else {
    docRef = docRef.orderBy("人物ID");
    if(after = query['after']) { docRef = docRef.startAfter(Number(after)); }
    if(before = query['before']) { docRef = docRef.endBefore(Number(before)); }
  }
  return docRef;
}

// 正規表現のときのページング処理
function setDocRefs(docRef, matchedIDs, query) {
  let limit = Math.min(query['limit'] || 50, 50);
  let startIndex = 0;
  if(before = query['before']) {
    startIndex = matchedIDs.findIndex(before) - limit;
  }else if(after = query['after']) {
    startIndex = matchedIDs.findIndex(after) + 1;
  }
  matchedIDs = matchedIDs.slice(startIndex, startIndex + limit);

  return matchedIDs.map(function(m){ return docRef.doc(m); });
}


function nextLink(request, lastVisible) {
  let collection = request.path.match(/(books|persons)/)[1];
  request.query["after"] = (collection == 'books') ? `${lastVisible["累計アクセス数"]},${lastVisible["作品ID"]}` : lastVisible["人物ID"];

  let arr = [];
  for(let key in request.query) {
    arr.push(key + '=' + request.query[key]);
  }
  let queryString = arr.join('&');
  return baseUrl + request.path + "?" + queryString;
}


function prevLink(request, firstVisible) {
  let collection = request.path.match(/(books|persons)/)[1];
  request.query["before"] = (collection == 'books') ? `${firstVisible["累計アクセス数"]},${firstVisible["作品ID"]}` : firstVisible["人物ID"];

  let arr = [];
  for(let key in request.query) {
    arr.push(key + '=' + request.query[key]);
  }
  let queryString = arr.join('&');
  return baseUrl + request.path + "?" + queryString;
}
