const fs = require('fs');
const csv = require('csv-parse');
const write = require('csv-write-stream')
const iconv = require('iconv-lite');
const cheerio = require('cheerio');
const through = require('through2')


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

const transform = (data, enc, cb) => {
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

fs.createReadStream('./tmp/csv/__all_books2.csv')
  .pipe(csv({columns: true}))
  .pipe(through.obj(transform))
  .pipe(write())
  .pipe(fs.createWriteStream('out.csv'))
