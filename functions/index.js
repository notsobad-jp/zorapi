const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parse');
const Book = require('./models/book');
const Person = require('./models/person');
admin.initializeApp();
// var serviceAccount = require("./__serviceAccountKey.json");
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: "https://zorapi-f6608.firebaseio.com"
// });


/**********************************************************************
* Books
***********************************************************************/
exports.books = functions.https.onRequest(async (request, response) => {
  // response.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');

  const book = new Book(admin.firestore(), request.query);
  try {
    const results = await book.search();
    response.status(200).send(results);
  }
  catch(error) {
    response.status(500).send({ error: { message: error } });
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
exports.persons = functions.https.onRequest(async (request, response) => {

  const person = new Person(admin.firestore(), request.query);
  try {
    const results = await person.search();
    response.status(200).send(results);
  }
  catch(error) {
    response.status(500).send({ error: { message: error } });
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
