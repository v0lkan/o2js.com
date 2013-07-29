#!/usr/bin/env node

var program = require('commander')
  , utils = require('utilities')
  , path = require('path')
  , geddy = require('geddy')
  , _ = require('underscore')
  , request = require('request')
  , envoy = require('envoy')
  , fs = require('fs');

program
  .option('create <name>', 'create a new directory (<name>) and generate a new Scotch site in it.')
  .option('serve [port]', 'start the server, defaults to 80', 80)
  .option('generate', 'generate a static html site')
  .option('deploy', 'deploys a generated site')
  .parse(process.argv);

var Controller = function () {

  this.create = function (name) {
    console.log('Created a new site in directory: ' + program.create);
    utils.file.cpR(path.join(__dirname, '..'), name, {silent: true});
    utils.file.rmRf(path.join(name, '.git'), {silent: true});
    utils.file.rmRf(path.join(name, '.gitignore'), {silent: true});
  };

  this.serve = function (port) {
    port = port || 80;
    console.log('Serving on port ' + port);
    console.log(process.cwd())
    geddy.start({
      'geddy-root': process.cwd()
    , port: port
    });
  };

  this.generate = function () {
    console.log('generated static site in ./static');
    utils.file.cpR(path.join(process.cwd(), 'public'), 'static', {silent: true});
    geddy.start(
    {
      'geddy-root': process.cwd()
    , 'port': 8080
    });
    geddy.model.Post.all({isPublished: true}, {sort: {createdAt: 'asc'}}, function (err, posts) {
      if (err) return console.log(err);
      var slugs = _.pluck(posts, 'slug')
        , done = _.after(slugs.length, function () {
            request('http://localhost:8080/')
            .on('end', function () {
              console.log('done');
              process.exit();
            })
            .pipe(fs.createWriteStream(path.join('static', 'index.html')))
          });
      for (var i in slugs) {
        (function (slug, i) {
          request('http://localhost:8080/'+slug)
                  .on('end', done)
                  .pipe(fs.createWriteStream(path.join('static', slug+'.html')))
        })(slugs[i], i);
      }
    });
  };

  this.deploy = function () {
    var deployOpts
      , staticSiteDir = path.join(process.cwd(),'static')
      , deployOptsFile = path.join(process.cwd(),'config','deployment')
      , now = (new Date).getTime()
      , elapsed;
    
    //Check if static site has been generated
    if(!fs.existsSync(staticSiteDir)) {
      console.error('no static site detected');
      console.error('generate a static site with `scotch generate`');
      process.exit(1);
    }
    
    try {
      deployOpts = require(deployOptsFile);
    }
    catch (e) {
      console.error('could not load deployment settings');
      console.error('see: https://github.com/Techwraith/scotch#deployment');
      process.exit(1);
    }
    
    if(!deployOpts) {
      return;
    }
    
    deployOpts = _.clone(deployOpts);
    
    deployOpts.destination = deployOpts.destination || 'memory';
    deployOpts.opts = deployOpts.opts || {};
    
    console.log('deploying static site using ' + deployOpts.destination);
    
    envoy.deployFolder(staticSiteDir, deployOpts.destination, deployOpts.opts, function (err, log) {
      if(err) {
        console.error('failed to deploy: '+err);
        process.exit(1);
      }
      else {
        elapsed = (new Date).getTime() - now;
        
        elapsed = Math.round(elapsed/100)/10;
        
        console.log('deployed in ' + log.length + ' operations (' + elapsed + ' sec)');
        process.exit(0);
      }
    });
  };
}
var actions = new Controller();

if (program.create) return actions.create(program.create);
if (program.generate) return actions.generate();
if (program.deploy) return actions.deploy();
if (program.serve) return actions.serve(program.serve);
