var config = process.env.CONFIG ? JSON.parse(process.env.CONFIG) : require("./config.json"),
    Toggl = require("toggl-api"),
    toggl = new Toggl({apiToken: config.keys.toggl}),
    app = require('express')(),
    http = require('http').Server(app),
    LastFm = require('lastfm').LastFmNode,
    latestEntry = {},
    projects = {},
    nowPlayingSong = {};

var lastfm = new LastFm({
  api_key: config.keys.lastfm.key,
  secret: config.keys.lastfm.secret,
  useragent: "me.tjhorner.com/express+node" + process.version + " (see tjhorner.com)"
});

var lastfmStream = lastfm.stream(config.keys.lastfm.username);
lastfmStream.start();

lastfmStream.on('nowPlaying', function(track){
  nowPlayingSong = track;
});

lastfmStream.on('stoppedPlaying', function(track){
  nowPlayingSong = {};
});

function nowPlaying(){
  if(nowPlayingSong.name){
    return {
      track: nowPlayingSong.name,
      artist: nowPlayingSong.artist["#text"],
      image: nowPlayingSong.image[3]["#text"],
      playing: true
    };
  }else{
    return {
      track: "Nothing",
      artist: "Nobody",
      image: "http://a5.mzstatic.com/us/r30/Purple3/v4/54/24/28/54242884-8dd5-83cb-1996-4a21295955de/icon175x175.png",
      playing: false
    };
  }
}

function getMyData(){
  return {
    toggl: {
      project: latestEntry.projectName,
      entry: latestEntry.description,
      current: (latestEntry.duration < 0),
      lastUpdated: latestEntry.lastUpdated
    },
    lastfm: nowPlaying()
  };
}

function updateToggl(){
  toggl.getUserData({with_related_data: true}, function(e, d){
    for(i in d.projects){
      var project = d.projects[i];
      projects[project.id] = project;
    }
    latestEntry = d.time_entries[d.time_entries.length - 1];
    if(latestEntry.pid){
      latestEntry.projectName = projects[latestEntry.pid].name;
    }else{
      latestEntry.projectName = "nothing";
    }
    latestEntry.lastUpdated = new Date();
    setTimeout(updateToggl, 600000);
  });
}

updateToggl();

app.get('/', function(req, res){
  res.setHeader("Content-Type", "text/json");
  res.setHeader("Curious", "You");
  res.send(JSON.stringify(getMyData()));
});

app.get('/jsonp', function(req, res){
  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Curious", "You");
  res.send("load(" + JSON.stringify(getMyData()) + ")");
});

http.listen(process.env.PORT || 3000);
