var LANGUAGE = ['osef', 'english', 'french', 'vo st en', 'vo st fr'];
var QUALITY = ['osef', 'hd', 'ld', '720p', '1080p'];
var KIND = ['music', 'movie', 'tv show', 'game', 'software', 'other'];

exports.list = function(req, res){
    req.db.requests.list(function(err, requests) {
        if (err) {
            console.log(err);
        }
        res.render('request/list', {
          title: "Request a torrent",
          requests: requests || [],
          LANGUAGE: LANGUAGE,
          QUALITY: QUALITY,
          KIND: KIND,
        });
    });
}

exports.addPOST = function(req, res){
  req.db.requests.add({
    name: req.body.name,
    language: LANGUAGE.indexOf(req.body.language),
    quality: QUALITY.indexOf(req.body.quality),
    kind: KIND.indexOf(req.body.kind),
    UserId: req.session.user.id,
    answered : 0
  }, function(err) {
    if (err) console.log(err);
    res.redirect('/requests');
  });
  
}

exports.answered = function(req, res){
    req.db.requests.answer(req.params.id, function(err) {
        if (err) console.log(err);
        res.redirect('/requests');
    });
}

exports.unanswered = function(req, res){
    req.db.requests.unanswer(req.params.id, function(err) {
        if (err) console.log(err);
        res.redirect('/requests');
    });
}

exports.add = function(req, res){
  res.send('Not implemented yet')
}

exports.delete = function(req, res){
  res.send('Not implemented yet')
}

exports.update = function(req, res){
  res.send('Not implemented yet')
}
