const { google } = require("googleapis");


// ============================================================
// Gmail OAuth Client
// ============================================================

const oauth2Client = new google.auth.OAuth2(

    process.env.GMAIL_CLIENT_ID,

    process.env.GMAIL_CLIENT_SECRET,

    "http://localhost"

);
oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN
});

// ============================================================
// Generate Gmail Auth URL
// Run this once to authorize your Gmail account
// ============================================================

function generateAuthUrl(){

    return oauth2Client.generateAuthUrl({

        access_type:"offline",

        scope:[
            "https://www.googleapis.com/auth/gmail.send"
        ]

    });

}


// ============================================================
// Set OAuth Token
// After authorization Google gives refresh token
// ============================================================

function setCredentials(tokens){

    oauth2Client.setCredentials(tokens);

}


// ============================================================
// Send Email
// ============================================================

async function sendEmail(
    receiver,
    subject,
    message
){

    const gmail = google.gmail({
        version:"v1",
        auth:oauth2Client
    });


    const email = [

        `From: ${process.env.GMAIL_SENDER_EMAIL}`,

        `To: ${receiver}`,

        `Subject: ${subject}`,

        "",

        message

    ].join("\n");


    const encodedMessage =
        Buffer
        .from(email)
        .toString("base64")
        .replace(/\+/g,"-")
        .replace(/\//g,"_")
        .replace(/=+$/,"");


    const result =
        await gmail.users.messages.send({

            userId:"me",

            requestBody:{
                raw:encodedMessage
            }

        });


    return result.data;

}


module.exports={

    generateAuthUrl,

    setCredentials,

    sendEmail

};