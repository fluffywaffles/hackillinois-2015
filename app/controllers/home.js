var express = require('express'),
  router = express.Router(),
  mongoose = require('mongoose'),
  path = require('path'),
  rootPath = path.normalize(__dirname + '/..'),
  jigTransform = require('../services/jig.js')

var Jig = require(rootPath + '/models/jig')

module.exports = function (app) {
  app.use('/', router);
};

router.get('/', function (req, res, next) {

  Article.find(function (err, articles) {
    if (err) return next(err);
    res.render('index', {
      title: 'Generator-Express MVC',
      articles: articles
    });
  });
});

router.post('/jigger/', function(req, res){
  var url = req.body.url;
  res.send(jigTransform(url));
})

router.get('/jigger/:id', function(req, res){
  Jig.find({'_id': req.params.id}, function(err, data){
    res.send(data);
  })
})
