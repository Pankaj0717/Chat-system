import express from "express"
import dotenv from "dotenv"
import http from "http"
import { Server } from "socket.io";
import cors from "cors";
import msgsRouter from "./routes/msgs.route.js"
import connectToMongoDB from "./db/connectTOMongoDB.js";
import { addMsgToConversation } from "./controllers/msgs.controller.js";
import { subscribe, publish } from "./redis/msgsPubSub.js";



dotenv.config();
const port = process.env.PORT || 5000;

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        allowedHeaders: ["*"],
        origin: "*"
      }
 });

const userSocketMap = {};
const isEncryptedMessage = (msg) =>
  typeof msg?.sender === "string" &&
  typeof msg?.receiver === "string" &&
  typeof msg?.ciphertext === "string" &&
  typeof msg?.iv === "string" &&
  typeof msg?.senderKey === "string" &&
  typeof msg?.receiverKey === "string";

io.on('connection', (socket) => {
    const username = socket.handshake.query.username;
    console.log('Username of connected client:', username);

    userSocketMap[username] = socket;


    const channelName = `chat_${username}`
    subscribe(channelName, (msg) => {
      try {
        const encryptedMsg = JSON.parse(msg);
        if (!isEncryptedMessage(encryptedMsg)) {
          console.error("Discarded an unencrypted message from Redis");
          return;
        }
        socket.emit("chat msg", encryptedMsg);
      } catch (error) {
        console.error("Unable to process Redis message:", error.message);
      }
    });


    socket.on('chat msg', (msg) => {
        if (!isEncryptedMessage(msg)) {
          socket.emit("chat error", { message: "Only encrypted messages are accepted" });
          return;
        }

        const encryptedMsg = {
          ciphertext: msg.ciphertext,
          iv: msg.iv,
          senderKey: msg.senderKey,
          receiverKey: msg.receiverKey,
          sender: msg.sender,
          receiver: msg.receiver
        };

        const deliverMessage = async () => {
          try {
            await addMsgToConversation(
              [encryptedMsg.sender, encryptedMsg.receiver],
              encryptedMsg
            );
          } catch (error) {
            console.error("Unable to store encrypted message:", error.message);
            socket.emit("chat error", { message: "Message could not be stored" });
            return;
          }

          try {
            const receiverSocket = userSocketMap[encryptedMsg.receiver];
            if (receiverSocket) {
              receiverSocket.emit('chat msg', encryptedMsg);
            } else {
              const channelName = `chat_${encryptedMsg.receiver}`;
              await publish(channelName, JSON.stringify(encryptedMsg));
            }
          } catch (error) {
            console.error("Unable to deliver encrypted message:", error.message);
            socket.emit("chat error", {
              message: "Message was saved but live delivery failed; it will appear when the receiver reconnects"
            });
          }
        };

        void deliverMessage();
    });

})

app.use('/msgs', msgsRouter);

app.get('/', (req, res) => {
  res.send('Congratulations HHLD Folks!');
});

server.listen(port, () => {
  connectToMongoDB();
  console.log(`Server is listening at http://localhost:${port}`);
});
