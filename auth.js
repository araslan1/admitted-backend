const jwt = require('jsonwebtoken');



//export an asynchronous function that trys to check if a user is logged in
module.exports = async (request, response, next) => {
    try {
        //get the toke
        const token = await request.headers.authorization.split(" ")[1]; 

            //check if token matches supposed origin
            const decodedToken = await jwt.verify(token, "RANDOM-TOKEN"); 

            // retreive the user details of the logged in user
            const user = await decodedToken; 

            // pass the user down to the endpoints here
            request.user = user; 

            //pass down functionality to next endpoint
            next(); 

    } catch (error) {
        response.status(401).json({
            error: new Error("Invalid Request!"), 
        })
    }
}