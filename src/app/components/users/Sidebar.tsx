"use client";

import React, { useEffect, useState } from 'react'
import { SlLogout } from "react-icons/sl";
import { auth, db } from '../../../../firebase';
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import { useAppsContext } from '@/context/AppContext';
import { Theme } from '@/stores/Theme';

const Sidebar = () => {
    const { user, userId, setSelectedThemeId, setSelectThemeName } = useAppsContext();  // userId 等の取得

    const [themes, setThemes] = useState<Theme[]>([]);

    useEffect(() => {
        if(user) {
            const fetchThemes = async () => {
                const themeCollectionRef = collection(db, "themes");
                const q = query(
                    themeCollectionRef,
                    where("userId", "==", userId),
                    orderBy("createdAt"));
                const sShot = onSnapshot(q, (snapshot) => {
                    const newThemes: Theme[] = snapshot.docs.map((doc) => ({
                        id: doc.id,
                        name: doc.data().name,
                        createdAt: doc.data().createdAt,
                    }));
                    setThemes(newThemes);
                });
                return () => {  // メモリリークを防ぐためにクリーンアップ
                    sShot();
                };
            };
            fetchThemes();
        }
    }, [user, userId]);

    const selectTheme = (themeId: string, themeName: string) => {
        setSelectedThemeId(themeId);
        setSelectThemeName(themeName);
    }

    // 新しいテーマを作成
    const addNewTheme = async () => {
        const theme = prompt("テーマを入力してください。")
        if (theme) {
            const newThemeRef = collection(db, "themes");
            await addDoc(newThemeRef, {
                name: theme,
                userId: userId,
                createdAt: serverTimestamp(),
            })
        }
    }

    const handleLogout = () => {
        auth.signOut();
    }

    return (
        <div className='bg-custom-blue h-full overflow-y-auto px-5 flex flex-col'>
            <div className='flex-grow'>
                <div
                    onClick={addNewTheme}
                    className='cursor-pointer flex items-center border mt-2 rounded-md hover:bg-blue-800 duration-150'
                >
                    <span className='text-white pl-4 pr-2 text-2xl'>＋</span>
                    <h1 className='text-white text-xl font-semibold py-4'>テーマを追加</h1>
                </div>
                <ul>
                    {themes.map((theme) => (
                        <li 
                            key={theme.id}
                            className='cursor-pointer border-b p-4 text-slate-100 hover:bg-slate-700 duration-150'
                            onClick={() => selectTheme(theme.id, theme.name)}
                        >
                            {theme.name}
                        </li>
                    ))}
                </ul>
            </div>
            {user && (
                <div className='mb-2 p-4 text-slate-100 text-lg font-medium'>
                    {user.email}
                </div>
            )}
            <div
                onClick={() => handleLogout()}
                className='text-lg flex items-center justify-evenly mb-2 cursor-pointer p-4 text-slate-100 hover:bg-slate-700 duration'
            >
                <SlLogout />
                <span>ログアウト</span>
            </div>
        </div>
    )
}

export default Sidebar