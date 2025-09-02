import { useContext, useEffect, useState } from "react";
import { UserContext } from "../../Context/UserContext";
import styles from "./Chat.module.css";

const Chat = () => {
  const { user, chat, setChat } = useContext(UserContext);
  const { isOpen, msgCountUnread } = chat;

  return (
    <div className={`chat-container ${isOpen ? "open" : "closed"}`}>
      {isOpen && (
        <div className={styles.chatBox}>
          {/* Render chat messages here */}
          <p>Welcome to the chat, {user.name}!</p>
        </div>
      )}
    </div>
  );
};

export default Chat;
