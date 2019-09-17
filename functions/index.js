const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parse');
admin.initializeApp();

/**********************************************************************
* Books
***********************************************************************/
exports.books = functions.https.onRequest((request, response) => {
  let results = { books: [] };
  let docRef = admin.firestore().collection('books');

  // 正規表現があるとき（他のクエリは無視）
  let regex = (request.query['作品名'] || "").match(/\/(.*)\//);
  if(regex) {
    let matchedIDs = search("books", regex[1], request.query['人物ID']).then(function(matchedIDs){
      // 正規表現時のページング処理
      let limit = Math.min(request.query['limit'] || 50, 50);
      if(before = request.query['before']) {
        let startIndex = matchedIDs.findIndex(before) - limit;
      }else {
        let startIndex = (after = request.query['after']) ? matchedIDs.findIndex(after) + 1 : 0;
      }
      matchedIDs = matchedIDs.slice(startIndex, startIndex + limit);

      let docRefs = matchedIDs.map(function(m){ return docRef.doc(m); });
      admin.firestore().getAll(...docRefs).then(function(querySnapshot) {
        querySnapshot.forEach(function(doc) {
          results["books"].push(doc.data());
        });
        response.status(200).send(results);
      })
      .catch(function(error) {
        response.status(500).send(error);
      });
    });
  // それ以外はrequestから検索クエリ組み立て
  } else {
    for(let [key, val] of Object.entries(request.query)) {
      if(["order", "limit", "after", "before"].include(key)) { continue; }
      docRef = docRef.where(key, "==", val);
    }
    // order, after/before, limit
    if(order = request.query['order']) {
      let match = order.match(/(.*)([⌃˅]?)/);
      docRef = (match[2]=="⌃") ? docRef.orderBy(match[1]) : docRef.orderBy(match[1], 'desc');
    }
    if(after = request.query['after']) { docRef = docRef.startAfter(after); }
    if(before = request.query['before']) { docRef = docRef.endBefore(before); }
    let limit = Math.min(request.query['limit'] || 50, 50);
    docRef = docRef.limit(limit);

    docRef.get().then(function(querySnapshot) {
      querySnapshot.forEach(function(doc) {
        results["books"].push(doc.data());
      });
      response.status(200).send(results);
    })
    .catch(function(error) {
      response.status(500).send("Failure!!");
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
    response.status(500).send("Failure!!");
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
    let matchedIDs = search("persons", regex[1]).then(function(matchedIDs){
      // 正規表現時のページング処理
      let limit = Math.min(request.query['limit'] || 50, 50);
      if(before = request.query['before']) {
        let startIndex = matchedIDs.findIndex(before) - limit;
      }else {
        let startIndex = (after = request.query['after']) ? matchedIDs.findIndex(after) + 1 : 0;
      }
      matchedIDs = matchedIDs.slice(startIndex, startIndex + limit);

      let docRefs = matchedIDs.map(function(m){ return docRef.doc(m); });
      admin.firestore().getAll(...docRefs).then(function(querySnapshot) {
        querySnapshot.forEach(function(doc) {
          results["persons"].push(doc.data());
        });
        response.status(200).send(results);
      })
      .catch(function(error) {
        response.status(500).send(error);
      });
    });
  // それ以外はrequestから検索クエリ組み立て
  } else {
    for(let [key, val] of Object.entries(request.query)) {
      if(["order", "limit", "after", "before"].include(key)) { continue; }
      docRef = docRef.where(key, "==", val);
    }
    // order, after/before, limit
    if(order = request.query['order']) {
      let match = order.match(/(.*)([⌃˅]?)/);
      docRef = (match[2]=="⌃") ? docRef.orderBy(match[1]) : docRef.orderBy(match[1], 'desc');
    }
    if(after = request.query['after']) { docRef = docRef.startAfter(after); }
    if(before = request.query['before']) { docRef = docRef.endBefore(before); }
    let limit = Math.min(request.query['limit'] || 50, 50);
    docRef = docRef.limit(limit);

    docRef.get().then(function(querySnapshot) {
      querySnapshot.forEach(function(doc) {
        results["persons"].push(doc.data());
      });
      response.status(200).send(results);
    })
    .catch(function(error) {
      response.status(500).send("Failure!!");
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
    response.status(500).send("Failure!!");
  });
});




/**********************************************************************
* Functions
***********************************************************************/
async function search(type, keyword, personId) {
  if(type=="books") {
    let results = await searchBooks(keyword, personId);
  }else {
    let results = await searchPersons(keyword);
  }
  return results;
}

function searchBooks(bookTitle, personId) {
  return new Promise((resolve, reject) => {
    const results = [];
    let bookRegex = new RegExp(bookTitle);
    let personRegex = (personId) ? new RegExp("\""+ personId +"\"") : new RegExp(".*"); // ID指定があれば完全一致、なければ何でもヒットするように
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
