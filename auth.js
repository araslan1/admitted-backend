const jwt = require('jsonwebtoken');
const User = require('./db/userModel');
require('dotenv').config()



//export an asynchronous function that trys to check if a user is logged in
module.exports = async (request, response, next) => {
    try {
        //get the toke
        const token = await request.headers.authorization.split(" ")[1]; 

            //check if token matches supposed origin
            const decodedToken = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET); 

            // retreive the user details of the logged in user
            const user = await decodedToken; 

            User.findById(user.userId)
                .then((user) => {
                    if (request.params.dashboardId){
                        if (user.dashboardId !== request.params.dashboardId) {
                            response.status(401).json({
                                error: new Error("Invalid Request!"), 
                            })
                        }
                    }
                })
                .catch((error) => {

                })
                
            //check if this is the user's correct dashboard
            request.user = user; 
                    //pass down functionality to next endpoint
            next(); 

    
    } catch (error) {
        response.status(401).json({
            error: new Error("Invalid Request!"), 
        })
    }
}