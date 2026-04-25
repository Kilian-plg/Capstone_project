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
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [viewingUser, setViewingUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  
  const [modalTitle, setModalTitle] = useState("");
  const [modalUsers, setModalUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

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
        alert("Account created successfully!");
        setIsLoginMode(true);
      }
    } catch (err) { alert("Authentication error."); }
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
      const currentUser = await pb.collection('users').getOne(user.id);
      const currentFollowing = Array.isArray(currentUser.following) ? currentUser.following : [];
      const isFollowing = currentFollowing.includes(targetUserId);
      const newFollowing = isFollowing 
        ? currentFollowing.filter(id => id !== targetUserId) 
        : [...currentFollowing, targetUserId];

      const updatedUser = await pb.collection('users').update(user.id, { following: newFollowing });
      pb.authStore.save(pb.authStore.token, updatedUser);
      setUser({ ...updatedUser });
      await loadAllUsers();
    } catch (err) { console.error(err); }
  };

  const getFollowers = (userId) => {
    return allUsers.filter(u => Array.isArray(u.following) && u.following.includes(userId));
  };

  const getFollowing = (userId) => {
    const target = allUsers.find(u => u.id === userId);
    if (!target || !target.following) return [];
    return allUsers.filter(u => target.following.includes(u.id));
  };

  const openUserList = (type, userId) => {
    const list = type === 'Following' ? getFollowing(userId) : getFollowers(userId);
    setModalTitle(type);
    setModalUsers(list);
    setShowModal(true);
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!postContent && !selectedFile) return;
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
    if (deleteConfirmId === postId) {
      try {
        await pb.collection('posts').delete(postId);
        setDeleteConfirmId(null);
        loadPosts();
      } catch (err) { console.error(err); }
    } else {
      setDeleteConfirmId(postId);
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  const handleLike = async (post) => {
    try {
      const currentLikes = Array.isArray(post.likes) ? post.likes : [];
      let newLikes = currentLikes.includes(user.id) ? currentLikes.filter(id => id !== user.id) : [...currentLikes, user.id];
      await pb.collection('posts').update(post.id, { "likes": newLikes });
      loadPosts(); 
    } catch (err) { console.error(err); }
  };

  if (!user) {
    return (
      <div style={styles.pageWrapperCenter}>
        <div style={styles.loginCard}>
          <h1 style={styles.logo}>Social<span style={{color:'#fff'}}>Connect</span></h1>
          {!isLoginMode && <input type="text" placeholder="Username" onChange={e => setUsername(e.target.value)} style={styles.input} />}
          <input type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} style={styles.input} />
          <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} style={styles.input} />
          <button onClick={handleAuth} style={styles.mainButton}>{isLoginMode ? "Log In" : "Sign Up"}</button>
          <p style={styles.toggleLink} onClick={() => setIsLoginMode(!isLoginMode)}>{isLoginMode ? "New? Create account" : "Have an account? Log in"}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.pageWrapper}>
      
      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{margin:0}}>{modalTitle}</h3>
              <button onClick={() => setShowModal(false)} style={styles.closeBtn}>✕</button>
            </div>
            <div style={styles.modalList}>
              {modalUsers.length > 0 ? modalUsers.map(u => (
                <div key={u.id} style={styles.userListItem} onClick={() => { setViewingUser(u); setShowModal(false); }}>
                  {u.avatar ? <img src={pb.files.getURL(u, u.avatar)} style={styles.miniAvatar} /> : <div style={styles.miniAvatarPlaceholder}>👤</div>}
                  <span>{u.username}</span>
                </div>
              )) : <p style={{textAlign:'center', color:'#9ca3af', padding:'20px'}}>Nothing to show here.</p>}
            </div>
          </div>
        </div>
      )}

      <nav style={styles.navbar}>
        <div style={styles.navContainer}>
          <h2 onClick={() => {setView('feed'); setViewingUser(null);}} style={styles.logoTextNav}>Social Connect</h2>
          <div style={styles.navActions}>
            <button onClick={() => setView('search')} style={styles.navBtnItem}>🔍 <span style={styles.hideMobile}>Search</span></button>
            <button onClick={() => {setView('profile'); setViewingUser(null);}} style={styles.navBtnProfile}>👤 <span style={styles.hideMobile}>Profile</span></button>
            <div style={styles.navSeparator}></div>
            <button onClick={() => { pb.authStore.clear(); setUser(null); }} style={styles.logoutBtn}>Logout</button>
          </div>
        </div>
      </nav>

      <div style={styles.feedContainer}>
        {view === 'search' && (
          <div style={styles.postCard}>
            <form onSubmit={handleSearch} style={{display:'flex', gap:'10px'}}>
              <input type="text" placeholder="Search users..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={styles.input} />
              <button type="submit" style={styles.smallButton}>Search</button>
            </form>
            {searchResults.map(u => (
              <div key={u.id} style={styles.userListItemBig}>
                <div style={{display:'flex', alignItems:'center', cursor:'pointer'}} onClick={() => setViewingUser(u)}>
                  {u.avatar ? <img src={pb.files.getURL(u, u.avatar)} style={styles.miniAvatar} /> : <div style={styles.miniAvatarPlaceholder}>👤</div>}
                  <span style={{fontWeight:'bold'}}>{u.username}</span>
                </div>
                {u.id !== user.id && (
                  <button onClick={() => handleFollow(u.id)} style={{...styles.smallButton, background: (user.following || []).includes(u.id) ? '#333' : '#8b5cf6'}}>
                    {(user.following || []).includes(u.id) ? "Unfollow" : "Follow"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {(view === 'profile' || viewingUser) && (
          <div style={styles.profileHeader}>
             <div style={styles.avatarContainer}>
                {(viewingUser || user).avatar ? (
                  <img src={pb.files.getURL(viewingUser || user, (viewingUser || user).avatar)} style={styles.bigAvatar} />
                ) : <div style={styles.bigAvatarPlaceholder}>👤</div>}
                
                {/* RESTAURATION CHANGEMENT PHOTO PROFIL */}
                {!viewingUser && (
                  <>
                    <input type="file" onChange={(e) => {
                      const file = e.target.files[0];
                      if(file) {
                        const formData = new FormData();
                        formData.append('avatar', file);
                        pb.collection('users').update(user.id, formData).then(u => {setUser(u); loadAllUsers();});
                      }
                    }} style={styles.fileInputHidden} id="avatarInput" />
                    <label htmlFor="avatarInput" style={styles.avatarEditBadge}>✎</label>
                  </>
                )}
             </div>
             <h3 style={{fontSize:'24px', margin:'10px 0'}}>{(viewingUser || user).username}</h3>
             <div style={styles.statRow}>
                <div style={styles.statItem} onClick={() => openUserList('Following', (viewingUser || user).id)}>
                  <span style={styles.statNumber}>{(viewingUser || user).following?.length || 0}</span>
                  <span style={styles.statLabel}>Following</span>
                </div>
                <div style={styles.statItem} onClick={() => openUserList('Followers', (viewingUser || user).id)}>
                  <span style={styles.statNumber}>{getFollowers((viewingUser || user).id).length}</span>
                  <span style={styles.statLabel}>Followers</span>
                </div>
             </div>
          </div>
        )}

        {(view === 'feed' || (view === 'profile' && !viewingUser)) && (
          <form onSubmit={handlePublish} style={styles.postForm}>
            <textarea placeholder="What's on your mind?" value={postContent} onChange={e => setPostContent(e.target.value)} style={styles.textarea} />
            <div style={styles.formActions}>
              <label style={styles.fileLabel}>🖼️ Media<input type="file" onChange={e => setSelectedFile(e.target.files[0])} style={{display: 'none'}} /></label>
              <button type="submit" style={styles.smallButton}>Post</button>
            </div>
          </form>
        )}

        {view !== 'search' && posts.filter(p => {
          if (viewingUser) return p.user === viewingUser.id;
          if (view === 'profile') return p.user === user.id;
          return true;
        }).map(post => (
          <div key={post.id} style={styles.postCard}>
            <div style={styles.postHeader}>
              <div style={{...styles.authorGroup, cursor:'pointer'}} onClick={() => { if(post.expand?.user) setViewingUser(post.expand.user) }}>
                {post.expand?.user?.avatar ? (
                  <img src={pb.files.getURL(post.expand.user, post.expand.user.avatar)} style={styles.miniAvatar} />
                ) : <div style={styles.miniAvatarPlaceholder}>👤</div>}
                <span style={styles.authorName}>{post.expand?.user?.username}</span>
              </div>
              {post.user === user.id && (
                <button onClick={() => handleDeletePost(post.id)} style={{...styles.deleteBtn, color: deleteConfirmId === post.id ? '#ff9800' : '#ef4444'}}>
                  {deleteConfirmId === post.id ? "confirm?" : "delete"}
                </button>
              )}
            </div>
            <div style={styles.postContentText}>{post.content}</div>
            {post.media && <img src={pb.files.getURL(post, post.media)} style={styles.image} />}
            <div style={styles.likeSection}>
              <button onClick={() => handleLike(post)} style={{...styles.likeBtn, color: (post.likes || []).includes(user.id) ? '#8b5cf6' : '#9ca3af'}}>
                {(post.likes || []).includes(user.id) ? '💜 Liked' : '🤍 Like'}
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
  pageWrapper: { minHeight: '100vh', width: '100%', backgroundColor: '#0a0a0c', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  pageWrapperCenter: { minHeight: '100vh', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0c' },
  feedContainer: { width: '100%', maxWidth: '500px', padding: '30px 15px' },
  navbar: { width: '100%', height: '70px', background: 'rgba(22, 22, 26, 0.8)', backdropFilter: 'blur(15px)', borderBottom: '1px solid #2d2d35', display: 'flex', justifyContent: 'center', position: 'sticky', top: 0, zIndex: 1000 },
  navContainer: { width: '100%', maxWidth: '1100px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px' },
  logoTextNav: { background: 'linear-gradient(90deg, #8b5cf6, #d8b4fe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '22px', fontWeight: '800', cursor: 'pointer' },
  navActions: { display: 'flex', gap: '15px', alignItems: 'center' },
  navBtnItem: { background: '#1c1c21', border: '1px solid #2d2d35', color: '#fff', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer' },
  navBtnProfile: { background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer' },
  logoutBtn: { background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer' },
  navSeparator: { width: '1px', height: '20px', background: '#333' },
  postCard: { background: '#16161a', padding: '20px', borderRadius: '20px', marginBottom: '20px', border: '1px solid #2d2d35' },
  postHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  authorGroup: { display: 'flex', alignItems: 'center', gap: '10px' },
  miniAvatar: { width: '40px', height: '40px', borderRadius: '12px', objectFit: 'cover' },
  miniAvatarPlaceholder: { width: '40px', height: '40px', borderRadius: '12px', background: '#333', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  authorName: { fontWeight: 'bold' },
  deleteBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' },
  postContentText: { marginBottom: '15px', lineHeight: '1.5' },
  image: { width: 'calc(100% + 40px)', marginLeft: '-20px', marginBottom: '15px' },
  likeSection: { display: 'flex', alignItems: 'center', gap: '10px' },
  likeBtn: { background: 'rgba(139, 92, 246, 0.1)', border: 'none', padding: '8px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' },
  likeCount: { fontSize: '12px', color: '#666' },
  profileHeader: { textAlign: 'center', padding: '30px', background: '#16161a', borderRadius: '24px', border: '1px solid #2d2d35', marginBottom: '20px' },
  avatarContainer: { position: 'relative', width: '100px', height: '100px', margin: '0 auto 15px' },
  bigAvatar: { width: '100px', height: '100px', borderRadius: '30px', objectFit: 'cover', border: '3px solid #8b5cf6' },
  bigAvatarPlaceholder: { width: '100px', height: '100px', borderRadius: '30px', background: '#333', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '30px' },
  avatarEditBadge: { position: 'absolute', bottom: '-5px', right: '-5px', background: '#8b5cf6', color: '#fff', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', border: '2px solid #16161a', fontSize: '14px' },
  fileInputHidden: { display: 'none' },
  statRow: { display: 'flex', justifyContent: 'center', gap: '30px' },
  statItem: { display: 'flex', flexDirection: 'column', cursor: 'pointer' },
  statNumber: { fontSize: '20px', fontWeight: 'bold' },
  statLabel: { fontSize: '12px', color: '#9ca3af' },
  postForm: { background: '#16161a', padding: '20px', borderRadius: '20px', border: '1px solid #2d2d35', marginBottom: '20px' },
  textarea: { width: '100%', background: 'none', border: 'none', color: '#fff', resize: 'none', height: '80px', outline: 'none', fontSize: '16px' },
  formActions: { display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #333', paddingTop: '15px' },
  smallButton: { background: '#8b5cf6', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' },
  modalContent: { background: '#16161a', width: '350px', borderRadius: '24px', border: '1px solid #333', overflow: 'hidden' },
  modalHeader: { padding: '20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  closeBtn: { background: 'none', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer', padding: '5px' },
  modalList: { maxHeight: '350px', overflowY: 'auto', padding: '10px' },
  userListItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', cursor: 'pointer', borderRadius: '12px', transition: 'background 0.2s' },
  userListItemBig: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: '1px solid #222' },
  loginCard: { background: '#16161a', padding: '40px', borderRadius: '24px', border: '1px solid #333', textAlign: 'center', width: '350px' },
  logo: { color: '#8b5cf6', marginBottom: '20px' },
  input: { width: '100%', padding: '12px', margin: '10px 0', background: '#0a0a0c', border: '1px solid #333', color: '#fff', borderRadius: '10px' },
  mainButton: { width: '100%', padding: '12px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
  toggleLink: { fontSize: '12px', color: '#9ca3af', cursor: 'pointer', marginTop: '15px' }
};

export default App;