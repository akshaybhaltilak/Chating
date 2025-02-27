import React, { useState, useEffect, useRef } from "react";
import { 
  getDatabase, ref, push, onChildAdded, get, set, onValue, update, remove 
} from "firebase/database";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut 
} from "firebase/auth";
import { initializeApp } from "firebase/app";
import { MessageCircle, Send, Moon, Sun, UserCircle, LogOut, Users, Check, X, ArrowLeft } from "lucide-react";

// Initialize Firebase
const app = initializeApp({
  apiKey: "AIzaSyD1-lTZAZ7sSqDeLyYd7J7sJSUHL7lPHbs",
  authDomain: "chat-app-76979.firebaseapp.com",
  projectId: "chat-app-76979",
  databaseURL: "https://chat-app-76979-default-rtdb.firebaseio.com/",
  storageBucket: "chat-app-76979.firebasestorage.app",
  messagingSenderId: "509762392994",
  appId: "1:509762392994:web:a247d9806437d69e7c58fb"
});
const database = getDatabase(app);
const auth = getAuth(app);

const App = () => {
  // Auth states
  const [user, setUser] = useState(null);
  const [authInputs, setAuthInputs] = useState({ email: "", password: "", displayName: "" });
  const [isLogin, setIsLogin] = useState(true);
  const [notification, setNotification] = useState("");
  
  // Chat states
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [requestsList, setRequestsList] = useState([]);
  const [view, setView] = useState("contacts"); // contacts, users, requests
  const [showSidebar, setShowSidebar] = useState(window.innerWidth >= 768);
  
  const messagesEndRef = useRef(null);
  const theme = darkMode ? "dark" : "light";

  // Auth listener and window resize handler
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        get(ref(database, `users/${currentUser.uid}`))
          .then((snapshot) => {
            if (snapshot.exists()) {
              setAuthInputs(prev => ({ ...prev, displayName: snapshot.val().displayName }));
            }
          });
        loadContacts(currentUser.uid);
        listenForRequests(currentUser.uid);
      } else {
        setUser(null);
        setActiveChat(null);
        setMessages([]);
      }
    });
    
    const handleResize = () => {
      setShowSidebar(window.innerWidth >= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      unsubscribe();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load messages when active chat changes
  useEffect(() => {
    if (activeChat) {
      loadMessages(activeChat.chatId);
      if (window.innerWidth < 768) {
        setShowSidebar(false);
      }
    }
  }, [activeChat]);

  // Helper functions
  const showNotify = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Auth functions
  const handleAuth = async (e) => {
    e.preventDefault();
    setNotification("");
    const { email, password, displayName } = authInputs;
    
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await set(ref(database, `users/${userCredential.user.uid}`), {
          email,
          displayName: displayName || email.split('@')[0],
          createdAt: Date.now()
        });
      }
      setAuthInputs({ email: "", password: "", displayName: "" });
    } catch (error) {
      showNotify(error.message);
    }
  };

  // Data loading functions
  const loadContacts = (userId) => {
    onValue(ref(database, `userChats/${userId}`), (snapshot) => {
      if (snapshot.exists()) {
        const contactsList = [];
        snapshot.forEach((childSnapshot) => {
          contactsList.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
          });
        });
        setContacts(contactsList);
      } else {
        setContacts([]);
      }
    });
  };

  const loadUsers = async () => {
    if (!user) return;
    
    try {
      const snapshot = await get(ref(database, 'users'));
      
      if (snapshot.exists()) {
        const usersArray = [];
        snapshot.forEach((childSnapshot) => {
          const userId = childSnapshot.key;
          if (userId !== user.uid) {
            usersArray.push({
              id: userId,
              ...childSnapshot.val()
            });
          }
        });
        setUsersList(usersArray);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const listenForRequests = (userId) => {
    onValue(ref(database, `requests/${userId}`), (snapshot) => {
      if (snapshot.exists()) {
        const requestsArray = [];
        snapshot.forEach((childSnapshot) => {
          requestsArray.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
          });
        });
        setRequestsList(requestsArray);
      } else {
        setRequestsList([]);
      }
    });
  };

  const loadMessages = (chatId) => {
    setMessages([]);
    const messagesRef = ref(database, `chats/${chatId}/messages`);
    
    onChildAdded(messagesRef, (snapshot) => {
      const messageData = snapshot.val();
      setMessages(prev => [...prev, { id: snapshot.key, ...messageData }]);
    });
  };

  // User interaction functions
  const sendFriendRequest = async (targetUserId) => {
    try {
      await set(ref(database, `requests/${targetUserId}/${user.uid}`), {
        senderId: user.uid,
        senderName: authInputs.displayName || user.email.split('@')[0],
        senderEmail: user.email,
        status: 'pending',
        timestamp: Date.now()
      });
      
      setView("contacts");
      showNotify("Friend request sent");
    } catch (error) {
      console.error("Error sending friend request:", error);
    }
  };

  const handleRequestResponse = async (requestId, accept) => {
    try {
      if (accept) {
        const requestData = requestsList.find(req => req.id === requestId);
        const newChatId = Date.now().toString();
        
        // Add to current user's chats
        await set(ref(database, `userChats/${user.uid}/${requestId}`), {
          userId: requestId,
          displayName: requestData.senderName,
          chatId: newChatId,
          timestamp: Date.now()
        });
        
        // Add to requester's chats
        await set(ref(database, `userChats/${requestId}/${user.uid}`), {
          userId: user.uid,
          displayName: authInputs.displayName || user.email.split('@')[0],
          chatId: newChatId,
          timestamp: Date.now()
        });
      }
      
      // Remove request
      await remove(ref(database, `requests/${user.uid}/${requestId}`));
      showNotify(accept ? "Friend request accepted" : "Friend request declined");
    } catch (error) {
      console.error("Error handling friend request:", error);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !activeChat) return;
    
    try {
      const msgData = {
        text: message.trim(),
        senderId: user.uid,
        senderName: authInputs.displayName || user.email.split('@')[0],
        timestamp: Date.now()
      };
      
      await push(ref(database, `chats/${activeChat.chatId}/messages`), msgData);
      
      // Update last message for both users
      const updateData = {
        timestamp: Date.now(),
        lastMessage: message.trim()
      };
      
      await update(ref(database, `userChats/${user.uid}/${activeChat.userId}`), updateData);
      await update(ref(database, `userChats/${activeChat.userId}/${user.uid}`), updateData);
      
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // UI Components
  const AuthScreen = () => (
    <div className={`flex flex-col items-center justify-center min-h-screen bg-gradient-to-br ${
      theme === "dark" ? "from-gray-900 via-purple-900 to-indigo-900 text-white" : "from-purple-500 via-pink-300 to-white"
    } p-4 transition-colors duration-300`}>
      <div className={`w-full max-w-md p-6 rounded-xl shadow-md ${theme === "dark" ? "bg-gray-800" : "bg-white"}`}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <MessageCircle size={24} className="text-purple-500" />
            <h1 className="text-2xl font-bold">Chat App</h1>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full">
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
        
        <h2 className="text-xl font-semibold mb-4">{isLogin ? "Log In" : "Create Account"}</h2>
        
        {notification && (
          <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
            {notification}
          </div>
        )}
        
        <form onSubmit={handleAuth}>
          {!isLogin && (
            <div className="mb-4">
              <label className="block mb-1">Display Name</label>
              <input
                type="text"
                value={authInputs.displayName}
                onChange={(e) => setAuthInputs({...authInputs, displayName: e.target.value})}
                className={`w-full px-3 py-2 border rounded-lg ${
                  theme === "dark" ? "bg-gray-700 border-gray-600 text-white" : ""
                }`}
                placeholder="Your name"
              />
            </div>
          )}
          
          <div className="mb-4">
            <label className="block mb-1">Email</label>
            <input
              type="email"
              value={authInputs.email}
              onChange={(e) => setAuthInputs({...authInputs, email: e.target.value})}
              className={`w-full px-3 py-2 border rounded-lg ${
                theme === "dark" ? "bg-gray-700 border-gray-600 text-white" : ""
              }`}
              placeholder="example@email.com"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block mb-1">Password</label>
            <input
              type="password"
              value={authInputs.password}
              onChange={(e) => setAuthInputs({...authInputs, password: e.target.value})}
              className={`w-full px-3 py-2 border rounded-lg ${
                theme === "dark" ? "bg-gray-700 border-gray-600 text-white" : ""
              }`}
              placeholder="••••••••"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition duration-200"
          >
            {isLogin ? "Log In" : "Sign Up"}
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-purple-600 hover:text-purple-800"
          >
            {isLogin ? "Need an account? Sign up" : "Already have an account? Log in"}
          </button>
        </div>
      </div>
    </div>
  );

  const Sidebar = () => {
    const renderContent = () => {
      switch(view) {
        case "users":
          return (
            <>
              <div className="p-3 border-b flex justify-between items-center">
                <h2 className="font-semibold">All Users</h2>
                <button onClick={() => setView("contacts")} className="p-1 text-sm">Close</button>
              </div>
              
              {usersList.length > 0 ? (
                usersList.map((user) => (
                  <div key={user.id} className={`p-3 border-b flex justify-between items-center ${
                    theme === "dark" ? "border-gray-700" : "border-gray-200"
                  }`}>
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold mr-3">
                        {user.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{user.displayName}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => sendFriendRequest(user.id)}
                      className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition duration-200"
                    >
                      Add
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">No users found</div>
              )}
            </>
          );
        case "requests":
          return (
            <>
              <div className="p-3 border-b flex justify-between items-center">
                <h2 className="font-semibold">Friend Requests</h2>
                <button onClick={() => setView("contacts")} className="p-1 text-sm">Close</button>
              </div>
              
              {requestsList.length > 0 ? (
                requestsList.map((request) => (
                  <div key={request.id} className={`p-3 border-b ${
                    theme === "dark" ? "border-gray-700" : "border-gray-200"
                  }`}>
                    <div className="flex items-center mb-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold mr-3">
                        {request.senderName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{request.senderName}</div>
                        <div className="text-xs text-gray-500">{request.senderEmail}</div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleRequestResponse(request.id, true)}
                        className="flex-1 py-1 bg-green-600 text-white rounded flex items-center justify-center hover:bg-green-700 transition duration-200"
                      >
                        <Check size={16} className="mr-1" /> Accept
                      </button>
                      <button 
                        onClick={() => handleRequestResponse(request.id, false)}
                        className="flex-1 py-1 bg-red-600 text-white rounded flex items-center justify-center hover:bg-red-700 transition duration-200"
                      >
                        <X size={16} className="mr-1" /> Decline
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">No pending requests</div>
              )}
            </>
          );
        default: // contacts
          return (
            <>
              <div className="p-3 border-b">
                <h2 className="font-semibold">Conversations</h2>
              </div>
              
              {contacts.length > 0 ? (
                contacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => {
                      setActiveChat({
                        chatId: contact.chatId,
                        displayName: contact.displayName,
                        userId: contact.userId
                      });
                    }}
                    className={`p-3 border-b flex items-center cursor-pointer ${
                      activeChat && activeChat.chatId === contact.chatId
                        ? theme === "dark" ? "bg-gray-700" : "bg-purple-50"
                        : ""
                    } ${
                      theme === "dark" 
                        ? "border-gray-700 hover:bg-gray-700" 
                        : "border-gray-200 hover:bg-gray-100"
                    } transition duration-200`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold mr-3">
                      {contact.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="font-medium">{contact.displayName}</div>
                      {contact.lastMessage && (
                        <div className="text-xs text-gray-500 truncate">{contact.lastMessage}</div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 ml-2">
                      {formatTime(contact.timestamp)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">
                  No conversations yet. Find users to start chatting.
                </div>
              )}
            </>
          );
      }
    };

    return (
      <div className={`md:w-1/3 w-full border-r ${
        theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"
      }`}>
        {/* User profile */}
        <div className={`p-4 border-b flex justify-between items-center ${
          theme === "dark" ? "border-gray-700" : "border-gray-200"
        } mt-12 md:mt-0`}>
          <div className="flex items-center space-x-2">
            <UserCircle size={24} className="text-purple-500" />
            <span className="font-medium truncate">{authInputs.displayName || user.email}</span>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => { loadUsers(); setView("users"); }}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition duration-200"
            >
              <Users size={20} />
            </button>
            <button 
              onClick={() => setView("requests")}
              className="relative p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition duration-200"
            >
              <Users size={20} />
              {requestsList.length > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
                  {requestsList.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => signOut(auth)}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition duration-200"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
        
        {/* Content area */}
        <div className="overflow-y-auto h-[calc(100vh-132px)] md:h-[calc(100%-64px)]">
          {renderContent()}
        </div>
      </div>
    );
  };

  const ChatArea = () => (
    <div className={`
      flex-grow flex-col
      ${!showSidebar || window.innerWidth >= 768 ? "flex" : "hidden"}
      ${theme === "dark" ? "bg-gray-800" : "bg-white"}
    `}>
      {activeChat ? (
        <>
          {/* Chat header */}
          <div className={`p-4 border-b flex items-center ${
            theme === "dark" ? "border-gray-700" : "border-gray-200"
          }`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold mr-3">
              {activeChat.displayName.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium">{activeChat.displayName}</span>
          </div>
          
          
          
          {/* Messages */}
          <div className={`flex-grow p-4 overflow-y-auto ${
            theme === "dark" ? "bg-gray-800" : "bg-gray-50"
          }`}>
            {messages.length > 0 ? (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-4 flex ${msg.senderId === user.uid ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-xl p-3 ${
                      msg.senderId === user.uid
                        ? theme === "dark"
                          ? "bg-indigo-600 text-white rounded-br-none"
                          : "bg-purple-500 text-white rounded-br-none"
                        : theme === "dark"
                          ? "bg-gray-700 text-gray-200 rounded-bl-none"
                          : "bg-gray-200 text-gray-800 rounded-bl-none"
                    }`}
                  >
                    <p className="break-words">{msg.text}</p>
                    <div className="text-xs mt-1 opacity-70 text-right">
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <p>Start a conversation with {activeChat.displayName}</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Message input */}
          <div className="p-3 border-t flex items-center">
            <textarea
              rows="1"
              placeholder="Type your message..."
              className={`flex-grow px-3 py-2 border rounded-lg resize-none ${
                theme === "dark" ? "bg-gray-700 border-gray-600 text-white" : ""
              }`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
            />
            <button
              className={`ml-2 p-2 rounded-full ${
                message.trim()
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              } transition duration-200`}
              onClick={sendMessage}
              disabled={!message.trim()}
            >
              <Send size={20} />
            </button>
          </div>
        </>
      ) : (
        <div className="h-full flex flex-col items-center justify-center p-4 text-center">
          <MessageCircle size={64} className="text-purple-500 mb-4 opacity-50" />
          <h3 className="text-xl font-medium mb-2">Select a conversation</h3>
          <p className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>
            Or find users to start chatting
          </p>
        </div>
      )}
    </div>
  );

  // Mobile header for main app
  const MobileHeader = () => (
    <div className={`md:hidden fixed top-0 left-0 right-0 z-10 flex items-center justify-between p-3 border-b ${
      theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
    }`}>
      {activeChat && !showSidebar ? (
        <button onClick={() => setShowSidebar(true)} className="p-2">
          <ArrowLeft size={20} />
        </button>
      ) : (
        <div className="flex items-center">
          <MessageCircle size={20} className="text-purple-500 mr-2" />
          <span className="font-medium">Chat App</span>
        </div>
      )}
      
      <div className="flex items-center space-x-2">
        <button onClick={() => { setView("requests"); setShowSidebar(true); }} className="relative p-2">
          <Users size={20} />
          {requestsList.length > 0 && (
            <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
              {requestsList.length}
            </span>
          )}
        </button>
        <button onClick={() => setDarkMode(!darkMode)} className="p-2">
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </div>
  );

  // Main render
  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className={`flex flex-col h-screen bg-gradient-to-br ${
      theme === "dark" ? "from-gray-900 via-purple-900 to-indigo-900" : "from-purple-500 via-pink-300 to-white"
    } transition-colors duration-300`}>
      <div className={`flex flex-grow overflow-hidden ${
        theme === "dark" ? "bg-gray-800 text-white" : "bg-white"
      } m-0 sm:m-4 rounded-none sm:rounded-xl shadow-xl`}>
        
        {/* Mobile header */}
        <MobileHeader />
        
        {/* Show sidebar on larger screens or when toggled on mobile */}
        {(showSidebar || window.innerWidth >= 768) && <Sidebar />}
        
        {/* Chat area */}
        <ChatArea />
        
        {/* Notification */}
        {notification && (
          <div className="fixed bottom-4 right-4 bg-purple-600 text-white p-3 rounded-lg shadow-lg">
            {notification}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
