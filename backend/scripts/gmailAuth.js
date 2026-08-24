const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, "../.env")
});


const { google } = require("googleapis");


const oauth2Client = new google.auth.OAuth2(

    process.env.GMAIL_CLIENT_ID,

    process.env.GMAIL_CLIENT_SECRET,

    "http://localhost"

);


const authUrl =
    oauth2Client.generateAuthUrl({

        access_type: "offline",

        scope: [
            "https://www.googleapis.com/auth/gmail.send"
        ]

    });


console.log("\nOpen this URL:\n");

console.log(authUrl);

console.log("\n");