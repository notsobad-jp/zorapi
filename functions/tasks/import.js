const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parse');

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
let rs = fs.createReadStream('./csv/__all_books.csv');
rs.pipe(csv({columns: true}))
.on('data', (data) => {
  //既にレコードが存在してる場合
  if(records[data["作品ID"]]) {
    // 今回のが著者なら、人物データを引き継いでからデータ上書き
    if(data["役割フラグ"]=='著者') {
      data["人物"] = records[data["作品ID"]]["人物"];
      records[data["作品ID"]] = data;
    }
  }else {
    records[data["作品ID"]] = data;
  }
  // 今回の人物を人物hashに追加
  records[data["作品ID"]]["人物"] = records[data["作品ID"]]["人物"] || {}
  records[data["作品ID"]]["人物"][data["役割フラグ"]] = {
    "人物ID": data["人物ID"],
    "姓名": data["姓名"],
    "姓": data["姓"],
    "名": data["名"],
    "姓読み": data["姓読み"],
    "名読み": data["名読み"],
    "姓読みソート用": data["姓読みソート用"],
    "名読みソート用": data["名読みソート用"],
    "姓ローマ字": data["姓ローマ字"],
    "名ローマ字": data["名ローマ字"],
    "生年月日": data["生年月日"],
    "没年月日": data["没年月日"],
    "人物著作権フラグ": data["人物著作権フラグ"],
  }
});
rs.on('end', () => {
  let record_index = 0;
  Object.keys(records).forEach(function(key) {
    if(record_index%500==0) {
      batch_index = Math.floor(record_index/500);
      batches[batch_index] = admin.firestore().batch();
    }
    batches[batch_index].set(docRef.doc(records[key]["作品ID"]), records[key]);
    record_index++;
  });

  for(var i=0; i<batches.length; i++) {
    batches[i].commit();
  }
});


// // Persons
// let batches = [];
// let record_index = 0;
// let batch_index = 0;
// let docRef = admin.firestore().collection('persons');
// let rs = fs.createReadStream('./csv/__all_persons.csv');
// rs.pipe(csv({columns: true}))
// .on('data', (data) => {
//   if(record_index%500==0) {
//     batch_index = Math.floor(record_index/500);
//     batches[batch_index] = admin.firestore().batch();
//   }
//   batches[batch_index].set(docRef.doc(data["人物ID"]), data);
//   record_index++;
// });
// rs.on('end', () => {
//   for(var i=0; i<batches.length; i++) {
//     batches[i].commit();
//   }
// });
