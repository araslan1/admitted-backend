const jwt = require('jsonwebtoken');
const User = require('./db/userModel');
require('dotenv').config()



//export an asynchronous function that trys to check if a user is logged in
module.exports = async (request, response, next) => {
    try {
        let dashboardId; 
        //get the toke
        const token = await request.headers.authorization.split(" ")[1]; 

            //check if token matches supposed origin
            const decodedToken = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET); 

            // retreive the user details of the logged in user
            const user = await decodedToken; 

            await User.findById(user.userId)
                .then((user) => {
                        if (request.params.dashboardId){
                            if (user.dashboardId !== request.params.dashboardId) {
                                throw new Error("Invalid Dashboard Id")
                            }
                        }else{
                            dashboardId = user.dashboardId;
                        }
                })
                .catch((error) => {
                    throw new Error("user could not be found"); 
                })
                
            //check if this is the user's correct dashboard
            request.dashboardId = dashboardId
            request.user = user; 
                    //pass down functionality to next endpoint
            next(); 

    
    } catch (error) {
        response.status(401).json({
            error: new Error("Invalid Request!"), 
        })
    }
}