var express = require('express'),
  router = express.Router(),
  mongoose = require('mongoose'),
  path = require('path'),
  rootPath = path.normalize(__dirname + '/..'),
  //var config = require(path.normalize(rootPath + '/config/config.js')),
  Article = mongoose.model('Article');

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

router.get('/jigger/:url', function(req, res){
  Jig.find({'_id': req.params.url}, function(err, data){
    res.send(data);
  })
})