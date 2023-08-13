var express = require('express');
var router = express.Router();
const dotenv = require('dotenv');
const { v4: uuidV4 } = require('uuid'); 
const User = require('../db/userModel');
const jwt = require("jsonwebtoken"); 
dotenv.config();
const { OAuth2Client } = require('google-auth-library');


async function getUserData(access_token) {

    try {
        const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`);
        if (!response.ok) {
            console.error('Error fetching user data:', response.status, response.statusText);
        }
    //console.log('response',response);
        const data = await response.json();
        console.log('data',data);
        return data;
    } catch (error) {
        console.error('Error fetching user data:', error);
    }

  }
  

router.get('/', async (req, res, next) => {
    const code = req.query.code;
    console.log('code', code);
    try {
        const redirectUrl = `${process.env.SERVER_URL}/oauth`;
        const oAuth2Client = new OAuth2Client(
            process.env.CLIENT_ID,
            process.env.CLIENT_SECRET,
            redirectUrl
        );
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        console.log('tokens acquired!', tokens);
        const user = tokens; // Store the tokens directly, or you can store relevant data from the tokens
        console.log('credentials', user);
        const userData = await getUserData(user.access_token);
        console.log("USER DATA", userData); 
        let existingUser = await User.findOne({email: userData.email}); 
        let token; 
        let dashboardId; 
        if (existingUser){
            dashboardId = existingUser.dashboardId; 
            token = await jwt.sign(
                {
                    userId: existingUser._id,
                    userEmail: existingUser.email, 
                },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: "24h" }
            );

        }else{
            dashboardId = uuidV4(); 
            const user = new User({
                fullname: userData.name, 
                email: userData.email,
                dashboardId: dashboardId, 
                isGoogleAuth: true, 
              });
            const result = await user.save();
            const userId = result._id;
            console.log(userId); 
            token = await jwt.sign(
                {
                    userId: userId,
                    userEmail: userData.email,
                },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: "24h" }
            );
            
        }

        res.redirect(`${process.env.CLIENT_URL}/googleAuth?token=${token}&dashboardId=${dashboardId}`); // Redirect the user to the dashboard
    } catch (err) {
        console.error('Error with signing in with Google:', err);
        res.status(500).send('Error with signing in with Google');
    }
});

module.exports = router;
