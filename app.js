const express = require('express'); 
const app = express(); 
const bcrypt = require('bcrypt'); 
const jwt = require("jsonwebtoken"); 
const auth = require("./auth");


//database connection
const dbConnect = require('./db/dbConnect'); 
const User = require('./db/userModel');


dbConnect(); 


app.use(express.json());

app.get("/", (req, res) => {
    res.send("Hello, the server is functioning!");
})

// Curb Cores Error by adding a header here
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content, Accept, Content-Type, Authorization"
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, PATCH, OPTIONS"
    );
    next();
  });

//Create register endpoint

app.post("/register", (request, reponse) => {
    //hash the password received from request body 10 times or 10 salt rounds
    bcrypt.hash(request.body.password, 10)
        .then((hashedPassword) => {
            const user = new User({ 
                fullname: request.body.fullname,
                email: request.body.email,
                password: hashedPassword,
            });
            user.save().then((result) => {
                reponse.status(201).send({
                    message: "User Created Successfully", 
                    result, 
                })
            })
            .catch((error) => {
                response.status(500).send({
                    message: "Error creating user", 
                    error,
                })
            })

        })
        .catch((e) => {
            reponse.status(500).send({
                message: "Password was not hashed successfully", 
                e
            });
        });

});


//Create Login Endpoint

app.post("/login", (request, response) => {
    //check if email exists in system
    User.findOne({ email: request.body.email })
         .then((user) => {
            // compare if passwords are equal
            console.log(request.body.password);
            console.log(user.password); 
            bcrypt.compare(request.body.password, user.password)
                .then((passwordCheck) => {
                    console.log(passwordCheck);
                    //if passwords don't match, send eeror
                    if (!passwordCheck) {
                        return response.status(400).send({
                            message: "Passwords don't match", 
                            error, 
                        })
                    }


                    //create JWT Token
                    const token = jwt.sign(
                        {
                            userId: user._id,
                            userEmail: user.email, 
                        },
                        "RANDOM-TOKEN",
                        { expiresIn: "24h" }
                    );

                    //send success message if login was successful
                    response.status(200).send({
                        message: "Login Successful",
                        email: user.email,
                        token,
                    })
                });
                // send error if passwords don't match
                // .catch((error) => {
                //     response.status(400).send({
                //         message: "Passwords does not match", 
                //         error,
                //     });
                // });
         })
         //error if email doesn't exist in database
         .catch((e) => {
            response.status(404).send({
                message: "Email not found", 
                e,
            });
         });
});

// free endpoint
app.get("/free-endpoint", (request, response) => {
    response.json({ message: "You are free to access me anytime" });
  });
  
  // authentication endpoint
app.get("/auth-endpoint", auth, (request, response) => {
    response.json({ message: "You are authorized to access me" });
});

module.exports = app; 