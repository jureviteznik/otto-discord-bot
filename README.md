# Otto - what is it?

Otto is a discord bot used in the Arena Pod Draft discord server for keeping track of match history for the draft league. In the league a season lasts 4 weeks. In the first 3 weeks players play in pods and for the final week 8 players with the best scores are selected for the final pod.

# Commands

## addbracket [sessionid]
Adds a all matches from a finished pod bracket.

sessionid (required) - Session id of the pod from the mtgadraft.tk website.

## addmatch [opponent] [player] [wins] [losses] [force]
Adds a match record into the database.

opponent (required) - Person from the discord server that you played against.
player - If this field is skiped the person posting is selected as player.
wins - Number of games that player won. If skiped value is set to 0.
losses - Number of games that opponent won. If skiped value is set to 0.
force - Force the bot to add the match record when it's complaining about duplicates.

## standings
displays current top 15 players

## stats [player]
displays players stats like match wins/losses, match win%, game win%...

player - If this field is skiped the person posting is selected as player.

## history [player]
displays players last 9 matches

player - If this field is skiped the person posting is selected as player.

## updateplayer [player] 
double checks players stats and updates them if necessary

player - If this field is skiped the person posting is selected as player.

## help
displays commands and their disciptions

