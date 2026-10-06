"use client"
import axios from "axios";
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from "./zustand/useAuthStore";
import { initializeEncryption } from "./crypto/messages";

const Auth
    = () => {
        const router = useRouter();
        const [username, setUserName] = useState('');
        const [password, setPassword] = useState('');
        const [errorMessage, setErrorMessage] = useState('');
        const {updateAuthName} = useAuthStore();

        const signUpFunc = async (event) => {
            event.preventDefault();
            setErrorMessage('');

            try {
                const res = await axios.post(`${process.env.NEXT_PUBLIC_BE_HOST}:8081/auth/signup`, {
                    username: username,
                    password: password
                },
                    {
                        withCredentials: true
                    })
                if (res.data.message === "Username already exists") {
                    setErrorMessage('Username already exists');
                } else {
                    await initializeEncryption(
                        username,
                        password,
                        `${process.env.NEXT_PUBLIC_BE_HOST}:8081`
                    );
                    updateAuthName(username);
                    setPassword('');
                    router.replace('/chat');
                }
            } catch (error) {
                setErrorMessage(error.response?.data?.message || error.message || 'Unable to sign up. Please try again.');
            }
        }

        const loginFunc = async (event) => {
            setErrorMessage('');

            try {
                const res = await axios.post(`${process.env.NEXT_PUBLIC_BE_HOST}:8081/auth/login`, {
                    username: username,
                    password: password
                },
                    {
                        withCredentials: true
                    })
                await initializeEncryption(
                    username,
                    password,
                    `${process.env.NEXT_PUBLIC_BE_HOST}:8081`
                );
                updateAuthName(username);
                setPassword('');
                router.replace('/chat');
            } catch (error) {
                setErrorMessage(error.response?.data?.message || error.message || 'Unable to log in. Please check your details and try again.');
            }
        }


        return (
            <div>
                <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
                    <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
                        <form className="space-y-6" onSubmit={signUpFunc}>
                            <div>
                                <label htmlFor="username" className="block text-sm font-medium leading-6 text-gray-900">Username</label>
                                <div className="mt-2">
                                    <input id="username"
                                        name="username"
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUserName(e.target.value)}
                                        autoComplete="username"
                                        required className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between">
                                    <label htmlFor="password"
                                        className="block text-sm font-medium leading-6 text-gray-900">Password</label>

                                </div>
                                <div className="mt-2">
                                    <input id="password"
                                        name="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        type="password" autoComplete="current-password" required className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
                                </div>
                            </div>

                            {errorMessage && (
                                <p className="text-sm text-red-600" role="alert">{errorMessage}</p>
                            )}

                            <div className='flex'>
                                <button type="submit" className="m-3 flex w-1/2 justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Sign Up</button>
                                <button onClick={loginFunc} type="button" className="m-3 flex w-1/2 justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Login</button>
                            </div>
                        </form>


                    </div>
                </div>

            </div>
        )
    }

export default Auth
