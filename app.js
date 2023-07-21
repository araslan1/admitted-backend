const express = require('express'); 
const app = express(); 
const Reviewer = require('./db/Reviewer');
const nodeMailer = require('nodemailer');
const bcrypt = require('bcrypt'); 
const jwt = require("jsonwebtoken"); 
const auth = require("./auth");
require('dotenv').config(); 
const Document = require('./db/Document')
const cors = require('cors')
const { v4: uuidV4 } = require('uuid'); 
const auth_editingtool = require('./auth-editingtool'); 
//database connection
const dbConnect = require('./db/dbConnect'); 
const User = require('./db/userModel');
const test_authorize = require('./test-authorize');


dbConnect(); 


app.use(express.json());



//stripe connection
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY)

//front end connection
app.use(
    cors({
        origin: ["http://localhost:3000", "https://checkout.stripe.com"],
    })
)

app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self' https://checkout.stripe.com'");
    next();
  });

// payment setup
const storeItems = new Map([
    [1, { priceInCents: 5000, name: "College 1"}],
    [2, { priceInCents: 5000, name: "College 2"}],
    [3, { priceInCents: 5000, name: "College 3"}],
    [4, { priceInCents: 5000, name: "College 4"}],
    [5, { priceInCents: 5000, name: "College 5"}],
    [6, { priceInCents: 5000, name: "College 6"}],
    [7, {priceInCents: 2500, name: "Resume Review"}], 
    [8, {priceInCents: 2500, name: "Activities/Honors Review"}],
    [9, {priceInCents: 5000, name: "Practice Interview"}]
])

// app.options('https://stripe.com/cookie-settings/enforcement-mode', cors());


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
            success_url: "http://localhost:7470/order/success?session_id={CHECKOUT_SESSION_ID}",
            cancel_url: `${process.env.CLIENT_URL}/`
        })
        res.json({ url: session.url })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.get('/order/success', async (req, res) => {
    try{
        const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
        if (!session){
            throw new Error('Invalild session ID');
        }
        console.log('session found');
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
            limit: 100,
        });
        console.log('lineitems found')
        servicesRequested = []
        new_document_Ids = []

        for (const item of lineItems.data){
            servicesRequested = [...servicesRequested, item.description];
            new_document_Ids = [...new_document_Ids, uuidV4()]; 
        }

        const email = session.customer_details.email;
        User.findOne({email: email})
            .then((user) => {
                if (user.servicesRequested){
                    user.servicesRequested = [...user.servicesRequested, ...servicesRequested];
                }else{
                    user.servicesRequested = servicesRequested;
                }
                if (user.documentIds){
                    user.documentIds = [...user.documentIds, ...new_document_Ids];
                }else{
                    user.documentIds = new_document_Ids
                }
                user.save().then(() => {
                    console.log("user services updated!");
                })
                res.redirect(`${process.env.CLIENT_URL}/dashboard/${user.dashboardId}`);
                return; 
            })
            .catch((error) => {
                console.log("Error processing order:", error);
            })

        // res.send(`<html><body><h1>Thanks for your order, ${email}!</h1></body></html>`);
    }catch (error) {
        console.log("Error processing order:", error);
        res.redirect('/payment_incomplete');
    }
})

app.get('/payment_incomplete', (req, res) => {
    res.send("Payment could not be completed")
})


app.get("/", (req, res) => {
    res.send("Hello, the server is functioning!");
})

// Curb Cores Error by adding a header here


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
                dashboardId: request.body.dashboardId,
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
                        process.env.ACCESS_TOKEN_SECRET,
                        { expiresIn: "24h" }
                    );

                    //send success message if login was successful
                    response.status(200).send({
                        message: "Login Successful",
                        email: user.email,
                        dashboardId: user.dashboardId, 
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

app.get("/comments/:id", async (request, response) => {
    const id = request.params.id;

    await Document.findById(id)
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
  

app.get("/auth-endpoint", test_authorize, (request, response) => {
    response.json({ message: "You are authorized to access me" });
})  
  // authentication endpoint
app.get("/auth-dashboard/:dashboardId", auth, (request, response) => {
    User.findById(request.user.userId)
        .then((user) => {
            response.json({
                fullname: user.fullname, 
                documentIds: user.documentIds, 
                servicesRequested: user.servicesRequested,
            })
        })
        .catch((error) => {
            console.log('Error finding user:', error); 
        })
    
    // response.header('Access-Control-Allow-Origin', 'http://localhost:3000, https://checkout.stripe.com'); // Replace with your allowed origin
    // response.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    // response.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
});

app.get("/auth-editingtool/:documentId", auth_editingtool, (request, response) => {
    console.log(request.id); 
    response.json({
        isReviewer: request.isReviewer,
        userHasSubmitted: request.userHasSubmitted,
        essaysReviewed: request.essaysReviewed,
        message: "You are authorized to access this document"
    }); 
    // response.header('Access-Control-Allow-Origin', 'http://localhost:3000, https://checkout.stripe.com'); // Replace with your allowed origin
    // response.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    // response.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
});

app.post("/editingtool/:documentId", async (request, response) => {
    await Document.findById(request.params.documentId)
        .then((document) => {
            if (request.body.userHasSubmitted){
                document.userHasSubmitted = request.body.userHasSubmitted;
            }
            if (request.body.essaysReviewed){
                document.essaysReviewed = request.body.essaysReviewed;
            }
            if (request.body._id){
                document.reviewerId = request.body._id; 
            }
            document.save().then((result) => {
                console.log("updated user has submitted / essays reviewed state"); 
                response.status(201).send({
                    message: "Comments updated successfully", 
                    result, 
                })
            })
            .catch((error) => {
                console.log("error updating document states"); 
                response.status(500).send({
                    message: "An error occurred while updating document" , 
                    error,
                })
            })
        })
        .catch((error) => {
            response.send("Error: " + error);
        })  
})

app.get("/dashboard", auth, (request, response) => {
        response.json({
            dashboardId: request.dashboardId
        })
})


let htmlTemplate = ``;

const makeContent = (newBlurb) => {
    htmlTemplate = `
    <html>
    <body style='background-color: #F8F8FA;'>
    <table style='margin: 0px auto; width: 640px; background-color: white; border: none; border-collapse: collapse;'>
    <thead>
        <tr height='50px'></tr>
        <tr style='text-align: center;'>
            <img src='cid:uniqueEmbed@admitted.com' alt="..." style='height: 75px;' />
        </tr>
    </thead>
    <tbody style='margin: 0; width: 100%;'>
        <tr height='30px'></tr>
        <tr style='text-align: center;'>
            <td style='padding: 0 45px;'>${newBlurb}</td>
        </tr>
        <tr height='30px'></tr>
        <tr height='50px' style='text-align: center;'>
            <td><a href='' style='color: black; background: none; text-decoration: none; background-color: #fc8eac; border: 1px solid black; border-radius: 24px; padding: 8px 16px; cursor: pointer;'>Go to Admitted</a></td>
        </tr>
        <tr height='50px'></tr>
        <tr height='50px' style='background-color: #f6f6f6; width: 100%;'>
            <td><hr style='width: 80%; border: none; border-top: 1px solid #dfdfdf;' /></td>
        </tr>
        <tr height='60px' style='background-color: #f6f6f6; text-align: center;'>
            <td style='padding: 0 45px; color: #838383; font-size: 12px; line-height: 18px;'>You are receiving this email because you are registered with ADMITTED. To no longer recieve email notifications, unsubscibe in your account's settings.</td>
        </tr>
    </tbody>
</table>
    </body>
    </html>
    `
}

app.post('/send-email', async (req, res) => {
    const emailData = req.body;
    makeContent(emailData.content)

    const transporter = nodeMailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        secure: true
    })

    try {
        const info  = await transporter.sendMail({
            from: 'alastairdeng@gmail.com',
            to: emailData.recipient,
            subject: emailData.subject,
            html: htmlTemplate,
            attachments: [{
                filename: './logo-white.jpeg',
                path: './logo-white.jpeg',
                cid: 'uniqueEmbed@admitted.com'
            }]
        })

        console.log('Email sent: ', info.messageId)
        res.sendStatus(200)
    } catch (error) {
        console.error('Error sending email: ', error)
        res.sendStatus(500);
    }
})


module.exports = app; 