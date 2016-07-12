/* global APP, $ */

APP = (function () {
    var $searchButton,
        $searchInput,
        $opaResponse,
        $opaAddress,
        $opaAccount,
        $opaCount,
        $aisResponse,
        $aisAddress,
        $aisAccount,
        $aisCount,
        $aisStatus,
        $opaStatus,
        $loading,
        // HTTP responses
        state;
        
    return {
        init: function () {
            $opaResponse = $('#opa-response');
            $opaAddress = $('#opa-address');
            $opaAccount = $('#opa-account');
            $opaCount = $('#opa-count');
            $aisResponse = $('#ais-response');
            $aisAddress = $('#ais-address');
            $aisAccount = $('#ais-account');
            $aisCount = $('#ais-count');
            $searchButton = $('#search-button');
            $searchInput = $('#search-input');
            $aisStatus = $('#ais-status');
            $opaStatus = $('#opa-status');
            
            $searchButton.click(APP.compareAddress);
            
            $searchInput.keypress(function (e) { if (e.which == 13) $searchButton.trigger('click'); });
            
            $searchInput.focus(function (e) { $(this).select(); });
        },
        
        compareAddress: function ()
        {
            state = {};
            var address = $('#search-input').val(),
                opaAddress,
                opaUnit;
            
            // Make sure there's an address
            if (!address || address.length === 0) {
                for (var i = 0; i < 2; i++) {
                    $searchInput.animate({opacity: '0'}, 500);
                    $searchInput.animate({opacity: '1'}, 500);
                }
                return;
            }
                
            // Get unit, if there is one
            if (address.indexOf('#') > -1) {
                opaParts = address.split('#');
                opaAddress = opaParts[0].trim();
                opaUnit = opaParts[1].trim();
            } else {
                opaAddress = address;
            }
            
            // Clear out DOM elements
            $aisStatus.text('Loading...');
            $opaStatus.text('Loading...');
            var elementsToEmpty = [
                $opaResponse,
                $opaAddress,
                $opaAccount,
                $opaCount,
                $aisResponse,
                $aisAddress,
                $aisAccount,
                $aisCount,
            ];
            elementsToEmpty.forEach(function ($element, i) { $element.empty(); });
            $aisStatus.removeClass('error');
            $opaStatus.removeClass('error');
            
            var opaUrl = '//api.phila.gov/opa/robert-test/address/' + opaAddress + '/' + (opaUnit ? opaUnit : '');
            console.log(opaUrl);
            $.ajax(opaUrl, {
                data: {format: 'json'},
            })
            .done(APP.renderOpa)
            .fail(function (xhr, status, error) {
                if (xhr.responseJSON) {
                    $opaResponse.html(APP.syntaxHighlight(APP.stringifyJson(xhr.responseJSON)));
                }
                state.opa = {
                    status: xhr.status,
                };
                $opaAddress.text('(none)');
                $opaAccount.text('(none)');
                $opaCount.text('0');
                $opaStatus.text(state.opa.status);
                $opaStatus.addClass('error');
            });
            
            var aisUrl = '//api.phila.gov/ais/v1/addresses/' + encodeURIComponent(address);
            $.ajax(aisUrl, {
                data: {
                    gatekeeperKey: 'c0eb3e7795b0235dfed5492fcd12a344',
                    include_units:  null,
                },
            })
            .done(APP.renderAis)
            .fail(function (xhr, status, error) {
                if (xhr.responseJSON) {
                    $aisResponse.html(APP.syntaxHighlight(APP.stringifyJson(xhr.responseJSON)));
                }
                state.ais = {
                    status: xhr.status,
                };
                $aisAddress.text('(none)');
                $aisAccount.text('(none)');
                $aisCount.text('0');
                $aisStatus.text(state.ais.status);
                $aisStatus.addClass('error');
            });
        },
        
        renderOpa: function (data, status, xhr)
        {
            var address,
                account,
                count = data['total'];
            
            state.opa = {
                data:   data,
                status: xhr.status,
            };
            $opaStatus.text(state.opa.status);

            if (count === 1) {
                var item = data.data.properties[0];
                address = item.full_address;
                if (item.unit) address += (' # ' + parseInt(item.unit, 10));
                account = item.account_number;
            }
            else if (count > 1) {
                address = '(multiple)';
                account = '(multiple)';
            }
            else {
                address = '(none)';
                account = '(none)';
            }
            
            $opaAddress.text(address);
            $opaAccount.text(account);
            $opaCount.text(count);
            
            // $('#opa-address').text(data[''])
            var response = APP.syntaxHighlight(APP.stringifyJson(data));
            $opaResponse.html(response);
            
            if (state.ais && state.ais.status == 200) APP.diff();
        },
        
        renderAis: function (data, status, xhr)
        {
            var address,
                account,
                count = data['total_size'],
                statusCode = xhr.status;

            state.ais = {
                data:   data,
                status: statusCode,
            };
            $aisStatus.text(state.ais.status);
                
            if (count === 1) {
                var item = data.features[0];
                address = item.properties.street_address ? item.properties.street_address : '(none)';
                account = item.properties.opa_account_num ? item.properties.opa_account_num : '(none)';
            }
            else if (count > 1) {
                address = '(multiple)';
                account = '(multiple)';
            }
            else {
                address = '(none)';
                account = '(none)';
            }
            
            $aisAddress.text(address);
            $aisAccount.text(account);
            $aisCount.text(count);
            
            // $('#opa-address').text(data[''])
            var response = status == 200 ? data : data.responseJSON;
            var responseString = APP.syntaxHighlight(APP.stringifyJson(data));
            $aisResponse.html(responseString);
            
            if (state.opa && state.opa.status == 200) APP.diff();
        },
        
        diff: function () {
            var fields = ['address', 'account', 'count'];
            fields.forEach(function (field) {
                var aisVal = $('#ais-' + field).text(),
                    opaVal = $('#opa-' + field).text();
                if (aisVal != opaVal) {
                    $('#ais-' + field).addClass('error');
                    $('#opa-' + field).addClass('error');
                }
                else {
                    $('#ais-' + field).removeClass('error');
                    $('#opa-' + field).removeClass('error');
                }
            });
        },
        
        stringifyJson: function (j) {
            return JSON.stringify(j, null, 2);
        },
        
        syntaxHighlight: function (json)
        {
            if (typeof json != 'string') {
                 json = JSON.stringify(json, undefined, 2);
            }
            json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
                var cls = 'number';
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'key';
                    } else {
                        cls = 'string';
                    }
                } else if (/true|false/.test(match)) {
                    cls = 'boolean';
                } else if (/null/.test(match)) {
                    cls = 'null';
                }
                return '<span class="' + cls + '">' + match + '</span>';
            });
        },
    }
})();

$(function () {
    APP.init();
});