$(document).ready(function(){
    $('#playersSetup_button').click(openPlayersSetup);
    $('#startSession_button').click(startNewSession);
    $('#sessionList_button').click(showSessionList);
    $('#resetGame_button').click(resetGame);
    $('#nextGame_button').click(nextGame);
    $('#updateGame_button').click(updateGame);
    $('#updateCancel_button').click(cancelUpdate);
    $('#addPlayer_button').click(addPlayer);
	$('#wa_button').click(sendText);
    $('body').on('click', '.deletePlayer_button', deletePlayer); 
    $('#sessionList').on('click', 'td', viewSessionDetails);
    $('#gameBoard').on('input', '.gameBoard_bonus', calculateCreditOnBonusChange);
    $('#gameBoard').on('input', '.gameBoard_points', onPointsChange);
    $('#gameBoard').on('input', '#gameBoard_credits_0', onKittyCreditsChange);
    $('#gameBoard').on('click', '.scoreCard_winner', setWinner);
    $('#gameBoard').on('click', '.scoreCard_pname', toggleScoreCard);
    $('#editGameBoard').on('input', '.editGameBoard_bonus', onEditBonus);
    $('#editGameBoard').on('input', '.editGameBoard_points', onEditPoints);
    $('#editGameBoard').on('input', '#editGameBoard_credits_0', onEditKittyCredits);
    init();
});

function init() {
    var storedApp = localStorage.getItem('app');
    if(storedApp) {
        app = JSON.parse(storedApp);
        if(app.players) {
            for(var i in app.players) {
                loadPlayer(app.players[i]);
            }
        }
        $('#home_kittyPoints').val(app.kittyPoints);
        if(app.curSession) {
            for(var i in app.sessions) {
                if(app.curSession.id == app.sessions[i].id && app.sessions[i].status=='Open') {
                    app.curSession = app.sessions[i];
                    break;
                }
            }
            for(var i in app.curSession.games) {
                if(app.curSession.games[i].status == 'In Progress') {
                    app.curSession.curGame = app.curSession.games[i];
                }
            }
            $('#container').removeClass('noSession');
            $('#container').addClass('hasSession');
            refreshSessionSummaryOnHome();
            loadCurGame(app.curSession, app.curSession.curGame);
            if(app.curSession.curGame.winner) {
                $('#scoreCard_'+app.curSession.curGame.winner).addClass('winner');
                $('#gameBoard_points_'+app.curSession.curGame.winner).val('');
                $('#gameBoard').attr('winnerSelected','true');
            }
        }
        if(app.sessions && app.sessions.length > 0) {
            $('#sessionList_button').removeAttr('disabled');
        }
    } else {
        $('#newPlayer_text').val('Kitty');
        addPlayer();
    }
}

function goToHome() {
    $('#container').attr('currentSection', 'home');
}

function playNextGame() {
    $('#container').attr('currentSection', 'scoreBoard_section');
}

function openPlayersSetup() {
    $('#container').attr('currentSection', 'playersSetup_section');
}

function releaseNotes() {
    $('#container').attr('currentSection', 'releaseNotes_section');
}

function saveApp() {
    localStorage.setItem('app',JSON.stringify(app));
}

function addPlayer() {
    var pname = $('#newPlayer_text').val();
    if(pname == null || pname.length == 0) {
        return;
    }
    var players = app.players;
    for(var i in players) {
        if(players[i].name == pname) {
            return;
        }
    }
    var player = {
        id : app.nextPlayerId,
        name : pname
    }
    players.push(player);
    app.nextPlayerId++;

    if(app.curSession) {
        var game = app.curSession.curGame;
        var card = {};
        card.player = player;
        card.gameCredit = 0;
        card.acive = true;
        game.scoreCards.push(card);
        addScoreCard(card);
    }

    loadPlayer(player);
    saveApp();
}

function loadPlayer(player) {
    if(app.players.length >= 3) {
        $('#startSession_button').removeAttr('disabled');
    }

    $('#playerNames > tbody').append(
        '<tr id="player_'+player.id+'">'
            +'<td>'+player.name+'</td>'
            +'<td>'
                +(player.id==0?'':'<button type="button" class="btn btn-danger deletePlayer_button">X</button>')
            +'</td>'
        +'</tr>'
    );
    
    $('#newPlayer_text').val('');
}

function deletePlayer() {
    var playerId = $(this).parents('tr').attr('id').replace('player_','');
    var players = app.players.filter(function(val){
        if(val.id == playerId) {
            return false;
        }
        return true;
    });
    app.players = players;
    $(this).parents('tr').remove();

    if(players.length < 2) {
        $('#startSession_button').attr('disabled','');
    }

    if(app.curSession) {
        var game = app.curSession.curGame;
        var cards = game.scoreCards.filter(function(val){
            if(val.player.id == playerId) {
                return false;
            }
            return true;
        });
        game.scoreCards = cards;
        $('#scoreCard_'+playerId).remove();
        calculateCredit();
    }

    saveApp();
}

function startNewSession() {
    var session = {};
    session.startTime = new Date();
    session.id = app.nextSessionId++;
    session.name = session.startTime.toLocaleDateString('en-IN',{ year: 'numeric', month: 'short', day: 'numeric' }) + ' - ' + session.id;
    session.status = 'Open';
    session.games = [];
    app.curSession = session;
    app.sessions.push(session);
    newGame();
    $('#container').removeClass('noSession');
    $('#container').addClass('hasSession');
    if(app.sessions.length == 6) {
        app.sessions.shift();
    }
    saveApp();
}

function closeSession() {
    var session = app.curSession;
    session.endTime = new Date();
    session.status = 'Closed';
    app.curSession = null;
    $('#container').removeClass('hasSession');
    $('#container').addClass('noSession');
    saveApp();
}

function reopenSession() {
    var sessionId = $('#sessionDetails_section').attr('sid');
    var session = getSessionForId(sessionId);
    if(app.curSession) {
        app.curSession.status = 'Closed';
    }
    app.curSession = session;
    session.status = 'Open';
    newGame();
    
    $('#container').removeClass('noSession');
    $('#container').addClass('hasSession');
    $('#sessionDetails_reopen').hide();
    $('#sessionDetails_play').show();
    $('#sessionDetails_section').removeClass('session-closed');

    saveApp();
}

function setKittyPoints() {
    app.kittyPoints = Number($('#home_kittyPoints').val());
    if(app.curSession) {
        app.curSession.curGame.scoreCards[0].gameCredit = app.kittyPoints;
        $('#gameBoard_credits_0').val(app.kittyPoints);
        if(app.curSession.curGame.winner) {
            calculateCredit();
        }
    }
    saveApp();
}

function getGameForName(gameName) {
    var session = app.curSession;
    for(var g in session.games) {
        if(session.games[g].name == gameName) {
            return session.games[g];
        }
    }
    return null;
}

function editGame(gameName) {
    $('#editGameBoard > tbody').empty();
    var game = getGameForName(gameName);
    app.curSession.gameForEdit = cloneGame(game);
    for(var c in game.scoreCards) {
        addScoreCard(game.scoreCards[c], 'editGameBoard', game);
    }
    $('#editGameBoard').attr('winnerSelected','true');
    //$('#editGameBoard').attr('gameForEdit',game.name);
    $('#editScoreBoard_title').text('Edit Game: '+app.curSession.name+' / '+game.name);
    $('#container').attr('currentSection', 'editGame_section');
}

function cloneGame(game) {
    var g = {
        'name': game.name,
        'winner': game.winner,
        'status': game.status,
        'scoreCards': []
    };
    for(var c in game.scoreCards) {
        g.scoreCards.push(cloneScoreCard(game.scoreCards[c]));
    }
    return g;
}

function cloneScoreCard(scoreCard) {
    var sc = {
        'points': scoreCard.points,
        'bonus': scoreCard.bonus,
        'gameCredit': scoreCard.gameCredit,
        'player': {
            'id': scoreCard.player.id,
            'name': scoreCard.player.name
        }
    }
    return sc;
}

function newGame() {
    $('#gameBoard > tbody').empty();
    var session = app.curSession;
    var game = {
        name: 'Game '+ (session.games.length+1),
        status: 'In Progress'
    }
    if(session.curGame && session.curGame.status == 'In Progress') {
        game = session.curGame;
    } else {
        session.curGame = game;
        session.games.push(game);
    }
    var scoreCards = [];
    for(var p in app.players) {
        var card = {};
        card.player = app.players[p];
        card.points = null;
        card.bonus = null;
        card.active = true;
        if(app.players[p].id == 0) {
            card.gameCredit = app.kittyPoints;
        } else {
            card.gameCredit = 0;
        }
        scoreCards.push(card);
        //addScoreCard(card);
    }
    game.scoreCards = scoreCards;
    
    loadCurGame(session, game);
}

function loadCurGame(session, game) {
    if(app.sessions.length == 1 && session.games.length == 1) {
        $('#sessionList_button').removeAttr('disabled');
    }

    for(var i in game.scoreCards) {
        addScoreCard(game.scoreCards[i]);
    }

    $('#scoreBoard_title').empty();
    $('#scoreBoard_title').append(
            '<ol class="breadcrumb">'
                +'<li class="breadcrumb-item"><a href="#" onclick="goToHome()">Home</a></li>'
                +'<li class="breadcrumb-item"><a href="#" onclick="showSessionList()">Sessions</a></li>'
                +'<li class="breadcrumb-item"><a href="#" onclick="viewDetailsOfSession(\''+session.id+'\')">'+session.name+'</a></li>'
                +'<li class="breadcrumb-item active" aria-current="page">'+game.name+'</li>'
            +'</ol>');
    
    refreshSessionSummaryOnHome()
    $('#gameBoard').attr('winnerSelected','false');
}

function refreshSessionSummaryOnHome() {
    $('#home_sessionSummary').empty();
    $('#home_sessionSummary').append(createSessionSummaryTable(app.curSession));
    $('#home_sessionHeader').empty();
    $('#home_sessionHeader').append(app.curSession.name + ' ( '+getGamesPlayed(app.curSession)+' Games )');
}

function addScoreCard(scoreCard, gameTableName, game) {
    if(!gameTableName) {
        gameTableName = 'gameBoard';
    }
    if(scoreCard.player.id == 0) {
        $('#'+gameTableName+' > tbody').append(
            '<tr id="scoreCard_'+scoreCard.player.id+'">'
                +'<td></td>'
                +'<td style="text-align:left">'+scoreCard.player.name+'</td>'
                +'<td></td>'
                +'<td></td>'
                +'<td><input type="text" size="3" id="'+gameTableName+'_credits_0" value="'+scoreCard.gameCredit+'"/></td>'
            +'</tr>'
        );
    } else {
        var cls = scoreCard.active? 'activeCard': 'inactiveCard';
        cls += (game && game.winner==scoreCard.player.id ?' winner':'');
        $('#'+gameTableName+' > tbody').append(
            '<tr id="scoreCard_'+scoreCard.player.id+'" class="'+cls+'">'
                +'<td><input type="radio" name="scoreCard_winner" class="scoreCard_winner"'+(game && game.winner==scoreCard.player.id?' checked="true" ':'')+'/></td>'
                +'<td style="text-align:left"><span class="scoreCard_pname">'+scoreCard.player.name+'</span></td>'
                +'<td>'
                    +'<input type="text" size="3" class="'+gameTableName+'_points" id="'+gameTableName+'_points_'+scoreCard.player.id+'" value="'+(scoreCard.points==null?'':scoreCard.points)+'"/>'
                    +'<img src="./trophy-32.png" alt="Winner" class="winner_logo" />'
                +'</td>'
                +'<td><input type="text" size="3" class="'+gameTableName+'_bonus" id="'+gameTableName+'_bonus_'+scoreCard.player.id+'" value="'+(scoreCard.bonus==null?'':scoreCard.bonus)+'"/></td>'
                +'<td class="scoreCard_credit" id="'+gameTableName+'_gameCredit_'+scoreCard.player.id+'">'+(scoreCard.active?scoreCard.gameCredit:'')+'</td>'
            +'</tr>'
        );
    }
}

function setWinner() {
    var id = $(this).parents('tr').attr('id').replace('scoreCard_', '');
    if(app.curSession.curGame.winner) {
        $('#scoreCard_'+app.curSession.curGame.winner).removeClass('winner');
    }
    app.curSession.curGame.winner = id;
    $('#scoreCard_'+id).addClass('winner');
    $('#gameBoard_points_'+id).val('');
    $('#gameBoard').attr('winnerSelected','true');
    calculateCreditOnPointsChange(id);
    saveApp();
}

function toggleScoreCard() {
    var id = $(this).parents('tr').attr('id').replace('scoreCard_', '');
    var sc = null
    for(var i in app.curSession.curGame.scoreCards) {
        if(id == app.curSession.curGame.scoreCards[i].player.id) {
            sc = app.curSession.curGame.scoreCards[i];
            if(sc.active) {
                sc.active = false;
                $(this).parents('tr').removeClass('activeCard');
                $(this).parents('tr').addClass('inactiveCard');
            } else {
                sc.active = true;
                $(this).parents('tr').removeClass('inactiveCard');
                $(this).parents('tr').addClass('activeCard');
            }
            break;
        }
    }
    calculateCreditForgame(app.curSession.curGame, false);
    if(sc && !sc.active) {
        $(this).parents('tr').find('.scoreCard_credit').text('');
    }
}

function onEditBonus() {
    var id = $(this).attr('id').replace('editGameBoard_bonus_', '');
    var game = app.curSession.gameForEdit; //getGameForName($('#editGameBoard').attr('gameForEdit'));
    var cards = game.scoreCards;
    for(var i in cards) {
        if(cards[i].player.id == id) {
            cards[i].bonus = Number($(this).val());
            break;
        }
    }
    calculateCreditForgame(game, true);
}

function calculateCreditOnBonusChange() {
    var id = $(this).attr('id').replace('gameBoard_bonus_', '');
    var cards = app.curSession.curGame.scoreCards;
    for(var i in cards) {
        if(cards[i].player.id == id) {
            cards[i].bonus = Number($(this).val());
            break;
        }
    }
    calculateCredit();
}

function onEditPoints() {
    var id = $(this).attr('id').replace('editGameBoard_points_', '');
    var game = app.curSession.gameForEdit; //getGameForName($('#editGameBoard').attr('gameForEdit'));
    var cards = game.scoreCards;
    for(var i in cards) {
        if(cards[i].player.id == id) {
            cards[i].points = Number($('#editGameBoard_points_'+id).val());
            break;
        }
    }
    calculateCreditForgame(game, true);
}

function onPointsChange() {
    var id = $(this).attr('id').replace('gameBoard_points_', '');
    calculateCreditOnPointsChange(id);
}

function calculateCreditOnPointsChange(id) {
    var cards = app.curSession.curGame.scoreCards;
    for(var i in cards) {
        if(cards[i].player.id == id) {
            cards[i].points = Number($('#gameBoard_points_'+id).val());
            break;
        }
    }
    calculateCredit();
}

function onEditKittyCredits() {
    var credits = Number($(this).val());
    var game = app.curSession.gameForEdit; //getGameForName($('#editGameBoard').attr('gameForEdit'));
    game.scoreCards[0].gameCredit = credits;
    calculateCreditForgame(game, true);
}

function onKittyCreditsChange() {
    var credits = Number($(this).val());
    app.kittyPoints = credits;
    app.curSession.curGame.scoreCards[0].gameCredit = credits;
    $('#home_kittyPoints').val(credits);
    calculateCredit();
}

function calculateCreditForgame(game, isEdit) {
    var kittyPoints = isEdit?Number($('#editGameBoard_credits_0').val()):app.kittyPoints;
    var cards = game.scoreCards;
    for(var i in cards) {
        if(i == 0 || !cards[i].active) {
            continue;
        }
        
        var bcredit = 0;
        var pcredit = 0;
        for(var j in cards) {
            if(j == 0 || !cards[j].active) {
                continue;
            }
            if(cards[j].player.id == cards[i].player.id) {
                continue;
            }
            bcredit += (isEmpty(cards[i].bonus)?0:cards[i].bonus) - (isEmpty(cards[j].bonus)?0:cards[j].bonus);
            if(cards[i].player.id == game.winner) {
                pcredit += isEmpty(cards[j].points)?0:cards[j].points;
            }
        }
        if(!isEmpty(cards[i].points) && cards[i].points > 0) {
            pcredit -= isEmpty(cards[i].points)?0:cards[i].points;
        }
        cards[i].gameCredit = bcredit + pcredit;
        if(cards[i].player.id == game.winner && kittyPoints) {
            cards[i].gameCredit -= kittyPoints
        }
        if(isEdit) {
            $('#editGameBoard_gameCredit_'+cards[i].player.id).text(cards[i].gameCredit);
        } else {
            $('#gameBoard_gameCredit_'+cards[i].player.id).text(cards[i].gameCredit);
        }
    }
    saveApp();
}

function calculateCredit() {
    calculateCreditForgame(app.curSession.curGame, false);
}

function isEmpty(val) {
    return val == undefined || val == null ;
}

function resetGame() {
    var cards = app.curSession.curGame.scoreCards;
    app.curSession.curGame.winner=null;
    for(var i in cards) {
        cards[i].bonus = null;
        cards[i].points = null;
        $('#gameBoard_bonus_'+cards[i].player.id).val(null);
        $('#gameBoard_points_'+cards[i].player.id).val(null);
        $('#gameBoard_gameCredit_'+cards[i].player.id).text(cards[i].gameCredit);
        $('#scoreCard_'+cards[i].player.id).removeClass('winner');
    }
    $('#gameBoard input[type="radio"]').prop("checked", false);
    $('#gameBoard').attr('winnerSelected','false');
    calculateCredit();
    saveApp();
}

function nextGame() {
    if(validateGame(app.curSession.curGame)) {
        app.curSession.curGame.status = 'Done';
        newGame();
        viewCurrentSessionDetails();
        saveApp();
    } else {
        alert('Incomplete Score');
    }
}

function validateGame(game) {
    var cards = game.scoreCards;
    for(var i in cards) {
        if(i == 0 || !cards[i].active) {
            continue;
        }
        if(isEmpty(cards[i].bonus) || isEmpty(cards[i].points)) {
            return false;
        }
    }
    return true;
}

function cancelUpdate() {
    app.curSession.gameForEdit = null;
    viewCurrentSessionDetails();
}

function updateGame() {
    if(validateGame(app.curSession.gameForEdit)) {
        var gameForEdit = app.curSession.gameForEdit;
        var index = -1;
        for(var g in app.curSession.games) {
            if(gameForEdit.name == app.curSession.games[g].name) {
                index = g;
                break;
            }
        }
        if(index != -1) {
            app.curSession.games[index] = gameForEdit;
            app.curSession.gameForEdit = null;
            refreshSessionSummaryOnHome();
            viewCurrentSessionDetails();
        }
    } else {
        alert('Incomplete Score');
    }
}

function showSessionList() {
    $('#container').attr('currentSection', 'sessionList_section');
    $('#sessionList > tbody').empty()
    for(var i = app.sessions.length; i > 0; i--) {
        $('#sessionList > tbody').append(
            '<tr id="sessionList_'+app.sessions[i-1].id+'">'
                +'<td>'+app.sessions[i-1].name+'</td>'
            +'</tr>'
        );
    }
    $('#sessionList_title').empty();
    $('#sessionList_title').append(
            '<ol class="breadcrumb">'
                +'<li class="breadcrumb-item"><a href="#" onclick="goToHome()">Home</a></li>'
                +'<li class="breadcrumb-item active">Sessions</li>'
            +'</ol>');
}

function getSessionForId(sessionId) {
    for(var s in app.sessions) {
        if(app.sessions[s].id == sessionId) {
            return app.sessions[s];
        }
    }
    return null;
}

function createSessionSummaryTable(session) {
    var playerIdNameMap = {};
    var playerIdCreditMap = {};
    var playerIds = [];
    for(var g in session.games) {
        var game = session.games[g];
        for(var c in game.scoreCards) {
            var card = game.scoreCards[c];
            if(!playerIdNameMap[card.player.id]) {
                playerIds.push(card.player.id);
                playerIdNameMap[card.player.id] = card.player.name;
                playerIdCreditMap[card.player.id] = (game.status=='In Progress'?0:card.gameCredit);
            } else {
                playerIdCreditMap[card.player.id] = playerIdCreditMap[card.player.id] + (game.status=='In Progress'?0:card.gameCredit);
            }
        }
    }
    var sessionTable = '<table class="table tabled-bordered border-primary table-striped"><tbody>';
    for(var p in playerIds) {
        sessionTable += ('<tr>'
                            +'<td style="text-align:left">'+playerIdNameMap[playerIds[p]]+'</td>'
                            +'<td>'+playerIdCreditMap[playerIds[p]]+'</td>'
                        +'</tr>');
    }
    sessionTable += '</tbody></table>';
    return sessionTable;
}

function getGamesPlayed(session) {
    return session.curGame && session.curGame.status == 'In Progress' ? session.games.length -1 : session.games.length;
}

function loadSessionSummary(session, parentElemSummary) {
    parentElemSummary.empty();
    var sessionTable=
        '<div class="col-sm-12 col-md-6">'
        +'<div class="card">'
            +'<div class="card-header">Session Summary ( '+getGamesPlayed(session)+' Games )</div>'
            +'<div class="card-body p-0">'
                +'<div class="container"><div class="row"><div class="col p-0">';
    sessionTable += createSessionSummaryTable(session);
    sessionTable += '</div></div></div></div></div></div>';
    parentElemSummary.append(sessionTable);
}

function loadSessionGames(session, parentElemGames) {
    parentElemGames.empty();
    var isLastGame = true;
    for(var g=session.games.length; g>0 ;g--) {
        var game = session.games[g-1];
        if(game.status=='In Progress') {
            continue;
        }
        var gameTable=
            '<div class="col-sm-12 col-md-6">'
            +'<div class="card">'
                +'<div class="card-header">'
                    +'<div class="container">'
                        +'<div class="row">'
                            +'<div class="col text-start">'+game.name+'</div>'
                            +'<div class="col text-end">'
                                +(isLastGame?'<button type="button" class="btn btn-secondary py-0 editGame" onclick="editGame(\''+game.name+'\')">Edit</button>':'')
                            +'</div>'
                        +'</div>'
                    +'</div>'
                +'</div>'
                +'<div class="card-body p-0">'
                    +'<div class="container"><div class="row"><div class="col p-0">';
        gameTable += '<table class="table tabled-bordered border-primary table-striped">'
                            +'<tbody>';
        for(var c in game.scoreCards) {
            if(!game.scoreCards[c].active) {
                continue;
            }
            var card = game.scoreCards[c];
            gameTable += ('<tr>'
                            +'<td style="text-align:left">'
                                +(game.winner == card.player.id?'<img src="./trophy-32.png" alt="Winner"/>':'')
                                +'  '+card.player.name
                            +'</td>'
                            +'<td>'+card.gameCredit+'</td>'
                        +'</tr>');
        }
        gameTable += '</tbody></table>';
        gameTable += '</div></div></div></div></div></div>';
        parentElemGames.append(gameTable);
        isLastGame = false;
    }
}

function loadSessionDetails(sessionId, parentElemSummary, parentElemGames) {
    var session = getSessionForId(sessionId);
    $('#sessionDetails_section').attr('sid',session.id);
    loadSessionSummary(session, parentElemSummary);
    loadSessionGames(session, parentElemGames);
}

//From Nav Path
function viewDetailsOfSession(sessionId) {
    $('#container').attr('currentSection', 'sessionDetails_section');
    var session = getSessionForId(sessionId);
    $('#sessionDetails_title').empty();
    $('#sessionDetails_title').append(
            '<ol class="breadcrumb">'
                +'<li class="breadcrumb-item"><a href="#" onclick="goToHome()">Home</a></li>'
                +'<li class="breadcrumb-item"><a href="#" onclick="showSessionList()">Sessions</a></li>'
                +'<li class="breadcrumb-item active">'+session.name+'</li>'
            +'</ol>');

    loadSessionDetails(sessionId, $('#sessionDetails_summary'), $('#sessionDetails_games'));

    if(session.status == 'Open') {
        $('#sessionDetails_reopen').hide();
        $('#sessionDetails_play').show();
        $('#sessionDetails_section').removeClass('session-closed');
    } else {
        $('#sessionDetails_reopen').show();
        $('#sessionDetails_play').hide();
        $('#sessionDetails_section').addClass('session-closed');
    }
}

//From Session History
function viewSessionDetails() {
    var id = $(this).parents('tr').attr('id').replace('sessionList_','');
    viewDetailsOfSession(id);
}

//Details from Home
function viewCurrentSessionDetails() {
    viewDetailsOfSession(app.curSession.id);
}

var app = {
    nextPlayerId: 0,
    nextSessionId: 1,
    enableKitty: true,
    kittyPoints: 0,
    players : [],
    sessions: [],
    curSession: null
};

function goBackToSeesionList() {
    $('#container').attr('currentSection', 'sessionList_section');
}

function sendText() {
	window.open('https://wa.me/918897994040?text=hello');
}

/*
player
    id
    name
app
    curSession
    players[]
    sessions[]
sessiongamecredit

    name
    startTime
    endTime
    games[]
    curGame
game
    name
    scoreCards[]
scoreCard
    player
    bonus
    points
    credit
*/