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


const code = process.argv[2];


if (!code) {

    console.log(
        "Run: node scripts/gmailToken.js YOUR_CODE_HERE"
    );

    process.exit();

}


async function getToken(){

    try {

        const { tokens } =
            await oauth2Client.getToken(code);


        console.log("\nTOKEN GENERATED\n");

        console.log(tokens);


        console.log("\nRefresh Token:\n");

        console.log(tokens.refresh_token);


    } catch(error){

        console.log(error.message);

    }

}


getToken();