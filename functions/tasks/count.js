const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parse');
const iconv = require('iconv-lite');
const cheerio = require('cheerio');

var serviceAccount = require("../__serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://zorapi-f6608.firebaseio.com"
});


// let rs = fs.createReadStream('../tmp/csv/__all_books.csv');
// rs.pipe(csv({columns: true}))
// .on('data', (data) => {
//   countChars(data)
//   console.log(data["作品ID"]);
//   data["XHTML/HTMLファイルURL"]
// });
// rs.on('end', () => {
//   console.log("finished!");
// });
const parseFile = (filePath) => {
  // fs.readFile(`../../bungomail/tmp/aozorabunko/${filePath}`, function(err, data){
  //   if (err) throw err;
  //   const buf = new Buffer(data, 'binary');     //バイナリバッファを一時的に作成する
  //   const html = iconv.decode(buf, "Shift_JIS"); //作成したバッファを使い、iconv-liteでShift-jisからutf8に変換
  //   const $ = cheerio.load(html);
  //   const mainText = $('.main_text').text() || $('body').text();
  //   const beginning = mainText.match(/(.*?[。.!?！？])/);
  //   console.log(beginning[1].trim().slice(0,150));
  //   const charsCount = mainText.replace(/[\s　\r\n]/g, "").length;
  //   return [beginning, charsCount];
  // });
  const data = fs.readFileSync(`../../bungomail/tmp/aozorabunko/${filePath}`);
  const buf = new Buffer(data, 'binary');     //バイナリバッファを一時的に作成する
  const html = iconv.decode(buf, "Shift_JIS"); //作成したバッファを使い、iconv-liteでShift-jisからutf8に変換
  const $ = cheerio.load(html);
  const mainText = $('.main_text').text() || $('body').text();
  const match = mainText.match(/(.*?[。.!?！？])/);
  const beginning = match ? match[1] : mainText;
  const charsCount = mainText.length;
  return [charsCount, beginning.trim().slice(0,150)];
}


const url = "https://www.aozora.gr.jp/cards/000081/files/45630_23908.html";
// const url = "https://www.aozora.gr.jp/cards/000035/files/1567_14913.html";
// const url = "https://www.aozora.gr.jp/cards/000148/files/773_14560.html";
// const url = "https://www.aozora.gr.jp/cards/000119/files/624_14544.html";
const match = url.match(/(cards\/\d+\/files\/\d+_\d+\.html)/);
if(match) {
  let charsCount, beginning;
  [charsCount, beginning] = parseFile(match[1]);
  console.log(charsCount);
  console.log(beginning);
}
