// Ivan Thieu - 01/07/2018
// Created to keep track of the 2018 IT Season (Office Basketball)
// IT Leaderboards

// Global ss variable
var ss = SpreadsheetApp.getActiveSheet();

// Get all of the players in the sheet
function get_all_players() {
  return ss.getRange('B2:B').getValues().filter(String);
}

// Define a class for the player
function Player(name) {
  this.name = name;
  this.sig_shot = '';
  this.wins = 0;
  this.games = 0;
  this.streak = 0;
  this.win_rate = '';
}

// Get player range
function get_player_range(name) {
  var all_players = get_all_players().join().split(',');
  var player_index = all_players.indexOf(name);
  
  // Get row of existing player
  if (player_index > -1) {
    var player_row = player_index + 2;
    return ss.getRange(player_row, 2, 1, 6);
  }
  
  // Create new row for new player
  else {
    var addition_row = ss.getRange('B:B').getValues().filter(String).length + 1;
    var range_loc = ss.getRange(addition_row, 2, 1, 6);
    return range_loc;
  }
}

// Get the profile for a specific player
function get_profile(name) {
  var player_stats = get_player_range(name).getValues().join().split(',');
  var player = new Player(name);
  player.sig_shot = player_stats[1];
  player.wins = player_stats[2];
  player.games = player_stats[3];
  player.streak = player_stats[4];
  player.win_rate = player_stats[5];
  return player;
}

// Update or create the profile for a specific player
function set_profile(name, overwrite_param, overwrite_value) {
  var range = get_player_range(name);
  var player = get_profile(name);
  if (overwrite_param != '' && overwrite_value != '') {
    player[overwrite_param] = overwrite_value;
  }
  
  var player_rank = get_all_players().join().split(',').indexOf(name);
  if (player_rank == -1) {
    var player_values = [[player.name, player.sig_shot, 0,
                        0, 0, '']];
    var key_word = 'created';
  }
  else {
    var player_values = [[player.name, player.sig_shot, player.wins,
                        player.games, player.streak, '']];
    var key_word = 'updated'
  }
  range.setValues(player_values);
  return 'Player: ' + name + ' has been ' + key_word;
}

// Sort the sheet after every update
function update_ranking() {
  ss.getRange('B2:F').sort([{column: 4, ascending: false}, {column: 5, ascending: true}]);
}

// Update the wins and number games for winner and participants
function update_score(participants) {
  
  // Get the players on the sheet and create a class for them
  var all_players = get_all_players().join().split(',');
  var participants = participants.replace(/,\s*/g, ',').split(',');
  var participant_index = [];
  for (var i = 0; i < participants.length; i++) {
    participant_index.push(all_players.indexOf(participants[i]));
  }
  
  // Do not update the score if a name is not on the list of values
  if (participant_index.indexOf(-1) > -1) {
    return participants[participant_index.indexOf(-1)] + 
      ' is not a player on the list. Please add him/her to the database first'
  }
  
  // Add a win, streak, and game for the winner
  var winner = get_profile(participants[0]);
  var range = get_player_range(winner.name);
  range.setValues([[winner.name, winner.sig_shot, parseInt(winner.wins) + 1,
                    parseInt(winner.games) + 1, parseInt(winner.streak) + 1, '']]);
  
  // Add a game and reset streak for other participants
  for (var i = 1; i < participants.length; i++) {
    var player = get_profile(participants[i]);
    var range = get_player_range(player.name);
    range.setValues([[player.name, player.sig_shot, player.wins,
                      parseInt(player.games) + 1, 0, '']]);
  }

  // Update the rankings after the calculations
  update_ranking();
  return "Database has been successfully updated";
}

function get_leaderboard() {
  var ranks = ss.getRange('A:A').getValues().filter(String);
  var names = ss.getRange('B:B').getValues().filter(String);
  var wins = ss.getRange('D:D').getValues().filter(String);
  var games = ss.getRange('E:E').getValues().filter(String);
  var streak = ss.getRange('F:F').getValues().filter(String);
  var win_rate = ss.getRange('G:G').getValues().filter(String);
  var leaderboard = [ranks, names, wins, games, streak, win_rate];
  var leaderboard = [];
  for (var i = 0; i < ranks.length; i++) {
    leaderboard.push(ranks[i] + '\t' + names[i] + '\t' +
                     wins[i] + '\t' + games[i] + '\t' +
                     streak[i] + '\t' + win_rate[i])
  }
  return leaderboard.join('\n').replace(/undefined/g, 'N/A');
}

function doPost(e) {
  var outgoing_token = 'OUTGOING WEBHOOK TOKEN';
  var sheet_id = 'SHEET ID';
  var parameters = e.parameters;
  var incoming_webhook = 'WEBHOOK URL';
  
  // Do stuff if the token matches that sent by slack
  if (parameters.token == outgoing_token) {
    var sheets = SpreadsheetApp.openById(sheet_id);
    var text = parameters.text.toString()
    var trigger_word = parameters.trigger_word.toString();
    var info = text.replace(trigger_word, '').trim();   
    var data_text;
    
    // Return the leaderboard
    if (trigger_word == '!Leaderboard') {
      data_text = get_leaderboard();
    }
    
    // Return the player profile
    else if (trigger_word == '!Profile') {
      var player = get_profile(info);
      var player_rank = get_all_players().join().split(',').indexOf(info);
      if (player_rank == -1) {
        data_text = info + ' is not a valid player. Please add him/her to the database first';
      }
      else {
        player_rank += 1;
        data_text = '*Name:* ' + player.name + '\n' +
          '*Rank:* ' + player_rank + '\n' +
            '*Signature Shot:* ' + player.sig_shot + '\n' +
              '*Wins:* ' + player.wins + '\n' + 
                '*Games:* ' + player.games + '\n' +
                  '*Streak:* ' + player.streak + '\n' +
                    '*Win Rate:* ' + player.win_rate + '%';
      }
    }
    
    // Add a player
    else if (trigger_word == '!Add') {
      var player_rank = get_all_players().join().split(',').indexOf(info);
      if (player_rank != -1) {
        data_text = info + ' is already in the database';
      }
      else {
        data_text = set_profile(info);
      }
    }
    
    // Update the score
    else if (trigger_word == '!Update') {
      data_text = update_score(info);
    }
    
    // Overwrite/set data
    else if (trigger_word == '!Overwrite') {
      info = info.replace(/,\s*/g, ',').split(',');
      var player_name = info[0];
      var overwrite_param = info[1];
      var overwrite_value = info[2];
      
      var player_rank = get_all_players().join().split(',').indexOf(player_name);
      if (player_rank == -1) {
        data_text = player_name + ' is not in the database';
      }
      else if (overwrite_param == '' || overwrite_value == '') {
        data_text = 'Invalid overwrite parameter/value';
      }
      else {
        data_text = set_profile(player_name, overwrite_param, overwrite_value);
      }
    }
    
    else if (trigger_word == '!Help') {
      data_text = '*Commands*\n' +
       '*!Leaderboard* - Displays the leaderboard\n' +
        '*!Update WINNER, PLAYER1, PLAYER2...* - Updates the leaderboards. Separate the players with a comma and the winner goes first\n' +
          '*!Profile PLAYER_NAME* - Gets the profile of a player\n' +
            '*!Add PLAYER_NAME* - Adds player to database\n' +
              '*!Overwrite PLAYER_NAME, KEY, VALUE* - Overwrites the stats of a player. Value keys: sig_shot, wins, games, streak\n' +
                '*!Help* - Displays command list';
    }
    
    // Return the stats to the slack channel when the image that is assigned a script is clicked
    var data = {
      'text':data_text
    };
    var options = {
      'method' : 'post',
      'contentType': 'application/json',
      // Convert the JavaScript object to a JSON string.
      'payload' : JSON.stringify(data)
    };
    UrlFetchApp.fetch(incoming_webhook, options);
  }
 }