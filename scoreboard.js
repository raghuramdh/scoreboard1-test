$(document).ready(function(){
    $('#playersSetup_button').click(openPlayersSetup);
    $('#startSession_button').click(startNewSession);
    $('#sessionList_button').click(showSessionList);
    $('#backToGame_button').click(backToGame);
    $('#resetGame_button').click(resetGame);
    $('#nextGame_button').click(nextGame);
    $('#addPlayer_button').click(addPlayer);
    $('body').on('click', '.deletePlayer_button', deletePlayer); 
    $('#sessionList').on('click', 'td', viewSessionDetails);
    $('#gameBoard').on('change', '.gameBoard_bonus', calculateCreditOnBonusChange);
    $('#gameBoard').on('change', '.gameBoard_points', calculateCreditOnPointsChange);
    //init();
});

function init() {
    $('#newPlayer_text').val('Raghu Ram');
    addPlayer();
    $('#newPlayer_text').val('Sirisha');
    addPlayer();
}

function goToHome() {
    $('#container').attr('currentSection', 'home');
}

function backToGame() {
    $('#container').attr('currentSection', 'scoreBoard_section');
}

function openPlayersSetup() {
    $('#container').attr('currentSection', 'playersSetup_section');
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

    if(players.length == 2) {
        $('#startSession_button').removeAttr('disabled');
    }

    $('#playerNames > tbody').append(
        '<tr id="player_'+player.id+'">'
            +'<td>'+pname+'</td>'
            +'<td><button type="button" class="deletePlayer_button">X</button></td>'
        +'</tr>'
    );
    
    $('#newPlayer_text').val('');

    if(app.curSession) {
        var game = app.curSession.curGame;
        var card = {};
        card.player = player;
        card.gameCredit = 0;
        game.scoreCards.push(card);
        addScoreCard(card);
    }
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
}

function startNewSession() {
    var session = {};
    session.startTime = new Date();
    session.id = app.nextSessionId++;
    session.name = session.startTime.toLocaleDateString('en-IN',{ year: 'numeric', month: 'short', day: 'numeric' }) + '[' + session.id + ']';
    session.games = [];
    app.curSession = session;
    app.sessions.push(session);
    newGame();
    $('#scoreBoard_sessionName').text(session.name);
    $('#container').attr('currentSection', 'scoreBoard_section');
    $('#container').removeClass('noSession');
    $('#container').addClass('hasSession');
}

function newGame() {
    $('#gameBoard > tbody').empty();
    var session = app.curSession;
    var game = {
        name: 'Game '+ (session.games.length+1),
        status: 'In Progress'
    }
    var scoreCards = [];
    for(var p in app.players) {
        var card = {};
        card.player = app.players[p];
        card.gameCredit = 0;
        scoreCards.push(card);
        addScoreCard(card);
    }
    game.scoreCards = scoreCards;
    session.curGame = game;
    session.games.push(game);
    if(app.sessions.length == 1 && session.games.length == 1) {
        $('#backToGame_button').removeAttr('disabled');
    } else if(app.sessions.length == 1 && session.games.length == 2) {
        $('#sessionList_button').removeAttr('disabled');
    }
    $('#scoreBoard_title').text(game.name);
}

function addScoreCard(scoreCard) {
    $('#gameBoard > tbody').append(
        '<tr id="scoreCard_'+scoreCard.player.id+'">'
            +'<td>'+scoreCard.player.name+'</td>'
            +'<td><input type="text" size="4" class="gameBoard_bonus" id="gameBoard_bonus_'+scoreCard.player.id+'"/></td>'
            +'<td><input type="text" size="4" class="gameBoard_points" id="gameBoard_points_'+scoreCard.player.id+'"/></td>'
            +'<td id="gameBoard_gameCredit_'+scoreCard.player.id+'">'+scoreCard.gameCredit+'</td>'
        +'</tr>'
    );
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

function calculateCreditOnPointsChange() {
    var id = $(this).attr('id').replace('gameBoard_points_', '');
    var cards = app.curSession.curGame.scoreCards;
    for(var i in cards) {
        if(cards[i].player.id == id) {
            cards[i].points = Number($(this).val());
            break;
        }
    }
    calculateCredit();
}

function calculateCredit() {
    var cards = app.curSession.curGame.scoreCards;
    for(var i in cards) {
        var bcredit = 0;
        var pcredit = 0;
        for(var j in cards) {
            if(cards[j].player.id == cards[i].player.id) {
                continue;
            }
            bcredit += (isEmpty(cards[i].bonus)?0:cards[i].bonus) - (isEmpty(cards[j].bonus)?0:cards[j].bonus);
            if(!isEmpty(cards[i].points) && cards[i].points == 0) {
                pcredit += isEmpty(cards[j].points)?0:cards[j].points;
            }
        }
        if(!isEmpty(cards[i].points) && cards[i].points > 0) {
            pcredit -= isEmpty(cards[i].points)?0:cards[i].points;
        }
        cards[i].gameCredit = bcredit + pcredit;
        $('#gameBoard_gameCredit_'+cards[i].player.id).text(cards[i].gameCredit);
    }
}

function isEmpty(val) {
    return val == undefined || val == null ;
}

function resetGame() {
    var cards = app.curSession.curGame.scoreCards;
    for(var i in cards) {
        cards[i].bonus = null;
        cards[i].points = null;
        $('#gameBoard_bonus_'+cards[i].player.id).val(null);
        $('#gameBoard_points_'+cards[i].player.id).val(null);
        $('#gameBoard_gameCredit_'+cards[i].player.id).text(cards[i].gameCredit);
    }
    calculateCredit();
}

function nextGame() {
    if(validateGame()) {
        app.curSession.curGame.status = 'Done';
        newGame();
    } else {
        alert('Incomplete Score');
    }
}

function validateGame() {
    var cards = app.curSession.curGame.scoreCards;
    var winnerFound = false;
    for(var i in cards) {
        if(isEmpty(cards[i].bonus) || isEmpty(cards[i].points)) {
            return false;
        }
        if(cards[i].points == 0 && winnerFound) {
            return false;
        }
        if(cards[i].points == 0 && !winnerFound) {
            winnerFound = true;
        }
    }
    return true;
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
}

function goBackToSeesionList() {
    $('#container').attr('currentSection', 'sessionList_section');
}

function viewSessionDetails() {
    $('#container').attr('currentSection', 'sessionDetails_section');
    $('#sessionDetails_games').empty()
    var id = $(this).parents('tr').attr('id').replace('sessionList_','');
    var session = null;
    for(var s in app.sessions) {
        if(app.sessions[s].id == id) {
            session = app.sessions[s];
            break;
        }
    }
    var playerIdNameMap = {};
    var playerIdCreditMap = {};
    var playerIds = [];
    for(var g in session.games) {
        var game = session.games[g];
        if(game.status=='In Progress') {
            continue;
        }
        var gameTable = '<table class="table tabled-bordered border-primary table-striped caption-top">'
                        +'<caption>'+game.name+'</caption>'
                            +'<thead><tr><th>Player</th><th>Bonus</th><th>Points</th><th>Credit</th></tr></thead>'
                            +'<tbody>';
        for(var c in game.scoreCards) {
            var card = game.scoreCards[c];
            gameTable += ('<tr>'
                            +'<td>'+card.player.name+'</td>'
                            +'<td>'+card.bonus+'</td>'
                            +'<td>'+card.points+'</td>'
                            +'<td>'+card.gameCredit+'</td>'
                        +'</tr>');
            if(!playerIdNameMap[card.player.id]) {
                playerIds.push(card.player.id);
                playerIdNameMap[card.player.id] = card.player.name;
                playerIdCreditMap[card.player.id] = card.gameCredit;
            } else {
                playerIdCreditMap[card.player.id] = playerIdCreditMap[card.player.id] + card.gameCredit;
            }
        }
        gameTable += '</tbody></table>';
        $('#sessionDetails_games').append(gameTable);
    }
    var sessionTable =  '<table class="table tabled-bordered border-primary table-striped caption-top">'
                            +'<caption>Summary of Session '+session.name+'</caption>'
                            +'<thead><tr><th>Player</th><th>Credit</th></tr></thead>'
                            +'<tbody>';
    for(var p in playerIds) {
        sessionTable += ('<tr>'
                            +'<td>'+playerIdNameMap[playerIds[p]]+'</td>'
                            +'<td>'+playerIdCreditMap[playerIds[p]]+'</td>'
                        +'</tr>');
    }
    sessionTable += '</tbody></table>';
    $('#sessionDetails_games').prepend(sessionTable);
}

var app = {
    nextPlayerId: 1,
    nextSessionId: 1,
    players : [],
    sessions: []
};
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