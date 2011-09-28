var _ = require('underscore')

function initSession (req) {
    if(req.session.torrents == undefined)
    req.session.torrents = {
       sort     : undefined
      ,order    : undefined
      ,filters  : undefined
      ,search   : undefined
      ,tracker  : undefined
    }
}

exports.filtersAndSort= function(req, res) {
  var filters = req.body.filters
  var filtersCheck = filters && _.all(filters, function(e){ return req.tr.filters[e] })
  
  var sort = req.body.sort
  var sortCheck = req.tr.sorts[sort] !== undefined
  
  var order = req.body.order == 'desc'
  
  initSession(req)
  
  if( filtersCheck ) {
    req.session.torrents.filters = filters
    
    var search = filters.indexOf('search')
    if( search >= 0 && req.body.search ){
      req.session.torrents.search = req.body.search
    }
    var tracker = filters.indexOf('tracker')
    if( tracker >= 0 && req.body.tracker ){
      req.session.torrents.tracker = req.body.tracker
    }
  }
  
  if( sortCheck )
    req.session.torrents.sort = sort
  
  req.session.torrents.order = order
  
  
  
  if( filtersCheck || sortCheck )
    res.redirect('/torrents')
  else
    res.send(req.body)
}