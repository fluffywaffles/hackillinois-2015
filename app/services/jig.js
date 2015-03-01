var config = require('../../config/config'),
  mongoose = require('mongoose'),
  path = require('path'),
  cheerio = require('cheerio'),
  request = require('sync-request'),
  parse = require('url-parse');

var Jig = require(config.root + '/app/models/jig')

var wlText = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'i', 'span', 'strong', 'em', 'small', 'a', 'u', 'b', 'li', 'code', 'pre', 'blockquote', 'caption', 'input', 'textarea'];
var tagsWithLinks = ['video', 'img', 'source', 'script', 'link', 'a'];
var model = {};
var outputObject = {'deps': []}
var HTTPoptions;
var CDNregexp = /^((http|https):)?\/\//;

function transformHTML(data, url){
  $ = cheerio.load(data);
  var head = $('head').html();

  wlText.forEach(addAttr);
  tagsWithLinks.forEach(function updateLinks(element){
    var nodes = $(element);
    nodes.each(function(i, elem){
      var currentLink;
      if(elem.name === 'video'&& $(this).is("[poster]")){
        currentLink = $(this).attr('poster');
        if(CDNregexp.test(currentLink)) return;
        $(this).attr('poster', '//' + path.join(url['host'], currentLink));
      }else if((elem.name === 'img' || elem.name === 'source' || elem.name === 'script') && $(this).is("[src]")){
        currentLink = $(this).attr('src');
        if(CDNregexp.test(currentLink)) return;
        $(this).attr('src', '//' + path.join(url['host'], currentLink));
      }else if((elem.name === 'link' || elem.name === 'a') && $(this).is("[href]")){
        currentLink = $(this).attr('href');
        if(CDNregexp.test(currentLink)) return;
        $(this).attr('href', '//' + path.join(url['host'], currentLink));
      }
    })
  });
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
      //   $(this).attr('jiggerable', '');
      //   var key = $(this)[0].name + '.' + i + '.' + 'otherInput';
      //   var value = $(this).attr('value');
      //   $(this).attr('jig-checkbox', key);
      //   model[key] = value;
      // }else{
      //   $(this).attr('jiggerable', '');
      //   var key = $(this)[0].name + '.' + i + '.' + 'otherInput';
      //   var value = $(this).attr('value');
      //   $(this).attr('jig-otherInput', key);
      //   model[key] = value;
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
        $(this).attr('ng-bind', 'doc.model["' + key + '"]');
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
    if(CDNregexp.exec(cssPath)){
      // CDN
      outputObject['deps']['external'].push(path.join(url['host'], url['pathname']));
    }else{
      // local CSS
      addDeps(HTTPoptions['host'], cssPath);
    }
  })
}

function addDeps(host, path){
  HTTPoptions['host'] = host;
  HTTPoptions['path'] = path;
  var dep = request('GET', 'http://' + path.join(HTTPoptions['host'], HTTPoptions['path']));
  outputObject['deps']['inline'].push(dep.getBody().toString());
}

function main(url) {
  outputObject = {'deps': {'inline': [], 'external': []}}
  var inputurl = parse(url, true);
  HTTPoptions = {
    host: inputurl['host'],
    port: 80,
    path: inputurl['pathname'],
    method: 'GET'
  };

  var res = request('GET', 'http://' + path.join(HTTPoptions['host'], HTTPoptions['path']));
  var rawHTML = res.getBody().toString();
  transformHTML(rawHTML, inputurl);
  getDeps(rawHTML);

  var newJig = new Jig({
    url: path.join(inputurl['host'], inputurl['pathname']),
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


