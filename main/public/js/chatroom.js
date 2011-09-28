var messageCount = 0;

function handleNewMessages(data) {
    data = data.messages;
    var msgList = $('#msgList');
    for (var i = 0; i < data.length; i++) {
        messageCount = Math.max(messageCount, data[i].id);
        msgList.prepend('<li><span class="chatAuthor">' + data[i].author +
                    ' :</span> ' + data[i].message + '</li>');
    }
}

function requestNewMessages() {
    $.getJSON('/chat/latest/' + messageCount, null, handleNewMessages);
}

function clearTextbox() {
    $('#msgBox').val('');
}

function onMessageSent(data) {
    console.log('Message sent? ' + data.status);
    clearTextbox();
    requestNewMessages();
}

function sendMessage(msg, target) {
    $.post(target, { message : msg }, onMessageSent);
}

$(document).ready(function() {
    $('#sendForm').submit(function(e) {
        sendMessage($('#msgBox').val(), $('#sendForm').attr('action'));
        return false;
    });
    requestNewMessages();
    setInterval(requestNewMessages, 60000);
});
