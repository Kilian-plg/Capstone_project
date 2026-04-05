import { useState, useEffect } from 'react';
import PocketBase from 'pocketbase';

const pb = new PocketBase("http://127.0.0.1:8090");

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [user, setUser] = useState(pb.authStore.model);
  const [posts, setPosts] = useState([]);
  const [postContent, setPostContent] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [view, setView] = useState('feed'); 
  const [commentInputs, setCommentInputs] = useState({});

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [viewingUser, setViewingUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]); // Pour calculer les followers

  const loadPosts = async () => {
    try {
      const records = await pb.collection('posts').getFullList({
        sort: '-created',
        expand: 'user,comments_via_post.user', 
      });
      setPosts(records);
    } catch (err) { console.error(err); }
  };

  const loadAllUsers = async () => {
    try {
      const records = await pb.collection('users').getFullList();
      setAllUsers(records);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    setUser(pb.authStore.model);
    loadPosts();
    loadAllUsers();
  }, []);

  const handleAuth = async () => {
    try {
      if (isLoginMode) {
        const authData = await pb.collection('users').authWithPassword(email, password);
        setUser(authData.record);
        loadPosts();
        loadAllUsers();
      } else {
        await pb.collection('users').create({ 
          email, password, passwordConfirm: password, username: username, emailVisibility: true 
        });
        alert("Account created! Please log in.");
        setIsLoginMode(true);
      }
    } catch (err) { alert("Auth Error: Check your fields"); }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      const result = await pb.collection('users').getList(1, 20, {
        filter: `username ~ "${searchTerm}"`,
      });
      setSearchResults(result.items);
    } catch (err) { console.error(err); }
  };

const handleFollow = async (targetUserId) => {
  try {
    // On récupère la version la plus fraîche possible
    const currentUser = await pb.collection('users').getOne(user.id);
    const currentFollowing = Array.isArray(currentUser.following) ? currentUser.following : [];
    
    const isFollowing = currentFollowing.includes(targetUserId);
    const newFollowing = isFollowing 
      ? currentFollowing.filter(id => id !== targetUserId) 
      : [...currentFollowing, targetUserId];

    // Mise à jour PocketBase
    const updatedUser = await pb.collection('users').update(user.id, { following: newFollowing });

    // Mise à jour du store et de l'état
    pb.authStore.save(pb.authStore.token, updatedUser);
    setUser({ ...updatedUser }); // Le { ... } force React à voir un nouvel objet
    
    await loadAllUsers(); // Recharge la liste globale pour les compteurs

    // Si on regarde le profil de quelqu'un, on rafraîchit aussi sa vue
    if (viewingUser && viewingUser.id === targetUserId) {
      const freshTarget = await pb.collection('users').getOne(targetUserId);
      setViewingUser({ ...freshTarget });
    }
    
    console.log("Follow synchronisé !");
  } catch (err) {
    console.error("Erreur follow:", err);
  }
};
  // Logique pour compter les followers (ceux qui ont l'ID de la cible dans leur liste 'following')
  const getFollowersCount = (userId) => {
    return allUsers.filter(u => Array.isArray(u.following) && u.following.includes(userId)).length;
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('content', postContent);
    formData.append('user', user.id);
    if (selectedFile) formData.append('media', selectedFile);
    try {
      await pb.collection('posts').create(formData);
      setPostContent(""); setSelectedFile(null); loadPosts();
    } catch (err) { console.error(err); }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await pb.collection('posts').delete(postId);
      loadPosts();
    } catch (err) { alert("You can't delete this post"); }
  };

  const handleUpdateAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const updated = await pb.collection('users').update(user.id, formData);
      setUser(updated);
      loadPosts();
      loadAllUsers();
    } catch (err) { alert("Upload failed"); }
  };

  const handleLike = async (post) => {
    try {
      const currentLikes = Array.isArray(post.likes) ? post.likes : [];
      let newLikes = currentLikes.includes(user.id) ? currentLikes.filter(id => id !== user.id) : [...currentLikes, user.id];
      await pb.collection('posts').update(post.id, { "likes": newLikes });
      loadPosts(); 
    } catch (err) { console.error(err); }
  };

  const handleAddComment = async (postId) => {
    if (!commentInputs[postId]) return;
    try {
      await pb.collection('comments').create({ text: commentInputs[postId], user: user.id, post: postId });
      setCommentInputs({ ...commentInputs, [postId]: "" }); loadPosts(); 
    } catch (err) { console.error(err); }
  };

  if (!user) {
    return (
      <div style={styles.pageWrapper}>
        <div style={styles.loginCard}>
          <h1 style={styles.logo}>SocialConnect</h1>
          {!isLoginMode && <input type="text" placeholder="Username" onChange={e => setUsername(e.target.value)} style={styles.input} />}
          <input type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} style={styles.input} />
          <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} style={styles.input} />
          <button onClick={handleAuth} style={styles.mainButton}>{isLoginMode ? "Log In" : "Register"}</button>
          <p style={styles.toggleLink} onClick={() => setIsLoginMode(!isLoginMode)}>{isLoginMode ? "New here? Create account" : "Back to login"}</p>
        </div>
      </div>
    );
  }

  let displayPosts = posts;
  if (view === 'profile') displayPosts = posts.filter(p => p.user === user.id);
  if (viewingUser) displayPosts = posts.filter(p => p.user === viewingUser.id);

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.feedContainer}>
        {/* TOP BAR */}
        <div style={styles.topBar}>
          <h2 onClick={() => {setView('feed'); setViewingUser(null)}} style={{cursor:'pointer', color:'#0866ff'}}>SocialConnect</h2>
          <div>
            <button onClick={() => setView('search')} style={styles.navBtn}>🔍 Search</button>
            <button onClick={() => {setView('profile'); setViewingUser(null)}} style={styles.navBtn}>👤 My Profile</button>
            <button onClick={() => { pb.authStore.clear(); setUser(null); }} style={styles.logoutBtn}>Logout</button>
          </div>
        </div>

        {/* SEARCH VIEW */}
        {view === 'search' && !viewingUser && (
          <div style={styles.postCard}>
            <form onSubmit={handleSearch} style={{display:'flex', gap:'10px'}}>
              <input type="text" placeholder="Search a username..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={styles.input} />
              <button type="submit" style={styles.smallButton}>Search</button>
            </form>
            <div style={{marginTop:'20px'}}>
              {searchResults.map(u => (
                <div key={u.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px', borderBottom:'1px solid #eee'}}>
                  <div style={{display:'flex', alignItems:'center', cursor:'pointer'}} onClick={() => setViewingUser(u)}>
                    {u.avatar ? <img src={pb.files.getURL(u, u.avatar)} style={styles.miniAvatar} /> : <div style={styles.miniAvatarPlaceholder}>👤</div>}
                    <span style={{fontWeight:'bold'}}>{u.username}</span>
                  </div>
                  {u.id !== user.id && (
                    <button onClick={() => handleFollow(u.id)} style={{...styles.smallButton, backgroundColor: (user.following || []).includes(u.id) ? '#ccc' : '#0866ff'}}>
                      {(user.following || []).includes(u.id) ? "Unfollow" : "Follow"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROFILE HEADER */}
        {(view === 'profile' || viewingUser) && (
          <div style={styles.profileHeader}>
             <label style={{cursor: viewingUser ? 'default' : 'pointer'}}>
                {(viewingUser ? viewingUser.avatar : user.avatar) ? (
                  <img src={pb.files.getURL(viewingUser || user, (viewingUser || user).avatar)} style={styles.bigAvatar} alt="avatar" />
                ) : <div style={styles.bigAvatarPlaceholder}>{viewingUser ? '👤' : 'Upload Photo'}</div>}
                {!viewingUser && <input type="file" onChange={handleUpdateAvatar} style={{display:'none'}} />}
             </label>
             <h3 style={{margin:'10px 0'}}>{(viewingUser || user).username || (viewingUser || user).email}</h3>
             
             {/* STATS : DISTINCT FOLLOWING & FOLLOWERS */}
             <div style={styles.statRow}>
                <div style={styles.statItem}>
                  <span style={styles.statNumber}>{(viewingUser || user).following?.length || 0}</span>
                  <span style={styles.statLabel}>Following</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statNumber}>{getFollowersCount((viewingUser || user).id)}</span>
                  <span style={styles.statLabel}>Followers</span>
                </div>
             </div>

             {viewingUser && viewingUser.id !== user.id && (
               <button onClick={() => handleFollow(viewingUser.id)} style={{...styles.smallButton, backgroundColor: (user.following || []).includes(viewingUser.id) ? '#ccc' : '#0866ff'}}>
                 {(user.following || []).includes(viewingUser.id) ? "Unfollow" : "Follow"}
               </button>
             )}
          </div>
        )}

        {/* POST FORM */}
        {(view === 'feed' || (view === 'profile' && !viewingUser)) && (
          <form onSubmit={handlePublish} style={styles.postForm}>
            <textarea placeholder={`What's up, ${user.username || 'user'}?`} value={postContent} onChange={e => setPostContent(e.target.value)} style={styles.textarea} />
            <div style={styles.formActions}>
              <label style={styles.fileLabel}>📁 Media<input type="file" onChange={e => setSelectedFile(e.target.files[0])} style={{display: 'none'}} /></label>
              <button type="submit" style={styles.smallButton}>Post</button>
            </div>
          </form>
        )}

        {/* POSTS LIST */}
        {view !== 'search' && displayPosts.map(post => (
          <div key={post.id} style={styles.postCard}>
            <div style={styles.postHeader}>
              <div style={{...styles.authorGroup, cursor:'pointer'}} onClick={() => { if(post.expand?.user) setViewingUser(post.expand.user) }}>
                {post.expand?.user?.avatar ? (
                  <img src={pb.files.getURL(post.expand.user, post.expand.user.avatar)} style={styles.miniAvatar} alt="" />
                ) : <div style={styles.miniAvatarPlaceholder}>👤</div>}
                <span style={styles.authorName}>{post.expand?.user?.username || post.expand?.user?.email}</span>
              </div>
              {post.user === user.id && (
                <button onClick={() => handleDeletePost(post.id)} style={styles.deleteBtn}>Delete</button>
              )}
            </div>
            <div style={styles.postContentText}>{post.content}</div>
            {post.media && <img src={pb.files.getURL(post, post.media)} style={styles.image} alt="" />}
            <div style={styles.likeSection}>
              <button onClick={() => handleLike(post)} style={{...styles.likeBtn, color: (post.likes || []).includes(user.id) ? '#0866ff' : '#65676b'}}>
                {(post.likes || []).includes(user.id) ? '❤️ Liked' : '🤍 Like'}
              </button>
              <span style={styles.likeCount}>{(post.likes || []).length} likes</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  pageWrapper: { backgroundColor: '#ffffff', minHeight: '100vh', width: '100vw', display: 'flex', justifyContent: 'center', paddingTop: '20px', fontFamily: 'Arial', color: '#1c1e21' },
  feedContainer: { width: '550px', maxWidth: '95%' },
  loginCard: { backgroundColor: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', width: '350px', textAlign: 'center' },
  logo: { color: '#0866ff', marginBottom: '20px' },
  input: { width: '100%', padding: '12px', margin: '8px 0', borderRadius: '6px', border: '1px solid #dddfe2', boxSizing: 'border-box' },
  mainButton: { width: '100%', padding: '12px', backgroundColor: '#0866ff', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' },
  toggleLink: { color: '#0866ff', cursor: 'pointer', marginTop: '15px', fontSize: '14px' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' },
  navBtn: { padding: '8px 12px', background: '#f0f2f5', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: '#050505', marginRight: '10px' },
  logoutBtn: { background: 'none', border: 'none', color: '#65676b', cursor: 'pointer' },
  profileHeader: { textAlign: 'center', marginBottom: '30px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '12px', border: '1px solid #eee' },
  bigAvatar: { width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #0866ff' },
  bigAvatarPlaceholder: { width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#ddd', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto', fontSize: '12px' },
  statRow: { display: 'flex', justifyContent: 'center', gap: '40px', margin: '15px 0' },
  statItem: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  statNumber: { fontWeight: 'bold', fontSize: '18px', color: '#050505' },
  statLabel: { fontSize: '13px', color: '#65676b' },
  postForm: { backgroundColor: 'white', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ddd' },
  textarea: { width: '100%', height: '60px', border: 'none', fontSize: '16px', outline: 'none', resize: 'none' },
  formActions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: '10px' },
  fileLabel: { backgroundColor: '#e4e6eb', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' },
  smallButton: { padding: '8px 20px', backgroundColor: '#0866ff', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  postCard: { backgroundColor: 'white', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #eee' },
  postHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  authorGroup: { display: 'flex', alignItems: 'center' },
  miniAvatar: { width: '32px', height: '32px', borderRadius: '50%', marginRight: '10px', objectFit: 'cover' },
  miniAvatarPlaceholder: { width: '32px', height: '32px', borderRadius: '50%', marginRight: '10px', backgroundColor: '#eee', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px' },
  authorName: { fontWeight: 'bold', color: '#050505' },
  deleteBtn: { background: 'none', border: 'none', color: '#d32f2f', cursor: 'pointer', fontSize: '12px' },
  image: { width: '100%', borderRadius: '8px', marginTop: '10px' },
  likeSection: { display: 'flex', alignItems: 'center', marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '10px' },
  likeBtn: { background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', marginRight: '10px' },
  likeCount: { fontSize: '13px', color: '#65676b' }
};

export default App;