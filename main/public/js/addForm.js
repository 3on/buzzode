$(document).ready(function() {
    $('#upload').hide();
    $('#urlR').change(function() {
        $('#url').show();
        $('#fileLab').prop('for', 'url');
        $('#upload').hide();
    });

    $('#uploadR').change(function() {
        $('#url').hide();
        $('#fileLab').prop('for', 'upload');
        $('#upload').show();
    });
    
});
