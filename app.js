const express = require('express'); 
const app = express(); 
const bcrypt = require('bcrypt'); 
const jwt = require("jsonwebtoken"); 
const auth = require("./auth");
require('dotenv').config(); 
const Document = require('./db/Document')
const cors = require('cors')


//database connection
const dbConnect = require('./db/dbConnect'); 
const User = require('./db/userModel');


dbConnect(); 


app.use(express.json());

//front end connection
app.use(
    cors({
        origin: process.env.CLIENT_URL,
    })
)

  

//stripe connection
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY)

// payment setup
const storeItems = new Map([
    [1, { priceInCents: 5000, name: "College-Specific Review"}],
    [2, {priceInCents: 2500, name: "Resume Review"}], 
    [3, {priceInCents: 2500, name: "Activities/Honors Review"}],
    [4, {priceInCents: 5000, name: "Practice Interiew"}]
])

app.post('/create-checkout-session', async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: req.body.items.map(item => {
                const storeItem = storeItems.get(item.id)
                return {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: storeItem.name
                        },
                        unit_amount: storeItem.priceInCents
                    },
                    quantity: item.quantity
                }
            }),
            success_url: `${process.env.CLIENT_URL}/success.html`,
            cancel_url: `${process.env.CLIENT_URL}/cancel.html`
        })
        res.json({ url: session.url })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})


app.get("/", (req, res) => {
    res.send("Hello, the server is functioning!");
})

// Curb Cores Error by adding a header here
// app.use((req, res, next) => {
//     res.setHeader("Access-Control-Allow-Origin", "*");
//     res.setHeader(
//       "Access-Control-Allow-Headers",
//       "Origin, X-Requested-With, Content, Accept, Content-Type, Authorization"
//     );
//     res.setHeader(
//       "Access-Control-Allow-Methods",
//       "GET, POST, PUT, DELETE, PATCH, OPTIONS"
//     );
//     next();
//   });

//Create register endpoint

app.post("/register", (request, response) => {
    console.log(request.body.password); 
    //hash the password received from request body 10 times or 10 salt rounds
    bcrypt.hash(request.body.password, 10)
        .then((hashedPassword) => {
            console.log(request.body.fullname);
            console.log(request.body.email); 
            const user = new User({ 
                fullname: request.body.fullname,
                email: request.body.email,
                password: hashedPassword,
            });
            user.save().then((result) => {
                console.log("successfull"); 
                response.status(201).send({
                    message: "User Created Successfully", 
                    result, 
                })
            })
            .catch((error) => {
                console.log("error creating user"); 
                response.status(500).send({
                    message: "Error creating user", 
                    error,
                })
            })

        })
        .catch((e) => {
            console.log("password was not hashed");
            response.status(500).send({
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

app.get("/comments/:id", (request, response) => {
    const id = request.params.id;

    Document.findById(id)
        .then((document) => {
            response.json(document.comments);
            console.log("successfuly grabbed comments")
        })
        .catch((e) => {
            response.status(404).send({
                message: "Could not find document", 
                e,
            });
        })
})

app.post("/comments", (request, response) => {
    const { _id, comments } = request.body;

    Document.findOne({ _id })
        .then((document) => {
            document.comments = comments;
            document.save().then((result) => {
                console.log("successfull"); 
                response.status(201).send({
                    message: "Comments updated successfully", 
                    result, 
                })
            })
            .catch((error) => {
                console.log("error creating user"); 
                response.status(500).send({
                    message: "An error occurred while updating comments" , 
                    error,
                })
            })
        })
        .catch((error) => {
            console.log("document not found");
            response.status(404).send({
                message: "Could not find document", 
                e,
            });
        })
})

// free endpoint
app.get("/free-endpoint", (request, response) => {
    response.json({ message: "You are free to access me anytime" });
  });
  
  // authentication endpoint
app.get("/auth-endpoint", auth, (request, response) => {
    response.json({ message: "You are authorized to access me" });
});

module.exports = app; 