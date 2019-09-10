const functions = require('firebase-functions');

// Books
exports.books = functions.https.onRequest((request, response) => {
 response.send("Hello from Firebase!");
});

// Persons
exports.persons = functions.https.onRequest((request, response) => {
 response.send("Hello from Firebase!");
});
