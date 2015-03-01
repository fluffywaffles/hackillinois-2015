var config = require('../../config/config'),
	mongoose = require('mongoose'),
	path = require('path'),
	cheerio = require('cheerio'),
	request = require('sync-request'),
	parse = require('url-parse');

var Jig = require(config.root + '/app/models/jig')

var wlText = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'i', 'span', 'strong', 'em', 'small', 'a', 'u', 'b', 'li', 'code', 'pre', 'blockquote', 'caption', 'input', 'textarea']; 
var model = {};
var outputObject = {'deps': []}
var HTTPoptions;

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

		if(elem.name === 'input'){
			if($(this).attr('type') === 'text' && $(this).is("[placeholder]")){
				$(this).attr('jiggerable', '');
				var key = $(this)[0].name + '.' + i + '.' + 'placeholder';
				var value = $(this).attr('placeholder');
				$(this).attr('jig-placeholder', key);
				model[key] = value;

			}
			// else if($(this).attr('type') === 'checkbox'){
			// 	$(this).attr('jiggerable', '');
			// 	var key = $(this)[0].name + '.' + i + '.' + 'otherInput';
			// 	var value = $(this).attr('value');
			// 	$(this).attr('jig-checkbox', key);
			// 	model[key] = value;
			// }else{
			// 	$(this).attr('jiggerable', '');
			// 	var key = $(this)[0].name + '.' + i + '.' + 'otherInput';
			// 	var value = $(this).attr('value');
			// 	$(this).attr('jig-otherInput', key);
			// 	model[key] = value;
			// }
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

function main(url) {
	console.log(url);
	var inputurl = parse(url, true);
	HTTPoptions = {
		host: inputurl['host'],
		port: 80,
		path: inputurl['pathname'],
		method: 'GET'
	};

	var res = request('GET', 'http://' + HTTPoptions['host'] + HTTPoptions['path']);
	var rawHTML = res.getBody().toString();
	transformHTML(rawHTML);
	getDeps(rawHTML);

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

	return outputObject;
}

module.exports = main;


