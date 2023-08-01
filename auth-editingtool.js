const jwt = require('jsonwebtoken');
const User = require('./db/userModel');
const Document = require('./db/Document'); 
const Reviewer = require('./db/Reviewer');
require('dotenv').config()




//export an asynchronous function that trys to check if a user is logged in
module.exports = async (request, response, next) => {
    try {
        console.log('entered');
        let userHasSubmitted; 
        let isReviewer;
        let id; 
        let essaysReviewed;
        let userFound; 
        let reviewerFound; 
        //get the token
        const token = await request.headers.authorization.split(" ")[1]; 

            //check if token matches supposed origin
            const decodedToken = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET); 

            // retreive the user details of the logged in user
            const user = await decodedToken; 
        

            console.log("about to find user")
            await User.findById(user.userId)
                .then(async (user) => {
                    console.log("a user has been found!")
                    if (request.params.documentId){
                        console.log("documentId param exists!")
                        if (!user.documentIds.includes(request.params.documentId)) {
                            console.log(error); 
                            throw new Error("You do not have access to his document")
                        }
                        else{
                            console.log("documentId belongs to user!")
                            isReviewer = user.isReviewer; 
                            id = user._id.toString(); 
                            userFound = true; 
                            console.log("about to search for documentId")
                            await Document.findById(request.params.documentId)
                                .then((document) => {
                                    console.log("document found!")
                                    userHasSubmitted = document.userHasSubmitted;
                                    essaysReviewed = document.essaysReviewed; 
                                })
                                .catch((error) => {
                                    console.log(error);
                                    throw new Error("document could not be found")
                                })
                        }
                    }
                })
                .catch((error) => {
        
                })

            await Reviewer.findById(user.userId)
                .then(async (reviewer) => {
                    console.log("reviewer found")
                    if (request.params.documentId){
                        const isDocumentIdIncluded = reviewer.documentIds.some(
                            (item) => item.documentId === request.params.documentId
                        );

                        if (!isDocumentIdIncluded) {
                            throw new Error("Invalid Dashboard Id")
                        }else{
                            isReviewer = true; 
                            reviewerFound = true; 
                            id = reviewer._id.toString(); 
                            await Document.findById(request.params.documentId)
                                .then((document) => {
                                    console.log("document found!");
                                    console.log(document.whichReviewerMatched);
                                    console.log(reviewer.dashboardId);
                                    if (document.whichReviewerMatched !== reviewer.dashboardId){
                                        throw new Error("this reviewer doesn't have access");
                                    }
                                    userHasSubmitted = document.userHasSubmitted;
                                    essaysReviewed = document.essaysReviewed; 
                                })
                                .catch(() => {
                                    console.log("document could not be found?")
                                    throw new Error("document could not be found")
                                })
                        }
                    }
                })
                .catch((error) => {
                
                })

            if (!userFound && !reviewerFound){
                throw new Error("neither user or reviewer could be found!");
            }
            console.log("about to update request object")
            request.isReviewer = isReviewer; 
            request.id = id; 
            request.userHasSubmitted = userHasSubmitted;
  
            request.essaysReviewed = essaysReviewed; 
            
            //check if this is the user's correct dashboard
            request.user = user; 
                    //pass down functionality to next endpoint
            next(); 

    } catch (error) {
        console.log("This is the error: " + error)
        response.status(401).json({
            error: new Error("Invalid Request!"), 
        })
    }
}