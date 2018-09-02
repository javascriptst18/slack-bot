# realtime reply slack bot user

To get this up and running you need to create a new slack app and attach a new bot user to the app created and add the bot to your slack workspace. 

https://api.slack.com/slack-apps

You need:
 * Bot User OAuth Access Token
 * Bot ID (by logging 'message'-variable inside of handleRealtimeMessage, it will look like : `<@UCM337PUF>`)
 * Dark sky api key (https://darksky.net/dev) if using the weather functionality

Put these tokens inside of `.env.example` and rename the file to just `.env`.

`npm start` to run the bot