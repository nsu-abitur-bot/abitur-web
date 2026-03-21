$('[data-toggle="tooltip"]').tooltip();

let isSmallScreen = document.documentElement.clientWidth <= 767;
window.onresize = function(event) {
    let newIsSmallScreen = document.documentElement.clientWidth <= 767;
    if (newIsSmallScreen !== isSmallScreen) {
        $('.modal').modal('hide');
    }
    isSmallScreen = newIsSmallScreen;
};

$('#app').on('click', 'a.entrant-modal-link', function() {
    $($(this).data('target')).modal('show');
});
