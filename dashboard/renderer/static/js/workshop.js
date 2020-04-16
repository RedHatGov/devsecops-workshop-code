function handle_execute(event, terminal) {
    var text = $(event.target).text().trim();
    parent.send_to_terminal(text, terminal);
}

function handle_copy(event) {
    var text = $(event.target).text().trim();
    var element = $('<textarea>').appendTo('body').val(text).select();
    document.execCommand('copy');
    element.remove();
}

function handle_console_link(event) {
    event.preventDefault();
    parent.open_link_in_console(event.target.href);
}

function handle_crw_link(event) {
    event.preventDefault();
    parent.open_link_in_crw(event.target.href);
}

function handle_slides_link(event) {
    event.preventDefault();
    parent.open_link_in_slides(event.target.href);
}

function handle_terminal_link(event) {
    event.preventDefault();
    parent.bring_terminal_to_front();
}

function selectElementText(el, win) {
    win = win || window;
    var doc = win.document, sel, range;
    if (win.getSelection && doc.createRange) {
        sel = win.getSelection();
        range = doc.createRange();
        range.selectNodeContents(el);
        sel.removeAllRanges();
        sel.addRange(range);
    } else if (doc.body.createTextRange) {
        range = doc.body.createTextRange();
        range.moveToElementText(el);
        range.select();
    }
}
$(document).ready(function() {
    $('section.page-content a').each(function() {
        function normalize(path){
            path = Array.prototype.join.apply(arguments,['/'])
            var sPath;
            while (sPath!==path) {
                sPath = n(path);
                path = n(sPath);
            }
            function n(s){return s.replace(/\/+/g,'/').replace(/\w+\/+\.\./g,'')}
            return path.replace(/^\//,'').replace(/\/$/,'');
        }

        var base_url = (typeof workshop_base_url === "undefined") ? "" : workshop_base_url;

        var console_url = '/' + normalize(base_url + '/../console');
        var slides_url = '/' + normalize(base_url + '/../slides');
        var terminal_url = '/' + normalize(base_url + '/../terminal');
        var crw_url = '/' + normalize(base_url + '/../crw');

        if (location.hostname === this.hostname || !this.hostname.length) {
            if (this.pathname.startsWith(console_url)) {
                $(this).click(function(event) {
                    handle_console_link(event);
                });
            }
            else if (this.pathname.startsWith(slides_url)) {
                $(this).click(function(event) {
                    handle_slides_link(event);
                });
            }
            else if (this.pathname.startsWith(terminal_url)) {
                if (this.pathname == terminal_url) {
                    $(this).click(function(event) {
                        handle_terminal_link(event);
                    });
                }
                else {
                    $(this).attr('target','_blank');
                }
            }
            else if (this.pathname.startsWith(crw_url)) {
                $(this).click(function(event) {
                    handle_crw_link(event);
                });
            }
        }
        else {
            $(this).attr('target','_blank');
        }
    });
});
