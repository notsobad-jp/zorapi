const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fs = require('fs');
const cors = require('cors')({ origin: true });
const URL = require('url').URL;
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
  cors(request, response, async () => {
    const book = new Book(admin.firestore(), request.query);
    try {
      const results = await book.search();
      response.status(200).send(results);
    }
    catch(error) {
      response.status(500).send({ error: { message: String(error) } });
    }
  });
});


/**********************************************************************
* Book
***********************************************************************/
exports.book = functions.https.onRequest(async (request, response) => {
  cors(request, response, async () => {
    let results = { book: {} };
    const id = request.path.match(/\/books\/(\d*)/)[1]
    let docRef = admin.firestore().collection('books').doc(id);

    docRef.get().then(function(doc) {
      let data = doc.data();
      delete data[`作品名token`];  // レスポンスからtokenを削除
      results["book"] = data;
      response.status(200).send(results);
    })
    .catch(function(error) {
      response.status(500).send({ error: { message: error } });
    });
  });
});


/**********************************************************************
* Persons
***********************************************************************/
exports.persons = functions.https.onRequest(async (request, response) => {
  cors(request, response, async () => {
    const person = new Person(admin.firestore(), request.query);
    try {
      const results = await person.search();
      response.status(200).send(results);
    }
    catch(error) {
      response.status(500).send({ error: { message: error } });
    }
  });
});


/**********************************************************************
* Person
***********************************************************************/
exports.person = functions.https.onRequest(async (request, response) => {
  cors(request, response, async () => {
    let results = { person: {} };
    const id = request.path.match(/\/persons\/(\d*)/)[1]
    let docRef = admin.firestore().collection('persons').doc(id);

    docRef.get().then(function(doc) {
      let data = doc.data();
      delete data[`姓名token`];  // レスポンスからtokenを削除
      results["person"] = data;
      response.status(200).send(results);
    })
    .catch(function(error) {
      response.status(500).send({ error: { message: error } });
    });
  });
});


/**********************************************************************
* Person Books
***********************************************************************/
exports.personBooks = functions.https.onRequest(async (request, response) => {
  cors(request, response, async () => {
    const personId = request.path.match(/\/persons\/(\d*)\/.*/)[1]
    const query = JSON.parse(JSON.stringify(request.query));
    query["人物ID"] = personId;
    const book = new Book(admin.firestore(), query);

    try {
      let person, results;
      [person, results] = await Promise.all([
        admin.firestore().collection('persons').doc(personId).get(),
        book.search()
      ]);
      let personData = person.data();
      delete personData[`姓名token`];  // レスポンスからtokenを削除
      results["person"] = personData;

      // Next/PrevリンクをpersonBooksのpathに上書き
      if(results["links"]["next"]) {
        const link = new URL(results["links"]["next"]);
        link.searchParams.delete('人物ID');
        link.pathname = `/persons/${personId}/books`;
        results["links"]["next"] = link.href.replace("%2C", ",");
      }
      if(results["links"]["prev"]) {
        const link = new URL(results["links"]["prev"]);
        link.searchParams.delete('人物ID');
        link.pathname = `/persons/${personId}/books`;
        results["links"]["prev"] = link.href.replace("%2C", ",");
      }

      response.status(200).send(results);
    }
    catch(error) {
      response.status(500).send({ error: { message: String(error) } });
    }
  });
});
