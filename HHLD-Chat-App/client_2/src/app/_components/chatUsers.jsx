import React, { useEffect, useState } from 'react'
import { useUsersStore } from '../zustand/useUsersStore'
import { useChatReceiverStore } from '../zustand/useChatReceiverStore';
import { useChatMsgsStore } from '../zustand/useChatMsgsStore'
import { useAuthStore } from '../zustand/useAuthStore';
import axios from 'axios'
import { decryptMessage } from '../crypto/messages'

const ChatUsers = () => {
    const {users} = useUsersStore();
    const { chatReceiver, updateChatReceiver} = useChatReceiverStore();
    const { updateChatMsgs} = useChatMsgsStore();
    const {authName} = useAuthStore();
    const [errorMessage, setErrorMessage] = useState('');

    const setChatReceiver = (user) => {
        updateChatReceiver(user.username);
        sessionStorage.setItem('chat-selected-receiver', user.username);
        sessionStorage.setItem('chat-selected-receiver-user', authName);
      }    
      
      useEffect(() => {
        if (!authName || !users.length || chatReceiver) {
            return;
        }
        if (sessionStorage.getItem('chat-selected-receiver-user') === authName) {
            const savedReceiver = sessionStorage.getItem('chat-selected-receiver');
            if (savedReceiver && users.some((user) => user.username === savedReceiver)) {
                updateChatReceiver(savedReceiver);
                return;
            }
        }
        const firstOtherUser = users.find((user) => user.username !== authName);
        if (firstOtherUser) {
            updateChatReceiver(firstOtherUser.username);
            sessionStorage.setItem('chat-selected-receiver', firstOtherUser.username);
            sessionStorage.setItem('chat-selected-receiver-user', authName);
        }
    }, [authName, chatReceiver, updateChatReceiver, users]);

      useEffect(() => {
        let cancelled = false;
        updateChatMsgs([]);
        const getMsgs = async () => {
          try {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_BE_HOST}:8084/msgs`,
                {
                    params: {
                        'sender': authName,
                        'receiver': chatReceiver
                    }
                });
            const privateKey = JSON.parse(sessionStorage.getItem('chat-private-key'));
            if (sessionStorage.getItem('chat-encryption-user') !== authName || !privateKey) {
                throw new Error('Encryption keys are not available for this session');
            }
            const storedMessages = Array.isArray(res.data) ? res.data : [];
            const messages = await Promise.all(
                storedMessages.map((message) => decryptMessage(message, authName, privateKey))
            );
            if (!cancelled) {
                updateChatMsgs(messages);
                setErrorMessage('');
            }
          } catch (error) {
            if (!cancelled) {
                setErrorMessage(error.message || 'Unable to load conversation');
            }
          }
        }
        if (chatReceiver && authName) {
            getMsgs();
        }
        return () => {
            cancelled = true;
        };
    }, [chatReceiver, authName, updateChatMsgs])

    return (
        <div>
            {errorMessage && <p className="text-sm text-red-600" role="alert">{errorMessage}</p>}
            {users.map((user, index) => (
                <div key={user._id || user.username} onClick={() => setChatReceiver(user)}
                    className='bg-blue-300 rounded-xl m-3 p-5'>
                    { user.username }
                </div>
            ))}
        </div>
    )
}

export default ChatUsers