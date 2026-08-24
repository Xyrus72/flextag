const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, "../.env")
});


const {
    sendEmail
} = require("../services/emailService");


async function test(){

    try{

        await sendEmail(
            process.env.GMAIL_SENDER_EMAIL,
            "FlexTag Gmail Test",
            "Congratulations! Gmail API is working successfully."
        );


        console.log("✅ Email sent successfully");

    }
    catch(error){

        console.log("❌ Email failed");

        console.log(error.message);

    }

}


test();