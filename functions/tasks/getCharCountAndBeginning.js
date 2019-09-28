const fs = require('fs');
const csv = require('csv');
const iconv = require('iconv-lite');
const cheerio = require('cheerio');


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

const addCharsCountAndBeginning = (data) => {
  const url = data["XHTML/HTMLファイルURL"]
  const match = url.match(/(cards\/\d+\/files\/\d+_\d+\.html)/);
  if(match) {
    let charsCount, beginning;
    [charsCount, beginning] = parseFile(match[1]);
    data["文字数"] = charsCount;
    data["書き出し"] = beginning;
    data["カテゴリ"] = categorize(charsCount);

  }
  return data;
}

const addAccessCount = (data) => {
  data["累計アクセス数"] = accessJson[data["作品ID"]] || 0;
  return data;
}

const categorize = (charsCount) => {
  let category = "";
  if(charsCount > 0) { category = "flash"; }
  if(charsCount > 2000) { category = "shortshort"; }
  if(charsCount > 4000) { category = "short"; }
  if(charsCount > 12000) { category = "novelette"; }
  if(charsCount > 24000) { category = "novel"; }
  return category;
}

const accessJsonFile = fs.readFileSync("./tmp/access.json", 'utf8');
const accessJson = JSON.parse(accessJsonFile);

const readStream = fs.createReadStream("./tmp/csv/__all_books2.csv"); // readStream is a read-only stream wit raw text content of the CSV file
const writeStream = fs.createWriteStream("./tmp/output.csv"); // writeStream is a write-only stream to write on the disk
const results = [];

readStream.pipe(csv.parse({columns: true}))
.on('data', (data) => {
  console.log(data["作品名"])
  data = addCharsCountAndBeginning(data);
  data = addAccessCount(data);
  results.push(data);
})
.on('error', (err) => {
  console.log('error ------------', err);
  reject();
})
.on('finish', () => {
  console.log('all the csv strings parsed to objects -------------');
})
.pipe(csv.stringify({ header: true }))
.pipe(writeStream);
