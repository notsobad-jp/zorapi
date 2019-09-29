const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parse');
const ngram = require('n-gram');

var serviceAccount = require("../__serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://zorapi-f6608.firebaseio.com"
});


// Books
let batches = [];
let batch_index = 0;
let records = {};
let docRef = admin.firestore().collection('books');
let rs = fs.createReadStream('../tmp/output.csv');
rs.pipe(csv({columns: true}))
.on('data', (data) => {
  const tokenMap = {};
  for(const token of ngram.bigram(data["作品名"])) {
    tokenMap[token] = true;
  }
  records[data["作品ID"]] = {};
  records[data["作品ID"]]["作品名token"] = tokenMap;
});
rs.on('end', () => {
  let record_index = 0;
  Object.keys(records).forEach(function(key) {
    if(record_index%500==0) {
      batch_index = Math.floor(record_index/500);
      batches[batch_index] = admin.firestore().batch();
    }
    batches[batch_index].update(docRef.doc(key), {"作品名token": records[key]["作品名token"]});
    record_index++;
  });

  for(var i=0; i<batches.length; i++) {
    if(i==0) { continue; }
    batches[i].commit();
  }
});
//
//
// Persons
// let batches = [];
// let record_index = 0;
// let batch_index = 0;
// let docRef = admin.firestore().collection('persons');
// let rs = fs.createReadStream('../tmp/csv/__all_persons.csv'); // git管理しないのでtmp以下に配置
// rs.pipe(csv({columns: true}))
// .on('data', (data) => {
//   if(record_index%500==0) {
//     batch_index = Math.floor(record_index/500);
//     batches[batch_index] = admin.firestore().batch();
//   }
//   const nameTokenMap = {};
//   for(const token of ngram.bigram(data["姓名"])) {
//     nameTokenMap[token] = true;
//   }
//   batches[batch_index].update(docRef.doc(data["人物ID"]), {"姓名token": nameTokenMap});
//   record_index++;
// });
// rs.on('end', () => {
//   for(var i=0; i<batches.length; i++) {
//     batches[i].commit();
//   }
// });
