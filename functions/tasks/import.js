const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parse');

var serviceAccount = require("../__serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://zorapi-f6608.firebaseio.com"
});


let batches = [];
let record_index = 0;
let batch_index = 0;
let docRef = admin.firestore().collection('persons');
let rs = fs.createReadStream('./csv/__all_persons.csv');
rs.pipe(csv({columns: true}))
.on('data', (data) => {
  if(record_index%500==0) {
    batch_index = Math.floor(record_index/500);
    batches[batch_index] = admin.firestore().batch();
  }
  if(record_index<20) {
    let birthDateMatch = data["生年月日"].match(/(\d{4})-(\d{1,2})-(\d{2})/);
    if(birthDateMatch) { data["生年月日"] = admin.firestore.Timestamp.fromDate(new Date(birthDateMatch[1] + "-" + Number(birthDateMatch[2]) + "-" + Number(birthDateMatch[3]) + " 00:00:00")); }
    console.log(data);
    batches[batch_index].set(docRef.doc(data["人物ID"]), data);
  }
  record_index++;
});
rs.on('end', () => {
  batches[0].commit().then(function(){
    console.log("finished!")
  });
});



// let docRef = admin.firestore().collection('persons').doc("148");
// docRef.get().then((querySnapshot) => {
//   // console.log(querySnapshot.data());
//   console.log(querySnapshot.data()["生年月日"]);
//   console.log(querySnapshot.data()["生年月日"].toDate());
//   // querySnapshot.forEach(function(doc) {
//   //   results.push(doc.data());
//   // });
//   // response.send("Hello from Firebase!");
// })
// .catch(function(error) {
//   console.log("Error getting documents: ", error);
//   // response.status(500).send("Failure!!");
// });
