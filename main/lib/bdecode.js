var fs = require('fs');

function bdecode(buffer) {
    var pos = 0;
    var bLength = buffer.length;

    var e = 101;
    var minus = 45;
    var zero = 48;
    
    function EX(msg, position) {
        throw msg + ' : at position ' + position;
    }
    
    function isDigit(charCode) {
        return charCode >= 48 && charCode <= 57;
    }
    
    function decode() {
        var c = buffer[pos];
        if (c == 105) {// i
            pos++;
            return number();
        } else if (c == 100) { // d
            pos++;
            return dictionary();
        } else if (c == 108) { // l
            pos++;
            return list();
        } else {
            return string();
        }
    }
    
    function number() {
        var ePos = pos;
        var negative = false;
        var result = 0;

        for (; ePos < bLength && buffer[ePos] != e; ePos++);
        if (ePos == pos) 
            EX('Empty integer', pos);
        else if (ePos == bLength)
            EX('Unterminated integer', pos);

        if (buffer[pos] == minus) {
            negative = true;
            pos++;
        }

        if (buffer[pos] == zero && (negative || (ePos != pos + 1))) {
            EX('Leading zero in integer', pos);
        }
        
        for (; pos < ePos; pos++) {
            if (!isDigit(buffer[pos])) {
                EX('Non-digit character in integer', pos);
            }
            result = result * 10 + buffer[pos] - 48;
        }

        pos = ePos + 1;
        return result;
    }
    
    function dictionary() {
        var result = {};

        while (pos < bLength) {
            if (buffer[pos] == e) break;
            if (!isDigit(buffer[pos])) {
                EX('Invalid dictionary key', pos);
            }
            var key = string();
            if (result[key]) {
                EX('Duplicate dictionary key ' + key, pos);
            }
            var value = decode();
            result[key] = value;
        }
        if (pos == bLength)
            EX('Unterminated dictionary', pos);
        pos++;
        return result;
    }
    
    function string() {
        var result = '';
        var colonPos = pos;
        var length = 0;
        if (buffer[pos] == zero && buffer[pos + 1] != 58) {
            EX('Leading zero in string length', pos);
        }

        for (; colonPos < bLength && buffer[colonPos] != 58; colonPos++) {
            if (!isDigit(buffer[colonPos]))
                EX('Non-digit character in string length', colonPos);
            length = length * 10 + buffer[colonPos] - 48;
        }

        if (colonPos == bLength)
            EX('Unterminated string length', pos);

        if (length > 0)
            result = buffer.slice(colonPos + 1, colonPos + 1 + length).
                toString('ascii');
        pos = colonPos + length + 1;
        return result;
    }

    function list() {
        var result = [];
        var pos1 = pos2 = 0;
        if (pos >= bLength) {
            EX('Unterminated list', pos - 1);
        }

        while (pos < bLength && buffer[pos] != e) {
            pos1 = pos;
            var val = decode();
            pos2 = pos;
            if (pos1 == pos2) {
                EX('Incorrect list definition', pos1);
            }
            result.push(val);
        }
        pos++;
        return result;
    }
    
    return decode();
}

exports.decodeFile = function(input, callback) {
    if (input instanceof Buffer) {
        try {
            var data = bdecode(input);
            callback(null, data);
        } catch (e) {
            callback(e);
        }
    } else {
        fs.readFile(input, function(err, data) {
            if (err) {
                callback(err);
            } else {
                try {
                    var result = bdecode(data);
                    callback(null, result);
                } catch (e) {
                    callback(e);
                }
            }
        });
    }
}

exports.decodeSync = function(buffer) {
    try {
        return bdecode(buffer);
    } catch (e) {
        console.log('Buffer decoding failed: ', e);
        return null;
    }
}

/*exports.decodeFile('test.torrent', function(err, data) {
    if (err) { console.log(err); } else {
        var files = data.info.files;
        var totalLength = 0;
        for (var i = files.length - 1; i >= 0; i--) {
            totalLength += files[i].length;
            console.log(files[i]);
        }
        console.log("Total length : ", totalLength, 'bytes, or ', totalLength / 1024, 'kbytes, or ', totalLength / (1024 * 1024), 'mbytes');
    }
    
});*/
