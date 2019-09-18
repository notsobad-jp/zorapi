const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parse');
admin.initializeApp();

/**********************************************************************
* Books
***********************************************************************/
exports.books = functions.https.onRequest((request, response) => {
  // response.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');

  let results = { books: [] };
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
    docRef = setDocRef(docRef, request.query);
    docRef.get().then(function(querySnapshot) {
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
  let results = { persons: [] };
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
    docRef = setDocRef(docRef, request.query)
    docRef.get().then(function(querySnapshot) {
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
  for(let [key, val] of Object.entries(query)) {
    if(["order", "limit", "after", "before"].includes(key)) { continue; }
    docRef = docRef.where(key, "==", val);
  }
  // order, after/before, limit
  if(order = query['order']) {
    let match = order.match(/(.*)([⌃˅]?)/);
    docRef = (match[2]=="⌃") ? docRef.orderBy(match[1]) : docRef.orderBy(match[1], 'desc');
  }
  if(order && (after = query['after'])) { docRef = docRef.startAfter(Number(after)); }
  if(order && (before = query['before'])) { docRef = docRef.endBefore(Number(before)); }
  let limit = Math.min(query['limit'] || 50, 50);
  return docRef.limit(limit);
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
