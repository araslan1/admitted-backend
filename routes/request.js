var express = require('express'); 
var router = express.Router(); 
const dotenv = require('dotenv'); 
dotenv.config(); 
const {OAuth2Client} = require("google-auth-library"); 


router.post('/', async (req, res, next) => {
    res.header('Access-Control-Allow-Origin', `${process.env.CLIENT_URL}`); 
    res.header('Referrer-Policy', 'no-referrer-when-downgrade') // you need to adjust this for when ur not just testing!
    
    const redirectUrl = `${process.env.SERVER_URL}/oauth`;


    const oAuth2Client = new OAuth2Client(
        process.env.CLIENT_ID, 
        process.env.CLIENT_SECRET,
        redirectUrl, 
    )

    const authorizeUrl = oAuth2Client.generateAuthUrl({
        access_type:'online', 
        scope:'https://www.googleapis.com/auth/userinfo.profile openid email', 
        prompt: 'consent'
    })
    res.json({url:authorizeUrl});
})

module.exports = router;