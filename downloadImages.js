var fs = require('fs');
const Axios = require('axios');
var { parse } = require('csv-parse');

async function downloadImage(url, filepath) {
    const response = await Axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });
    return new Promise((resolve, reject) => {
        response.data.pipe(fs.createWriteStream(filepath))
            .on('error', reject)
            .once('close', () => resolve(filepath)); 
    });
}

var parser = parse({columns: true}, async function (err, records) {
    for (let i in records) {
        if (records[i]['Image']) {
            await downloadImage(records[i]['Image'], './downloads/' + records[i]['Item Name'] + '.png');
            console.log('Downloaded ' + records[i]['Item Name'] + '.png');
        }
    }
    console.log('All image files were downloaded based on result.csv');
});

if (!fs.existsSync('./downloads')) {
    fs.mkdirSync(folder);
}

fs.createReadStream('./result.csv').pipe(parser);