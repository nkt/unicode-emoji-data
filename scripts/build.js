const fs = require('fs');
const path = require('path');
const jsdom = require('jsdom');
const mkdirp = require('mkdirp');
const pkg = require('../package.json');

const PACKAGE_NAME_PREFIX = 'unicode-emoji-data-';

function parseImage(row, index) {
  const node = row.cells[index].childNodes[0];
  if (node && node.tagName === 'IMG') {
    return node.src;
  }

  return null;
}

function parseKeywords(nodes) {
  const result = [];
  for (const node of nodes) {
    if (node.tagName === 'A') {
      result.push(node.innerHTML);
    }
  }

  return result;
}

function codeToFileName(code) {
  return code.replace(/U\+/g, '').replace(/ /g, '-').toLowerCase() + '.png';
}

function writeJSONFile(fileName, object) {
  fs.writeFileSync(fileName, JSON.stringify(object, null, '  '));
}

jsdom.env({
  url: 'http://unicode.org/emoji/charts-beta/full-emoji-list.html',
  done(err, window) {
    if (err) {
      console.error(err);
      return;
    }

    const data = [];

    const table = window.document.querySelector('table');
    for (const row of table.rows) {
      const id = row.cells[0].innerHTML;
      if (!(/^\d+$/).test(id)) {
        continue;
      }

      data.push({
        id: parseInt(id, 10),
        code: row.cells[1].childNodes[0].innerHTML,
        char: row.cells[2].innerHTML,
        name: row.cells[16].innerHTML,
        age: row.cells[17].innerHTML,
        keywords: parseKeywords(row.cells[18].childNodes),
        images: {
          chart: parseImage(row, 3),
          apple: parseImage(row, 4),
          google: parseImage(row, 5),
          twitter: parseImage(row, 6),
          emojione: parseImage(row, 7),
          facebook: parseImage(row, 8),
          'facebook-messenger': parseImage(row, 9),
          samsung: parseImage(row, 10),
          windows: parseImage(row, 11),
        }
      });
    }

    window.close();

    const types = Object.keys(data[0].images);
    types.forEach((type) => {
      const packageName = PACKAGE_NAME_PREFIX + type;
      const imagesDirName = path.resolve(__dirname, `../packages/${packageName}/images`);
      const dataFileName = path.resolve(__dirname, `../packages/${packageName}/data.json`);
      const packageFileName = path.resolve(__dirname, `../packages/${packageName}/package.json`);

      mkdirp.sync(imagesDirName);

      const supported = data.filter((emoji) => emoji.images[type] !== null);
      supported.forEach((emoji) => {
        const image = emoji.images[type];
        const buffer = new Buffer(image.slice('data:image/png;base64,'.length), 'base64');
        const fileName = path.join(imagesDirName, codeToFileName(emoji.code));
        fs.writeFileSync(fileName, buffer);
      });

      const mapped = supported.map((emoji) => {
        const tmp = Object.assign({}, emoji);
        delete tmp.images;
        return tmp;
      });


      writeJSONFile(dataFileName, mapped);
      writeJSONFile(packageFileName, {
        name: packageName,
        version: pkg.version,
        repository: pkg.repository,
        author: pkg.author,
        license: pkg.license,
        bugs: pkg.bugs,
        homepage: pkg.homepage
      });
    });
  }
});
