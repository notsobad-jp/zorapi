const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parse');

var serviceAccount = require("../__serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://zorapi-f6608.firebaseio.com"
});



// Count books
const defaultCount = { all: 0, flash: 0, shortshort: 0, short: 0, novelette: 0, novel: 0 }
const results = {all: JSON.parse(JSON.stringify(defaultCount))};
const rs = fs.createReadStream('../tmp/output.csv');
rs.pipe(csv({columns: true}))
.on('data', (data) => {
  results[data["人物ID"]] = results[data["人物ID"]] || JSON.parse(JSON.stringify(defaultCount));
  if(!data["カテゴリ"]) { return; }
  results[data["人物ID"]][data["カテゴリ"]] = results[data["人物ID"]][data["カテゴリ"]] || 0;
  results[data["人物ID"]]["all"]++;
  results[data["人物ID"]][data["カテゴリ"]]++;

  results["all"]["all"]++;
  results["all"][data["カテゴリ"]]++;
});
rs.on('end', () => {
  fs.writeFileSync("../tmp/booksCount.json", JSON.stringify(results));
});



// // Import to Firebase
// const booksCountJSON = JSON.parse(fs.readFileSync(`../tmp/booksCount.json`));
// const hoge = {};
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
//   data["作品数"] = booksCountJSON[data["人物ID"]];
//   hoge[data["人物ID"]] = data;
//   batches[batch_index].update(docRef.doc(data["人物ID"]), data);
//   record_index++;
// });
// rs.on('end', () => {
//   for(var i=0; i<batches.length; i++) {
//     batches[i].commit();
//   }
// });
