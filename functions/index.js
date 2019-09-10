// const functions = require('firebase-functions');
const fs = require('fs');
const csv = require('csv-parse');

// // Books
// exports.books = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });
//
// // Persons
// exports.persons = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });


// const results = [];
// fs.createReadStream('csv/persons.csv')
//   .pipe(csv())
//   .on('data', (data) => { if(data[1].match(/芥川/)){ results.push(data) } })
//   .on('end', () => {
//     console.log(results);
//   });

const results = [];
fs.createReadStream('csv/books.csv')
  .pipe(csv())
  .on('data', (data) => { if(data[1].match(/食/)){ results.push(data[0]) } })
  .on('end', () => {
    console.log(results);
  });
