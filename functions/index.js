const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parse');
admin.initializeApp();

// Books
exports.books = functions.https.onRequest((request, response) => {
  let results = [];
  let docRef = admin.firestore().collection('books');

  // 正規表現があるとき（他のクエリは無視）
  let bookRegex = (request.query['作品名'] || "").match(/\/(.*)\//);
  let personRegex = (request.query['姓名'] || "").match(/\/(.*)\//);
  if(bookRegex || personRegex ) {
    let br = bookRegex ? bookRegex[1] : "";
    let pr = personRegex ? personRegex[1] : "";
    let matchedIDs = doSearch(br, pr).then(function(matchedIDs){
      // TODO: 正規表現時のページング処理
      // if(request.query['after']) { docRef = docRef.startAfter(val); }
      // if(request.query['limit']) { docRef = docRef.limit(val); }
      let docRefs = matchedIDs.map(function(m){ return docRef.doc(m); });
      admin.firestore().getAll(...docRefs).then(function(querySnapshot) {
        querySnapshot.forEach(function(doc) {
          results.push(doc.data());
        });
        response.send(results);
      })
      .catch(function(error) {
        console.log("Error getting documents: ", error);
        response.status(500).send("Failure!!");
      });
    });
  // それ以外はrequestから検索クエリ組み立て
  } else {
    for(let [key, val] of Object.entries(request.query)) {
      if(!Array.isArray(val)) { val = new Array(val); } // 同一カラムに複数クエリのケースがあるので、valは配列に揃える
      val.forEach(v => {
        let match = v.match(/([=<>]*)(.*)/);
        let operator = (match[1]=="") ? '==' : match[1];
        docRef = docRef.where(key, operator, match[2]);
      })
    }
    // order, after, limit
    if(request.query['order']) {
      let match = val.match(/([⌃˅]?)(.*)/);
      docRef = (match[1]=="˅") ? docRef.orderBy(match[2], 'desc') : docRef.orderBy(match[2])
    }
    if(request.query['after']) { docRef = docRef.startAfter(val); }
    if(request.query['limit']) { docRef = docRef.limit(val); }

    docRef.get().then(function(querySnapshot) {
      querySnapshot.forEach(function(doc) {
        results.push(doc.data());
      });
      response.send(results);
    })
    .catch(function(error) {
      console.log("Error getting documents: ", error);
      response.status(500).send("Failure!!");
    });
  }
});


async function doSearch(column, q) {
  let results = await searchBooks(column, q);
  return results;
}

function searchBooks(bookTitle, personName) {
  return new Promise((resolve, reject) => {
    const results = [];
    let bookRegex = new RegExp(bookTitle || ".*");
    let personRegex = new RegExp(personName || ".*");
    rs = fs.createReadStream('csv/books.csv');
    rs.pipe(csv({columns: true}))
      .on('data', (data) => {
        if(data["作品名"].match(bookRegex) && data["姓名"].match(personRegex)){
          results.push(data["作品ID"])
        }
    });
    rs.on('end', () => {
      resolve(results);
    });
  })
}
