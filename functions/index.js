const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parse');
admin.initializeApp();

// Books
exports.books = functions.https.onRequest((request, response) => {
  let results = { books: [], links: {} };
  let docRef = admin.firestore().collection('books');

  // 正規表現があるとき（他のクエリは無視）
  let bookRegex = (request.query['作品名'] || "").match(/\/(.*)\//);
  if(bookRegex) {
    let matchedIDs = doSearch(bookRegex[1], request.query['人物ID']).then(function(matchedIDs){
      // 正規表現時のページング処理
      let startIndex = (after = request.query['after']) ? matchedIDs.findIndex(after) : -1;
      let limit = Math.min(request.query['limit'] || 50, 50);
      matchedIDs = matchedIDs.slice(startIndex + 1, startIndex + limit);

      // TODO: next/prevリンク組み立て

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
    
    // TODO: next/prevリンク組み立て

    docRef.get().then(function(querySnapshot) {
      querySnapshot.forEach(function(doc) {
        results["books"].push(doc.data());
      });
      response.status(200).send(results);
    })
    .catch(function(error) {
      console.log("Error getting documents: ", error);
      response.status(500).send("Failure!!");
    });
  }
});


async function doSearch(bookTitle, personId) {
  let results = await searchBooks(bookTitle, personId);
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
