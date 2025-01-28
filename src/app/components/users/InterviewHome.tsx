"use client";

import React, { useState } from 'react';
import { FaSearch } from 'react-icons/fa';

interface CardProps {
  title: string;
  content: string;
}

const Card: React.FC<CardProps> = ({ title, content }) => (
  <div className="bg-white p-6 rounded-lg shadow-md">
    <h2 className="text-xl font-semibold mb-2 text-secondary">{title}</h2>
    <p className="text-text">{content}</p>
  </div>
);

const InterviewHome: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const cards = [
    { title: "カード1", content: "これはカード1の内容です。" },
    { title: "カード2", content: "これはカード2の内容です。" },
    { title: "カード3", content: "これはカード3の内容です。" },
    { title: "カード4", content: "これはカード4の内容です。" },
    { title: "カード5", content: "これはカード5の内容です。" },
    { title: "カード6", content: "これはカード6の内容です。" },
    { title: "カード2", content: "これはカード2の内容です。" },
    { title: "カード3", content: "これはカード3の内容です。" },
    { title: "カード4", content: "これはカード4の内容です。" },
    { title: "カード5", content: "これはカード5の内容です。" },
    { title: "カード6", content: "これはカード6の内容です。" },
    { title: "カード2", content: "これはカード2の内容です。" },
    { title: "カード3", content: "これはカード3の内容です。" },
    { title: "カード4", content: "これはカード4の内容です。" },
    { title: "カード5", content: "これはカード5の内容です。" },
    { title: "カード6", content: "これはカード6の内容です。" },
    { title: "カード2", content: "これはカード2の内容です。" },
    { title: "カード3", content: "これはカード3の内容です。" },
    { title: "カード4", content: "これはカード4の内容です。" },
    { title: "カード5", content: "これはカード5の内容です。" },
    { title: "カード6", content: "これはカード6の内容です。" },
    { title: "カード2", content: "これはカード2の内容です。" },
    { title: "カード3", content: "これはカード3の内容です。" },
    { title: "カード4", content: "これはカード4の内容です。" },
    { title: "カード5", content: "これはカード5の内容です。" },
    { title: "カード6", content: "これはカード6の内容です。" },
    { title: "カード2", content: "これはカード2の内容です。" },
    { title: "カード3", content: "これはカード3の内容です。" },
    { title: "カード4", content: "これはカード4の内容です。" },
    { title: "カード5", content: "これはカード5の内容です。" },
    { title: "カード6", content: "これはカード6の内容です。" },
    { title: "カード2", content: "これはカード2の内容です。" },
    { title: "カード3", content: "これはカード3の内容です。" },
    { title: "カード4", content: "これはカード4の内容です。" },
    { title: "カード5", content: "これはカード5の内容です。" },
    { title: "カード6", content: "これはカード6の内容です。" },
    { title: "カード2", content: "これはカード2の内容です。" },
    { title: "カード3", content: "これはカード3の内容です。" },
    { title: "カード4", content: "これはカード4の内容です。" },
    { title: "カード5", content: "これはカード5の内容です。" },
    { title: "カード6", content: "これはカード6の内容です。" },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="relative">
          <input
            type="text"
            placeholder="検索..."
            className="w-full p-3 pl-10 rounded-lg border border-secondary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, index) => (
          <Card key={index} title={card.title} content={card.content} />
        ))}
      </div>
    </div>
  );
}

export default InterviewHome;