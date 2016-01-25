'use strict';
var express = require('express');
var router = express.Router();
var tweetBank = require('../tweetBank');
var models = require('../models/index');

module.exports = function makeRouterWithSockets (io) {

  // a reusable function
  function respondWithAllTweets (req, res, next){
    var allTheTweets = tweetBank.list();
    res.render('index', {
      title: 'Twitter.js',
      tweets: allTheTweets,
      showForm: true
    });
  }

  function dbTweets (req, res, next){
    models.Tweet.findAll({include : [models.User]}).then(function(tweets) {
      res.render('index', {
        title: 'Twitter.js',
        tweets: tweets,
        showForm: true
      });
    });
  }


  // here we basically treet the root view and tweets view as identical
  // router.get('/', respondWithAllTweets);
  router.get('/', dbTweets);

  router.get('/tweets', dbTweets);

  router.get('/delete/:id', function(req, res, next){
    models.Tweet.destroy({where: {id: req.params.id}})
    .then(function(tweet){
      res.redirect('/');
    });
  })

  // single-user page
  router.get('/users/:username', function(req, res, next){
    models.User.findOne({where: {name: req.params.username}}).then(function (user) {
      user.getTweets({include : [models.User]}).then(function (tweets) {
        // console.log(tweets)
        res.render('index', {
          title: 'Twitter.js',
          tweets: tweets,
          showForm: true,
          username: user.name
        }); // another way of just logging the plain old values
      });
    });
  });

  // single-tweet page
  router.get('/tweets/:id', function(req, res, next){
    models.Tweet.findOne({where: {id: req.params.id},include : [models.User]}).then(function (tweet) {
        // console.log(tweet.dataValues)
        res.render('index', {
          title: 'Twitter.js',
          tweets: [tweet.dataValues],
          showForm: true,
          username: tweet.User.name
        }); 
    });
  });

  // create a new tweet
  router.post('/tweets', function(req, res, next){
    var userG;
    models.User.findOrCreate({where: {name: req.body.name},defaults : {pictureUrl: 'http://lorempixel.com/48/48'}})
    .then(function (user) {
      console.log(user);
      userG = user[0].dataValues;
      // console.log('user id: ',user.id)
      return models.Tweet.create({UserId: userG.id, tweet: req.body.text})
    })
    .then(function(tweet){ 
      var theTweet = {name: userG.name, tweet: tweet.tweet, id:tweet.id};
      io.sockets.emit('new_tweet', theTweet);
      res.redirect('/');
    })
    .catch(function(err){
      console.log(err);
    })
  });

  // // replaced this hard-coded route with general static routing in app.js
  // router.get('/stylesheets/style.css', function(req, res, next){
  //   res.sendFile('/stylesheets/style.css', { root: __dirname + '/../public/' });
  // });

  return router;
}
