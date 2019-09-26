const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parse');
// const csv = require('csv');
const iconv = require('iconv-lite');
const cheerio = require('cheerio');
const write = require('csv-write-stream')
const through = require('through2')

var serviceAccount = require("../__serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://zorapi-f6608.firebaseio.com"
});

const parseFile = (filePath) => {
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


function transform (data, enc, cb) {
  const url = data["XHTML/HTMLファイルURL"]
  const match = url.match(/(cards\/\d+\/files\/\d+_\d+\.html)/);
  if(match) {
    let charsCount, beginning;
    [charsCount, beginning] = parseFile(match[1]);
    data["文字数"] = charsCount;
    data["書き出し"] = beginning;
  }
  this.push(data)
  cb()
}

fs.createReadStream('../tmp/csv/__all_books2.csv')
  .pipe(csv({columns: true}))
  .pipe(through.obj(transform))
  .pipe(write())
  .pipe(fs.createWriteStream('out.csv'))



// rs.pipe(csv({columns: true}))
// .on('data', (data) => {
//   console.log("======")
//   console.log(data["作品ID"]);
//   const url = data["XHTML/HTMLファイルURL"]
//   const match = url.match(/(cards\/\d+\/files\/\d+_\d+\.html)/);
//   if(match) {
//     let charsCount, beginning;
//     [charsCount, beginning] = parseFile(match[1]);
//     data["底本名2"] = charsCount;
//     console.log(charsCount);
//     console.log(beginning);
//   }
// });
// rs.on('end', () => {
//   console.log("finished!");
// });

//
//
// const url = "https://www.aozora.gr.jp/cards/000081/files/45630_23908.html";
// // const url = "https://www.aozora.gr.jp/cards/000035/files/1567_14913.html";
// // const url = "https://www.aozora.gr.jp/cards/000148/files/773_14560.html";
// // const url = "https://www.aozora.gr.jp/cards/000119/files/624_14544.html";
// const match = url.match(/(cards\/\d+\/files\/\d+_\d+\.html)/);
// if(match) {
//   let charsCount, beginning;
//   [charsCount, beginning] = parseFile(match[1]);
//   console.log(charsCount);
//   console.log(beginning);
// }
