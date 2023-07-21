const jwt = require('jsonwebtoken');
const User = require('./db/userModel');
require('dotenv').config()



//export an asynchronous function that trys to check if a user is logged in
module.exports = async (request, response, next) => {
    try {
        //get the token
        const token = await request.headers.authorization.split(" ")[1]; 

            //check if token matches supposed origin
            const decodedToken = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET); 

            // retreive the user details of the logged in user
            const user = await decodedToken; 

            await User.findById(user.userId)
                .then(async (user) => {
                    if (request.params.documentId){
                        if (!user.documentIds.includes(request.params.documentId)) {
                            throw new Error("You do not have access to his document")
                        }
                        else{
                            request.isReviewer = user.isReviewer; 
                            request.id = user._id.toString(); 
                            await Document.findById(request.params.dashboardId)
                                .then((document) => {
                                    request.userHasSubmitted = document.userHasSubmitted;
                                    request.essaysReviewed = document.essaysReviewed; 
                                })
                                .catch(() => {
                                    throw new Error("document could not be found")
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