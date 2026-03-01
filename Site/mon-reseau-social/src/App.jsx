import { useState, useEffect } from 'react';
import PocketBase from 'pocketbase';

const pb = new PocketBase("http://127.0.0.1:8090");

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(pb.authStore.model);
  const [posts, setPosts] = useState([]);
  const [postContent, setPostContent] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });

  const loadPosts = async () => {
    try {
      const records = await pb.collection('posts').getFullList({
        sort: '-created',
        expand: 'user',
      });
      setPosts(records);
    } catch (err) {
      console.error("Failed to load posts:", err);
    }
  };

  useEffect(() => {
    setUser(pb.authStore.model);
    loadPosts();
  }, []);

  const handleAuth = async () => {
    setStatusMessage({ text: "", type: "" });
    try {
      if (isLoginMode) {
        const authData = await pb.collection('users').authWithPassword(email, password);
        setUser(authData.record);
        loadPosts();
      } else {
        await pb.collection('users').create({
          email,
          password,
          passwordConfirm: password,
        });
        setStatusMessage({ text: "Account created! Now login.", type: "success" });
        setIsLoginMode(true);
      }
    } catch (err) {
      setStatusMessage({ text: "Authentication Error", type: "error" });
    }
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('content', postContent);
    formData.append('user', user.id);
    if (selectedFile) formData.append('media', selectedFile);

    try {
      await pb.collection('posts').create(formData);
      setStatusMessage({ text: "Published!", type: "success" });
      setPostContent("");
      setSelectedFile(null);
      loadPosts();
    } catch (err) {
      setStatusMessage({ text: "Upload failed.", type: "error" });
    }
  };

  // UI FOR LOGIN / SIGNUP
  if (!user) {
    return (
      <div style={styles.pageWrapper}>
        <div style={styles.loginCard}>
          <h1 style={styles.logo}>SocialConnect</h1>
          <p style={styles.subtitle}>{isLoginMode ? "Login to your account" : "Create a new account"}</p>
          
          <input type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} style={styles.input} />
          <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} style={styles.input} />
          
          <button onClick={handleAuth} style={styles.mainButton}>
            {isLoginMode ? "Log In" : "Register"}
          </button>

          {statusMessage.text && (
            <div style={statusMessage.type === "error" ? styles.errorBox : styles.successBox}>
              {statusMessage.text}
            </div>
          )}

          <p style={styles.toggleLink} onClick={() => setIsLoginMode(!isLoginMode)}>
            {isLoginMode ? "New here? Create an account" : "Already have an account? Log in"}
          </p>
        </div>
      </div>
    );
  }

  // UI FOR FEED
  return (
    <div style={styles.pageWrapper}>
      <div style={styles.feedContainer}>
        <div style={styles.topBar}>
          <h2 style={{margin:0}}>Feed</h2>
          <button onClick={() => { pb.authStore.clear(); setUser(null); }} style={styles.logoutBtn}>Logout</button>
        </div>

        <form onSubmit={handlePublish} style={styles.postForm}>
          <textarea 
            placeholder="What's on your mind?" 
            value={postContent} 
            onChange={e => setPostContent(e.target.value)} 
            style={styles.textarea} 
          />
          <div style={styles.formActions}>
            <input type="file" onChange={e => setSelectedFile(e.target.files[0])} style={styles.fileInput} />
            <button type="submit" style={styles.smallButton}>Post</button>
          </div>
        </form>

        <div style={styles.postsList}>
          {posts.map(post => (
            <div key={post.id} style={styles.postCard}>
              <div style={styles.postHeader}>{post.expand?.user?.email}</div>
              <div style={styles.postContent}>{post.content}</div>
              {post.media && (
                <div style={styles.mediaFrame}>
                  {post.media.match(/\.(mp4|webm)$/i) ? (
                    <video controls style={styles.image}><source src={pb.files.getUrl(post, post.media)} /></video>
                  ) : (
                    <img src={pb.files.getUrl(post, post.media)} alt="media" style={styles.image} />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// THE STYLES (Clean & Professional)
const styles = {
  pageWrapper: {
    backgroundColor: '#f0f2f5', // Light grey background
    minHeight: '100vh',
    width: '100vw',
    display: 'flex',
    justifyContent: 'center',
    paddingTop: '50px',
    fontFamily: 'Helvetica, Arial, sans-serif',
    boxSizing: 'border-box',
    color: '#1c1e21'
  },
  loginCard: {
    backgroundColor: '#ffffff',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(0, 0, 0, 0.1)',
    width: '400px',
    height: 'fit-content',
    textAlign: 'center'
  },
  feedContainer: {
    width: '600px',
    maxWidth: '95%'
  },
  logo: { color: '#0866ff', fontSize: '32px', marginBottom: '10px' },
  subtitle: { color: '#606770', marginBottom: '20px' },
  input: {
    width: '100%',
    padding: '14px',
    margin: '10px 0',
    borderRadius: '6px',
    border: '1px solid #dddfe2',
    fontSize: '16px',
    boxSizing: 'border-box'
  },
  mainButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#0866ff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '20px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '10px'
  },
  toggleLink: { color: '#0866ff', cursor: 'pointer', marginTop: '20px', fontSize: '14px' },
  postForm: {
    backgroundColor: 'white',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
  },
  textarea: {
    width: '100%',
    height: '100px',
    border: 'none',
    fontSize: '18px',
    outline: 'none',
    resize: 'none'
  },
  formActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid #ddd',
    paddingTop: '10px'
  },
  postCard: {
    backgroundColor: 'white',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '15px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
  },
  postHeader: { fontWeight: 'bold', fontSize: '14px', marginBottom: '10px' },
  postContent: { fontSize: '16px', marginBottom: '10px' },
  image: { width: '100%', borderRadius: '8px' },
  errorBox: { color: 'red', marginTop: '10px' },
  successBox: { color: 'green', marginTop: '10px' },
  logoutBtn: { background: 'none', border: 'none', color: '#0866ff', cursor: 'pointer' },
  smallButton: { padding: '8px 20px', backgroundColor: '#0866ff', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }
};

export default App;