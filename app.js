var express = require('express'),
	config = require('./config/config'),
	glob = require('glob'),
	mongoose = require('mongoose'),
	fs = require('fs'),
	path = require('path'),
	cheerio = require('cheerio'),
	http = require('http'),
	request = require('sync-request'),
	parse = require('url-parse');

mongoose.connect(config.db);
var db = mongoose.connection;
db.on('error', function () {
  throw new Error('unable to connect to database at ' + config.db);
});

var models = glob.sync(config.root + '/app/models/*.js');
models.forEach(function (model) {
  require(model);
});
console.log(config.root + '/app/models/jig');
var Jig = require(config.root + '/app/models/jig')
var app = express();

require('./config/express')(app, config);

var examplePath = path.join(__dirname, './nuvc_example/ex2.html');
var cssPath = path.join(__dirname, './nuvc_example/styles/main.css');
var wlText = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'i', 'span', 'strong', 'em', 'small', 'a', 'u', 'b', 'li', 'code', 'pre', 'blockquote', 'caption', 'input', 'textarea']; 
var model = {};
fs.readFile(cssPath, {encoding: 'utf-8'}, function(err,data){
    if (!err){
	    var inlineCSS = data;
    }else{
        console.log(err);
    }

}); 
fs.readFile(examplePath, {encoding: 'utf-8'}, function(err,data){
    if (!err){
    	//transformHTML(data);
    }else{
        console.log(err);
    }

});

function transformHTML(data){
	$ = cheerio.load(data);
	var head = $('head').html();

	wlText.forEach(addAttr);
	var body = $('body').html();
	outputObject['model'] = model;
	outputObject['body'] = body;
}

function addAttr(element, index, array){
	var nodes = $(element);
	nodes.each(function(i, elem){
		//console.log(elem);
		if(elem.name === 'input'){
			if($(this).attr('type') === 'text' && $(this).is("[placeholder]")){
				$(this).attr('jiggerable', '');
				var key = $(this)[0].name + '.' + i + '.' + 'placeholder';
				var value = $(this).attr('placeholder');
				$(this).attr('jig-placeholder', key);
				model[key] = value;

			}else if($(this).attr('type') === 'checkbox'){
				$(this).attr('jiggerable', '');
				var key = $(this)[0].name + '.' + i + '.' + 'otherInput';
				var value = $(this).attr('value');
				$(this).attr('jig-checkbox', key);
				model[key] = value;
			}else{
				$(this).attr('jiggerable', '');
				var key = $(this)[0].name + '.' + i + '.' + 'otherInput';
				var value = $(this).attr('value');
				$(this).attr('jig-otherInput', key);
				model[key] = value;
			}
		}else if(elem.name === 'textarea'){
			if($(this).is("[placeholder]")){
				$(this).attr('jiggerable', '');
				var key = $(this)[0].name + '.' + i + '.' + 'placeholder';
				var value = $(this).attr('placeholder');
				$(this).attr('jig-placeholder', key);
				model[key] = value;
			}
		}else{
			if($(this).text().length > 0){
				//console.log($(this).text());
				$(this).attr('jiggerable', '');
				var key = $(this)[0].name + '.' + i + '.' + 'text';
				var value = $(this).text();
				$(this).attr('jig-text', key);
				model[key] = value;
			}
		}

	})
}

function getDeps(rawHTML){
	$ = cheerio.load(rawHTML);
	var linkTags = $('link[rel="stylesheet"]');
	linkTags.each(function(i, elem){
		var cssPath = $(this).attr('href');
		var url = parse(cssPath, true);
		var CDNregexp = /^((http|https):)?\/\//;
		if(CDNregexp.exec(cssPath)){
			// CDN
			outputObject['deps'].push({'external': url['host'] + url['pathname']});
		}else{
			// local CSS
			addDeps(HTTPoptions['host'], cssPath);
		}
	})
}

function addDeps(host, path){
	HTTPoptions['host'] = host;
	HTTPoptions['path'] = path;
	var dep = request('GET', 'http://' + HTTPoptions['host'] + '/' + HTTPoptions['path']);
	outputObject['deps'].push({'inline': dep.getBody().toString()});	
}

var outputObject = {'deps': []}
var inputurl = parse('http://gwcmk.github.io/svex_parser/', true);
var HTTPoptions = {
	host: inputurl['host'],
	port: 80,
	path: inputurl['pathname'],
	method: 'GET'
};


var res = request('GET', 'http://' + HTTPoptions['host'] + HTTPoptions['path']);
var rawHTML = res.getBody().toString();
transformHTML(rawHTML);
getDeps(rawHTML);
//console.log(outputObject);
var newJig = new Jig({
	url: inputurl['host'] + inputurl['pathname'],
	rawHTML: rawHTML,
	body: outputObject['body'],
	deps: outputObject['deps'],
	liveChange: outputObject['body']
})
newJig.save(function(err, newJig){
	if(err) return err;
	console.log('url: ' + newJig['_id'])
})

app.listen(config.port);

