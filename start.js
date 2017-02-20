var http = require('http');
var fs = require('fs');
var sharp = require('sharp');
var request = require('sync-request');
var mongoose = require('mongoose');
var express = require('express');
var url = require('url');

var dirs = ['./320_240', './384_288',  './640_480'];

for (var i = 0; i < dirs.length; i++) {
    if (!fs.existsSync(dirs[i])){
        fs.mkdirSync(dirs[i]);
    }
}
mongoose.connect('mongodb://localhost/b2w');

var DataSchema = new mongoose.Schema({
    dimensions: String,
    path: String
});

var Data = mongoose.model('dataImage', DataSchema);
Data.remove().exec();

var res = request('GET', 'http://54.152.221.29/images.json');
var imagens_path = JSON.parse(res.body.toString('utf-8'));

var download = function (url, dest) {
    var file = fs.createWriteStream(dest);
    var request = http.get(url, function (response) {
        response.pipe(file);
        file.on('finish', function () {
            file.close();
            ResizeImage(file.path);
        });
    });
}

var ResizeImage = function (name) {
    sharp(name)
   .resize(320, 240)
   .toFile('320_240//' + name, function (err) {
   });
    var data = new Data({ dimensions: '320x240', path: '320_240/' + name });
    data.save();

    sharp(name)
   .resize(384, 288)
   .toFile('384_288//' + name, function (err) {
   });
    var data = new Data({ dimensions: '384x288', path: '384_288/' + name });
    data.save();

    sharp(name)
  .resize(640, 480)
  .toFile('640_480//' + name, function (err) {
  });
    var data = new Data({ dimensions: '640x480', path: '640_480/' + name });
    data.save();

}

for (var i = 0; i < imagens_path["images"].length; i++) {
    var re = /\w*.jpg/;
    var url = imagens_path["images"][i]["url"];
    var file_name = re.exec(url);
    if (!fs.existsSync(file_name[0])) {
        download(url, file_name[0]);
        ResizeImage(file_name[0]);
    } else {
        ResizeImage(file_name[0]);
    }
}

var updateJson = function () {
    Data.find({}, ['path', 'dimensions'], function (err, datas) {
        if (err) {
            console.log('Error on generate json config');
        } else {
            var element = { "images": [] };
            for (var i = 0; i < datas.length; i++) {
                element['images'].push({ 'dimensions': datas[i]['dimensions'], 'url': 'http://localhost:3000/' + datas[i]['path'] });
            }
            var fs = require('fs');
            fs.writeFile('images.json', JSON.stringify(element, null, 4));
        }
    });
}

const app = express();

app.set('view options', { layout: false });
app.use('/public', express.static('public'));

app.get('/images', (req, res) => {
    updateJson();
    res.sendFile('images.json', { root: __dirname });
});

app.get('/*/*.jpg', (req, res) => {
    console.log(req.url);
    res.sendFile('.' + req.url, { root: __dirname });
});

app.listen(process.env.PORT || 3000);

console.log('Listening on port: ' + (process.env.PORT || 3000));

