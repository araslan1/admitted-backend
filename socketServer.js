require('dotenv').config(); 

const socketServer = (server) => {
    const Document = require('./db/Document')
    const io = require('socket.io')(server, {
        cors: {
          origin: process.env.CLIENT_URL,
          methods: ['GET', 'POST']
        },
    });
    //set middleware here
    const defaultValue = ""; 
    try{
        io.on("connection", async (socket) => {
            console.log("socket connected"); 

            socket.on('get-document', async documentId => {
                const document = await findOrCreateDocument(documentId); 
                socket.join(documentId); 
                socket.emit('load-document', document.data); 

                socket.on('send-changes', delta => {
                    socket.broadcast.to(documentId).emit("receive-changes", delta); 
                })

                socket.on("save-document", async data => {
                    await Document.findByIdAndUpdate(documentId, { data } )
                })

                // I THINK I WANT TO SAVE ONE EXCLUSIVELY A SAVE BUTTON OR A SUBMIT COMMENTS BUTTON
            })
        })
    }catch (error) {
        console.log("Error connecting to socket:", error);
    }

      async function findOrCreateDocument(id) {
        if (id == null) return; 

        const document = await Document.findById(id); 

        if (document){
            console.log("Document found!");
            return document; 
        }

        return await Document.create({ _id: id, data: defaultValue });


      }


}

module.exports = { 
    socketServer, 
}; 