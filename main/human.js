exports.octets = function(size) {
  var SizePrefixes = ' KMGTPEZYXWVU';
  if(size <= 0) return '0';
  var t2 = Math.min(Math.round(Math.log(size)/Math.log(1024)), 12);
  return (Math.round(size * 100 / Math.pow(1024, t2)) / 100) +
    SizePrefixes.charAt(t2).replace(' ', '') + 'o';
};

exports.timestamp = function(time) {
  var date = new Date()
  date.setTime(time * 1000)
  return date.toLocaleDateString()
};