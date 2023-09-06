const express = require('express'); 
const app = express(); 
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
const Reviewer = require('./db/Reviewer');
const reviewer_auth = require('./reviewer-auth');
const client_url = process.env.CLIENT_URL; 
const server_url = process.env.SERVER_URL;
const {OAuth2Client} = require("google-auth-library"); 
const fs = require('fs'); // Make sure to require the 'fs' module if not already done

// Read the image file
const image = fs.readFileSync('./admittedLogo.png');



var authRouter = require('./routes/oauth'); 
var requestRouter = require('./routes/request'); 

// Generate a unique dashboardId using uuidV4()


dbConnect(); 


app.use(express.json());



//stripe connection
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY)

//front end connection
app.use(
    cors({
        origin: [client_url, "https://checkout.stripe.com"],
    })
)
app.use('/oauth', authRouter); 
app.use('/request', requestRouter); 

app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self' https://checkout.stripe.com'");
    next();
  });



// payment setup
const storeItems = new Map([
    [1, { priceInCents: 5500, name: "Stanford - Essentials"}],
    [2, { priceInCents: 5000, name: "Stanford - Premium"}],
    [3, { priceInCents: 4500, name: "Stanford - Premium+"}],

    [4, { priceInCents: 5500, name: "USC - Essentials"}],
    [5, { priceInCents: 5000, name: "USC - Premium"}],
    [6, { priceInCents: 4500, name: "USC - Premium+"}],

    [7, { priceInCents: 5500, name: "Harvard - Essentials"}],
    [8, { priceInCents: 5000, name: "Harvard - Premium"}],
    [9, { priceInCents: 4500, name: "Harvard - Premium+"}],

    [10, { priceInCents: 5500, name: "Yale - Essentials"}],
    [11, { priceInCents: 5000, name: "Yale - Premium"}],
    [12, { priceInCents: 4500, name: "Yale - Premium+"}],

    [13, { priceInCents: 5500, name: "Columbia - Essentials"}],
    [14, { priceInCents: 5000, name: "Columbia - Premium"}],
    [15, { priceInCents: 4500, name: "Columbia - Premium+"}],

    [16, { priceInCents: 5500, name: "Princeton - Essentials"}],
    [17, { priceInCents: 5000, name: "Princeton - Premium"}],
    [18, { priceInCents: 4500, name: "Princeton - Premium+"}],

    [19, { priceInCents: 5500, name: "Cornell - Essentials"}],
    [20, { priceInCents: 5000, name: "Cornell - Premium"}],
    [21, { priceInCents: 4500, name: "Cornell - Premium+"}],

    [22, { priceInCents: 5500, name: "Dartmouth - Essentials"}],
    [23, { priceInCents: 5000, name: "Dartmouth - Premium"}],
    [24, { priceInCents: 4500, name: "Dartmouth - Premium+"}],

    [25, { priceInCents: 5500, name: "Brown - Essentials"}],
    [26, { priceInCents: 5000, name: "Brown - Premium"}],
    [27, { priceInCents: 4500, name: "Brown - Premium+"}],

    [28, { priceInCents: 5500, name: "UPenn - Essentials"}],
    [29, { priceInCents: 5000, name: "UPenn - Premium"}],
    [30, { priceInCents: 4500, name: "UPenn - Premium+"}],

    [31, { priceInCents: 5500, name: "Tulane - Essentials"}],
    [32, { priceInCents: 5000, name: "Tulane - 312"}],
    [33, { priceInCents: 4500, name: "Tulane - Premium+"}],

    [34, {priceInCents: 2500, name: "Resume Review"}], 
    [35, {priceInCents: 2500, name: "Activities/Honors Review"}],
    [36, {priceInCents: 5000, name: "Practice Interiew"}]
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
            success_url:  `${server_url}/order/success?session_id={CHECKOUT_SESSION_ID}`,
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
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
            limit: 100,
        });
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

app.post('/order/success/freetrial', async (req, res) => {
    try {
        const freeDocument = uuidV4(); // Generate a UUID for freeDocument
        const chosenCollege = req.body.collegeChoice;

        console.log("your college choice is " + chosenCollege);

        // Use async/await for better readability and error handling
        const user = await User.findOne({ email: req.body.email });

        if (user) {
            if (user.servicesRequested) {
                user.servicesRequested = [chosenCollege, ...user.servicesRequested];
            } else {
                user.servicesRequested = [chosenCOllege];
            }

            if (user.documentIds) {
                user.documentIds = [freeDocument, ...user.documentIds];
            } else {
                user.documentIds = [freeDocument];
            }

            await user.save();
            console.log("user services updated!");
            res.status(200).json({ dashboardId: user.dashboardId });
        } else {
            console.log("User not found.");
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        console.error("Error processing order:", error);
        res.status(500).json({ message: "Error processing order" });
    }
});

app.get('/payment_incomplete', (req, res) => {
    res.send("Payment could not be completed")
})


app.get("/", (req, res) => {
    res.send("Hello, the server is functioning!");
})

// Curb Cores Error by adding a header here


//Create register endpoint
app.post("/register", async (request, response) => {
        try {
            const hashedPassword = await bcrypt.hash(request.body.password, 10);
        
            const existingUser = await User.findOne({ email: request.body.email });
            const existingReviewer = await Reviewer.findOne({ email: request.body.email });
        
            if (existingUser) {
              return response.status(409).send({ message: "Email already used for User registration" });
            }
        
            if (existingReviewer) {
              return response.status(409).send({ message: "Email already used for Reviewer registration" });
            }
        
            if (request.body.schoolName) {
              const reviewer = new Reviewer({
                fullname: request.body.fullname,
                email: request.body.email,
                password: hashedPassword,
                dashboardId: request.body.dashboardId,
                schoolName: request.body.schoolName,
              });
        
              const result = await reviewer.save();
              response.status(201).send({ message: "Registration Successful", result });
            } else {
              const user = new User({
                fullname: request.body.fullname,
                email: request.body.email,
                password: hashedPassword,
                dashboardId: request.body.dashboardId,
              });
        
              const result = await user.save();
              response.status(201).send({ message: "Registration Successful", result });
            }
          } catch (error) {
            console.error("Error during registration:", error);
            response.status(500).send({ message: "An error occurred during registration", error });
          }
    }
  );
  

//Create Login Endpoint

app.post("/login", (request, response) => {
    const isGoogleAuth = request.query.isGoogleAuth === 'true';

    User.findOne({ email: request.body.email })
         .then((user) => {
            // compare if passwords are equal
            if (user.isGoogleAuth === true){
                return response.status(400).send({
                    message: "Please sign in with the google button", 
                })
            }
            bcrypt.compare(request.body.password, user.password)
                .then((passwordCheck) => {
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
                        isReviewer: user.isReviewer,
                    })
                })
                // send error if passwords don't match
                .catch((error) => {
                    response.status(400).send({
                        message: "Passwords does not match", 
                        error,
                    });
                });
         })
         //error if email doesn't exist in database
         .catch((e) => {
            Reviewer.findOne({ email: request.body.email})
                .then((reviewer) => {
                    if (reviewer){
                        bcrypt.compare(request.body.password, reviewer.password)
                            .then((passwordCheck) => {
                                if (!passwordCheck) {
                                    return response.status(400).send({
                                        message: "Passwords don't match", 
                                        error, 
                                    })
                                }
                                //create JWT Token
                                const token = jwt.sign(
                                    {
                                        userId: reviewer._id,
                                        userEmail: reviewer.email,
                                    },
                                    process.env.ACCESS_TOKEN_SECRET,
                                    { expiresIn: "24h" }
                                );
                                response.status(200).send({
                                    message: "Login Successful as Reviewer",
                                    email: reviewer.email,
                                    dashboardId: reviewer.dashboardId,
                                    token,
                                    isReviewer: true,
                                  });
                            })
                    } else{
                        response.status(404).send({
                            message: "Email not found",
                        });
                    }
                })
                .catch((e) => {
                     response.status(500).send({
                        message: "Reviewer collection error",
                        e,
                    });
                })
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
                error,
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
});

app.get("/auth-reviewer-dashboard/:dashboardId", reviewer_auth, async (request, response) => {
    let availableNotMatchedDocuments = [];
    try {
        availableNotMatchedDocuments = await Document.find({
            userHasSubmitted: true,
            essayMatched: false, 
        }).select("_id dueBy"); 
    } catch (error) {
        console.error('Error fetching available documents:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }

    Reviewer.findById(request.reviewer.userId)
        .then((reviewer) => {
            response.json({
                fullname: reviewer.fullname,
                documentIds: reviewer.documentIds,
                schoolName: reviewer.schoolName, 
                availableNotMatchedDocuments: availableNotMatchedDocuments, 
            })
        })
        .catch((error) => {
            console.log('Error find reviewer:', error); 
        })
});

app.post("/update-reviewer/:dashboardId", async (request, response) => {
    console.log(request.params.dashboardId);
    await Reviewer.findOne({ dashboardId: request.params.dashboardId})
        .then((reviewer) => {
            reviewer.documentIds = request.body.reviewerEssays; 
            console.log(request.body.reviewerEssays);
            reviewer.save().then((result) => {
                response.status(201).send({
                    message: "Reviewer Updated Successfully",
                    result,
                })
            }).catch((error) => {
                console.log("Error creating reviewer");
                  response.status(500).send({
                    message: "Error creating reviewer",
                    error,
                  });
            })
        })
        .catch ((error) => {
            console.log("reviewer not ofund!")
            response.status(404).send({
                message: "Could not find document", 
                error,
            });
        })
})

app.get("/auth-editingtool/:documentId", auth_editingtool, (request, response) => {
    console.log("here are variables!")
    console.log(request.isReviewer);   
    console.log(request.userHasSubmitted);
    console.log(request.essaysReviewed);
    response.json({
        isReviewer: request.isReviewer,
        userHasSubmitted: request.userHasSubmitted,
        essaysReviewed: request.essaysReviewed,
        message: "You are authorized to access this document"
    }); 
    
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
            if (request.body.essayMatched){
                document.essayMatched = request.body.essayMatched; 
            }
            if (request.body.dashboardId){
                document.whichReviewerMatched = request.body.dashboardId; 
            }
            if (request.body.dueBy){
                document.dueBy = request.body.dueBy;
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
            from: process.env.EMAIL_USER,
            to: emailData.recipient,
            subject: emailData.subject,
            html: htmlTemplate,
            attachments: [{
                filename: 'admittedLogo.png',
                content: image, 
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

app.post('/resetpassword', async (req, res) => {
    console.log("entered reset password route"); 
    let newPassword;
    let emailToUpdate;  
    if (req.body){ 
        newPassword = req.body.newPassword; 
        emailToUpdate = req.body.emailToUpdate; 
    }
    if (newPassword && emailToUpdate){
        try {
            console.log("found new Password", newPassword, "and email to update", emailToUpdate); 
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            const existingUser = await User.findOne({email: emailToUpdate}); 
            const existingReviewer = await Reviewer.findOne({email: emailToUpdate});

            if (existingUser){
                if (existingUser.isGoogleAuth){
                    console.log('You cannot update the password of an account signed up with Google from here');
                    return res.status(500).json({ message: 'You cannot update the password of an account signed up with Google from here' });
                }
                existingUser.password = hashedPassword;
                // Save the updated user data
                await existingUser.save();
                return res.status(200).json({ message: 'Password updated successfully for user' });
            }
            
            if (existingReviewer){
                existingReviewer.password = hashedPassword;
                // Save the updated reviewer data
                await existingReviewer.save();
                return res.status(200).json({ message: 'Password updated successfully for reviewer' });
            }
            console.log("user or reviewer not found!")
            return res.status(404).json({ message: 'Email address not found' });

        }catch (err){
            console.error(err);
            return res.status(500).json({ message: 'An error occurred while resetting the password' });
        }
        
    }else{
        console.log('missing data'); 
        return res.status(400).json({ message: 'Missing data in request' });
    }
})


app.post("/OAuth2", async (req, res) => {

})
  


module.exports = app; 