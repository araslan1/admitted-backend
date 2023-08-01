const jwt = require('jsonwebtoken');
const Reviewer = require('./db/Reviewer');
require('dotenv').config()



//export an asynchronous function that trys to check if a user is logged in
module.exports = async (request, response, next) => {
    try {
        //get the token
        const token = await request.headers.authorization.split(" ")[1]; 

            //check if token matches supposed origin
            const decodedToken = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET); 

            // retreive the user details of the logged in user
            const reviewer = await decodedToken; 

            await Reviewer.findById(reviewer.userId)
                .then((reviewer) => {
                    if (request.params.dashboardId){
                        if (reviewer.dashboardId !== request.params.dashboardId) {
                            throw new Error("Invalid Dashboard Id")
                        }
                    }else{
                        request.dashboardId = reviewer.dashboardId;
                    }
                })
                .catch((error) => {
                    
                })
                
            //check if this is the user's correct dashboard
            request.reviewer = reviewer; 
                    //pass down functionality to next endpoint
            next(); 

    
    } catch (error) {
        response.status(401).json({
            error: new Error("Invalid Request!"), 
        })
    }
}