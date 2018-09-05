require('dotenv').config();
const RtmClient = require('@slack/client').RtmClient;
const WebClient = require('@slack/client').WebClient;
const CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;
const TurndownService = require('turndown');
const fetch = require('isomorphic-fetch');
const { createServer } = require('http');

const { BEER } = require('./constants');

const TOKEN = process.env.SLACK_BOT_TOKEN || '';
const BOT_USER_ID = process.env.BOT_USER_ID || '';
const DARK_SKY_API_KEY = process.env.DARK_SKY_API_KEY || '';

// Used for sending and listening to realtime messaging
const rtm = new RtmClient(TOKEN);
// Used for just sending messages, for example: attachments
const web = new WebClient(TOKEN);
const turndownService = new TurndownService()

function isBot(text) {
  return text && text.includes(BOT_USER_ID);
}

function checkIfBeerExists(message) {
  return BEER.map(item => message.search(item)).filter(
    beer => beer >= 0
  ).length > 0;
}

function checkCaseBasedOnMessage(text) {
  const message = text.toLowerCase();
  if (message.includes('xkcd')) {
    return 'xkcd';
  } else if (message.includes('väder')) {
    return 'darksky';
  } else if (checkIfBeerExists(text)){
    return 'beer';
  } else if (message.includes('banan') || message.includes('banana') || message.includes('bananer') ||  message.includes('bananas')){
    return 'banana';
  } else if (message.includes('canvas')){
    return 'canvas';
  }
  return 'default';
}


function handleRealTimeMessage(message) {
  if (isBot(message.text)) {
    const selected = checkCaseBasedOnMessage(message.text);
    switch (selected) {
      case 'xkcd':
        fetchAndSendXKCDComic(message);
        break;
      case 'darksky':
        fetchAndSendWeatherInfo(message);
        break;
      case 'beer':
        sendBeerMessage(message);
        break;
      case 'banana':
        rtm.sendMessage(":banana:", message.channel);
      case 'canvas':
        fetchAndSendAnnouncements(message);
        break;
      default:
        return 'default';
    }
  }
}

function formatAttachments(comic){
  return [
    {
      fallback: `${comic.title}`,
      color: '#1DB954',
      title: `${comic.title}`,
      title_link: `https://xkcd.com/${comic.num}`,
      text: `${comic.alt}`,
      image_url: `${comic.img}`,
      footer: 'xkcd'
    }
  ];
}

function fetchAndSendXKCDComic(message) {
  const rand = Math.floor(Math.random() * 500) + 1;
  fetch(`https://xkcd.com/${rand}/info.0.json`)
    .then(response => response.json())
    .then(comic => {
      const attachments = formatAttachments(comic);
      web.chat.postMessage(
        message.channel,
        '',
        { attachments, as_user: true },
        (error, response) => {
          if (error) console.log(error);
        }
      );
    });
}

function fetchAndSendWeatherInfo(message){
  fetch(`https://api.darksky.net/forecast/${DARK_SKY_API_KEY}/59.3293,18.0686?lang=sv&units=auto`)
    .then(res => res.json())
    .then(data => {
      rtm.sendMessage(data.daily.summary, message.channel);
    });
}

function sendBeerMessage(message){
  rtm.sendMessage(
    `Självklart <@${
    message.user
    }>! Varför ta ansvar när man kan ta en öl (eller ett alkoholfritt alternativ)! :beers:`,
    message.channel
  );
}

async function getAnnouncements(){
  const response = await fetch('https://canvas.academy.se/api/v1/announcements?context_codes[]=course_33', {
    method: 'GET',
    headers: {
      'Authorization' : `Bearer ${process.env.CANVAS_TOKEN}`
    }
  });
  return response.json();
}

async function fetchAndSendAnnouncements(message) {
  const announcements = await getAnnouncements();
  const attachments = await announcements.slice(0,3).map(formatAnnouncement);
  web.chat.postMessage(
      message.channel,
      'De tre senaste meddelandena från canvas',
      { attachments, as_user: true },
      (error, response) => {
        if (error) console.log(error.message);
      }
  );
}

function formatAnnouncement(announcement){
  return {
    title: announcement.title,
		title_link: announcement.html_url,
		author_icon: announcement.author.avatar_image_url,
		author_name: announcement.author.display_name,
		author_link: announcement.author.html_url,
    text: turndownService.turndown(announcement.message),
    ts: announcement.posted_at,
		mrkdwn_in: ["text", "pretext"]
  }
}

function connectedStatusReport(message){
    console.log(
      `Logged in as ${message.self.name} of team ${
      message.team.name
      }, but not yet connected to a channel`
    );
}

rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, connectedStatusReport);
rtm.on(RTM_EVENTS.MESSAGE, handleRealTimeMessage);

rtm.start();



const server = createServer((req, res) => {
  res.end('Yupp');
});

server.listen(process.env.PORT || 4000);
