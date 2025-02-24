// twister_network.js
// 2013 Miguel Freitas
//
// Provides functions for periodic network status check
// Interface to network.html page.

var twisterVersion;
var twisterDisplayVersion;
var twisterdConnections = 0;
var twisterdAddrman = 0;
var twisterDhtNodes = 0;
var twisterdBlocks = 0;
var twisterdLastBlockTime = 0;
var twisterdConnectedAndUptodate = false;
var genproclimit = 1;

// ---

function formatDecimal(value) {
    if (!value) return '0';
    var exponent = Math.floor(Math.log(value) / Math.LN10),
        scale = (exponent < 2) ? Math.pow(10, 2 - exponent) : 1;
    return Math.round(value * scale) / scale;
}
function formatSize(value) {
    if (value<1024) return value + ' B';
    if (value<1024*1024) return formatDecimal(value/1024) + ' KB';
    if (value<1024*1024*1024) return formatDecimal(value/(1024*1024)) + ' MB';
    if (value<1024*1024*1024*1024) return formatDecimal(value/(1024*1024*1024)) + ' GB';
    return formatDecimal(value/(1024*1024*1024*1024)) + ' TB';
}
function formatSpeed(total, rate) {
    return formatSize(total) + ' @ ' + formatSize(rate) + '/s'
}

function requestNetInfo(cbFunc, cbArg) {
    twisterRpc("getinfo", [],
               function(args, ret) {
                   twisterdConnections = ret.connections;
                   twisterdAddrman     = ret.addrman_total;
                   twisterdBlocks      = ret.blocks;
                   twisterDhtNodes     = ret.dht_nodes;
                   twisterVersion      = ("0000000" + ret.version).slice(-8);
                   twisterDisplayVersion = twisterVersion.slice(0,2) + '.' +
                                           twisterVersion.slice(2,4) + '.' +
                                           twisterVersion.slice(4,6) + '.' +
                                           twisterVersion.slice(6,8);

                   $(".connection-count").text(twisterdConnections);
                   $(".known-peers").text(twisterdAddrman);
                   $(".blocks").text(twisterdBlocks);
                   $(".dht-nodes").text(twisterDhtNodes);
                   $(".userMenu-dhtindicator a").text(twisterDhtNodes);
                   $(".version").text(twisterDisplayVersion);

                   if( ret.proxy !== undefined && ret.proxy.length ) {
                       $(".proxy").text(ret.proxy);
                       $(".using-proxy").show();
                       $(".not-using-proxy").hide();
                   } else {
                       $(".ext-ip").text(ret.ext_addr_net1);
                       $(".ext-port1").text(ret.ext_port1);
                       $(".ext-port2").text(ret.ext_port2);
                       $(".test-ext-port1").attr("href","http://www.yougetsignal.com/tools/open-ports/?port=" + ret.ext_port1);
                       $(".test-ext-port2").attr("href","http://www.yougetsignal.com/tools/open-ports/?port=" + ret.ext_port2);
                       $(".using-proxy").hide();
                       $(".not-using-proxy").show();
                   }

                   $(".dht-torrents").text(ret.dht_torrents);
                   $(".num-peers").text(ret.num_peers);
                   $(".peerlist-size").text(ret.peerlist_size);
                   $(".num-active-requests").text(ret.num_active_requests);

                   $(".download-rate").text(formatSpeed(ret.total_download, ret.download_rate));
                   $(".upload-rate").text(formatSpeed(ret.total_upload, ret.upload_rate));
                   $(".dht-download-rate").text(formatSpeed(ret.total_dht_download, ret.dht_download_rate));
                   $(".dht-upload-rate").text(formatSpeed(ret.total_dht_upload, ret.dht_upload_rate));
                   $(".ip-overhead-download-rate").text(formatSpeed(ret.total_ip_overhead_download, ret.ip_overhead_download_rate));
                   $(".ip-overhead-upload-rate").text(formatSpeed(ret.total_ip_overhead_upload, ret.ip_overhead_upload_rate));
                   $(".payload-download-rate").text(formatSpeed(ret.total_payload_download, ret.payload_download_rate));
                   $(".payload-upload-rate").text(formatSpeed(ret.total_payload_upload, ret.payload_upload_rate));

                   if( !twisterdConnections ) {
                       $.MAL.setNetworkStatusMsg(polyglot.t("Connection lost."), false);
                       twisterdConnectedAndUptodate = false;
                   }

                   if( args.cbFunc )
                       args.cbFunc(args.cbArg);
               }, {cbFunc:cbFunc, cbArg:cbArg},
               function(args, ret) {
                   console.log("Error connecting to local twister daemon.");
               }, {});

    twisterRpc("getpeerinfo", [],
    function(args, ret) {

        let connections = $(".connections > table > tbody");

        connections.html('');

        $.each(ret, function() {
            connections.append(
                $('<tr/>').append(
                    $('<td/>').text(
                        this.addr
                    )
                ).append(
                    $('<td/>').text(
                        this.subver
                    )
                ).append(
                    $('<td/>').text(
                        this.startingheight
                    )
                ).append(
                    $('<td/>').text(
                        this.bytessent / 1000
                    )
                ).append(
                    $('<td/>').text(
                        this.bytesrecv / 1000
                    )
                )
            );
        });
    }, {cbFunc:cbFunc, cbArg:cbArg},
    function(args, ret) {
        console.log("Error connecting to local twister daemon.");
    }, {});
}

function peerKeypress() {
    var peer = $(".new-peer-addr").val();
    var $button = $(".add-peer");
    if( peer.length ) {
        $.MAL.enableButton( $button );
    } else {
        $.MAL.disableButton( $button );
    }
}

function dnsKeypress() {
    var peer = $(".new-dns-addr").val();
    var $button = $(".add-dns");
    if( peer.length ) {
        $.MAL.enableButton( $button );
    } else {
        $.MAL.disableButton( $button );
    }
}

function addPeerClick() {
    var peer = $(".new-peer-addr").val();
    twisterRpc("addnode", [peer, "onetry"],
               function(args, ret) {
                   $(".new-peer-addr").val("")
               }, {},
               function(args, ret) {
                   alert(polyglot.t("error", { error: ret.message }));
               }, {});
}

function addDNSClick() {
    var dns = $(".new-dns-addr").val();
    twisterRpc("adddnsseed", [dns],
               function(args, ret) {
                   $(".new-dns-addr").val("")
               }, {},
               function(args, ret) {
                   alert(polyglot.t("error", { error: ret.message }));
               }, {});
}

function requestBestBlock(cbFunc, cbArg) {
    twisterRpc("getbestblockhash", [],
               function(args, hash) {
                   requestBlock(hash, args.cbFunc, args.cbArg);
               }, {cbFunc:cbFunc, cbArg:cbArg},
               function(args, ret) {
                   console.log("getbestblockhash error");
               }, {});
}

function requestNthBlock(n, cbFunc, cbArg) {
    twisterRpc("getblockhash", [n],
        function(args, hash) {
            requestBlock(hash, args.cbFunc, args.cbArg);
        }, {cbFunc:cbFunc, cbArg:cbArg},
        function(args, ret) {
            console.log("getblockhash error");
        }, {});
}

function requestBlock(hash, cbFunc, cbArg) {
    twisterRpc("getblock", [hash],
               function(args, block) {
                   if( args.cbFunc )
                       args.cbFunc(block, args.cbArg);
               }, {cbFunc:cbFunc, cbArg:cbArg},
               function(args, ret) {
                   console.log("requestBlock error");
               }, {});
}

function networkUpdate(cbFunc, cbArg) {
    requestNetInfo(function () {
        requestBestBlock(function(block, args) {

            twisterdLastBlockTime = block.time;
            $(".last-block-time").text(timeGmtToText(twisterdLastBlockTime));

            var curTime = new Date().getTime() / 1000;
            if (twisterdConnections) {
                if (twisterdLastBlockTime > curTime + 3600) {
                    $.MAL.setNetworkStatusMsg(polyglot.t("Last block is ahead of your computer time, check your clock."), false);
                    twisterdConnectedAndUptodate = false;
                } else if (twisterdLastBlockTime > curTime - (2 * 3600)) {
                    if (twisterDhtNodes) {
                        $.MAL.setNetworkStatusMsg(polyglot.t("Block chain is up-to-date, twister is ready to use!"), true);
                        twisterdConnectedAndUptodate = true;
                    } else {
                        $.MAL.setNetworkStatusMsg(polyglot.t("DHT network down."), false);
                        twisterdConnectedAndUptodate = true;
                    }
                } else {
                    var daysOld = (curTime - twisterdLastBlockTime) / (3600 * 24);
                    $.MAL.setNetworkStatusMsg(polyglot.t("downloading_block_chain", {days: daysOld.toFixed(2)}), false);
                    // don't alarm user if blockchain is just a little bit behind
                    twisterdConnectedAndUptodate = (daysOld < 2);
                }
            }
            if (args.cbFunc)
                args.cbFunc(args.cbArg);
        }, {cbFunc:cbFunc, cbArg:cbArg} );
    });
}

function getMiningInfo(cbFunc, cbArg) {
    twisterRpc("getmininginfo", [],
               function(args, ret) {
                   miningDifficulty    = ret.difficulty;
                   miningHashRate      = ret.hashespersec;
                   genproclimit        = ret.genproclimit;

                   $(".mining-difficulty").text(miningDifficulty);
                   $(".mining-hashrate").text(miningHashRate);
/*
                   if( !twisterdConnections ) {
                       $.MAL.setNetworkStatusMsg("Connection lost.", false);
                       twisterdConnectedAndUptodate = false;
                   }
*/
                   if( args.cbFunc )
                       args.cbFunc(args.cbArg);
               }, {cbFunc:cbFunc, cbArg:cbArg},
               function(args, ret) {
                   console.log("Error connecting to local twister daemon.");
               }, {});
}

function miningUpdate(cbFunc, cbArg) {
    getMiningInfo(cbFunc, cbArg);
}

function getGenerate() {
    twisterRpc("getgenerate", [],
               function(args, ret) {
                   var $genblock = $("select.genblock");
                   if( ret ) {
                       $genblock.val("enable");
                   } else {
                       $genblock.val("disable");
                   }
               }, {},
               function(args, ret) {
                   console.log("getgenerate error");
               }, {});
}

function setGenerate() {
    var params = [];
    params.push($("select.genblock").val() == "enable");
    params.push(parseInt($(".genproclimit").val()));
    twisterRpc("setgenerate", params,
               function(args, ret) {
                   console.log("setgenerate updated");
               }, {},
               function(args, ret) {
                   console.log("getgenerate error");
               }, {});
}

function getSpamMsg() {
    twisterRpc("getspammsg", [],
               function(args, ret) {
                   var $postArea = $(".spam-msg");
                   var $localUsersList = $("select.local-usernames.spam-user");
                   $postArea.val(ret[1]);
                   $localUsersList.val(ret[0]);
               }, {},
               function(args, ret) {
                   console.log("getgenerate error");
               }, {});
}

function setSpamMsg(event) {
    event.stopPropagation();
    event.preventDefault();

    var btnUpdate = $(event.target);
    $.MAL.disableButton(btnUpdate);

    var params = [$("select.local-usernames.spam-user").val(),
        btnUpdate.closest('.post-area-new').find('textarea.spam-msg').val().trim()];

    twisterRpc("setspammsg", params,
        function(args, ret) {console.log("setspammsg updated");}, {},
        function(args, ret) {console.log("setspammsg error");}, {}
    );
}

function exitDaemon() {
    $( ".terminate-daemon").text("Exiting...");
    $.MAL.disableButton( $( ".terminate-daemon") );

    twisterRpc("stop", undefined,
                function(args, ret) {
                    console.log("daemon exiting");

                    setTimeout(function _reload_after_exit() {
                      window.location.href = '/abort.html';
                    }, 2000);
                }, {},
                function(args, ret) {
                    console.log("error while exiting daemon");
                }, {});
}

// handlers common to both desktop and mobile
function interfaceNetworkHandlers() {
    $('.new-peer-addr').on('keyup', peerKeypress);
    $('.new-dns-addr').on('keyup', dnsKeypress);
    $('.add-peer').on('click', addPeerClick);
    $('.add-dns').on('click', addDNSClick);
    $('select.genblock').on('change', setGenerate);
    $('.genproclimit').on('change', setGenerate);
    $('.post-submit.update-spam-msg').off('click').on('click', setSpamMsg);
    $('.terminate-daemon').on('click',
        {txtMessage: {polyglot: 'confirm_terminate_daemon'}, cbConfirm: exitDaemon}, confirmPopup);
}


function initInterfaceNetwork() {
    initInterfaceCommon();
    initUser( function () {
        getSpamMsg();

        if( defaultScreenName ) {
            loadFollowing( function() {
                initMentionsCount();
                initDMsCount();
            });
        }
    });
    networkUpdate();
    setInterval("networkUpdate()", 2000);

    miningUpdate( function() {
        $(".genproclimit").val(genproclimit);
    });
    setInterval("miningUpdate()", 2000);

    getGenerate();

    interfaceNetworkHandlers();
}
