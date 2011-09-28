var messageStore = [];

function addMessage(db, author, authorId, message, cb) {
    db.chat.add({
        author : author,
        AuthorId : authorId,
        message : message,
        date : Date.now()
    }, cb);
}

exports.send = function(req, res) {
    if (req.body.message) {
        addMessage(req.db, req.session.user.username, req.session.user.id,
            req.body.message, function(err) {
                if (err) {
                    console.log(err);
                    res.send({ status : 'ERROR' });
                } else {
                    res.send({ status : 'OK' });
                }
            });
    } else {
        res.send({ status : 'ERROR' });
    }
}

exports.latest = function(req, res) {
    if (req.params.since != 0) {
        req.db.chat.latest(req.params.since, function(err, msgs) {
            if (err) {
                console.log(err);
                res.send({ messages : [] });
                return;
            }
            var result = [];
            msgs.each(function(item) {
                result.unshift({
                    author : item.author,
                    id : item.id,
                    authorId : item.UserId,
                    message : item.message,
                    date : item.createdAt
                });
            });
            res.send({ messages : result });
        });
    } else {
        req.db.chat.lastN(25, function(err, msgs) {
            if (err) {
                console.log(err);
                res.send({ messages : [] });
                return;
            }
            var result = [];
            msgs.each(function(item) {
                result.unshift({
                    author : item.author,
                    id : item.id,
                    authorId : item.UserId,
                    message : item.message,
                    date : item.createdAt
                });
            });
            res.send({ messages : result });
        });
    }
}
