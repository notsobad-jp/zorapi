const fs = require('fs');
const cheerio = require('cheerio');


const countAccess = (results={}, filePath) => {
  let data;
  try {
    data = fs.readFileSync(filePath);
  } catch(err) {
    return results; // ファイルが存在しないときはスキップ（たまに12月がなかったりする）
  }
  const $ = cheerio.load(data);
  $("table tr").each((i, elm)=>{
    if(i==0) { return; } // 見出し行スキップ
    const cardLink = $(elm).find("td:nth-child(2) a");
    const url = $(cardLink).attr("href");
    const match = url.match(/card(\d+).html/);
    const access = $(elm).find("td:nth-child(4)");
    const accessCount = Number($(access).text()) + (results[match[1]] || 0);
    results[match[1]] = accessCount;
  });
  return results;
}

const countTotalAccess = () => {
  let results = {};
  for(let year = 2009; year <= 2019; year++ ) {
    for(let month = 1; month <= 12; month++) {
      const mm = ( '00' + month ).slice(-2);
      const textFilePath = `../tmp/aozorabunko/access_ranking/${year}_${mm}_txt.html`;
      results = countAccess(results, textFilePath);
      const xhtmlFilePath = `../tmp/aozorabunko/access_ranking/${year}_${mm}_xhtml.html`;
      results = countAccess(results, xhtmlFilePath);
      console.log(`finished: ${year}-${mm}`);
    }
  }
  return results;
}

const results = countTotalAccess();
fs.writeFileSync("./tmp/access.json", JSON.stringify(results));
