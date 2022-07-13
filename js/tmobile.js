// tmobile.js
// 2013 Miguel Freitas
//
// mobile interface for twister using jquery mobile + router

var twisterInitialized = false;
var handlersInstalled = false;

function initializeTwister( redirectNetwork, redirectLogin, cbFunc, cbArg ) {
    if( !handlersInstalled ) {
        interfaceNetworkHandlers();
        installUserSearchHandler();
        installProfileEditHandlers();
        // install scrollbottom handler to load more posts as needed
        $(window).on('scroll', function () {
            if  ($(window).scrollTop() >= $(document).height() - $(window).height() - 20){
              reachedScrollBottom();
            }
        });
        // home screen timeline refresh button
        $('.timeline-refresh').on('click', function (e) {
            requestTimelineUpdate("latest",postsPerRefresh,followingUsers);
            $.mobile.silentScroll(0);
        });
        // reply text counter both newmsg and dmchat
        $('.post-area-new textarea')
            .off('input keyup')
            .on('focus', poseTextareaPostTools)
            .on('keyup', replyTextInput)
            .on('keyup', function() { replyTextUpdateRemaining(this); })
        ;

        handlersInstalled = true;

        twister.tmpl.post = extractTemplate('#template-post');
        twister.tmpl.postFull = extractTemplate('#template-post-full');
        twister.tmpl.postFull.find('.post-stats').hide();
    }

    if( twisterInitialized ) {
        if( cbFunc )
            cbFunc(cbArg);
    } else {
        networkUpdate( function() {
            if( redirectNetwork && !twisterdConnectedAndUptodate ) {
                $.MAL.goNetwork();
                return;
            }

            initUser(function() {
                if( redirectLogin && !defaultScreenName ) {
                    $.MAL.goLogin();
                    return;
                }

                if( defaultScreenName ) {
                    loadFollowing( function(args) {
                        requestLastHave();
                        initMentionsCount();
                        initDMsCount();
                        twisterFollowingO = TwisterFollowing(defaultScreenName);

                        twisterInitialized = true;
                        if( cbFunc )
                            cbFunc(cbArg);
                        setInterval("tmobileTick()", 2000);
                    });
                } else {
                    if( cbFunc )
                        cbFunc(cbArg);
                }
            });
        });
    }
}

var router=new $.mobile.Router(
    [
        { "#index" : {handler: "index", events: "bc"} },
        { "#home": {handler: "home", events: "bs" } },
        { "#profile": {handler: "profile", events: "bs" } },
        { "#profile-edit": {handler: "profileedit", events: "bs" } },
        { "#following": {handler: "following", events: "bs" } },
        { "#post": {handler: "post", events: "bs" } },
        { "#newmsg": {handler: "newmsg", events: "bs" } },
        { "#rt": {handler: "rt", events: "bs" } },
        { "#mentions": {handler: "mentions", events: "bs" } },
        { "#hashtag": {handler: "hashtag", events: "bs" } },
        { "#login": {handler: "login", events: "bs" } },
        { "#network": {handler: "network", events: "bs" } },
        { "#directmsg": {handler: "directmsg", events: "bs" } },
        { "#dmchat": {handler: "dmchat", events: "bs" } },
        { "#search": {handler: "search", events: "bs" } },
        { "#new-user-modal": {handler: "newusermodal", events: "bs" } },
    ],{
        index: function(type,match,ui) {
            $.mobile.loading('show');
            initializeTwister( true, true, function() {
                //$.MAL.goHome();
            });
        },
        home: function(type,match,ui) {
            $.mobile.loading('show');
            initializeTwister( true, true, function() {
                if( !$("#home .posts").children().length ) {
                    $.mobile.loading('show');
                    cleanupStorage();
                    getFullname( defaultScreenName, $("#home .rtitle"));
                    $(".mentions-count").attr("href","#mentions?user="+defaultScreenName );
                    requestTimelineUpdate("latestFirstTime",postsPerRefresh,followingUsers);
                }
            });
        },
        profile: function(type,match,ui) {
            var params=router.getParams(match[1]);
            clearProfilePage();
            $.mobile.loading('show');
            initializeTwister( true, true, function() {
                var user;
                if( params && params.hasOwnProperty("user") ) {
                    user = params.user;
                } else {
                    user = defaultScreenName;
                }
                var $newmsgLink = $("a.profile-newmsg");
                if( user != defaultScreenName ) {
                    $newmsgLink.attr("href",$.MAL.newPostToUrl(user)).show();
                } else {
                    $newmsgLink.hide();
                }

                $.mobile.loading('show');
                updateProfileData( $("#profile"), user);
            });
        },
        profileedit: function(type,match,ui) {
            $.mobile.loading('show');
            initializeTwister( true, true, function() {
                var containerElem = $('.profile-card.forEdition');
                loadProfileForEdit(defaultScreenName, {
                    fullname: containerElem.find('.input-name').attr('placeholder', polyglot.t('Full name here')),
                    bio: containerElem.find('.input-bio').attr('placeholder', polyglot.t('Describe yourself')),
                    location: containerElem.find('.input-location').attr('placeholder', polyglot.t('Location')),
                    url: containerElem.find('.input-url').attr('placeholder', polyglot.t('website'))
                });
                loadAvatarForEdit(defaultScreenName, $('.profile-card-photo.forEdition'));
                dumpPrivkey(defaultScreenName, function(args, key) {
                    $(".secret-key").text(key);
                }, {});
            });
        },
        following: function(type,match,ui) {
            var params=router.getParams(match[1]);
            clearProfilePage();
            $.mobile.loading('show');
            initializeTwister( true, true, function() {
                var user;
                if( params && params.hasOwnProperty("user") ) {
                    user = params.user;
                } else {
                    user = defaultScreenName;
                }
                if( params && params.hasOwnProperty("follow") ) {
                    follow(params.follow);
                }
                if( params && params.hasOwnProperty("unfollow") ) {
                    unfollow(params.unfollow);
                }
                $.mobile.loading('show');
                $("#following a.ui-btn").removeClass("ui-btn-active");
                var followingList = twister.tmpl.followingList.clone(true).appendTo($("#following .content"))
                    .closest('.following-list').listview();
                appendFollowingToElem(followingList);
                followingList.find('[data-role="button"]').button();
            });
        },
        post: function(type,match,ui) {
            initializeTwister( true, true, function (req) {
                if (!req || !req.userpost) return;

                var originalLi = postToElem(JSON.parse(req.userpost), 'original', false, twister.tmpl.postFull)
                    .addClass('expanded-post')
                ;
                var $ulPost = $("#post ul.posts");
                $ulPost.text("");
                $ulPost.append(originalLi);
                $ulPost.find(".post-interactions").trigger('create');
                $ulPost.listview('refresh');
                installReplyClick();
                installRetransmitClick();

                // insert replies to this post after
                requestRepliesAfter(originalLi);
                // RTs faces and counter
                var postDataElem = originalLi.find('.post-data');
                requestRTs(postDataElem.attr('data-screen-name'), postDataElem.attr('data-id'));
            }, router.getParams(match[1]));
        },
        newmsg: function(type,match,ui) {
            var params=router.getParams(match[1]);
            initializeTwister( true, true, function() {
                var $replyTextarea = $("#newmsg .post-area-new textarea");
                $replyTextarea.attr("placeholder", polyglot.t("New Post..."));
                if( params && params.hasOwnProperty("replyto") ) {
                    $replyTextarea.val(params.replyto);
                } else {
                    $replyTextarea.val("");
                }
                $.MAL.disableButton($("#newmsg .post-submit"));

                var $replyOriginal = $(".reply-original-post")
                $replyOriginal.html("");
                if( params && params.hasOwnProperty("userpost") ) {
                    var originalLi = postToElem(JSON.parse(params.userpost), 'original');
                    $replyOriginal.append(originalLi);
                    $replyOriginal.listview('refresh');
                }

                installSubmitClick();
            });
        },
        rt: function(type,match,ui) {
            var params=router.getParams(match[1]);
            initializeTwister( true, true, function() {
                var $rtOriginal = $(".rt-original-post")
                $rtOriginal.html("");
                var originalLi = postToElem(JSON.parse(params.userpost), 'original');
                $rtOriginal.append(originalLi);
                $rtOriginal.listview('refresh');

                installRetransmitConfirmClick();
            });
        },
        mentions: function(type,match,ui) {
            var params=router.getParams(match[1]);
            $.mobile.loading('show');
            initializeTwister( true, true, function() {
                var user;
                var $newmsgLink = $("a.mention-newmsg");
                if( params && params.hasOwnProperty("user") ) {
                    user = params.user;
                    $newmsgLink.attr("href",$.MAL.newPostToUrl(user));
                } else {
                    user = defaultScreenName;
                    $newmsgLink.attr("href","#newmsg");
                    resetMentionsCount();
                }
                $("#mentions .rtitle").text(polyglot.t("mentions_at", { user: user }));
                var $ulMentions = $("#mentions ul.posts");
                setupHashtagOrMention( $ulMentions, user, "mention");
            });
        },
        hashtag: function(type,match,ui) {
            var params=router.getParams(match[1]);
            $.mobile.loading('show');
            initializeTwister( true, true, function() {
                $("#hashtag .rtitle").text("#" + params.hashtag);
                $("a.hashtag-newmsg").attr("href",$.MAL.newPostHashtagToUrl(params.hashtag));
                var $ulHashtag = $("#hashtag ul.posts");
                setupHashtagOrMention($ulHashtag,params.hashtag,"hashtag");
            });
        },
        login: function(type,match,ui) {
            if (!$('#login .content').children().length)
                $('#login .content').append(twister.tmpl.loginMC.clone(true)).trigger('create');
            $.mobile.loading('show');
            initializeTwister( true, false, function() {
                $.mobile.loading('hide');
                $("select.local-usernames").selectmenu("refresh", true);
            });
        },
        network: function(type,match,ui) {
            $.mobile.loading('show');
            initializeTwister( false, false, function() {
                $.mobile.loading('hide');
                $("select.local-usernames.spam-user").selectmenu("refresh", true);
                getSpamMsg();
                getGenerate();
            });
        },
        directmsg: function(type,match,ui) {
            $.mobile.loading('show');
            initializeTwister( true, true, function() {
                $.mobile.loading('show');
                modalDMsSummaryDraw($('#directmsg .direct-messages-list'));
            });
        },
        dmchat: function(type,match,ui) {
            var params=router.getParams(match[1]);
            $.mobile.loading('show');
            initializeTwister( true, true, function() {
                var peerAlias = params.user;
                var board = $('#dmchat .direct-messages-thread').empty();

                $('#dmchat .rtitle').text('Chat @' + peerAlias);
                $("#dmchat textarea").val("");
                installDMSendClick(peerAlias);

                $.mobile.loading('show');

                tmobileQueryReq = queryStart(board, peerAlias, 'direct', undefined, 2000, {
                    boardAutoAppend: true,
                    lastId: 0,
                    lengthNew: 0,
                    ready: function (req, peerAlias) {
                        twister.DMs[peerAlias] = twister.res[req];
                    },
                    readyReq: peerAlias,
                    drawFinish: function (req) {
                        setTimeout($.MAL.dmConversationLoaded, 200, twister.res[req].board);
                    },
                    skidoo: function (req) {
                        return $.mobile.activePage.attr('id') !== 'dmchat' || req !== tmobileQueryReq;
                    }
                });
            });
        },
        search: function(type,match,ui) {
            initializeTwister( true, true, function() {
                /**/
            });
        },
        newusermodal: function(type,match,ui) {
            initializeTwister( false, false, function() {
                /* dumpPrivkey(defaultScreenName, function(args, key) {
                    $(".secret-key").text(key);
                }, {}); */
            });
        },
    }, {
        defaultHandler: function(type, ui, page) {
            console.log("Default handler called due to unknown route ("
                        + type + ", " + ui + ", " + page + ")" );
            console.log(ui);
            console.log(page);
        },
        defaultHandlerEvents: "s",
        defaultArgsRe: true
    }
);

function installPostboardClick() {
    var $postDatas = $(".post-data");
    $postDatas.off('click').on('click', function (e) {
        e.stopPropagation();
        e.preventDefault();
        var userpost = $(this).attr("data-userpost");
        var url = "#post?userpost=" + encodeURIComponent(userpost);
        $.mobile.loading('show');
        $.mobile.navigate( url );
    });

    $(".post a").off('click').on('click', function (e) {
        e.stopPropagation();

        // stopPropagation is supposed to be enough, but in Android the
        // default action is not called so we reimplement it here as a hack.
        e.preventDefault();
        $.mobile.loading('show');
        $.mobile.navigate( $(this).attr("href") );
    });
}

function installReplyClick() {
    var $postReply = $("#post .post-reply");
    $postReply.off('click').on('click', function (e) {
        e.stopPropagation();
        e.preventDefault();

        var $postData = $(this).closest(".post-data");
        var userpost = $postData.attr("data-userpost");
        var replyTo = $postData.attr("data-reply-to");
        var url = "#newmsg?replyto=" + encodeURIComponent(replyTo) +
                  "&userpost=" + encodeURIComponent(userpost);
        $.mobile.loading('show');
        $.mobile.navigate( url );
    });
}

function installRetransmitClick() {
    var $postRt = $("#post .post-propagate");
    $postRt.off('click').on('click', function (e) {
        e.stopPropagation();
        e.preventDefault();

        var $postData = $(this).closest(".post-data");
        var userpost = $postData.attr("data-userpost");
        var url = "#rt?userpost=" + encodeURIComponent(userpost);
        $.mobile.loading('show');
        $.mobile.navigate( url );
    });
}


function installSubmitClick() {
    var $postSubmit = $(".post-submit");
    $postSubmit.off('click').on('click', function (e) {
        e.stopPropagation();
        e.preventDefault();

        var $this = $( this );
        var $replyText = $this.closest(".post-area-new").find("textarea");

        var $postOrig = $("#newmsg .reply-original-post .post-data");

        var s = encode_utf8($replyText.val());
        newPostMsg(s, $postOrig.attr('data-screen-name'), parseInt($postOrig.attr('data-id')));

        $replyText.val("");
        $replyText.attr("placeholder", polyglot.t("Your message was sent!"));

        setTimeout( function() {$.MAL.goHome();}, 1000);
    });
}

function installDMSendClick(peerAlias) {
    $('.dm-submit').off('click').on('click', {peerAlias: peerAlias},
        function (event) {
            muteEvent(event, true);

            var elemTextArea = $(event.target).closest('.post-area-new').find('textarea');
            if (!elemTextArea.val())
                return;

            newDirectMsg(encode_utf8(elemTextArea.val()), event.data.peerAlias);
            elemTextArea.val('');
        }
    );
}

function installRetransmitConfirmClick() {
    var $postConfirmRt = $(".retransmit-confirm");
    $postConfirmRt.off('click').on('click', function (e) {
        e.stopPropagation();
        e.preventDefault();

        var $postOrig = $("#rt .rt-original-post .post-data");

        $.mobile.loading('show');
        newRtMsg($postOrig);
        $.MAL.goHome();
    });
}

function installUserSearchHandler() {
    $('.userMenu-search-field')
        .off('click input')
        .on('keyup', userSearchEnter)
        .on('click keyup',
            {hashtags: true, handleRet: processDropdownUserResults,
                handleRetZero: closeSearchDialog}, userSearchKeypress)
    ;
}

function installProfileEditHandlers() {
    $('.profile-card-photo.forEdition').on('click', function () {$('#avatar-file').trigger('click');});
    $('#avatar-file').on('change', handleAvatarFileSelectMobile);
    $('.submit-changes').on('click', function (event) {
        var saveElem = $(event.target);
        var containerElem = saveElem.closest('.content');

        $.MAL.disableButton(saveElem);

        saveProfile(defaultScreenName,
            {
                fullname: containerElem.find('.input-name').val(),
                bio: containerElem.find('.input-bio').val(),
                location: containerElem.find('.input-location').val(),
                url: containerElem.find('.input-url').val(),
                tox: containerElem.find('.input-tox').val(),
                bitmessage: containerElem.find('.input-bitmessage').val()
            },
            function (req) {
                saveAvatar(req.peerAlias, req.avatarData,
                    function () {
                        alert(polyglot.t('profile_saved'));
                        $.MAL.goHome();
                    },
                    null,
                    function (req) {
                        alert(polyglot.t('profile_not_saved') + '\n\nCan\'t save avatar data.');
                        $.MAL.enableButton(req);
                    },
                    req.saveElem
                );
            },
            {
                peerAlias: defaultScreenName,
                avatarData: containerElem.find('.profile-card-photo.forEdition').attr('src'),
                saveElem: saveElem
            },
            function (req) {
                alert(polyglot.t('profile_not_saved') + '\n\nCan\'t save profile data.');
                $.MAL.enableButton(req);
            },
            saveElem
        );
    });
    $('.cancel-changes').on('click', $.mobile.back);
}

function handleAvatarFileSelectMobile(evt) {
    var files = evt.target.files; // FileList object
    var f = files[0];

     // Only process image files.
     if (f.type === undefined || f.type.match('image.*')) {
        var reader;
        try {
            reader = new FileReader();
        } catch(e) {
            alert(polyglot.t('File APIs not supported in this browser.'));
            return;
        }

        reader.onload=function(e){
           var img=new Image();
           img.onload=function(){
               var MAXWidthHeight=64;
               var r=MAXWidthHeight/Math.max(this.width,this.height),
               w=Math.round(this.width*r),
               h=Math.round(this.height*r),
               c=document.createElement("canvas");
               c.width=w;c.height=h;
               c.getContext("2d").drawImage(this,0,0,w,h);

               var imgURL = undefined;
               var encoder = new JPEGEncoder();
               for(var q = 90; (!imgURL || imgURL.length > 4096) && q > 10; q -= 1) {
                   imgURL = encoder.encode(c.getContext("2d").getImageData(0,0,w,h), q);
                   console.log( "q: " + q + " url size: " + imgURL.length );
               }
               $(".profile-card-photo.forEdition").attr("src", imgURL );
           }
           img.src=e.target.result;
        }

        // Read in the image file as a data URL.
        reader.readAsDataURL(f);
    }
}

function handleClickOpenConversation(event) {
    event.stopPropagation();
    event.preventDefault();

    var userpost = $(event.target).closest(event.data.feeder).attr('data-userpost');

    $.mobile.loading('show');
    $.mobile.navigate('#post?userpost=' + encodeURIComponent(userpost));
}


function clearProfilePage() {
    $("#profile .profile-card-photo").attr("src","img/genericPerson.png");
    $("#profile .profile-name").text("");
    $("#profile .profile-location").text("");
    $("#profile .profile-url").text("");
    $("#profile .profile-url").attr("href","");
    $("#profile .profile-location").text("");
    $("#profile .posts").text("");
}

// handler of scroll bottom to request older posts
function reachedScrollBottom() {
    var curPage = $.mobile.activePage.attr("id");
    if( curPage == "home" ) {
        if( timelineLoaded ) {
            requestTimelineUpdate("older", postsPerRefresh, followingUsers);
        }
    }
}

function encode_utf8(s) {
    // only needed in android 2.3 - why?
    var ua = navigator.userAgent;
    if( ua.indexOf("Android") >= 0 )
    {
        var androidversion = parseFloat(ua.slice(ua.indexOf("Android")+8));
        if (androidversion < 3.0)
        {
            return unescape(encodeURIComponent(s));
        }
    }
    return s;
}

var tmobileQueryReq;

function setupHashtagOrMention(board, query, resource) {
    $.mobile.loading('show');
    board.empty();

    tmobileQueryReq = queryStart(board, query, resource, undefined, undefined, {
        boardAutoAppend: true,
        skidoo: function (req) {
            var curPage = $.mobile.activePage.attr('id');
            return (curPage !== 'mentions' && curPage !== 'hashtag') || req !== tmobileQueryReq;
        }
    });
}

// every 2 seconds do something page specific.
function tmobileTick() {
    var curPage = $.mobile.activePage.attr("id");
    if( curPage == "network" ) {
        networkUpdate();
    }
    if( curPage == "home" ) {
        requestLastHave();
    }
    if( curPage == "new-user-modal" ) {
        dumpPubkey(defaultScreenName, function(args, pubkey) {
                    //pubkey = "";
                    if( pubkey.length > 0 ) {
                        follow('twister', true, function() {
                            $.MAL.goProfileEdit();
                        });
                    }
                }, {} );
    }
}

$(document).on('mobileinit', function () {
  $.mobile.allowCrossDomainPages = true;
  $.mobile.zoom.enabled = false;
  $.mobile.buttonMarkup.hoverDelay = 0; //defaults 200
  $.mobile.defaultDialogTransition = 'none';
  $.mobile.defaultPageTransition = 'none';
});
