$(document).ready(function() {
    var basketForm = $('#basketForm');
    basketForm.submit(function() {
        $.post(basketForm.attr('action'), basketForm.serialize(), 
            function(data) {
                if (data.status != 'SUCCESS') {
                    console.log(data.error);
                } else {
                    console.log('Successfully added.');
                    basketForm.hide();
                }
            });
        return false;
    });
    basketForm.hide();

    $('.basketHide').click(function() { basketForm.hide() });
    $('.basketShow').click(function() { basketForm.show() });
    
    $('.basketRm').submit(function() {
        var li = $(this).parent();
        $.post($(this).attr('action'), null, function(data) {
            li.hide();
        });
        return false;
    });
});
