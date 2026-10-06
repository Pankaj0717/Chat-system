'use client'
import React, {useState, useEffect} from 'react';
import io from "socket.io-client";
import { useAuthStore } from '../zustand/useAuthStore';
import { useUsersStore } from '../zustand/useUsersStore';
import { useChatReceiverStore } from '../zustand/useChatReceiverStore';
import { useChatMsgsStore } from '../zustand/useChatMsgsStore';
import axios from "axios";
import { useRouter } from 'next/navigation';
import ChatUsers from '../_components/chatUsers';
import { decryptMessage, encryptMessage, getPublicKey } from '../crypto/messages';

const Chat = () => {
   const router = useRouter();

   // const [msgs, setMsgs] = useState([]);
   const [msg, setMsg] = useState('');
   const [socket, setSocket] = useState(null);
   const {authName, updateAuthName} = useAuthStore();
   const {updateUsers} = useUsersStore();
   const {chatReceiver, updateChatReceiver} = useChatReceiverStore();
   const {chatMsgs, updateChatMsgs} = useChatMsgsStore();
   const [messageError, setMessageError] = useState('');
   const [isLoggingOut, setIsLoggingOut] = useState(false);
   const [isSessionReady, setIsSessionReady] = useState(false);

   const logout = async () => {
       setIsLoggingOut(true);
       try {
           await axios.post(
               `${process.env.NEXT_PUBLIC_BE_HOST}:8081/auth/logout`,
               {},
               { withCredentials: true }
           );
           sessionStorage.removeItem('chat-private-key');
           sessionStorage.removeItem('chat-public-key');
           sessionStorage.removeItem('chat-encryption-user');
           sessionStorage.removeItem('chat-selected-receiver');
           sessionStorage.removeItem('chat-selected-receiver-user');
           updateAuthName('');
           updateUsers([]);
           updateChatReceiver('');
           updateChatMsgs([]);
           router.replace('/');
       } catch (error) {
           setMessageError(error.response?.data?.message || 'Unable to log out. Please try again.');
           setIsLoggingOut(false);
       }
   };

   useEffect(() => {
       let cancelled = false;
       const restoreSession = async () => {
           const savedUsername = sessionStorage.getItem('chat-encryption-user');
           const privateKey = sessionStorage.getItem('chat-private-key');
           if (!savedUsername || !privateKey) {
               router.replace('/');
               return;
           }

           try {
               const res = await axios.get(
                   `${process.env.NEXT_PUBLIC_BE_HOST}:8081/auth/me`,
                   { withCredentials: true }
               );
               if (res.data.username !== savedUsername) {
                   throw new Error('The saved encryption key does not match the signed-in account');
               }
               if (!cancelled) {
                   updateAuthName(savedUsername);
                   setIsSessionReady(true);
               }
           } catch (error) {
               if (!cancelled) {
                   setMessageError(error.response?.data?.message || error.message || 'Your session has expired. Please log in again.');
                   router.replace('/');
               }
           }
       };

       restoreSession();
       return () => {
           cancelled = true;
       };
   }, [router, updateAuthName]);

   useEffect(() => {
       if (!isSessionReady || !authName) {
           return;
       }
       let cancelled = false;
       axios.get(`${process.env.NEXT_PUBLIC_BE_HOST}:8081/users`, {
           withCredentials: true
       }).then((res) => {
           if (!cancelled) {
               updateUsers(res.data);
           }
       }).catch((error) => {
           if (!cancelled) {
               setMessageError(error.response?.data?.message || 'Unable to load users');
           }
       });
       return () => {
           cancelled = true;
       };
   }, [authName, isSessionReady, updateUsers]);

   useEffect(() => {
       if (!isSessionReady || !authName) {
           return;
       }
       const newSocket = io(`${process.env.NEXT_PUBLIC_BE_HOST}:8080`, {
            query: {
               username: authName
           }
       });
       setSocket(newSocket);

       newSocket.on('chat msg', async encryptedMsg => {
           try {
               if (typeof encryptedMsg?.ciphertext !== 'string') {
                   throw new Error('An unencrypted realtime message was blocked');
               }
               const privateKey = JSON.parse(sessionStorage.getItem('chat-private-key'));
               if (sessionStorage.getItem('chat-encryption-user') !== authName || !privateKey) {
                   throw new Error('Encryption keys are not available for this session');
               }
               const decryptedMsg = await decryptMessage(encryptedMsg, authName, privateKey);
               updateChatMsgs([
                   ...useChatMsgsStore.getState().chatMsgs,
                   decryptedMsg
               ]);
               setMessageError('');
           } catch (error) {
               setMessageError(error.message || 'Unable to decrypt this message');
           }
       });
       newSocket.on('chat error', error => {
           setMessageError(error.message || 'The message could not be sent');
       });

       return () => newSocket.close();
   }, [authName, isSessionReady, updateChatMsgs]);

   const sendMsg = async (e) => {
       e.preventDefault();
       if (!socket || !chatReceiver) {
           return;
       }
       try {
           const privateKey = sessionStorage.getItem('chat-private-key');
           const ownPublicKey = sessionStorage.getItem('chat-public-key');
           if (sessionStorage.getItem('chat-encryption-user') !== authName || !privateKey || !ownPublicKey) {
               throw new Error('Encryption keys are not available for this session');
           }
           const recipientPublicKey = await getPublicKey(
               chatReceiver,
               `${process.env.NEXT_PUBLIC_BE_HOST}:8081`
           );
           const encryptedMsg = await encryptMessage(
               msg,
               authName,
               chatReceiver,
               JSON.parse(ownPublicKey),
               recipientPublicKey
           );
           socket.emit('chat msg', encryptedMsg);
           updateChatMsgs([
               ...useChatMsgsStore.getState().chatMsgs,
               { ...encryptedMsg, text: msg }
           ]);
           setMessageError('');
           setMsg('');
       } catch (error) {
           setMessageError(error.message || 'Unable to encrypt or send this message');
       }
   }

   if (!isSessionReady) {
       return <div className="p-6">Restoring your chat session...</div>;
   }
 
 return (
    <div className='h-screen flex divide-x-4'>
        <div className='w-1/5 '>
            <ChatUsers/>
        </div>
        <div className='w-4/5 flex flex-col'>
            <div className='1/5'>
                <div className="flex items-center justify-between p-4">
                    <h1>{authName} is chatting with {chatReceiver}</h1>
                    <button
                        type="button"
                        onClick={logout}
                        disabled={isLoggingOut}
                        className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isLoggingOut ? 'Logging out...' : 'Log out'}
                    </button>
                </div>
            </div>
            <div className='msgs-container h-3/5 overflow-scroll'>
                {chatMsgs.filter((message) =>
                    message.sender === chatReceiver || message.receiver === chatReceiver
                ).map((msg, index) => (
                    <div key={index} className={`m-3 p-1 ${msg.sender === authName ? 'text-right' : 'text-left'}`}>
                        <span className={`p-2 rounded-2xl ${msg.sender === authName ? 'bg-blue-200' : 'bg-green-200'}`}>
                        {msg.text}
                        </span>
                    </div>
                ))}
            </div>
            <div className='h-1/5 flex items-center justify-center'>
                {messageError && <p className="text-sm text-red-600" role="alert">{messageError}</p>}
                <form onSubmit={sendMsg} className="w-1/2">
                    <div className="relative">
                        <input type="text"
                                value={msg}
                                onChange={(e) => setMsg(e.target.value)}
                                placeholder="Type your text here"
                                required
                                className="block w-full p-4 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"  />
                        <button type="submit"
                                className="text-white absolute end-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                                Send
                        </button>
                    </div>
                </form>
            </div>
        </div>
   </div>
 )
}


export default Chat
